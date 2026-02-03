/**
 * VINCE Feature Store Service
 *
 * Collects and stores comprehensive feature data for ML training.
 * Records 40+ features per trading decision including:
 * - Market features (price, volume, volatility, funding, OI)
 * - Session features (trading session, time, day of week)
 * - Signal features (direction, strength, confidence, sources)
 * - Regime features (volatility regime, market regime, funding trend)
 * - Trade execution (entry, leverage, size, SL, TPs)
 * - Trade outcome (exit, P&L, duration, exit reason, MFE/MAE)
 *
 * This enables training ML models to improve:
 * - Signal quality prediction
 * - Optimal position sizing
 * - Stop-loss placement
 * - Take-profit targeting
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Position, TradeSignalDetail, TradeMarketContext } from "../types/paperTrading";
import type { AggregatedSignal } from "./signalAggregator.service";
import type { VinceCoinGlassService } from "./coinglass.service";
import type { VinceMarketDataService } from "./marketData.service";
import type { VinceMarketRegimeService } from "./marketRegime.service";
import type { VinceNewsSentimentService } from "./newsSentiment.service";
import { getCurrentSession, type TradingSession } from "../utils/sessionFilters";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";

// ==========================================
// Feature Record Types
// ==========================================

/**
 * Market features at decision time
 */
export interface MarketFeatures {
  /** Current price */
  price: number;
  /** 1-hour price change % */
  priceChange1h: number;
  /** 24-hour price change % */
  priceChange24h: number;
  /** 24-hour volume in USD */
  volume24h: number;
  /** Volume ratio vs 7-day average */
  volumeRatio: number;
  /** Current funding rate */
  fundingRate: number;
  /** Funding rate percentile (0-100) */
  fundingPercentile: number;
  /** Funding rate 8h delta */
  fundingDelta: number | null;
  /** Open interest in USD */
  openInterest: number;
  /** OI 24h change % */
  oiChange24h: number;
  /** Long/short ratio */
  longShortRatio: number;
  /** Fear/Greed index (0-100) */
  fearGreedIndex: number | null;
  /** Book imbalance (-1 to 1, positive = more bids) */
  bookImbalance: number | null;
  /** Bid-ask spread % */
  bidAskSpread: number | null;
  /** DVOL volatility index (if available) */
  dvol: number | null;
  /** ATR as percentage of price */
  atrPct: number;
  /** RSI 14-period estimate */
  rsi14: number | null;
  /** Price vs SMA20 % */
  priceVsSma20: number | null;
}

/**
 * Session/timing features
 */
export interface SessionFeatures {
  /** Trading session (asia/europe/us/overlap/off_hours) */
  session: TradingSession;
  /** UTC hour (0-23) */
  utcHour: number;
  /** Day of week (0-6, 0 = Sunday) */
  dayOfWeek: number;
  /** Is weekend flag */
  isWeekend: boolean;
  /** Is major market open window */
  isOpenWindow: boolean;
  /** Minutes since session start */
  minutesSinceSessionStart: number;
}

/**
 * Signal features from aggregation
 */
export interface SignalFeatures {
  /** Signal direction */
  direction: "long" | "short" | "neutral";
  /** Signal strength (0-100) */
  strength: number;
  /** Signal confidence (0-100) */
  confidence: number;
  /** Number of confirming sources */
  sourceCount: number;
  /** List of signal source names */
  sources: string[];
  /** Strategy name if trade executed */
  strategyName: string;
  /** Open window boost applied */
  openWindowBoost: number;
  /** Number of conflicting signals */
  conflictingCount: number;
  /** Has cascade signal */
  hasCascadeSignal: boolean;
  /** Has funding extreme signal */
  hasFundingExtreme: boolean;
  /** Has whale/smart money signal */
  hasWhaleSignal: boolean;
  /** Highest weight source */
  highestWeightSource: string;
  /** Derived sentiment from factors (-100 to +100, null if no factors) */
  avgSentiment?: number | null;
}

/**
 * Market regime features
 */
export interface RegimeFeatures {
  /** Volatility regime (low/normal/high/extreme) */
  volatilityRegime: string;
  /** Market regime (bullish/bearish/neutral/volatile) */
  marketRegime: string;
  /** Funding trend (longs_paying/shorts_paying/neutral) */
  fundingTrend: string;
  /** Volume spike detected */
  volumeSpike: boolean;
  /** OI capitalization risk level */
  oiCapRisk: string;
  /** Overall sentiment */
  sentiment: string | null;
}

/**
 * News and sentiment features
 */
export interface NewsFeatures {
  /** BTC ETF flow in millions USD */
  etfFlowBtc: number | null;
  /** ETH ETF flow in millions USD */
  etfFlowEth: number | null;
  /** Macro risk environment */
  macroRiskEnvironment: "risk_on" | "risk_off" | "neutral" | null;
  /** NASDAQ 24h change % */
  nasdaqChange: number | null;
  /** News sentiment score (-100 to +100) */
  sentimentScore: number | null;
  /** News sentiment direction */
  sentimentDirection: "bullish" | "bearish" | "neutral" | null;
  /** Active risk events flag */
  hasActiveRiskEvents: boolean;
  /** Highest risk event severity */
  highestRiskSeverity: "low" | "medium" | "high" | "critical" | null;
}

/**
 * Trade execution features (when trade is opened)
 */
