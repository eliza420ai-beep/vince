/**
 * VINCE Paper Trading Service
 *
 * Main orchestration service for paper trading:
 * - Order simulation with slippage
 * - Signal evaluation and trade execution
 * - Position lifecycle management
 * - State persistence
 */

import { Service, type IAgentRuntime, logger, ModelType } from "@elizaos/core";
import type {
  Position,
  SimulatedOrder,
  AggregatedTradeSignal,
  TradeSignalDetail,
  TradeMarketContext,
} from "../types/paperTrading";
import type { VincePositionManagerService } from "./vincePositionManager.service";
import type { VinceRiskManagerService } from "./vinceRiskManager.service";
import type { VinceTradeJournalService } from "./vinceTradeJournal.service";
import type {
  VinceSignalAggregatorService,
  AggregatedSignal,
} from "./signalAggregator.service";
import type { VinceMarketDataService } from "./marketData.service";
import type { VinceCoinGlassService } from "./coinglass.service";
import type {
  VinceMarketRegimeService,
  MarketRegime,
} from "./marketRegime.service";
// V4: ML Integration Services
import type { VinceFeatureStoreService } from "./vinceFeatureStore.service";
import type { VinceWeightBanditService } from "./weightBandit.service";
import type { VinceSignalSimilarityService } from "./signalSimilarity.service";
import type { VinceNewsSentimentService } from "./newsSentiment.service";
import type { VinceMLInferenceService } from "./mlInference.service";
import type { PositionSizingInput, TPSLInput } from "./mlInference.service";
import {
  SLIPPAGE,
  FEES,
  DEFAULT_LEVERAGE,
  AGGRESSIVE_LEVERAGE,
  AGGRESSIVE_MARGIN_USD,
  AGGRESSIVE_BASE_SIZE_PCT,
  AGGRESSIVE_RISK_LIMITS,
  DEFAULT_STOP_LOSS_PCT,
  DEFAULT_TAKE_PROFIT_TARGETS,
  TAKE_PROFIT_TARGETS_FAST_TP,
  TAKE_PROFIT_USD_AGGRESSIVE,
  TARGET_RR_AGGRESSIVE,
  MIN_SL_PCT_AGGRESSIVE,
  MAX_SL_PCT_AGGRESSIVE,
  MIN_SL_ATR_MULTIPLIER_AGGRESSIVE,
  getPaperTradeAssets,
  getAssetMaxLeverage,
  TIMING,
  PERSISTENCE_DIR,
  PRIMARY_SIGNAL_SOURCES,
  isWttEnabled,
  wttRubricToSignal,
  wttPickToWttBlock,
  type WttFeatureBlock,
} from "../constants/paperTradingDefaults";
import {
  normalizeWttTicker,
  CORE_ASSETS,
  HIP3_ASSETS,
} from "../constants/targetAssets";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { formatUsd, buildWhyThisTrade } from "../utils/tradeExplainer";
import {
  getBookImbalanceRejection,
  getAdjustedConfidence,
  type ExtendedSnapshot,
  type MarketContext,
} from "../utils/extendedSnapshotLogic";
import {
  buildContextBucketKeys,
  getContextAdjustmentMultiplier,
  recordContextOutcome,
} from "../utils/contextFeatureStats";

// ==========================================
// Pending Entry Types
// ==========================================
interface PendingEntry {
  id: string;
  asset: string;
  direction: "long" | "short";
  signal: AggregatedTradeSignal;
  targetPrice: number; // Price we're waiting for
  triggerPrice: number; // Price when signal was generated
  sizeUsd: number;
  leverage: number;
  createdAt: number;
  expiresAt: number; // Entry expires if not filled within 5 minutes
  isCascadeSignal: boolean; // Cascade signals enter immediately, skip pullback
}

// Pullback configuration
const PULLBACK_CONFIG = {
  pullbackPct: 0.15, // Wait for 0.15% pullback (was 0.3% - too aggressive, entries kept expiring)
  timeoutMs: 3 * 60 * 1000, // 3 minute timeout (was 5 min)
};

/** Minimal shape of WTT JSON sidecar (docs/standup/whats-the-trade/YYYY-MM-DD-whats-the-trade.json) */
interface WttPickJson {
  date: string;
  thesis: string;
  primaryTicker: string;
  primaryDirection: "long" | "short";
  primaryInstrument: string;
  primaryEntryPrice: number;
  primaryRiskUsd: number;
  invalidateCondition: string;
  altTicker?: string;
  altDirection?: "long" | "short";
  altInstrument?: string;
  rubric: {
    alignment: "direct" | "pure_play" | "exposed" | "partial" | "tangential";
    edge: "undiscovered" | "emerging" | "consensus" | "crowded";
    payoffShape: "max_asymmetry" | "high" | "moderate" | "linear" | "capped";
    timingForgiveness:
      | "very_forgiving"
      | "forgiving"
      | "punishing"
      | "very_punishing";
  };
  evThresholdPct?: number;
  killConditions: string[];
}

export class VincePaperTradingService extends Service {
  static serviceType = "VINCE_PAPER_TRADING_SERVICE";
  capabilityDescription =
    "Paper trading orchestration with simulated execution";

  private initialized = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private persistenceDir: string | null = null;
  private pendingEntries: Map<string, PendingEntry> = new Map();

  // Win-streak tracking for position sizing (last 5 trades)
  private recentTradeOutcomes: boolean[] = []; // true = win, false = loss
  private readonly MAX_STREAK_HISTORY = 5;

  // Throttle "Could not get entry price" to once per asset per minute (avoids log spam when CoinGecko is slow)
  private lastEntryPriceWarnByAsset: Map<string, number> = new Map();
  private static readonly ENTRY_PRICE_WARN_THROTTLE_MS = 60_000;

  // Throttle "No WTT pick for today" to once per calendar day (update loop runs every 30s)
  private lastNoWttLogDate: string | null = null;

  // WTT: ensure we only open today's pick once (persisted so survives restart)
  private wttTradedToday: { date: string; asset: string } | null = null;
  private lastWttAlreadyTradedLogDate: string | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VincePaperTradingService> {
    const service = new VincePaperTradingService(runtime);
    await service.initialize();
    const aggressive =
      runtime.getSetting?.("vince_paper_aggressive") === true ||
      runtime.getSetting?.("vince_paper_aggressive") === "true";
    const assets = getPaperTradeAssets(runtime).join(",");
    logger.info(
      `[VincePaperTrading] ✅ Service started | aggressive=${aggressive}, assets=${assets}`,
    );
    return service;
  }

  async stop(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    await this.persistState();
    logger.info("[VincePaperTrading] Service stopped");
  }

  private async initialize(): Promise<void> {
    // Setup persistence directory
    try {
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      this.persistenceDir = path.join(elizaDbDir, PERSISTENCE_DIR);

      if (!fs.existsSync(this.persistenceDir)) {
        fs.mkdirSync(this.persistenceDir, { recursive: true });
      }

      // Try to restore state
      await this.restoreState();
    } catch (error) {
      logger.warn(`[VincePaperTrading] Could not setup persistence: ${error}`);
    }

    // Start update loop
    this.startUpdateLoop();
    this.initialized = true;
  }

  // ==========================================
  // Service Getters
  // ==========================================

  private getPositionManager(): VincePositionManagerService | null {
    return this.runtime.getService(
      "VINCE_POSITION_MANAGER_SERVICE",
    ) as VincePositionManagerService | null;
  }

  private getRiskManager(): VinceRiskManagerService | null {
    return this.runtime.getService(
      "VINCE_RISK_MANAGER_SERVICE",
    ) as VinceRiskManagerService | null;
  }

  private getTradeJournal(): VinceTradeJournalService | null {
    return this.runtime.getService(
      "VINCE_TRADE_JOURNAL_SERVICE",
    ) as VinceTradeJournalService | null;
  }

  private getSignalAggregator(): VinceSignalAggregatorService | null {
    return this.runtime.getService(
      "VINCE_SIGNAL_AGGREGATOR_SERVICE",
    ) as VinceSignalAggregatorService | null;
  }

  private getMarketData(): VinceMarketDataService | null {
    return this.runtime.getService(
      "VINCE_MARKET_DATA_SERVICE",
    ) as VinceMarketDataService | null;
  }

  private getCoinGlass(): VinceCoinGlassService | null {
    return this.runtime.getService(
      "VINCE_COINGLASS_SERVICE",
    ) as VinceCoinGlassService | null;
  }

  private getMarketRegime(): VinceMarketRegimeService | null {
    return this.runtime.getService(
      "VINCE_MARKET_REGIME_SERVICE",
    ) as VinceMarketRegimeService | null;
  }

  // V4: ML Services
  private getFeatureStore(): VinceFeatureStoreService | null {
    return this.runtime.getService(
      "VINCE_FEATURE_STORE_SERVICE",
    ) as VinceFeatureStoreService | null;
  }

  private getWeightBandit(): VinceWeightBanditService | null {
    return this.runtime.getService(
      "VINCE_WEIGHT_BANDIT_SERVICE",
    ) as VinceWeightBanditService | null;
  }

  private getSignalSimilarity(): VinceSignalSimilarityService | null {
    return this.runtime.getService(
      "VINCE_SIGNAL_SIMILARITY_SERVICE",
    ) as VinceSignalSimilarityService | null;
  }

  private getNewsSentiment(): VinceNewsSentimentService | null {
    return this.runtime.getService(
      "VINCE_NEWS_SENTIMENT_SERVICE",
    ) as VinceNewsSentimentService | null;
  }

  /**
   * Max leverage cap for an asset. For HIP-3 assets uses Hyperliquid meta when
   * available (VinceHIP3Service.getMaxLeverageForAsset), else getAssetMaxLeverage.
   */
  private async getMaxLeverageCap(asset: string): Promise<number> {
    const hip3 = this.runtime.getService("VINCE_HIP3_SERVICE") as {
      getMaxLeverageForAsset?(s: string): Promise<number | null>;
    } | null;
    if (
      hip3?.getMaxLeverageForAsset &&
      (HIP3_ASSETS as readonly string[]).includes(asset.toUpperCase())
    ) {
      try {
        const hl = await hip3.getMaxLeverageForAsset(asset);
        if (typeof hl === "number") return hl;
      } catch (_) {
        // fall through to static cap
      }
    }
    return getAssetMaxLeverage(asset);
  }

  /** TP multipliers to use (fast_tp = 1R,2R,3R for more closed trades; else improvement report or default). */
  private getTPMultipliersForReport(): number[] {
    const fastTp =
      this.runtime.getSetting?.("vince_paper_fast_tp") === true ||
      this.runtime.getSetting?.("vince_paper_fast_tp") === "true";
    if (fastTp) {
      return [...TAKE_PROFIT_TARGETS_FAST_TP];
    }
    const ml = this.runtime.getService(
      "VINCE_ML_INFERENCE_SERVICE",
    ) as VinceMLInferenceService | null;
    const indices = (
      ml as { getTPLevelIndicesToUse?: () => number[] }
    )?.getTPLevelIndicesToUse?.() ?? [0, 1, 2];
    const mults = indices
      .map((i) => DEFAULT_TAKE_PROFIT_TARGETS[i])
      .filter((m): m is number => m != null);
    return mults.length > 0 ? mults : [...DEFAULT_TAKE_PROFIT_TARGETS];
  }

  // ==========================================
  // Win-Streak Position Sizing
  // ==========================================

  /**
   * Record trade outcome for streak tracking
   */
  recordTradeOutcome(isWin: boolean): void {
    this.recentTradeOutcomes.push(isWin);

    // Keep only last 5 trades
    if (this.recentTradeOutcomes.length > this.MAX_STREAK_HISTORY) {
      this.recentTradeOutcomes.shift();
    }

    const streakInfo = this.getStreakInfo();
    logger.debug(
      `[VincePaperTrading] Trade outcome recorded: ${isWin ? "WIN" : "LOSS"} | ` +
        `Recent: ${this.recentTradeOutcomes.map((w) => (w ? "W" : "L")).join("")} | ` +
        `Multiplier: ${streakInfo.multiplier}x`,
    );
  }

