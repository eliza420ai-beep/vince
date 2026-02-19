/**
 * Standup Data Fetcher
 *
 * Fetches REAL data for each agent's standup report.
 * Each fetcher runs on that agent's runtime so it has access to the agent's services.
 * The shared daily insights doc is built from these fetchers.
 *
 * Data ownership (no overlaps):
 * - VINCE: ALL market/trading data (enriched context, funding, L/S, regime, Fear/Greed,
 *          HIP-3, signals, Deribit DVOL, Binance top traders, paper bot, goals, MandoMinutes,
 *          liquidations, OI delta, market regime)
 * - ECHO: CT/X sentiment (actual tweets)
 * - Oracle: Polymarket prediction markets
 * - Solus: directive referencing VINCE's data (no own price fetch)
 * - Sentinel: git log, PRDs, ProjectRadar, macro news (Tavily)
 * - Eliza: recent facts from memory
 * - Clawterm: OpenClaw skills, setup, trending (X + web, LLM summary)
 * - Otaku: wallet setup progress + concrete next step
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type IAgentRuntime, logger, ModelType } from "@elizaos/core";
import { PolymarketService } from "../../../plugin-polymarket-discovery/src/services/polymarket.service";
import { getRecentCodeContext } from "./standup.context";
import {
  getStandupTrackedAssets,
  getStandupSnippetLen,
} from "./standup.constants";
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
      const fundingMatch = vinceText.match(
        new RegExp(`${asset}[^|]*F:(-?[\\d.]+)%`, "i"),
      );
      if (fundingMatch) {
        const rate = parseFloat(fundingMatch[1]);
        if (rate < -0.01) hints.push(`${asset} funding negative`);
        else if (rate > 0.02) hints.push(`${asset} funding high`);
      }
      const changeMatch = vinceText.match(
        new RegExp(`${asset}[^|]*([+-][\\d.]+)%`, "i"),
      );
      if (changeMatch) {
        const pct = parseFloat(changeMatch[1]);
        if (Math.abs(pct) >= 5)
          hints.push(`${asset} ${pct >= 0 ? "+" : ""}${pct}% 24h`);
      }
    }
  }
  if (
    lower.includes("volume") &&
    (lower.includes("spike") || lower.includes("2x") || lower.includes("3x"))
  ) {
    hints.push("volume spike");
  }
  return [...new Set(hints)].slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════
// VINCE: enriched context + 12 data sources (all parallel via Promise.allSettled)
// ═══════════════════════════════════════════════════════════════════════

async function fetchEnrichedContext(runtime: IAgentRuntime): Promise<string> {
  const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
    getEnrichedContext?: (asset: string) => Promise<{
      currentPrice?: number;
      priceChange24h?: number;
      fundingRate?: number;
      longShortRatio?: number;
      marketRegime?: string;
      volumeRatio?: number;
      volume24h?: number;
    } | null>;
  } | null;
  if (!marketData?.getEnrichedContext) return "";
  const assets = getStandupTrackedAssets();
  const results = await Promise.all(
    assets.map(async (asset) => {
      const ctx = await marketData.getEnrichedContext!(asset).catch(() => null);
      if (!ctx) return `| ${asset} | N/A | — | — |`;
      const price = ctx.currentPrice
        ? `$${ctx.currentPrice.toLocaleString()}`
        : "N/A";
      const change =
        ctx.priceChange24h != null
          ? `${ctx.priceChange24h >= 0 ? "+" : ""}${ctx.priceChange24h.toFixed(1)}%`
          : "";
      const funding =
        ctx.fundingRate != null
          ? `F:${(ctx.fundingRate * 100).toFixed(3)}%`
          : "";
      const ls =
        ctx.longShortRatio != null
          ? `L/S:${ctx.longShortRatio.toFixed(2)}`
          : "";
      const vol =
        ctx.volumeRatio != null ? `Vol:${ctx.volumeRatio.toFixed(1)}x` : "";
      const regime = ctx.marketRegime ?? "";
      return `| ${asset} | ${price} ${change} | ${funding} ${ls} ${vol} | ${regime} |`;
    }),
  );
  return `| Asset | Price | Funding/LS | Regime |\n|-------|-------|-----------|--------|\n${results.join("\n")}`;
}

async function fetchFearGreed(runtime: IAgentRuntime): Promise<string> {
  const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
    getFearGreed?: () => Promise<{
      value: number;
      classification: string;
    } | null>;
  } | null;
  const fg = (await coinglass?.getFearGreed?.().catch(() => null)) ?? null;
  return fg
    ? `**Fear & Greed:** ${fg.value} (${fg.classification?.replace(/_/g, " ")})`
    : "";
}

async function fetchHIP3Pulse(runtime: IAgentRuntime): Promise<string> {
  const hip3 = runtime.getService("VINCE_HIP3_SERVICE") as {
    getHIP3Pulse?: () => Promise<{ tldr: string } | null>;
  } | null;
  const data = (await hip3?.getHIP3Pulse?.().catch(() => null)) ?? null;
  return data?.tldr ? `**HIP-3:** ${data.tldr}` : "";
}

async function fetchSignalAggregator(runtime: IAgentRuntime): Promise<string> {
  const sigAgg = runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as {
    aggregateSignals?: (asset: string) => Promise<{
      direction?: string;
      confidence?: number;
      sources?: number;
    } | null>;
  } | null;
  const btcSignal =
    (await sigAgg?.aggregateSignals?.("BTC").catch(() => null)) ?? null;
  return btcSignal?.direction
    ? `**Signal (BTC):** ${btcSignal.direction} (${btcSignal.confidence ?? 0}% conf, ${btcSignal.sources ?? 0} sources)`
    : "";
}

async function fetchDeribitDVOL(runtime: IAgentRuntime): Promise<string> {
  const deribit = runtime.getService("VINCE_DERIBIT_SERVICE") as {
    getDVOL?: (currency: string) => Promise<{ dvol: number } | null>;
    getBestCoveredCalls?: (currency: string) => Promise<Array<{
      strike: number;
      premium: number;
      expiry: string;
    }> | null>;
  } | null;
  const [dvol, bestCalls] = await Promise.all([
    deribit?.getDVOL?.("BTC").catch(() => null) ?? null,
    deribit?.getBestCoveredCalls?.("BTC").catch(() => null) ?? null,
  ]);
  if (dvol?.dvol == null) return "";
  let line = `**BTC DVOL:** ${dvol.dvol.toFixed(1)}`;
  if (bestCalls?.[0]) {
    const top = bestCalls[0];
    line += ` | Best CC: $${top.strike} (${top.premium?.toFixed(2)} prem, ${top.expiry})`;
  }
  return line;
}

async function fetchBinanceTopTraders(runtime: IAgentRuntime): Promise<string> {
  const binance = runtime.getService("VINCE_BINANCE_SERVICE") as {
    getTopTraderPositions?: (
      asset: string,
    ) => Promise<{ longPercent: number; shortPercent: number } | null>;
  } | null;
  const topTraders =
    (await binance?.getTopTraderPositions?.("BTC").catch(() => null)) ?? null;
  return topTraders
    ? `**Top traders (BTC):** ${topTraders.longPercent?.toFixed(0)}% long / ${topTraders.shortPercent?.toFixed(0)}% short`
    : "";
}

async function fetchPaperBot(runtime: IAgentRuntime): Promise<string> {
  const paperBot = runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as {
    getStats?: () => Promise<{
      wins: number;
      losses: number;
      pnl: number;
    } | null>;
  } | null;
  const paperTrading = runtime.getService("VINCE_PAPER_TRADING_SERVICE") as {
    getStatus?: () => Promise<{
      openPositions?: number;
      pendingEntries?: number;
    } | null>;
  } | null;
  const [stats, botStatus] = await Promise.all([
    paperBot?.getStats?.().catch(() => null) ?? null,
    paperTrading?.getStatus?.().catch(() => null) ?? null,
  ]);
  let line = stats
    ? `**Paper bot:** ${stats.wins}W/${stats.losses}L (${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(0)})`
    : "**Paper bot:** No data";
  if (botStatus)
    line += ` | ${botStatus.openPositions ?? 0} open, ${botStatus.pendingEntries ?? 0} pending`;
  return line;
}

async function fetchGoalTracker(runtime: IAgentRuntime): Promise<string> {
  const goals = runtime.getService("VINCE_GOAL_TRACKER_SERVICE") as {
    getDailyProgress?: () => Promise<{
      pnlToday?: number;
      target?: number;
      pctComplete?: number;
    } | null>;
  } | null;
  const goalData =
    (await goals?.getDailyProgress?.().catch(() => null)) ?? null;
  return goalData?.target
    ? `**Daily goal:** $${goalData.pnlToday?.toFixed(0) ?? 0}/$${goalData.target} (${goalData.pctComplete?.toFixed(0) ?? 0}%)`
    : "";
}

async function fetchMandoMinutes(runtime: IAgentRuntime): Promise<string> {
  const newsSvc = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as {
    refreshData?: (force?: boolean) => Promise<void>;
    getTopHeadlines?: (
      limit: number,
    ) => Array<{ title: string; sentiment: string; impact: string }>;
    getVibeCheck?: () => string;
    getTLDR?: () => string;
    getOverallSentiment?: () => { sentiment: string; confidence: number };
  } | null;
  if (!newsSvc) return "";
  await newsSvc.refreshData?.();
  const vibeCheck = newsSvc.getVibeCheck?.() ?? "";
  const tldr = newsSvc.getTLDR?.() ?? "";
  const sentiment = newsSvc.getOverallSentiment?.();
  const headlines = newsSvc.getTopHeadlines?.(5) ?? [];
  const headlineLines = headlines.map((h) => {
    const dot =
      h.sentiment === "bullish"
        ? "🟢"
        : h.sentiment === "bearish"
          ? "🔴"
          : "⚪";
    return `${dot} ${h.title.slice(0, 80)}`;
  });
  return [
    vibeCheck ? `**MandoMinutes:** ${vibeCheck}` : "",
    sentiment
      ? `News sentiment: ${sentiment.sentiment} (${Math.round(sentiment.confidence)}% conf)`
      : "",
    tldr ? `TLDR: ${tldr}` : "",
    headlineLines.length > 0 ? `Headlines:\n${headlineLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchAlliumOnChain(runtime: IAgentRuntime): Promise<string> {
  const allium = runtime.getService("VINCE_ALLIUM_SERVICE") as {
    isConfigured?: () => boolean;
    getStandupOnChainSummary?: () => Promise<string | null>;
  } | null;
  if (!allium?.isConfigured?.()) return "";
  return (await allium.getStandupOnChainSummary?.()) ?? "";
}

async function fetchLiquidations(runtime: IAgentRuntime): Promise<string> {
  const binanceLiq = runtime.getService(
    "VINCE_BINANCE_LIQUIDATION_SERVICE",
  ) as {
    getLiquidationPressure?: (symbol?: string) => {
      direction: string;
      intensity: number;
      longLiqsCount: number;
      shortLiqsCount: number;
      longLiqsValue: number;
      shortLiqsValue: number;
    };
  } | null;
  const pressure = binanceLiq?.getLiquidationPressure?.();
  if (
    !pressure ||
    (pressure.longLiqsCount === 0 && pressure.shortLiqsCount === 0)
  )
    return "";
  const dir =
    pressure.direction === "long_liquidations"
      ? "Longs"
      : pressure.direction === "short_liquidations"
        ? "Shorts"
        : "Mixed";
  return `**Liquidations (5m):** ${dir} | ${pressure.longLiqsCount} long ($${(pressure.longLiqsValue / 1000).toFixed(0)}k) / ${pressure.shortLiqsCount} short ($${(pressure.shortLiqsValue / 1000).toFixed(0)}k) | intensity ${pressure.intensity}%`;
}

async function fetchOIDelta(runtime: IAgentRuntime): Promise<string> {
  const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
    getOpenInterest?: (
      asset: string,
    ) => { value: number; change24h: number | null } | null;
  } | null;
  if (!coinglass?.getOpenInterest) return "";
  const assets = getStandupTrackedAssets();
  const parts: string[] = [];
  for (const asset of assets.slice(0, 3)) {
    const oi = coinglass.getOpenInterest(asset);
    if (!oi) continue;
    const valueStr =
      oi.value >= 1e9
        ? `$${(oi.value / 1e9).toFixed(1)}B`
        : oi.value >= 1e6
          ? `$${(oi.value / 1e6).toFixed(0)}M`
          : `$${(oi.value / 1e3).toFixed(0)}k`;
    const changeStr =
      oi.change24h != null
        ? `${oi.change24h >= 0 ? "+" : ""}${oi.change24h.toFixed(1)}%`
        : "—";
    parts.push(`${asset} ${valueStr} (${changeStr})`);
  }
  return parts.length > 0 ? `**OI (24h Δ):** ${parts.join(" | ")}` : "";
}

async function fetchRegime(runtime: IAgentRuntime): Promise<string> {
  const regimeSvc = runtime.getService("VINCE_MARKET_REGIME_SERVICE") as {
    getRegime?: (asset: string) => Promise<{
      regime: string;
      adx: number | null;
      positionSizeMultiplier: number;
    } | null>;
  } | null;
  const regime =
    (await regimeSvc?.getRegime?.("BTC").catch(() => null)) ?? null;
  if (!regime) return "";
  const adxStr = regime.adx != null ? ` ADX ${regime.adx}` : "";
  return `**Regime (BTC):** ${regime.regime}${adxStr} | size ${regime.positionSizeMultiplier}x`;
}

export async function fetchVinceData(runtime: IAgentRuntime): Promise<string> {
  const blockLabels = [
    "EnrichedContext",
    "FearGreed",
    "HIP3",
    "SignalAgg",
    "Deribit",
    "Binance",
    "PaperBot",
    "Goals",
    "MandoMinutes",
    "Allium",
    "Liquidations",
    "OIDelta",
    "Regime",
  ];
  const results = await Promise.allSettled([
    fetchEnrichedContext(runtime),
    fetchFearGreed(runtime),
    fetchHIP3Pulse(runtime),
    fetchSignalAggregator(runtime),
    fetchDeribitDVOL(runtime),
    fetchBinanceTopTraders(runtime),
    fetchPaperBot(runtime),
    fetchGoalTracker(runtime),
    fetchMandoMinutes(runtime),
    fetchAlliumOnChain(runtime),
    fetchLiquidations(runtime),
    fetchOIDelta(runtime),
    fetchRegime(runtime),
  ]);

  const lines: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      lines.push(r.value);
    } else if (r.status === "rejected") {
      logger.warn(
        { err: r.reason, source: blockLabels[i] },
        "[STANDUP_DATA] VINCE block failed",
      );
    }
  });

  if (lines.length > 0) return lines.join("\n\n");

  // Fallback: read latest daily market brief from knowledge/research-daily/
  try {
    const briefDir = path.join(process.cwd(), "knowledge", "research-daily");
    if (fs.existsSync(briefDir)) {
      const briefs = fs
        .readdirSync(briefDir)
        .filter((f) => f.endsWith(".md") && f !== "README.md")
        .sort()
        .reverse();
      if (briefs.length > 0) {
        const latest = fs
          .readFileSync(path.join(briefDir, briefs[0]), "utf-8")
          .trim();
        const stripped = latest.replace(/^---[\s\S]*?---\s*/, "");
        const capped =
          stripped.length > 1100 ? stripped.slice(0, 1100) + "..." : stripped;
        logger.info(
          { file: briefs[0] },
          "[STANDUP_DATA] VINCE using daily brief fallback",
        );
        return `*(Live services unavailable -- using latest daily brief: ${briefs[0]})*\n\n${capped}`;
      }
    }
  } catch (briefErr) {
    logger.debug(
      { err: briefErr },
      "[STANDUP_DATA] VINCE daily brief fallback failed",
    );
  }

  return "*(Live data unavailable)*";
}

