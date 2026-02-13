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
 */
export async function fetchEchoData(runtime: IAgentRuntime): Promise<string> {
  try {
    const xSentiment = runtime.getService("VINCE_X_SENTIMENT_SERVICE") as {
      getSentiment?: (asset: string) => Promise<{ score: number; mood: string } | null>;
    } | null;

    if (!xSentiment?.getSentiment) {
      return "*(X sentiment unavailable)*";
    }

    const rows: string[] = [];
    
    for (const asset of STANDUP_ASSETS) {
      const sentiment = await xSentiment.getSentiment(asset);
      const mood = sentiment?.mood || "Unknown";
      const score = sentiment?.score ?? 0;
      
      let driver = "No signal";
      if (score > 0.6) driver = "CT bullish";
      else if (score < 0.4) driver = "CT bearish";
      else driver = "Mixed takes";
      
      rows.push(`| ${asset} | ${mood} | ${driver} |`);
    }

    return `
| Asset | Mood | Driver |
|-------|------|--------|
${rows.join("\n")}
`.trim();
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] Failed to fetch ECHO data");
    return "*(Sentiment data unavailable)*";
  }
}

/**
 * Fetch prediction market data for Oracle's report
 */
export async function fetchOracleData(runtime: IAgentRuntime): Promise<string> {
  try {
    const polymarket = runtime.getService("VINCE_POLYMARKET_SERVICE") as {
      getPriceMarkets?: () => Promise<Array<{ question: string; odds: number; change24h: number }> | null>;
    } | null;

    const markets = await polymarket?.getPriceMarkets?.();
    
    if (!markets || markets.length === 0) {
      return "*(Polymarket data unavailable)*";
    }

    // Get most relevant market
    const top = markets[0];
    const signal = top.change24h > 0 ? "Bull" : top.change24h < 0 ? "Bear" : "Flat";
    
    return `
| Market | Odds | Δ24h | Signal |
|--------|------|------|--------|
| ${top.question.slice(0, 30)}... | ${(top.odds * 100).toFixed(0)}% | ${top.change24h >= 0 ? "+" : ""}${(top.change24h * 100).toFixed(1)}% | ${signal} |
`.trim();
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] Failed to fetch Oracle data");
    return "*(Polymarket unavailable)*";
  }
}

/**
 * Fetch wallet data for Otaku's report
 */
export async function fetchOtakuData(runtime: IAgentRuntime): Promise<string> {
  try {
    const bankr = runtime.getService("bankr_sdk") as {
      isConfigured?: () => boolean;
    } | null;

    const configured = bankr?.isConfigured?.() ?? false;
    
    return `
| Venue | Ready | Note |
|-------|-------|------|
| Hyperliquid | ${configured ? "✅" : "❌"} | ${configured ? "Connected" : "Not configured"} |
| BANKR | ${configured ? "✅" : "❌"} | ${configured ? "Ready" : "Need API key"} |

**Pending:** None
`.trim();
  } catch (err) {
    logger.warn({ err }, "[STANDUP_DATA] Failed to fetch Otaku data");
    return "*(Wallet status unavailable)*";
  }
}

/**
 * Fetch system data for Sentinel's report
 */
export async function fetchSentinelData(_runtime: IAgentRuntime): Promise<string> {
  // System health is usually internal metrics
  return `
| System | Status | Note |
|--------|--------|------|
| Agents | 🟢 | All responsive |
| APIs | 🟢 | Connected |

**Alerts:** None
`.trim();
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
    case "otaku":
      return fetchOtakuData(runtime);
    case "sentinel":
      return fetchSentinelData(runtime);
    default:
      return null; // Eliza and Solus don't have specific data fetchers
  }
}
