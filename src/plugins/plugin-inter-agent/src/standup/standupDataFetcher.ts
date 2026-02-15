/**
 * Standup Data Fetcher
 *
 * Fetches REAL data for each agent's standup report.
 * Each fetcher runs on that agent's runtime so it has access to the agent's services.
 * The shared daily insights doc is built from these fetchers.
 *
 * Data ownership (no overlaps):
 * - VINCE: ALL market/trading data (enriched context, funding, L/S, regime, Fear/Greed,
 *          HIP-3, signals, Deribit DVOL, Binance top traders, paper bot, goals, MandoMinutes)
 * - ECHO: CT/X sentiment (actual tweets)
 * - Oracle: Polymarket prediction markets
 * - Solus: directive referencing VINCE's data (no own price fetch)
 * - Sentinel: git log, PRDs, ProjectRadar, macro news (Tavily)
 * - Eliza: recent facts from memory
 * - Clawterm: OpenClaw/AGI X + web
 * - Otaku: under construction
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type IAgentRuntime, logger } from "@elizaos/core";
import { PolymarketService } from "../../../plugin-polymarket-discovery/src/services/polymarket.service";
import { getRecentCodeContext } from "./standup.context";
import { getStandupTrackedAssets, getStandupSnippetLen } from "./standup.constants";
import { loadDayReport, loadSharedDailyInsights } from "./dayReportPersistence";

/** Extract key events from VINCE's shared insights text for dynamic ECHO/Clawterm queries (e.g. "SOL funding flipped", "BTC +5%"). */
export function extractKeyEventsFromVinceData(vinceText: string): string[] {
  const hints: string[] = [];
  if (!vinceText || typeof vinceText !== "string") return hints;
  const assets = getStandupTrackedAssets();
  const lower = vinceText.toLowerCase();
  for (const asset of assets) {
    const assetLower = asset.toLowerCase();
    if (lower.includes(`${assetLower}`)) {
      const fundingMatch = vinceText.match(new RegExp(`${asset}[^|]*F:(-?[\\d.]+)%`, "i"));
      if (fundingMatch) {
        const rate = parseFloat(fundingMatch[1]);
        if (rate < -0.01) hints.push(`${asset} funding negative`);
        else if (rate > 0.02) hints.push(`${asset} funding high`);
      }
      const changeMatch = vinceText.match(new RegExp(`${asset}[^|]*([+-][\\d.]+)%`, "i"));
      if (changeMatch) {
        const pct = parseFloat(changeMatch[1]);
        if (Math.abs(pct) >= 5) hints.push(`${asset} ${pct >= 0 ? "+" : ""}${pct}% 24h`);
      }
    }
  }
  if (lower.includes("volume") && (lower.includes("spike") || lower.includes("2x") || lower.includes("3x"))) {
    hints.push("volume spike");
  }
  return [...new Set(hints)].slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════
// VINCE: enriched context + 9 data sources
// ═══════════════════════════════════════════════════════════════════════

export async function fetchVinceData(runtime: IAgentRuntime): Promise<string> {
  const lines: string[] = [];
  try {
    // 1. Enriched context per asset (price + funding + L/S + regime bundled)
    const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
      getEnrichedContext?: (asset: string) => Promise<{
        currentPrice?: number; priceChange24h?: number; fundingRate?: number;
        longShortRatio?: number; marketRegime?: string; volumeRatio?: number;
        volume24h?: number;
      } | null>;
    } | null;

    const rows: string[] = [];
    for (const asset of getStandupTrackedAssets()) {
      const ctx = await marketData?.getEnrichedContext?.(asset).catch(() => null) ?? null;
      if (!ctx) { rows.push(`| ${asset} | N/A | — | — |`); continue; }
      const price = ctx.currentPrice ? `$${ctx.currentPrice.toLocaleString()}` : "N/A";
      const change = ctx.priceChange24h != null ? `${ctx.priceChange24h >= 0 ? "+" : ""}${ctx.priceChange24h.toFixed(1)}%` : "";
      const funding = ctx.fundingRate != null ? `F:${(ctx.fundingRate * 100).toFixed(3)}%` : "";
      const ls = ctx.longShortRatio != null ? `L/S:${ctx.longShortRatio.toFixed(2)}` : "";
      const vol = ctx.volumeRatio != null ? `Vol:${ctx.volumeRatio.toFixed(1)}x` : "";
      const regime = ctx.marketRegime ?? "";
      rows.push(`| ${asset} | ${price} ${change} | ${funding} ${ls} ${vol} | ${regime} |`);
    }
    if (rows.length > 0) {
      lines.push(`| Asset | Price | Funding/LS | Regime |\n|-------|-------|-----------|--------|\n${rows.join("\n")}`);
    }

    // 2. Fear & Greed
    const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
      getFearGreed?: () => Promise<{ value: number; classification: string } | null>;
    } | null;
    const fg = await coinglass?.getFearGreed?.().catch(() => null) ?? null;
    if (fg) lines.push(`**Fear & Greed:** ${fg.value} (${fg.classification?.replace(/_/g, " ")})`);

    // 3. HIP-3 pulse
    const hip3 = runtime.getService("VINCE_HIP3_SERVICE") as {
      getHIP3Pulse?: () => Promise<{ tldr: string } | null>;
    } | null;
    const hip3Data = await hip3?.getHIP3Pulse?.().catch(() => null) ?? null;
    if (hip3Data?.tldr) lines.push(`**HIP-3:** ${hip3Data.tldr}`);

    // 4. Signal aggregator (overall signal strength from 20+ sources)
    const sigAgg = runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as {
      aggregateSignals?: (asset: string) => Promise<{ direction?: string; confidence?: number; sources?: number } | null>;
    } | null;
    const btcSignal = await sigAgg?.aggregateSignals?.("BTC").catch(() => null) ?? null;
    if (btcSignal?.direction) lines.push(`**Signal (BTC):** ${btcSignal.direction} (${btcSignal.confidence ?? 0}% conf, ${btcSignal.sources ?? 0} sources)`);

    // 5. Deribit DVOL + best covered calls (Solus reads this from shared insights)
    const deribit = runtime.getService("VINCE_DERIBIT_SERVICE") as {
      getDVOL?: (currency: string) => Promise<{ dvol: number } | null>;
      getBestCoveredCalls?: (currency: string) => Promise<Array<{ strike: number; premium: number; expiry: string }> | null>;
    } | null;
    const dvol = await deribit?.getDVOL?.("BTC").catch(() => null) ?? null;
    const bestCalls = await deribit?.getBestCoveredCalls?.("BTC").catch(() => null) ?? null;
    if (dvol?.dvol != null) {
      let deribitLine = `**BTC DVOL:** ${dvol.dvol.toFixed(1)}`;
      if (bestCalls?.[0]) {
        const top = bestCalls[0];
        deribitLine += ` | Best CC: $${top.strike} (${top.premium?.toFixed(2)} prem, ${top.expiry})`;
      }
      lines.push(deribitLine);
    }

    // 6. Binance top trader positions
    const binance = runtime.getService("VINCE_BINANCE_SERVICE") as {
      getTopTraderPositions?: (asset: string) => Promise<{ longPercent: number; shortPercent: number } | null>;
    } | null;
    const topTraders = await binance?.getTopTraderPositions?.("BTC").catch(() => null) ?? null;
    if (topTraders) lines.push(`**Top traders (BTC):** ${topTraders.longPercent?.toFixed(0)}% long / ${topTraders.shortPercent?.toFixed(0)}% short`);

    // 7. Paper bot: stats + open positions
    const paperBot = runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as {
      getStats?: () => Promise<{ wins: number; losses: number; pnl: number } | null>;
    } | null;
    const paperTrading = runtime.getService("VINCE_PAPER_TRADING_SERVICE") as {
      getStatus?: () => Promise<{ openPositions?: number; pendingEntries?: number } | null>;
    } | null;
    const stats = await paperBot?.getStats?.().catch(() => null) ?? null;
    const botStatus = await paperTrading?.getStatus?.().catch(() => null) ?? null;
    let botLine = stats
      ? `**Paper bot:** ${stats.wins}W/${stats.losses}L (${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(0)})`
      : "**Paper bot:** No data";
    if (botStatus) botLine += ` | ${botStatus.openPositions ?? 0} open, ${botStatus.pendingEntries ?? 0} pending`;
    lines.push(botLine);

    // 8. Goal tracker
    const goals = runtime.getService("VINCE_GOAL_TRACKER_SERVICE") as {
      getDailyProgress?: () => Promise<{ pnlToday?: number; target?: number; pctComplete?: number } | null>;
    } | null;
    const goalData = await goals?.getDailyProgress?.().catch(() => null) ?? null;
    if (goalData?.target) lines.push(`**Daily goal:** $${goalData.pnlToday?.toFixed(0) ?? 0}/$${goalData.target} (${goalData.pctComplete?.toFixed(0) ?? 0}%)`);

    // 9. MandoMinutes headlines (essential news context for the team)
    const newsSvc = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as {
      refreshData?: (force?: boolean) => Promise<void>;
      getTopHeadlines?: (limit: number) => Array<{ title: string; sentiment: string; impact: string }>;
      getVibeCheck?: () => string;
      getTLDR?: () => string;
      getOverallSentiment?: () => { sentiment: string; confidence: number };
    } | null;
    if (newsSvc) {
      try {
        await newsSvc.refreshData?.();
        const vibeCheck = newsSvc.getVibeCheck?.() ?? "";
        const tldr = newsSvc.getTLDR?.() ?? "";
        const sentiment = newsSvc.getOverallSentiment?.();
        const headlines = newsSvc.getTopHeadlines?.(5) ?? [];
        const headlineLines = headlines.map((h) => {
          const dot = h.sentiment === "bullish" ? "🟢" : h.sentiment === "bearish" ? "🔴" : "⚪";
          return `${dot} ${h.title.slice(0, 80)}`;
        });
        const newsBlock = [
          vibeCheck ? `**MandoMinutes:** ${vibeCheck}` : "",
          sentiment ? `News sentiment: ${sentiment.sentiment} (${Math.round(sentiment.confidence)}% conf)` : "",
          tldr ? `TLDR: ${tldr}` : "",
          headlineLines.length > 0 ? `Headlines:\n${headlineLines.join("\n")}` : "",
        ].filter(Boolean).join("\n");
        if (newsBlock) lines.push(newsBlock);
      } catch { /* non-fatal */ }
    }

    return lines.join("\n\n");
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] Failed to fetch VINCE data");
    return "*(Live data unavailable)*";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ECHO: real CT sentiment from X (actual tweets, not a placeholder).
