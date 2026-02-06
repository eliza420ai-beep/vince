/**
 * VINCE Goal Tracker Service
 *
 * Tracks trading performance against KPI goals:
 * - Daily target: $420
 * - Monthly target: $10,000
 *
 * Provides:
 * - Capital requirements calculation
 * - Kelly Criterion optimal leverage
 * - Dynamic position sizing
 * - KPI progress tracking
 * - Actionable recommendations
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type {
  TradingGoal,
  CapitalRequirements,
  LeverageRecommendation,
  LeverageAdjustment,
  KPIProgress,
  PositionSizingRecommendation,
  GoalTrackerState,
  Portfolio,
  AggregatedTradeSignal,
} from "../types/paperTrading";
import {
  DEFAULT_TRADING_GOAL,
  KELLY_CONFIG,
  LEVERAGE_ADJUSTMENTS,
  DEFAULT_RISK_LIMITS,
  DEFAULT_STOP_LOSS_PCT,
} from "../constants/paperTradingDefaults";
import type { VinceTradeJournalService } from "./vinceTradeJournal.service";
import type { VinceRiskManagerService } from "./vinceRiskManager.service";
import type { VinceMarketDataService } from "./marketData.service";

export class VinceGoalTrackerService extends Service {
  static serviceType = "VINCE_GOAL_TRACKER_SERVICE";
  capabilityDescription =
    "Tracks trading performance against KPI goals with dynamic leverage and sizing";

  private goal: TradingGoal;
  private dailyPnlHistory: GoalTrackerState["dailyPnlHistory"] = [];
  private monthlyPnlHistory: GoalTrackerState["monthlyPnlHistory"] = [];
  private todayPnl = 0;
  private todayTrades = 0;
  private monthStartBalance = 0;
  private currentMonth = "";

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.goal = { ...DEFAULT_TRADING_GOAL };
    this.currentMonth = this.getCurrentMonthString();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceGoalTrackerService> {
    const service = new VinceGoalTrackerService(runtime);
    logger.info(
      `[VinceGoalTracker] ✅ Service started | Daily Target: $${service.goal.dailyTarget} | Monthly: $${service.goal.monthlyTarget}`,
    );
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceGoalTracker] Service stopped");
  }

  // ==========================================
  // Configuration
  // ==========================================

  updateGoal(goal: Partial<TradingGoal>): void {
    this.goal = { ...this.goal, ...goal };
    logger.info(
      `[VinceGoalTracker] Goal updated: $${this.goal.dailyTarget}/day, $${this.goal.monthlyTarget}/month`,
    );
  }

  getGoal(): TradingGoal {
    return { ...this.goal };
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  private getCurrentDateString(): string {
    return new Date().toISOString().split("T")[0];
  }

  private getCurrentMonthString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  private getHoursIntoDay(): number {
    const now = new Date();
    return now.getUTCHours() + now.getUTCMinutes() / 60;
  }

  private getTradingDaysInMonth(): number {
    // Approximate: ~22 trading days per month (excluding weekends)
    return 22;
  }

  private getTradingDaysElapsed(): number {
    const now = new Date();
    const dayOfMonth = now.getUTCDate();
    // Rough estimate: ~0.7 of days are trading days
    return Math.floor(dayOfMonth * 0.7);
  }

  private getTradingDaysRemaining(): number {
    return this.getTradingDaysInMonth() - this.getTradingDaysElapsed();
  }

  // ==========================================
  // Capital Requirements
  // ==========================================

  /**
   * Calculate capital requirements to hit the daily target
   *
   * Formula: Capital = DailyTarget / (ExpectedReturn% * Leverage)
   * Where ExpectedReturn = (WinRate * AvgWin) - (LossRate * AvgLoss)
   */
  calculateCapitalRequirements(currentCapital: number): CapitalRequirements {
    const stats = this.getTradeStats();

    // Calculate expected return per trade
    const winRate = stats.winRate / 100;
    const lossRate = 1 - winRate;
    const avgWinPct =
      stats.avgWin > 0 ? (stats.avgWin / currentCapital) * 100 : 2; // Default 2%
    const avgLossPct =
      stats.avgLoss > 0 ? (stats.avgLoss / currentCapital) * 100 : 1; // Default 1%

    const expectedReturnPerTrade = winRate * avgWinPct - lossRate * avgLossPct;
    const expectedDailyReturn =
      expectedReturnPerTrade * this.goal.expectedTradesPerDay;

    // Calculate capital needed at different leverage levels
    const maxLeverage = DEFAULT_RISK_LIMITS.maxLeverage;
    const kellyLeverage = this.calculateKellyLeverage(
      stats.winRate,
      stats.avgWin,
      stats.avgLoss,
    );
    const safeLeverage = kellyLeverage * KELLY_CONFIG.kellyFraction;

    // Capital = Target / (Return% * Leverage)
    const minimumCapital =
      expectedDailyReturn > 0
        ? this.goal.dailyTarget / (expectedDailyReturn / 100) / maxLeverage
        : 50000; // Fallback

    const optimalCapital =
      expectedDailyReturn > 0
        ? this.goal.dailyTarget /
          (expectedDailyReturn / 100) /
          Math.max(1, kellyLeverage)
        : 50000;

    const conservativeCapital =
      expectedDailyReturn > 0
        ? this.goal.dailyTarget /
          (expectedDailyReturn / 100) /
          Math.max(1, safeLeverage)
        : 75000;

    const capitalGap = optimalCapital - currentCapital;
    const utilizationPct =
      optimalCapital > 0 ? (currentCapital / optimalCapital) * 100 : 100;

    let status: CapitalRequirements["status"];
    let recommendation: string;

    if (currentCapital < minimumCapital * 0.9) {
      status = "under-capitalized";
      recommendation = `Need $${Math.ceil(minimumCapital - currentCapital).toLocaleString()} more capital to safely hit $${this.goal.dailyTarget}/day target at max leverage`;
    } else if (currentCapital > conservativeCapital * 1.5) {
      status = "over-capitalized";
      recommendation = `Capital buffer of $${Math.ceil(currentCapital - optimalCapital).toLocaleString()} above optimal. Can reduce risk or increase targets.`;
    } else {
      status = "optimal";
      recommendation = `Capital is well-positioned for $${this.goal.dailyTarget}/day target with safe leverage.`;
    }

    return {
      minimumCapital: Math.round(minimumCapital),
      conservativeCapital: Math.round(conservativeCapital),
      optimalCapital: Math.round(optimalCapital),
      currentCapital: Math.round(currentCapital),
      capitalGap: Math.round(capitalGap),
      utilizationPct: Math.round(utilizationPct),
      status,
      recommendation,
    };
  }

  // ==========================================
  // Kelly Criterion Leverage
  // ==========================================

  /**
   * Calculate Kelly Criterion optimal leverage
   *
   * Kelly Formula: f* = (p * b - q) / b
   * Where:
   *   p = probability of winning
   *   q = 1 - p (probability of losing)
   *   b = win/loss ratio (average win / average loss)
   */
  private calculateKellyLeverage(
    winRatePct: number,
    avgWin: number,
    avgLoss: number,
  ): number {
    // Need minimum data for reliable calculation
    const p = winRatePct / 100;
    const q = 1 - p;

    // Win/loss ratio (b)
    const b =
      avgLoss > 0 ? avgWin / avgLoss : KELLY_CONFIG.fallbackWinLossRatio;

    // Kelly formula: f* = (p * b - q) / b
    const kellyFraction = (p * b - q) / b;

    // Convert to leverage (Kelly fraction represents fraction of capital to bet)
    // In leveraged trading: leverage ≈ 1 / risk_per_trade * kelly_fraction
    const riskPerTrade = this.goal.riskPerTradePct / 100;
    let kellyLeverage = kellyFraction / riskPerTrade;

    // Clamp to reasonable bounds
    kellyLeverage = Math.max(
      KELLY_CONFIG.minLeverage,
      Math.min(KELLY_CONFIG.maxKellyLeverage, kellyLeverage),
    );

    // Handle edge cases
    if (!isFinite(kellyLeverage) || kellyLeverage <= 0) {
      kellyLeverage = 2; // Safe default
    }

    return kellyLeverage;
  }

  /**
   * Get optimal leverage recommendation with all adjustments
   */
  calculateOptimalLeverage(
    currentCapital: number,
    currentDrawdownPct: number,
    volatility: number | null, // DVOL
  ): LeverageRecommendation {
    const stats = this.getTradeStats();
    const adjustments: LeverageAdjustment[] = [];

    // Base Kelly leverage
    const kellyOptimal = this.calculateKellyLeverage(
      stats.winRate,
      stats.avgWin,
      stats.avgLoss,
    );
    const kellySafe = kellyOptimal * KELLY_CONFIG.kellyFraction;

    let recommended = kellySafe;

    // 1. Drawdown adjustment
    if (currentDrawdownPct >= 15) {
      const mult = LEVERAGE_ADJUSTMENTS.drawdown.threshold15Pct;
      recommended *= mult;
      adjustments.push({
        factor: "drawdown",
        multiplier: mult,
        reason: `Drawdown ${currentDrawdownPct.toFixed(1)}% >= 15% (critical)`,
      });
    } else if (currentDrawdownPct >= 10) {
      const mult = LEVERAGE_ADJUSTMENTS.drawdown.threshold10Pct;
      recommended *= mult;
      adjustments.push({
        factor: "drawdown",
        multiplier: mult,
        reason: `Drawdown ${currentDrawdownPct.toFixed(1)}% >= 10% (high)`,
      });
    } else if (currentDrawdownPct >= 5) {
      const mult = LEVERAGE_ADJUSTMENTS.drawdown.threshold5Pct;
      recommended *= mult;
      adjustments.push({
        factor: "drawdown",
        multiplier: mult,
        reason: `Drawdown ${currentDrawdownPct.toFixed(1)}% >= 5% (elevated)`,
      });
    }

    // 2. Volatility adjustment (DVOL)
    if (volatility !== null) {
      if (volatility > 80) {
        const mult = LEVERAGE_ADJUSTMENTS.volatility.highVolMultiplier;
        recommended *= mult;
        adjustments.push({
          factor: "volatility",
          multiplier: mult,
          reason: `DVOL ${volatility.toFixed(0)} > 80 (extreme volatility)`,
        });
      } else if (volatility > 60) {
        const mult = LEVERAGE_ADJUSTMENTS.volatility.elevatedVolMultiplier;
        recommended *= mult;
        adjustments.push({
          factor: "volatility",
          multiplier: mult,
          reason: `DVOL ${volatility.toFixed(0)} > 60 (elevated volatility)`,
        });
      }
    }

    // 3. Session adjustment
    const riskManager = this.runtime.getService(
      "VINCE_RISK_MANAGER_SERVICE",
    ) as VinceRiskManagerService | null;
    if (riskManager) {
      const session = riskManager.getTradingSession();
      if (session.session === "off-hours") {
        const maxLev = LEVERAGE_ADJUSTMENTS.session.offHoursMaxLeverage;
        if (recommended > maxLev) {
          adjustments.push({
            factor: "session",
            multiplier: maxLev / recommended,
            reason: `Off-hours session (capped at ${maxLev}x)`,
          });
          recommended = maxLev;
        }
      } else if (session.isOverlap && session.overlapType === "eu_us") {
        const mult = LEVERAGE_ADJUSTMENTS.session.overlapBoostMultiplier;
        recommended *= mult;
        adjustments.push({
          factor: "session",
          multiplier: mult,
          reason: "EU/US overlap (peak liquidity)",
        });
      }

      // Weekend adjustment
      const weekendMult = riskManager.getWeekendConfidenceMultiplier();
      if (weekendMult < 1.0) {
        recommended *= LEVERAGE_ADJUSTMENTS.session.weekendMultiplier;
        adjustments.push({
          factor: "weekend",
          multiplier: LEVERAGE_ADJUSTMENTS.session.weekendMultiplier,
          reason: "Weekend (reduced liquidity)",
        });
      }
    }

    // 4. Daily progress adjustment
    const dailyProgress = (this.todayPnl / this.goal.dailyTarget) * 100;
    if (dailyProgress >= LEVERAGE_ADJUSTMENTS.progress.aheadThresholdPct) {
      const mult = LEVERAGE_ADJUSTMENTS.progress.aheadTargetMultiplier;
      recommended *= mult;
      adjustments.push({
        factor: "progress",
        multiplier: mult,
        reason: `Ahead of target (${dailyProgress.toFixed(0)}%) - preserving gains`,
      });
    } else if (dailyProgress < 50 && this.getHoursIntoDay() > 12) {
      const mult = LEVERAGE_ADJUSTMENTS.progress.behindTargetBoost;
      recommended *= mult;
      adjustments.push({
        factor: "progress",
        multiplier: mult,
        reason: `Behind target (${dailyProgress.toFixed(0)}%) - slight boost`,
      });
    }

    // Clamp to allowed range
    const maximum = DEFAULT_RISK_LIMITS.maxLeverage;
    recommended = Math.max(
      KELLY_CONFIG.minLeverage,
      Math.min(maximum, recommended),
    );

    // Generate reason
    let reason: string;
    if (adjustments.length === 0) {
      reason = `Half-Kelly optimal (${kellySafe.toFixed(1)}x) based on ${stats.winRate.toFixed(0)}% win rate`;
    } else {
      const totalMult = adjustments.reduce((acc, a) => acc * a.multiplier, 1);
      reason = `Adjusted ${(totalMult * 100 - 100).toFixed(0)}% from Kelly due to: ${adjustments.map((a) => a.factor).join(", ")}`;
    }

    return {
      kellyOptimal: Math.round(kellyOptimal * 10) / 10,
      kellySafe: Math.round(kellySafe * 10) / 10,
      recommended: Math.round(recommended * 10) / 10,
      current: DEFAULT_RISK_LIMITS.maxLeverage, // Will be overwritten by caller
      maximum,
      adjustments,
      reason,
    };
  }

  // ==========================================
  // Position Sizing
  // ==========================================

  /**
   * Calculate goal-aware position size
   */
  calculatePositionSize(
    signal: AggregatedTradeSignal,
    currentCapital: number,
    currentExposure: number,
    currentDrawdownPct: number,
  ): PositionSizingRecommendation {
    const factors: string[] = [];

    // Get optimal leverage
    const marketData = this.runtime.getService(
      "VINCE_MARKET_DATA_SERVICE",
    ) as VinceMarketDataService | null;
    let volatility: number | null = null;
    if (marketData) {
      marketData
        .getDVOL(signal.asset)
        .then((v) => (volatility = v))
        .catch(() => {});
    }

    const leverageRec = this.calculateOptimalLeverage(
      currentCapital,
      currentDrawdownPct,
      volatility,
    );
    const leverage = leverageRec.recommended;

    // Base position size from goal
    // Target: Make enough per trade to hit daily target
    const tradesRemaining = Math.max(
      1,
      this.goal.expectedTradesPerDay - this.todayTrades,
    );
    const remainingTarget = Math.max(0, this.goal.dailyTarget - this.todayPnl);
    const targetPerTrade = remainingTarget / tradesRemaining;

    // Calculate size needed to make target
    const stopLossPct = DEFAULT_STOP_LOSS_PCT / 100;
    const expectedWinPct = stopLossPct * this.goal.targetRiskReward;

    // Size = Target / (ExpectedWin% * Leverage)
    let targetSize = targetPerTrade / (expectedWinPct * leverage);

    // Apply risk limits (margin-based)
    const maxPositionMargin =
      currentCapital * (DEFAULT_RISK_LIMITS.maxPositionSizePct / 100);
    const maxRiskUsd = currentCapital * (this.goal.riskPerTradePct / 100);
    const riskBasedMaxSize = maxRiskUsd / stopLossPct;
    const riskBasedMaxMargin = riskBasedMaxSize / leverage;

    const maxExposureMargin =
      currentCapital * (DEFAULT_RISK_LIMITS.maxTotalExposurePct / 100);
    const availableMargin = Math.max(0, maxExposureMargin - currentExposure);

    const targetMargin = targetSize / leverage;

    let marginToUse = Math.min(
      targetMargin,
      maxPositionMargin,
      riskBasedMaxMargin,
      availableMargin,
    );
    marginToUse = Math.max(0, marginToUse);

    let sizeUsd = marginToUse * leverage;

    // Track which constraint was binding
    if (marginToUse === targetMargin) {
      factors.push("Goal-based sizing");
    } else if (marginToUse === maxPositionMargin) {
      factors.push(
        `Capped at ${DEFAULT_RISK_LIMITS.maxPositionSizePct}% max position`,
      );
    } else if (marginToUse === riskBasedMaxMargin) {
      factors.push(`Risk-limited to ${this.goal.riskPerTradePct}% of capital`);
    } else if (marginToUse === availableMargin) {
      factors.push("Exposure limit reached");
    }

    // Signal strength adjustment
    if (signal.strength >= 80) {
      sizeUsd *= 1.15;
      factors.push("Strong signal (+15%)");
    } else if (signal.strength < 70) {
      sizeUsd *= 0.85;
      factors.push("Weak signal (-15%)");
    }

    // Ensure minimum size
    sizeUsd = Math.max(1000, sizeUsd); // Minimum $1000 position
    marginToUse = sizeUsd / leverage;
    if (marginToUse > availableMargin && availableMargin > 0) {
      marginToUse = availableMargin;
      sizeUsd = availableMargin * leverage;
    }

    // Calculate risk/reward
    const riskUsd = sizeUsd * stopLossPct;
    const riskPct = (riskUsd / currentCapital) * 100;
    const expectedWinUsd = sizeUsd * expectedWinPct;
    const expectedLossUsd = riskUsd;

    // Expected contribution to daily goal (probability weighted)
    const stats = this.getTradeStats();
    const winProb = stats.winRate / 100;
    const expectedContribution =
      winProb * expectedWinUsd - (1 - winProb) * expectedLossUsd;

    return {
      sizeUsd: Math.round(sizeUsd),
      sizePct: Math.round((sizeUsd / currentCapital) * 100 * 10) / 10,
      leverage: Math.round(leverage * 10) / 10,
      riskUsd: Math.round(riskUsd),
      riskPct: Math.round(riskPct * 10) / 10,
      expectedWinUsd: Math.round(expectedWinUsd),
      expectedLossUsd: Math.round(expectedLossUsd),
      factors,
      helpsHitTarget: expectedContribution > 0,
      expectedContribution: Math.round(expectedContribution),
    };
  }

  // ==========================================
  // KPI Progress Tracking
  // ==========================================

  /**
   * Get comprehensive KPI progress
   */
  getKPIProgress(portfolio: Portfolio): KPIProgress {
    const stats = this.getTradeStats();

    // Daily progress
    const hoursIntoDa = this.getHoursIntoDay();
    const expectedAtThisHour = (hoursIntoDa / 24) * this.goal.dailyTarget;
    const paceAmount = this.todayPnl - expectedAtThisHour;

    let dailyPace: KPIProgress["daily"]["pace"];
    if (paceAmount > this.goal.dailyTarget * 0.1) {
      dailyPace = "ahead";
    } else if (paceAmount < -this.goal.dailyTarget * 0.1) {
      dailyPace = "behind";
    } else {
      dailyPace = "on-track";
    }

    // Monthly progress
    const monthlyPnl = this.getMonthlyPnl(portfolio);
    const tradingDays = this.getTradingDaysElapsed();
    const expectedMonthly = tradingDays * this.goal.dailyTarget;
    const monthlyGap = monthlyPnl - expectedMonthly;

    let monthlyStatus: KPIProgress["monthly"]["status"];
    if (monthlyGap > this.goal.monthlyTarget * 0.1) {
      monthlyStatus = "ahead";
    } else if (monthlyGap < -this.goal.monthlyTarget * 0.1) {
      monthlyStatus = "behind";
    } else {
      monthlyStatus = "on-track";
    }

    // If behind, what daily target is needed to catch up?
    const remainingDays = this.getTradingDaysRemaining();
    const remainingTarget = this.goal.monthlyTarget - monthlyPnl;
    const dailyTargetToHitGoal =
      remainingDays > 0 ? remainingTarget / remainingDays : remainingTarget;

    // Calculate Sharpe ratio (simplified)
    const dailyReturns = this.dailyPnlHistory.map((d) => d.pnl);
    const avgReturn =
      dailyReturns.length > 0
        ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length
        : 0;
    const variance =
      dailyReturns.length > 1
        ? dailyReturns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) /
          (dailyReturns.length - 1)
        : 1;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    return {
      daily: {
        target: this.goal.dailyTarget,
        current: Math.round(this.todayPnl),
        pct: Math.round((this.todayPnl / this.goal.dailyTarget) * 100),
        remaining: Math.round(this.goal.dailyTarget - this.todayPnl),
        trades: this.todayTrades,
        winRate: stats.winRate,
        pace: dailyPace,
        paceAmount: Math.round(paceAmount),
      },
      monthly: {
        target: this.goal.monthlyTarget,
        current: Math.round(monthlyPnl),
        pct: Math.round((monthlyPnl / this.goal.monthlyTarget) * 100),
        remaining: Math.round(this.goal.monthlyTarget - monthlyPnl),
        tradingDays,
        tradingDaysRemaining: remainingDays,
        dailyTargetToHitGoal: Math.round(dailyTargetToHitGoal),
        status: monthlyStatus,
      },
      allTime: {
        totalPnl: Math.round(portfolio.realizedPnl),
        totalTrades: stats.totalTrades,
        winRate: stats.winRate,
        avgWin: Math.round(stats.avgWin),
        avgLoss: Math.round(stats.avgLoss),
        profitFactor: Math.round(stats.profitFactor * 100) / 100,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      },
    };
  }

  // ==========================================
  // P&L Recording
  // ==========================================

  /**
   * Record a completed trade for goal tracking
   */
  recordTrade(pnl: number): void {
    this.todayPnl += pnl;
    this.todayTrades++;
  }

  /**
   * Reset daily stats (call at start of new trading day)
   */
  resetDaily(): void {
    const today = this.getCurrentDateString();

    // Save yesterday's stats if we have any
    if (this.todayTrades > 0) {
      const yesterday = this.dailyPnlHistory[this.dailyPnlHistory.length - 1];
      if (!yesterday || yesterday.date !== today) {
        this.dailyPnlHistory.push({
          date: today,
          pnl: this.todayPnl,
          trades: this.todayTrades,
          hitTarget: this.todayPnl >= this.goal.dailyTarget,
        });

        // Keep last 30 days
        if (this.dailyPnlHistory.length > 30) {
          this.dailyPnlHistory = this.dailyPnlHistory.slice(-30);
        }
      }
    }

    // Check for new month
    const currentMonth = this.getCurrentMonthString();
    if (currentMonth !== this.currentMonth) {
      this.currentMonth = currentMonth;
      // Monthly stats would be saved here
    }

    this.todayPnl = 0;
    this.todayTrades = 0;

    logger.info("[VinceGoalTracker] Daily stats reset");
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private getTradeStats(): {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    totalTrades: number;
  } {
    const journal = this.runtime.getService(
      "VINCE_TRADE_JOURNAL_SERVICE",
    ) as VinceTradeJournalService | null;

    if (journal) {
      const stats = journal.getStats();
      return {
        winRate: stats.winRate || KELLY_CONFIG.fallbackWinRate,
        avgWin: stats.avgWin || 0,
        avgLoss: stats.avgLoss || 0,
        profitFactor: stats.profitFactor || 1,
        totalTrades: stats.totalTrades || 0,
      };
    }

    // Fallback defaults
    return {
      winRate: KELLY_CONFIG.fallbackWinRate,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 1,
      totalTrades: 0,
    };
  }

  private getMonthlyPnl(portfolio: Portfolio): number {
    // Sum of daily P&L this month
    const currentMonth = this.getCurrentMonthString();
    const monthlyTotal = this.dailyPnlHistory
      .filter((d) => d.date.startsWith(currentMonth))
      .reduce((sum, d) => sum + d.pnl, 0);

    return monthlyTotal + this.todayPnl;
  }

  // ==========================================
  // Persistence
  // ==========================================

  getStateForPersistence(): GoalTrackerState {
    return {
      goal: this.goal,
      dailyPnlHistory: this.dailyPnlHistory,
      monthlyPnlHistory: this.monthlyPnlHistory,
      lastUpdate: Date.now(),
    };
  }

  restoreState(state: GoalTrackerState): void {
    this.goal = state.goal;
    this.dailyPnlHistory = state.dailyPnlHistory || [];
    this.monthlyPnlHistory = state.monthlyPnlHistory || [];
    logger.info(
      `[VinceGoalTracker] State restored | Goal: $${this.goal.dailyTarget}/day`,
    );
  }

  // ==========================================
  // Dashboard Display
  // ==========================================

  /**
   * Generate KPI dashboard for display
   */
  generateDashboard(portfolio: Portfolio): string {
    const progress = this.getKPIProgress(portfolio);
    const capitalReq = this.calculateCapitalRequirements(portfolio.totalValue);

    // Get leverage recommendation
    const riskManager = this.runtime.getService(
      "VINCE_RISK_MANAGER_SERVICE",
    ) as VinceRiskManagerService | null;
    const currentDrawdown = riskManager?.getRiskState().currentDrawdownPct || 0;

    const marketData = this.runtime.getService(
      "VINCE_MARKET_DATA_SERVICE",
    ) as VinceMarketDataService | null;
    let dvol: number | null = null;
    // Note: getDVOL is async but we need sync here, so use cached value if available

    const leverageRec = this.calculateOptimalLeverage(
      portfolio.totalValue,
      currentDrawdown,
      dvol,
    );

    const lines: string[] = [
      "==========================================",
      "       VINCE Trading KPI Dashboard",
      "==========================================",
      `Target: $${this.goal.dailyTarget}/day | $${this.goal.monthlyTarget.toLocaleString()}/month`,
      "",
      "TODAY'S PROGRESS:",
      `  P&L: ${progress.daily.current >= 0 ? "+" : ""}$${progress.daily.current.toLocaleString()} (${progress.daily.pct}% of target)`,
      `  Trades: ${progress.daily.trades} | Win Rate: ${progress.daily.winRate.toFixed(0)}%`,
      `  Pace: ${progress.daily.pace.toUpperCase()} (${progress.daily.paceAmount >= 0 ? "+" : ""}$${progress.daily.paceAmount})`,
      "",
      "THIS MONTH:",
      `  P&L: ${progress.monthly.current >= 0 ? "+" : ""}$${progress.monthly.current.toLocaleString()} (${progress.monthly.pct}% of target)`,
      `  Trading Days: ${progress.monthly.tradingDays} | Remaining: ${progress.monthly.tradingDaysRemaining}`,
      `  Status: ${progress.monthly.status.toUpperCase()}${progress.monthly.status === "behind" ? ` (need $${progress.monthly.dailyTargetToHitGoal}/day)` : ""}`,
      "",
      "CAPITAL ANALYSIS:",
      `  Current: $${capitalReq.currentCapital.toLocaleString()}`,
      `  Required (Optimal): $${capitalReq.optimalCapital.toLocaleString()} at ${leverageRec.kellySafe.toFixed(1)}x leverage`,
      `  Status: ${capitalReq.status.toUpperCase().replace("-", " ")}`,
      "",
      "LEVERAGE RECOMMENDATION:",
      `  Kelly Optimal: ${leverageRec.kellyOptimal.toFixed(1)}x`,
      `  Kelly Safe: ${leverageRec.kellySafe.toFixed(1)}x`,
      `  Recommended: ${leverageRec.recommended.toFixed(1)}x`,
      `  Reason: ${leverageRec.reason}`,
      "",
      "ALL-TIME STATS:",
      `  Total P&L: ${progress.allTime.totalPnl >= 0 ? "+" : ""}$${progress.allTime.totalPnl.toLocaleString()}`,
      `  Trades: ${progress.allTime.totalTrades} | Win Rate: ${progress.allTime.winRate.toFixed(0)}%`,
      `  Profit Factor: ${progress.allTime.profitFactor} | Sharpe: ${progress.allTime.sharpeRatio}`,
      "==========================================",
    ];

    return lines.join("\n");
  }
}
