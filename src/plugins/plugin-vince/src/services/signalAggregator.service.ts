/**
 * VINCE Signal Aggregator Service
 *
 * Aggregates signals from ALL available data sources (15+ total):
 * - CoinGlass market signals (funding, L/S ratio, fear/greed)
 * - Top Traders (Hyperliquid whale positions)
 * - Binance Intelligence (top traders by size, taker flow, OI trend)
 * - Binance Funding Extremes (contrarian mean-reversion signals)
 * - Binance Liquidations (cascade detection, liquidation pressure)
 * - News Sentiment (MandoMinutes bullish/bearish analysis)
 * - Deribit (options IV skew - fearful/neutral/bullish)
 * - MarketData (market regime - bullish/bearish/volatile)
 * - Sanbase (exchange flows - accumulation/distribution)
 * - Sanbase (whale activity - on-chain whale sentiment)
 * - Hyperliquid (options pulse - overallBias, squeeze risks)
 * - Hyperliquid (cross-venue funding - HL vs CEX arbitrage)
 * - Hyperliquid (crowding levels - contrarian signals)
 * - Deribit Options (put/call ratio - contrarian fear/greed)
 * - Deribit DVOL (volatility index - regime indicator)
 *
 * V2: Added Session Filters and Open Window Trend Spotting
 * - Session awareness (Asia/Europe/US/Overlap/Off-hours)
 * - Weekend confidence reduction
 * - Open Window boost when trend aligns with signal at major market opens
 *
 * Provides unified signal output for trading decisions.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { MarketSignal } from "../types/index";
import type { VinceCoinGlassService } from "./coinglass.service";
import type { VinceTopTradersService } from "./topTraders.service";
import type { VinceBinanceService } from "./binance.service";
import type { VinceBinanceLiquidationService } from "./binanceLiquidation.service";
import type { VinceNewsSentimentService } from "./newsSentiment.service";
import type { VinceDeribitService } from "./deribit.service";
import type { VinceMarketDataService } from "./marketData.service";
import type { VinceSanbaseService } from "./sanbase.service";
import type { VinceMarketRegimeService } from "./marketRegime.service";
// External service factories (with fallbacks)
import { getOrCreateHyperliquidService, getOrCreateDeribitService } from "./fallbacks";

// V2: Session Filters and Open Window Trend Spotting
import {
  applySessionFilter,
  calculateOpenWindowBoost,
  getCurrentSession,
  getCurrentSessionCharacteristics,
  DEFAULT_SESSION_FILTER_CONFIG,
  DEFAULT_OPEN_WINDOW_CONFIG,
  type SessionFilterConfig,
  type OpenWindowConfig,
  type OpenWindowInfo,
  type TradingSession,
} from "../utils/sessionFilters";

// V3: Dynamic Configuration (Self-Improving Architecture)
import { getPaperTradeAssets } from "../constants/paperTradingDefaults";
import { dynamicConfig, getSourceWeight as getDynamicSourceWeight } from "../config/dynamicConfig";

// V4: ML Integration (Weight Bandit + Signal Similarity + ML Inference)
import type { VinceWeightBanditService } from "./weightBandit.service";
import type { VinceSignalSimilarityService, SimilarityPrediction } from "./signalSimilarity.service";
import type { VinceMLInferenceService, SignalQualityInput } from "./mlInference.service";

// ==========================================
// ML-Enhanced Configuration
// ==========================================

/** Max wait per external source so one slow API doesn't block the whole aggregation */
const SOURCE_FETCH_TIMEOUT_MS = 12_000;

