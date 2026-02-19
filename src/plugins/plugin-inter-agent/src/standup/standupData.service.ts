/**
 * Standup Data Service
 *
 * Aggregates REAL data from VINCE's services for standup reports.
 * Each agent calls getStandupData() to get live market data.
 *
 * Data sources:
 * - VINCE_COINGLASS_SERVICE: funding, L/S ratio, OI, fear/greed
 * - VINCE_MARKET_DATA_SERVICE: enriched market context (prices, funding, vol)
 * - VINCE_TRADE_JOURNAL_SERVICE: paper bot performance stats
 * - VINCE_COINGECKO_SERVICE: fallback prices
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
  longShortRatio: number | null;
  dvol: number | null;
}

/** Paper bot performance */
export interface PaperBotStats {
  todayPnL: number;
  totalPnL: number;
  wins: number;
  losses: number;
  winRate: number;
  totalTrades: number;
  recentTrades: Array<{
    asset: string;
    direction: string;
    pnl: number;
    timestamp: number;
  }>;
}

/** Sentiment data */
export interface SentimentData {
  asset: string;
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: "high" | "medium" | "low";
  score: number;
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

// Service type definitions for proper typing
interface CoinGlassService {
  getFunding?: (asset: string) => { rate: number; timestamp?: number } | null;
  getOpenInterest?: (
    asset: string,
  ) => { total: number; change24h?: number } | null;
  getLongShortRatio?: (asset: string) => { ratio: number } | null;
  getFearGreed?: () => { value: number; classification: string } | null;
  getAllFunding?: () => Array<{ asset: string; rate: number }>;
}

interface MarketDataService {
  getEnrichedContext?: (asset: string) => Promise<{
    asset: string;
    price?: number;
    change24h?: number;
    funding?: number;
    fundingRate?: number;
    openInterest?: number;
    longShortRatio?: number;
  } | null>;
  getAllContexts?: () => Promise<
    Array<{
      asset: string;
      price?: number;
      change24h?: number;
      funding?: number;
      fundingRate?: number;
      openInterest?: number;
    }>
  >;
  getDVOL?: (asset: string) => Promise<number | null>;
}

interface TradeJournalService {
  getStats?: () => {
    wins: number;
    losses: number;
    totalPnL: number;
    winRate: number;
  };
  getRecentTrades?: (count: number) => Array<{
    asset?: string;
    direction?: string;
    pnl?: number;
    exitTimestamp?: number;
    positionId: string;
  }>;
}

interface CoinGeckoService {
  getPrice?: (asset: string) => { price: number; change24h?: number } | null;
}

/**
 * Get market data for core assets using VINCE's real services
 */
export async function getMarketData(
  runtime: IAgentRuntime,
): Promise<AssetMarketData[]> {
  const results: AssetMarketData[] = [];

  try {
    // Get VINCE services
    const coinGlass = runtime.getService(
      "VINCE_COINGLASS_SERVICE",
    ) as CoinGlassService | null;
    const marketData = runtime.getService(
      "VINCE_MARKET_DATA_SERVICE",
    ) as MarketDataService | null;
    const coingecko = runtime.getService(
      "VINCE_COINGECKO_SERVICE",
    ) as CoinGeckoService | null;

    for (const asset of CORE_ASSETS) {
      const data: AssetMarketData = {
        asset,
        price: null,
        change24h: null,
        funding: null,
        fundingSignal: "neutral",
        openInterest: null,
        oiChange24h: null,
        longShortRatio: null,
        dvol: null,
      };

      // Try MarketDataService first (has enriched context)
      if (marketData?.getEnrichedContext) {
        try {
          const ctx = await marketData.getEnrichedContext(asset);
          if (ctx) {
            data.price = ctx.price ?? null;
            data.change24h = ctx.change24h ?? null;
            data.funding = ctx.funding ?? ctx.fundingRate ?? null;
            data.openInterest = ctx.openInterest ?? null;
            data.longShortRatio = ctx.longShortRatio ?? null;
          }
        } catch (err) {
          logger.debug(
            { err, asset },
            "[StandupData] MarketData.getEnrichedContext failed",
          );
        }
      }

      // Fallback to CoinGecko for price
      if (data.price === null && coingecko?.getPrice) {
        try {
          const priceData = coingecko.getPrice(asset);
          if (priceData) {
            data.price = priceData.price;
            data.change24h = priceData.change24h ?? null;
          }
        } catch (err) {
          logger.debug(
            { err, asset },
            "[StandupData] CoinGecko.getPrice failed",
          );
        }
      }

      // Get funding from CoinGlass
      if (coinGlass?.getFunding) {
        try {
          const fundingData = coinGlass.getFunding(asset);
          if (fundingData) {
            data.funding = fundingData.rate;
            // Negative funding = longs pay shorts = bearish (shorts in demand)
            // Positive funding = shorts pay longs = bullish (longs in demand)
            // Actually: negative funding means shorts pay longs, so longs are crowded
            if (fundingData.rate < -0.005) {
              data.fundingSignal = "bearish"; // Longs crowded
            } else if (fundingData.rate > 0.01) {
              data.fundingSignal = "bullish"; // Shorts crowded
            }
          }
        } catch (err) {
          logger.debug(
            { err, asset },
            "[StandupData] CoinGlass.getFunding failed",
          );
        }
      }

      // Get OI from CoinGlass
      if (coinGlass?.getOpenInterest) {
        try {
          const oiData = coinGlass.getOpenInterest(asset);
          if (oiData) {
            data.openInterest = oiData.total;
            data.oiChange24h = oiData.change24h ?? null;
          }
        } catch (err) {
          logger.debug(
            { err, asset },
            "[StandupData] CoinGlass.getOpenInterest failed",
          );
        }
      }

      // Get L/S ratio from CoinGlass
      if (coinGlass?.getLongShortRatio && data.longShortRatio === null) {
        try {
          const lsData = coinGlass.getLongShortRatio(asset);
          if (lsData) {
            data.longShortRatio = lsData.ratio;
          }
        } catch (err) {
          logger.debug(
            { err, asset },
            "[StandupData] CoinGlass.getLongShortRatio failed",
          );
        }
      }

      // Get DVOL from MarketData
      if (marketData?.getDVOL) {
        try {
          data.dvol = await marketData.getDVOL(asset);
        } catch (err) {
          logger.debug(
            { err, asset },
            "[StandupData] MarketData.getDVOL failed",
          );
        }
      }

      results.push(data);
    }

    logger.info(
      `[StandupData] Fetched market data for ${results.length} assets`,
    );
  } catch (err) {
    logger.warn({ err }, "[StandupData] Failed to get market data");
  }

  return results;
}

/**
 * Get paper bot stats from VINCE_TRADE_JOURNAL_SERVICE
 */
export async function getPaperBotStats(
  runtime: IAgentRuntime,
): Promise<PaperBotStats | null> {
  try {
    const tradeJournal = runtime.getService(
      "VINCE_TRADE_JOURNAL_SERVICE",
    ) as TradeJournalService | null;

    if (!tradeJournal?.getStats) {
      logger.debug("[StandupData] Trade journal service not available");
      return null;
    }

    const stats = tradeJournal.getStats();
    const recentTrades = tradeJournal.getRecentTrades?.(5) ?? [];

    // Filter today's trades for todayPnL
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const todayTrades = recentTrades.filter(
      (t) => (t.exitTimestamp ?? 0) >= todayMs,
    );
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

    return {
      todayPnL,
      totalPnL: stats.totalPnL,
      wins: stats.wins,
      losses: stats.losses,
      winRate: stats.winRate,
      totalTrades: stats.wins + stats.losses,
      recentTrades: recentTrades.slice(0, 3).map((t) => ({
        asset: t.asset ?? "?",
        direction: t.direction ?? "?",
        pnl: t.pnl ?? 0,
        timestamp: t.exitTimestamp ?? 0,
      })),
    };
  } catch (err) {
    logger.warn({ err }, "[StandupData] Failed to get paper bot stats");
    return null;
  }
}

/**
 * Get fear & greed index from VINCE_COINGLASS_SERVICE
 */
export async function getFearGreed(
  runtime: IAgentRuntime,
): Promise<{ value: number; label: string } | null> {
  try {
    const coinGlass = runtime.getService(
      "VINCE_COINGLASS_SERVICE",
    ) as CoinGlassService | null;

    if (!coinGlass?.getFearGreed) {
      logger.debug("[StandupData] CoinGlass service not available");
      return null;
    }

    const data = coinGlass.getFearGreed();
    if (data) {
      return {
        value: data.value,
        label: data.classification,
      };
    }
  } catch (err) {
    logger.warn({ err }, "[StandupData] Failed to get fear & greed");
  }

  return null;
}

/**
 * Get X/CT sentiment data (for ECHO)
 * TODO: Wire up to plugin-x-research when ECHO generates reports
 */
export async function getSentimentData(
  runtime: IAgentRuntime,
): Promise<SentimentData[]> {
  // Placeholder - ECHO will use X_PULSE action data
  return [];
}

/**
 * Get all standup data in one call
 */
export async function getStandupData(
  runtime: IAgentRuntime,
): Promise<StandupData> {
  logger.info("[StandupData] Fetching all standup data...");

  const [markets, paperBot, fearGreed, sentiment] = await Promise.all([
    getMarketData(runtime),
    getPaperBotStats(runtime),
    getFearGreed(runtime),
    getSentimentData(runtime),
  ]);

  const data: StandupData = {
    timestamp: Date.now(),
    markets,
    paperBot,
    sentiment,
    fearGreed,
  };

  logger.info(
    `[StandupData] Complete: ${markets.length} assets, paper bot: ${paperBot ? "yes" : "no"}, fear/greed: ${fearGreed?.value ?? "n/a"}`,
  );

  return data;
}

/**
 * Format market data as markdown table
 */
export function formatMarketTable(markets: AssetMarketData[]): string {
  if (markets.length === 0) {
    return "*No market data available*";
  }

  const rows = markets.map((m) => {
    const price = m.price
      ? `$${m.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : "—";
    const change =
      m.change24h !== null
        ? `${m.change24h > 0 ? "+" : ""}${m.change24h.toFixed(1)}%`
        : "—";
    const funding =
      m.funding !== null ? `${(m.funding * 100).toFixed(3)}%` : "—";
    const oi =
      m.oiChange24h !== null
        ? `${m.oiChange24h > 0 ? "+" : ""}${m.oiChange24h.toFixed(1)}%`
        : "—";
    const signal =
      m.fundingSignal === "bullish"
        ? "🟢"
        : m.fundingSignal === "bearish"
          ? "🔴"
          : "🟡";
    return `| ${m.asset} | ${price} | ${change} | ${funding} | ${oi} | ${signal} |`;
  });

  return `| Asset | Price | 24h | Funding | OI Δ | Signal |
|-------|-------|-----|---------|------|--------|
${rows.join("\n")}`;
}

/**
 * Format paper bot stats as markdown
 */
export function formatPaperBotStats(stats: PaperBotStats | null): string {
  if (!stats) {
    return "*Paper bot data not available*";
  }

  const winLoss = `${stats.wins}W/${stats.losses}L`;
  const winRate = `${(stats.winRate * 100).toFixed(0)}%`;
  const todayPnL =
    stats.todayPnL !== 0
      ? `${stats.todayPnL > 0 ? "+" : ""}$${stats.todayPnL.toFixed(0)}`
      : "$0";
  const totalPnL = `${stats.totalPnL > 0 ? "+" : ""}$${stats.totalPnL.toFixed(0)}`;

  let recentStr = "";
  if (stats.recentTrades.length > 0) {
    recentStr =
      "\n**Recent:**\n" +
      stats.recentTrades
        .map(
          (t) =>
            `- ${t.asset} ${t.direction}: ${t.pnl > 0 ? "+" : ""}$${t.pnl.toFixed(0)}`,
        )
        .join("\n");
  }

  return `**Performance:** ${winLoss} (${winRate})
**Today:** ${todayPnL} | **Total:** ${totalPnL}${recentStr}`;
}

/**
 * Generate signal summary from market data
 */
export function generateSignalSummary(markets: AssetMarketData[]): string {
  const bullish = markets
    .filter((m) => m.fundingSignal === "bullish")
    .map((m) => m.asset);
  const bearish = markets
    .filter((m) => m.fundingSignal === "bearish")
    .map((m) => m.asset);
  const neutral = markets
    .filter((m) => m.fundingSignal === "neutral")
    .map((m) => m.asset);

  const lines: string[] = [];
  if (bullish.length > 0) {
    lines.push(
      `- 🟢 **Bullish**: ${bullish.join(", ")} (shorts crowded/high funding)`,
    );
  }
  if (bearish.length > 0) {
    lines.push(
      `- 🔴 **Bearish**: ${bearish.join(", ")} (longs crowded/negative funding)`,
    );
  }
  if (neutral.length > 0) {
    lines.push(`- 🟡 **Neutral**: ${neutral.join(", ")}`);
  }

  return lines.length > 0 ? lines.join("\n") : "*No clear funding signals*";
}
