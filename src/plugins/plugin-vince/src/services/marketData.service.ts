/**
 * VINCE Market Data Service
 *
 * Aggregates market context from multiple sources:
 * - Prices: Hyperliquid first for BTC, ETH, SOL, HYPE (perps venue); CoinGecko as fallback.
 * - CoinGlass (funding, L/S, OI)
 * - CoinGecko (prices for non-core assets, and fallback when HL unavailable)
 *
 * Provides enriched context for trading decisions.
 * V2: Volume ratio tracking and daily open price for Open Window Trend Spotting.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { VinceCoinGlassService } from "./coinglass.service";
import type { VinceCoinGeckoService } from "./coingecko.service";
import {
  getOrCreateDeribitService,
  getOrCreateHyperliquidService,
} from "./fallbacks";
import {
  buildOpenWindowInfo,
  DEFAULT_OPEN_WINDOW_CONFIG,
  type OpenWindowInfo,
  type OpenWindowConfig,
} from "../utils/sessionFilters";

// Core assets: we prefer Hyperliquid (perps venue) for price, CoinGecko as fallback
const CORE_PRICE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;

// ATR estimation based on volatility indices and historical data
const DEFAULT_ATR_PCT: Record<string, number> = {
  BTC: 2.5, // ~$2500 on $100k BTC
  ETH: 3.5, // Higher volatility
  SOL: 5.0, // Much more volatile
  HYPE: 7.0, // New token, high volatility
};

export interface EnrichedMarketContext {
  asset: string;
  currentPrice: number;
  priceChange24h: number;
  fundingRate: number;
  longShortRatio: number;
  fearGreedValue: number | null;
  fearGreedLabel: string | null;
  marketRegime: "bullish" | "bearish" | "neutral" | "volatile" | "ranging" | "extreme";
  timestamp: number;

  // V2: Added for Open Window Trend Spotting
  dailyOpenPrice: number | null;
  volumeRatio: number; // Current volume vs average (1.0 = average)
  openWindowInfo: OpenWindowInfo | null;

  // Optional: from feature store / extended snapshot (bot action, signal aggregator)
  atr?: number;
  rsi14?: number;
  priceVsSma20?: number;
  bidAskRatio?: number;
  fundingPercentile?: number;
}

export class VinceMarketDataService extends Service {
  static serviceType = "VINCE_MARKET_DATA_SERVICE";
  capabilityDescription = "Enriched market context aggregation";

  // V2: Track daily open prices (reset at 00:00 UTC)
  private dailyOpenPrices: Map<string, { price: number; date: string }> =
    new Map();

  // V2: Track volume history for volume ratio calculation (last 7 data points)
  private volumeHistory: Map<string, number[]> = new Map();
  private readonly VOLUME_HISTORY_SIZE = 7;

  // V2: Open window configuration
  private openWindowConfig: OpenWindowConfig = DEFAULT_OPEN_WINDOW_CONFIG;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceMarketDataService> {
    const service = new VinceMarketDataService(runtime);
    logger.debug(
      "[VinceMarketData] Service initialized with Open Window Trend Spotting",
    );
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceMarketData] Service stopped");
  }

  /**
   * V2: Configure open window settings
   */
  configureOpenWindow(config: Partial<OpenWindowConfig>): void {
    this.openWindowConfig = { ...this.openWindowConfig, ...config };
  }

  /**
   * V2: Get current UTC date string (YYYY-MM-DD)
   */
  private getCurrentDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * V2: Update daily open price if it's a new day
   */
  private updateDailyOpen(asset: string, currentPrice: number): number | null {
    const today = this.getCurrentDateString();
    const cached = this.dailyOpenPrices.get(asset);

    if (!cached || cached.date !== today) {
      // New day - set daily open to current price
      this.dailyOpenPrices.set(asset, { price: currentPrice, date: today });
      logger.debug(
        `[VinceMarketData] ${asset} daily open set to $${currentPrice.toFixed(2)}`,
      );
      return currentPrice;
    }

    return cached.price;
  }

  /**
   * V2: Update volume history and calculate volume ratio
   */
  private updateVolumeRatio(asset: string, volume24h: number): number {
    let history = this.volumeHistory.get(asset) || [];

    // Add new volume reading
    history.push(volume24h);

    // Keep only last N readings
    if (history.length > this.VOLUME_HISTORY_SIZE) {
      history = history.slice(-this.VOLUME_HISTORY_SIZE);
    }

    this.volumeHistory.set(asset, history);

    // Calculate average (excluding current reading if we have enough history)
    if (history.length < 2) {
      return 1.0; // Not enough history
    }

    const historicalVolumes = history.slice(0, -1);
    const avgVolume =
      historicalVolumes.reduce((a, b) => a + b, 0) / historicalVolumes.length;

    if (avgVolume === 0) {
      return 1.0;
    }

    return volume24h / avgVolume;
  }

  /**
   * Get enriched market context for an asset
   */
  async getEnrichedContext(
    asset: string,
  ): Promise<EnrichedMarketContext | null> {
    const coinglassService = this.runtime.getService(
      "VINCE_COINGLASS_SERVICE",
    ) as VinceCoinGlassService | null;
    const coingeckoService = this.runtime.getService(
      "VINCE_COINGECKO_SERVICE",
    ) as VinceCoinGeckoService | null;

    // Price data: Hyperliquid first for core assets (BTC, ETH, SOL, HYPE), CoinGecko as fallback
    let currentPrice = 0;
    let priceChange24h = 0;
    let volume24h = 0;
    const hlService = getOrCreateHyperliquidService(this.runtime);
    const isCoreAsset = CORE_PRICE_ASSETS.includes(
      asset as (typeof CORE_PRICE_ASSETS)[number],
    );

    if (isCoreAsset && hlService?.getMarkPriceAndChange) {
      try {
        const hlData = await hlService.getMarkPriceAndChange(asset);
        if (hlData != null && hlData.price > 0) {
          currentPrice = hlData.price;
          priceChange24h = hlData.change24h;
          logger.debug(
            `[VinceMarketData] Price from Hyperliquid: ${asset} $${currentPrice.toFixed(2)} (24h: ${priceChange24h.toFixed(2)}%)`,
          );
        }
      } catch {
        // Fall through to CoinGecko
      }
    }

    if (currentPrice <= 0 && coingeckoService) {
      if (typeof coingeckoService.refreshData === "function") {
        await coingeckoService.refreshData();
      }
      const priceData = coingeckoService.getPrice(asset);
      if (priceData) {
        currentPrice = priceData.price;
        priceChange24h = priceData.change24h;
        volume24h = (priceData as any).volume24h || 0;
        if (isCoreAsset) {
          logger.debug(
            `[VinceMarketData] Price from CoinGecko (fallback): ${asset} $${currentPrice.toFixed(2)}`,
          );
        }
      }
    }

    // Fallback for non-core assets or when both HL and CoinGecko missed: try HL getMarkPrice
    if (currentPrice <= 0 && hlService?.getMarkPrice) {
      try {
        const fallbackPrice = await hlService.getMarkPrice(asset);
        if (fallbackPrice != null && fallbackPrice > 0) {
          currentPrice = fallbackPrice;
          logger.debug(
            `[VinceMarketData] Price from Hyperliquid (fallback): ${asset} $${fallbackPrice.toFixed(2)}`,
          );
        }
      } catch {
        // Keep currentPrice 0
      }
    }

    // Get CoinGlass data
    let fundingRate = 0;
    let longShortRatio = 1;
    let fearGreedValue: number | null = null;
    let fearGreedLabel: string | null = null;

    if (coinglassService) {
      await coinglassService.refreshData();

      const funding = coinglassService.getFunding(asset);
      if (funding) {
        fundingRate = funding.rate;
      }

      const ls = coinglassService.getLongShortRatio(asset);
      if (ls) {
        longShortRatio = ls.ratio;
      }

      const fg = coinglassService.getFearGreed();
      if (fg) {
        fearGreedValue = fg.value;
        fearGreedLabel = fg.classification;
      }
    }

    // Determine market regime
    let marketRegime: EnrichedMarketContext["marketRegime"] = "neutral";

    if (priceChange24h > 5) {
      marketRegime = "bullish";
    } else if (priceChange24h < -5) {
      marketRegime = "bearish";
    } else if (Math.abs(priceChange24h) > 3) {
      marketRegime = "volatile";
    }

    // Fear/greed override
    if (fearGreedValue !== null) {
      if (fearGreedValue >= 75) {
        marketRegime = "bullish";
      } else if (fearGreedValue <= 25) {
        marketRegime = "bearish";
      }
    }

    // V2: Track daily open price and volume ratio
    let dailyOpenPrice: number | null = null;
    let volumeRatio = 1.0;

    if (currentPrice > 0) {
      dailyOpenPrice = this.updateDailyOpen(asset, currentPrice);
    }

    if (volume24h > 0) {
      volumeRatio = this.updateVolumeRatio(asset, volume24h);
    }

    // V2: Build open window info
    const openWindowInfo = buildOpenWindowInfo(
      currentPrice > 0 ? currentPrice : null,
      dailyOpenPrice,
      volumeRatio,
      this.openWindowConfig,
    );

    return {
      asset,
      currentPrice,
      priceChange24h,
      fundingRate,
      longShortRatio,
      fearGreedValue,
      fearGreedLabel,
      marketRegime,
      timestamp: Date.now(),
      // V2: Open Window Trend Spotting
      dailyOpenPrice,
      volumeRatio,
      openWindowInfo,
    };
  }

  /**
   * V2: Get open window info for an asset (for signal aggregator)
   */
  async getOpenWindowInfo(asset: string): Promise<OpenWindowInfo | null> {
    const context = await this.getEnrichedContext(asset);
    return context?.openWindowInfo ?? null;
  }

  /**
   * Get context for all tracked assets
   */
  async getAllContexts(): Promise<EnrichedMarketContext[]> {
    const assets = ["BTC", "ETH", "SOL", "HYPE"];
    const contexts: EnrichedMarketContext[] = [];

    for (const asset of assets) {
      const ctx = await this.getEnrichedContext(asset);
      if (ctx) {
        contexts.push(ctx);
      }
    }

    return contexts;
  }

  /**
   * Get estimated ATR (Average True Range) as percentage
   * Uses DVOL when available, falls back to asset-specific defaults
   */
  async getATRPercent(asset: string): Promise<number> {
    // Try to get DVOL from Deribit for BTC/ETH (external or fallback)
    const deribitService = getOrCreateDeribitService(this.runtime);

    if (deribitService && (asset === "BTC" || asset === "ETH")) {
      try {
        const dvol = await deribitService.getVolatilityIndex(
          asset as "BTC" | "ETH",
        );
        if (dvol?.current) {
          // Convert DVOL (annualized IV) to daily ATR estimate
          // DVOL 60 = 60% annualized volatility
          // Daily volatility ≈ Annual / sqrt(365) ≈ Annual / 19.1
          // 4h ATR ≈ Daily / 2.5 (6 periods per day, sqrt factor)
          const dailyVol = dvol.current / 19.1;
          const atrPct = dailyVol / 2.5; // Roughly 4h ATR

          // Scale by volatility regime
          if (dvol.current > 80) {
            return atrPct * 1.3; // High vol regime, wider ATR
          } else if (dvol.current < 40) {
            return atrPct * 0.7; // Low vol regime, tighter ATR
          }
          return atrPct;
        }
      } catch (e) {
        logger.debug(`[VinceMarketData] Could not get DVOL for ${asset}: ${e}`);
      }
    }

    // Fall back to defaults based on historical observations
    return DEFAULT_ATR_PCT[asset] ?? 3.0;
  }

  /**
   * Get DVOL (Deribit Volatility Index) for BTC/ETH
   * Returns null for unsupported assets
   */
  async getDVOL(asset: string): Promise<number | null> {
    if (asset !== "BTC" && asset !== "ETH") {
      return null;
    }

    // Deribit service (external or fallback)
    const deribitService = getOrCreateDeribitService(this.runtime);
    if (!deribitService) {
      return null;
    }

    try {
      const dvol = await deribitService.getVolatilityIndex(
        asset as "BTC" | "ETH",
      );
      return dvol?.current ?? null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Estimate RSI-like overbought/oversold condition
   *
   * Uses 24h price change and volatility to estimate momentum conditions.
   * This is a simplified approximation - not true RSI calculation.
   *
   * Returns:
   * - rsi: 0-100 value (higher = more overbought)
   * - signal: 'overbought' (>70), 'oversold' (<30), or 'neutral'
   */
  async estimateRSI(
    asset: string,
  ): Promise<{ rsi: number; signal: "overbought" | "oversold" | "neutral" }> {
    const ctx = await this.getEnrichedContext(asset);

    if (!ctx) {
      return { rsi: 50, signal: "neutral" };
    }

    const { priceChange24h, fearGreedValue } = ctx;

    // Base RSI estimation from 24h price change
    // Map price change to RSI-like scale:
    // -10% or worse → RSI ~20 (oversold)
    // +10% or better → RSI ~80 (overbought)
    // 0% → RSI ~50 (neutral)
    let baseRsi = 50 + priceChange24h * 3; // Scale by 3x

    // Incorporate fear/greed if available
    if (fearGreedValue !== null) {
      // Blend 50% price momentum, 50% sentiment
      baseRsi = baseRsi * 0.5 + fearGreedValue * 0.5;
    }

    // Clamp to 0-100
    const rsi = Math.max(0, Math.min(100, baseRsi));

    // Determine signal
    let signal: "overbought" | "oversold" | "neutral" = "neutral";
    if (rsi >= 70) {
      signal = "overbought";
    } else if (rsi <= 30) {
      signal = "oversold";
    }

    return { rsi: Math.round(rsi), signal };
  }

  /**
   * Get RSI adjustment multiplier for signal confidence
   *
   * Penalizes long signals when overbought, short signals when oversold.
   * Returns 1.0 for neutral, 0.85 for overbought/long or oversold/short.
   */
  async getRSIAdjustment(
    asset: string,
    direction: "long" | "short",
  ): Promise<{ multiplier: number; reason?: string }> {
    const { rsi, signal } = await this.estimateRSI(asset);

    // Penalize contrarian entries at extremes
    if (signal === "overbought" && direction === "long") {
      return {
        multiplier: 0.85,
        reason: `RSI overbought (${rsi}) - penalizing long entry`,
      };
    }

    if (signal === "oversold" && direction === "short") {
      return {
        multiplier: 0.85,
        reason: `RSI oversold (${rsi}) - penalizing short entry`,
      };
    }

    // Slight boost for mean-reversion at extremes
    if (signal === "overbought" && direction === "short") {
      return {
        multiplier: 1.1,
        reason: `RSI overbought (${rsi}) - favoring short entry`,
      };
    }

    if (signal === "oversold" && direction === "long") {
      return {
        multiplier: 1.1,
        reason: `RSI oversold (${rsi}) - favoring long entry`,
      };
    }

    return { multiplier: 1.0 };
  }
}
