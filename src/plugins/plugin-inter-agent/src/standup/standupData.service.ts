/**
 * Standup Data Service
 *
 * Aggregates real data from various services for standup reports.
 * Each agent calls the relevant methods to get live data for their report.
 */

import { type IAgentRuntime, logger } from "@elizaos/core";

/** Core assets we track */
const CORE_ASSETS = ["BTC", "SOL", "HYPE"] as const;
type CoreAsset = (typeof CORE_ASSETS)[number];

/** Market data for an asset */
export interface AssetMarketData {
  asset: string;
  price: number | null;
  change24h: number | null;
  funding: number | null;
  fundingSignal: "bullish" | "bearish" | "neutral";
  openInterest: number | null;
  oiChange24h: number | null;
}

/** Paper bot performance */
export interface PaperBotStats {
  todayPnL: number;
  todayWins: number;
  todayLosses: number;
  weekWinRate: number;
  totalTrades: number;
}

/** Sentiment data */
export interface SentimentData {
  asset: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: "high" | "medium" | "low";
  source: string;
}

/** Aggregated standup data */
export interface StandupData {
  timestamp: number;
  markets: AssetMarketData[];
  paperBot: PaperBotStats | null;
  sentiment: SentimentData[];
  fearGreed: { value: number; label: string } | null;
}

/**
 * Get market data for core assets
 */
export async function getMarketData(runtime: IAgentRuntime): Promise<AssetMarketData[]> {
  const results: AssetMarketData[] = [];

  try {
    // Try to get CoinGlass service
    const coinGlass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
      getFunding?: (asset: string) => { rate: number } | null;
      getOpenInterest?: (asset: string) => { total: number; change24h?: number } | null;
    } | null;

    // Try to get market data service for prices
    const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
      getPrice?: (asset: string) => { price: number; change24h: number } | null;
    } | null;

    for (const asset of CORE_ASSETS) {
      const data: AssetMarketData = {
        asset,
        price: null,
        change24h: null,
        funding: null,
        fundingSignal: "neutral",
        openInterest: null,
        oiChange24h: null,
      };

      // Get price
      if (marketData?.getPrice) {
        const priceData = marketData.getPrice(asset);
        if (priceData) {
          data.price = priceData.price;
          data.change24h = priceData.change24h;
        }
      }

      // Get funding
      if (coinGlass?.getFunding) {
        const fundingData = coinGlass.getFunding(asset);
        if (fundingData) {
          data.funding = fundingData.rate;
          // Negative funding = longs pay shorts = bullish
          if (fundingData.rate < -0.005) {
            data.fundingSignal = "bullish";
          } else if (fundingData.rate > 0.01) {
            data.fundingSignal = "bearish";
          }
        }
      }

      // Get OI
      if (coinGlass?.getOpenInterest) {
        const oiData = coinGlass.getOpenInterest(asset);
        if (oiData) {
          data.openInterest = oiData.total;
          data.oiChange24h = oiData.change24h ?? null;
        }
      }

      results.push(data);
    }
  } catch (err) {
    logger.warn({ err }, "[StandupData] Failed to get market data");
  }

  return results;
}

/**
 * Get paper bot stats
 */
export async function getPaperBotStats(runtime: IAgentRuntime): Promise<PaperBotStats | null> {
  try {
    const tradeJournal = runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as {
      getStats?: () => {
        wins: number;
        losses: number;
        totalPnL: number;
        winRate: number;
      };
    } | null;

    if (tradeJournal?.getStats) {
      const stats = tradeJournal.getStats();
      return {
        todayPnL: stats.totalPnL, // TODO: filter to today
        todayWins: stats.wins,
        todayLosses: stats.losses,
        weekWinRate: stats.winRate,
        totalTrades: stats.wins + stats.losses,
      };
    }
  } catch (err) {
    logger.warn({ err }, "[StandupData] Failed to get paper bot stats");
  }

  return null;
}

/**
 * Get fear & greed index
 */
export async function getFearGreed(runtime: IAgentRuntime): Promise<{ value: number; label: string } | null> {
  try {
    const coinGlass = runtime.getService("VINCE_COINGLASS_SERVICE") as {
      getFearGreed?: () => { value: number; classification: string } | null;
    } | null;

    if (coinGlass?.getFearGreed) {
      const data = coinGlass.getFearGreed();
      if (data) {
        return {
          value: data.value,
          label: data.classification,
        };
      }
    }
  } catch (err) {
    logger.warn({ err }, "[StandupData] Failed to get fear & greed");
  }

  return null;
}

/**
 * Get all standup data in one call
 */
export async function getStandupData(runtime: IAgentRuntime): Promise<StandupData> {
  const [markets, paperBot, fearGreed] = await Promise.all([
    getMarketData(runtime),
    getPaperBotStats(runtime),
    getFearGreed(runtime),
  ]);

  return {
    timestamp: Date.now(),
    markets,
    paperBot,
    sentiment: [], // TODO: integrate with ECHO's xSentiment service
    fearGreed,
  };
}

/**
 * Format market data as markdown table
 */
export function formatMarketTable(markets: AssetMarketData[]): string {
  if (markets.length === 0) {
    return "*No market data available*";
  }

  const rows = markets.map((m) => {
    const price = m.price ? `$${m.price.toLocaleString()}` : "—";
    const change = m.change24h !== null ? `${m.change24h > 0 ? "+" : ""}${m.change24h.toFixed(1)}%` : "—";
    const funding = m.funding !== null ? `${(m.funding * 100).toFixed(3)}%` : "—";
    const signal = m.fundingSignal === "bullish" ? "🟢" : m.fundingSignal === "bearish" ? "🔴" : "🟡";
    return `| ${m.asset} | ${price} | ${change} | ${funding} | ${signal} |`;
  });

  return `| Asset | Price | 24h | Funding | Signal |
|-------|-------|-----|---------|--------|
${rows.join("\n")}`;
}

/**
 * Format paper bot stats as markdown
 */
export function formatPaperBotStats(stats: PaperBotStats | null): string {
  if (!stats) {
    return "*Paper bot data not available*";
  }

  return `- Today: ${stats.todayWins}W/${stats.todayLosses}L (${stats.todayPnL > 0 ? "+" : ""}$${stats.todayPnL.toFixed(0)})
- Week win rate: ${(stats.weekWinRate * 100).toFixed(0)}%
- Total trades: ${stats.totalTrades}`;
}

/**
 * Generate signal summary
 */
export function generateSignalSummary(markets: AssetMarketData[]): string {
  const bullish = markets.filter((m) => m.fundingSignal === "bullish").map((m) => m.asset);
  const bearish = markets.filter((m) => m.fundingSignal === "bearish").map((m) => m.asset);
  const neutral = markets.filter((m) => m.fundingSignal === "neutral").map((m) => m.asset);

  const lines: string[] = [];
  if (bullish.length > 0) {
    lines.push(`- 🟢 **Bullish**: ${bullish.join(", ")} (negative funding)`);
  }
  if (bearish.length > 0) {
    lines.push(`- 🔴 **Bearish**: ${bearish.join(", ")} (high funding)`);
  }
  if (neutral.length > 0) {
    lines.push(`- 🟡 **Neutral**: ${neutral.join(", ")}`);
  }

  return lines.length > 0 ? lines.join("\n") : "*No clear signals*";
}