export interface TradeExecutionFeatures {
  /** Trade was executed */
  executed: boolean;
  /** Entry price */
  entryPrice: number;
  /** Leverage used */
  leverage: number;
  /** Position size in USD */
  positionSizeUsd: number;
  /** Position size as % of portfolio */
  positionSizePct: number;
  /** Stop loss price */
  stopLossPrice: number;
  /** Stop loss distance % from entry */
  stopLossDistancePct: number;
  /** Take profit prices */
  takeProfitPrices: number[];
  /** TP distances % from entry */
  takeProfitDistancesPct: number[];
  /** ATR at entry (for trailing stop) */
  entryAtrPct: number;
  /** Streak multiplier applied */
  streakMultiplier: number;
  /** Rejection reason if not executed */
  rejectionReason?: string;
}

/**
 * Trade outcome features (after trade closes)
 */
export interface TradeOutcomeFeatures {
  /** Exit price */
  exitPrice: number;
  /** Realized P&L in USD */
  realizedPnl: number;
  /** Realized P&L as % */
  realizedPnlPct: number;
  /** Holding period in minutes */
  holdingPeriodMinutes: number;
  /** Exit reason */
  exitReason: string;
  /** Max favorable excursion (best unrealized P&L %) */
  maxFavorableExcursion: number;
  /** Max adverse excursion (worst unrealized P&L %) */
  maxAdverseExcursion: number;
  /** Number of partial TPs hit */
  partialProfitsTaken: number;
  /** Trailing stop activated */
  trailingStopActivated: boolean;
  /** Final trailing stop price */
  trailingStopPrice: number | null;
}

/**
 * ML labels derived from outcome
 */
export interface MLLabels {
  /** Trade was profitable */
  profitable: boolean;
  /** Win amount in USD (0 if loss) */
  winAmount: number;
  /** Loss amount in USD (0 if win) */
  lossAmount: number;
  /** R-multiple (P&L / risk) */
  rMultiple: number;
  /** Optimal TP level (1, 2, 3, or 0 if none hit) */
  optimalTpLevel: number;
  /** Would optimal entry have been different */
  betterEntryAvailable: boolean;
  /** Stop was too tight (hit stop but then price reversed favorably) */
  stopTooTight: boolean;
}

/**
 * Complete feature record for a trading decision
 */
export interface FeatureRecord {
  /** Unique record ID */
  id: string;
  /** Timestamp of decision */
  timestamp: number;
  /** Asset traded */
  asset: string;
  /** Market features */
  market: MarketFeatures;
  /** Session features */
  session: SessionFeatures;
  /** Signal features */
  signal: SignalFeatures;
  /** Regime features */
  regime: RegimeFeatures;
  /** News features */
  news: NewsFeatures;
  /**
   * Human-readable reasons/factors that influenced the decision to open this long/short.
   * Used for explainability and for the ML improvement report (which data points drove opens).
   */
  decisionDrivers?: string[];
  /** Trade execution (filled when trade opens) */
  execution?: TradeExecutionFeatures;
  /** Trade outcome (filled when trade closes) */
  outcome?: TradeOutcomeFeatures;
  /** ML labels (derived after outcome) */
  labels?: MLLabels;
}

// ==========================================
// Feature Store Configuration
// ==========================================

export interface FeatureStoreConfig {
  /** Directory to store feature files */
  dataDir: string;
  /** Maximum records per file before rotation */
  maxRecordsPerFile: number;
  /** Flush interval in milliseconds */
  flushIntervalMs: number;
  /** Enabled flag */
  enabled: boolean;
  /**
   * If set (e.g. 90 or 180), delete features_*.jsonl files older than this many days on init.
   * Leave unset/0 to never prune — lets training data accumulate (recommended until you have plenty).
   */
  retainJsonlDays?: number;
}

const DEFAULT_CONFIG: FeatureStoreConfig = {
  dataDir: "./.elizadb/vince-paper-bot/features",
  maxRecordsPerFile: 1000,
  flushIntervalMs: 60000, // 1 minute
  enabled: true,
  // No default pruning: 14 days is usually too little for ML; data accumulates until you set retainJsonlDays (e.g. 90).
};

// ==========================================
// Feature Store Service
// ==========================================

/** Supabase table for ML feature records (same shape as JSONL rows) */
const SUPABASE_FEATURES_TABLE = "vince_paper_bot_features";

function getSupabaseUrl(postgresUrl: string | null): string | null {
  if (!postgresUrl || typeof postgresUrl !== "string") return null;
  const match = postgresUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/);
  if (!match) return null;
  return `https://${match[1]}.supabase.co`;
}

export class VinceFeatureStoreService extends Service {
  static serviceType = "VINCE_FEATURE_STORE_SERVICE";
  capabilityDescription = "Collects trading features for ML training";