/** Resolve to null on timeout so aggregation can continue with other sources */
async function withTimeout<T>(
  ms: number,
  label: string,
  p: Promise<T>
): Promise<T | null> {
  try {
    const result = await Promise.race([
      p,
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout`)), ms)
      ),
    ]);
    return result as T;
  } catch (e) {
    if (String(e).includes("timeout")) {
      logger.debug(`[VinceSignalAggregator] ${label} timed out after ${ms}ms`);
    } else {
      logger.debug(`[VinceSignalAggregator] ${label} error: ${e}`);
    }
    return null;
  }
}

const ML_CONFIG = {
  /** Enable bandit-based weight sampling */
  useBanditWeights: true,
  
  /** Enable ML signal quality filtering */
  useMLFiltering: true,
  
  /** Enable similarity-based prediction */
  useSimilarityPrediction: true,
  
  /** Minimum ML quality score to proceed */
  minMLQualityScore: 0.4,
  
  /** ML quality score threshold for boost */
  boostMLQualityScore: 0.7,
  
  /** Confidence boost for high ML scores */
  mlConfidenceBoost: 10,
  
  /** Confidence penalty for low ML scores */
  mlConfidencePenalty: -15,
};

// ==========================================
// Signal Source Weights
// V4: Prioritizes bandit weights when available, falls back to dynamic config
// ==========================================

// Cache for bandit weights to avoid repeated service lookups
let cachedBanditWeights: Map<string, number> | null = null;
let banditWeightsCacheTime = 0;
const BANDIT_CACHE_TTL_MS = 5000;

// Get weight for a source - uses bandit sampling when available
const getSourceWeight = (source: string, runtime?: any): number => {
  // Try to use bandit weights if enabled and available
  if (ML_CONFIG.useBanditWeights && runtime) {
    // Check cache
    if (cachedBanditWeights && Date.now() - banditWeightsCacheTime < BANDIT_CACHE_TTL_MS) {
      const banditWeight = cachedBanditWeights.get(source);
      if (banditWeight !== undefined) {
        return banditWeight;
      }
    }
    
    // Try to get fresh bandit weights
    const banditService = runtime.getService("VINCE_WEIGHT_BANDIT_SERVICE") as VinceWeightBanditService | null;
    if (banditService?.isReady?.()) {
      const weights = banditService.getSampledWeights();
      cachedBanditWeights = weights;
      banditWeightsCacheTime = Date.now();
      
      const banditWeight = weights.get(source);
      if (banditWeight !== undefined) {
        return banditWeight;
      }
    }
  }
  
  // Fallback to dynamic config weights
  return getDynamicSourceWeight(source);
};

// ==========================================
// Signal Recency Decay
// Older signals carry less weight
// ==========================================
const DECAY_CONFIG = {
  // Time-sensitive signals (liquidation cascades) decay faster
  cascadeHalfLifeMs: 10 * 1000,    // 10 second half-life for cascade signals
  // Standard signals decay more slowly
  standardDecayThreshold1Ms: 30 * 1000,  // 30s: 0.8x
  standardDecayThreshold2Ms: 60 * 1000,  // 60s: 0.5x
  standardDecayThreshold3Ms: 120 * 1000, // 2m: 0.3x
};

/**
 * Calculate decay multiplier based on signal age
 */
const getRecencyDecay = (signalTimestamp: number, source: string): number => {
  const age = Date.now() - signalTimestamp;
  
  // Cascade signals decay exponentially with short half-life
  const isCascadeSignal = source === "LiquidationCascade" || source === "LiquidationPressure";
  if (isCascadeSignal) {
    // Exponential decay: 0.5^(age/halfLife)
    const halfLives = age / DECAY_CONFIG.cascadeHalfLifeMs;
    return Math.pow(0.5, halfLives);
  }
  
  // Standard signals use step decay
  if (age >= DECAY_CONFIG.standardDecayThreshold3Ms) {
    return 0.3; // Very stale
  } else if (age >= DECAY_CONFIG.standardDecayThreshold2Ms) {
    return 0.5; // Stale
  } else if (age >= DECAY_CONFIG.standardDecayThreshold1Ms) {
    return 0.8; // Slightly stale
  }
  
  return 1.0; // Fresh signal
};

export interface AggregatedSignal {
  asset: string;
  direction: "long" | "short" | "neutral";
  strength: number; // 0-100
  confidence: number; // 0-100
  sources: string[];
  factors: string[];
  confirmingCount: number; // Number of sources that agree on direction
  /** Number of sources that voted the opposite direction (for WHY THIS TRADE) */
  conflictingCount?: number;
  /** Factors from sources that agreed with the net direction */
  supportingFactors?: string[];
  /** Factors from sources that voted the opposite direction */
  conflictingFactors?: string[];
  timestamp: number;

  // V2: Session and Open Window info
  session?: TradingSession;
  sessionInfo?: string;
  openWindowBoost?: number;
  shouldTrade?: boolean; // False if session filter blocked trading

  // V4: ML Enhancement info
  mlQualityScore?: number; // 0-1, signal quality from ML model
  mlSimilarityPrediction?: SimilarityPrediction; // From similar trade lookup
  mlAdjusted?: boolean; // True if ML adjusted the signal
  banditWeightsUsed?: boolean; // True if bandit weights were used
}

export class VinceSignalAggregatorService extends Service {
  static serviceType = "VINCE_SIGNAL_AGGREGATOR_SERVICE";
  capabilityDescription = "Aggregates trading signals from all data sources with session awareness";

  private signalCache: Map<string, AggregatedSignal> = new Map();
  private readonly CACHE_TTL_MS = 120 * 1000; // 2 minutes (reduced API load)
  
  // V2: Session filter and open window configuration
  private sessionFilterConfig: SessionFilterConfig = DEFAULT_SESSION_FILTER_CONFIG;
  private openWindowConfig: OpenWindowConfig = DEFAULT_OPEN_WINDOW_CONFIG;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceSignalAggregatorService> {
    const service = new VinceSignalAggregatorService(runtime);
    const session = getCurrentSession();
    const sessionChars = getCurrentSessionCharacteristics();
    logger.info(
      `[VinceSignalAggregator] ✅ Service initialized with MULTI-SOURCE aggregation + Session Awareness | ` +
      `Current: ${session} (${sessionChars.description})`
    );
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceSignalAggregator] Service stopped");
  }

  /**
   * V2: Configure session filter settings
   */
  configureSessionFilter(config: Partial<SessionFilterConfig>): void {
    this.sessionFilterConfig = { ...this.sessionFilterConfig, ...config };
    logger.info(`[VinceSignalAggregator] Session filter configured`);
  }

  /**
   * V2: Configure open window settings
   */
  configureOpenWindow(config: Partial<OpenWindowConfig>): void {
    this.openWindowConfig = { ...this.openWindowConfig, ...config };
    logger.info(`[VinceSignalAggregator] Open window configured`);
  }

  /**
   * V2: Get current session info for display
   */
  getSessionInfo(): { session: TradingSession; info: string; goodForTrading: boolean } {
    const session = getCurrentSession();
    const chars = getCurrentSessionCharacteristics();
    return {
      session,
      info: chars.description,
      goodForTrading: chars.goodForTrading,
    };
  }

  /**
   * Detect high-conviction signal combinations (cross-correlation)
   * Returns bonus confidence boost when multiple independent sources align
   */
  private detectSignalCombos(
    signals: MarketSignal[],
    direction: "long" | "short" | "neutral",
    existingFactors: string[]
  ): { boost: number; factors: string[] } {
    if (direction === "neutral" || signals.length < 2) {
      return { boost: 0, factors: [] };
    }

    const factors: string[] = [];
    let totalBoost = 0;
    const sourceSet = new Set(signals.map(s => s.source));

    // COMBO 1: Whale Accumulation
    // BinanceTopTraders + Exchange outflows = smart money buying
    // NOTE: Only BinanceTopTraders provides real data (TopTraders requires wallet config)
    const hasBinanceWhales = signals.some(s => 
      s.source === "BinanceTopTraders" && 
      s.direction === direction
    );
    const hasExchangeOutflows = signals.some(s => 
      s.source === "SanbaseExchangeFlows" && 
      s.direction === direction
    );
    if (hasBinanceWhales && hasExchangeOutflows) {
      totalBoost += 10;  // Reduced from 20% - single whale source
      factors.push("🐋 WHALE COMBO: Binance top traders + exchange outflows (+10%)");
    }

    // COMBO 2: Funding/OI Divergence
    // Extreme funding + OI still rising = capitulation imminent
    const hasFundingExtreme = signals.some(s => 
      s.source === "BinanceFundingExtreme" && 
      s.direction === direction
    );
    const hasOISignal = signals.some(s => 
      (s.source === "CoinGlass" || s.source.includes("OI")) && 
      s.direction === direction
    );
    if (hasFundingExtreme && hasOISignal) {
      totalBoost += 15;
      factors.push("📊 FUNDING/OI DIVERGENCE COMBO: Mean-reversion setup (+15%)");
    }

    // COMBO 3: Liquidation Cascade + Volume
    // Cascade with strong directional volume = high conviction reversal
    const hasCascade = signals.some(s => 
      (s.source === "LiquidationCascade" || s.source === "LiquidationPressure") &&
      s.direction === direction
    );
    const hasVolumeConfirmation = existingFactors.some(f => 
      f.includes("Strong buy volume") || f.includes("Strong sell volume")
    );
    if (hasCascade && hasVolumeConfirmation) {
      totalBoost += 25;
      factors.push("💥 CASCADE + VOLUME COMBO: High conviction reversal (+25%)");
    }

    // COMBO 4: Multi-Chain Consensus
    // Deribit + Hyperliquid + Binance agreeing = cross-venue confirmation
    const hasDeribitSignal = signals.some(s => 
      s.source.includes("Deribit") && s.direction === direction
    );
    const hasHyperliquidSignal = signals.some(s => 
      s.source.includes("Hyperliquid") && s.direction === direction
    );
    const hasBinanceSignal = signals.some(s => 
      s.source.includes("Binance") && s.direction === direction
    );
    if (hasDeribitSignal && hasHyperliquidSignal && hasBinanceSignal) {
      totalBoost += 15;
      factors.push("🌐 CROSS-VENUE CONSENSUS: Deribit + HL + Binance agree (+15%)");
    }

    // Cap total combo boost at 40%
    return { boost: Math.min(40, totalBoost), factors };
  }

  /**
   * Aggregate signals for a specific asset from ALL available data sources
   */
  async aggregateSignals(asset: string): Promise<AggregatedSignal> {
    const signals: MarketSignal[] = [];
    const sources: string[] = [];
    const allFactors: string[] = [];

    // =========================================
    // 1. CoinGlass Signal (existing)
    // =========================================
    const coinglassService = this.runtime.getService("VINCE_COINGLASS_SERVICE") as VinceCoinGlassService | null;
    if (coinglassService) {
      try {
        const cgSignal = coinglassService.generateSignal(asset);
        if (cgSignal) {
          signals.push(cgSignal);
          sources.push("CoinGlass");
          allFactors.push(...cgSignal.factors);
        }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] CoinGlass error: ${e}`);
      }
    }

    // =========================================
    // 2. Top Traders Signal (Hyperliquid whales)
    // =========================================
    const topTradersService = this.runtime.getService("VINCE_TOP_TRADERS_SERVICE") as VinceTopTradersService | null;
    if (topTradersService) {
      try {
        const ttSignal = topTradersService.generateSignal(asset);
        if (ttSignal) {
          signals.push(ttSignal);
          sources.push("TopTraders");
          allFactors.push(...ttSignal.factors);
        }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] TopTraders error: ${e}`);
      }
    }

    // Track which optional sources were tried but did not contribute (for DEBUG)
    const triedNoContribution: string[] = [];

    // Resolve services once for parallel fetch
    const binanceService = this.runtime.getService("VINCE_BINANCE_SERVICE") as VinceBinanceService | null;
    const deribitService = this.runtime.getService("VINCE_DERIBIT_SERVICE") as VinceDeribitService | null;
    const marketDataService = this.runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;
    const sanbaseService = this.runtime.getService("VINCE_SANBASE_SERVICE") as VinceSanbaseService | null;
    const hyperliquidService = getOrCreateHyperliquidService(this.runtime);
    const deribitPluginService = getOrCreateDeribitService(this.runtime);
    const currency = asset === "BTC" ? "BTC" : asset === "ETH" ? "ETH" : asset === "SOL" ? "SOL" : null;
    const isRateLimited = hyperliquidService?.isRateLimited?.() ?? false;

    // Phase 1: fetch all async sources in parallel with per-source timeout
    // Skip Binance when 451 persists (graceful degradation – PRIORITY #5)
    const binanceDegraded = binanceService?.isDegraded?.() === true;
    if (binanceDegraded) {
      logger.debug(`[VinceSignalAggregator] Skipping Binance (451 degraded)`);
    }
    const [
      binanceIntelligence,
      deribitIVSurface,
      marketContext,
      sanbaseContext,
      optionsPulse,
      crossVenue,
      perpsAtOICap,
      comprehensiveData,
      dvol,
    ] = await Promise.all([
      binanceService && !binanceDegraded
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "Binance", binanceService.getIntelligence(asset))
        : Promise.resolve(null),
      deribitService && currency
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "DeribitIV", deribitService.getIVSurface(asset as "BTC" | "ETH" | "SOL"))
        : Promise.resolve(null),
      marketDataService
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "MarketData", marketDataService.getEnrichedContext(asset))
        : Promise.resolve(null),
      sanbaseService?.isConfigured()
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "Sanbase", sanbaseService.getOnChainContext(asset))
        : Promise.resolve(null),
      hyperliquidService && !isRateLimited
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "HLPulse", hyperliquidService.getOptionsPulse())
        : Promise.resolve(null),
      hyperliquidService && !isRateLimited
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "HLCrossVenue", hyperliquidService.getCrossVenueFunding())
        : Promise.resolve(null),
      hyperliquidService && !isRateLimited && hyperliquidService.getPerpsAtOpenInterestCap
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "HLPerpsAtOICap", hyperliquidService.getPerpsAtOpenInterestCap())
        : Promise.resolve(null as string[] | null),
      deribitPluginService && currency
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "DeribitComp", deribitPluginService.getComprehensiveData(currency as "BTC" | "ETH" | "SOL"))
        : Promise.resolve(null),
      deribitPluginService && (currency === "BTC" || currency === "ETH")
        ? withTimeout(SOURCE_FETCH_TIMEOUT_MS, "DeribitDVOL", deribitPluginService.getVolatilityIndex(currency))
        : Promise.resolve(null),
    ]);

    // =========================================
    // 3. Binance Intelligence (FREE APIs) - use pre-fetched result
    // =========================================
    if (binanceIntelligence) {
      try {
        const intel = binanceIntelligence;
        // 3a. Top Trader Positions by SIZE (what big money is doing) – relaxed 65/35 → 62/38 so more contribution
        if (intel.topTraderPositions) {
            const { longPosition } = intel.topTraderPositions;
            // Contrarian: extreme positioning suggests reversal
            if (longPosition > 62) {
              signals.push({
                asset,
                direction: "short", // Contrarian - too many longs
                strength: 55 + Math.min(15, (longPosition - 65) / 2),
                confidence: 55,
                source: "BinanceTopTraders",
                factors: [`Binance top traders ${longPosition.toFixed(0)}% long (crowded)`],
                timestamp: Date.now(),
              });
              sources.push("BinanceTopTraders");
              allFactors.push(`Binance top traders ${longPosition.toFixed(0)}% long (crowded)`);
            } else if (longPosition < 38) {
              signals.push({
                asset,
                direction: "long", // Contrarian - shorts crowded
                strength: 55 + Math.min(15, (38 - longPosition) / 2),
                confidence: 55,
                source: "BinanceTopTraders",
                factors: [`Binance top traders only ${longPosition.toFixed(0)}% long (shorts crowded)`],
                timestamp: Date.now(),
              });
              sources.push("BinanceTopTraders");
              allFactors.push(`Binance top traders only ${longPosition.toFixed(0)}% long (shorts crowded)`);
            }
          }

          // 3b. Taker Buy/Sell Volume (order flow) – relaxed 1.3/0.7 → 1.25/0.75 so more contribution
          if (intel.takerVolume) {
            const { buySellRatio } = intel.takerVolume;
            if (buySellRatio > 1.25) {
              signals.push({
                asset,
                direction: "long",
                strength: 55 + Math.min(10, (buySellRatio - 1) * 20),
                confidence: 50,
                source: "BinanceTakerFlow",
                factors: [`Strong taker buy pressure ${buySellRatio.toFixed(2)}x`],
                timestamp: Date.now(),
              });
              sources.push("BinanceTakerFlow");
              allFactors.push(`Strong taker buy pressure ${buySellRatio.toFixed(2)}x`);
            } else if (buySellRatio < 0.75) {
              signals.push({
                asset,
                direction: "short",
                strength: 55 + Math.min(10, (1 - buySellRatio) * 20),
                confidence: 50,
                source: "BinanceTakerFlow",
                factors: [`Strong taker sell pressure ${buySellRatio.toFixed(2)}x`],
                timestamp: Date.now(),
              });
              sources.push("BinanceTakerFlow");
              allFactors.push(`Strong taker sell pressure ${buySellRatio.toFixed(2)}x`);
            }
          }

          // 3c. OI Trend (divergence detection) + weak OI-flush signal
          if (intel.oiTrend) {
            const { trend, changePercent } = intel.oiTrend;
            if (trend === "falling" && changePercent < -5) {
              // Weak long bias: flush often precedes bounce (BINANCE_DATA_IMPROVEMENTS)
              const oiFlushFactor = `OI flush ${changePercent.toFixed(1)}% (positions closing)`;
              signals.push({
                asset,
                direction: "long",
                strength: 46 + Math.min(6, Math.abs(changePercent) / 5),
                confidence: 42,
                source: "BinanceOIFlush",
                factors: [oiFlushFactor],
                timestamp: Date.now(),
              });
              sources.push("BinanceOIFlush");
              allFactors.push(oiFlushFactor);
            }
          }

          // 3d. Long/Short Ratio (all accounts) – contrarian when extreme
          if (intel.longShortRatio) {
            const ratio = intel.longShortRatio.longShortRatio;
            if (ratio > 1.5) {
              signals.push({
                asset,
                direction: "short",
                strength: 52 + Math.min(10, (ratio - 1.5) * 10),
                confidence: 48,
                source: "BinanceLongShort",
                factors: [`Binance L/S ratio ${ratio.toFixed(2)} (accounts crowded long)`],
                timestamp: Date.now(),
              });
              sources.push("BinanceLongShort");
              allFactors.push(`Binance L/S ratio ${ratio.toFixed(2)} (accounts crowded long)`);
            } else if (ratio < 0.67) {
              signals.push({
                asset,
                direction: "long",
                strength: 52 + Math.min(10, (1 / ratio - 1.5) * 10),
                confidence: 48,
                source: "BinanceLongShort",
                factors: [`Binance L/S ratio ${ratio.toFixed(2)} (accounts crowded short)`],
                timestamp: Date.now(),
              });
              sources.push("BinanceLongShort");
              allFactors.push(`Binance L/S ratio ${ratio.toFixed(2)} (accounts crowded short)`);
            }
          }

          // 3e. Funding Rate Extremes (contrarian mean-reversion)
          if (intel.fundingTrend && intel.fundingTrend.isExtreme) {
            const { extremeDirection, current } = intel.fundingTrend;
            
            if (extremeDirection === "long_paying") {
              // Longs paying excessive premium = crowded longs = contrarian short
              signals.push({
                asset,
                direction: "short", // Contrarian
                strength: 62 + Math.min(10, Math.abs(current * 1000)),
                confidence: 60,
                source: "BinanceFundingExtreme",
                factors: [`Extreme funding: longs paying ${(current * 100).toFixed(3)}% - mean reversion likely`],
                timestamp: Date.now(),
              });
              sources.push("BinanceFundingExtreme");
              allFactors.push(`Extreme funding: longs paying ${(current * 100).toFixed(3)}% - mean reversion likely`);
            } else if (extremeDirection === "short_paying") {
              // Shorts paying excessive premium = crowded shorts = contrarian long
              signals.push({
                asset,
                direction: "long", // Contrarian
                strength: 62 + Math.min(10, Math.abs(current * 1000)),
                confidence: 60,
                source: "BinanceFundingExtreme",
                factors: [`Extreme funding: shorts paying ${(Math.abs(current) * 100).toFixed(3)}% - short squeeze likely`],
                timestamp: Date.now(),
              });
              sources.push("BinanceFundingExtreme");
              allFactors.push(`Extreme funding: shorts paying ${(Math.abs(current) * 100).toFixed(3)}% - short squeeze likely`);
            }
          }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] Binance error: ${e}`);
      }
    }
    if (!sources.some((s) => s.startsWith("Binance"))) {
      triedNoContribution.push(binanceDegraded ? "Binance (451 degraded)" : "Binance");
    }

    // =========================================
    // 4. Liquidation Cascade Detection (CRITICAL)
    // =========================================
    const liqService = this.runtime.getService("VINCE_BINANCE_LIQUIDATION_SERVICE") as VinceBinanceLiquidationService | null;
    if (liqService) {
      try {
        // Check for active cascade (major reversal signal)
        const cascade = liqService.getCascade();
        if (cascade && cascade.detected && cascade.direction) {
          // After a cascade, price often reverses
          const reversalDirection = cascade.direction === "long" ? "long" : "short";
          const cascadeStrength = 65 + Math.min(25, cascade.intensity / 4);
          
          signals.push({
            asset,
            direction: reversalDirection,
            strength: cascadeStrength,
            confidence: 70,
            source: "LiquidationCascade",
            factors: [`${cascade.direction.toUpperCase()} cascade: $${(cascade.totalValue / 1000000).toFixed(1)}M liquidated - reversal likely`],
            timestamp: Date.now(),
          });
          sources.push("LiquidationCascade");
          allFactors.push(`${cascade.direction.toUpperCase()} cascade: $${(cascade.totalValue / 1000000).toFixed(1)}M liquidated - reversal likely`);
        }

        // Check ongoing liquidation pressure
        const symbol = `${asset}USDT`;
        const pressure = liqService.getLiquidationPressure(symbol);
        if (pressure.intensity > 40 && pressure.direction !== "neutral") {
          const reversalDir = pressure.direction === "long_liquidations" ? "long" : "short";
          signals.push({
            asset,
            direction: reversalDir,
            strength: 52 + Math.min(15, pressure.intensity / 6),
            confidence: 45,
            source: "LiquidationPressure",
            factors: [`${pressure.direction.replace("_", " ")} detected (contrarian signal)`],
            timestamp: Date.now(),
          });
          sources.push("LiquidationPressure");
          allFactors.push(`${pressure.direction.replace("_", " ")} detected (contrarian signal)`);
        }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] Liquidation service error: ${e}`);
      }
      if (liqService && !sources.includes("LiquidationCascade") && !sources.includes("LiquidationPressure")) {
        triedNoContribution.push("BinanceLiquidations");
      }
    }

    // =========================================
    // 5. News Sentiment (MandoMinutes) — asset-specific, risk-aware
    // =========================================
    const newsService = this.runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as VinceNewsSentimentService | null;
    if (newsService) {
      try {
        const { sentiment, confidence, hasHighRiskEvent } = newsService.getTradingSentiment(asset);
        if (confidence > 50) {
          const discount = Math.round(confidence * 0.8);
          const strength = 52 + Math.min(15, confidence / 6);
          if (sentiment === "bullish") {
            if (hasHighRiskEvent) {
              // Risk-event dampener: block bullish news signal when critical/warning events active
              triedNoContribution.push("NewsSentiment(blocked:risk)");
            } else {
              signals.push({
                asset,
                direction: "long",
                strength,
                confidence: discount,
                source: "NewsSentiment",
                factors: [`News sentiment bullish (${confidence}% confidence)`],
                timestamp: Date.now(),
              });
              sources.push("NewsSentiment");
              allFactors.push(`News sentiment bullish (${confidence}% confidence)`);
            }
          } else if (sentiment === "bearish") {
            signals.push({
              asset,
              direction: "short",
              strength: hasHighRiskEvent ? Math.min(70, strength + 8) : strength,
              confidence: discount,
              source: "NewsSentiment",
              factors: hasHighRiskEvent
                ? [`News sentiment bearish (${confidence}%) + risk event active`]
                : [`News sentiment bearish (${confidence}% confidence)`],
              timestamp: Date.now(),
            });
            sources.push("NewsSentiment");
            allFactors.push(
              hasHighRiskEvent ? `News bearish (${confidence}%) + risk event` : `News sentiment bearish (${confidence}% confidence)`
            );
          } else if (sentiment === "neutral" && confidence >= 40) {
            signals.push({
              asset,
              direction: "neutral",
              strength: 45,
              confidence: Math.round(confidence * 0.6),
              source: "NewsSentiment",
              factors: [`News sentiment neutral (${confidence}% confidence)`],
              timestamp: Date.now(),
            });
            sources.push("NewsSentiment");
            allFactors.push(`News sentiment neutral (${confidence}% confidence)`);
          }
        }
        if (!sources.includes("NewsSentiment")) {
          triedNoContribution.push("NewsSentiment");
        }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] News sentiment error: ${e}`);
        triedNoContribution.push("NewsSentiment");
      }
    }

    // =========================================
    // 6. Deribit Options IV Skew (for BTC/ETH/SOL) - use pre-fetched result
    // =========================================
    if (deribitIVSurface?.skewInterpretation) {
      if (deribitIVSurface.skewInterpretation === "fearful") {
        signals.push({
          asset,
          direction: "long",
          strength: 55,
          confidence: 50,
          source: "DeribitIVSkew",
          factors: [`Options skew fearful (put premium elevated) - contrarian long`],
          timestamp: Date.now(),
        });
        sources.push("DeribitIVSkew");
        allFactors.push(`Options skew fearful (put premium elevated) - contrarian long`);
      } else if (deribitIVSurface.skewInterpretation === "bullish") {
        signals.push({
          asset,
          direction: "short",
          strength: 55,
          confidence: 50,
          source: "DeribitIVSkew",
          factors: [`Options skew bullish (call premium elevated) - contrarian short`],
          timestamp: Date.now(),
        });
        sources.push("DeribitIVSkew");
        allFactors.push(`Options skew bullish (call premium elevated) - contrarian short`);
      }
    }
    if (!sources.includes("DeribitIVSkew") && currency) {
      triedNoContribution.push("DeribitIVSkew");
    }

    // =========================================
    // 7. Market Data Service (market regime) - use pre-fetched result
    // =========================================
    if (marketContext?.marketRegime && marketContext.marketRegime !== "neutral") {
      if (marketContext.marketRegime === "bullish") {
        signals.push({
          asset,
          direction: "long",
          strength: 55,
          confidence: 50,
          source: "MarketRegime",
          factors: [`Market regime bullish (strong 24h price action + sentiment)`],
          timestamp: Date.now(),
        });
        sources.push("MarketRegime");
        allFactors.push(`Market regime bullish (strong 24h price action + sentiment)`);
      } else if (marketContext.marketRegime === "bearish") {
        signals.push({
          asset,
          direction: "short",
          strength: 55,
          confidence: 50,
          source: "MarketRegime",
          factors: [`Market regime bearish (weak 24h price action + sentiment)`],
          timestamp: Date.now(),
        });
        sources.push("MarketRegime");
        allFactors.push(`Market regime bearish (weak 24h price action + sentiment)`);
      } else if (marketContext.marketRegime === "volatile") {
        allFactors.push(`Market regime volatile (caution advised)`);
      }
    }
    if (!sources.includes("MarketRegime")) {
      triedNoContribution.push("MarketRegime");
    }

    // =========================================
    // 8. Sanbase On-Chain Analytics - use pre-fetched result
    // =========================================
    if (sanbaseContext) {
      if (sanbaseContext.exchangeFlows) {
        const { sentiment } = sanbaseContext.exchangeFlows;
        if (sentiment === "accumulation") {
          signals.push({
            asset,
            direction: "long",
            strength: 58,
            confidence: 55,
            source: "SanbaseExchangeFlows",
            factors: [`On-chain accumulation (exchange outflows > inflows)`],
            timestamp: Date.now(),
          });
          sources.push("SanbaseExchangeFlows");
          allFactors.push(`On-chain accumulation (exchange outflows > inflows)`);
        } else if (sentiment === "distribution") {
          signals.push({
            asset,
            direction: "short",
            strength: 58,
            confidence: 55,
            source: "SanbaseExchangeFlows",
            factors: [`On-chain distribution (exchange inflows > outflows)`],
            timestamp: Date.now(),
          });
          sources.push("SanbaseExchangeFlows");
          allFactors.push(`On-chain distribution (exchange inflows > outflows)`);
        }
      }
      if (sanbaseContext.whaleActivity) {
        const { sentiment } = sanbaseContext.whaleActivity;
        if (sentiment === "bullish") {
          signals.push({
            asset,
            direction: "long",
            strength: 60,
            confidence: 58,
            source: "SanbaseWhales",
            factors: [`On-chain whale activity bullish (large transactions accumulating)`],
            timestamp: Date.now(),
          });
          sources.push("SanbaseWhales");
          allFactors.push(`On-chain whale activity bullish (large transactions accumulating)`);
        } else if (sentiment === "bearish") {
          signals.push({
            asset,
            direction: "short",
            strength: 60,
            confidence: 58,
            source: "SanbaseWhales",
            factors: [`On-chain whale activity bearish (large transactions distributing)`],
            timestamp: Date.now(),
          });
          sources.push("SanbaseWhales");
          allFactors.push(`On-chain whale activity bearish (large transactions distributing)`);
        }
      }
    }
    if (sanbaseService?.isConfigured() && !sources.some((s) => s.startsWith("Sanbase"))) {
      triedNoContribution.push("Sanbase");
    }

    // =========================================
    // 9. Hyperliquid Options Pulse & Cross-Venue Funding - use pre-fetched results
    // =========================================
    if (optionsPulse) {
      // Overall market bias from perps funding
      if (optionsPulse.overallBias === "bullish") {
            signals.push({
              asset,
              direction: "long",
              strength: 55,
              confidence: 52,
              source: "HyperliquidBias",
              factors: [`Hyperliquid perps bias bullish (longs paying)`],
              timestamp: Date.now(),
            });
            sources.push("HyperliquidBias");
            allFactors.push(`Hyperliquid perps bias bullish (longs paying)`);
          } else if (optionsPulse.overallBias === "bearish") {
            signals.push({
              asset,
              direction: "short",
              strength: 55,
              confidence: 52,
              source: "HyperliquidBias",
              factors: [`Hyperliquid perps bias bearish (shorts paying)`],
              timestamp: Date.now(),
            });
            sources.push("HyperliquidBias");
            allFactors.push(`Hyperliquid perps bias bearish (shorts paying)`);
          } else {
            // Neutral: weak factor so HL still appears in source list (minimal vote impact)
            signals.push({
              asset,
              direction: "long",
              strength: 50,
              confidence: 48,
              source: "HyperliquidBias",
              factors: [`Hyperliquid perps funding neutral`],
              timestamp: Date.now(),
            });
            sources.push("HyperliquidBias");
            allFactors.push(`Hyperliquid perps funding neutral`);
          }

          // Per-asset crowding (contrarian signal) – include long/short, not only extreme
          const assetKey = asset.toLowerCase() as "btc" | "eth" | "sol" | "hype";
          const assetPulse = optionsPulse.assets[assetKey];
          if (assetPulse) {
            // Crowding level contrarian signals
            if (assetPulse.crowdingLevel === "extreme_long") {
              signals.push({
                asset,
                direction: "short", // Contrarian
                strength: 60,
                confidence: 55,
                source: "HyperliquidCrowding",
                factors: [`${asset} extreme long crowding on Hyperliquid - squeeze risk`],
                timestamp: Date.now(),
              });
              sources.push("HyperliquidCrowding");
              allFactors.push(`${asset} extreme long crowding on Hyperliquid - squeeze risk`);
            } else if (assetPulse.crowdingLevel === "extreme_short") {
              signals.push({
                asset,
                direction: "long", // Contrarian
                strength: 60,
                confidence: 55,
                source: "HyperliquidCrowding",
                factors: [`${asset} extreme short crowding on Hyperliquid - squeeze risk`],
                timestamp: Date.now(),
              });
              sources.push("HyperliquidCrowding");
              allFactors.push(`${asset} extreme short crowding on Hyperliquid - squeeze risk`);
            } else if (assetPulse.crowdingLevel === "long") {
              signals.push({
                asset,
                direction: "short", // Contrarian
                strength: 54,
                confidence: 50,
                source: "HyperliquidCrowding",
                factors: [`${asset} long crowding on Hyperliquid (longs paying)`],
                timestamp: Date.now(),
              });
              sources.push("HyperliquidCrowding");
              allFactors.push(`${asset} long crowding on Hyperliquid (longs paying)`);
            } else if (assetPulse.crowdingLevel === "short") {
              signals.push({
                asset,
                direction: "long", // Contrarian
                strength: 54,
                confidence: 50,
                source: "HyperliquidCrowding",
                factors: [`${asset} short crowding on Hyperliquid (shorts paying)`],
                timestamp: Date.now(),
              });
              sources.push("HyperliquidCrowding");
              allFactors.push(`${asset} short crowding on Hyperliquid (shorts paying)`);
            }

            // Squeeze risk
            if (assetPulse.squeezeRisk === "high") {
              const squeezeDir = assetPulse.crowdingLevel?.includes("long") ? "short" : "long";
              allFactors.push(`${asset} high squeeze risk - ${squeezeDir} squeeze possible`);
            }
          }
      }

      // 9a. Perps at OI cap (max crowding – contrarian)
      if (perpsAtOICap && perpsAtOICap.includes(asset)) {
        const bias = optionsPulse?.overallBias;
        const direction: "long" | "short" = bias === "bearish" ? "long" : "short"; // Fade: at cap + bullish => short
        signals.push({
          asset,
          direction,
          strength: 52,
          confidence: 48,
          source: "HyperliquidOICap",
          factors: [`${asset} at open-interest cap on Hyperliquid - max crowding, contrarian`],
          timestamp: Date.now(),
        });
        sources.push("HyperliquidOICap");
        allFactors.push(`${asset} at OI cap on Hyperliquid - max crowding`);
      }

      // 9b. HL funding extreme (regime from fundingHistory – mean reversion)
      const assetKey = asset.toLowerCase() as "btc" | "eth" | "sol" | "hype";
      const assetPulseForRegime = optionsPulse?.assets[assetKey];
      if (
        hyperliquidService &&
        !isRateLimited &&
        hyperliquidService.getFundingRegime &&
        assetPulseForRegime?.funding8h != null
      ) {
        try {
          const regime = await withTimeout(
            SOURCE_FETCH_TIMEOUT_MS,
            "HLFundingRegime",
            hyperliquidService.getFundingRegime(asset, assetPulseForRegime.funding8h)
          );
          if (regime?.isExtremeLong) {
            signals.push({
              asset,
              direction: "short",
              strength: 58,
              confidence: 54,
              source: "HyperliquidFundingExtreme",
              factors: [`HL funding in top 10% (longs crowded) - mean reversion short`],
              timestamp: Date.now(),
            });
            sources.push("HyperliquidFundingExtreme");
            allFactors.push(`HL funding extreme long (percentile ${regime.percentile.toFixed(0)}) - mean reversion`);
          } else if (regime?.isExtremeShort) {
            signals.push({
              asset,
              direction: "long",
              strength: 58,
              confidence: 54,
              source: "HyperliquidFundingExtreme",
              factors: [`HL funding in bottom 10% (shorts crowded) - squeeze long`],
              timestamp: Date.now(),
            });
            sources.push("HyperliquidFundingExtreme");
            allFactors.push(`HL funding extreme short (percentile ${regime.percentile.toFixed(0)}) - squeeze long`);
          }
        } catch (_e) {
          // Timeout or error: skip HL funding extreme this round
        }
      }

      // 9c. Cross-Venue Funding (HL vs Binance/Bybit)
      if (crossVenue && crossVenue.arbitrageOpportunities.length > 0) {
          // Check if current asset has arbitrage opportunity
          const assetCrossVenue = crossVenue.assets.find(a => a.coin === asset);
          if (assetCrossVenue && assetCrossVenue.isArbitrageOpportunity) {
            if (assetCrossVenue.arbitrageDirection === "long_hl") {
              // HL funding < CEX funding = longs cheaper on HL = bullish signal
              signals.push({
                asset,
                direction: "long",
                strength: 55,
                confidence: 50,
                source: "CrossVenueFunding",
                factors: [`${asset} funding discount on Hyperliquid vs CEX - long edge`],
                timestamp: Date.now(),
              });
              sources.push("CrossVenueFunding");
              allFactors.push(`${asset} funding discount on Hyperliquid vs CEX - long edge`);
            } else if (assetCrossVenue.arbitrageDirection === "short_hl") {
              // HL funding > CEX funding = shorts cheaper on HL = bearish signal
              signals.push({
                asset,
                direction: "short",
                strength: 55,
                confidence: 50,
                source: "CrossVenueFunding",
                factors: [`${asset} funding premium on Hyperliquid vs CEX - short edge`],
                timestamp: Date.now(),
              });
              sources.push("CrossVenueFunding");
              allFactors.push(`${asset} funding premium on Hyperliquid vs CEX - short edge`);
            }
          }
        }
    if (
      hyperliquidService &&
      !sources.some((s) =>
        s === "HyperliquidBias" ||
        s === "HyperliquidCrowding" ||
        s === "CrossVenueFunding" ||
        s === "HyperliquidOICap" ||
        s === "HyperliquidFundingExtreme"
      )
    ) {
      triedNoContribution.push("Hyperliquid");
    }

    // =========================================
    // 10. Deribit Options (Put/Call Ratio + DVOL) - use pre-fetched results
    // =========================================
    const pcRatio = comprehensiveData?.optionsSummary?.putCallRatio;
    if (currency && pcRatio !== undefined) {
      if (pcRatio > 1.3) {
        signals.push({
          asset,
          direction: "long",
          strength: 58,
          confidence: 55,
          source: "DeribitPutCallRatio",
          factors: [`${asset} options put/call ratio ${pcRatio.toFixed(2)} (>1.3 = fear/hedging) - contrarian long`],
          timestamp: Date.now(),
        });
        sources.push("DeribitPutCallRatio");
        allFactors.push(`${asset} options put/call ratio ${pcRatio.toFixed(2)} (>1.3 = fear/hedging) - contrarian long`);
      } else if (pcRatio < 0.7) {
        signals.push({
          asset,
          direction: "short",
          strength: 58,
          confidence: 55,
          source: "DeribitPutCallRatio",
          factors: [`${asset} options put/call ratio ${pcRatio.toFixed(2)} (<0.7 = greed) - contrarian short`],
          timestamp: Date.now(),
        });
        sources.push("DeribitPutCallRatio");
        allFactors.push(`${asset} options put/call ratio ${pcRatio.toFixed(2)} (<0.7 = greed) - contrarian short`);
      }
    }
    if (dvol?.current !== undefined) {
      const dvolValue = dvol.current;
      if (dvolValue > 80) {
        allFactors.push(`${asset} DVOL ${dvolValue.toFixed(1)} (>80 = extreme volatility - use caution)`);
      } else if (dvolValue < 40) {
        allFactors.push(`${asset} DVOL ${dvolValue.toFixed(1)} (<40 = low volatility - breakout possible)`);
      }
    }

    // =========================================
    // Aggregate all signals with WEIGHTED voting + RECENCY DECAY
    // =========================================
    let longVotes = 0;
    let shortVotes = 0;
    let weightedStrength = 0;
    let weightedConfidence = 0;
    let totalWeight = 0;
    let longCount = 0;
    let shortCount = 0;

    for (const signal of signals) {
      // Apply source weight
      const sourceWeight = getSourceWeight(signal.source);
      
      // Apply recency decay (older signals carry less weight)
      const recencyDecay = getRecencyDecay(signal.timestamp, signal.source);
      
      // Combined weight = source weight * recency decay
      const weight = sourceWeight * recencyDecay;
      
      if (signal.direction === "long") {
        longVotes += signal.confidence * weight;
        longCount++;
      } else if (signal.direction === "short") {
        shortVotes += signal.confidence * weight;
        shortCount++;
      }
      
      weightedStrength += signal.strength * weight;
      weightedConfidence += signal.confidence * weight;
      totalWeight += weight;
    }

    let direction: AggregatedSignal["direction"] = "neutral";
    let confirmingCount = 0;
    
    // Use weighted votes - higher weight sources have more influence
    const voteDifference = 20 * (totalWeight / signals.length || 1); // Scale threshold with weights
    if (longVotes > shortVotes + voteDifference) {
      direction = "long";
      confirmingCount = longCount;
    } else if (shortVotes > longVotes + voteDifference) {
      direction = "short";
      confirmingCount = shortCount;
    }

    // Calculate weighted averages
    const avgStrength = totalWeight > 0 ? weightedStrength / totalWeight : 50;
    const avgConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;

    // =========================================
    // Volume Confirmation Adjustment
    // Boost signals with confirming volume, penalize low-conviction moves
    // =========================================
    let volumeMultiplier = 1.0;
    try {
      const binanceService = this.runtime.getService("VINCE_BINANCE_SERVICE") as VinceBinanceService | null;
      if (binanceService && direction !== "neutral") {
        const symbolMap: Record<string, string> = {
          "BTC": "BTCUSDT",
          "ETH": "ETHUSDT",
          "SOL": "SOLUSDT",
          "HYPE": "BTCUSDT", // Use BTC as proxy for HYPE
        };
        const symbol = symbolMap[asset] || "BTCUSDT";
        const takerVolume = await withTimeout(SOURCE_FETCH_TIMEOUT_MS, "TakerVolume", binanceService.getTakerVolume(symbol));
        
        if (takerVolume) {
          const { buySellRatio } = takerVolume;
          
          // Ratio > 1 = more buying, Ratio < 1 = more selling
          // If LONG signal and buySellRatio > 1.2 = confirming volume (boost)
          // If LONG signal and buySellRatio < 0.8 = divergent volume (penalize)
          if (direction === "long") {
            if (buySellRatio >= 1.3) {
              volumeMultiplier = 1.15; // +15% strength for strong buy volume
              allFactors.push(`Strong buy volume confirmation (ratio: ${buySellRatio.toFixed(2)})`);
            } else if (buySellRatio <= 0.7) {
              volumeMultiplier = 0.85; // -15% for divergent volume
              allFactors.push(`Divergent sell volume (ratio: ${buySellRatio.toFixed(2)}) - reduced confidence`);
            }
          } else if (direction === "short") {
            if (buySellRatio <= 0.7) {
              volumeMultiplier = 1.15; // +15% strength for strong sell volume
              allFactors.push(`Strong sell volume confirmation (ratio: ${buySellRatio.toFixed(2)})`);
            } else if (buySellRatio >= 1.3) {
              volumeMultiplier = 0.85; // -15% for divergent volume
              allFactors.push(`Divergent buy volume (ratio: ${buySellRatio.toFixed(2)}) - reduced confidence`);
            }
          }
        }
      }
    } catch (e) {
      logger.debug(`[VinceSignalAggregator] Could not get volume confirmation: ${e}`);
    }

    // =========================================
    // Signal Combo Detection (Cross-Correlation)
    // High-conviction patterns from multiple independent sources
    // =========================================
    let comboMultiplier = 1.0;
    const comboDetected = this.detectSignalCombos(signals, direction, allFactors);
    if (comboDetected.boost > 0) {
      comboMultiplier = 1 + (comboDetected.boost / 100);
      allFactors.push(...comboDetected.factors);
    }

    // =========================================
    // Historical Performance Weight (Feedback Loop)
    // Boost/penalize based on signal source track record
    // =========================================
    let historyMultiplier = 1.0;
    try {
      const tradeJournal = this.runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as any;
      if (tradeJournal?.getSignalWeight) {
        // Calculate average historical weight across all sources
        let totalHistWeight = 0;
        let histWeightCount = 0;
        for (const source of sources) {
          const weight = tradeJournal.getSignalWeight(source);
          if (weight !== 1.0) {
            totalHistWeight += weight;
            histWeightCount++;
          }
        }
        if (histWeightCount > 0) {
          historyMultiplier = totalHistWeight / histWeightCount;
          if (historyMultiplier !== 1.0) {
            allFactors.push(`Historical performance adjustment: ${(historyMultiplier * 100 - 100).toFixed(0)}%`);
          }
        }
      }
    } catch (e) {
      logger.debug(`[VinceSignalAggregator] Could not get historical weights: ${e}`);
    }

    // =========================================
    // RSI Filter (Overbought/Oversold)
    // Penalize entries at momentum extremes
    // =========================================
    let rsiMultiplier = 1.0;
    try {
      const marketData = this.runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;
      if (marketData && direction !== "neutral") {
        const rsiAdj = await withTimeout(SOURCE_FETCH_TIMEOUT_MS, "RSI", marketData.getRSIAdjustment(asset, direction));
        if (rsiAdj) {
          rsiMultiplier = rsiAdj.multiplier;
          if (rsiAdj.reason) allFactors.push(rsiAdj.reason);
        }
      }
    } catch (e) {
      logger.debug(`[VinceSignalAggregator] Could not get RSI adjustment: ${e}`);
    }

    // =========================================
    // V2: Session Filter (Session Awareness)
    // Adjust confidence/size based on trading session
    // =========================================
    const sessionResult = applySessionFilter(
      avgConfidence,
      100, // Position size handled by paper trading service
      this.sessionFilterConfig
    );
    
    const currentSession = sessionResult.session;
    const sessionInfo = sessionResult.sessionInfo;
    let shouldTrade = sessionResult.shouldTrade;
    
    // Apply session adjustments to confidence
    let sessionMultiplier = sessionResult.adjustedConfidence / avgConfidence;
    if (!isFinite(sessionMultiplier)) sessionMultiplier = 1.0;
    
    // Add session factors
    if (sessionResult.factors.length > 0) {
      allFactors.push(...sessionResult.factors);
    }
    
    // =========================================
    // V2: Open Window Trend Spotting
    // Boost signals that align with major market open trends
    // =========================================
    let openWindowBoost = 0;
    let openWindowInfo: OpenWindowInfo | null = null;
    
    if (direction !== "neutral" && this.openWindowConfig.enabled) {
      try {
        const marketData = this.runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;
        if (marketData) {
          openWindowInfo = (await withTimeout(SOURCE_FETCH_TIMEOUT_MS, "OpenWindow", marketData.getOpenWindowInfo(asset))) ?? null;
          
          if (openWindowInfo && openWindowInfo.isOpenWindow) {
            const boostResult = calculateOpenWindowBoost(
              direction,
              openWindowInfo,
              this.openWindowConfig
            );
            
            openWindowBoost = boostResult.boost;
            
            if (boostResult.reason) {
              allFactors.push(`🌅 ${boostResult.reason}`);
            }
          }
        }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] Could not get open window info: ${e}`);
      }
    }

    // Boost strength if multiple sources agree (scaled by average weight)
    const avgWeight = signals.length > 0 ? totalWeight / signals.length : 1;
    const strengthBoost = Math.min(15, confirmingCount * 3 * avgWeight);
    const baseStrength = avgStrength + strengthBoost;
    
    // Apply all multipliers: volume * combo * history * RSI * session
    // Open window boost is additive (not multiplicative) since it's already a percentage
    const multipliedStrength = baseStrength * volumeMultiplier * comboMultiplier * historyMultiplier * rsiMultiplier * sessionMultiplier;
    const finalStrength = Math.min(100, multipliedStrength + openWindowBoost);
    
    // Apply open window boost to confidence as well
    const finalConfidence = Math.min(100, avgConfidence * sessionMultiplier + openWindowBoost);

    // Split factors by whether the source agreed with net direction (for WHY THIS TRADE banner)
    const supportingFactors =
      direction !== "neutral"
        ? signals.filter((s) => s.direction === direction).flatMap((s) => s.factors)
        : [];
    const conflictingFactors =
      direction !== "neutral"
        ? signals.filter((s) => s.direction !== direction && s.direction !== "neutral").flatMap((s) => s.factors)
        : [];
    const conflictingCount = direction === "long" ? shortCount : direction === "short" ? longCount : 0;

    let aggregated: AggregatedSignal = {
      asset,
      direction,
      strength: Math.round(finalStrength),
      confidence: Math.round(finalConfidence),
      sources: [...new Set(sources)], // Deduplicate
      factors: allFactors,
      confirmingCount,
      conflictingCount,
      supportingFactors,
      conflictingFactors,
      timestamp: Date.now(),
      // V2: Session and Open Window info
      session: currentSession,
      sessionInfo,
      openWindowBoost,
      shouldTrade,
      // V4: ML Enhancement (to be filled)
      banditWeightsUsed: cachedBanditWeights !== null,
    };

    // =========================================
    // V4: ML Enhancement
    // Apply ML signal quality filtering and similarity prediction
    // =========================================
    if (direction !== "neutral") {
      aggregated = await this.applyMLEnhancement(aggregated, currentSession);
    }

    // Log which sources contributed (DEBUG to reduce Eliza Cloud noise; set LOG_LEVEL=debug to see)
    if (aggregated.sources.length > 0) {
      logger.debug(
        `[VinceSignalAggregator] ${asset}: ${aggregated.sources.length} source(s) → ${allFactors.length} factors | ` +
        `Sources: ${aggregated.sources.join(", ")}`
      );
    }
    // DEBUG: which optional sources were tried but did not contribute (set LOG_LEVEL=debug)
    if (triedNoContribution.length > 0) {
      logger.debug(
        `[VinceSignalAggregator] ${asset}: tried but no contribution this tick: ${triedNoContribution.join(", ")}`
      );
    }

    // Debug: full aggregation detail
    if (signals.length > 0) {
      const sessionEmoji = currentSession === "eu_us_overlap" ? "🔥" : 
                           currentSession === "off_hours" ? "😴" : "📊";
      const openWindowEmoji = openWindowBoost > 0 ? " 🌅" : "";
      const mlEmoji = aggregated.mlAdjusted ? " 🤖" : "";
      
      logger.debug(
        `[VinceSignalAggregator] ${sessionEmoji} ${asset}: ${direction.toUpperCase()} | ` +
        `Strength: ${aggregated.strength} | Confidence: ${aggregated.confidence} | ` +
        `Sources: ${aggregated.sources.length} (${aggregated.sources.join(", ")}) | ` +
        `Confirming: ${confirmingCount} | Session: ${currentSession}${openWindowEmoji}${mlEmoji}` +
        (openWindowBoost > 0 ? ` (+${openWindowBoost}% boost)` : "") +
        (aggregated.mlQualityScore ? ` [ML: ${(aggregated.mlQualityScore * 100).toFixed(0)}%]` : "") +
        (shouldTrade ? "" : " [BLOCKED]")
      );
    }

    this.signalCache.set(asset, aggregated);
    return aggregated;
  }

  /**
   * V4: Apply ML enhancement to the aggregated signal
   * Uses signal quality model, similarity prediction, and adjusts confidence
   */
  private async applyMLEnhancement(
    signal: AggregatedSignal,
    session: TradingSession
  ): Promise<AggregatedSignal> {
    if (!ML_CONFIG.useMLFiltering && !ML_CONFIG.useSimilarityPrediction) {
      return signal;
    }

    const enhanced = { ...signal };
    let mlAdjusted = false;

    // =========================================
    // 1. ML Signal Quality Prediction
    // =========================================
    if (ML_CONFIG.useMLFiltering) {
      try {
        const mlService = this.runtime.getService("VINCE_ML_INFERENCE_SERVICE") as VinceMLInferenceService | null;
        if (mlService?.isReady?.()) {
          // Build input features
          const marketDataService = this.runtime.getService("VINCE_MARKET_DATA_SERVICE") as VinceMarketDataService | null;
          const regimeService = this.runtime.getService("VINCE_MARKET_REGIME_SERVICE") as VinceMarketRegimeService | null;
          
          const marketData = marketDataService ? await marketDataService.getEnrichedData(signal.asset) : null;
          const regime = (await regimeService?.getCurrentRegime?.(signal.asset)) ?? null;

          // News features from HIP-3 (nasdaq 24h + macro risk) for ML when model has 20 inputs
          let newsNasdaqChange: number | undefined;
          let newsMacroRiskOn: number | undefined;
          let newsMacroRiskOff: number | undefined;
          const hip3Service = this.runtime.getService("VINCE_HIP3_SERVICE") as { getHIP3Pulse?: () => Promise<{ indices?: { symbol: string; change24h: number }[]; summary?: { tradFiVsCrypto?: string } } | null> } | null;
          if (hip3Service?.getHIP3Pulse) {
            const pulse = await withTimeout(SOURCE_FETCH_TIMEOUT_MS, "HIP3-pulse", hip3Service.getHIP3Pulse());
            if (pulse?.indices?.length) {
              const us500 = pulse.indices.find((i) => i.symbol === "US500");
              const infotech = pulse.indices.find((i) => i.symbol === "INFOTECH");
              const indexAsset = us500 ?? infotech ?? pulse.indices[0];
              if (typeof indexAsset?.change24h === "number") newsNasdaqChange = indexAsset.change24h;
            }
            if (pulse?.summary?.tradFiVsCrypto) {
              const tfc = pulse.summary.tradFiVsCrypto;
              newsMacroRiskOn = tfc === "crypto_outperforming" ? 1 : 0;
              newsMacroRiskOff = tfc === "tradfi_outperforming" ? 1 : 0;
            }
          }

          // Prepare ML input (assetTicker for asset_* dummies when model has signal_quality_feature_names)
          const input: SignalQualityInput = {
            priceChange24h: marketData?.priceChange?.day ?? 0,
            volumeRatio: marketData?.volumeRatio ?? 1,
            fundingPercentile: marketData?.fundingPercentile ?? 50,
            longShortRatio: marketData?.longShortRatio ?? 1,
            strength: signal.strength,
            confidence: signal.confidence,
            sourceCount: signal.sources.length,
            hasCascadeSignal: signal.sources.includes("LiquidationCascade") ? 1 : 0,
            hasFundingExtreme: (signal.sources.includes("BinanceFundingExtreme") || signal.sources.includes("HyperliquidFundingExtreme")) ? 1 : 0,
            hasWhaleSignal: signal.sources.includes("SanbaseWhales") ? 1 : 0,
            hasOICap: signal.sources.includes("HyperliquidOICap") ? 1 : 0,
            ...(newsNasdaqChange !== undefined && { newsNasdaqChange }),
            ...(newsMacroRiskOn !== undefined && { newsMacroRiskOn }),
            ...(newsMacroRiskOff !== undefined && { newsMacroRiskOff }),
            ...(signal.asset && { assetTicker: signal.asset }),
            isWeekend: session === "weekend" ? 1 : 0,
            isOpenWindow: signal.openWindowBoost && signal.openWindowBoost > 0 ? 1 : 0,
            utcHour: new Date().getUTCHours() / 24,
            volatilityRegimeHigh: regime?.volatilityRegime === "high" ? 1 : 0,
            marketRegimeBullish: regime?.marketRegime === "bullish" ? 1 : 0,
            marketRegimeBearish: regime?.marketRegime === "bearish" ? 1 : 0,
          };

          const prediction = await mlService.predictSignalQuality(input);
          enhanced.mlQualityScore = prediction.value;

          // Use improvement-report threshold when ML service provides it (from training_metadata.json)
          const minQualityScore =
            typeof (mlService as { getSignalQualityThreshold?: () => number }).getSignalQualityThreshold === "function"
              ? (mlService as { getSignalQualityThreshold: () => number }).getSignalQualityThreshold()
              : ML_CONFIG.minMLQualityScore;

          // Adjust confidence based on ML quality score
          if (prediction.value >= ML_CONFIG.boostMLQualityScore) {
            // High quality signal - boost confidence
            enhanced.confidence = Math.min(100, enhanced.confidence + ML_CONFIG.mlConfidenceBoost);
            enhanced.factors.push(`🤖 ML Quality: HIGH (${(prediction.value * 100).toFixed(0)}%) +${ML_CONFIG.mlConfidenceBoost}% confidence`);
            mlAdjusted = true;
          } else if (prediction.value < minQualityScore) {
            // Low quality signal - reduce confidence (threshold from improvement report when available)
            enhanced.confidence = Math.max(0, enhanced.confidence + ML_CONFIG.mlConfidencePenalty);
            enhanced.factors.push(`🤖 ML Quality: LOW (${(prediction.value * 100).toFixed(0)}%) ${ML_CONFIG.mlConfidencePenalty}% confidence`);
            mlAdjusted = true;
          }
        }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] ML quality prediction error: ${e}`);
      }
    }

    // =========================================
    // 2. Similarity-Based Prediction
    // =========================================
    if (ML_CONFIG.useSimilarityPrediction) {
      try {
        const similarityService = this.runtime.getService("VINCE_SIGNAL_SIMILARITY_SERVICE") as VinceSignalSimilarityService | null;
        if (similarityService?.isReady?.()) {
          const regimeService = this.runtime.getService("VINCE_MARKET_REGIME_SERVICE") as VinceMarketRegimeService | null;
          const regime = (await regimeService?.getCurrentRegime?.(signal.asset)) ?? null;

          const similarityPrediction = await similarityService.predict({
            asset: signal.asset,
            signal: signal,
            marketRegime: regime?.marketRegime ?? "neutral",
            session,
          });

          if (similarityPrediction) {
            enhanced.mlSimilarityPrediction = similarityPrediction;

            // Add factor based on recommendation
            if (similarityPrediction.recommendation === "proceed") {
              enhanced.factors.push(`📊 Similar trades: ${(similarityPrediction.winProbability * 100).toFixed(0)}% win rate (n=${similarityPrediction.sampleCount})`);
            } else if (similarityPrediction.recommendation === "caution") {
              enhanced.factors.push(`⚠️ Similar trades: ${similarityPrediction.reason}`);
              // Slight confidence reduction for caution
              enhanced.confidence = Math.max(0, enhanced.confidence - 5);
              mlAdjusted = true;
            } else if (similarityPrediction.recommendation === "avoid") {
              enhanced.factors.push(`🚫 Similar trades suggest AVOID: ${similarityPrediction.reason}`);
              // Significant confidence reduction
              enhanced.confidence = Math.max(0, enhanced.confidence - 15);
              mlAdjusted = true;
            }
          }
        }
      } catch (e) {
        logger.debug(`[VinceSignalAggregator] Similarity prediction error: ${e}`);
      }
    }

    enhanced.mlAdjusted = mlAdjusted;
    return enhanced;
  }

  /**
   * Get cached signal or generate new one
   */
  async getSignal(asset: string): Promise<AggregatedSignal> {
    const cached = this.signalCache.get(asset);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached;
    }
    return this.aggregateSignals(asset);
  }

  /**
   * Get signals for all tracked assets (respects vince_paper_assets: e.g. "BTC" only)
   */
  async getAllSignals(): Promise<AggregatedSignal[]> {
    const assets = getPaperTradeAssets(this.runtime);
    return Promise.all(assets.map((asset) => this.getSignal(asset)));
  }

  /**
   * Get status including data source availability
   */
  getStatus(): { 
    signalCount: number; 
    lastUpdate: number;
    dataSources: { name: string; available: boolean }[];
  } {
    const signals = Array.from(this.signalCache.values());
    const lastUpdate = Math.max(...signals.map(s => s.timestamp), 0);
    
    // Check which data sources are available (15 total)
    // Note: Hyperliquid and Deribit always available via fallback services
    const sanbaseService = this.runtime.getService("VINCE_SANBASE_SERVICE") as VinceSanbaseService | null;
    const hyperliquidService = getOrCreateHyperliquidService(this.runtime);
    const deribitPluginService = getOrCreateDeribitService(this.runtime);
    const binanceService = this.runtime.getService("VINCE_BINANCE_SERVICE");
    const dataSources = [
      { name: "CoinGlass", available: !!this.runtime.getService("VINCE_COINGLASS_SERVICE") },
      { name: "TopTraders", available: !!this.runtime.getService("VINCE_TOP_TRADERS_SERVICE") },
      { name: "Binance", available: !!binanceService },
      { name: "BinanceFundingExtreme", available: !!binanceService },
      { name: "BinanceLiquidations", available: !!this.runtime.getService("VINCE_BINANCE_LIQUIDATION_SERVICE") },
      { name: "NewsSentiment", available: !!this.runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") },
      { name: "Deribit", available: !!this.runtime.getService("VINCE_DERIBIT_SERVICE") },
      { name: "MarketRegime", available: !!this.runtime.getService("VINCE_MARKET_DATA_SERVICE") },
      { name: "SanbaseFlows", available: !!(sanbaseService && sanbaseService.isConfigured()) },
      { name: "SanbaseWhales", available: !!(sanbaseService && sanbaseService.isConfigured()) },
      { name: "HyperliquidBias", available: !!hyperliquidService },
      { name: "HyperliquidCrowding", available: !!hyperliquidService },
      { name: "HyperliquidOICap", available: !!hyperliquidService },
      { name: "HyperliquidFundingExtreme", available: !!hyperliquidService },
      { name: "CrossVenueFunding", available: !!hyperliquidService },
      { name: "DeribitPutCallRatio", available: !!deribitPluginService },
      { name: "DeribitDVOL", available: !!deribitPluginService },
    ];

    return {
      signalCount: signals.length,
      lastUpdate,
      dataSources,
    };
  }

  /**
   * Get a formatted summary of all active signals for display
   */
  async getSignalSummary(): Promise<string> {
    const signals = await this.getAllSignals();
    const status = this.getStatus();
    const sessionInfo = this.getSessionInfo();
    
    const lines: string[] = [];
    lines.push(`📊 **Signal Aggregator Status**`);
    
    // V2: Add session info
    const sessionEmoji = sessionInfo.session === "eu_us_overlap" ? "🔥" : 
                         sessionInfo.session === "off_hours" ? "😴" : 
                         sessionInfo.session === "asia" ? "🌙" :
                         sessionInfo.session === "europe" ? "🌍" :
                         sessionInfo.session === "us" ? "🗽" : "📊";
    lines.push(`${sessionEmoji} Session: **${sessionInfo.session}** | ${sessionInfo.info}`);
    lines.push(`Data Sources: ${status.dataSources.filter(d => d.available).length}/${status.dataSources.length} active`);
    lines.push("");
    
    for (const signal of signals) {
      const emoji = signal.direction === "long" ? "🟢" : signal.direction === "short" ? "🔴" : "⚪";
      const dirLabel = signal.direction.toUpperCase().padEnd(7);
      const boostInfo = signal.openWindowBoost && signal.openWindowBoost > 0 ? ` 🌅+${signal.openWindowBoost}%` : "";
      const blockedInfo = signal.shouldTrade === false ? " ❌" : "";
      
      lines.push(
        `${emoji} **${signal.asset}**: ${dirLabel} | ` +
        `Strength: ${signal.strength}% | ` +
        `Confidence: ${signal.confidence}% | ` +
        `Sources: ${signal.confirmingCount}${boostInfo}${blockedInfo}`
      );
    }
    
    return lines.join("\n");
  }
}
