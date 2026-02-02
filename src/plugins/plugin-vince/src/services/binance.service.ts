/**
 * VINCE Binance Service
 *
 * Consolidates FREE Binance public APIs for market intelligence:
 * - Top Trader Positions (by SIZE, not accounts)
 * - Taker Buy/Sell Volume (order flow)
 * - OI History (divergence detection)
 * - Funding Rate Comparison (cross-exchange)
 * - Long/Short Ratio
 * - Alternative.me Fear & Greed (FREE)
 *
 * NO API KEY REQUIRED - All endpoints are public!
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type {
  BinanceTopTraderPositions,
  BinanceTakerVolume,
  BinanceOITrend,
  BinanceLongShortRatio,
  BinanceFundingTrend,
  CrossExchangeFunding,
  AlternativeFearGreed,
  BinanceIntelligence,
} from "../types/index";

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

const CACHE_TTL = 60 * 1000; // 1 minute cache for real-time data
const FEAR_GREED_CACHE_TTL = 60 * 60 * 1000; // 1 hour (updates daily)

interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
}

// =============================================================================
// SERVICE
// =============================================================================

export class VinceBinanceService extends Service {
  static serviceType = "VINCE_BINANCE_SERVICE";
  capabilityDescription = "Provides FREE Binance public API data for market intelligence";

  declare protected runtime: IAgentRuntime;

  // Caches
  private topTraderCache: Map<string, CacheEntry<BinanceTopTraderPositions>> = new Map();
  private takerVolumeCache: Map<string, CacheEntry<BinanceTakerVolume>> = new Map();
  private oiTrendCache: Map<string, CacheEntry<BinanceOITrend>> = new Map();
  private fundingTrendCache: Map<string, CacheEntry<BinanceFundingTrend>> = new Map();
  private longShortCache: Map<string, CacheEntry<BinanceLongShortRatio>> = new Map();
  private crossFundingCache: Map<string, CacheEntry<CrossExchangeFunding>> = new Map();
  private fearGreedCache: CacheEntry<AlternativeFearGreed> = { data: null, timestamp: 0 };

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
  }

  static async start(runtime: IAgentRuntime): Promise<VinceBinanceService> {
    const service = new VinceBinanceService(runtime);
    try {
      await service.initialize();
    } catch (error) {
      logger.warn(`[VinceBinance] Initialization error (service still available): ${error}`);
    }
    logger.info("[VinceBinance] ✅ Service started (FREE APIs)");
    return service;
  }

  async stop(): Promise<void> {
    // Clear caches
    this.topTraderCache.clear();
    this.takerVolumeCache.clear();
    this.oiTrendCache.clear();
    this.fundingTrendCache.clear();
    this.longShortCache.clear();
    this.crossFundingCache.clear();
    logger.info("[VinceBinance] Service stopped");
  }

  private async initialize(): Promise<void> {
    // Pre-fetch BTC data to validate connectivity and display dashboard
    const intel = await this.getIntelligence("BTC");
    this.printBinanceDashboard(intel);
  }

  // =============================================================================
  // DASHBOARD FORMATTING
  // =============================================================================

  /**
   * Format number with K/M/B suffix
   */
  private formatVolume(num: number): string {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  }

  /**
   * Format change percentage with sign
   */
  private formatChange(change: number): string {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  }

  /**
   * Print sexy Binance dashboard to terminal
   */
  private printBinanceDashboard(intel: BinanceIntelligence): void {
    console.log("");
    console.log("  ┌─────────────────────────────────────────────────────────────────┐");
    console.log("  │  📊 BINANCE INTELLIGENCE DASHBOARD                              │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");

    // Top Traders section
    if (intel.topTraderPositions) {
      const { longPosition, shortPosition, longShortRatio } = intel.topTraderPositions;
      const emoji = longPosition > 55 ? "🟢" : longPosition < 45 ? "🔴" : "⚪";
      const bias = longPosition > 55 ? "BULLISH" : longPosition < 45 ? "BEARISH" : "NEUTRAL";
      console.log("  │  🐋 TOP TRADERS (by size)                                       │");
      const tradersStr = `${emoji} ${longPosition.toFixed(0)}% long / ${shortPosition.toFixed(0)}% short │ Ratio: ${longShortRatio.toFixed(2)} │ ${bias}`;
      console.log(`  │  ${tradersStr.padEnd(64)}│`);
    }

    console.log("  ├─────────────────────────────────────────────────────────────────┤");

    // Taker Flow section
    if (intel.takerVolume) {
      const { buySellRatio } = intel.takerVolume;
      const emoji = buySellRatio > 1.1 ? "🟢" : buySellRatio < 0.9 ? "🔴" : "⚪";
      const pressure = buySellRatio > 1.1 ? "BUYING PRESSURE" : buySellRatio < 0.9 ? "SELLING PRESSURE" : "BALANCED";
      console.log("  │  📈 TAKER FLOW                                                  │");
      const flowStr = `${emoji} Buy/Sell Ratio: ${buySellRatio.toFixed(3)} │ ${pressure}`;
      console.log(`  │  ${flowStr.padEnd(64)}│`);
    }

    console.log("  ├─────────────────────────────────────────────────────────────────┤");

    // OI Trend section
    if (intel.oiTrend) {
      const { trend, changePercent, current } = intel.oiTrend;
      const emoji = trend === "rising" ? "📈" : trend === "falling" ? "📉" : "➡️";
      const conviction = trend === "rising" ? "conviction increasing" : trend === "falling" ? "positions closing" : "stable";
      console.log("  │  📊 OPEN INTEREST                                               │");
      const oiStr = `${emoji} ${this.formatVolume(current)} │ ${this.formatChange(changePercent)} │ ${conviction}`;
      console.log(`  │  ${oiStr.padEnd(64)}│`);
      
      // OI actionable insight
      let oiInsight = "";
      if (trend === "rising" && changePercent > 3) {
        oiInsight = "💡 New money entering - trend continuation likely";
      } else if (trend === "falling" && changePercent < -3) {
        oiInsight = "⚠️ Positions unwinding - volatility spike possible";
      } else if (trend === "rising" && changePercent > 0) {
        oiInsight = "📈 Leverage building - watch for breakout or squeeze";
      } else if (trend === "falling") {
        oiInsight = "📉 Deleveraging - price may stabilize after flush";
      } else {
        oiInsight = "➡️ Neutral OI - wait for directional signal";
      }
      console.log(`  │  ${oiInsight.padEnd(64)}│`);
    }

    console.log("  ├─────────────────────────────────────────────────────────────────┤");

    // Funding section
    if (intel.fundingTrend) {
      const { current, isExtreme, extremeDirection } = intel.fundingTrend;
      const fundingPct = (current * 100).toFixed(4);
      const emoji = isExtreme ? "⚠️" : current > 0 ? "🔵" : current < 0 ? "🟠" : "⚪";
      console.log("  │  💰 FUNDING RATE                                                │");
      let fundingStr = `${emoji} ${fundingPct}%`;
      if (isExtreme) {
        fundingStr += ` │ ${extremeDirection.replace("_", " ").toUpperCase()} │ Mean reversion signal`;
      }
      console.log(`  │  ${fundingStr.padEnd(64)}│`);
      
      // Funding actionable insight
      let fundingInsight = "";
      if (isExtreme && extremeDirection === "long_paying") {
        fundingInsight = "⚠️ Longs paying high fees - squeeze risk, fade longs";
      } else if (isExtreme && extremeDirection === "short_paying") {
        fundingInsight = "💡 Shorts paying - bullish, longs get paid to hold";
      } else if (current > 0.0005) {
        fundingInsight = "🔵 Slight long bias - market leaning bullish";
      } else if (current < -0.0001) {
        fundingInsight = "🟠 Slight short bias - caution, bears in control";
      } else {
        fundingInsight = "⚪ Neutral funding - no leverage signal";
      }
      console.log(`  │  ${fundingInsight.padEnd(64)}│`);
    }

    console.log("  ├─────────────────────────────────────────────────────────────────┤");

    // Fear & Greed section
    if (intel.fearGreed) {
      const { value, classification } = intel.fearGreed;
      const emoji = value < 25 ? "😱" : value < 45 ? "😰" : value < 55 ? "😐" : value < 75 ? "😊" : "🤑";
      const bar = this.buildFearGreedBar(value);
      console.log("  │  😱 FEAR & GREED INDEX                                          │");
      const fgStr = `${emoji} ${value}/100 (${classification}) ${bar}`;
      console.log(`  │  ${fgStr.padEnd(64)}│`);
    }

    // TLDR - Actionable summary
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    const tldr = this.getTLDR(intel);
    const tldrEmoji = tldr.includes("longs") || tldr.includes("LONG") || tldr.includes("UP") ? "💡" :
                      tldr.includes("shorts") || tldr.includes("SHORT") || tldr.includes("DOWN") ? "⚠️" : "📋";
    console.log(`  │  ${tldrEmoji} ${tldr.padEnd(62)}│`);

    console.log("  └─────────────────────────────────────────────────────────────────┘");
    console.log("");

    logger.info("[VinceBinance] ✅ Dashboard loaded - BTC intelligence ready");
  }

  /**
   * Build a visual bar for Fear & Greed index
   */
  private buildFearGreedBar(value: number): string {
    const filled = Math.floor(value / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  /**
   * Generate actionable TLDR summary from Binance intel
   */
  private getTLDR(intel: BinanceIntelligence): string {
    const parts: string[] = [];
    
    // Analyze top trader positioning
    const whalesLong = intel.topTraderPositions?.longPosition ?? 50;
    const whalesBias = whalesLong > 60 ? "LONG" : whalesLong < 40 ? "SHORT" : null;
    
    // Analyze OI trend
    const oiTrend = intel.oiTrend?.trend;
    const oiChange = intel.oiTrend?.changePercent ?? 0;
    
    // Analyze taker flow
    const takerRatio = intel.takerVolume?.buySellRatio ?? 1;
    const buyersHeavy = takerRatio > 1.15;
    const sellersHeavy = takerRatio < 0.85;
    
    // Analyze funding
    const fundingExtreme = intel.fundingTrend?.isExtreme;
    const fundingDirection = intel.fundingTrend?.extremeDirection;
    
    // Priority 1: Funding extremes (squeeze signals)
    if (fundingExtreme && fundingDirection) {
      if (fundingDirection === "short_paying") {
        return "SHORTS PAYING extreme - squeeze UP potential";
      }
      return "LONGS PAYING extreme - squeeze DOWN potential";
    }
    
    // Priority 2: Whales + OI combination (conviction signals)
    if (whalesBias === "LONG" && oiTrend === "rising") {
      return `WHALES ${whalesLong.toFixed(0)}% LONG + OI rising - conviction longs`;
    }
    if (whalesBias === "SHORT" && oiTrend === "rising") {
      return `WHALES ${(100-whalesLong).toFixed(0)}% SHORT + OI rising - conviction shorts`;
    }
    if (oiTrend === "falling" && Math.abs(oiChange) > 2) {
      return `OI falling ${Math.abs(oiChange).toFixed(1)}% - position flush in progress`;
    }
    
    // Priority 3: Taker flow (order flow)
    if (buyersHeavy && whalesBias === "LONG") {
      return "BUYERS HEAVY + whales long - momentum favors longs";
    }
    if (sellersHeavy && whalesBias === "SHORT") {
      return "SELLERS HEAVY + whales short - momentum favors shorts";
    }
    
    // Priority 4: Conflicting signals
    if (whalesBias && ((whalesBias === "LONG" && sellersHeavy) || (whalesBias === "SHORT" && buyersHeavy))) {
      return "CONFLICTING signals - whales vs flow, wait for clarity";
    }
    
    // Default: No clear edge
    return "MIXED signals - no clear directional edge";
  }

  // =============================================================================
  // FEAR & GREED INDEX (Alternative.me - FREE)
  // =============================================================================

  async getFearGreed(): Promise<AlternativeFearGreed | null> {
    // Check cache
    if (this.fearGreedCache.data && Date.now() - this.fearGreedCache.timestamp < FEAR_GREED_CACHE_TTL) {
      return this.fearGreedCache.data;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("https://api.alternative.me/fng/", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`[VinceBinance] Alternative.me returned ${response.status}`);
        return this.fearGreedCache.data;
      }

      const json = await response.json() as { data?: Array<{ value: string; value_classification: string; timestamp: string }> };

      if (!json.data || json.data.length === 0) {
        logger.warn("[VinceBinance] Alternative.me returned empty data");
        return this.fearGreedCache.data;
      }

      const latest = json.data[0];
      const result: AlternativeFearGreed = {
        value: parseInt(latest.value, 10),
        classification: latest.value_classification,
        timestamp: parseInt(latest.timestamp, 10) * 1000,
      };

      this.fearGreedCache = { data: result, timestamp: Date.now() };
      logger.debug(`[VinceBinance] Fear & Greed: ${result.value} (${result.classification})`);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.warn("[VinceBinance] Alternative.me request timed out");
      } else {
        logger.warn(`[VinceBinance] Failed to fetch Fear & Greed: ${error}`);
      }
      return this.fearGreedCache.data;
    }
  }

  // =============================================================================
  // TOP TRADER POSITIONS (by SIZE - what whales are actually doing)
  // =============================================================================

  async getTopTraderPositions(symbol: string = "BTCUSDT"): Promise<BinanceTopTraderPositions | null> {
    const cached = this.topTraderCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`[VinceBinance] Top trader positions returned ${response.status}`);
        return cached?.data ?? null;
      }

      const json = await response.json() as Array<{ longShortRatio: string; longAccount: string; shortAccount: string; timestamp: number }>;
      if (!Array.isArray(json) || json.length === 0) {
        return cached?.data ?? null;
      }

      const latest = json[0];
      const ratio = parseFloat(latest.longShortRatio || "1");
      const longPct = (ratio / (1 + ratio)) * 100;
      const shortPct = 100 - longPct;

      const result: BinanceTopTraderPositions = {
        symbol,
        longPosition: longPct,
        shortPosition: shortPct,
        longShortRatio: ratio,
        timestamp: latest.timestamp || Date.now(),
      };

      this.topTraderCache.set(symbol, { data: result, timestamp: Date.now() });
      logger.debug(`[VinceBinance] Top Traders ${symbol}: ${longPct.toFixed(0)}% long / ${shortPct.toFixed(0)}% short`);
      return result;
    } catch (error) {
      logger.warn(`[VinceBinance] Failed to fetch top trader positions: ${error}`);
      return cached?.data ?? null;
    }
  }

  // =============================================================================
  // TAKER BUY/SELL VOLUME (order flow)
  // =============================================================================

  async getTakerVolume(symbol: string = "BTCUSDT", period: string = "5m"): Promise<BinanceTakerVolume | null> {
    const cacheKey = `${symbol}_${period}`;
    const cached = this.takerVolumeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${symbol}&period=${period}&limit=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`[VinceBinance] Taker volume returned ${response.status}`);
        return cached?.data ?? null;
      }

      const json = await response.json() as Array<{ buyVol: string; sellVol: string; buySellRatio: string; timestamp: number }>;
      if (!Array.isArray(json) || json.length === 0) {
        return cached?.data ?? null;
      }

      const latest = json[0];
      const result: BinanceTakerVolume = {
        symbol,
        buyVol: parseFloat(latest.buyVol || "0.5"),
        sellVol: parseFloat(latest.sellVol || "0.5"),
        buySellRatio: parseFloat(latest.buySellRatio || "1"),
        timestamp: latest.timestamp || Date.now(),
      };

      this.takerVolumeCache.set(cacheKey, { data: result, timestamp: Date.now() });
      logger.debug(`[VinceBinance] Taker ${symbol}: ratio ${result.buySellRatio.toFixed(2)}`);
      return result;
    } catch (error) {
      logger.warn(`[VinceBinance] Failed to fetch taker volume: ${error}`);
      return cached?.data ?? null;
    }
  }

  // =============================================================================
  // LONG/SHORT RATIO (by accounts)
  // =============================================================================

  async getLongShortRatio(symbol: string = "BTCUSDT"): Promise<BinanceLongShortRatio | null> {
    const cached = this.longShortCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`[VinceBinance] L/S ratio returned ${response.status}`);
        return cached?.data ?? null;
      }

      const json = await response.json() as Array<{ longShortRatio: string; longAccount: string; shortAccount: string; timestamp: number }>;
      if (!Array.isArray(json) || json.length === 0) {
        return cached?.data ?? null;
      }

      const latest = json[0];
      const result: BinanceLongShortRatio = {
        symbol,
        longShortRatio: parseFloat(latest.longShortRatio || "1"),
        longAccount: parseFloat(latest.longAccount || "0.5") * 100,
        shortAccount: parseFloat(latest.shortAccount || "0.5") * 100,
        timestamp: latest.timestamp || Date.now(),
      };

      this.longShortCache.set(symbol, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      logger.warn(`[VinceBinance] Failed to fetch L/S ratio: ${error}`);
      return cached?.data ?? null;
    }
  }

  // =============================================================================
  // OI HISTORY (divergence detection)
  // =============================================================================

  async getOITrend(symbol: string = "BTCUSDT", period: string = "5m", limit: number = 10): Promise<BinanceOITrend | null> {
    const cacheKey = `${symbol}_${period}`;
    const cached = this.oiTrendCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=${period}&limit=${limit}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`[VinceBinance] OI history returned ${response.status}`);
        return cached?.data ?? null;
      }

      const json = await response.json() as Array<{ sumOpenInterestValue: string; timestamp: number }>;
      if (!Array.isArray(json) || json.length === 0) {
        return cached?.data ?? null;
      }

      // Parse and sort by timestamp (newest first)
      const history = json.map((item) => ({
        value: parseFloat(item.sumOpenInterestValue || "0"),
        timestamp: item.timestamp || Date.now(),
      }));
      history.sort((a, b) => b.timestamp - a.timestamp);

      const current = history[0]?.value || 0;
      const previous = history[history.length - 1]?.value || current;
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;

      const result: BinanceOITrend = {
        symbol,
        current,
        previous,
        change,
        changePercent,
        trend: changePercent > 1 ? "rising" : changePercent < -1 ? "falling" : "stable",
      };

      this.oiTrendCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      logger.warn(`[VinceBinance] Failed to fetch OI history: ${error}`);
      return cached?.data ?? null;
    }
  }

  // =============================================================================
  // FUNDING RATE TREND
  // =============================================================================

  async getFundingTrend(symbol: string = "BTCUSDT", limit: number = 10): Promise<BinanceFundingTrend | null> {
    const cached = this.fundingTrendCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=${limit}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        logger.warn(`[VinceBinance] Funding history returned ${response.status}`);
        return cached?.data ?? null;
      }

      const json = await response.json() as Array<{ fundingRate: string; fundingTime: number }>;
      if (!Array.isArray(json) || json.length === 0) {
        return cached?.data ?? null;
      }

      const rates = json.map((item) => parseFloat(item.fundingRate || "0"));
      const current = rates[rates.length - 1] || 0; // Most recent is last
      const average = rates.reduce((a, b) => a + b, 0) / rates.length;
      const max = Math.max(...rates);
      const min = Math.min(...rates);

      const isExtreme = Math.abs(current) > 0.001; // > 0.1%
      const extremeDirection = current > 0.001 ? "long_paying" : current < -0.001 ? "short_paying" : "neutral";

      const result: BinanceFundingTrend = {
        symbol,
        current,
        average,
        max,
        min,
        isExtreme,
        extremeDirection,
      };

      this.fundingTrendCache.set(symbol, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      logger.warn(`[VinceBinance] Failed to fetch funding history: ${error}`);
      return cached?.data ?? null;
    }
  }

  // =============================================================================
  // CROSS-EXCHANGE FUNDING COMPARISON
  // =============================================================================

  async getCrossExchangeFunding(asset: string = "BTC", hyperliquidRate?: number): Promise<CrossExchangeFunding | null> {
    const cached = this.crossFundingCache.get(asset);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    try {
      const symbol = `${asset}USDT`;

      // Fetch Binance and Bybit funding in parallel
      const [binanceData, bybitData] = await Promise.all([
        this.fetchBinanceFundingRate(symbol),
        this.fetchBybitFundingRate(symbol),
      ]);

      const rates: { [key: string]: number | null } = {
        binance: binanceData?.rate ?? null,
        bybit: bybitData?.rate ?? null,
        hyperliquid: hyperliquidRate ?? null,
      };

      // Find min/max for spread calculation
      const validRates = Object.entries(rates)
        .filter(([_, v]) => v !== null) as [string, number][];

      if (validRates.length < 2) {
        return cached?.data ?? null;
      }

      validRates.sort((a, b) => a[1] - b[1]);
      const lowest = validRates[0];
      const highest = validRates[validRates.length - 1];
      const spread = highest[1] - lowest[1];
      const annualized = spread * 3 * 365 * 100; // 3 fundings per day

      const result: CrossExchangeFunding = {
        symbol: asset,
        binance: rates.binance,
        bybit: rates.bybit,
        hyperliquid: rates.hyperliquid,
        spread,
        bestLong: lowest[0],
        bestShort: highest[0],
        annualizedSpread: annualized,
        timestamp: Date.now(),
      };

      this.crossFundingCache.set(asset, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      logger.warn(`[VinceBinance] Failed to fetch cross-exchange funding: ${error}`);
      return cached?.data ?? null;
    }
  }

  // Helper: Binance funding rate
  private async fetchBinanceFundingRate(symbol: string): Promise<{ rate: number; markPrice: number } | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) return null;

      const json = await response.json() as { lastFundingRate?: string; markPrice?: string };
      return {
        rate: parseFloat(json.lastFundingRate || "0"),
        markPrice: parseFloat(json.markPrice || "0"),
      };
    } catch {
      return null;
    }
  }

  // Helper: Bybit funding rate
  private async fetchBybitFundingRate(symbol: string): Promise<{ rate: number } | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) return null;

      const json = await response.json() as { retCode?: number; result?: { list?: Array<{ fundingRate?: string }> } };
      if (json.retCode !== 0 || !json.result?.list?.[0]) return null;

      return {
        rate: parseFloat(json.result.list[0].fundingRate || "0"),
      };
    } catch {
      return null;
    }
  }

  // =============================================================================
  // AGGREGATED INTELLIGENCE
  // =============================================================================

  /**
   * Get all Binance intelligence for an asset in one call
   */
  async getIntelligence(asset: string = "BTC"): Promise<BinanceIntelligence> {
    const symbol = `${asset}USDT`;

    const [topTrader, taker, oi, funding, longShort, crossFunding, fearGreed] = await Promise.all([
      this.getTopTraderPositions(symbol),
      this.getTakerVolume(symbol),
      this.getOITrend(symbol),
      this.getFundingTrend(symbol),
      this.getLongShortRatio(symbol),
      this.getCrossExchangeFunding(asset),
      this.getFearGreed(),
    ]);

    return {
      topTraderPositions: topTrader,
      takerVolume: taker,
      oiTrend: oi,
      fundingTrend: funding,
      longShortRatio: longShort,
      crossExchangeFunding: crossFunding,
      fearGreed: fearGreed,
      timestamp: Date.now(),
    };
  }

  /**
   * Format intelligence as readable string for GM action
   */
  formatIntelligence(intel: BinanceIntelligence): string[] {
    const lines: string[] = [];

    if (intel.topTraderPositions) {
      const { longPosition, shortPosition } = intel.topTraderPositions;
      const bias = longPosition > 55 ? "bullish" : longPosition < 45 ? "bearish" : "neutral";
      lines.push(`Top Traders: ${longPosition.toFixed(0)}% long / ${shortPosition.toFixed(0)}% short (${bias})`);
    }

    if (intel.takerVolume) {
      const { buySellRatio } = intel.takerVolume;
      const pressure = buySellRatio > 1.1 ? "buying pressure" : buySellRatio < 0.9 ? "selling pressure" : "balanced";
      lines.push(`Taker Flow: ${buySellRatio.toFixed(2)} (${pressure})`);
    }

    if (intel.oiTrend) {
      const { trend, changePercent } = intel.oiTrend;
      const sign = changePercent >= 0 ? "+" : "";
      const conviction = trend === "rising" ? "conviction increasing" : trend === "falling" ? "positions closing" : "stable";
      lines.push(`OI Trend: ${trend.charAt(0).toUpperCase() + trend.slice(1)} ${sign}${changePercent.toFixed(1)}% (${conviction})`);
    }

    if (intel.fundingTrend) {
      const { current, isExtreme, extremeDirection } = intel.fundingTrend;
      const fundingPct = (current * 100).toFixed(4);
      if (isExtreme) {
        lines.push(`⚠️ Funding: ${fundingPct}% (${extremeDirection.replace("_", " ")} - mean reversion signal)`);
      } else {
        lines.push(`Funding: ${fundingPct}%`);
      }
    }

    if (intel.fearGreed) {
      const { value, classification } = intel.fearGreed;
      const emoji = value < 25 ? "😱" : value < 45 ? "😰" : value < 55 ? "😐" : value < 75 ? "😊" : "🤑";
      lines.push(`Fear/Greed: ${value} ${emoji} (${classification})`);
    }

    return lines;
  }
}

export default VinceBinanceService;
