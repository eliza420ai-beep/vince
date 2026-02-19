/**
 * VINCE Position Manager Service
 *
 * Tracks open positions and portfolio state:
 * - Position tracking with real-time P&L updates
 * - Portfolio value and performance metrics
 * - Stop-loss and take-profit monitoring
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type {
  Position,
  Portfolio,
  RiskState,
  PositionDirection,
  AggregatedTradeSignal,
  PositionSizingRecommendation,
} from "../types/paperTrading";
import {
  INITIAL_BALANCE,
  DEFAULT_STOP_LOSS_PCT,
  DEFAULT_LEVERAGE,
  DEFAULT_RISK_LIMITS,
  TAKE_PROFIT_USD,
  TAKE_PROFIT_USD_AGGRESSIVE,
  FEES,
  MAX_POSITION_AGE_FAST_TP_MS,
} from "../constants/paperTradingDefaults";
import { v4 as uuidv4 } from "uuid";
import type { VinceGoalTrackerService } from "./goalTracker.service";
import type { VinceRiskManagerService } from "./vinceRiskManager.service";

export class VincePositionManagerService extends Service {
  static serviceType = "VINCE_POSITION_MANAGER_SERVICE";
  capabilityDescription =
    "Tracks open positions and portfolio state for paper trading";

  private positions: Map<string, Position> = new Map();
  private portfolio: Portfolio;

  constructor(protected runtime: IAgentRuntime) {
    super();
    this.portfolio = this.createInitialPortfolio();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VincePositionManagerService> {
    const service = new VincePositionManagerService(runtime);
    logger.debug("[VincePositionManager] Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.debug("[VincePositionManager] Service stopped");
  }

  private createInitialPortfolio(): Portfolio {
    return {
      balance: INITIAL_BALANCE,
      initialBalance: INITIAL_BALANCE,
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalValue: INITIAL_BALANCE,
      returnPct: 0,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      lastUpdate: Date.now(),
    };
  }

  // ==========================================
  // Portfolio Management
  // ==========================================

  getPortfolio(): Portfolio {
    this.updatePortfolioMetrics();
    return { ...this.portfolio };
  }

  getRiskState(): RiskState {
    const riskManager = this.runtime.getService(
      "VINCE_RISK_MANAGER_SERVICE",
    ) as any;
    if (riskManager) {
      return riskManager.getRiskState();
    }
    // Return default state if risk manager not available
    return {
      isPaused: false,
      dailyPnl: 0,
      dailyPnlPct: 0,
      currentDrawdown: 0,
      currentDrawdownPct: 0,
      circuitBreakerActive: false,
      todayTradeCount: 0,
      lastUpdate: Date.now(),
    };
  }

  private updatePortfolioMetrics(): void {
    // Calculate unrealized P&L from open positions
    let totalUnrealized = 0;
    for (const position of this.positions.values()) {
      totalUnrealized += position.unrealizedPnl;
    }

    this.portfolio.unrealizedPnl = totalUnrealized;
    this.portfolio.totalValue = this.portfolio.balance + totalUnrealized;
    this.portfolio.returnPct =
      ((this.portfolio.totalValue - this.portfolio.initialBalance) /
        this.portfolio.initialBalance) *
      100;

    // Update win rate
    if (this.portfolio.tradeCount > 0) {
      this.portfolio.winRate =
        (this.portfolio.winCount / this.portfolio.tradeCount) * 100;
    }

    this.portfolio.lastUpdate = Date.now();
  }

  getCurrentExposure(): number {
    let totalExposure = 0;
    for (const position of this.positions.values()) {
      const margin = position.marginUsd ?? position.sizeUsd / position.leverage;
      totalExposure += margin;
    }
    return totalExposure;
  }

  // ==========================================
  // Goal-Aware Position Sizing (KPI System Integration)
  // ==========================================

  /**
   * Calculate goal-aware position size
   * Uses GoalTrackerService for KPI-driven sizing if available
   */
  calculateGoalAwareSize(
    signal: AggregatedTradeSignal,
  ): PositionSizingRecommendation {
    const goalTracker = this.runtime.getService(
      "VINCE_GOAL_TRACKER_SERVICE",
    ) as VinceGoalTrackerService | null;
    const riskManager = this.runtime.getService(
      "VINCE_RISK_MANAGER_SERVICE",
    ) as VinceRiskManagerService | null;

    const currentCapital = this.portfolio.totalValue;
    const currentExposure = this.getCurrentExposure();
    const currentDrawdown = riskManager?.getRiskState().currentDrawdownPct || 0;

    if (goalTracker) {
      return goalTracker.calculatePositionSize(
        signal,
        currentCapital,
        currentExposure,
        currentDrawdown,
      );
    }

    // Fallback: manual position sizing
    return this.calculateFallbackPositionSize(
      signal,
      currentCapital,
      currentExposure,
      currentDrawdown,
    );
  }

  /**
   * Fallback position sizing when goal tracker not available
   */
  private calculateFallbackPositionSize(
    signal: AggregatedTradeSignal,
    currentCapital: number,
    currentExposure: number,
    currentDrawdownPct: number,
  ): PositionSizingRecommendation {
    const factors: string[] = [];

    // Base size: % of capital based on signal strength
    let sizePct = DEFAULT_RISK_LIMITS.maxPositionSizePct;

    // Adjust for signal strength
    if (signal.strength >= 80) {
      factors.push("Strong signal (full size)");
    } else if (signal.strength >= 70) {
      sizePct *= 0.85;
      factors.push("Moderate signal (-15%)");
    } else {
      sizePct *= 0.7;
      factors.push("Weak signal (-30%)");
    }

    // Adjust for drawdown
    if (currentDrawdownPct >= 10) {
      sizePct *= 0.5;
      factors.push(`High drawdown (-50%)`);
    } else if (currentDrawdownPct >= 5) {
      sizePct *= 0.75;
      factors.push(`Elevated drawdown (-25%)`);
    }

    // Apply exposure limit (margin based)
    const maxExposureMargin =
      currentCapital * (DEFAULT_RISK_LIMITS.maxTotalExposurePct / 100);
    const availableMargin = Math.max(0, maxExposureMargin - currentExposure);

    let targetMargin = currentCapital * (sizePct / 100);
    if (targetMargin > availableMargin) {
      targetMargin = availableMargin;
      factors.push("Exposure limit applied");
    }

    const leverage = DEFAULT_LEVERAGE;
    let sizeUsd = targetMargin * leverage;

    // Minimum size check (notional)
    sizeUsd = Math.max(1000, sizeUsd);
    const marginUsed = sizeUsd / leverage;

    if (marginUsed > availableMargin && availableMargin > 0) {
      sizeUsd = availableMargin * leverage;
    }

    // Calculate risk metrics
    const stopLossPct = DEFAULT_STOP_LOSS_PCT / 100;
    const riskUsd = sizeUsd * stopLossPct;
    const riskPct = (riskUsd / currentCapital) * 100;
    const expectedWinUsd = riskUsd * 1.5; // 1.5:1 R:R
    const expectedLossUsd = riskUsd;

    return {
      sizeUsd: Math.round(sizeUsd),
      sizePct: Math.round((sizeUsd / currentCapital) * 100 * 10) / 10,
      leverage,
      riskUsd: Math.round(riskUsd),
      riskPct: Math.round(riskPct * 10) / 10,
      expectedWinUsd: Math.round(expectedWinUsd),
      expectedLossUsd: Math.round(expectedLossUsd),
      factors,
      helpsHitTarget: true, // Unknown without goal tracker
      expectedContribution: Math.round(
        expectedWinUsd * 0.55 - expectedLossUsd * 0.45,
      ), // Approx
    };
  }

  /**
   * Open a position with goal-aware sizing
   * Wrapper that calculates optimal size then opens position
   */
  openPositionWithGoalAwareSizing(params: {
    asset: string;
    direction: PositionDirection;
    entryPrice: number;
    signal: AggregatedTradeSignal;
    strategyName: string;
    triggerSignals: string[];
    stopLossPrice: number;
    takeProfitPrices: number[];
    metadata?: Record<string, unknown>;
  }): { position: Position; sizing: PositionSizingRecommendation } | null {
    const {
      asset,
      direction,
      entryPrice,
      signal,
      strategyName,
      triggerSignals,
      stopLossPrice,
      takeProfitPrices,
      metadata,
    } = params;

    // Calculate goal-aware size
    const sizing = this.calculateGoalAwareSize(signal);

    // Log sizing decision
    logger.debug(
      `[VincePositionManager] Goal-aware sizing ${asset}: $${sizing.sizeUsd} (${sizing.sizePct}%) @ ${sizing.leverage}x | risk $${sizing.riskUsd}`,
    );

    // Open the position with calculated size
    const position = this.openPosition({
      asset,
      direction,
      entryPrice,
      sizeUsd: sizing.sizeUsd,
      leverage: sizing.leverage,
      stopLossPrice,
      takeProfitPrices,
      strategyName,
      triggerSignals,
      metadata: {
        ...metadata,
        goalAwareSizing: true,
        sizingRecommendation: sizing,
      },
    });

    // Record trade with goal tracker
    const goalTracker = this.runtime.getService(
      "VINCE_GOAL_TRACKER_SERVICE",
    ) as VinceGoalTrackerService | null;
    if (goalTracker) {
      // Will be recorded on close with actual P&L
    }

    return { position, sizing };
  }

  /**
   * Close position and record with goal tracker
   */
  closePositionWithGoalTracking(
    positionId: string,
    exitPrice: number,
    reason: Position["closeReason"],
  ): Position | null {
    const position = this.closePosition(positionId, exitPrice, reason);

    if (position && position.realizedPnl !== undefined) {
      // Record trade with goal tracker
      const goalTracker = this.runtime.getService(
        "VINCE_GOAL_TRACKER_SERVICE",
      ) as VinceGoalTrackerService | null;
      if (goalTracker) {
        goalTracker.recordTrade(position.realizedPnl);
        logger.info(
          `[VincePositionManager] 📈 Trade recorded with goal tracker: ${position.realizedPnl >= 0 ? "+" : ""}$${position.realizedPnl.toFixed(2)}`,
        );
      }
    }

    return position;
  }

  // ==========================================
  // Position Management
  // ==========================================

  openPosition(params: {
    asset: string;
    direction: PositionDirection;
    entryPrice: number;
    sizeUsd: number;
    leverage: number;
    stopLossPrice: number;
    takeProfitPrices: number[];
    strategyName: string;
    triggerSignals: string[];
    metadata?: Record<string, unknown>;
  }): Position {
    const {
      asset,
      direction,
      entryPrice,
      sizeUsd,
      leverage,
      stopLossPrice,
      takeProfitPrices,
      strategyName,
      triggerSignals,
      metadata,
    } = params;

    // Calculate liquidation price
    const marginPercent = 100 / leverage;
    const liquidationDistance = entryPrice * (marginPercent / 100) * 0.9; // 90% of margin
    const liquidationPrice =
      direction === "long"
        ? entryPrice - liquidationDistance
        : entryPrice + liquidationDistance;

    const margin = sizeUsd / leverage;

    const position: Position = {
      id: uuidv4(),
      asset,
      direction,
      status: "open",
      entryPrice,
      sizeUsd,
      marginUsd: margin,
      leverage,
      stopLossPrice,
      takeProfitPrices,
      liquidationPrice,
      markPrice: entryPrice,
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      maxUnrealizedProfit: 0,
      maxUnrealizedLoss: 0,
      strategyName,
      triggerSignals,
      openedAt: Date.now(),
      metadata,
    };

    this.positions.set(position.id, position);

    // Deduct position margin from balance
    this.portfolio.balance -= margin;
    this.portfolio.tradeCount++;

    logger.debug(
      `[VincePositionManager] Opened ${direction.toUpperCase()} ${asset} @ $${entryPrice} (size: $${sizeUsd}, ${leverage}x)`,
    );

    return position;
  }

  closePosition(
    positionId: string,
    exitPrice: number,
    reason: Position["closeReason"],
  ): Position | null {
    const position = this.positions.get(positionId);
    if (!position) {
      logger.warn(`[VincePositionManager] Position ${positionId} not found`);
      return null;
    }

    // Calculate final P&L (gross then net of fees)
    const priceDiff =
      position.direction === "long"
        ? exitPrice - position.entryPrice
        : position.entryPrice - exitPrice;
    const pnlPercent = (priceDiff / position.entryPrice) * 100;
    const grossPnl = (position.sizeUsd * pnlPercent) / 100;
    const feesUsd = (position.sizeUsd * FEES.ROUND_TRIP_BPS) / 10_000;
    const realizedPnl = grossPnl - feesUsd;
    const margin = position.marginUsd ?? position.sizeUsd / position.leverage;
    const realizedPnlPct = margin > 0 ? (realizedPnl / margin) * 100 : 0;

    // Update position (net PnL; fees stored for logs/feature store)
    position.status = "closed";
    position.markPrice = exitPrice;
    position.realizedPnl = realizedPnl;
    position.feesUsd = feesUsd;
    position.realizedPnlPct = realizedPnlPct;
    position.closedAt = Date.now();
    position.closeReason = reason;
    position.unrealizedPnl = 0;
    position.unrealizedPnlPct = 0;

    // Update portfolio (net PnL)
    this.portfolio.balance += margin + realizedPnl;
    this.portfolio.realizedPnl += realizedPnl;

    if (realizedPnl > 0) {
      this.portfolio.winCount++;
    } else {
      this.portfolio.lossCount++;
    }

    // Remove from open positions
    this.positions.delete(positionId);

    const pnlStr =
      realizedPnl >= 0
        ? `+$${realizedPnl.toFixed(2)}`
        : `-$${Math.abs(realizedPnl).toFixed(2)}`;
    logger.info(
      `[VincePositionManager] Closed ${position.asset} (${reason}) @ $${exitPrice} - P&L: ${pnlStr} (fees -$${feesUsd.toFixed(2)})`,
    );

    return position;
  }

  // ==========================================
  // Mark Price Updates & Trailing Stops
  // ==========================================

  updateMarkPrice(asset: string, markPrice: number): void {
    for (const position of this.positions.values()) {
      if (position.asset === asset && position.status === "open") {
        position.markPrice = markPrice;

        // Calculate unrealized P&L
        const priceDiff =
          position.direction === "long"
            ? markPrice - position.entryPrice
            : position.entryPrice - markPrice;
        const pnlPercent = (priceDiff / position.entryPrice) * 100;
        position.unrealizedPnl = (position.sizeUsd * pnlPercent) / 100;
        position.unrealizedPnlPct = pnlPercent * position.leverage;

        // Track max profit/loss
        if (position.unrealizedPnl > position.maxUnrealizedProfit) {
          position.maxUnrealizedProfit = position.unrealizedPnl;
        }
        if (position.unrealizedPnl < position.maxUnrealizedLoss) {
          position.maxUnrealizedLoss = position.unrealizedPnl;
        }

        // Update trailing stop logic
        this.updateTrailingStop(position, markPrice);
      }
    }
  }

  /**
   * Update trailing stop for a position
   * - Activates at 1.5R profit
   * - Trails at 1.5x ATR distance (or fallback to entry SL distance)
   */
  private updateTrailingStop(position: Position, markPrice: number): void {
    // Calculate 1R (risk) based on entry stop loss distance
    const slDistance = Math.abs(position.entryPrice - position.stopLossPrice);
    const riskPct = (slDistance / position.entryPrice) * 100;
    const profitR = position.unrealizedPnlPct / (riskPct * position.leverage);

    // Activate trailing stop at 1.5R profit
    if (!position.trailingStopActivated && profitR >= 1.5) {
      position.trailingStopActivated = true;

      // Calculate trailing distance (1.5x ATR or 1.5x SL distance if no ATR)
      const trailingDistancePct = position.entryATRPct
        ? position.entryATRPct * 1.5
        : riskPct * 1.5;
      const trailingDistance =
        position.entryPrice * (trailingDistancePct / 100);

      // Set initial trailing stop at 0.5R profit level
      const breakEvenPrice = position.entryPrice;
      const halfRProfit = slDistance * 0.5;

      if (position.direction === "long") {
        position.trailingStopPrice = breakEvenPrice + halfRProfit;
      } else {
        position.trailingStopPrice = breakEvenPrice - halfRProfit;
      }

      logger.info(
        `[VincePositionManager] 🎯 Trailing stop ACTIVATED for ${position.asset} at ${profitR.toFixed(2)}R profit. ` +
          `Initial trail: $${position.trailingStopPrice?.toFixed(2)}`,
      );
    }

    // Update trailing stop if already activated (only moves in profit direction)
    // Volume-aware: widen on spikes (momentum), tighten on low volume (fading)
    if (position.trailingStopActivated && position.trailingStopPrice) {
      let trailingDistancePct = position.entryATRPct
        ? position.entryATRPct * 1.5
        : riskPct * 1.5;

      // Volume-aware adjustment: get volumeRatio from market data if available
      const volumeRatio = (position as { _volumeRatio?: number })._volumeRatio;
      if (volumeRatio != null && volumeRatio > 0) {
        if (volumeRatio >= 2.0) {
          trailingDistancePct *= 1.2; // Widen 20%: momentum accelerating, give room
        } else if (volumeRatio < 0.5) {
          trailingDistancePct *= 0.7; // Tighten 30%: momentum fading, lock profits
        }
      }

      const trailingDistance = markPrice * (trailingDistancePct / 100);

      if (position.direction === "long") {
        const newTrail = markPrice - trailingDistance;
        if (newTrail > position.trailingStopPrice) {
          const oldTrail = position.trailingStopPrice;
          position.trailingStopPrice = newTrail;
          logger.debug(
            `[VincePositionManager] 📈 Trailing stop updated for ${position.asset}: $${oldTrail.toFixed(2)} → $${newTrail.toFixed(2)}`,
          );
        }
      } else {
        const newTrail = markPrice + trailingDistance;
        if (newTrail < position.trailingStopPrice) {
          const oldTrail = position.trailingStopPrice;
          position.trailingStopPrice = newTrail;
          logger.debug(
            `[VincePositionManager] 📉 Trailing stop updated for ${position.asset}: $${oldTrail.toFixed(2)} → $${newTrail.toFixed(2)}`,
          );
        }
      }
    }
  }

  // ==========================================
  // Trigger Checking
  // ==========================================

  // Maximum position age: 48 hours
  private readonly MAX_POSITION_AGE_MS = 48 * 60 * 60 * 1000;
  // Stale position threshold: 24 hours
  private readonly STALE_POSITION_AGE_MS = 24 * 60 * 60 * 1000;

  checkTriggers(): {
    position: Position;
    trigger:
      | "stop_loss"
      | "take_profit"
      | "liquidation"
      | "trailing_stop"
      | "partial_tp"
      | "max_age";
  }[] {
    const triggered: {
      position: Position;
      trigger:
        | "stop_loss"
        | "take_profit"
        | "liquidation"
        | "trailing_stop"
        | "partial_tp"
        | "max_age";
    }[] = [];

    for (const position of this.positions.values()) {
      if (position.status !== "open") continue;

      const {
        markPrice,
        direction,
        stopLossPrice,
        takeProfitPrices,
        liquidationPrice,
        trailingStopPrice,
        trailingStopActivated,
      } = position;
      const positionAge = Date.now() - position.openedAt;

      // Optional dollar take-profit (e.g. $210 when aggressive; close when unrealized P&L >= threshold)
      const takeProfitUsd = this.runtime.getSetting?.("vince_paper_aggressive")
        ? TAKE_PROFIT_USD_AGGRESSIVE
        : TAKE_PROFIT_USD;
      if (takeProfitUsd != null && position.unrealizedPnl >= takeProfitUsd) {
        triggered.push({ position, trigger: "take_profit" });
        continue;
      }

      // Check max position age (48h default; 12h when vince_paper_fast_tp for more closed trades)
      const maxAgeMs =
        this.runtime.getSetting?.("vince_paper_fast_tp") === true ||
        this.runtime.getSetting?.("vince_paper_fast_tp") === "true"
          ? MAX_POSITION_AGE_FAST_TP_MS
          : this.MAX_POSITION_AGE_MS;
      if (positionAge > maxAgeMs) {
        logger.info(
          `[VincePositionManager] ⏰ Position ${position.asset} exceeded max age (${Math.round(positionAge / 3600000)}h)`,
        );
        triggered.push({ position, trigger: "max_age" });
        continue;
      }

      // Tighten stop loss for stale losing positions (24h+)
      if (
        positionAge > this.STALE_POSITION_AGE_MS &&
        position.unrealizedPnl < 0 &&
        !position.trailingStopActivated
      ) {
        // Tighten SL by 25% (move closer to entry)
        const originalDistance = Math.abs(
          position.entryPrice - position.stopLossPrice,
        );
        const tightenedDistance = originalDistance * 0.75;

        if (direction === "long") {
          const newSL = position.entryPrice - tightenedDistance;
          if (newSL > position.stopLossPrice) {
            logger.info(
              `[VincePositionManager] 📉 Tightening stale position ${position.asset} SL: $${position.stopLossPrice.toFixed(2)} → $${newSL.toFixed(2)}`,
            );
            position.stopLossPrice = newSL;
          }
        } else {
          const newSL = position.entryPrice + tightenedDistance;
          if (newSL < position.stopLossPrice) {
            logger.info(
              `[VincePositionManager] 📉 Tightening stale position ${position.asset} SL: $${position.stopLossPrice.toFixed(2)} → $${newSL.toFixed(2)}`,
            );
            position.stopLossPrice = newSL;
          }
        }
      }

      // Check liquidation (highest priority)
      if (direction === "long" && markPrice <= liquidationPrice) {
        triggered.push({ position, trigger: "liquidation" });
        continue;
      }
      if (direction === "short" && markPrice >= liquidationPrice) {
        triggered.push({ position, trigger: "liquidation" });
        continue;
      }

      // Check trailing stop (if activated)
      if (trailingStopActivated && trailingStopPrice) {
        if (direction === "long" && markPrice <= trailingStopPrice) {
          triggered.push({ position, trigger: "trailing_stop" });
          continue;
        }
        if (direction === "short" && markPrice >= trailingStopPrice) {
          triggered.push({ position, trigger: "trailing_stop" });
          continue;
        }
      }

      // Check fixed stop loss (only if trailing not activated)
      if (!trailingStopActivated) {
        if (direction === "long" && markPrice <= stopLossPrice) {
          triggered.push({ position, trigger: "stop_loss" });
          continue;
        }
        if (direction === "short" && markPrice >= stopLossPrice) {
          triggered.push({ position, trigger: "stop_loss" });
          continue;
        }
      }

      // Check take profits with partial profit-taking
      const profitsTaken = position.partialProfitsTaken ?? 0;

      // TP1: First partial (50%) at 1.5R
      if (takeProfitPrices.length > 0 && profitsTaken < 1) {
        const tp1 = takeProfitPrices[0];
        if (direction === "long" && markPrice >= tp1) {
          triggered.push({ position, trigger: "partial_tp" });
          continue;
        }
        if (direction === "short" && markPrice <= tp1) {
          triggered.push({ position, trigger: "partial_tp" });
          continue;
        }
      }

      // TP2: Second partial (25%) at 3R
      if (takeProfitPrices.length > 1 && profitsTaken === 1) {
        const tp2 = takeProfitPrices[1];
        if (direction === "long" && markPrice >= tp2) {
          triggered.push({ position, trigger: "partial_tp" });
          continue;
        }
        if (direction === "short" && markPrice <= tp2) {
          triggered.push({ position, trigger: "partial_tp" });
          continue;
        }
      }
    }

    return triggered;
  }

  /**
   * Execute partial profit-taking
   * Reduces position size and moves stop to breakeven
   */
  executePartialTakeProfit(
    positionId: string,
    exitPrice: number,
  ): { partialPnl: number; remainingSize: number } | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const profitsTaken = position.partialProfitsTaken ?? 0;

    // Determine how much to close
    let closePercent: number;
    if (profitsTaken === 0) {
      closePercent = 50; // TP1: Close 50%
    } else if (profitsTaken === 1) {
      closePercent = 33; // TP2: Close 33% of remaining (≈25% of original)
    } else {
      return null; // All partials taken
    }

    // Store original size if not already stored
    if (!position.originalSizeUsd) {
      position.originalSizeUsd = position.sizeUsd;
    }

    const closeSize = position.sizeUsd * (closePercent / 100);
    const remainingSize = position.sizeUsd - closeSize;

    // Calculate P&L for the closed portion
    const priceDiff =
      position.direction === "long"
        ? exitPrice - position.entryPrice
        : position.entryPrice - exitPrice;
    const pnlPercent = (priceDiff / position.entryPrice) * 100;
    const partialPnl = (closeSize * pnlPercent) / 100;

    // Update position
    position.sizeUsd = remainingSize;
    position.marginUsd = remainingSize / position.leverage;
    position.partialProfitsTaken = profitsTaken + 1;

    // Move stop to breakeven after first partial
    if (profitsTaken === 0) {
      position.stopLossPrice = position.entryPrice;
      logger.info(
        `[VincePositionManager] 💰 TP1: Closed ${closePercent}% of ${position.asset} (+$${partialPnl.toFixed(2)}). ` +
          `SL moved to breakeven. Remaining: $${remainingSize.toFixed(0)}`,
      );
    } else {
      logger.info(
        `[VincePositionManager] 💰 TP2: Closed ${closePercent}% of ${position.asset} (+$${partialPnl.toFixed(2)}). ` +
          `Remaining: $${remainingSize.toFixed(0)} runs with trailing stop`,
      );
    }

    // Update portfolio with partial realized P&L
    const partialMargin = closeSize / position.leverage;
    this.portfolio.balance += partialMargin + partialPnl;
    this.portfolio.realizedPnl += partialPnl;

    return { partialPnl, remainingSize };
  }

  // ==========================================
  // Retrieval
  // ==========================================

  getOpenPositions(): Position[] {
    return Array.from(this.positions.values()).filter(
      (p) => p.status === "open",
    );
  }

  getPosition(positionId: string): Position | null {
    return this.positions.get(positionId) || null;
  }

  getPositionByAsset(asset: string): Position | null {
    for (const position of this.positions.values()) {
      if (position.asset === asset && position.status === "open") {
        return position;
      }
    }
    return null;
  }

  hasOpenPosition(asset: string): boolean {
    return this.getPositionByAsset(asset) !== null;
  }

  // ==========================================
  // Persistence
  // ==========================================

  getStateForPersistence(): { portfolio: Portfolio; positions: Position[] } {
    return {
      portfolio: { ...this.portfolio },
      positions: Array.from(this.positions.values()),
    };
  }

  restoreState(state: { portfolio: Portfolio; positions: Position[] }): void {
    this.portfolio = { ...state.portfolio, lastUpdate: Date.now() };
    this.positions.clear();
    for (const position of state.positions) {
      if (position.marginUsd === undefined || position.marginUsd === null) {
        position.marginUsd = position.sizeUsd / position.leverage;
      }
      if (position.status === "open") {
        this.positions.set(position.id, position);
      }
    }
    logger.debug(
      `[VincePositionManager] Restored ${this.positions.size} positions`,
    );
  }

  reset(): void {
    this.positions.clear();
    this.portfolio = this.createInitialPortfolio();
    logger.debug("[VincePositionManager] Reset to initial state");
  }
}