// ═══════════════════════════════════════════════════════════════════════
// ECHO: real CT sentiment from X (actual tweets, not a placeholder).
// When contextHints from VINCE are provided, builds 2-3 targeted queries.
// Sanitizes queries for X API; falls back to minimal "$BTC" if primary fails.
// ═══════════════════════════════════════════════════════════════════════

const X_QUERY_MAX_LEN = 200;

function sanitizeXQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ").slice(0, X_QUERY_MAX_LEN);
}

async function runXQueries(
  svc: {
    searchQuery: (opts: {
      query: string;
      maxResults?: number;
      hoursBack?: number;
      cacheTtlMs?: number;
    }) => Promise<
      Array<{
        id?: string;
        text: string;
        author?: { username?: string };
        metrics?: { likeCount?: number };
      }>
    >;
  },
  queries: string[],
  opts: { hoursBack: number; cacheTtlMs: number },
): Promise<
  Array<{
    id?: string;
    text: string;
    author?: { username?: string };
    metrics?: { likeCount?: number };
  }>
> {
  const allTweets: Array<{
    id?: string;
    text: string;
    author?: { username?: string };
    metrics?: { likeCount?: number };
  }> = [];
  const seen = new Set<string>();
  for (const query of queries) {
    const sanitized = sanitizeXQuery(query);
    if (!sanitized) continue;
    const tweets = await svc.searchQuery({
      ...opts,
      query: sanitized,
      maxResults: 5,
    });
    for (const t of tweets ?? []) {
      const key = (t as { id?: string }).id ?? t.text?.slice(0, 50) ?? "";
      if (key && !seen.has(key)) {
        seen.add(key);
        allTweets.push(t);
      }
    }
  }
  return allTweets;
}

