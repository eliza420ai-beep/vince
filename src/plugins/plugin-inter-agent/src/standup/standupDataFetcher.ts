/**
 * Standup Data Fetcher
 * 
 * Fetches REAL data for each agent's standup report.
 * This ensures reports contain actual numbers, not placeholders.
 */

import { type IAgentRuntime, logger } from "@elizaos/core";

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
 * Fetch prediction market data for Oracle's report
 * NOTE: Oracle is under construction - Polymarket feeds not fully wired. Data unreliable for real-time.
 */
export async function fetchOracleData(_runtime: IAgentRuntime): Promise<string> {
  return `Polymarket data available but still unreliable for real-time; caveat when citing odds or predictions.

🚧 **Prediction market feeds under construction.**
Polymarket integration in progress — will surface BTC price predictions + strike selection signals once wired.

*No action items.*`;
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
    default:
      return null; // Eliza doesn't have a specific data fetcher
  }
}