  /** ElizaOS Service base expects public config; keep for type compatibility */
  public override config: Record<string, unknown> = {};
  /** Feature store options (dataDir, flushInterval, etc.) */
  private storeConfig: FeatureStoreConfig;
  private records: FeatureRecord[] = [];
  private pendingOutcomes: Map<string, string> = new Map(); // positionId -> recordId
  private flushTimer: NodeJS.Timeout | null = null;
  private initialized = false;
  private supabase: SupabaseClient | null = null;
  /** Funding history per asset for 8h delta: { rate, ts }[], keep last 24h */
  private fundingHistoryByAsset: Map<string, { rate: number; ts: number }[]> = new Map();
  /** Price history per asset for SMA20: last 20 closes */
  private priceHistoryByAsset: Map<string, number[]> = new Map();
  private static readonly FUNDING_HISTORY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
  private static readonly FUNDING_DELTA_WINDOW_MS = 8 * 60 * 60 * 1000;
  private static readonly PRICE_HISTORY_LEN = 20;
  private static readonly BINANCE_DEPTH_TIMEOUT_MS = 5000;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.storeConfig = { ...DEFAULT_CONFIG };
  }

  static async start(runtime: IAgentRuntime): Promise<VinceFeatureStoreService> {
    const service = new VinceFeatureStoreService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    if (!this.storeConfig.enabled) {
      logger.info("[VinceFeatureStore] Disabled");
      return;
    }

    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.storeConfig.dataDir)) {
        fs.mkdirSync(this.storeConfig.dataDir, { recursive: true });
      }

      // Prune old JSONL so new trades accumulate without clutter
      const retainDays = this.storeConfig.retainJsonlDays;
      if (typeof retainDays === "number" && retainDays > 0) {
        this.pruneOldJsonl(retainDays);
      }

      // Optional Supabase dual-write for ML (500+ records queryable in one place)
      const supabaseUrl =
        (this.runtime.getSetting("SUPABASE_URL") as string) ||
        (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
        getSupabaseUrl(
          (this.runtime.getSetting("POSTGRES_URL") as string) ||
            (typeof process !== "undefined" ? process.env?.POSTGRES_URL ?? null : null)
        );
      const supabaseKey =
        (this.runtime.getSetting("SUPABASE_SERVICE_ROLE_KEY") as string) ||
        (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
        (this.runtime.getSetting("SUPABASE_ANON_KEY") as string) ||
        (typeof process !== "undefined" ? process.env?.SUPABASE_ANON_KEY : null);
      if (supabaseUrl && supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        logger.info("[VinceFeatureStore] Supabase dual-write enabled for ML (table: vince_paper_bot_features)");
      } else {
        logger.debug("[VinceFeatureStore] Supabase not configured - features only stored locally (set SUPABASE_SERVICE_ROLE_KEY to sync)");
      }

      // Start flush timer
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.storeConfig.flushIntervalMs);

      this.initialized = true;
      logger.info(
        `[VinceFeatureStore] ✅ Initialized - storing features to ${this.storeConfig.dataDir}`
      );
    } catch (error) {
      logger.error(`[VinceFeatureStore] Initialization error: ${error}`);
    }
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    logger.info("[VinceFeatureStore] Stopped");
  }

  // ==========================================
  // Feature Collection
  // ==========================================

  /**
   * Return extended market snapshot for use by the trading algo.
   * Used in evaluateAndTrade for order-book filter, trend alignment boost, and funding reversal.
   */
  async getExtendedMarketSnapshot(asset: string): Promise<{
    bookImbalance: number | null;
    priceVsSma20: number | null;
    fundingDelta: number | null;
    dvol: number | null;
  }> {
    if (!this.initialized) {
      return { bookImbalance: null, priceVsSma20: null, fundingDelta: null, dvol: null };
    }
    try {
      const m = await this.collectMarketFeatures(asset);
      return {
        bookImbalance: m.bookImbalance,
        priceVsSma20: m.priceVsSma20,
        fundingDelta: m.fundingDelta,
        dvol: m.dvol,
      };
    } catch (e) {
      logger.debug(`[VinceFeatureStore] getExtendedMarketSnapshot error: ${e}`);
      return { bookImbalance: null, priceVsSma20: null, fundingDelta: null, dvol: null };
    }
  }

  /**
   * Record a trading decision with all features
   */
  async recordDecision(params: {
    asset: string;
    signal: AggregatedSignal;
    execution?: Partial<TradeExecutionFeatures>;
  }): Promise<string> {
    if (!this.storeConfig.enabled || !this.initialized) return "";

    const recordId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    try {
      // Collect all features
      const market = await this.collectMarketFeatures(params.asset);
      const session = this.collectSessionFeatures();
      const signalFeatures = this.collectSignalFeatures(params.signal);
      const regime = await this.collectRegimeFeatures(params.asset);
      const news = this.collectNewsFeatures();

      const record: FeatureRecord = {
        id: recordId,
        timestamp: Date.now(),
        asset: params.asset,
        market,
        session,
        signal: signalFeatures,
        regime,
        news,
        decisionDrivers: params.signal.factors?.length ? params.signal.factors.slice(0, 15) : undefined,
        execution: params.execution as TradeExecutionFeatures | undefined,
      };

      this.records.push(record);

      // Auto-flush if buffer is full
      if (this.records.length >= this.storeConfig.maxRecordsPerFile) {
        await this.flush();
      }

      logger.debug(
        `[VinceFeatureStore] Decision recorded: ${params.asset} ${params.signal.direction} (${recordId})`
      );

      return recordId;
    } catch (error) {
      logger.error(`[VinceFeatureStore] Error recording decision: ${error}`);
      return "";
    }
  }

  /**
   * Link a trade position to a feature record
   */
  linkTrade(recordId: string, positionId: string): void {
    if (!this.storeConfig.enabled) return;
    this.pendingOutcomes.set(positionId, recordId);
    logger.debug(`[VinceFeatureStore] Linked position ${positionId} to record ${recordId}`);
  }

  /**
   * Record trade execution details
   */
  async recordExecution(
    recordId: string,
    position: Position,
    additionalDetails?: Partial<TradeExecutionFeatures>
  ): Promise<void> {
    if (!this.storeConfig.enabled) return;

    const record = this.records.find((r) => r.id === recordId);
    if (!record) {
      logger.debug(`[VinceFeatureStore] Record ${recordId} not found for execution`);
      return;
    }

    record.execution = {
      executed: true,
      entryPrice: position.entryPrice,
      leverage: position.leverage,
      positionSizeUsd: position.sizeUsd,
      positionSizePct: additionalDetails?.positionSizePct ?? 0,
      stopLossPrice: position.stopLossPrice,
      stopLossDistancePct: Math.abs(
        ((position.stopLossPrice - position.entryPrice) / position.entryPrice) * 100
      ),
      takeProfitPrices: position.takeProfitPrices,
      takeProfitDistancesPct: position.takeProfitPrices.map((tp) =>
        Math.abs(((tp - position.entryPrice) / position.entryPrice) * 100)
      ),
      entryAtrPct: position.entryATRPct ?? 2.5,
      streakMultiplier: additionalDetails?.streakMultiplier ?? 1.0,
      ...additionalDetails,
    };

    this.pendingOutcomes.set(position.id, recordId);
    logger.debug(`[VinceFeatureStore] Execution recorded for ${position.asset}`);
  }

  /**
   * Record trade outcome
   */
  async recordOutcome(
    positionId: string,
    outcome: {
      exitPrice: number;
      realizedPnl: number;
      realizedPnlPct: number;
      exitReason: string;
      maxUnrealizedProfit?: number;
      maxUnrealizedLoss?: number;
      partialProfitsTaken?: number;
      trailingStopActivated?: boolean;
      trailingStopPrice?: number | null;
      holdingPeriodMs?: number;
    }
  ): Promise<void> {
    if (!this.storeConfig.enabled) return;

    const recordId = this.pendingOutcomes.get(positionId);
    if (!recordId) {
      logger.debug(`[VinceFeatureStore] No record found for position ${positionId}`);
      return;
    }

    const record = this.records.find((r) => r.id === recordId);
    if (!record) {
      logger.debug(`[VinceFeatureStore] Record ${recordId} not found for outcome`);
      this.pendingOutcomes.delete(positionId);
      return;
    }

    // Calculate holding period
    const holdingPeriodMinutes = outcome.holdingPeriodMs
      ? outcome.holdingPeriodMs / (1000 * 60)
      : (Date.now() - record.timestamp) / (1000 * 60);

    record.outcome = {
      exitPrice: outcome.exitPrice,
      realizedPnl: outcome.realizedPnl,
      realizedPnlPct: outcome.realizedPnlPct,
      holdingPeriodMinutes,
      exitReason: outcome.exitReason,
      maxFavorableExcursion: outcome.maxUnrealizedProfit ?? 0,
      maxAdverseExcursion: Math.abs(outcome.maxUnrealizedLoss ?? 0),
      partialProfitsTaken: outcome.partialProfitsTaken ?? 0,
      trailingStopActivated: outcome.trailingStopActivated ?? false,
      trailingStopPrice: outcome.trailingStopPrice ?? null,
    };

    // Derive ML labels
    record.labels = this.deriveLabels(record);

    this.pendingOutcomes.delete(positionId);
    logger.debug(
      `[VinceFeatureStore] Outcome recorded for ${record.asset}: ${outcome.realizedPnl >= 0 ? "+" : ""}$${outcome.realizedPnl.toFixed(2)}`
    );
  }

  // ==========================================
  // Feature Collection Helpers
  // ==========================================

  private async collectMarketFeatures(asset: string): Promise<MarketFeatures> {
    const marketDataService = this.runtime.getService(
      "VINCE_MARKET_DATA_SERVICE"
    ) as VinceMarketDataService | null;
    const coinglassService = this.runtime.getService(
      "VINCE_COINGLASS_SERVICE"
    ) as VinceCoinGlassService | null;

    let price = 0;
    let priceChange24h = 0;
    let volume24h = 0;
    let volumeRatio = 1.0;
    let fundingRate = 0;
    let openInterest = 0;
    let longShortRatio = 1.0;
    let fearGreedIndex: number | null = null;

    // Get market data (single call for price, funding, L/S, volumeRatio, optional volume24h)
    if (marketDataService) {
      try {
        const context = await marketDataService.getEnrichedContext(asset);
        if (context) {
          price = context.currentPrice;
          priceChange24h = context.priceChange24h;
          fundingRate = context.fundingRate;
          longShortRatio = context.longShortRatio;
          fearGreedIndex = context.fearGreedValue;
          volumeRatio = context.volumeRatio;
          const v = (context as { volume24h?: number }).volume24h;
          if (typeof v === "number") volume24h = v;
        }
      } catch (e) {
        logger.debug(`[VinceFeatureStore] Market data error: ${e}`);
      }
    }

    // CoinGlass / OI: use getOpenInterest (has value + change24h)
    let oiChange24h = 0;
    if (coinglassService) {
      try {
        const oi = coinglassService.getOpenInterest(asset);
        if (oi) {
          openInterest = oi.value;
          if (oi.change24h != null && !Number.isNaN(oi.change24h)) oiChange24h = oi.change24h;
        }
        // Volume from funding/OI path if we don't have it yet (Binance free path may set it)
        const funding = coinglassService.getFunding(asset);
      } catch (e) {
        logger.debug(`[VinceFeatureStore] CoinGlass error: ${e}`);
      }
    }

    // Funding 8h delta: cache current rate, find rate from ~8h ago
    let fundingDelta: number | null = null;
    const now = Date.now();
    if (coinglassService && typeof fundingRate === "number") {
      let hist = this.fundingHistoryByAsset.get(asset) ?? [];
      hist.push({ rate: fundingRate, ts: now });
      hist = hist.filter((e) => now - e.ts < VinceFeatureStoreService.FUNDING_HISTORY_MAX_AGE_MS);
      this.fundingHistoryByAsset.set(asset, hist);
      const targetTs = now - VinceFeatureStoreService.FUNDING_DELTA_WINDOW_MS;
      const closest = hist.reduce((best, e) =>
        Math.abs(e.ts - targetTs) < Math.abs((best?.ts ?? 0) - targetTs) ? e : best
      );
      if (closest && Math.abs(closest.ts - targetTs) < 2 * 60 * 60 * 1000) {
        fundingDelta = fundingRate - closest.rate;
          }
    }

    // Price SMA20: rolling window of closes
    let priceVsSma20: number | null = null;
    if (price > 0) {
      let prices = this.priceHistoryByAsset.get(asset) ?? [];
      prices.push(price);
      if (prices.length > VinceFeatureStoreService.PRICE_HISTORY_LEN) {
        prices = prices.slice(-VinceFeatureStoreService.PRICE_HISTORY_LEN);
      }
      this.priceHistoryByAsset.set(asset, prices);
      if (prices.length >= VinceFeatureStoreService.PRICE_HISTORY_LEN) {
        const sma = prices.reduce((a, b) => a + b, 0) / prices.length;
        priceVsSma20 = sma > 0 ? ((price - sma) / sma) * 100 : null;
      }
    }

    // Binance order book (depth) for book imbalance and bid-ask spread
    const { bookImbalance, bidAskSpread } = await this.fetchBinanceDepth(asset);

    // DVOL (Deribit) and RSI estimate from market data service
    let dvol: number | null = null;
    let rsi14: number | null = null;
    let atrPct = this.getDefaultAtrPct(asset);
    if (marketDataService) {
      try {
        if (typeof (marketDataService as any).getDVOL === "function") {
          dvol = await (marketDataService as any).getDVOL(asset);
        }
        if (typeof (marketDataService as any).estimateRSI === "function") {
          const rsiOut = await (marketDataService as any).estimateRSI(asset);
          if (rsiOut?.rsi != null) rsi14 = rsiOut.rsi;
        }
        if (typeof (marketDataService as any).getATRPercent === "function") {
          atrPct = await (marketDataService as any).getATRPercent(asset);
        }
      } catch (e) {
        logger.debug(`[VinceFeatureStore] MarketData DVOL/RSI/ATR error: ${e}`);
      }
    }

    return {
      price,
      priceChange1h: 0, // Not available without additional API call
      priceChange24h,
      volume24h,
      volumeRatio,
      fundingRate,
      fundingPercentile: this.calculateFundingPercentile(fundingRate),
      fundingDelta,
      openInterest,
      oiChange24h,
      longShortRatio,
      fearGreedIndex,
      bookImbalance,
      bidAskSpread,
      dvol,
      atrPct,
      rsi14,
      priceVsSma20,
    };
  }

  /**
   * Fetch Binance futures depth and compute book imbalance (-1..1) and bid-ask spread %.
   * Public API, no key required. Returns nulls on error or unsupported asset.
   */
  private async fetchBinanceDepth(asset: string): Promise<{
    bookImbalance: number | null;
    bidAskSpread: number | null;
  }> {
    const symbol =
      asset === "BTC"
        ? "BTCUSDT"
        : asset === "ETH"
          ? "ETHUSDT"
          : asset === "SOL"
            ? "SOLUSDT"
            : asset === "HYPE"
              ? "HYPEUSDT"
              : null;
    if (!symbol) return { bookImbalance: null, bidAskSpread: null };
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), VinceFeatureStoreService.BINANCE_DEPTH_TIMEOUT_MS);
      const res = await fetch(
        `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=10`,
        { signal: controller.signal }
      );
      clearTimeout(t);
      if (!res.ok) return { bookImbalance: null, bidAskSpread: null };
      const data = (await res.json()) as { bids?: [string, string][]; asks?: [string, string][] };
      const bids = data.bids ?? [];
      const asks = data.asks ?? [];
      if (bids.length === 0 || asks.length === 0) return { bookImbalance: null, bidAskSpread: null };
      const bidVol = bids.reduce((sum, [p, q]) => sum + parseFloat(p) * parseFloat(q), 0);
      const askVol = asks.reduce((sum, [p, q]) => sum + parseFloat(p) * parseFloat(q), 0);
      const total = bidVol + askVol;
      const bookImbalance = total > 0 ? (bidVol - askVol) / total : null;
      const bestBid = parseFloat(bids[0][0]);
      const bestAsk = parseFloat(asks[0][0]);
      const mid = (bestBid + bestAsk) / 2;
      const bidAskSpread = mid > 0 ? ((bestAsk - bestBid) / mid) * 100 : null;
      return { bookImbalance, bidAskSpread };
    } catch (e) {
      logger.debug(`[VinceFeatureStore] Binance depth error: ${e}`);
      return { bookImbalance: null, bidAskSpread: null };
    }
  }

  private collectSessionFeatures(): SessionFeatures {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const session = getCurrentSession();

    // Calculate minutes since session start
    const sessionStartHours: Record<TradingSession, number> = {
      asia: 0,
      europe: 7,
      us: 13,
      eu_us_overlap: 13,
      off_hours: 21,
    };
    const sessionStart = sessionStartHours[session] ?? 0;
    const minutesSinceSessionStart = (utcHour - sessionStart) * 60 + now.getUTCMinutes();

    // Check if in open window (first 30 min of major session)
    const isOpenWindow =
      (session === "us" || session === "europe" || session === "asia") &&
      minutesSinceSessionStart >= 0 &&
      minutesSinceSessionStart <= 30;

    return {
      session,
      utcHour,
      dayOfWeek,
      isWeekend,
      isOpenWindow,
      minutesSinceSessionStart: Math.max(0, minutesSinceSessionStart),
    };
  }

  private collectSignalFeatures(signal: AggregatedSignal): SignalFeatures {
    const sources = signal.sources || [];
    
    // Detect special signal types
    const hasCascadeSignal = sources.some(
      (s) => s === "LiquidationCascade" || s === "LiquidationPressure"
    );
    const hasFundingExtreme = sources.some((s) => s === "BinanceFundingExtreme");
    // NOTE: Only BinanceTopTraders provides real whale data
    // TopTraders requires wallet config, SanbaseWhales has 30-day lag on free tier
    const hasWhaleSignal = sources.some(
      (s) =>
        s === "BinanceTopTraders" ||  // Real data
        s === "SanbaseExchangeFlows"  // Real on-chain flows
    );

    // Find highest weight source (should match dynamicConfig.ts)
    const sourceWeights: Record<string, number> = {
      LiquidationCascade: 2.0,
      LiquidationPressure: 1.6,
      BinanceFundingExtreme: 1.5,
      TopTraders: 0.0,        // DISABLED - no wallet addresses configured
      BinanceTopTraders: 1.0, // Real data from public Binance API
      SanbaseWhales: 0.0,     // DISABLED - 30-day lag on free tier
    };

    let highestWeight = 0;
    let highestWeightSource = sources[0] || "none";
    for (const source of sources) {
      const weight = sourceWeights[source] || 1.0;
      if (weight > highestWeight) {
        highestWeight = weight;
        highestWeightSource = source;
      }
    }

    // Derive avgSentiment from factors so ML gets a numeric sentiment when sources don't provide it
    const factors = signal.factors ?? [];
    let avgSentiment: number | null = null;
    if (factors.length > 0) {
      const bullishWords = /long|bullish|negative funding|funding negative|fear|oversold|short liquidat|squeeze|inflow|accumulation|buy/gi;
      const bearishWords = /short|bearish|elevated funding|funding elevated|greed|overbought|long liquidat|flush|outflow|distribution|sell/gi;
      let score = 0;
      for (const f of factors) {
        const text = String(f);
        const b = text.match(bullishWords)?.length ?? 0;
        const s = text.match(bearishWords)?.length ?? 0;
        score += b - s;
      }
      if (score !== 0) {
        avgSentiment = Math.max(-100, Math.min(100, score * 25));
      }
    }

    return {
      direction: signal.direction,
      strength: signal.strength,
      confidence: signal.confidence,
      sourceCount: signal.confirmingCount,
      sources,
      strategyName: "aggregated",
      openWindowBoost: signal.openWindowBoost ?? 0,
      conflictingCount: 0, // Would need to track from aggregator
      hasCascadeSignal,
      hasFundingExtreme,
      hasWhaleSignal,
      highestWeightSource,
      avgSentiment: avgSentiment ?? undefined,
    };
  }

  private async collectRegimeFeatures(asset: string): Promise<RegimeFeatures> {
    const marketRegimeService = this.runtime.getService(
      "VINCE_MARKET_REGIME_SERVICE"
    ) as VinceMarketRegimeService | null;
    const marketDataService = this.runtime.getService(
      "VINCE_MARKET_DATA_SERVICE"
    ) as VinceMarketDataService | null;

    let volatilityRegime = "normal";
    let marketRegime = "neutral";
    let fundingTrend = "neutral";
    let volumeSpike = false;
    let sentiment: string | null = null;

    if (marketRegimeService) {
      try {
        const regime = await marketRegimeService.getRegime(asset);
        if (regime) {
          volatilityRegime = regime.regime === "volatile" ? "high" : "normal";
          marketRegime = regime.regime;
        }
      } catch (e) {
        logger.debug(`[VinceFeatureStore] Market regime error: ${e}`);
      }
    }

    if (marketDataService) {
      try {
        const context = await marketDataService.getEnrichedContext(asset);
        if (context) {
          marketRegime = context.marketRegime;
          volumeSpike = context.volumeRatio > 2.0;
          fundingTrend =
            context.fundingRate > 0.01
              ? "longs_paying"
              : context.fundingRate < -0.01
                ? "shorts_paying"
                : "neutral";
        }
      } catch (e) {
        logger.debug(`[VinceFeatureStore] Regime context error: ${e}`);
      }
    }

    return {
      volatilityRegime,
      marketRegime,
      fundingTrend,
      volumeSpike,
      oiCapRisk: "normal",
      sentiment,
    };
  }

  private collectNewsFeatures(): NewsFeatures {
    const newsService = this.runtime.getService(
      "VINCE_NEWS_SENTIMENT_SERVICE"
    ) as VinceNewsSentimentService | null;

    let result: NewsFeatures = {
      etfFlowBtc: null,
      etfFlowEth: null,
      macroRiskEnvironment: null,
      nasdaqChange: null,
      sentimentScore: null,
      sentimentDirection: null,
      hasActiveRiskEvents: false,
      highestRiskSeverity: null,
    };

    if (newsService) {
      try {
        const sentiment = newsService.getOverallSentiment?.();
        if (sentiment) {
          result.sentimentDirection = sentiment.sentiment ?? null;
          const conf = typeof sentiment.confidence === "number" ? sentiment.confidence : 0;
          result.sentimentScore =
            sentiment.sentiment === "bullish"
              ? conf
              : sentiment.sentiment === "bearish"
                ? -conf
                : 0;
        }
        const events = newsService.getActiveRiskEvents?.();
        if (Array.isArray(events) && events.length > 0) {
          result.hasActiveRiskEvents = true;
          const severities = events.map((e: { severity?: string }) => e.severity).filter(Boolean);
          if (severities.includes("critical")) result.highestRiskSeverity = "critical";
          else if (severities.includes("high")) result.highestRiskSeverity = "high";
          else if (severities.includes("medium")) result.highestRiskSeverity = "medium";
          else result.highestRiskSeverity = "low";
        }
      } catch (e) {
        logger.debug(`[VinceFeatureStore] News sentiment error: ${e}`);
      }
    }

    return result;
  }

  // ==========================================
  // Label Derivation
  // ==========================================

  private deriveLabels(record: FeatureRecord): MLLabels {
    const outcome = record.outcome;
    const execution = record.execution;

    if (!outcome || !execution) {
      return {
        profitable: false,
        winAmount: 0,
        lossAmount: 0,
        rMultiple: 0,
        optimalTpLevel: 0,
        betterEntryAvailable: false,
        stopTooTight: false,
      };
    }

    const profitable = outcome.realizedPnl > 0;
    const winAmount = profitable ? outcome.realizedPnl : 0;
    const lossAmount = profitable ? 0 : Math.abs(outcome.realizedPnl);

    // Calculate R-multiple (P&L / initial risk)
    const riskPerUnit =
      (execution.stopLossDistancePct / 100) * execution.positionSizeUsd * execution.leverage;
    const rMultiple = riskPerUnit > 0 ? outcome.realizedPnl / riskPerUnit : 0;

    // Determine optimal TP level
    let optimalTpLevel = 0;
    const mfePct = outcome.maxFavorableExcursion;
    for (let i = execution.takeProfitDistancesPct.length - 1; i >= 0; i--) {
      if (mfePct >= execution.takeProfitDistancesPct[i] * 0.9) {
        optimalTpLevel = i + 1;
        break;
      }
    }

    // Check if stop was too tight
    const stopTooTight =
      outcome.exitReason === "stop_loss" &&
      outcome.maxFavorableExcursion > execution.stopLossDistancePct * 2;

    // Check if better entry was available
    const betterEntryAvailable = outcome.maxAdverseExcursion > execution.stopLossDistancePct * 0.5;

    return {
      profitable,
      winAmount,
      lossAmount,
      rMultiple,
      optimalTpLevel,
      betterEntryAvailable,
      stopTooTight,
    };
  }

  // ==========================================
  // Persistence
  // ==========================================

  private async flush(): Promise<void> {
    if (this.records.length === 0) return;

    const toFlush = [...this.records];
    this.records = [];

    try {
      const filename = `features_${new Date().toISOString().split("T")[0]}_${Date.now()}.jsonl`;
      const filepath = path.join(this.storeConfig.dataDir, filename);

      // 1. Always write local JSONL (backup, offline)
      const lines = toFlush.map((r) => JSON.stringify(r)).join("\n");
      fs.appendFileSync(filepath, lines + "\n");
      logger.debug(`[VinceFeatureStore] Flushed ${toFlush.length} records to ${filename}`);

      // 2. Optional Supabase dual-write for ML (500+ records in one place)
      if (this.supabase) {
        const rows = toFlush.map((r) => ({
          id: r.id,
          created_at: new Date(r.timestamp).toISOString(),
          payload: r as unknown as Record<string, unknown>,
        }));
        const { error } = await this.supabase.from(SUPABASE_FEATURES_TABLE).upsert(rows, {
          onConflict: "id",
        });
        if (error) {
          logger.warn(`[VinceFeatureStore] Supabase upsert error (local JSONL saved): ${error.message}`);
        } else {
          logger.debug(`[VinceFeatureStore] Synced ${toFlush.length} records to Supabase`);
        }
      }

      // 3. Optional PGLite/Postgres dual-write (plugin_vince.paper_bot_features)
      await this.flushToPglite(toFlush);
    } catch (error) {
      logger.error(`[VinceFeatureStore] Error flushing records: ${error}`);
      this.records.push(...toFlush);
    }
  }

  /**
   * Delete features_*.jsonl files older than retainDays (by file mtime).
   * Keeps the folder manageable so new trades accumulate without clutter.
   */
  private pruneOldJsonl(retainDays: number): void {
    const cutoff = Date.now() - retainDays * 24 * 60 * 60 * 1000;
    try {
      const files = fs.readdirSync(this.storeConfig.dataDir);
      let deleted = 0;
      for (const name of files) {
        if (!name.startsWith("features_") || !name.endsWith(".jsonl")) continue;
        const filepath = path.join(this.storeConfig.dataDir, name);
        const stat = fs.statSync(filepath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filepath);
          deleted++;
          logger.debug(`[VinceFeatureStore] Pruned old JSONL: ${name}`);
        }
      }
      if (deleted > 0) {
        logger.info(
          `[VinceFeatureStore] Pruned ${deleted} old JSONL file(s) (retain ${retainDays} days)`
        );
      }
    } catch (error) {
      logger.warn(`[VinceFeatureStore] pruneOldJsonl error: ${error}`);
    }
  }

  /**
   * Upsert feature records into plugin_vince.paper_bot_features (PGLite or Postgres).
   * No-op if runtime has no DB connection or table does not exist yet.
   */
  private async flushToPglite(records: FeatureRecord[]): Promise<void> {
    if (records.length === 0) return;
    try {
      const conn = await this.runtime.getConnection?.();
      if (!conn || typeof (conn as { query?: unknown }).query !== "function") return;
      const client = conn as { query: (text: string, values?: unknown[]) => Promise<{ rows?: unknown[] }> };
      const table = "plugin_vince.paper_bot_features";
      const sql = `INSERT INTO ${table} (id, created_at, payload) VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET created_at = EXCLUDED.created_at, payload = EXCLUDED.payload`;
      for (const r of records) {
        await client.query(sql, [
          r.id,
          new Date(r.timestamp).toISOString(),
          JSON.stringify(r),
        ]);
      }
      logger.debug(`[VinceFeatureStore] Synced ${records.length} records to PGLite/Postgres`);
    } catch (err) {
      logger.debug(`[VinceFeatureStore] PGLite/Postgres write skipped (table may not exist yet): ${err}`);
    }
  }

  // ==========================================
  // Data Retrieval
  // ==========================================

  /**
   * Load historical records for analysis
   */
  async loadRecords(daysBack: number = 30): Promise<FeatureRecord[]> {
    const records: FeatureRecord[] = [];
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    try {
      const files = fs
        .readdirSync(this.storeConfig.dataDir)
        .filter((f) => f.startsWith("features_") && f.endsWith(".jsonl"))
        .sort()
        .reverse();

      for (const file of files) {
        const filepath = path.join(this.storeConfig.dataDir, file);
        const content = fs.readFileSync(filepath, "utf-8");
        const lines = content.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          try {
            const record = JSON.parse(line) as FeatureRecord;
            if (record.timestamp >= cutoff) {
              records.push(record);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      logger.error(`[VinceFeatureStore] Error loading records: ${error}`);
    }

    return records.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Export records for ML training
   */
  async exportForTraining(
    outputPath: string,
    daysBack: number = 90
  ): Promise<{ success: boolean; recordCount: number; completeCount: number }> {
    try {
      const records = await this.loadRecords(daysBack);

      // Filter to only complete trades with outcomes
      const completeRecords = records.filter((r) => r.outcome && r.labels);

      fs.writeFileSync(outputPath, JSON.stringify(completeRecords, null, 2));

      logger.info(
        `[VinceFeatureStore] Exported ${completeRecords.length}/${records.length} complete records to ${outputPath}`
      );

      return {
        success: true,
        recordCount: records.length,
        completeCount: completeRecords.length,
      };
    } catch (error) {
      logger.error(`[VinceFeatureStore] Export error: ${error}`);
      return { success: false, recordCount: 0, completeCount: 0 };
    }
  }

  /**
   * Count records that have outcome + labels (closed trades suitable for ML training).
   * Used to decide when to run ONNX training (e.g. when >= 90).
   */
  async getCompleteRecordCount(daysBack: number = 365): Promise<number> {
    const records = await this.loadRecords(daysBack);
    return records.filter((r) => r.outcome && r.labels).length;
  }

  /**
   * Get statistics about collected data
   */
  getStats(): {
    bufferedRecords: number;
    pendingOutcomes: number;
    dataDir: string;
    enabled: boolean;
    initialized: boolean;
  } {
    return {
      bufferedRecords: this.records.length,
      pendingOutcomes: this.pendingOutcomes.size,
      dataDir: this.storeConfig.dataDir,
      enabled: this.storeConfig.enabled,
      initialized: this.initialized,
    };
  }

  /**
   * Get recent records for online learning
   */
  getRecentRecords(count: number = 100): FeatureRecord[] {
    return this.records.slice(-count);
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  private calculateFundingPercentile(fundingRate: number): number {
    // Historical funding rate distribution:
    // -0.1% to +0.1% covers ~90% of observations
    // Normalize to 0-100 percentile
    const normalized = (fundingRate + 0.001) / 0.002; // Maps -0.1% to 0%, +0.1% to 100%
    return Math.max(0, Math.min(100, normalized * 100));
  }

  private getDefaultAtrPct(asset: string): number {
    const defaults: Record<string, number> = {
      BTC: 2.5,
      ETH: 3.5,
      SOL: 5.0,
      HYPE: 7.0,
    };
    return defaults[asset] ?? 3.0;
  }
}

export default VinceFeatureStoreService;