export async function fetchEchoData(
  runtime: IAgentRuntime,
  contextHints?: string[],
): Promise<string> {
  try {
    const xSearchMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xSearch.service.js"
    ).catch(
      () => import("../../../plugin-x-research/src/services/xSearch.service"),
    );
    const xClientMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xClient.service.js"
    ).catch(
      () => import("../../../plugin-x-research/src/services/xClient.service"),
    );

    const initXClientFromEnv = xClientMod.initXClientFromEnv as (
      r: IAgentRuntime,
    ) => void;
    const getXSearchService = xSearchMod.getXSearchService as () => {
      searchQuery: (opts: {
        query: string;
        maxResults?: number;
        hoursBack?: number;
        cacheTtlMs?: number;
      }) => Promise<
        Array<{
          text: string;
          author?: { username?: string };
          metrics?: { likeCount?: number };
        }>
      >;
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

    let allTweets: Array<{
      id?: string;
      text: string;
      author?: { username?: string };
      metrics?: { likeCount?: number };
    }>;
    try {
      allTweets = await runXQueries(svc, uniqueQueries, opts);
    } catch (firstErr) {
      logger.warn(
        { err: firstErr, queries: uniqueQueries },
        "[STANDUP_DATA] fetchEchoData: primary queries failed, retrying with minimal",
      );
      try {
        allTweets = await runXQueries(svc, ["$BTC"], opts);
      } catch (fallbackErr) {
        logger.warn(
          { err: fallbackErr, lastQuery: "$BTC" },
          "[STANDUP_DATA] fetchEchoData: X unavailable",
        );
        return "**CT sentiment:** X API unavailable. Report from character knowledge only.";
      }
    }

    if (!allTweets.length)
      return "**CT sentiment:** No X data (check X_BEARER_TOKEN).";

    const tweetLines = allTweets.slice(0, 10).map((t) => {
      const handle = t.author?.username ?? "anon";
      const len = getStandupSnippetLen();
      const snippet =
        t.text?.length > len ? t.text.slice(0, len) + "…" : (t.text ?? "");
      return `@${handle}: ${snippet} (${t.metrics?.likeCount ?? 0} likes)`;
    });

    const queryNote =
      uniqueQueries.length > 1 ? ` [queries: ${uniqueQueries.join(", ")}]` : "";
    let sentimentBlock = `**CT sentiment (${allTweets.length} posts, last 24h)${queryNote}:**\n${tweetLines.join("\n")}`;

    // Append X content suggestions via LLM
    if (runtime.useModel && tweetLines.length > 0) {
      try {
        const suggestion = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: `You are ECHO, the crypto-twitter sentiment agent. Based on the tweets below, suggest 1–2 tweet or post ideas for our X account that would resonate with today's CT pulse. Specific hooks, not generic. One sentence each. No filler.\n\nTweets:\n${tweetLines.slice(0, 6).join("\n")}`,
          maxTokens: 150,
          temperature: 0.6,
        });
        const text = String(suggestion ?? "").trim();
        if (text && text.length > 15)
          sentimentBlock += `\n\n**X content ideas:** ${text}`;
      } catch {
        // non-fatal; content ideas are a bonus
      }
    }

    return sentimentBlock;
  } catch (err) {
    logger.warn(
      { err, lastQuery: "init or format" },
      "[STANDUP_DATA] fetchEchoData: X unavailable",
    );
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
      const cid =
        m.conditionId ?? (m as { condition_id?: string }).condition_id ?? "—";
      const prices = service.getPricesFromMarketPayload(m);
      const yesPct =
        prices?.yes_price != null
          ? `${(parseFloat(prices.yes_price) * 100).toFixed(0)}%`
          : "—";
      const question =
        (m.question ?? "").slice(0, 50) +
        (m.question && m.question.length > 50 ? "…" : "");
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
// Solus: directive referencing VINCE's data + last-week options strategy
// ═══════════════════════════════════════════════════════════════════════

function readWeeklyOptionsContext(): string {
  try {
    const filePath = path.join(
      process.cwd(),
      process.env.STANDUP_DELIVERABLES_DIR || "docs/standup",
      "weekly-options-context.md",
    );
    if (fs.existsSync(filePath))
      return fs.readFileSync(filePath, "utf-8").trim();
  } catch {
    /* non-fatal */
  }
  return "";
}

export async function fetchSolusData(_runtime: IAgentRuntime): Promise<string> {
  const lastWeek =
    process.env.SOLUS_LAST_WEEK_STRATEGY?.trim() ||
    readWeeklyOptionsContext() ||
    "No last-week strategy context provided. Set SOLUS_LAST_WEEK_STRATEGY or create docs/standup/weekly-options-context.md (or STANDUP_DELIVERABLES_DIR).";

  return `**Last week's strategy:** ${lastWeek}

**Options context (use VINCE's data from shared insights above):**
Read VINCE's section for: BTC price, funding, L/S ratio, market regime, DVOL, best covered call strike, signal direction.
Read Oracle's section for: Polymarket odds that inform confidence.

**Your job:** Given last week's position (above), propose this week's BTC covered call strike for Hypersurface (settle Friday 08:00 UTC).
State: strike price, direction (above/below), premium target, invalidation level.
Reference VINCE's DVOL, funding, and regime. Reference Oracle's odds.
If uncertain (like last week), say so and explain why with data.`;
}

// ═══════════════════════════════════════════════════════════════════════
// Sentinel: real git log + PRD scan + ProjectRadar + macro news (Tavily)
// ═══════════════════════════════════════════════════════════════════════

export async function fetchSentinelData(
  runtime: IAgentRuntime,
): Promise<string> {
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
    const prdDir = path.join(
      process.cwd(),
      process.env.STANDUP_DELIVERABLES_DIR || "docs/standup",
      "prds",
    );
    if (fs.existsSync(prdDir)) {
      const files = fs
        .readdirSync(prdDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, 3);
      if (files.length > 0)
        sections.push(`**Recent PRDs:** ${files.join(", ")}`);
    }
  } catch {
    /* non-fatal */
  }

  // 3. ProjectRadar (if Sentinel has the service)
  const radar = runtime.getService("PROJECT_RADAR_SERVICE") as {
    getProjectHealth?: () => Promise<{
      status?: string;
      blockers?: string[];
    } | null>;
    getOpenTODOs?: () => Promise<string[] | null>;
  } | null;
  if (radar) {
    try {
      const health =
        (await radar.getProjectHealth?.().catch(() => null)) ?? null;
      const todos = (await radar.getOpenTODOs?.().catch(() => null)) ?? null;
      if (health?.status)
        sections.push(
          `**Project:** ${health.status}${health.blockers?.length ? ` | Blockers: ${health.blockers.slice(0, 2).join(", ")}` : ""}`,
        );
      if (todos?.length)
        sections.push(`**TODOs:** ${todos.slice(0, 3).join("; ")}`);
    } catch {
      /* non-fatal */
    }
  }

  // 4. Macro news via Tavily
  try {
    const tavilyMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/utils/tavilySearch.js"
    ).catch(() => import("../../../plugin-x-research/src/utils/tavilySearch"));
    const tavilySearch = tavilyMod.tavilySearch as (
      query: string,
      r?: IAgentRuntime,
      maxResults?: number,
    ) => Promise<string[]>;
    const snippets = await tavilySearch(
      "crypto regulation Fed interest rates macro news today",
      runtime,
      3,
    );
    if (snippets?.length > 0)
      sections.push(`**Macro news:**\n${snippets.join("\n")}`);
  } catch {
    /* Tavily not available */
  }

  sections.push(
    "**Today's dev task (OpenClaw):** Using our OpenClaw setup as dev on the vince repo (IkigaiLabsETH/vince), what should we work on today? Consider: open PRDs, recent git activity, knowledge gaps, and agent improvements. One concrete task with expected outcome.",
  );

  sections.push(
    "**Your job:** What shipped, what's next, one architecture item, the dev task above, **proactively suggest 1–2 tech focus areas** for the team (what to build, fix, or prioritize — name the plugin, file, or feature), and flag any macro news that affects our trades.",
  );
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
    const solusMatch = yesterdayReport.match(
      /\*\*Solus'?s call:?\*\*\s*\[?([^\]]*)\]?\s*[—\-]\s*([^\n*]+)/i,
    );
    if (solusMatch) {
      lines.push(
        `**Yesterday:** Solus's call: ${solusMatch[1].trim()} — ${solusMatch[2].trim().slice(0, 120)}`,
      );
    }
    const tldrMatch = yesterdayReport.match(/\*\*TL;DR:?\*\*\s*([^\n#]+)/);
    if (tldrMatch)
      lines.push(`**Yesterday TL;DR:** ${tldrMatch[1].trim().slice(0, 100)}`);
  } else {
    lines.push(
      "**Yesterday:** No day report found (first run or missing file).",
    );
  }
  if (todayInsights) {
    const vinceBlock = todayInsights.match(/## VINCE[\s\S]*?(?=## |$)/i);
    if (vinceBlock) {
      const firstTable = vinceBlock[0].match(
        /\|[^\n]+\|\n\|[^\n]+\|\n([\s\S]*?)(?=\n\n|\n\*\*|$)/,
      );
      if (firstTable)
        lines.push(
          `**Today (from shared insights):** ${firstTable[1].replace(/\n/g, " ").slice(0, 200)}`,
        );
      else lines.push("**Today:** Shared insights available (see full doc).");
    } else {
      lines.push("**Today:** Shared insights available.");
    }
  } else {
    lines.push("**Today:** Shared insights not yet built.");
  }
  lines.push(
    "**Your job:** Delta reporter — what changed since yesterday; was yesterday's Solus call tracking? One knowledge gap, one content idea, one cross-agent link.",
  );
  return lines.join("\n\n");
}

export async function fetchElizaData(runtime: IAgentRuntime): Promise<string> {
  const sections: string[] = [];
  try {
    const delta = await buildDeltaReport();
    sections.push(delta);
  } catch (e) {
    logger.warn(
      { err: e },
      "[STANDUP_DATA] fetchElizaData: delta build failed",
    );
    sections.push(
      "**Delta:** Could not load yesterday vs today; report from memory only.",
    );
  }
  try {
    const facts = await runtime.getMemories({
      tableName: "facts",
      count: 8,
      unique: true,
    });
    const factLines = facts
      .filter((f) => f.content?.text)
      .slice(0, 5)
      .map(
        (f) => `- ${String(f.content.text).slice(0, getStandupSnippetLen())}`,
      );
    if (factLines.length > 0)
      sections.push(
        `**Recent facts in memory (${factLines.length}):**\n${factLines.join("\n")}`,
      );
    else sections.push("**Recent facts:** None stored yet.");
  } catch {
    sections.push("**Facts:** Query failed.");
  }

  // Substack + knowledge expansion suggestions via LLM (with clear labels)
  if (runtime.useModel) {
    try {
      const context = sections.join("\n");
      const suggestion = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: `You are Eliza (CEO, Knowledge & Research). Based on today's standup context below, output exactly two labeled lines:\n**Substack idea:** [One specific, timely content topic for Ikigai Studio Substack — tied to what's happening in crypto/AI/DeFi today]\n**Knowledge to expand:** [One specific area in the knowledge/ directory to add or update — name the category and what's missing]\n\nOne sentence each. No filler, no intro.\n\nContext:\n${context}`,
        maxTokens: 200,
        temperature: 0.6,
      });
      const text = String(suggestion ?? "").trim();
      if (text && text.length > 20) {
        const hasLabels =
          text.includes("**Substack idea:**") ||
          text.includes("**Knowledge to expand:**");
        if (hasLabels) {
          sections.push(text);
        } else {
          const lines = text.split("\n").filter((l) => l.trim());
          sections.push(`**Substack idea:** ${lines[0] ?? text}`);
          if (lines[1]) sections.push(`**Knowledge to expand:** ${lines[1]}`);
        }
      }
    } catch {
      sections.push(
        "**Substack idea:** [LLM unavailable -- suggest based on yesterday's delta]",
      );
      sections.push(
        "**Knowledge to expand:** [LLM unavailable -- review knowledge/INDEX.md for stale categories]",
      );
    }
  } else {
    sections.push(
      "**Substack idea:** Review yesterday's delta for a timely Ikigai Studio topic.",
    );
    sections.push(
      "**Knowledge to expand:** Check knowledge/FRESHNESS.md for stale categories to update.",
    );
  }

  return sections.join("\n\n");
}

