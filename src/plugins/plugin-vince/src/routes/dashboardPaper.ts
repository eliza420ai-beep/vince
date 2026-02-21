/**
 * Dashboard Paper API – open positions and portfolio for the Trading Bot tab.
 * GET /api/agents/:agentId/plugins/plugin-vince/vince/paper
 */

import type { IAgentRuntime } from "@elizaos/core";
import type { VincePositionManagerService } from "../services/vincePositionManager.service";
import type { VincePaperTradingService } from "../services/vincePaperTrading.service";
import type { VinceMLInferenceService } from "../services/mlInference.service";
import type { VinceWeightBanditService } from "../services/weightBandit.service";
import type { VinceGoalTrackerService } from "../services/goalTracker.service";
import type { VinceSignalAggregatorService } from "../services/signalAggregator.service";
import type { Position, Portfolio, KPIProgress } from "../types/paperTrading";

export interface NoTradeEvaluation {
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
  /** Sources that contributed to the signal (still below threshold). When XSentiment missing, X was neutral/below 40%. */
  contributingSources?: string[];
}

export interface MLInfluenceEvent {
  type: "reject" | "open";
  asset: string;
  message: string;
  timestamp: number;
}

export interface MLStatus {
  modelsLoaded: string[];
  signalQualityThreshold: number;
  suggestedMinStrength: number | null;
  suggestedMinConfidence: number | null;
  tpLevelIndices: number[];
  tpLevelSkipped: number | null;
  banditReady: boolean;
  banditTradesProcessed: number;
}

export interface PaperResponse {
  openPositions: Position[];
  portfolio: Portfolio;
  recentNoTrades: NoTradeEvaluation[];
  recentMLInfluences: MLInfluenceEvent[];
  mlStatus: MLStatus | null;
  goalProgress: KPIProgress | null;
  goalTargets: { daily: number; monthly: number } | null;
  signalStatus: {
    signalCount: number;
    lastUpdate: number;
    dataSources: { name: string; available: boolean }[];
  } | null;
  banditSummary: {
    totalTrades: number;
    topSources: { source: string; winRate: number }[];
    bottomSources: { source: string; winRate: number }[];
  } | null;
  /** Last closed positions (contributingSources only) for "X contributed to N of K" */
  recentClosedTrades: Array<{ contributingSources?: string[] }>;
  /** Recent closed trades with P&L for dashboard (which trades, how much made) */
  recentTrades: RecentTradeItem[];
  updatedAt: number;
}

export interface RecentTradeItem {
  asset: string;
  direction: string;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  closeReason: string;
  openedAt: number;
  closedAt: number;
}

const emptyPortfolio: Portfolio = {
  balance: 0,
  initialBalance: 0,
  realizedPnl: 0,
  unrealizedPnl: 0,
  totalValue: 0,
  returnPct: 0,
  tradeCount: 0,
  winCount: 0,
  lossCount: 0,
  winRate: 0,
  maxDrawdown: 0,
  maxDrawdownPct: 0,
  lastUpdate: Date.now(),
};