// When contextHints from VINCE are provided, builds 2-3 targeted queries.
// ═══════════════════════════════════════════════════════════════════════

export async function fetchEchoData(
  runtime: IAgentRuntime,
  contextHints?: string[],
): Promise<string> {
  try {
    const xSearchMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xSearch.service.js"
    ).catch(() => import("../../../plugin-x-research/src/services/xSearch.service"));
    const xClientMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xClient.service.js"
    ).catch(() => import("../../../plugin-x-research/src/services/xClient.service"));

    const initXClientFromEnv = xClientMod.initXClientFromEnv as (r: IAgentRuntime) => void;
    const getXSearchService = xSearchMod.getXSearchService as () => {
      searchQuery: (opts: {
        query: string; maxResults?: number; hoursBack?: number; cacheTtlMs?: number;
      }) => Promise<Array<{ text: string; author?: { username?: string }; metrics?: { likeCount?: number } }>>;
    };

    initXClientFromEnv(runtime);
    const svc = getXSearchService();

    const hoursBack = 24;
    const cacheTtlMs = 30 * 60 * 1000;
    const opts = { hoursBack, cacheTtlMs };

    const queries: string[] = [];
    if (contextHints?.length) {
      const firstHint = contextHints[0];
      if (firstHint && /^(BTC|SOL|ETH|HYPE|HIP)/i.test(firstHint)) {
        const asset = firstHint.split(/\s/)[0];
        queries.push(`${asset} crypto sentiment`);
      }
      if (contextHints.some((h) => h.toLowerCase().includes("volume"))) {
        queries.push("crypto volume sentiment");
      }
    }
    queries.push("BTC crypto market sentiment");
    const secondAsset = getStandupTrackedAssets()[1];
    if (secondAsset && secondAsset !== "BTC" && queries.length < 3) {
      queries.push(`${secondAsset} crypto sentiment`);
    }
    const uniqueQueries = [...new Set(queries)].slice(0, 3);

    const allTweets: Array<{ id?: string; text: string; author?: { username?: string }; metrics?: { likeCount?: number } }> = [];
    const seen = new Set<string>();
    for (const query of uniqueQueries) {
      const tweets = await svc.searchQuery({
        ...opts,
        query,
        maxResults: 5,
      });
      for (const t of tweets ?? []) {
        const key = t.id ?? t.text?.slice(0, 50) ?? "";
        if (key && !seen.has(key)) {
          seen.add(key);
          allTweets.push(t);
        }
      }
    }

    if (!allTweets.length) return "**CT sentiment:** No X data (check X_BEARER_TOKEN).";

    const tweetLines = allTweets.slice(0, 10).map((t) => {
      const handle = t.author?.username ?? "anon";
      const len = getStandupSnippetLen();
      const snippet = t.text?.length > len ? t.text.slice(0, len) + "…" : (t.text ?? "");
      return `@${handle}: ${snippet} (${t.metrics?.likeCount ?? 0} likes)`;
    });

    const queryNote = uniqueQueries.length > 1 ? ` [queries: ${uniqueQueries.join(", ")}]` : "";
    return `**CT sentiment (${allTweets.length} posts, last 24h)${queryNote}:**\n${tweetLines.join("\n")}`;
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] fetchEchoData: X unavailable");
    return "**CT sentiment:** X API unavailable. Report from character knowledge only.";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Oracle: Polymarket priority markets (already real data, keep as-is)