  /**
   * Get current streak information and size multiplier
   *
   * Returns:
   * - 1.2x for 3+ consecutive wins (confidence boost)
   * - 0.7x for 3+ consecutive losses (risk reduction)
   * - 1.0x otherwise
   */
  getStreakInfo(): {
    consecutiveWins: number;
    consecutiveLosses: number;
    multiplier: number;
    reason?: string;
  } {
    if (this.recentTradeOutcomes.length === 0) {
      return { consecutiveWins: 0, consecutiveLosses: 0, multiplier: 1.0 };
    }

    // Count consecutive wins/losses from the end
    let consecutiveWins = 0;
    let consecutiveLosses = 0;

    // Check from most recent
    for (let i = this.recentTradeOutcomes.length - 1; i >= 0; i--) {
      if (this.recentTradeOutcomes[i]) {
        if (consecutiveLosses === 0) {
          consecutiveWins++;
        } else {
          break; // Streak broken
        }
      } else {
        if (consecutiveWins === 0) {
          consecutiveLosses++;
        } else {
          break; // Streak broken
        }
      }
    }

    // Determine multiplier
    let multiplier = 1.0;
    let reason: string | undefined;

    if (consecutiveWins >= 3) {
      multiplier = 1.2;
      reason = `🔥 Win streak (${consecutiveWins}): +20% size`;
    } else if (consecutiveLosses >= 3) {
      multiplier = 0.7;
      reason = `⚠️ Loss streak (${consecutiveLosses}): -30% size`;
    }

    return { consecutiveWins, consecutiveLosses, multiplier, reason };
  }

  // ==========================================
  // Trade Decision Logging
  // ==========================================

  /**
   * Convert AggregatedSignal (from signal aggregator) to AggregatedTradeSignal (full type for logging/validation).
   */
  private toAggregatedTradeSignal(
    signal: AggregatedSignal,
  ): AggregatedTradeSignal {
    const factors = signal.factors ?? [];
    const sources = signal.sources ?? [];
    return {
      asset: signal.asset,
      direction: signal.direction,
      strength: signal.strength,
      confidence: signal.confidence,
      confirmingCount: signal.confirmingCount ?? factors.length,
      conflictingCount: signal.conflictingCount ?? 0,
      supportingReasons: signal.supportingFactors,
      conflictingReasons: signal.conflictingFactors,
      signals: factors.map((f, i) => ({
        source: sources[i] ?? sources[0] ?? "signal_aggregator",
        direction: signal.direction,
        strength: signal.strength,
        description: f,
      })),
      reasons: factors,
      sourceBreakdown: (sources.length
        ? sources.reduce(
            (acc, src) => {
              const k = src as keyof AggregatedTradeSignal["sourceBreakdown"];
              (acc as Record<string, { count: number; avgStrength: number }>)[
                k
              ] = {
                count:
                  ((
                    acc as Record<
                      string,
                      { count: number; avgStrength: number }
                    >
                  )[k]?.count ?? 0) + 1,
                avgStrength: signal.strength,
              };
              return acc;
            },
            {} as AggregatedTradeSignal["sourceBreakdown"],
          )
        : {}) as AggregatedTradeSignal["sourceBreakdown"],
      timestamp: signal.timestamp,
      session: (signal as { session?: string }).session,
    };
  }

  /**
   * Log why a signal was rejected (didn't meet thresholds)
   */
  private logSignalRejection(
    asset: string,
    signal: AggregatedTradeSignal,
    reason: string,
  ): void {
    const now = Date.now();

    // Get base thresholds from risk manager
    const riskManager = this.getRiskManager();
    const limits = riskManager?.getLimits();
    let minStrength = limits?.minSignalStrength ?? 60;
    let minConfidence = limits?.minSignalConfidence ?? 60;
    // HIP-3 and HYPE have fewer signal sources; primary source gate ensures quality
    const isCoreForConfirming = (CORE_ASSETS as readonly string[]).includes(
      asset,
    );
    const minConfirming = !isCoreForConfirming
      ? 1
      : (limits?.minConfirmingSignals ?? 3);

    // When rejection was due to ML "report suggestion", show that stricter bar so the box matches reality
    const usedReportSuggestion = reason.includes("report suggestion");
    if (usedReportSuggestion) {
      const mlService = this.runtime.getService(
        "VINCE_ML_INFERENCE_SERVICE",
      ) as {
        getSuggestedMinStrength?: () => number | null;
        getSuggestedMinConfidence?: () => number | null;
      } | null;
      if (mlService) {
        const reportStr = mlService.getSuggestedMinStrength?.();
        const reportConf = mlService.getSuggestedMinConfidence?.();
        if (typeof reportStr === "number") minStrength = reportStr;
        if (typeof reportConf === "number") minConfidence = reportConf;
      }
    }

    const contributingSources = signal.sourceBreakdown
      ? Object.keys(signal.sourceBreakdown)
      : [];
    // Always store for dashboard (every no-trade is a decision we want to see)
    this.recentNoTrades.push({
      asset,
      direction: signal.direction,
      reason,
      strength: signal.strength,
      confidence: signal.confidence,
      confirmingCount: signal.confirmingCount ?? 0,
      minStrength,
      minConfidence,
      minConfirming,
      timestamp: now,
      contributingSources,
    });
    if (
      this.recentNoTrades.length > VincePaperTradingService.MAX_RECENT_NO_TRADES
    ) {
      this.recentNoTrades.shift();
    }

    // Rate limit terminal log only: once per asset per 5 minutes (dashboard already has the data)
    const cacheKey = `signal_reject_${asset}`;
    const lastLog = this.lastRejectionLog.get(cacheKey);
    if (lastLog && now - lastLog < 5 * 60 * 1000) {
      return;
    }
    this.lastRejectionLog.set(cacheKey, now);

    const dirIcon =
      signal.direction === "long"
        ? "🟢"
        : signal.direction === "short"
          ? "🔴"
          : "⚪";
    const strengthBar = this.createProgressBar(signal.strength, minStrength);
    const confidenceBar = this.createProgressBar(
      signal.confidence,
      minConfidence,
    );
    const suggLabel = usedReportSuggestion ? " (ML)" : "";

    logger.debug(
      `[VincePaperTrading] Signal evaluated – no trade: ${asset} ${signal.direction} | str ${signal.strength.toFixed(0)}% conf ${signal.confidence.toFixed(0)}% | ${reason.substring(0, 50)}`,
    );
  }

  /**
   * Log why a trade was rejected by risk manager
   */
  private logTradeRejection(
    asset: string,
    direction: "long" | "short",
    reason: string,
  ): void {
    const dirIcon = direction === "long" ? "🟢" : "🔴";

    logger.debug(
      `[VincePaperTrading] Trade blocked: ${asset} ${direction} | ${reason.substring(0, 60)}`,
    );
  }

  /** Optional LLM entry gate: approve or veto a single candidate. On timeout/error returns true (proceed). */
  private static readonly ENTRY_GATE_TIMEOUT_MS = 10_000;

  private async runEntryGate(
    asset: string,
    direction: "long" | "short",
    sizeUsd: number,
    signal: AggregatedTradeSignal,
    regime: MarketRegime | null,
  ): Promise<boolean> {
    const topSources =
      Object.keys(signal.sourceBreakdown ?? {})
        .slice(0, 5)
        .join(", ") || "—";
    const regimeStr = regime?.regime ?? "unknown";
    const prompt = `You are a paper-trade entry gate. One candidate only. Reply with exactly one line: APPROVE or VETO, then a short reason.

Candidate: ${asset} ${direction.toUpperCase()} | size $${sizeUsd.toFixed(0)} | strength ${signal.strength}% confidence ${signal.confidence}% | regime ${regimeStr} | sources ${topSources}.

Reply format: APPROVE reason or VETO reason`;

    try {
      const result = await Promise.race([
        this.runtime.useModel(ModelType.TEXT_SMALL, { prompt }),
        new Promise<string>((_, rej) =>
          setTimeout(
            () => rej(new Error("entry gate timeout")),
            VincePaperTradingService.ENTRY_GATE_TIMEOUT_MS,
          ),
        ),
      ]);
      const line = (typeof result === "string" ? result : String(result))
        .trim()
        .toUpperCase();
      if (line.startsWith("VETO")) {
        return false;
      }
      return true;
    } catch (e) {
      logger.debug(
        `[VincePaperTrading] Entry gate fallback (proceed): ${(e as Error).message}`,
      );
      return true;
    }
  }

  /**
   * Create a simple ASCII progress bar
   */
  private createProgressBar(value: number, threshold: number): string {
    const width = 20;
    const filled = Math.min(width, Math.round((value / 100) * width));
    const thresholdPos = Math.round((threshold / 100) * width);

    let bar = "";
    for (let i = 0; i < width; i++) {
      if (i < filled) {
        bar += value >= threshold ? "█" : "▓";
      } else if (i === thresholdPos) {
        bar += "│";
      } else {
        bar += "░";
      }
    }
    return `[${bar}]`;
  }

  // Track last rejection log time per asset to avoid spam
  private lastRejectionLog: Map<string, number> = new Map();
  /** Rate limit for recording avoided decisions (once per asset per 2 min) so we keep learning without flooding the store */
  private static readonly AVOIDED_RECORD_INTERVAL_MS = 2 * 60 * 1000;
  private lastAvoidedRecord: Map<string, number> = new Map();

  /** Recent "signal evaluated - no trade" entries for dashboard (bounded) */
  private static readonly MAX_RECENT_NO_TRADES = 100;
  private recentNoTrades: Array<{
    asset: string;
    direction: string;
    reason: string;
    strength: number;
    confidence: number;
    confirmingCount: number;
    minStrength: number;
    minConfidence: number;
    minConfirming: number;
    timestamp: number;
    contributingSources?: string[];
  }> = [];

  /** Return recent no-trade evaluations for the dashboard */
  getRecentNoTradeEvaluations(): Array<{
    asset: string;
    direction: string;
    reason: string;
    strength: number;
    confidence: number;
    confirmingCount: number;
    minStrength: number;
    minConfidence: number;
    minConfirming: number;
    timestamp: number;
    contributingSources?: string[];
  }> {
    return [...this.recentNoTrades];
  }

  /** Recent closed trades (contributingSources only) for dashboard "X contributed to N of K" */
  private static readonly MAX_RECENT_CLOSED_TRADES = 50;
  private recentClosedTrades: Array<{ contributingSources?: string[] }> = [];

  getRecentClosedTrades(): Array<{ contributingSources?: string[] }> {
    return [...this.recentClosedTrades];
  }

  /** Recent "recorded data / ML influenced the algo" events for dashboard (bounded) */
  private static readonly MAX_RECENT_ML_INFLUENCES = 80;
  private recentMLInfluences: Array<{
    type: "reject" | "open";
    asset: string;
    message: string;
    timestamp: number;
  }> = [];

  /** Return recent ML/influence events for the dashboard */
  getRecentMLInfluences(): Array<{
    type: "reject" | "open";
    asset: string;
    message: string;
    timestamp: number;
  }> {
    return [...this.recentMLInfluences];
  }

  private pushMLInfluence(
    type: "reject" | "open",
    asset: string,
    message: string,
  ): void {
    this.recentMLInfluences.push({
      type,
      asset,
      message,
      timestamp: Date.now(),
    });
    if (
      this.recentMLInfluences.length >
      VincePaperTradingService.MAX_RECENT_ML_INFLUENCES
    ) {
      this.recentMLInfluences.shift();
    }
  }

  /**
   * Record an evaluated-but-no-trade decision in the feature store so ML can learn from avoid decisions
   * (e.g. on extreme days when no trades are taken). Rate-limited per asset.
   */
  private async recordAvoidedDecisionIfNeeded(
    asset: string,
    signal: AggregatedSignal,
    reason: string,
  ): Promise<void> {
    const now = Date.now();
    const last = this.lastAvoidedRecord.get(asset);
    if (
      last != null &&
      now - last < VincePaperTradingService.AVOIDED_RECORD_INTERVAL_MS
    ) {
      return;
    }
    this.lastAvoidedRecord.set(asset, now);
    const featureStore =
      this.getFeatureStore() as VinceFeatureStoreService | null;
    if (
      !featureStore ||
      typeof featureStore.recordAvoidedDecision !== "function"
    )
      return;
    try {
      await featureStore.recordAvoidedDecision({ asset, signal, reason });
    } catch (e) {
      logger.debug(`[VincePaperTrading] recordAvoidedDecision failed: ${e}`);
    }
  }

  // ==========================================
  // Order Simulation
  // ==========================================

  simulateOrder(params: {
    asset: string;
    side: "buy" | "sell";
    sizeUsd: number;
    type: "market" | "limit";
    limitPrice?: number;
  }): SimulatedOrder {
    const { asset, side, sizeUsd, type, limitPrice } = params;

    const order: SimulatedOrder = {
      id: uuidv4(),
      asset,
      type,
      side,
      sizeUsd,
      limitPrice,
      status: "pending",
      createdAt: Date.now(),
    };

    // For market orders, execute immediately with slippage
    if (type === "market") {
      const marketData = this.getMarketData();
      const currentPrice = marketData
        ? (marketData as any).getCurrentPrice?.(asset)
        : null;

      if (currentPrice) {
        // Calculate slippage
        const slippageBps = this.calculateSlippage(sizeUsd);
        const slippageMultiplier =
          side === "buy" ? 1 + slippageBps / 10000 : 1 - slippageBps / 10000;
        const executedPrice = currentPrice * slippageMultiplier;

        // Calculate fees
        const feesBps = FEES.TAKER_BPS;
        const fees = (sizeUsd * feesBps) / 10000;

        order.executedPrice = executedPrice;
        order.slippage = slippageBps;
        order.fees = fees;
        order.status = "filled";
        order.executedAt = Date.now();
      } else {
        order.status = "rejected";
        order.rejectReason = "Could not get current price";
      }
    }

    return order;
  }