export async function buildPaperResponse(
  runtime: IAgentRuntime,
): Promise<PaperResponse> {
  const positionManager = runtime.getService(
    "VINCE_POSITION_MANAGER_SERVICE",
  ) as VincePositionManagerService | null;

  if (!positionManager) {
    return {
      openPositions: [],
      portfolio: emptyPortfolio,
      recentNoTrades: [],
      recentMLInfluences: [],
      mlStatus: null,
      goalProgress: null,
      goalTargets: null,
      signalStatus: null,
      banditSummary: null,
      recentClosedTrades: [],
      recentTrades: [],
      updatedAt: Date.now(),
    };
  }

  const openPositions = positionManager.getOpenPositions();
  const portfolio = positionManager.getPortfolio();

  const paperTrading = runtime.getService(
    "VINCE_PAPER_TRADING_SERVICE",
  ) as VincePaperTradingService | null;
  const recentNoTrades = paperTrading?.getRecentNoTradeEvaluations?.() ?? [];
  const recentMLInfluences = paperTrading?.getRecentMLInfluences?.() ?? [];

  const mlInference = runtime.getService(
    "VINCE_ML_INFERENCE_SERVICE",
  ) as VinceMLInferenceService | null;
  const weightBandit = runtime.getService(
    "VINCE_WEIGHT_BANDIT_SERVICE",
  ) as VinceWeightBanditService | null;

  let mlStatus: MLStatus | null = null;
  if (mlInference?.getMLStatus) {
    const ml = mlInference.getMLStatus();
    const bandit = weightBandit?.getBanditStatus?.() ?? {
      isReady: false,
      totalTradesProcessed: 0,
    };
    mlStatus = {
      ...ml,
      banditReady: bandit.isReady,
      banditTradesProcessed: bandit.totalTradesProcessed,
    };
  }

  const goalTracker = runtime.getService(
    "VINCE_GOAL_TRACKER_SERVICE",
  ) as VinceGoalTrackerService | null;
  const signalAggregator = runtime.getService(
    "VINCE_SIGNAL_AGGREGATOR_SERVICE",
  ) as VinceSignalAggregatorService | null;

  const goalProgress = goalTracker?.getKPIProgress?.(portfolio) ?? null;
  const goal = goalTracker?.getGoal?.();
  const goalTargets =
    goal != null
      ? { daily: goal.dailyTarget, monthly: goal.monthlyTarget }
      : null;

  const signalStatus = signalAggregator?.getStatus?.() ?? null;

  const banditSummaryRaw = weightBandit?.getSummary?.();
  const banditSummary =
    banditSummaryRaw != null
      ? {
          totalTrades: banditSummaryRaw.totalTrades,
          topSources: banditSummaryRaw.topSources,
          bottomSources: banditSummaryRaw.bottomSources,
        }
      : null;

  const recentClosedTrades = paperTrading?.getRecentClosedTrades?.() ?? [];

  const tradeJournal = runtime.getService("VINCE_TRADE_JOURNAL_SERVICE") as {
    getRecentTrades?: (count: number) => {
      entry: {
        asset: string;
        direction: string;
        price: number;
        timestamp: number;
      };
      exit?: {
        price: number;
        realizedPnl?: number;
        closeReason?: string;
        timestamp: number;
      };
    }[];
  } | null;
  const recentTradesRaw = tradeJournal?.getRecentTrades?.(30) ?? [];
  const recentTrades: RecentTradeItem[] = recentTradesRaw.map((t) => ({
    asset: t.entry.asset,
    direction: t.entry.direction,
    entryPrice: t.entry.price,
    exitPrice: t.exit?.price ?? t.entry.price,
    realizedPnl: t.exit?.realizedPnl ?? 0,
    closeReason: t.exit?.closeReason ?? "—",
    openedAt: t.entry.timestamp,
    closedAt: t.exit?.timestamp ?? t.entry.timestamp,
  }));

  // Fill goal progress from recent trades when tracker shows 0 (e.g. after restart) so UI shows progress as soon as we have trades
  let goalProgressOut: typeof goalProgress = goalProgress;
  if (goalProgressOut != null && recentTrades.length > 0 && goalTargets) {
    const now = new Date();
    const todayStart = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    let todayPnl = 0;
    let todayTrades = 0;
    let monthPnl = 0;
    for (const t of recentTrades) {
      if (t.closedAt >= monthStart) {
        monthPnl += t.realizedPnl;
        if (t.closedAt >= todayStart) {
          todayPnl += t.realizedPnl;
          todayTrades += 1;
        }
      }
    }
    const dailyTarget = goalTargets.daily;
    const monthlyTarget = goalTargets.monthly;
    if (
      (goalProgressOut.daily.current === 0 && todayPnl !== 0) ||
      (goalProgressOut.daily.trades === 0 && todayTrades > 0)
    ) {
      goalProgressOut = {
        ...goalProgressOut,
        daily: {
          ...goalProgressOut.daily,
          current: Math.round(todayPnl),
          pct: Math.round((todayPnl / dailyTarget) * 100),
          remaining: Math.round(dailyTarget - todayPnl),
          trades: todayTrades,
          pace:
            todayPnl >= dailyTarget * 0.1
              ? "ahead"
              : todayPnl < -dailyTarget * 0.1
                ? "behind"
                : "on-track",
          paceAmount: Math.round(
            todayPnl -
              (now.getUTCHours() + now.getUTCMinutes() / 60) *
                (dailyTarget / 24),
          ),
        },
      };
    }
    if (goalProgressOut.monthly.current === 0 && monthPnl !== 0) {
      goalProgressOut = {
        ...goalProgressOut,
        monthly: {
          ...goalProgressOut.monthly,
          current: Math.round(monthPnl),
          pct: Math.round((monthPnl / monthlyTarget) * 100),
          remaining: Math.round(monthlyTarget - monthPnl),
          status:
            monthPnl >= monthlyTarget * 0.1
              ? "ahead"
              : monthPnl < -monthlyTarget * 0.1
                ? "behind"
                : "on-track",
        },
      };
    }
  }

  return {
    openPositions,
    portfolio,
    recentNoTrades,
    recentMLInfluences,
    mlStatus,
    goalProgress: goalProgressOut,
    goalTargets,
    signalStatus,
    banditSummary,
    recentClosedTrades,
    recentTrades,
    updatedAt: Date.now(),
  };
}