// ═══════════════════════════════════════════════════════════════════════

export async function fetchOracleData(runtime: IAgentRuntime): Promise<string> {
  try {
    const service = runtime.getService(
      PolymarketService.serviceType,
    ) as InstanceType<typeof PolymarketService> | null;

    if (!service) {
      return "Polymarket service not loaded. Report: discovery ready when Oracle is used in chat.";
    }

    const markets = await service.getMarketsByPreferredTags({ totalLimit: 8 });
    if (markets.length === 0) {
      return "No VINCE-priority markets returned. Report: Polymarket discovery ready; no markets in scope.";
    }

    const rows: string[] = [];
    for (const m of markets) {
      const cid = m.conditionId ?? (m as { condition_id?: string }).condition_id ?? "—";
      const prices = service.getPricesFromMarketPayload(m);
      const yesPct =
        prices?.yes_price != null
          ? `${(parseFloat(prices.yes_price) * 100).toFixed(0)}%`
          : "—";
      const question = (m.question ?? "").slice(0, 50) + (m.question && m.question.length > 50 ? "…" : "");
      rows.push(`| ${question} | ${yesPct} | \`${cid}\` |`);
    }

    return `
| Priority market | YES% | condition_id |
|-----------------|------|--------------|
${rows.join("\n")}

Use GET_POLYMARKET_PRICE with condition_id for current CLOB odds.
`.trim();
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] Failed to fetch Oracle data");
    return "Polymarket data unavailable; report discovery readiness.";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Solus: directive referencing VINCE's data (no own price fetch)
// ═══════════════════════════════════════════════════════════════════════

export async function fetchSolusData(_runtime: IAgentRuntime): Promise<string> {
  return `**Options context (use VINCE's data from shared insights above):**
Read VINCE's section for: BTC price, funding, L/S ratio, market regime, DVOL, best covered call strike, signal direction.
Read Oracle's section for: Polymarket odds that inform confidence.

**Your job:** Propose a specific BTC covered call strike for Hypersurface (settle Friday 08:00 UTC).
State: strike price, direction (above/below), premium target, invalidation level.
Reference VINCE's DVOL, funding, and regime. Reference Oracle's odds.`;
}

// ═══════════════════════════════════════════════════════════════════════
// Sentinel: real git log + PRD scan + ProjectRadar + macro news (Tavily)
// ═══════════════════════════════════════════════════════════════════════

export async function fetchSentinelData(runtime: IAgentRuntime): Promise<string> {
  const sections: string[] = [];

  // 1. Real git log
  try {
    const gitLog = await getRecentCodeContext(10);
    sections.push(gitLog);
  } catch {
    sections.push("Git log: unavailable.");
  }

  // 2. PRD scan
  try {
    const prdDir = path.join(process.cwd(), process.env.STANDUP_DELIVERABLES_DIR || "standup-deliverables", "prds");
    if (fs.existsSync(prdDir)) {
      const files = fs.readdirSync(prdDir).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 3);
      if (files.length > 0) sections.push(`**Recent PRDs:** ${files.join(", ")}`);
    }
  } catch { /* non-fatal */ }

  // 3. ProjectRadar (if Sentinel has the service)
  const radar = runtime.getService("PROJECT_RADAR_SERVICE") as {
    getProjectHealth?: () => Promise<{ status?: string; blockers?: string[] } | null>;
    getOpenTODOs?: () => Promise<string[] | null>;
  } | null;
  if (radar) {
    try {
      const health = await radar.getProjectHealth?.().catch(() => null) ?? null;
      const todos = await radar.getOpenTODOs?.().catch(() => null) ?? null;
      if (health?.status) sections.push(`**Project:** ${health.status}${health.blockers?.length ? ` | Blockers: ${health.blockers.slice(0, 2).join(", ")}` : ""}`);
      if (todos?.length) sections.push(`**TODOs:** ${todos.slice(0, 3).join("; ")}`);
    } catch { /* non-fatal */ }
  }

  // 4. Macro news via Tavily
  try {
    const tavilyMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/utils/tavilySearch.js"
    ).catch(() => import("../../../plugin-x-research/src/utils/tavilySearch"));
    const tavilySearch = tavilyMod.tavilySearch as (query: string, r?: IAgentRuntime, maxResults?: number) => Promise<string[]>;
    const snippets = await tavilySearch("crypto regulation Fed interest rates macro news today", runtime, 3);
    if (snippets?.length > 0) sections.push(`**Macro news:**\n${snippets.join("\n")}`);
  } catch { /* Tavily not available */ }

  sections.push("**Your job:** What shipped, what's next, one architecture item, and flag any macro news that affects our trades.");
  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Eliza: delta reporter — yesterday vs today, plus facts