  private calculateSlippage(
    sizeUsd: number,
    bidAskSpread?: number | null,
  ): number {
    // Dynamic slippage: use actual bid-ask spread when available, fallback to static base
    let slippageBps: number;
    if (bidAskSpread != null && bidAskSpread > 0) {
      // Half-spread as base slippage (in bps)
      slippageBps = (bidAskSpread / 2) * 10000;
    } else {
      slippageBps = SLIPPAGE.BASE_BPS;
    }

    // Add size impact (2 bps per $10k)
    slippageBps +=
      Math.floor(sizeUsd / 10000) * SLIPPAGE.SIZE_IMPACT_BPS_PER_10K;

    // Cap at maximum
    return Math.min(slippageBps, SLIPPAGE.MAX_BPS);
  }

  // ==========================================
  // Trade Execution
  // ==========================================

  private getWttPickPath(): string {
    const base = process.env.STANDUP_DELIVERABLES_DIR?.trim()
      ? path.join(process.cwd(), process.env.STANDUP_DELIVERABLES_DIR)
      : path.join(process.cwd(), "docs", "standup");
    const dateStr = new Date().toISOString().slice(0, 10);
    return path.join(
      base,
      "whats-the-trade",
      `${dateStr}-whats-the-trade.json`,
    );
  }

  private getWttTradedTodayPath(): string {
    if (!this.persistenceDir) {
      return path.join(
        process.cwd(),
        ".elizadb",
        PERSISTENCE_DIR,
        "wtt-traded-today.json",
      );
    }
    return path.join(this.persistenceDir, "wtt-traded-today.json");
  }

  private loadWttTradedToday(): void {
    try {
      const filepath = this.getWttTradedTodayPath();
      if (fs.existsSync(filepath)) {
        const raw = fs.readFileSync(filepath, "utf-8");
        const data = JSON.parse(raw) as { date: string; asset: string };
        if (data?.date && data?.asset) {
          this.wttTradedToday = { date: data.date, asset: data.asset };
        }
      }
    } catch {
      // Non-fatal
    }
  }

  private async persistWttTradedToday(): Promise<void> {
    if (!this.wttTradedToday || !this.persistenceDir) return;
    try {
      const filepath = this.getWttTradedTodayPath();
      await fs.promises.writeFile(
        filepath,
        JSON.stringify(this.wttTradedToday, null, 2),
      );
    } catch (e) {
      logger.debug(
        `[VincePaperTrading] Failed to persist WTT traded today: ${e}`,
      );
    }
  }

  private async readLatestWttPick(): Promise<WttPickJson | null> {
    try {
      const filepath = this.getWttPickPath();
      const raw = await fs.promises.readFile(filepath, "utf-8");
      const parsed = JSON.parse(raw) as WttPickJson;
      if (parsed?.primaryTicker && parsed?.rubric) return parsed;
    } catch {
      // No file or invalid JSON
    }
    return null;
  }

  /**
   * Append a WTT pick to the JSONL history (ML training data).
   * Records every pick regardless of whether a trade was opened.
   */
  private async appendWttPickJsonl(
    pick: WttPickJson,
    outcome: "traded" | "rejected" | "skipped",
    reason?: string,
  ): Promise<void> {
    try {
      const dir = path.join(process.cwd(), ".elizadb", "vince-paper-bot");
      await fs.promises.mkdir(dir, { recursive: true });
      const filepath = path.join(dir, "wtt-picks.jsonl");
      const row = {
        ts: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        primaryTicker: pick.primaryTicker,
        altTicker: pick.altTicker ?? null,
        direction: pick.primaryDirection,
        instrument: pick.primaryInstrument,
        entryPrice: pick.primaryEntryPrice ?? null,
        riskUsd: pick.primaryRiskUsd ?? null,
        thesis: pick.thesis,
        rubric: pick.rubric,
        invalidateCondition: pick.invalidateCondition ?? null,
        evThresholdPct: pick.evThresholdPct ?? null,
        outcome,
        rejectReason: reason ?? null,
      };
      await fs.promises.appendFile(filepath, JSON.stringify(row) + "\n");
    } catch (e) {
      logger.debug(`[VincePaperTrading] Failed to append WTT JSONL: ${e}`);
    }
  }

  /**
   * Append a skipped row when no valid WTT pick was available (missing or invalid JSON).
   * Keeps ML history consistent so we have a record of days with no pick.
   */
  private async appendWttPickSkippedNoPick(reason: string): Promise<void> {
    try {
      const dir = path.join(process.cwd(), ".elizadb", "vince-paper-bot");
      await fs.promises.mkdir(dir, { recursive: true });
      const filepath = path.join(dir, "wtt-picks.jsonl");
      const row = {
        ts: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        primaryTicker: null,
        altTicker: null,
        direction: null,
        instrument: null,
        entryPrice: null,
        riskUsd: null,
        thesis: null,
        rubric: null,
        invalidateCondition: null,
        evThresholdPct: null,
        outcome: "skipped" as const,
        rejectReason: reason,
      };
      await fs.promises.appendFile(filepath, JSON.stringify(row) + "\n");
    } catch (e) {
      logger.debug(
        `[VincePaperTrading] Failed to append WTT skipped-no-pick JSONL: ${e}`,
      );
    }
  }

