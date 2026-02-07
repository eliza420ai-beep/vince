/**
 * VINCE Risk Manager Service
 *
 * Manages risk limits and circuit breakers for paper trading:
 * - Position size limits
 * - Leverage limits
 * - Daily loss circuit breaker
 * - Drawdown circuit breaker
 * - Cooldown periods after losses
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type {
  RiskLimits,
  RiskState,
  Position,
  AggregatedTradeSignal,
  LeverageRecommendation,
} from "../types/paperTrading";
import {
  DEFAULT_RISK_LIMITS,
  AGGRESSIVE_RISK_LIMITS,
  SIGNAL_THRESHOLDS,
  TIMING,
  LEVERAGE_ADJUSTMENTS,
  DEFAULT_LEVERAGE,
} from "../constants/paperTradingDefaults";
import type { VinceGoalTrackerService } from "./goalTracker.service";
import type { VinceMarketDataService } from "./marketData.service";
// V3: Dynamic Configuration (Self-Improving Architecture)
import {
  dynamicConfig,
  initializeDynamicConfig,
} from "../config/dynamicConfig";

// ==========================================
// Correlation Groups
// Assets with high correlation (>0.85)
// Disabled: we want to trade BTC and ETH independently even when both have open positions
// ==========================================
const CORRELATION_GROUPS: string[][] = [];

/**
 * Get assets correlated with the given asset
 */
function getCorrelatedAssets(asset: string): string[] {
  const correlatedAssets: string[] = [];
  for (const group of CORRELATION_GROUPS) {
    if (group.includes(asset)) {
      for (const correlatedAsset of group) {
        if (correlatedAsset !== asset) {
          correlatedAssets.push(correlatedAsset);
        }
      }
    }
  }
  return correlatedAssets;
}

export class VinceRiskManagerService extends Service {
  static serviceType = "VINCE_RISK_MANAGER_SERVICE";
  capabilityDescription =
    "Manages risk limits and circuit breakers for paper trading";

  private limits: RiskLimits;
  private state: RiskState;
  private peakPortfolioValue: number = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.limits = { ...DEFAULT_RISK_LIMITS };
    this.state = this.createInitialState();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceRiskManagerService> {
    const service = new VinceRiskManagerService(runtime);
    const aggressive = runtime.getSetting?.("vince_paper_aggressive");
    if (aggressive === true || aggressive === "true") {
      service.limits = { ...AGGRESSIVE_RISK_LIMITS };
      logger.info(
        "[VinceRiskManager] ✅ Aggressive preset: max 10x leverage, higher exposure",
      );
    }
    // Initialize dynamic config and sync signal thresholds
    await initializeDynamicConfig();
    service.syncFromDynamicConfig();
    logger.info("[VinceRiskManager] ✅ Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceRiskManager] Service stopped");
  }