// ═══════════════════════════════════════════════════════════════════════

/** Build delta summary: yesterday's Day Report vs today's shared insights. */
async function buildDeltaReport(): Promise<string> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayReport = await loadDayReport(yesterday);
  const todayInsights = await loadSharedDailyInsights(); // today
  const lines: string[] = [];
  if (yesterdayReport) {
    const solusMatch = yesterdayReport.match(/\*\*Solus'?s call:?\*\*\s*\[?([^\]]*)\]?\s*[—\-]\s*([^\n*]+)/i);
    if (solusMatch) {
      lines.push(`**Yesterday:** Solus's call: ${solusMatch[1].trim()} — ${solusMatch[2].trim().slice(0, 120)}`);
    }
    const tldrMatch = yesterdayReport.match(/\*\*TL;DR:?\*\*\s*([^\n#]+)/);
    if (tldrMatch) lines.push(`**Yesterday TL;DR:** ${tldrMatch[1].trim().slice(0, 100)}`);
  } else {
    lines.push("**Yesterday:** No day report found (first run or missing file).");
  }
  if (todayInsights) {
    const vinceBlock = todayInsights.match(/## VINCE[\s\S]*?(?=## |$)/i);
    if (vinceBlock) {
      const firstTable = vinceBlock[0].match(/\|[^\n]+\|\n\|[^\n]+\|\n([\s\S]*?)(?=\n\n|\n\*\*|$)/);
      if (firstTable) lines.push(`**Today (from shared insights):** ${firstTable[1].replace(/\n/g, " ").slice(0, 200)}`);
      else lines.push("**Today:** Shared insights available (see full doc).");
    } else {
      lines.push("**Today:** Shared insights available.");
    }
  } else {
    lines.push("**Today:** Shared insights not yet built.");
  }
  lines.push("**Your job:** Delta reporter — what changed since yesterday; was yesterday's Solus call tracking? One knowledge gap, one content idea, one cross-agent link.");
  return lines.join("\n\n");
}

export async function fetchElizaData(runtime: IAgentRuntime): Promise<string> {
  const sections: string[] = [];
  try {
    const delta = await buildDeltaReport();
    sections.push(delta);
  } catch (e) {
    logger.warn({ err: e }, "[STANDUP_DATA] fetchElizaData: delta build failed");
    sections.push("**Delta:** Could not load yesterday vs today; report from memory only.");
  }
  try {
    const facts = await runtime.getMemories({ tableName: "facts", count: 8, unique: true });
    const factLines = facts
      .filter((f) => f.content?.text)
      .slice(0, 5)
      .map((f) => `- ${String(f.content.text).slice(0, getStandupSnippetLen())}`);
    if (factLines.length > 0) sections.push(`**Recent facts in memory (${factLines.length}):**\n${factLines.join("\n")}`);
    else sections.push("**Recent facts:** None stored yet.");
  } catch {
    sections.push("**Facts:** Query failed.");
  }
  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Otaku: under construction (keep as-is)
// ═══════════════════════════════════════════════════════════════════════

export async function fetchOtakuData(_runtime: IAgentRuntime): Promise<string> {
  return `You are the agent with wallet (Bankr, Coinbase) and DeFi skills; currently under construction — no execution yet.

🔧 **Wallet integration in progress.**
Observing team reports — no execution capability yet.

*Watching for: DeFi opportunities to act on once wallet is live.*`;
}

// ═══════════════════════════════════════════════════════════════════════
// Clawterm: OpenClaw/AGI X + web. When contextHints provided, adds targeted query.
// ═══════════════════════════════════════════════════════════════════════

const CLAWTERM_X_MAX = 10;
const CLAWTERM_HOURS_BACK = 24;

export async function fetchClawtermData(
  runtime: IAgentRuntime,
  contextHints?: string[],
): Promise<string> {
  try {
    const xSearchMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xSearch.service.js"
    ).catch(() => import("../../../plugin-x-research/src/services/xSearch.service"));
    const xClientMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xClient.service.js"
    ).catch(() => import("../../../plugin-x-research/src/services/xClient.service"));
    const tavilyMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/utils/tavilySearch.js"
    ).catch(() => import("../../../plugin-x-research/src/utils/tavilySearch"));

    const getXSearchService = xSearchMod.getXSearchService as () => { searchQuery: (opts: { query: string; maxResults?: number; hoursBack?: number; cacheTtlMs?: number }) => Promise<Array<{ id: string; text: string; author?: { username?: string }; metrics?: { likeCount?: number } }>> };
    const initXClientFromEnv = xClientMod.initXClientFromEnv as (r: IAgentRuntime) => void;
    const tavilySearch = tavilyMod.tavilySearch as (query: string, r?: IAgentRuntime, maxResults?: number) => Promise<string[]>;

    initXClientFromEnv(runtime);
    const searchService = getXSearchService();

    const cacheOpts = { hoursBack: CLAWTERM_HOURS_BACK, cacheTtlMs: 60 * 60 * 1000 };
    const queries: string[] = ["OpenClaw", "AGI AI research agents"];
    if (contextHints?.length) {
      const first = contextHints[0];
      if (first && /^(BTC|SOL|ETH|HYPE)/i.test(first.split(/\s/)[0])) {
        queries.push(`${first.split(/\s/)[0]} AI agents crypto`);
      }
    }
    const tweetPromises = queries.slice(0, 3).map((q) =>
      searchService.searchQuery({ ...cacheOpts, query: q, maxResults: CLAWTERM_X_MAX }),
    );
    const results = await Promise.all(tweetPromises);
    const combined = results.flat();
    const byId = new Map(combined.map((t) => [t.id, t]));
    const deduped = Array.from(byId.values()).slice(0, 15);

    const formatOne = (t: { text: string; author?: { username?: string }; metrics?: { likeCount?: number } }) => {
      const handle = t.author?.username ?? "unknown";
      const snippetLen = getStandupSnippetLen();
      const snippet = t.text.length > snippetLen ? t.text.slice(0, snippetLen) + "…" : t.text;
      const likes = t.metrics?.likeCount ?? 0;
      return `@${handle}: ${snippet} (${likes} likes)`;
    };

    const xBlock =
      deduped.length > 0
        ? `=== X (OpenClaw/AGI) ===\n${deduped.map(formatOne).join("\n")}`
        : "=== X (OpenClaw/AGI) ===\nNo recent X posts in the last 24h.";

    const webSnippets = await tavilySearch("OpenClaw AI AGI research agents news", runtime, 3);
    const webBlock =
      webSnippets.length > 0 ? `=== Web ===\n${webSnippets.join("\n\n")}` : "=== Web ===\nNo web snippets (set TAVILY_API_KEY for web).";

    return [xBlock, webBlock].join("\n\n");
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] fetchClawtermData: X/Tavily unavailable, using fallback");
    return "OpenClaw/AI data: run CLAWTERM_DAY_REPORT in chat for full report; here report gateway status and one take from knowledge.";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Router: fetch data for a specific agent by name
// ═══════════════════════════════════════════════════════════════════════

export async function fetchAgentData(
  runtime: IAgentRuntime,
  agentName: string,
  contextHints?: string[],
): Promise<string | null> {
  const normalized = agentName.toLowerCase();

  switch (normalized) {
    case "vince":
      return fetchVinceData(runtime);
    case "echo":
      return fetchEchoData(runtime, contextHints);
    case "oracle":
      return fetchOracleData(runtime);
    case "solus":
      return fetchSolusData(runtime);
    case "otaku":
      return fetchOtakuData(runtime);
    case "sentinel":
      return fetchSentinelData(runtime);
    case "clawterm":
      return fetchClawtermData(runtime, contextHints);
    case "eliza":
      return fetchElizaData(runtime);
    default:
      return null;
  }
}