  /**
   * If WTT is enabled, read today's pick and open a paper trade if the primary (or alt) is perp/HIP-3 eligible.
   * Called before the regular signal loop so WTT gets first shot at the asset.
   * Every pick is appended to wtt-picks.jsonl for ML regardless of outcome.
   */
  private async evaluateWttPick(): Promise<boolean> {
    const pick = await this.readLatestWttPick();
    if (!pick) {
      const today = new Date().toISOString().slice(0, 10);
      if (this.lastNoWttLogDate !== today) {
        this.lastNoWttLogDate = today;
        logger.info(
          "[VincePaperTrading] No WTT pick for today (missing or invalid JSON); skipping WTT evaluation",
        );
      } else {
        logger.debug(
          "[VincePaperTrading] No WTT pick for today (missing or invalid JSON); skipping WTT evaluation",
        );
      }
      await this.appendWttPickSkippedNoPick("no_valid_pick");
      return false;
    }

    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();
    const marketData = this.getMarketData();
    if (!positionManager || !riskManager || !marketData) {
      await this.appendWttPickJsonl(pick, "skipped", "missing services");
      return false;
    }

    const asset =
      normalizeWttTicker(pick.primaryTicker) ??
      normalizeWttTicker(pick.altTicker ?? "");
    if (!asset) {
      await this.appendWttPickJsonl(pick, "skipped", "ticker not in universe");
      return false;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (
      this.wttTradedToday?.date === today &&
      this.wttTradedToday?.asset === asset
    ) {
      if (this.lastWttAlreadyTradedLogDate !== today) {
        this.lastWttAlreadyTradedLogDate = today;
        logger.info(
          `[VincePaperTrading] WTT already traded today (${asset}); skipping`,
        );
      }
      return false;
    }

    if (positionManager.hasOpenPosition(asset) || this.hasPendingEntry(asset)) {
      await this.appendWttPickJsonl(pick, "skipped", `already in ${asset}`);
      return false;
    }

    const { strength, confidence } = wttRubricToSignal(pick.rubric);
    // WTT is a curated daily thesis — set confirmingCount high enough to
    // pass the risk manager's gate (rubric already encodes signal quality).
    const confirmingCount = Math.max(
      3,
      strength >= 80 && confidence >= 80 ? 3 : 2,
    );
    const tradeSignal: AggregatedTradeSignal = {
      asset,
      direction: pick.primaryDirection,
      strength,
      confidence,
      confirmingCount,
      conflictingCount: 0,
      signals: [
        {
          source: "wtt",
          direction: pick.primaryDirection,
          strength,
          description: pick.thesis,
        },
      ],
      reasons: [pick.thesis],
      sourceBreakdown: { wtt: { count: 1, avgStrength: strength } },
      timestamp: Date.now(),
    };

    const signalValidation = riskManager.validateSignal(tradeSignal);
    if (!signalValidation.valid) {
      logger.debug(
        `[VincePaperTrading] WTT pick ${asset} rejected: ${signalValidation.reason}`,
      );
      await this.appendWttPickJsonl(pick, "rejected", signalValidation.reason);
      return false;
    }

    const portfolio = positionManager.getPortfolio();
    const cap = await this.getMaxLeverageCap(asset);
    const leverage = Math.min(DEFAULT_LEVERAGE, cap);
    const sizeUsd = Math.min(
      portfolio.totalValue * 0.05,
      portfolio.totalValue * 0.1,
    );
    const position = await this.openTrade({
      asset,
      direction: pick.primaryDirection,
      sizeUsd,
      leverage,
      signal: tradeSignal,
    });
    if (!position) {
      await this.appendWttPickJsonl(pick, "rejected", "openTrade failed");
      return false;
    }

    this.wttTradedToday = { date: today, asset };
    await this.persistWttTradedToday();

    // Store WTT thesis and invalidate condition for WHY THIS TRADE (explainer + notifications)
    position.metadata = {
      ...position.metadata,
      wttThesis: pick.thesis,
      wttInvalidateCondition: pick.invalidateCondition ?? undefined,
    };

    const wttBlock = wttPickToWttBlock({
      primary: true,
      ticker: pick.primaryTicker,
      thesis: pick.thesis,
      rubric: pick.rubric,
      invalidateCondition: pick.invalidateCondition || undefined,
      evThresholdPct: pick.evThresholdPct,
    });
    await this.recordMLFeatures(position, tradeSignal, undefined, wttBlock);
    await this.appendWttPickJsonl(pick, "traded");

    // Rename pick file so it's not re-evaluated on the next loop cycle
    try {
      const pickPath = this.getWttPickPath();
      await fs.promises.rename(
        pickPath,
        pickPath.replace(".json", ".traded.json"),
      );
    } catch {
      // non-fatal: file may already be gone
    }

    logger.info(
      `[VincePaperTrading] WTT trade opened: ${pick.primaryDirection} ${asset}`,
    );
    return true;
  }

  async evaluateAndTrade(): Promise<void> {
    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();
    const signalAggregator = this.getSignalAggregator();
    const marketData = this.getMarketData();

    if (!positionManager || !riskManager || !signalAggregator) {
      return;
    }

    // First, check pending entries for pullbacks
    await this.checkPendingEntries();

    // WTT: if enabled, try to open today's pick first (perp/HIP-3 eligible only)
    if (isWttEnabled(this.runtime)) await this.evaluateWttPick();

    const assets = getPaperTradeAssets(this.runtime);
    for (const asset of assets) {
      try {
        // Skip if we already have a position in this asset
        if (positionManager.hasOpenPosition(asset)) {
          continue;
        }

        // Skip if we already have a pending entry for this asset
        if (this.hasPendingEntry(asset)) {
          continue;
        }

        // Get aggregated signal
        const signal = await signalAggregator.getSignal(asset);
        if (!signal) continue;

        // HIP-3 diagnostics: log signal for non-core assets so we can see why trades aren't opening
        const isHip3Asset = !(CORE_ASSETS as readonly string[]).includes(asset);
        if (
          isHip3Asset &&
          signal.direction !== "neutral" &&
          signal.strength > 20
        ) {
          logger.info(
            `[VincePaperTrading] HIP-3 signal: ${asset} ${signal.direction} | str=${signal.strength.toFixed(0)} conf=${signal.confidence.toFixed(0)} confirm=${signal.confirmingCount} | sources=${(signal.sources ?? []).join(",")}`,
          );
        }

        // Block trade when ML quality is below trained threshold (fewer low-quality trades)
        // Skip for HIP-3: models trained on BTC/ETH/SOL/HYPE only — applying to HIP-3 would reject unfamiliar patterns
        const mlService = this.runtime.getService(
          "VINCE_ML_INFERENCE_SERVICE",
        ) as VinceMLInferenceService | null;
        if (
          !isHip3Asset &&
          mlService &&
          typeof (signal as AggregatedSignal).mlQualityScore === "number"
        ) {
          const threshold =
            typeof (mlService as { getSignalQualityThreshold?: () => number })
              .getSignalQualityThreshold === "function"
              ? (
                  mlService as { getSignalQualityThreshold: () => number }
                ).getSignalQualityThreshold()
              : null;
          if (
            threshold != null &&
            (signal as AggregatedSignal).mlQualityScore! < threshold
          ) {
            if (signal.direction !== "neutral" && signal.strength > 30) {
              const reason = `ML quality ${((signal as AggregatedSignal).mlQualityScore! * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%`;
              this.pushMLInfluence("reject", asset, reason);
              this.logSignalRejection(
                asset,
                this.toAggregatedTradeSignal(signal),
                reason,
              );
              void this.recordAvoidedDecisionIfNeeded(
                asset,
                signal as AggregatedSignal,
                reason,
              );
            }
            continue;
          }
        }

        // Improvement report: optional min strength / min confidence (when suggested_tuning is in training_metadata).
        // In aggressive mode OR for HIP-3 assets we skip this so we take more trades for ML data.
        const aggressiveMode =
          isHip3Asset ||
          this.runtime.getSetting?.("vince_paper_aggressive") === true ||
          this.runtime.getSetting?.("vince_paper_aggressive") === "true";
        if (mlService && !aggressiveMode) {
          const minStr = (
            mlService as { getSuggestedMinStrength?: () => number | null }
          ).getSuggestedMinStrength?.();
          const minConf = (
            mlService as { getSuggestedMinConfidence?: () => number | null }
          ).getSuggestedMinConfidence?.();
          if (
            typeof minStr === "number" &&
            signal.strength < minStr &&
            signal.direction !== "neutral" &&
            signal.strength > 30
          ) {
            const reason = `Strength ${signal.strength.toFixed(0)}% below report suggestion ${minStr}%`;
            this.pushMLInfluence("reject", asset, reason);
            this.logSignalRejection(
              asset,
              this.toAggregatedTradeSignal(signal),
              reason,
            );
            void this.recordAvoidedDecisionIfNeeded(
              asset,
              signal as AggregatedSignal,
              reason,
            );
            continue;
          }
          if (
            typeof minConf === "number" &&
            signal.confidence < minConf &&
            signal.direction !== "neutral" &&
            signal.strength > 30
          ) {
            const reason = `Confidence ${signal.confidence.toFixed(0)}% below report suggestion ${minConf}%`;
            this.pushMLInfluence("reject", asset, reason);
            this.logSignalRejection(
              asset,
              this.toAggregatedTradeSignal(signal),
              reason,
            );
            void this.recordAvoidedDecisionIfNeeded(
              asset,
              signal as AggregatedSignal,
              reason,
            );
            continue;
          }
        }

        // Hard-filter when similarity says "avoid" (ALGO_ML_IMPROVEMENTS #5)
        // Skip for HIP-3: similarity model has no HIP-3 trade history to compare against
        const aggSignal = signal as AggregatedSignal;
        if (
          !isHip3Asset &&
          aggSignal.mlSimilarityPrediction?.recommendation === "avoid"
        ) {
          if (signal.direction !== "neutral" && signal.strength > 30) {
            const reason = `Similar trades suggest AVOID: ${aggSignal.mlSimilarityPrediction.reason}`;
            this.pushMLInfluence("reject", asset, reason);
            this.logSignalRejection(
              asset,
              this.toAggregatedTradeSignal(signal),
              reason,
            );
            void this.recordAvoidedDecisionIfNeeded(
              asset,
              signal as AggregatedSignal,
              reason,
            );
          }
          continue;
        }

        // Extended market snapshot: order-book filter, trend alignment boost, funding reversal (DATA_LEVERAGE)
        const featureStore = this.getFeatureStore();
        let extendedSnapshot: ExtendedSnapshot | null = null;
        if (
          featureStore &&
          typeof featureStore.getExtendedMarketSnapshot === "function"
        ) {
          try {
            extendedSnapshot =
              await featureStore.getExtendedMarketSnapshot(asset);
          } catch (e) {
            logger.debug(`[VincePaperTrading] Extended snapshot skip: ${e}`);
          }
        }
        // In aggressive mode skip book-imbalance filter so we take more trades for ML data
        const bookRejection = aggressiveMode
          ? { reject: false as const }
          : getBookImbalanceRejection(
              { direction: signal.direction, confidence: signal.confidence },
              extendedSnapshot,
              undefined,
            );
        if (bookRejection.reject) {
          const reason = bookRejection.reason!;
          this.logSignalRejection(
            asset,
            this.toAggregatedTradeSignal(signal),
            reason,
          );
          void this.recordAvoidedDecisionIfNeeded(
            asset,
            signal as AggregatedSignal,
            reason,
          );
          continue;
        }
        let fundingRate = 0;
        let volumeRatio = 1.0;
        const mktCtx: MarketContext = {};
        if (marketData) {
          try {
            const ctx = await marketData.getEnrichedContext(asset);
            fundingRate = ctx?.fundingRate ?? 0;
            volumeRatio = ctx?.volumeRatio ?? 1.0;
            mktCtx.volumeRatio = volumeRatio;
            mktCtx.priceChange24h = ctx?.priceChange24h ?? 0;
            mktCtx.currentPrice = ctx?.currentPrice ?? 0;
            mktCtx.dailyOpenPrice =
              (ctx as { dailyOpenPrice?: number })?.dailyOpenPrice ?? undefined;
          } catch (_) {}
        }
        // Fetch OI change from CoinGlass
        const coinglass = this.runtime.getService(
          "VINCE_COINGLASS_SERVICE",
        ) as {
          getOpenInterest?: (
            asset: string,
          ) => { change24h: number | null } | null;
          getFearGreed?: () => { value: number; classification: string } | null;
        } | null;
        try {
          const oi = coinglass?.getOpenInterest?.(asset);
          mktCtx.oiChange24h = oi?.change24h ?? undefined;
        } catch {
          /* non-fatal */
        }
        // Fetch Fear/Greed (used for both confidence and sizing below)
        let fearGreedValue: number | undefined;
        try {
          const fg = coinglass?.getFearGreed?.();
          fearGreedValue = fg?.value ?? undefined;
          mktCtx.fearGreedValue = fearGreedValue;
        } catch {
          /* non-fatal */
        }
        // Fetch RSI
        try {
          const rsi = await (
            marketData as unknown as {
              estimateRSI?: (asset: string) => Promise<number | null>;
            }
          )?.estimateRSI?.(asset);
          mktCtx.rsi = rsi ?? undefined;
        } catch {
          /* non-fatal */
        }
        const adjustedConfidence = getAdjustedConfidence(
          { direction: signal.direction, confidence: signal.confidence },
          extendedSnapshot,
          fundingRate,
          volumeRatio,
          mktCtx,
        );
        if (
          adjustedConfidence > signal.confidence &&
          signal.direction !== "neutral"
        ) {
          logger.debug(
            `[VincePaperTrading] ${asset} extended snapshot confidence boost: ${signal.confidence} -> ${adjustedConfidence}`,
          );
        }

        // Convert to AggregatedTradeSignal format (use adjustedConfidence so SMA20/funding boosts apply)
        // Now using the proper confirmingCount from multi-source aggregation
        const agg = signal as AggregatedSignal;
        const tradeSignal: AggregatedTradeSignal = {
          asset,
          direction: signal.direction,
          strength: signal.strength,
          confidence: adjustedConfidence,
          confirmingCount: signal.confirmingCount ?? signal.factors.length, // Use new field, fallback to factors
          conflictingCount: agg.conflictingCount ?? 0,
          supportingReasons: agg.supportingFactors,
          conflictingReasons: agg.conflictingFactors,
          signals: signal.factors.map((f, i) => ({
            source:
              signal.sources?.[i] || signal.sources?.[0] || "signal_aggregator",
            direction: signal.direction,
            strength: signal.strength,
            description: f,
          })),
          reasons: signal.factors,
          sourceBreakdown:
            signal.sources?.reduce(
              (acc, src) => {
                acc[src] = (acc[src] || 0) + 1;
                return acc;
              },
              {} as Record<string, number>,
            ) || {},
          timestamp: Date.now(),
          session: (signal as { session?: string }).session,
          mlQualityScore: (signal as AggregatedSignal).mlQualityScore,
          openWindowBoost: (signal as AggregatedSignal).openWindowBoost,
        };

        // Log extended market snapshot when available (DATA_LEVERAGE debugging)
        if (extendedSnapshot && signal.direction !== "neutral") {
          logger.debug(
            `[VincePaperTrading] ${asset} extended snapshot: book=${extendedSnapshot.bookImbalance?.toFixed(2) ?? "n/a"} ` +
              `priceVsSma20=${extendedSnapshot.priceVsSma20?.toFixed(1) ?? "n/a"}% ` +
              `fundingDelta=${extendedSnapshot.fundingDelta != null ? (extendedSnapshot.fundingDelta * 100).toFixed(4) + "%" : "n/a"} ` +
              `dvol=${extendedSnapshot.dvol?.toFixed(0) ?? "n/a"}`,
          );
        }

        // Signal hierarchy: at least one primary source required (secondary-only cannot open)
        const contributingSources = Object.keys(
          tradeSignal.sourceBreakdown ?? {},
        );
        const hasPrimary = contributingSources.some((s) =>
          PRIMARY_SIGNAL_SOURCES.has(s),
        );
        if (!hasPrimary && contributingSources.length > 0) {
          if (isHip3Asset) {
            logger.info(
              `[VincePaperTrading] ${asset} skipped: no primary signal (contributing: ${contributingSources.join(", ")})`,
            );
          } else {
            logger.debug(
              `[VincePaperTrading] ${asset} skipped: no primary signal (contributing: ${contributingSources.join(", ")})`,
            );
          }
          continue;
        }

        // Validate signal
        const signalValidation = riskManager.validateSignal(tradeSignal);
        if (!signalValidation.valid) {
          // Log WHY signal was rejected (only for meaningful signals, not neutral)
          if (signal.direction !== "neutral" && signal.strength > 30) {
            const reason = signalValidation.reason || "threshold not met";
            this.logSignalRejection(asset, tradeSignal, reason);
            void this.recordAvoidedDecisionIfNeeded(
              asset,
              signal as AggregatedSignal,
              reason,
            );
          }
          continue;
        }

        if (isHip3Asset) {
          logger.info(
            `[VincePaperTrading] HIP-3 trade passing validation: ${asset} ${signal.direction} str=${signal.strength.toFixed(0)} conf=${signal.confidence.toFixed(0)}`,
          );
        }

        // Calculate position size
        const portfolio = positionManager.getPortfolio();
        const aggressive =
          this.runtime.getSetting?.("vince_paper_aggressive") === true ||
          this.runtime.getSetting?.("vince_paper_aggressive") === "true";
        // Asset-specific max leverage: BTC 40x, SOL/ETH/HYPE 10x; HIP-3 from HL or 5x
        const baseLeverage = aggressive
          ? AGGRESSIVE_LEVERAGE
          : DEFAULT_LEVERAGE;
        const cap = await this.getMaxLeverageCap(asset);
        const leverage = Math.min(baseLeverage, cap);
        let baseSizeUsd = aggressive
          ? portfolio.totalValue >= AGGRESSIVE_MARGIN_USD
            ? AGGRESSIVE_MARGIN_USD * leverage
            : portfolio.totalValue * (AGGRESSIVE_BASE_SIZE_PCT / 100)
          : portfolio.totalValue * 0.05;
        if (
          aggressive &&
          baseSizeUsd >
            portfolio.totalValue *
              (AGGRESSIVE_RISK_LIMITS.maxPositionSizePct / 100)
        ) {
          baseSizeUsd =
            portfolio.totalValue *
            (AGGRESSIVE_RISK_LIMITS.maxPositionSizePct / 100);
        }

        // Apply correlation filter (reduce size for correlated positions)
        const correlationResult = riskManager.getCorrelationSizeMultiplier(
          asset,
          signal.direction as "long" | "short",
          positionManager.getOpenPositions(),
        );
        baseSizeUsd = baseSizeUsd * correlationResult.multiplier;
        if (correlationResult.reason) {
          logger.debug(
            `[VincePaperTrading] ${asset}: ${correlationResult.reason}`,
          );
        }

        // Mode controller: conservative 0.8x, balanced 1.0x, aggressive 1.2x (change VINCE_TRADING_MODE first)
        const modeRiskMult = riskManager.getModeRiskMultiplier?.() ?? 1.0;
        if (modeRiskMult !== 1.0) {
          baseSizeUsd = baseSizeUsd * modeRiskMult;
          logger.debug(
            `[VincePaperTrading] ${asset} mode risk multiplier: ${modeRiskMult}x`,
          );
        }

        // Apply DVOL-adjusted sizing (reduce size in high volatility); prefer extended snapshot when available
        if (asset === "BTC" || asset === "ETH") {
          let dvol: number | null = extendedSnapshot?.dvol ?? null;
          if (dvol === null && marketData)
            dvol = await marketData.getDVOL(asset);
          if (dvol !== null) {
            if (dvol > 85) {
              baseSizeUsd = baseSizeUsd * 0.5;
              logger.debug(
                `[VincePaperTrading] ${asset} DVOL ${dvol.toFixed(0)} (>85): size reduced 50%`,
              );
            } else if (dvol > 70) {
              baseSizeUsd = baseSizeUsd * 0.7;
              logger.debug(
                `[VincePaperTrading] ${asset} DVOL ${dvol.toFixed(0)} (>70): size reduced 30%`,
              );
            }
          }
        }

        // Apply regime-based sizing adjustment
        const regimeService = this.getMarketRegime();
        let regime: MarketRegime | null = null;
        if (regimeService) {
          try {
            regime = await regimeService.getRegime(asset);
            if (regime.positionSizeMultiplier !== 1.0) {
              baseSizeUsd = baseSizeUsd * regime.positionSizeMultiplier;
              logger.debug(
                `[VincePaperTrading] ${asset} regime ${regime.regime}: size ${regime.positionSizeMultiplier}x`,
              );
            }
          } catch (e) {
            logger.debug(
              `[VincePaperTrading] Could not get regime for ${asset}: ${e}`,
            );
          }
        }

        // Volume-based sizing: scale position size based on volume ratio vs 7-day average
        // - Spike (>= 2.0x): moves stick, boost size +20% (confirming momentum)
        // - Elevated (>= 1.5x): above average, slight boost +10%
        // - Normal (0.8-1.5x): no adjustment
        // - Low (< 0.8x): below average, reduce size 20% (lower conviction)
        // - Dead session (< 0.5x): fakeouts likely, reduce size 50%
        if (volumeRatio > 0) {
          if (volumeRatio >= 2.0) {
            baseSizeUsd = baseSizeUsd * 1.2;
            logger.debug(
              `[VincePaperTrading] ${asset} volume spike ${volumeRatio.toFixed(2)}x (>=2.0): size boosted +20%`,
            );
          } else if (volumeRatio >= 1.5) {
            baseSizeUsd = baseSizeUsd * 1.1;
            logger.debug(
              `[VincePaperTrading] ${asset} volume elevated ${volumeRatio.toFixed(2)}x (>=1.5): size boosted +10%`,
            );
          } else if (volumeRatio < 0.5) {
            baseSizeUsd = baseSizeUsd * 0.5;
            logger.debug(
              `[VincePaperTrading] ${asset} dead session ${volumeRatio.toFixed(2)}x (<0.5): size reduced 50%`,
            );
          } else if (volumeRatio < 0.8) {
            baseSizeUsd = baseSizeUsd * 0.8;
            logger.debug(
              `[VincePaperTrading] ${asset} low volume ${volumeRatio.toFixed(2)}x (<0.8): size reduced 20%`,
            );
          }
        }

        // Fear/Greed contrarian sizing: size up on extreme fear (buy fear), size down on extreme greed (crowded)
        if (fearGreedValue != null && signal.direction !== "neutral") {
          if (fearGreedValue < 20 && signal.direction === "long") {
            baseSizeUsd *= 1.3;
            logger.debug(
              `[VincePaperTrading] ${asset} extreme fear (${fearGreedValue}) + long: size +30% (contrarian)`,
            );
          } else if (fearGreedValue < 35 && signal.direction === "long") {
            baseSizeUsd *= 1.15;
            logger.debug(
              `[VincePaperTrading] ${asset} fear (${fearGreedValue}) + long: size +15%`,
            );
          } else if (fearGreedValue > 80 && signal.direction === "long") {
            baseSizeUsd *= 0.7;
            logger.debug(
              `[VincePaperTrading] ${asset} extreme greed (${fearGreedValue}) + long: size -30% (crowded)`,
            );
          } else if (fearGreedValue > 80 && signal.direction === "short") {
            baseSizeUsd *= 1.2;
            logger.debug(
              `[VincePaperTrading] ${asset} extreme greed (${fearGreedValue}) + short: size +20% (contrarian)`,
            );
          } else if (fearGreedValue < 20 && signal.direction === "short") {
            baseSizeUsd *= 0.7;
            logger.debug(
              `[VincePaperTrading] ${asset} extreme fear (${fearGreedValue}) + short: size -30% (contrarian)`,
            );
          }
        }

        // Session open timing: reduce size in first 30 min of major sessions (fakeout risk)
        {
          const now = new Date();
          const h = now.getUTCHours();
          const m = now.getUTCMinutes();
          const isNearSessionOpen =
            (h === 0 && m < 30) || // Asia open
            (h === 7 && m < 30) || // EU open
            (h === 13 && m < 30); // US pre-open
          if (isNearSessionOpen) {
            baseSizeUsd *= 0.8;
            logger.debug(
              `[VincePaperTrading] ${asset} near session open (${h}:${m.toString().padStart(2, "0")} UTC): size -20% (fakeout risk)`,
            );
          }
        }

        // Apply session-based sizing (from time modifiers)
        const timeModifiers = riskManager.getTimeModifiers();
        if (timeModifiers.sizeMultiplier !== 1.0) {
          baseSizeUsd = baseSizeUsd * timeModifiers.sizeMultiplier;
          logger.debug(
            `[VincePaperTrading] ${asset} session (${timeModifiers.session.session}): size ${timeModifiers.sizeMultiplier}x`,
          );
        }

        // Apply win-streak sizing adjustment
        const streakInfo = this.getStreakInfo();
        if (streakInfo.multiplier !== 1.0) {
          baseSizeUsd = baseSizeUsd * streakInfo.multiplier;
          if (streakInfo.reason) {
            logger.debug(`[VincePaperTrading] ${asset}: ${streakInfo.reason}`);
          }
        }

        // Context learning: adjust size by historical win-rate per context (marketRegime, vol_regime, session)
        const contextKeys = buildContextBucketKeys(
          regime,
          timeModifiers?.session?.session,
        );
        if (contextKeys.length > 0) {
          const contextMult = getContextAdjustmentMultiplier(contextKeys);
          if (contextMult !== 1.0) {
            baseSizeUsd = baseSizeUsd * contextMult;
            logger.debug(
              `[VincePaperTrading] ${asset} context adjustment: ${contextMult.toFixed(2)}x (${contextKeys.join(", ")})`,
            );
          }
        }

        // ML position sizing: scale base size by model prediction (when model available)
        if (mlService) {
          try {
            const riskState = riskManager.getRiskState?.();
            const drawdownPct = riskState?.currentDrawdownPct ?? 0;
            const lastN = Math.min(20, this.recentTradeOutcomes.length);
            const recentWinRate =
              lastN === 0
                ? 50
                : (this.recentTradeOutcomes.slice(-lastN).filter(Boolean)
                    .length /
                    lastN) *
                  100;
            const volatilityRegime =
              regime?.regime === "volatile"
                ? 2
                : regime?.regime === "neutral"
                  ? 0
                  : 1;
            const positionInput: PositionSizingInput = {
              signalQualityScore:
                (signal as AggregatedSignal).mlQualityScore ?? 0.5,
              strength: signal.strength,
              confidence: signal.confidence,
              volatilityRegime,
              currentDrawdown: drawdownPct,
              recentWinRate,
              streakMultiplier: streakInfo.multiplier,
            };
            const sizePred = await mlService.predictPositionSize(positionInput);
            const mlMultiplier = Math.max(0.5, Math.min(2.0, sizePred.value));
            baseSizeUsd = baseSizeUsd * mlMultiplier;
            if (mlMultiplier !== 1.0) {
              logger.debug(
                `[VincePaperTrading] ${asset} ML position sizing: ${mlMultiplier.toFixed(2)}x (quality=${(positionInput.signalQualityScore * 100).toFixed(0)}% winRate=${recentWinRate.toFixed(0)}%)`,
              );
            }
          } catch (e) {
            logger.debug(`[VincePaperTrading] ML position sizing skip: ${e}`);
          }
        }

        // Validate trade
        const tradeValidation = riskManager.validateTrade({
          sizeUsd: baseSizeUsd,
          leverage,
          portfolioValue: portfolio.totalValue,
          currentExposure: positionManager.getCurrentExposure(),
        });

        if (!tradeValidation.valid) {
          // Log WHY trade was rejected by risk manager
          this.logTradeRejection(
            asset,
            signal.direction as "long" | "short",
            tradeValidation.reason || "risk check failed",
          );
          continue;
        }

        const finalSize = tradeValidation.adjustedSize || baseSizeUsd;

        // Optional LLM entry gate: approve/veto before opening (on timeout/error → proceed)
        const entryGateEnabled =
          this.runtime.getSetting?.("vince_entry_gate_enabled") === true ||
          this.runtime.getSetting?.("vince_entry_gate_enabled") === "true" ||
          process.env.VINCE_ENTRY_GATE_ENABLED === "true";
        if (entryGateEnabled) {
          const proceed = await this.runEntryGate(
            asset,
            signal.direction as "long" | "short",
            finalSize,
            tradeSignal,
            regime,
          );
          if (!proceed) {
            logger.debug(
              `[VincePaperTrading] ${asset} entry gate veto – skipping trade`,
            );
            continue;
          }
        }

        // Get current price
        let currentPrice = 0;
        if (marketData) {
          const ctx = await marketData.getEnrichedContext(asset);
          currentPrice = ctx?.currentPrice || 0;
        }

        // Execute immediately - pullback entries were causing too many missed trades
        await this.openTrade({
          asset,
          direction: signal.direction as "long" | "short",
          sizeUsd: finalSize,
          leverage,
          signal: tradeSignal,
          usedPullbackEntry: false,
          contextBucketKeys: contextKeys.length > 0 ? contextKeys : undefined,
        });
      } catch (error) {
        logger.error(`[VincePaperTrading] Error evaluating ${asset}: ${error}`);
      }
    }
  }

  // ==========================================
  // Pending Entry Management (Pullback Entry)
  // ==========================================

  private hasPendingEntry(asset: string): boolean {
    for (const entry of this.pendingEntries.values()) {
      if (entry.asset === asset) {
        return true;
      }
    }
    return false;
  }

  private createPendingEntry(params: {
    asset: string;
    direction: "long" | "short";
    signal: AggregatedTradeSignal;
    currentPrice: number;
    sizeUsd: number;
    leverage: number;
    isCascadeSignal: boolean;
  }): void {
    const {
      asset,
      direction,
      signal,
      currentPrice,
      sizeUsd,
      leverage,
      isCascadeSignal,
    } = params;

    // Calculate target price (pullback)
    const pullbackPct = PULLBACK_CONFIG.pullbackPct / 100;
    let targetPrice: number;

    if (direction === "long") {
      // For LONG: Wait for price to drop 0.3%
      targetPrice = currentPrice * (1 - pullbackPct);
    } else {
      // For SHORT: Wait for price to rise 0.3%
      targetPrice = currentPrice * (1 + pullbackPct);
    }

    const entry: PendingEntry = {
      id: uuidv4(),
      asset,
      direction,
      signal,
      targetPrice,
      triggerPrice: currentPrice,
      sizeUsd,
      leverage,
      createdAt: Date.now(),
      expiresAt: Date.now() + PULLBACK_CONFIG.timeoutMs,
      isCascadeSignal,
    };

    this.pendingEntries.set(entry.id, entry);

    // Log pending entry with signal context
    const dirIcon = direction === "long" ? "🟢" : "🔴";
    const pullbackDirection = direction === "long" ? "drop" : "rise";

    logger.debug(
      `[VincePaperTrading] Pending ${direction} ${asset}: pullback to $${targetPrice.toFixed(2)} (current $${currentPrice.toFixed(2)}, 5m expiry)`,
    );
  }

  private async checkPendingEntries(): Promise<void> {
    const marketData = this.getMarketData();
    const positionManager = this.getPositionManager();
    const now = Date.now();

    if (!marketData || !positionManager) return;

    for (const [id, entry] of this.pendingEntries) {
      try {
        // Check expiration
        if (now >= entry.expiresAt) {
          this.pendingEntries.delete(id);
          logger.info(
            `[VincePaperTrading] ⏰ Pending ${entry.asset} ${entry.direction} EXPIRED (no pullback)`,
          );
          continue;
        }

        // Check if position already exists (race condition)
        if (positionManager.hasOpenPosition(entry.asset)) {
          this.pendingEntries.delete(id);
          continue;
        }

        // Get current price
        const ctx = await marketData.getEnrichedContext(entry.asset);
        if (!ctx?.currentPrice) continue;

        const currentPrice = ctx.currentPrice;

        // Check if pullback target hit
        let targetHit = false;
        if (entry.direction === "long" && currentPrice <= entry.targetPrice) {
          targetHit = true;
        } else if (
          entry.direction === "short" &&
          currentPrice >= entry.targetPrice
        ) {
          targetHit = true;
        }

        if (targetHit) {
          logger.info(
            `[VincePaperTrading] ✅ Pullback target HIT for ${entry.asset} ${entry.direction}: ` +
              `$${currentPrice.toFixed(2)} (target: $${entry.targetPrice.toFixed(2)})`,
          );

          // Execute the trade at the better price
          await this.openTrade({
            asset: entry.asset,
            direction: entry.direction,
            sizeUsd: entry.sizeUsd,
            leverage: entry.leverage,
            signal: entry.signal,
            usedPullbackEntry: true,
          });

          this.pendingEntries.delete(id);
        }
      } catch (error) {
        logger.error(
          `[VincePaperTrading] Error checking pending entry ${entry.asset}: ${error}`,
        );
        this.pendingEntries.delete(id);
      }
    }
  }

  getPendingEntries(): PendingEntry[] {
    return Array.from(this.pendingEntries.values());
  }

  async openTrade(params: {
    asset: string;
    direction: "long" | "short";
    sizeUsd: number;
    leverage: number;
    signal: AggregatedTradeSignal;
    /** True when fill came from pending pullback target (vs immediate execution). */
    usedPullbackEntry?: boolean;
    /** Context bucket keys for context_adjustment learning (recorded on close). */
    contextBucketKeys?: string[];
  }): Promise<Position | null> {
    const {
      asset,
      direction,
      sizeUsd,
      leverage,
      signal,
      usedPullbackEntry = false,
      contextBucketKeys,
    } = params;

    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();
    const tradeJournal = this.getTradeJournal();
    const marketData = this.getMarketData();

    if (!positionManager || !riskManager) {
      return null;
    }

    // Layer 2: Duplicate position check (no pyramiding; flip = close then enter)
    const existingPosition = positionManager.getPositionByAsset(asset);
    if (existingPosition) {
      if (existingPosition.direction === direction) {
        logger.warn(
          `[VincePaperTrading] DUPLICATE POSITION REJECTED: ${asset} ${direction} (existing position same direction)`,
        );
        return null;
      }
      // Opposite direction: flip — close existing then proceed with new entry
      logger.info(
        `[VincePaperTrading] POSITION FLIP DETECTED: closing existing ${asset} ${existingPosition.direction} before ${direction}`,
      );
      await this.closeTrade(existingPosition.id, "signal_flip");
    }

    // Get current price
    let entryPrice: number;
    try {
      const ctx = marketData
        ? await (marketData as any).getEnrichedContext(asset)
        : null;
      entryPrice = ctx?.currentPrice;
      // Layer 1: Symbol validation (reject invalid / zero price)
      if (entryPrice == null || entryPrice <= 0) {
        // HIP-3 fallback: get price directly from HIP-3 service when marketData missed it
        const isHip3 = (HIP3_ASSETS as readonly string[]).includes(
          asset.toUpperCase(),
        );
        if (isHip3) {
          const hip3Service = this.runtime.getService("VINCE_HIP3_SERVICE") as {
            getAssetPrice?(s: string): Promise<{ price: number } | null>;
          } | null;
          const hip3Data = hip3Service?.getAssetPrice
            ? await hip3Service.getAssetPrice(asset)
            : null;
          if (hip3Data && hip3Data.price > 0) {
            entryPrice = hip3Data.price;
            logger.debug(
              `[VincePaperTrading] HIP-3 price fallback: ${asset} $${entryPrice.toFixed(2)}`,
            );
          }
        }
        if (entryPrice == null || entryPrice <= 0) {
          const now = Date.now();
          const lastWarn = this.lastEntryPriceWarnByAsset.get(asset) ?? 0;
          if (
            now - lastWarn >=
            VincePaperTradingService.ENTRY_PRICE_WARN_THROTTLE_MS
          ) {
            logger.warn(
              `[VincePaperTrading] SYMBOL VALIDATION FAILED: ${asset} (mid price missing or <= 0)`,
            );
            this.lastEntryPriceWarnByAsset.set(asset, now);
          }
          return null;
        }
      }
    } catch (error) {
      logger.error(
        `[VincePaperTrading] Error getting price for ${asset}: ${error}`,
      );
      return null;
    }

    // Apply slippage (capture for log)
    const slippageBps = this.calculateSlippage(sizeUsd);
    const slippageMultiplier =
      direction === "long" ? 1 + slippageBps / 10000 : 1 - slippageBps / 10000;
    entryPrice = entryPrice * slippageMultiplier;

    // Calculate ATR-based dynamic stop loss
    let stopLossPct = DEFAULT_STOP_LOSS_PCT; // Default fallback
    let entryATRPct: number | undefined;

    if (marketData) {
      try {
        entryATRPct = await marketData.getATRPercent(asset);
        // Use 1.5x ATR for stop loss, capped between 1% and 4%
        stopLossPct = Math.max(1, Math.min(4, entryATRPct * 1.5));
        logger.debug(
          `[VincePaperTrading] ${asset} ATR-based SL: ${stopLossPct.toFixed(2)}% (ATR: ${entryATRPct.toFixed(2)}%)`,
        );
      } catch (e) {
        logger.debug(
          `[VincePaperTrading] Could not get ATR for ${asset}, using default SL`,
        );
      }
    }

    const aggressive =
      this.runtime.getSetting?.("vince_paper_aggressive") === true ||
      this.runtime.getSetting?.("vince_paper_aggressive") === "true";
    const regimeService = this.getMarketRegime();
    const mlService = this.runtime.getService(
      "VINCE_ML_INFERENCE_SERVICE",
    ) as VinceMLInferenceService | null;
    const atrPctForMl = entryATRPct ?? 2.0;

    // Optional: ML TP/SL (use predicted ATR multipliers when models and ATR available)
    let takeProfitPrices: number[];
    let stopLossDistance: number;
    let stopLossPrice: number;

    if (mlService && regimeService && atrPctForMl > 0) {
      try {
        const regime = await regimeService.getRegime(asset);
        const volatilityRegime =
          regime.regime === "volatile"
            ? 2
            : regime.regime === "neutral"
              ? 0
              : 1;
        const marketRegime =
          regime.regime === "trending"
            ? 1
            : regime.regime === "volatile"
              ? -1
              : 0;
        const tpslInput: TPSLInput = {
          direction: direction === "long" ? 1 : 0,
          atrPct: atrPctForMl,
          strength: signal.strength,
          confidence: signal.confidence,
          volatilityRegime,
          marketRegime,
        };
        const [tpPred, slPred] = await Promise.all([
          mlService.predictTakeProfit(tpslInput),
          mlService.predictStopLoss(tpslInput),
        ]);
        const tpMult = Math.max(1, Math.min(4, tpPred.value));
        const slMult = Math.max(0.5, Math.min(2.5, slPred.value));
        const baseTpDistancePrice = entryPrice * (atrPctForMl / 100) * tpMult;
        takeProfitPrices = aggressive
          ? [
              direction === "long"
                ? entryPrice + baseTpDistancePrice
                : entryPrice - baseTpDistancePrice,
            ]
          : this.getTPMultipliersForReport().map((mult) =>
              direction === "long"
                ? entryPrice + baseTpDistancePrice * mult
                : entryPrice - baseTpDistancePrice * mult,
            );
        stopLossPct = Math.max(1, Math.min(4, atrPctForMl * slMult));
        if (aggressive) {
          stopLossPct = Math.max(
            MIN_SL_PCT_AGGRESSIVE,
            Math.min(MAX_SL_PCT_AGGRESSIVE, stopLossPct),
          );
          if (entryATRPct != null) {
            const atrFloorPct = entryATRPct * MIN_SL_ATR_MULTIPLIER_AGGRESSIVE;
            stopLossPct = Math.max(stopLossPct, atrFloorPct);
          }
        }
        stopLossDistance = entryPrice * (stopLossPct / 100);
        stopLossPrice =
          direction === "long"
            ? entryPrice - stopLossDistance
            : entryPrice + stopLossDistance;
        logger.debug(
          `[VincePaperTrading] ${asset} ML TP/SL: TP=${tpMult.toFixed(2)}×ATR SL=${slMult.toFixed(2)}×ATR → SL ${stopLossPct.toFixed(2)}%`,
        );
      } catch (e) {
        logger.debug(`[VincePaperTrading] ML TP/SL skip: ${e}`);
        const defaultSlDistance = entryPrice * (stopLossPct / 100);
        takeProfitPrices = aggressive
          ? (() => {
              const targetUsd = TAKE_PROFIT_USD_AGGRESSIVE;
              const pctMove = (targetUsd / sizeUsd) * 100;
              const tpDistance = entryPrice * (pctMove / 100);
              const singleTp =
                direction === "long"
                  ? entryPrice + tpDistance
                  : entryPrice - tpDistance;
              return [singleTp];
            })()
          : this.getTPMultipliersForReport().map((multiplier) => {
              const tpDistance = defaultSlDistance * multiplier;
              return direction === "long"
                ? entryPrice + tpDistance
                : entryPrice - tpDistance;
            });
        if (aggressive && takeProfitPrices.length === 1) {
          const targetSlLossUsd =
            TAKE_PROFIT_USD_AGGRESSIVE / TARGET_RR_AGGRESSIVE;
          const slPctForRr = (targetSlLossUsd / sizeUsd) * 100;
          stopLossPct = Math.max(
            MIN_SL_PCT_AGGRESSIVE,
            Math.min(MAX_SL_PCT_AGGRESSIVE, slPctForRr),
          );
          if (entryATRPct != null) {
            const atrFloorPct = entryATRPct * MIN_SL_ATR_MULTIPLIER_AGGRESSIVE;
            stopLossPct = Math.max(stopLossPct, atrFloorPct);
            stopLossPct = Math.min(stopLossPct, MAX_SL_PCT_AGGRESSIVE);
          }
        }
        stopLossDistance = entryPrice * (stopLossPct / 100);
        stopLossPrice =
          direction === "long"
            ? entryPrice - stopLossDistance
            : entryPrice + stopLossDistance;
      }
    } else {
      const defaultSlDistance = entryPrice * (stopLossPct / 100);
      takeProfitPrices = aggressive
        ? (() => {
            const targetUsd = TAKE_PROFIT_USD_AGGRESSIVE;
            const pctMove = (targetUsd / sizeUsd) * 100;
            const tpDistance = entryPrice * (pctMove / 100);
            const singleTp =
              direction === "long"
                ? entryPrice + tpDistance
                : entryPrice - tpDistance;
            return [singleTp];
          })()
        : this.getTPMultipliersForReport().map((multiplier) => {
            const tpDistance = defaultSlDistance * multiplier;
            return direction === "long"
              ? entryPrice + tpDistance
              : entryPrice - tpDistance;
          });
      if (aggressive && takeProfitPrices.length === 1) {
        const targetSlLossUsd =
          TAKE_PROFIT_USD_AGGRESSIVE / TARGET_RR_AGGRESSIVE;
        const slPctForRr = (targetSlLossUsd / sizeUsd) * 100;
        stopLossPct = Math.max(
          MIN_SL_PCT_AGGRESSIVE,
          Math.min(MAX_SL_PCT_AGGRESSIVE, slPctForRr),
        );
        if (entryATRPct != null) {
          const atrFloorPct = entryATRPct * MIN_SL_ATR_MULTIPLIER_AGGRESSIVE;
          stopLossPct = Math.max(stopLossPct, atrFloorPct);
          stopLossPct = Math.min(stopLossPct, MAX_SL_PCT_AGGRESSIVE);
        }
        logger.debug(
          `[VincePaperTrading] Aggressive SL for R:R ${TARGET_RR_AGGRESSIVE}:1 → ${stopLossPct.toFixed(2)}%`,
        );
      }
      stopLossDistance = entryPrice * (stopLossPct / 100);
      stopLossPrice =
        direction === "long"
          ? entryPrice - stopLossDistance
          : entryPrice + stopLossDistance;
    }

    // Options OI-based TP/SL adjustment (BTC/ETH only)
    // High put OI below spot = support → tighten SL (don't set beyond support)
    // High call OI above spot = resistance → set TP near resistance
    if (asset === "BTC" || asset === "ETH") {
      try {
        const deribitSvc = this.runtime.getService("VINCE_DERIBIT_SERVICE") as {
          getOptionsContext?: (currency: string) => Promise<{
            strikes?: Array<{
              strike: number;
              putOI?: number;
              callOI?: number;
            }>;
          } | null>;
        } | null;
        const optCtx = await deribitSvc
          ?.getOptionsContext?.(asset)
          .catch(() => null);
        if (optCtx?.strikes?.length) {
          // Find highest put OI strike below entry (support)
          const putSupport = optCtx.strikes
            .filter((s) => s.strike < entryPrice && (s.putOI ?? 0) > 0)
            .sort((a, b) => (b.putOI ?? 0) - (a.putOI ?? 0))[0];
          // Find highest call OI strike above entry (resistance)
          const callResistance = optCtx.strikes
            .filter((s) => s.strike > entryPrice && (s.callOI ?? 0) > 0)
            .sort((a, b) => (b.callOI ?? 0) - (a.callOI ?? 0))[0];

          if (direction === "long" && putSupport) {
            // Don't set SL too far beyond put support (it's a floor)
            const supportSL = putSupport.strike * 0.99; // 1% below support
            if (supportSL > stopLossPrice && supportSL < entryPrice) {
              logger.debug(
                `[VincePaperTrading] ${asset} options OI: put support at $${putSupport.strike}, tightening SL from $${stopLossPrice.toFixed(0)} to $${supportSL.toFixed(0)}`,
              );
              stopLossPrice = supportSL;
            }
          }
          if (
            direction === "long" &&
            callResistance &&
            takeProfitPrices.length > 0
          ) {
            // Set first TP near call resistance (gamma wall)
            const resistanceTP = callResistance.strike * 0.995; // Just below resistance
            if (
              resistanceTP < takeProfitPrices[0] &&
              resistanceTP > entryPrice
            ) {
              logger.debug(
                `[VincePaperTrading] ${asset} options OI: call resistance at $${callResistance.strike}, adjusting TP1 from $${takeProfitPrices[0].toFixed(0)} to $${resistanceTP.toFixed(0)}`,
              );
              takeProfitPrices[0] = resistanceTP;
            }
          }
          if (direction === "short" && callResistance) {
            const resistanceSL = callResistance.strike * 1.01;
            if (resistanceSL < stopLossPrice && resistanceSL > entryPrice) {
              logger.debug(
                `[VincePaperTrading] ${asset} options OI: call resistance at $${callResistance.strike}, tightening SL from $${stopLossPrice.toFixed(0)} to $${resistanceSL.toFixed(0)}`,
              );
              stopLossPrice = resistanceSL;
            }
          }
          if (
            direction === "short" &&
            putSupport &&
            takeProfitPrices.length > 0
          ) {
            const supportTP = putSupport.strike * 1.005;
            if (supportTP > takeProfitPrices[0] && supportTP < entryPrice) {
              logger.debug(
                `[VincePaperTrading] ${asset} options OI: put support at $${putSupport.strike}, adjusting TP1 from $${takeProfitPrices[0].toFixed(0)} to $${supportTP.toFixed(0)}`,
              );
              takeProfitPrices[0] = supportTP;
            }
          }
        }
      } catch {
        /* non-fatal: options OI not available */
      }
    }

    // Contributing source names for bandit outcome feedback (weight optimization)
    const contributingSources = Object.keys(
      signal.sourceBreakdown ?? {},
    ).filter(Boolean);

    // Full signal snapshot for dashboard (same as terminal log)
    const supportingReasons =
      signal.supportingReasons ??
      (signal as { supportingFactors?: string[] }).supportingFactors ??
      signal.reasons ??
      [];
    const conflictingReasons =
      signal.conflictingReasons ??
      (signal as { conflictingFactors?: string[] }).conflictingFactors ??
      [];
    const totalSourceCount = [
      ...new Set((signal.signals ?? []).map((s) => s.source)),
    ].length;
    const confirmingCount = signal.confirmingCount ?? 0;
    const conflictingCount = signal.conflictingCount ?? 0;
    const sessionRaw = signal.session ?? "";
    const sessionLabel = sessionRaw
      ? sessionRaw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";
    const slPctNum = Math.abs(
      ((stopLossPrice - entryPrice) / entryPrice) * 100,
    );
    const tp1PctNum = takeProfitPrices[0]
      ? Math.abs(((takeProfitPrices[0] - entryPrice) / entryPrice) * 100)
      : 0;
    const slLossUsd = sizeUsd * (slPctNum / 100);
    const tp1ProfitUsd =
      takeProfitPrices[0] != null ? sizeUsd * (tp1PctNum / 100) : 0;
    const rrNum = slLossUsd > 0 ? tp1ProfitUsd / slLossUsd : 0;
    const rrLabel =
      rrNum >= 1.5
        ? "Good"
        : rrNum >= 1
          ? "OK"
          : rrNum >= 0.5
            ? "Weak"
            : rrNum > 0
              ? "Poor"
              : "—";

    // Open position with ATR and full signal snapshot for dashboard
    const position = positionManager.openPosition({
      asset,
      direction,
      entryPrice,
      sizeUsd,
      leverage,
      stopLossPrice,
      takeProfitPrices,
      strategyName: "VinceSignalFollowing",
      triggerSignals: supportingReasons,
      metadata: {
        entryATRPct,
        contributingSources,
        conflictingReasons,
        strength: signal.strength,
        confidence: signal.confidence,
        confirmingCount,
        totalSourceCount,
        conflictingCount,
        session: sessionLabel,
        slPct: slPctNum,
        tp1Pct: tp1PctNum,
        slLossUsd,
        tp1ProfitUsd,
        rrRatio: rrNum,
        rrLabel,
        mlQualityScore:
          typeof (signal as AggregatedTradeSignal & { mlQualityScore?: number })
            .mlQualityScore === "number"
            ? (signal as AggregatedTradeSignal & { mlQualityScore: number })
                .mlQualityScore
            : undefined,
        banditWeightsUsed:
          (signal as AggregatedTradeSignal & { banditWeightsUsed?: boolean })
            .banditWeightsUsed === true,
        usedPullbackEntry,
        ...(contextBucketKeys && contextBucketKeys.length > 0
          ? { contextBucketKeys }
          : {}),
      },
    });

    // Store ATR on position for trailing stop calculations
    if (entryATRPct && position) {
      position.entryATRPct = entryATRPct;
    }

    // Record that recorded data / ML influenced this open (for dashboard)
    const mlQual = (
      signal as AggregatedTradeSignal & { mlQualityScore?: number }
    ).mlQualityScore;
    const banditUsed =
      (signal as AggregatedTradeSignal & { banditWeightsUsed?: boolean })
        .banditWeightsUsed === true;
    const parts: string[] = [];
    if (typeof mlQual === "number")
      parts.push(`ML quality ${(mlQual * 100).toFixed(0)}%`);
    if (banditUsed) parts.push("bandit weights used");
    if (parts.length > 0) {
      this.pushMLInfluence("open", asset, `Opened: ${parts.join(", ")}`);
    }

    // Record trade
    riskManager.recordTrade();

    // Journal entry
    if (tradeJournal) {
      const coinGlass = this.getCoinGlass();
      const funding = coinGlass?.getFunding(asset);

      tradeJournal.recordEntry({
        position,
        signalDetails: signal.signals,
        marketContext: {
          price: entryPrice,
          funding: funding?.rate,
        },
      });
    }

    // ==========================================
    // V4: ML Feature Recording
    // Record comprehensive features for ML training
    // ==========================================
    if (position) {
      await this.recordMLFeatures(position, signal, entryATRPct);
    }

    // ==========================================
    // DETAILED TRADE OPENED LOG (reuse vars from above; only add log-only ones)
    // ==========================================
    const pnlPer1Pct = sizeUsd / 100;
    const marginUsd = sizeUsd / leverage;
    const liqPct =
      position?.liquidationPrice != null
        ? Math.abs(
            ((position.liquidationPrice - entryPrice) / entryPrice) * 100,
          )
        : (100 / leverage) * 0.9;
    const entryTimeUtc =
      new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
    const isSingleTpAggressive =
      takeProfitPrices.length === 1 &&
      (this.runtime.getSetting?.("vince_paper_aggressive") === true ||
        this.runtime.getSetting?.("vince_paper_aggressive") === "true");

    const factorCount = signal.reasons?.length ?? 0;
    const sourceCount = confirmingCount;
    const sourcesList = [
      ...new Set((signal.signals ?? []).map((s) => s.source)),
    ];
    const sourcesStr = sourcesList.length > 0 ? sourcesList.join(", ") : "—";
    const supporting = supportingReasons;
    const conflicting = conflictingReasons;
    logger.debug(
      `[VincePaperTrading] Paper trade opened: ${direction} ${asset} @ $${entryPrice.toFixed(2)} size $${sizeUsd.toFixed(0)} ${leverage}x (dashboard has full details)`,
    );

    // Push to Discord/Slack/Telegram when connected (conviction-style WHY)
    const notif = this.runtime.getService("VINCE_NOTIFICATION_SERVICE") as {
      push?: (t: string) => Promise<number>;
    } | null;
    if (notif?.push && position) {
      const dirIcon = direction === "long" ? "🟢" : "🔴";
      const whyText = buildWhyThisTrade(position);
      const msg = `📈 **PAPER TRADE OPENED**\n${dirIcon} ${direction.toUpperCase()} ${asset} @ $${entryPrice.toFixed(2)}\nNotional ${formatUsd(sizeUsd)} · ${leverage}x\n\n${whyText}`;
      notif
        .push(msg)
        .catch((e) => logger.debug(`[VincePaperTrading] Push failed: ${e}`));
    }

    return position;
  }

  async closeTrade(
    positionId: string,
    reason: Position["closeReason"],
  ): Promise<Position | null> {
    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();
    const tradeJournal = this.getTradeJournal();

    if (!positionManager || !riskManager) {
      return null;
    }

    const position = positionManager.getPosition(positionId);
    if (!position) {
      return null;
    }

    // Close at current mark price
    const closedPosition = positionManager.closePosition(
      positionId,
      position.markPrice,
      reason,
    );
    if (!closedPosition) {
      return null;
    }

    // Update risk state
    if (closedPosition.realizedPnl !== undefined) {
      const portfolio = positionManager.getPortfolio();
      const isWin = closedPosition.realizedPnl > 0;

      if (isWin) {
        riskManager.recordWin(closedPosition.realizedPnl, portfolio.totalValue);
      } else {
        riskManager.recordLoss(
          Math.abs(closedPosition.realizedPnl),
          portfolio.totalValue,
        );
      }

      // Track for win-streak sizing
      this.recordTradeOutcome(isWin);

      // Context learning: record outcome per bucket for context_adjustment multiplier
      const contextBucketKeys = closedPosition.metadata?.contextBucketKeys as
        | string[]
        | undefined;
      if (contextBucketKeys?.length) {
        for (const key of contextBucketKeys) {
          recordContextOutcome(key, isWin);
        }
      }
    }

    // Journal exit
    if (tradeJournal) {
      tradeJournal.recordExit({
        position: closedPosition,
        exitPrice: closedPosition.markPrice,
        realizedPnl: closedPosition.realizedPnl || 0,
        closeReason: reason || "manual",
      });
    }

    // Store for dashboard: "X contributed to N of K closed trades"
    const contributingSources = closedPosition.metadata?.contributingSources as
      | string[]
      | undefined;
    this.recentClosedTrades.push({
      contributingSources: contributingSources ?? [],
    });
    if (
      this.recentClosedTrades.length >
      VincePaperTradingService.MAX_RECENT_CLOSED_TRADES
    ) {
      this.recentClosedTrades.shift();
    }

    // ==========================================
    // V4: ML Outcome Recording
    // Record trade outcomes for ML learning
    // ==========================================
    await this.recordMLOutcome(closedPosition, reason);

    // ==========================================
    // DETAILED TRADE CLOSED LOG (visible in terminal + logger)
    // ==========================================
    const pnl = closedPosition.realizedPnl || 0;
    const pnlPct = closedPosition.realizedPnlPct || 0;
    const isWin = pnl > 0;
    const pnlIcon = isWin ? "💰" : "💸";
    const resultText = isWin ? "WIN" : "LOSS";
    const dirIcon = closedPosition.direction === "long" ? "🟢" : "🔴";
    const closeReason = reason || "manual";

    // Price move % (raw) and margin P&L % (leveraged) so stop-loss losses aren't confusing
    const priceMovePct =
      closedPosition.direction === "long"
        ? ((closedPosition.markPrice - closedPosition.entryPrice) /
            closedPosition.entryPrice) *
          100
        : ((closedPosition.entryPrice - closedPosition.markPrice) /
            closedPosition.entryPrice) *
          100;
    const lev = closedPosition.leverage ?? 1;

    const feesUsdLog =
      closedPosition.feesUsd != null && closedPosition.feesUsd > 0
        ? ` fees -$${closedPosition.feesUsd.toFixed(2)}`
        : "";
    logger.debug(
      `[VincePaperTrading] Paper trade closed – ${resultText} ${closedPosition.asset} P&L ${isWin ? "+" : ""}$${pnl.toFixed(2)} (${closeReason})`,
    );

    const pnlStr = (isWin ? "+" : "") + "$" + pnl.toFixed(2);

    // Push to Discord/Slack/Telegram when connected
    const notif = this.runtime.getService("VINCE_NOTIFICATION_SERVICE") as {
      push?: (t: string) => Promise<number>;
    } | null;
    if (notif?.push) {
      const msg = `💰 **PAPER TRADE CLOSED** – ${resultText}\n${dirIcon} ${closedPosition.direction.toUpperCase()} ${closedPosition.asset} · P&L ${pnlStr} · ${closeReason}`;
      notif
        .push(msg)
        .catch((e) => logger.debug(`[VincePaperTrading] Push failed: ${e}`));
    }

    return closedPosition;
  }

  // ==========================================
  // V4: ML Feature Recording Methods
  // ==========================================

  /**
   * Record comprehensive features for ML training when trade opens
   */
  private async recordMLFeatures(
    position: Position,
    signal: AggregatedTradeSignal,
    entryATRPct?: number,
    wtt?: WttFeatureBlock,
  ): Promise<void> {
    const featureStore = this.getFeatureStore();
    const similarityService = this.getSignalSimilarity();
    const signalAggregator = this.getSignalAggregator();
    const regimeService = this.getMarketRegime();

    // Convert trade signal to aggregated signal format for feature recording
    const aggSignal: AggregatedSignal = {
      asset: position.asset,
      direction: position.direction,
      strength: signal.strength,
      confidence: signal.confidence,
      sources: Object.keys(signal.sourceBreakdown || {}),
      factors: signal.reasons,
      confirmingCount: signal.confirmingCount,
      timestamp: signal.timestamp,
    };

    // Get current regime for similarity/ML (marketRegime + optional volatilityRegime)
    const regime =
      (await regimeService?.getCurrentRegime?.(position.asset)) ?? null;
    const session = signalAggregator?.getSessionInfo?.()?.session || "unknown";

    // Record in feature store
    if (featureStore) {
      try {
        // Get streak info for execution features
        const streakInfo = this.getStreakInfo();

        const decisionId = await featureStore.recordDecision({
          asset: position.asset,
          signal: aggSignal,
          ...(wtt && { wtt }),
        });

        // Link the trade to the decision
        await featureStore.linkTrade(decisionId, position.id);

        // Record execution details (recordId, position, additionalDetails)
        const usedPullbackEntry =
          (position.metadata as { usedPullbackEntry?: boolean } | undefined)
            ?.usedPullbackEntry ?? false;
        await featureStore.recordExecution(decisionId, position, {
          entryAtrPct: entryATRPct ?? 2.5,
          streakMultiplier: streakInfo.multiplier,
          positionSizePct: 0,
          usedPullbackEntry,
        });

        logger.debug(
          `[VincePaperTrading] ML features recorded for ${position.asset} trade`,
        );
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not record ML features: ${e}`);
      }
    }

    // Record in similarity service for embedding-based lookup
    if (similarityService) {
      try {
        await similarityService.recordTradeContext({
          tradeId: position.id,
          asset: position.asset,
          signal: aggSignal,
          marketRegime: regime?.marketRegime || "neutral",
          session,
        });
      } catch (e) {
        logger.debug(
          `[VincePaperTrading] Could not record similarity context: ${e}`,
        );
      }
    }
  }

  /**
   * Record trade outcome for ML learning
   */
  private async recordMLOutcome(
    position: Position,
    closeReason: Position["closeReason"],
  ): Promise<void> {
    const featureStore = this.getFeatureStore();
    const weightBandit = this.getWeightBandit();
    const similarityService = this.getSignalSimilarity();

    const pnl = position.realizedPnl || 0;
    const pnlPct =
      position.realizedPnlPct ??
      (position.realizedPnl != null && position.sizeUsd > 0
        ? (position.realizedPnl / (position.sizeUsd / position.leverage)) * 100
        : 0);
    const isWin = pnl > 0;

    // Calculate R-multiple (profit in units of risk)
    // Risk = distance from entry to stop loss
    let rMultiple = 0;
    if (position.stopLossPrice && position.entryPrice) {
      const riskPct =
        Math.abs(
          (position.stopLossPrice - position.entryPrice) / position.entryPrice,
        ) * 100;
      if (riskPct > 0) {
        rMultiple = pnlPct / riskPct;
      }
    }

    // Calculate max adverse excursion (MAE) - how far trade went against us
    // This would need to be tracked during trade - using 0 as placeholder
    const maxAdverseExcursion = 0;

    const holdingPeriodMs =
      position.closedAt != null && position.openedAt != null
        ? position.closedAt - position.openedAt
        : 0;

    // Record in feature store
    if (featureStore) {
      try {
        await featureStore.recordOutcome(position.id, {
          exitPrice: position.markPrice,
          realizedPnl: pnl,
          realizedPnlPct: pnlPct,
          feesUsd: position.feesUsd,
          exitReason: closeReason || "manual",
          holdingPeriodMs,
          maxUnrealizedProfit: position.maxUnrealizedProfit,
          maxUnrealizedLoss: position.maxUnrealizedLoss,
          partialProfitsTaken: position.partialProfitsTaken ?? 0,
          trailingStopActivated: position.trailingStopActivated ?? false,
          trailingStopPrice: position.trailingStopPrice ?? null,
        });

        logger.debug(
          `[VincePaperTrading] ML outcome recorded: ${isWin ? "WIN" : "LOSS"} ${pnlPct.toFixed(2)}%`,
        );
      } catch (e) {
        logger.debug(`[VincePaperTrading] Could not record ML outcome: ${e}`);
      }
    }

    // Record in weight bandit for source weight optimization (actual source names from open)
    if (weightBandit) {
      try {
        const sources =
          (position.metadata?.contributingSources as string[] | undefined) ??
          [];
        const sourcesToReport =
          sources.length > 0 ? sources : ["signal_aggregator"];
        await weightBandit.recordOutcome({
          sources: sourcesToReport,
          profitable: isWin,
          pnlPct,
        });
      } catch (e) {
        logger.debug(
          `[VincePaperTrading] Could not record bandit outcome: ${e}`,
        );
      }
    }

    // Record in similarity service
    if (similarityService) {
      try {
        await similarityService.recordOutcome({
          tradeId: position.id,
          profitable: isWin,
          pnlPct,
          exitReason: closeReason || "manual",
        });
      } catch (e) {
        logger.debug(
          `[VincePaperTrading] Could not record similarity outcome: ${e}`,
        );
      }
    }
  }

  // ==========================================
  // Update Loop
  // ==========================================

  private startUpdateLoop(): void {
    // Update mark prices and check triggers every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.updateMarkPrices();
      await this.checkAndCloseTriggers();
      await this.evaluateAndTrade();
    }, TIMING.MARK_PRICE_UPDATE_MS);
  }

  /**
   * Refresh mark prices for all open positions (e.g. before showing status/uPNL).
   * Call this on bot status / portfolio / uPNL requests so reported P&L is current.
   */
  async refreshMarkPrices(): Promise<void> {
    await this.updateMarkPrices();
  }

  private async updateMarkPrices(): Promise<void> {
    const positionManager = this.getPositionManager();
    const marketData = this.getMarketData();

    if (!positionManager || !marketData) return;

    const positions = positionManager.getOpenPositions();
    for (const position of positions) {
      try {
        const ctx = await (marketData as any).getEnrichedContext(
          position.asset,
        );
        if (ctx?.currentPrice) {
          positionManager.updateMarkPrice(position.asset, ctx.currentPrice);
          // Pass volumeRatio to position for volume-aware trailing stops
          if (ctx.volumeRatio != null) {
            (position as { _volumeRatio?: number })._volumeRatio =
              ctx.volumeRatio;
          }
        }
      } catch (error) {
        // Silent fail for price updates
      }
    }
  }

  private async checkAndCloseTriggers(): Promise<void> {
    const positionManager = this.getPositionManager();
    if (!positionManager) return;

    const triggered = positionManager.checkTriggers();
    for (const { position, trigger } of triggered) {
      logger.info(
        `[VincePaperTrading] Trigger hit: ${position.asset} ${trigger}`,
      );

      if (trigger === "partial_tp") {
        const fastTp =
          this.runtime.getSetting?.("vince_paper_fast_tp") === true ||
          this.runtime.getSetting?.("vince_paper_fast_tp") === "true";
        if (fastTp) {
          await this.closeTrade(position.id, "take_profit");
          continue;
        }
        const result = positionManager.executePartialTakeProfit(
          position.id,
          position.markPrice,
        );
        if (result) {
          const taken =
            positionManager.getPosition(position.id)?.partialProfitsTaken ?? 1;
          const label = taken === 1 ? "TP1" : "TP2";
          const notif = this.runtime.getService(
            "VINCE_NOTIFICATION_SERVICE",
          ) as { push?: (t: string) => Promise<number> } | null;
          if (notif?.push) {
            const msg = `💰 **${label} hit** – ${position.asset} partial close +$${result.partialPnl.toFixed(2)}. Remaining: $${result.remainingSize.toFixed(0)}`;
            notif
              .push(msg)
              .catch((e) =>
                logger.debug(`[VincePaperTrading] Push failed: ${e}`),
              );
          }
        }
        continue;
      }

      await this.closeTrade(
        position.id,
        trigger === "liquidation" ? "liquidation" : trigger,
      );
    }
  }

  // ==========================================
  // Pause / Resume
  // ==========================================

  pause(reason: string = "Manual pause"): void {
    const riskManager = this.getRiskManager();
    if (riskManager) {
      riskManager.pause(reason);
    }
  }

  resume(): void {
    const riskManager = this.getRiskManager();
    if (riskManager) {
      riskManager.resume();
    }
  }

  isPaused(): boolean {
    const riskManager = this.getRiskManager();
    return riskManager?.getRiskState().isPaused || false;
  }

  // ==========================================
  // State Persistence
  // ==========================================

  private async persistState(): Promise<void> {
    if (!this.persistenceDir) return;

    try {
      const positionManager = this.getPositionManager();
      const riskManager = this.getRiskManager();
      const tradeJournal = this.getTradeJournal();

      if (positionManager) {
        const state = positionManager.getStateForPersistence();
        fs.writeFileSync(
          path.join(this.persistenceDir, "positions.json"),
          JSON.stringify(state, null, 2),
        );
      }

      if (riskManager) {
        const state = riskManager.getStateForPersistence();
        fs.writeFileSync(
          path.join(this.persistenceDir, "risk-state.json"),
          JSON.stringify(state, null, 2),
        );
      }

      if (tradeJournal) {
        const entries = tradeJournal.getEntriesForPersistence();
        fs.writeFileSync(
          path.join(this.persistenceDir, "journal.json"),
          JSON.stringify(entries, null, 2),
        );
      }

      logger.debug("[VincePaperTrading] State persisted");
    } catch (error) {
      logger.error(`[VincePaperTrading] Failed to persist state: ${error}`);
    }
  }

  private async restoreState(): Promise<void> {
    if (!this.persistenceDir) return;

    try {
      const positionManager = this.getPositionManager();
      const riskManager = this.getRiskManager();
      const tradeJournal = this.getTradeJournal();

      // Restore positions
      const positionsPath = path.join(this.persistenceDir, "positions.json");
      if (fs.existsSync(positionsPath) && positionManager) {
        const data = JSON.parse(fs.readFileSync(positionsPath, "utf-8"));
        positionManager.restoreState(data);
      }

      // Restore risk state
      const riskPath = path.join(this.persistenceDir, "risk-state.json");
      if (fs.existsSync(riskPath) && riskManager) {
        const data = JSON.parse(fs.readFileSync(riskPath, "utf-8"));
        riskManager.restoreState(data);
      }

      // Restore journal
      const journalPath = path.join(this.persistenceDir, "journal.json");
      if (fs.existsSync(journalPath) && tradeJournal) {
        const entries = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
        tradeJournal.restoreEntries(entries);
      }

      this.loadWttTradedToday();

      logger.info("[VincePaperTrading] State restored from disk");
    } catch (error) {
      logger.warn(`[VincePaperTrading] Could not restore state: ${error}`);
    }
  }

  // ==========================================
  // Status
  // ==========================================

  getStatus(): {
    initialized: boolean;
    isPaused: boolean;
    pauseReason?: string;
    openPositions: number;
    portfolioValue: number;
    returnPct: number;
  } {
    const positionManager = this.getPositionManager();
    const riskManager = this.getRiskManager();

    const portfolio = positionManager?.getPortfolio();
    const riskState = riskManager?.getRiskState();

    return {
      initialized: this.initialized,
      isPaused: riskState?.isPaused || false,
      pauseReason: riskState?.pauseReason,
      openPositions: positionManager?.getOpenPositions().length || 0,
      portfolioValue: portfolio?.totalValue || 0,
      returnPct: portfolio?.returnPct || 0,
    };
  }
}
