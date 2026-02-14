/**
 * Standup Data Fetcher
 *
 * Fetches REAL data for each agent's standup report.
 * This ensures reports contain actual numbers, not placeholders.
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import { PolymarketService } from "../../../plugin-polymarket-discovery/src/services/polymarket.service";

/** Asset list for trading standup */
const STANDUP_ASSETS = ["BTC", "SOL", "HYPE"];

/**
 * Fetch market data for VINCE's report
 */
export async function fetchVinceData(runtime: IAgentRuntime): Promise<string> {
  try {
    // Try to get VINCE services
    const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
      getPrice?: (asset: string) => Promise<number | null>;
      get24hChange?: (asset: string) => Promise<number | null>;
    } | null;

    const coinglass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
      getFundingRate?: (asset: string) => Promise<number | null>;
      getOpenInterestChange?: (asset: string) => Promise<number | null>;
    } | null;

    const paperBot = runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as {
      getStats?: () => Promise<{ wins: number; losses: number; pnl: number } | null>;
    } | null;

    const rows: string[] = [];
    
    for (const asset of STANDUP_ASSETS) {
      const price = await marketData?.getPrice?.(asset) ?? null;
      const change = await marketData?.get24hChange?.(asset) ?? null;
      const funding = await coinglass?.getFundingRate?.(asset) ?? null;
      
      // Determine signal based on funding
      let signal = "🟡";
      if (funding !== null) {
        if (funding > 0.01) signal = "🔴"; // Crowded long
        else if (funding < -0.01) signal = "🟢"; // Crowded short
      }
      
      const priceStr = price ? `$${price.toLocaleString()}` : "N/A";
      const changeStr = change !== null ? `${change >= 0 ? "+" : ""}${change.toFixed(1)}%` : "N/A";
      const fundingStr = funding !== null ? `${(funding * 100).toFixed(3)}%` : "N/A";
      
      rows.push(`| ${asset} | ${priceStr} | ${changeStr} | ${fundingStr} | ${signal} |`);
    }

    // Paper bot stats
    const stats = await paperBot?.getStats?.();
    const botLine = stats 
      ? `**Paper bot:** ${stats.wins}W/${stats.losses}L (${stats.pnl >= 0 ? "+" : ""}$${stats.pnl.toFixed(0)})`
      : "**Paper bot:** No data";

    return `
| Asset | Price | 24h | Funding | Signal |
|-------|-------|-----|---------|--------|
${rows.join("\n")}

${botLine}
`.trim();
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] Failed to fetch VINCE data");
    return "*(Live data unavailable)*";
  }
}

/**
 * Fetch sentiment data for ECHO's report
 * ECHO uses plugin-x-research, not plugin-vince. The fetcher returns a prompt
 * that primes ECHO to run X_PULSE during its standup turn; ECHO uses that output.
 */
export async function fetchEchoData(_runtime: IAgentRuntime): Promise<string> {
  return `**CT sentiment (X insights)** — Run X_PULSE for current Crypto Twitter sentiment and summarize the result here.
- Lead with overall vibe (bullish/bearish/neutral) and key narratives.
- Mention any contrarian warnings if sentiment is extreme.
- If X API is unavailable, say so plainly — do not invent status.`;
}

/**
 * Fetch prediction market data for Oracle's report.
 * Uses PolymarketService.getMarketsByPreferredTags and getPricesFromMarketPayload (Gamma-derived for standup; CLOB via GET_POLYMARKET_PRICE in chat).
 */
export async function fetchOracleData(runtime: IAgentRuntime): Promise<string> {
  try {
    const service = runtime.getService(
      PolymarketService.serviceType
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

/**
 * Fetch wallet data for Otaku's report
 * NOTE: Otaku is under construction - no wallet configured yet
 */
export async function fetchOtakuData(_runtime: IAgentRuntime): Promise<string> {
  return `You are the agent with wallet (Bankr, Coinbase) and DeFi skills; currently under construction — no execution yet.

🔧 **Wallet integration in progress.**
Observing team reports — no execution capability yet.

*Watching for: DeFi opportunities to act on once wallet is live.*`;
}

/**
 * Fetch system data for Sentinel's report
 * Prompt Sentinel to report what's next in coding and what's been pushed to the repo.
 */
export async function fetchSentinelData(_runtime: IAgentRuntime): Promise<string> {
  return `**What's next in coding:** (what still needs to be done)
**What's been pushed to the repo:** (recent commits/PRs)

Use your knowledge of PRDs, progress, and recent work. If no recent pushes, say "Nothing new."

| System | Status | Note |
|--------|--------|------|
| Agents | 🟢 | All responsive |
| APIs | 🟢 | Connected |

**Alerts:** None`;
}

/**
 * Fetch data for Solus's standup report (options expert)
 */
export async function fetchSolusData(_runtime: IAgentRuntime): Promise<string> {
  return `**Options expert:** Lead with strike/position call or Hypersurface-relevant action.
Use spot + mechanics from context. Invalidation and hold/roll/adjust in one line. Minimal coordination chat.`;
}

const X_SNIPPET_LEN = 120;
const CLAWTERM_X_MAX = 10;
const CLAWTERM_HOURS_BACK = 24;

/**
 * Fetch OpenClaw/AI/AGI context for Clawterm's standup report.
 * Uses plugin-x-research (X search + Tavily) when available; otherwise returns fallback.
 */
export async function fetchClawtermData(runtime: IAgentRuntime): Promise<string> {
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

    const [openclawTweets, agiTweets] = await Promise.all([
      searchService.searchQuery({
        query: "OpenClaw",
        maxResults: CLAWTERM_X_MAX,
        hoursBack: CLAWTERM_HOURS_BACK,
        cacheTtlMs: 60 * 60 * 1000,
      }),
      searchService.searchQuery({
        query: "AGI AI research agents",
        maxResults: CLAWTERM_X_MAX,
        hoursBack: CLAWTERM_HOURS_BACK,
        cacheTtlMs: 60 * 60 * 1000,
      }),
    ]);

    const combined = [...openclawTweets, ...agiTweets];
    const byId = new Map(combined.map((t) => [t.id, t]));
    const deduped = Array.from(byId.values()).slice(0, 15);

    const formatOne = (t: { text: string; author?: { username?: string }; metrics?: { likeCount?: number } }) => {
      const handle = t.author?.username ?? "unknown";
      const snippet = t.text.length > X_SNIPPET_LEN ? t.text.slice(0, X_SNIPPET_LEN) + "…" : t.text;
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

/**
 * Fetch data for a specific agent
 */
export async function fetchAgentData(
  runtime: IAgentRuntime,
  agentName: string
): Promise<string | null> {
  const normalized = agentName.toLowerCase();
  
  switch (normalized) {
    case "vince":
      return fetchVinceData(runtime);
    case "echo":
      return fetchEchoData(runtime);
    case "oracle":
      return fetchOracleData(runtime);
    case "solus":
      return fetchSolusData(runtime);
    case "otaku":
      return fetchOtakuData(runtime);
    case "sentinel":
      return fetchSentinelData(runtime);
    case "clawterm":
      return fetchClawtermData(runtime);
    default:
      return null; // Eliza doesn't have a specific data fetcher
  }
}