// ═══════════════════════════════════════════════════════════════════════
// Otaku: wallet setup in progress — concrete next steps
// ═══════════════════════════════════════════════════════════════════════

export async function fetchOtakuData(_runtime: IAgentRuntime): Promise<string> {
  return `**Status:** Under construction -- no wallet execution yet.

**Steps to get operational:**
1. Configure Bankr wallet (Base + Solana) -- set EVM_PRIVATE_KEY and SOLANA_PRIVATE_KEY in .env
2. Test with plugin-evm / plugin-solana: simple token balance check
3. Once balance check works, enable DefiLlama yield scanning (already loaded)

**Today's task:** Complete step 1 -- generate or import wallet keys and verify Bankr connection. Report: wallet address, chain, balance.

*Watching team reports for DeFi opportunities to queue once wallet is live.*`;
}

// ═══════════════════════════════════════════════════════════════════════
// Clawterm: OpenClaw skills, setup, trending articles on X + web.
// LLM summary so the standup section adds value within the cap.
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
    ).catch(
      () => import("../../../plugin-x-research/src/services/xSearch.service"),
    );
    const xClientMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/services/xClient.service.js"
    ).catch(
      () => import("../../../plugin-x-research/src/services/xClient.service"),
    );
    const tavilyMod = await import(
      /* webpackIgnore: true */ "../../../plugin-x-research/src/utils/tavilySearch.js"
    ).catch(() => import("../../../plugin-x-research/src/utils/tavilySearch"));

    const getXSearchService = xSearchMod.getXSearchService as () => {
      searchQuery: (opts: {
        query: string;
        maxResults?: number;
        hoursBack?: number;
        cacheTtlMs?: number;
      }) => Promise<
        Array<{
          id: string;
          text: string;
          author?: { username?: string };
          metrics?: { likeCount?: number };
        }>
      >;
    };
    const initXClientFromEnv = xClientMod.initXClientFromEnv as (
      r: IAgentRuntime,
    ) => void;
    const tavilySearch = tavilyMod.tavilySearch as (
      query: string,
      r?: IAgentRuntime,
      maxResults?: number,
    ) => Promise<string[]>;

    initXClientFromEnv(runtime);
    const searchService = getXSearchService();

    const cacheOpts = {
      hoursBack: CLAWTERM_HOURS_BACK,
      cacheTtlMs: 60 * 60 * 1000,
    };
    const queries: string[] = [
      "OpenClaw skills trending",
      "OpenClaw setup tips tutorial",
      "OpenClaw popular articles",
    ];
    if (contextHints?.length) {
      const first = contextHints[0];
      if (first && /^(BTC|SOL|ETH|HYPE)/i.test(first.split(/\s/)[0])) {
        queries.push(`${first.split(/\s/)[0]} OpenClaw agents`);
      }
    }
    const tweetPromises = queries.slice(0, 3).map((q) =>
      searchService.searchQuery({
        ...cacheOpts,
        query: q,
        maxResults: CLAWTERM_X_MAX,
      }),
    );
    const results = await Promise.all(tweetPromises);
    const combined = results.flat();
    const byId = new Map(combined.map((t) => [t.id, t]));
    const deduped = Array.from(byId.values()).slice(0, 15);

    const formatOne = (t: {
      text: string;
      author?: { username?: string };
      metrics?: { likeCount?: number };
    }) => {
      const handle = t.author?.username ?? "unknown";
      const snippetLen = getStandupSnippetLen();
      const snippet =
        t.text.length > snippetLen ? t.text.slice(0, snippetLen) + "…" : t.text;
      const likes = t.metrics?.likeCount ?? 0;
      return `@${handle}: ${snippet} (${likes} likes)`;
    };

    const rawXBlock =
      deduped.length > 0
        ? deduped.map(formatOne).join("\n")
        : "No recent X posts about OpenClaw in the last 24h.";

    const webSnippets = await tavilySearch(
      "OpenClaw skills setup tutorial news",
      runtime,
      3,
    );
    const rawWebBlock = webSnippets.length > 0 ? webSnippets.join("\n") : "";

    const rawData = `=== X (OpenClaw) ===\n${rawXBlock}${rawWebBlock ? `\n\n=== Web ===\n${rawWebBlock}` : ""}`;

    if (runtime.useModel) {
      try {
        const summary = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: `You are Clawterm, the OpenClaw terminal. Summarize the data below for the daily standup in 2-4 sentences. Focus on: what OpenClaw skills are trending, any setup tips or popular articles, what builders are shipping. Be concrete and specific. No filler intros, no AI slop (banned: leverage, utilize, streamline, robust, cutting-edge, game-changer, synergy, delve, landscape, dive into). If the data is thin, say so in one sentence. End with **one concrete tech-focus suggestion**: what the team should focus on or try next (OpenClaw skill, setup, or tooling). Be specific and actionable — name the skill or tool.\n\nData:\n${rawData}`,
          maxTokens: 300,
          temperature: 0.5,
        });
        const text = String(summary ?? "").trim();
        if (text && text.length > 30) return text;
      } catch (err) {
        logger.debug(
          { err },
          "[STANDUP_DATA] Clawterm LLM summary failed, using raw",
        );
      }
    }

    return rawData;
  } catch (err) {
    logger.warn(
      { err },
      "[STANDUP_DATA] fetchClawtermData: X/Tavily unavailable, using fallback",
    );
    return "OpenClaw data: run CLAWTERM_DAY_REPORT in chat for full report; here report gateway status and one take from knowledge.";
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
    case "vince": {
      if (process.env.STANDUP_VINCE_USE_REPORT === "true") {
        try {
          const { generateStandupReport } =
            await import("../../../plugin-vince/src/actions/report.action");
          const report = await generateStandupReport(runtime);
          if (report?.trim()) return report.trim();
        } catch (err) {
          logger.warn(
            { err },
            "[STANDUP_DATA] VINCE report-for-standup failed, falling back to fetchVinceData",
          );
        }
      }
      return fetchVinceData(runtime);
    }
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