  private createInitialState(): RiskState {
    return {
      isPaused: false,
      pauseReason: undefined,
      dailyPnl: 0,
      dailyPnlPct: 0,
      currentDrawdown: 0,
      currentDrawdownPct: 0,
      circuitBreakerActive: false,
      cooldownExpiresAt: undefined,
      lastTradeAt: undefined,
      todayTradeCount: 0,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Sync signal thresholds from dynamic config (self-improving architecture)
   * Called on startup and can be called periodically to pick up tuned values
   * In aggressive mode we keep 40/35 (AGGRESSIVE_RISK_LIMITS) and only use 2 confirming — do not overwrite with tuned-config/training_metadata so we actually get more trades for ML data.
   */
  syncFromDynamicConfig(): void {
    const thresholds = dynamicConfig.getThresholds();
    const aggressive = this.runtime.getSetting?.("vince_paper_aggressive") === true || this.runtime.getSetting?.("vince_paper_aggressive") === "true";

    if (!aggressive) {
      this.limits.minSignalStrength = thresholds.minStrength;
      this.limits.minSignalConfidence = thresholds.minConfidence;
      this.limits.minConfirmingSignals = thresholds.minConfirming;
    } else {
      // Aggressive: keep preset 40/35 (already set from AGGRESSIVE_RISK_LIMITS in start()); only force 2 confirming
      this.limits.minConfirmingSignals = 2;
    }

    logger.debug(
      `[VinceRiskManager] Synced from dynamic config: ` +
        `strength=${this.limits.minSignalStrength}, confidence=${this.limits.minSignalConfidence}, confirming=${this.limits.minConfirmingSignals}${aggressive ? " (aggressive)" : ""}`,
    );
  }

  // ==========================================
  // State Management
  // ==========================================

  getRiskState(): RiskState {
    return { ...this.state };
  }

  getLimits(): RiskLimits {
    return { ...this.limits };
  }

  updateLimits(newLimits: Partial<RiskLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    logger.info("[VinceRiskManager] Risk limits updated");
  }

  setPeakPortfolioValue(value: number): void {
    if (value > this.peakPortfolioValue) {
      this.peakPortfolioValue = value;
    }
  }

  // ==========================================
  // Pause / Resume
  // ==========================================

  pause(reason: string): void {
    this.state.isPaused = true;
    this.state.pauseReason = reason;
    this.state.lastUpdate = Date.now();
    logger.info(`[VinceRiskManager] Trading paused: ${reason}`);
  }

  resume(): void {
    this.state.isPaused = false;
    this.state.pauseReason = undefined;
    this.state.circuitBreakerActive = false;
    this.state.lastUpdate = Date.now();
    logger.info("[VinceRiskManager] Trading resumed");
  }

  // ==========================================
  // Time-Based Trading Filters & Sessions
  // ==========================================

  /**
   * Trading Session Types
   *
   * Asian Session:    00:00 - 08:00 UTC (Tokyo/Singapore/Hong Kong)
   * European Session: 07:00 - 16:00 UTC (London/Frankfurt)
   * US Session:       13:00 - 22:00 UTC (New York)
   *
   * Overlap periods are highest liquidity:
   * - EU/US overlap: 13:00 - 16:00 UTC (BEST liquidity)
   * - Asia/EU overlap: 07:00 - 08:00 UTC
   */
  getTradingSession(): {
    session: "asian" | "european" | "us" | "off-hours";
    isOverlap: boolean;
    overlapType?: "asia_eu" | "eu_us";
    confidenceMultiplier: number;
    sizeMultiplier: number;
    description: string;
  } {
    const now = new Date();
    const utcHour = now.getUTCHours();

    // Define session boundaries
    const isAsianSession = utcHour >= 0 && utcHour < 8;
    const isEuropeanSession = utcHour >= 7 && utcHour < 16;
    const isUSSession = utcHour >= 13 && utcHour < 22;

    // Overlap periods - highest liquidity
    const isAsiaEUOverlap = utcHour >= 7 && utcHour < 8;
    const isEUUSOverlap = utcHour >= 13 && utcHour < 16;

    // Off-hours (after US close, before Asia open)
    const isOffHours = utcHour >= 22 || utcHour < 0;

    // EU/US overlap - BEST trading conditions
    if (isEUUSOverlap) {
      return {
        session: "us",
        isOverlap: true,
        overlapType: "eu_us",
        confidenceMultiplier: 1.1, // Boost signals during overlap
        sizeMultiplier: 1.0,
        description: "EU/US overlap (highest liquidity)",
      };
    }

    // Asia/EU overlap - Good conditions
    if (isAsiaEUOverlap) {
      return {
        session: "european",
        isOverlap: true,
        overlapType: "asia_eu",
        confidenceMultiplier: 1.0,
        sizeMultiplier: 1.0,
        description: "Asia/EU overlap",
      };
    }

    // US session (non-overlap)
    if (isUSSession) {
      return {
        session: "us",
        isOverlap: false,
        confidenceMultiplier: 1.0,
        sizeMultiplier: 1.0,
        description: "US session",
      };
    }

    // European session (non-overlap)
    if (isEuropeanSession) {
      return {
        session: "european",
        isOverlap: false,
        confidenceMultiplier: 1.0,
        sizeMultiplier: 1.0,
        description: "European session",
      };
    }

    // Asian session (non-overlap) - Lower liquidity, more wicks
    if (isAsianSession) {
      return {
        session: "asian",
        isOverlap: false,
        confidenceMultiplier: 0.9, // Reduce confidence
        sizeMultiplier: 0.85, // Smaller positions
        description: "Asian session (lower liquidity)",
      };
    }

    // Off-hours - Very thin liquidity
    return {
      session: "off-hours",
      isOverlap: false,
      confidenceMultiplier: 0.8,
      sizeMultiplier: 0.7,
      description: "Off-hours (thin liquidity)",
    };
  }

  /**
   * Check if we're near funding settlement (every 8 hours: 00:00, 08:00, 16:00 UTC)
   * DISABLED - was blocking too many good signals
   */
  isNearFundingSettlement(): boolean {
    // Funding settlement check disabled - user wants trades to execute
    return false;
  }

  /**
   * Check if it's a weekend (Saturday/Sunday)
   * Returns a confidence multiplier (0.8x on weekends)
   */
  getWeekendConfidenceMultiplier(): number {
    const now = new Date();
    const day = now.getUTCDay();

    // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      return 0.8;
    }
    return 1.0;
  }

  /**
   * Get combined time-based modifiers (including session analysis)
   */
  getTimeModifiers(): {
    nearFunding: boolean;
    isWeekend: boolean;
    session: ReturnType<VinceRiskManagerService["getTradingSession"]>;
    confidenceMultiplier: number;
    sizeMultiplier: number;
    shouldTrade: boolean;
    reason?: string;
  } {
    const nearFunding = this.isNearFundingSettlement();
    const weekendMultiplier = this.getWeekendConfidenceMultiplier();
    const session = this.getTradingSession();
    const isWeekend = weekendMultiplier < 1.0;

    // Combine all multipliers
    const confidenceMultiplier =
      weekendMultiplier * session.confidenceMultiplier;
    const sizeMultiplier = session.sizeMultiplier;

    let shouldTrade = true;
    let reason: string | undefined;

    if (nearFunding) {
      shouldTrade = false;
      reason = "Near funding settlement (±15 min window)";
    }

    return {
      nearFunding,
      isWeekend,
      session,
      confidenceMultiplier,
      sizeMultiplier,
      shouldTrade,
      reason,
    };
  }

  /**
   * @deprecated Use getTradingSession() or getTimeModifiers().session instead
   */
  getLiquidityMultiplier(): number {
    const session = this.getTradingSession();
    return session.confidenceMultiplier;
  }

  // ==========================================
  // Correlation Filter
  // ==========================================

  /**
   * Check if opening a position in this asset would be correlated with existing positions
   * Returns a size multiplier (1.0 = full size, 0.5 = half size due to correlation)
   */
  getCorrelationSizeMultiplier(
    asset: string,
    direction: "long" | "short",
    existingPositions: Position[],
  ): { multiplier: number; reason?: string } {
    const correlatedAssets = getCorrelatedAssets(asset);

    if (correlatedAssets.length === 0) {
      return { multiplier: 1.0 };
    }

    // Check if we have any correlated positions in the same direction
    for (const position of existingPositions) {
      if (
        correlatedAssets.includes(position.asset) &&
        position.status === "open"
      ) {
        if (position.direction === direction) {
          // Same direction = doubling down on correlated bet
          logger.info(
            `[VinceRiskManager] ⚠️ Correlation filter: ${asset} ${direction} is correlated with existing ${position.asset} ${position.direction}`,
          );
          return {
            multiplier: 0.5,
            reason: `Correlated with ${position.asset} (same direction) - size reduced 50%`,
          };
        } else {
          // Opposite direction = natural hedge, allow full size
          return {
            multiplier: 1.0,
            reason: `Correlated with ${position.asset} (opposite direction) - acts as hedge`,
          };
        }
      }
    }

    return { multiplier: 1.0 };
  }

  /**
   * Get correlation-adjusted signal threshold
   * If we already have a correlated position, require stronger signal for second position
   */
  getCorrelationSignalThreshold(
    asset: string,
    existingPositions: Position[],
  ): number {
    const correlatedAssets = getCorrelatedAssets(asset);

    for (const position of existingPositions) {
      if (
        correlatedAssets.includes(position.asset) &&
        position.status === "open"
      ) {
        // Require 10% higher signal strength for correlated positions
        return 1.1;
      }
    }

    return 1.0;
  }

  // ==========================================
  // Signal Validation
  // ==========================================

  validateSignal(signal: AggregatedTradeSignal): {
    valid: boolean;
    reason: string;
  } {
    // Check if paused
    if (this.state.isPaused) {
      return {
        valid: false,
        reason: `Trading paused: ${this.state.pauseReason || "manual pause"}`,
      };
    }

    // Check circuit breaker
    if (this.state.circuitBreakerActive) {
      return { valid: false, reason: "Circuit breaker active" };
    }

    // Check cooldown
    if (
      this.state.cooldownExpiresAt &&
      Date.now() < this.state.cooldownExpiresAt
    ) {
      const remaining = Math.ceil(
        (this.state.cooldownExpiresAt - Date.now()) / 60000,
      );
      return {
        valid: false,
        reason: `Cooldown active: ${remaining}m remaining`,
      };
    }

    // ==========================================
    // Time-based filters
    // ==========================================
    const timeModifiers = this.getTimeModifiers();
    if (!timeModifiers.shouldTrade) {
      return {
        valid: false,
        reason: timeModifiers.reason || "Time filter blocked",
      };
    }

    // Check signal direction
    if (signal.direction === "neutral") {
      return { valid: false, reason: "No clear direction signal" };
    }

    // NOTE: Time-based confidence adjustment is already applied by SignalAggregator
    // Do NOT double-apply here - use signal.confidence directly
    // (Previously this was double-dipping the penalty, causing signals to fail unexpectedly)

    // Check signal strength
    if (signal.strength < this.limits.minSignalStrength) {
      return {
        valid: false,
        reason: `Signal strength ${signal.strength}% below minimum ${this.limits.minSignalStrength}%`,
      };
    }

    // Check signal confidence (already time-adjusted by SignalAggregator)
    if (signal.confidence < this.limits.minSignalConfidence) {
      return {
        valid: false,
        reason: `Signal confidence ${signal.confidence.toFixed(0)}% below minimum ${this.limits.minSignalConfidence}%`,
      };
    }

    // Check confirming signals
    // HYPE has fewer signal sources (only on Hyperliquid), so use lower minimum
    // Strong-signal override: when strength/confidence are high, allow MIN_CONFIRMING_WHEN_STRONG (more trades → more training data)
    const strongStrength = SIGNAL_THRESHOLDS.STRONG_STRENGTH;
    const strongConfidence = SIGNAL_THRESHOLDS.HIGH_CONFIDENCE;
    const minConfirmingWhenStrong =
      SIGNAL_THRESHOLDS.MIN_CONFIRMING_WHEN_STRONG;
    const isStrongSignal =
      signal.strength >= strongStrength &&
      signal.confidence >= strongConfidence;
    const minConfirming =
      signal.asset === "HYPE"
        ? 2
        : isStrongSignal && signal.confirmingCount >= minConfirmingWhenStrong
          ? minConfirmingWhenStrong
          : this.limits.minConfirmingSignals;
    if (signal.confirmingCount < minConfirming) {
      return {
        valid: false,
        reason: `Only ${signal.confirmingCount} confirming signals, need ${minConfirming}`,
      };
    }

    return { valid: true, reason: "Signal meets all criteria" };
  }

  // ==========================================
  // Trade Validation
  // ==========================================

  validateTrade(params: {
    sizeUsd: number;
    leverage: number;
    portfolioValue: number;
    currentExposure: number;
  }): { valid: boolean; reason: string; adjustedSize?: number } {
    const { sizeUsd, leverage, portfolioValue, currentExposure } = params;

    // Check if paused
    if (this.state.isPaused) {
      return {
        valid: false,
        reason: `Trading paused: ${this.state.pauseReason || "manual pause"}`,
      };
    }

    // Check circuit breaker
    if (this.state.circuitBreakerActive) {
      return { valid: false, reason: "Circuit breaker active" };
    }

    // Check leverage
    if (leverage > this.limits.maxLeverage) {
      return {
        valid: false,
        reason: `Leverage ${leverage}x exceeds maximum ${this.limits.maxLeverage}x`,
      };
    }

    const positionMargin = sizeUsd / leverage;

    // Check position size (margin-based)
    const maxPositionMargin =
      (portfolioValue * this.limits.maxPositionSizePct) / 100;
    if (positionMargin > maxPositionMargin) {
      if (maxPositionMargin <= 0) {
        return {
          valid: false,
          reason: "Insufficient margin allowance for new position",
        };
      }
      return {
        valid: true,
        reason: `Position margin reduced to ${this.limits.maxPositionSizePct}% of portfolio`,
        adjustedSize: maxPositionMargin * leverage,
      };
    }

    // Check total exposure
    const newExposure = currentExposure + positionMargin;
    const maxExposure =
      (portfolioValue * this.limits.maxTotalExposurePct) / 100;
    if (newExposure > maxExposure) {
      const availableMargin = maxExposure - currentExposure;
      if (availableMargin <= 0) {
        return { valid: false, reason: "Maximum total exposure reached" };
      }
      return {
        valid: true,
        reason: `Position margin reduced to fit exposure limits`,
        adjustedSize: availableMargin * leverage,
      };
    }

    return { valid: true, reason: "Trade meets all risk criteria" };
  }

  // ==========================================
  // Goal-Aware Leverage (KPI System Integration)
  // ==========================================

  /**
   * Get goal-aware leverage recommendation
   * Integrates with GoalTrackerService for Kelly-based optimal leverage
   */
  async getGoalAwareLeverage(
    portfolioValue: number,
  ): Promise<LeverageRecommendation> {
    const goalTracker = this.runtime.getService(
      "VINCE_GOAL_TRACKER_SERVICE",
    ) as VinceGoalTrackerService | null;
    const marketData = this.runtime.getService(
      "VINCE_MARKET_DATA_SERVICE",
    ) as VinceMarketDataService | null;

    // Get volatility for adjustment
    let volatility: number | null = null;
    if (marketData) {
      try {
        volatility = await marketData.getDVOL("BTC");
      } catch {
        // DVOL not available
      }
    }

    if (goalTracker) {
      return goalTracker.calculateOptimalLeverage(
        portfolioValue,
        this.state.currentDrawdownPct,
        volatility,
      );
    }

    // Fallback: manual drawdown-adjusted leverage
    return this.calculateDrawdownAdjustedLeverage(volatility);
  }

  /**
   * Calculate drawdown-adjusted leverage (fallback when goal tracker not available)
   */
  private calculateDrawdownAdjustedLeverage(
    volatility: number | null,
  ): LeverageRecommendation {
    let baseLeverage = DEFAULT_LEVERAGE;
    const adjustments: LeverageRecommendation["adjustments"] = [];

    // Drawdown adjustments
    if (this.state.currentDrawdownPct >= 15) {
      baseLeverage *= LEVERAGE_ADJUSTMENTS.drawdown.threshold15Pct;
      adjustments.push({
        factor: "drawdown",
        multiplier: LEVERAGE_ADJUSTMENTS.drawdown.threshold15Pct,
        reason: `Critical drawdown: ${this.state.currentDrawdownPct.toFixed(1)}%`,
      });
    } else if (this.state.currentDrawdownPct >= 10) {
      baseLeverage *= LEVERAGE_ADJUSTMENTS.drawdown.threshold10Pct;
      adjustments.push({
        factor: "drawdown",
        multiplier: LEVERAGE_ADJUSTMENTS.drawdown.threshold10Pct,
        reason: `High drawdown: ${this.state.currentDrawdownPct.toFixed(1)}%`,
      });
    } else if (this.state.currentDrawdownPct >= 5) {
      baseLeverage *= LEVERAGE_ADJUSTMENTS.drawdown.threshold5Pct;
      adjustments.push({
        factor: "drawdown",
        multiplier: LEVERAGE_ADJUSTMENTS.drawdown.threshold5Pct,
        reason: `Elevated drawdown: ${this.state.currentDrawdownPct.toFixed(1)}%`,
      });
    }

    // Volatility adjustment
    if (volatility !== null && volatility > 80) {
      baseLeverage *= LEVERAGE_ADJUSTMENTS.volatility.highVolMultiplier;
      adjustments.push({
        factor: "volatility",
        multiplier: LEVERAGE_ADJUSTMENTS.volatility.highVolMultiplier,
        reason: `Extreme volatility: DVOL ${volatility.toFixed(0)}`,
      });
    } else if (volatility !== null && volatility > 60) {
      baseLeverage *= LEVERAGE_ADJUSTMENTS.volatility.elevatedVolMultiplier;
      adjustments.push({
        factor: "volatility",
        multiplier: LEVERAGE_ADJUSTMENTS.volatility.elevatedVolMultiplier,
        reason: `Elevated volatility: DVOL ${volatility.toFixed(0)}`,
      });
    }

    // Session adjustment
    const session = this.getTradingSession();
    if (
      session.session === "off-hours" &&
      baseLeverage > LEVERAGE_ADJUSTMENTS.session.offHoursMaxLeverage
    ) {
      adjustments.push({
        factor: "session",
        multiplier:
          LEVERAGE_ADJUSTMENTS.session.offHoursMaxLeverage / baseLeverage,
        reason: "Off-hours session cap",
      });
      baseLeverage = LEVERAGE_ADJUSTMENTS.session.offHoursMaxLeverage;
    }

    // Weekend adjustment
    const weekendMult = this.getWeekendConfidenceMultiplier();
    if (weekendMult < 1.0) {
      baseLeverage *= LEVERAGE_ADJUSTMENTS.session.weekendMultiplier;
      adjustments.push({
        factor: "weekend",
        multiplier: LEVERAGE_ADJUSTMENTS.session.weekendMultiplier,
        reason: "Weekend liquidity reduction",
      });
    }

    // Clamp to limits
    baseLeverage = Math.max(1, Math.min(this.limits.maxLeverage, baseLeverage));

    const reason =
      adjustments.length > 0
        ? `Adjusted from ${DEFAULT_LEVERAGE}x due to: ${adjustments.map((a) => a.factor).join(", ")}`
        : `Default leverage: ${DEFAULT_LEVERAGE}x`;

    return {
      kellyOptimal: DEFAULT_LEVERAGE, // Placeholder without stats
      kellySafe: DEFAULT_LEVERAGE * 0.5,
      recommended: Math.round(baseLeverage * 10) / 10,
      current: DEFAULT_LEVERAGE,
      maximum: this.limits.maxLeverage,
      adjustments,
      reason,
    };
  }

  /**
   * Get a drawdown-based leverage multiplier (0-1)
   * Used for quick position sizing adjustments
   */
  getDrawdownLeverageMultiplier(): number {
    if (this.state.currentDrawdownPct >= 15) {
      return LEVERAGE_ADJUSTMENTS.drawdown.threshold15Pct;
    } else if (this.state.currentDrawdownPct >= 10) {
      return LEVERAGE_ADJUSTMENTS.drawdown.threshold10Pct;
    } else if (this.state.currentDrawdownPct >= 5) {
      return LEVERAGE_ADJUSTMENTS.drawdown.threshold5Pct;
    }
    return 1.0;
  }

  // ==========================================
  // P&L Tracking
  // ==========================================

  updateDailyPnl(pnl: number, portfolioValue: number): void {
    this.state.dailyPnl += pnl;
    this.state.dailyPnlPct = (this.state.dailyPnl / portfolioValue) * 100;
    this.state.lastUpdate = Date.now();

    // Check daily loss limit
    if (this.state.dailyPnlPct < -this.limits.maxDailyLossPct) {
      this.state.circuitBreakerActive = true;
      this.state.isPaused = true;
      this.state.pauseReason = `Daily loss limit hit: ${this.state.dailyPnlPct.toFixed(2)}%`;
      logger.warn(
        `[VinceRiskManager] ⚠️ Circuit breaker triggered: ${this.state.pauseReason}`,
      );
    }
  }

  updateDrawdown(currentValue: number): void {
    this.setPeakPortfolioValue(currentValue);

    if (this.peakPortfolioValue > 0) {
      this.state.currentDrawdown = this.peakPortfolioValue - currentValue;
      this.state.currentDrawdownPct =
        (this.state.currentDrawdown / this.peakPortfolioValue) * 100;
    }

    // Check drawdown limit
    if (this.state.currentDrawdownPct > this.limits.maxDrawdownPct) {
      this.state.circuitBreakerActive = true;
      this.state.isPaused = true;
      this.state.pauseReason = `Drawdown limit hit: ${this.state.currentDrawdownPct.toFixed(2)}%`;
      logger.warn(
        `[VinceRiskManager] ⚠️ Circuit breaker triggered: ${this.state.pauseReason}`,
      );
    }
  }

  // ==========================================
  // Cooldown Management
  // ==========================================

  triggerCooldown(reason: string = "loss"): void {
    this.state.cooldownExpiresAt = Date.now() + this.limits.cooldownAfterLossMs;
    logger.info(
      `[VinceRiskManager] Cooldown triggered (${reason}): ${this.limits.cooldownAfterLossMs / 60000}m`,
    );
  }

  isInCooldown(): boolean {
    if (!this.state.cooldownExpiresAt) return false;
    if (Date.now() >= this.state.cooldownExpiresAt) {
      this.state.cooldownExpiresAt = undefined;
      return false;
    }
    return true;
  }

  getCooldownRemaining(): number {
    if (!this.state.cooldownExpiresAt) return 0;
    return Math.max(0, this.state.cooldownExpiresAt - Date.now());
  }

  // ==========================================
  // Trade Recording
  // ==========================================

  recordTrade(): void {
    this.state.lastTradeAt = Date.now();
    this.state.todayTradeCount++;
    this.state.lastUpdate = Date.now();
  }

  recordLoss(lossAmount: number, portfolioValue: number): void {
    this.updateDailyPnl(-Math.abs(lossAmount), portfolioValue);
    this.triggerCooldown("trade loss");
  }

  recordWin(profitAmount: number, portfolioValue: number): void {
    this.updateDailyPnl(profitAmount, portfolioValue);
  }

  // ==========================================
  // Daily Reset
  // ==========================================

  resetDaily(): void {
    this.state.dailyPnl = 0;
    this.state.dailyPnlPct = 0;
    this.state.todayTradeCount = 0;
    this.state.lastUpdate = Date.now();

    // Clear circuit breaker if it was daily-loss triggered
    if (this.state.pauseReason?.includes("Daily loss")) {
      this.state.circuitBreakerActive = false;
      this.state.isPaused = false;
      this.state.pauseReason = undefined;
    }

    logger.info("[VinceRiskManager] Daily stats reset");
  }

  // ==========================================
  // State Persistence
  // ==========================================

  getStateForPersistence(): RiskState {
    return { ...this.state };
  }

  restoreState(state: RiskState): void {
    this.state = { ...state, lastUpdate: Date.now() };
    logger.info("[VinceRiskManager] State restored from persistence");
  }
}
