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
  updatedAt: number;
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

  return {
    openPositions,
    portfolio,
    recentNoTrades,
    recentMLInfluences,
    mlStatus,
    goalProgress,
    goalTargets,
    signalStatus,
    banditSummary,
    updatedAt: Date.now(),
  };
}
