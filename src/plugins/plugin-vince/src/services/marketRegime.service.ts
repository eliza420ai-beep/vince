/**
 * VINCE Market Regime Service
 *
 * Detects market regime for strategy adaptation:
 * - Trending (ADX > 25): Use breakout strategy, follow momentum
 * - Ranging (ADX < 20): Use mean-reversion, contrarian signals
 * - Neutral (ADX 20-25): Reduce position sizes
 * - Volatile (high DVOL + high price swings): Half position size, wider stops
 *
 * The regime affects:
 * - Entry strategy (breakout vs mean-reversion)
 * - Position sizing (full vs reduced)
 * - Stop loss width (tight vs wide)
 * - Trailing stop behavior
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { VinceMarketDataService } from "./marketData.service";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";

// ==========================================
// Regime Types
// ==========================================
export type MarketRegimeType = "trending" | "ranging" | "neutral" | "volatile";

export interface MarketRegime {
  asset: string;
  regime: MarketRegimeType;
  adx: number | null;           // ADX value (0-100)
  dvol: number | null;          // DVOL (Deribit volatility)
  priceChange24h: number;       // 24h price change %
  
  // Strategy recommendations
  positionSizeMultiplier: number; // 1.0 = full, 0.5 = half
  stopLossMultiplier: number;     // 1.0 = normal, 1.5 = wider
  preferContrarian: boolean;      // True = favor mean-reversion signals
  preferMomentum: boolean;        // True = favor momentum signals
  
  timestamp: number;
}

// ==========================================
// ADX Thresholds
// ==========================================
const ADX_THRESHOLDS = {
  TRENDING: 25,    // ADX > 25 = strong trend
  NEUTRAL_HIGH: 25,
  NEUTRAL_LOW: 20,
  RANGING: 20,     // ADX < 20 = ranging/choppy
};

// ==========================================
// DVOL Thresholds
// ==========================================
const DVOL_THRESHOLDS = {
  EXTREME: 85,     // Extreme volatility
  HIGH: 70,        // High volatility
  NORMAL: 40,      // Normal volatility
  LOW: 30,         // Low volatility (breakout imminent)
};

// ==========================================
// Service Implementation
// ==========================================
export class VinceMarketRegimeService extends Service {
  static serviceType = "VINCE_MARKET_REGIME_SERVICE";
  capabilityDescription = "Detects market regime for strategy adaptation";

  private regimeCache: Map<string, { regime: MarketRegime; timestamp: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceMarketRegimeService> {
    const service = new VinceMarketRegimeService(runtime);
    
    // Print initial dashboard
    service.printDashboard();
    
    logger.info("[VinceMarketRegime] ✅ Service initialized");
    return service;
  }

  /**
   * Print terminal dashboard with actionable copy
   */
  private printDashboard(): void {
    startBox();
    logLine("📈 MARKET REGIME");
    logEmpty();
    logLine("What it does: Adjusts paper-trade sizing, stops, and strategy");
    logLine("(momentum vs mean-reversion) using ADX + DVOL.");
    logEmpty();
    sep();
    logEmpty();
    logLine("📊 IF REGIME IS… THEN:");
    logLine("   • TRENDING (ADX>25)  → Follow momentum, wider stops");
    logLine("   • RANGING (ADX<20)   → Fade extremes, tight stops");
    logLine("   • VOLATILE (DVOL>85) → Half size, consider options");
    logLine("   • NEUTRAL            → Normal size, mixed approach");
    logEmpty();
    sep();
    logEmpty();
    logLine("💡 Live regime loads when you ask: perps, gm, or bot status");
    endBox();
  }

  /**
   * Generate actionable TLDR from regime data
   */
  getTLDR(regimes: MarketRegime[]): string {
    if (regimes.length === 0) {
      return "REGIME: No data - request regime analysis first";
    }
    
    // Count regime types
    const counts = { trending: 0, ranging: 0, volatile: 0, neutral: 0 };
    for (const r of regimes) {
      counts[r.regime]++;
    }
    
    // Find BTC regime as primary
    const btc = regimes.find(r => r.asset === "BTC");
    
    // Priority 1: Volatile regime (risk management)
    if (counts.volatile > 0) {
      const volatileAssets = regimes.filter(r => r.regime === "volatile").map(r => r.asset);
      return `VOLATILE: ${volatileAssets.join(", ")} - half size, wider stops`;
    }
    
    // Priority 2: Strong trend
    if (counts.trending >= 2) {
      const trendingAssets = regimes.filter(r => r.regime === "trending").map(r => r.asset);
      return `TRENDING: ${trendingAssets.join(", ")} - ride momentum, follow whales`;
    }
    
    // Priority 3: Range bound
    if (counts.ranging >= 2) {
      return "RANGING: Markets choppy - fade extremes, tight stops";
    }
    
    // Priority 4: BTC specific
    if (btc) {
      if (btc.regime === "trending") {
        return `BTC TRENDING: ADX ${btc.adx?.toFixed(0) || "N/A"} - follow the trend`;
      }
      if (btc.regime === "ranging") {
        return `BTC RANGING: ADX ${btc.adx?.toFixed(0) || "N/A"} - mean reversion plays`;
      }
    }
    
    // Default
    return "NEUTRAL: Mixed regimes - standard position sizing";
  }

  /**
   * Print live regime dashboard with data
   */
  async printLiveDashboard(): Promise<void> {
    const regimes = await this.getAllRegimes();
    startBox();
    logLine("📈 MARKET REGIME DASHBOARD (LIVE)");
    logEmpty();
    sep();
    logEmpty();
    for (const r of regimes) {
      const emoji = r.regime === "trending" ? "📈" :
                    r.regime === "ranging" ? "↔️" :
                    r.regime === "volatile" ? "🌊" : "➡️";
      const adxStr = r.adx ? `ADX: ${r.adx.toFixed(0)}` : "ADX: N/A";
      const dvolStr = r.dvol ? `DVOL: ${r.dvol.toFixed(0)}` : "";
      const regimeStr = `${emoji} ${r.asset}: ${r.regime.toUpperCase()} ${adxStr} ${dvolStr}`;
      logLine(regimeStr);
    }
    sep();
    logEmpty();
    const btc = regimes.find(r => r.asset === "BTC");
    if (btc) {
      const strategyEmoji = btc.preferMomentum ? "🏃" : btc.preferContrarian ? "🔄" : "⚖️";
      const strategy = btc.preferMomentum ? "MOMENTUM" : btc.preferContrarian ? "CONTRARIAN" : "NEUTRAL";
      const sizeStr = `Size: ${(btc.positionSizeMultiplier * 100).toFixed(0)}%`;
      const slStr = `SL: ${btc.stopLossMultiplier.toFixed(1)}x`;
      logLine(`${strategyEmoji} Strategy: ${strategy} ${sizeStr} ${slStr}`);
    }
    sep();
    logEmpty();
    const tldr = this.getTLDR(regimes);
    const tldrEmoji = tldr.includes("TRENDING") ? "💡" :
                      tldr.includes("VOLATILE") ? "⚠️" : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();
  }

  async stop(): Promise<void> {
    logger.info("[VinceMarketRegime] Service stopped");
  }

  /**
   * Get current regime as a simple shape for ML/similarity (marketRegime + optional volatilityRegime).
   * Used by signal aggregator and paper trading for regime-aware features.
   */
  async getCurrentRegime(asset: string = "BTC"): Promise<{ marketRegime: string; volatilityRegime?: "high" } | null> {
    try {
      const regime = await this.getRegime(asset);
      const marketRegime =
        regime.regime === "trending"
          ? "bullish"
          : regime.regime === "ranging"
            ? "neutral"
            : regime.regime === "volatile"
              ? "volatile"
              : "neutral";
      return {
        marketRegime,
        ...(regime.regime === "volatile" ? { volatilityRegime: "high" as const } : {}),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get current market regime for an asset
   */
  async getRegime(asset: string): Promise<MarketRegime> {
    // Check cache
    const cached = this.regimeCache.get(asset);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.regime;
    }

    const marketData = this.runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;

    // Get market context
    let priceChange24h = 0;
    let dvol: number | null = null;

    if (marketData) {
      const ctx = await marketData.getEnrichedContext(asset);
      if (ctx) {
        priceChange24h = ctx.priceChange24h;
      }

      // Get DVOL for BTC/ETH
      if (asset === "BTC" || asset === "ETH") {
        dvol = await marketData.getDVOL(asset);
      }
    }

    // Estimate ADX from price volatility
    // (True ADX requires historical OHLC, we estimate from available data)
    const adx = this.estimateADX(priceChange24h, dvol);

    // Determine regime
    const regime = this.classifyRegime(adx, dvol, priceChange24h);

    const result: MarketRegime = {
      asset,
      regime: regime.type,
      adx,
      dvol,
      priceChange24h,
      positionSizeMultiplier: regime.sizeMultiplier,
      stopLossMultiplier: regime.slMultiplier,
      preferContrarian: regime.preferContrarian,
      preferMomentum: regime.preferMomentum,
      timestamp: Date.now(),
    };

    // Cache result
    this.regimeCache.set(asset, { regime: result, timestamp: Date.now() });

    logger.debug(
      `[VinceMarketRegime] ${asset}: ${regime.type.toUpperCase()} | ` +
      `ADX: ${adx?.toFixed(1) ?? "N/A"} | DVOL: ${dvol?.toFixed(1) ?? "N/A"} | ` +
      `Size: ${regime.sizeMultiplier}x | SL: ${regime.slMultiplier}x`
    );

    return result;
  }

  /**
   * Estimate ADX from available volatility data
   * This is an approximation - true ADX requires 14-period OHLC calculation
   */
  private estimateADX(priceChange24h: number, dvol: number | null): number | null {
    // If we have DVOL, use it as a proxy for volatility-adjusted trend strength
    if (dvol !== null) {
      // DVOL 40-60 is normal, scale to ADX-like value
      // High DVOL with directional move = trending
      // High DVOL with small move = choppy/volatile
      const absPriceChange = Math.abs(priceChange24h);
      
      if (absPriceChange > 5) {
        // Strong directional move
        return Math.min(50, 25 + absPriceChange);
      } else if (absPriceChange < 1) {
        // Sideways
        return Math.max(10, 20 - absPriceChange * 5);
      }
      // Moderate move
      return 20 + (absPriceChange * 2);
    }

    // Without DVOL, estimate from price change alone
    const absPriceChange = Math.abs(priceChange24h);
    
    if (absPriceChange > 8) {
      return 35; // Strong trend
    } else if (absPriceChange > 5) {
      return 28; // Moderate trend
    } else if (absPriceChange > 2) {
      return 22; // Weak trend / neutral
    }
    
    return 15; // Ranging
  }

  /**
   * Classify regime based on ADX and DVOL
   */
  private classifyRegime(
    adx: number | null,
    dvol: number | null,
    priceChange24h: number
  ): {
    type: MarketRegimeType;
    sizeMultiplier: number;
    slMultiplier: number;
    preferContrarian: boolean;
    preferMomentum: boolean;
  } {
    // Check for extreme volatility first (overrides trend detection)
    if (dvol !== null && dvol > DVOL_THRESHOLDS.EXTREME) {
      return {
        type: "volatile",
        sizeMultiplier: 0.5,    // Half position size
        slMultiplier: 1.5,      // Wider stops
        preferContrarian: true, // Mean reversion likely
        preferMomentum: false,
      };
    }

    // Use ADX for trend detection
    if (adx !== null) {
      if (adx > ADX_THRESHOLDS.TRENDING) {
        return {
          type: "trending",
          sizeMultiplier: 1.0,
          slMultiplier: 1.2,     // Slightly wider for trends
          preferContrarian: false,
          preferMomentum: true,  // Follow the trend
        };
      } else if (adx < ADX_THRESHOLDS.RANGING) {
        return {
          type: "ranging",
          sizeMultiplier: 0.8,   // Slightly reduced
          slMultiplier: 0.8,    // Tighter stops in ranges
          preferContrarian: true, // Mean reversion
          preferMomentum: false,
        };
      }
    }

    // Neutral regime
    return {
      type: "neutral",
      sizeMultiplier: 0.8,      // Slightly reduced
      slMultiplier: 1.0,
      preferContrarian: false,
      preferMomentum: false,
    };
  }

  /**
   * Get regime-adjusted signal strength
   * Boosts momentum signals in trends, contrarian signals in ranges
   */
  getSignalAdjustment(
    regime: MarketRegime,
    signalSource: string,
    signalDirection: "long" | "short"
  ): number {
    // Define contrarian sources (mean-reversion)
    const contrarianSources = [
      "BinanceFundingExtreme",
      "DeribitPutCallRatio",
      "HyperliquidCrowding",
      "LiquidationCascade",
    ];

    // Define momentum sources
    const momentumSources = [
      "TopTraders",
      "BinanceTopTraders",
      "SanbaseWhales",
      "BinanceTakerFlow",
    ];

    const isContrarianSignal = contrarianSources.includes(signalSource);
    const isMomentumSignal = momentumSources.includes(signalSource);

    // Apply regime-based adjustments
    if (regime.preferContrarian && isContrarianSignal) {
      return 1.2; // Boost contrarian signals in ranging/volatile
    }

    if (regime.preferMomentum && isMomentumSignal) {
      return 1.2; // Boost momentum signals in trending
    }

    if (regime.preferContrarian && isMomentumSignal) {
      return 0.8; // Penalize momentum in ranging/volatile
    }

    if (regime.preferMomentum && isContrarianSignal) {
      return 0.8; // Penalize contrarian in trends
    }

    return 1.0; // No adjustment
  }

  /**
   * Get all regime information for status reporting
   */
  async getAllRegimes(): Promise<MarketRegime[]> {
    const assets = ["BTC", "ETH", "SOL", "HYPE"];
    const regimes: MarketRegime[] = [];

    for (const asset of assets) {
      const regime = await this.getRegime(asset);
      regimes.push(regime);
    }

    return regimes;
  }
}
