import type { IAgentRuntime } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type { VinceProofCapitalAllocatorService } from "../services/vinceProofCapitalAllocator.service";
import type { VinceUpliftEvaluatorService } from "../services/vinceUpliftEvaluator.service";
import type { VinceDataSufficiencyService } from "../services/vinceDataSufficiency.service";
import type { VinceMLInferenceService } from "../services/mlInference.service";
import type { VinceFeatureStoreService } from "../services/vinceFeatureStore.service";
import type { VinceWeightBanditService } from "../services/weightBandit.service";

export type NorthStarStatus = "on_track" | "at_risk" | "blocked";

export interface RecursiveNorthStarPillar {
  score: number;
  status: NorthStarStatus;
  highlights: string[];
  blockers: string[];
}

export interface RecursiveNorthStarResponse {
  scorecard: {
    overallScore: number;
    status: NorthStarStatus;
  };
  pillars: {
    recursion: RecursiveNorthStarPillar;
    ml: RecursiveNorthStarPillar;
    synergy: RecursiveNorthStarPillar;
  };
  metrics: {
    recursion: {
      sufficiencyGrade: "LOW" | "MEDIUM" | "HIGH";
      sufficiencySampleCount: number;
      blockingTaskCount: number;
      allocatorStage: string;
      allocatorMode: string;
    };
    ml: {
      modelsLoaded: string[];
      modelCount: number;
      signalQualityThreshold: number;
      completeTrades30d: number;
      avoidedDecisions30d: number;
      banditReady: boolean;
      banditTradesProcessed: number;
    };
    synergy: {
      upliftDelta: number;
      causalPromotionEligible: boolean;
      causalConfidenceScore: number;
      causalPairCount: number;
      minSamplesPerArm: number;
    };
  };
  northStar: {
    fullRecursionReady: boolean;
    onePlusOneEqThreeReady: boolean;
    why: string[];
  };
  trend?: {
    windows: Array<{
      windowDays: number;
      overallScore: number;
      recursionScore: number;
      mlScore: number;
      synergyScore: number;
    }>;
    deltaVs7d: number;
    history: Array<{
      at: number;
      overallScore: number;
      recursionScore: number;
      mlScore: number;
      synergyScore: number;
    }>;
  };
  lastUpdated: number;
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));
const HISTORY_FILE = path.join(
  process.cwd(),
  ".elizadb",
  "vince-paper-bot",
  "recursive-north-star-history.json",
);
const HISTORY_MAX_POINTS = 240;
const HISTORY_MIN_APPEND_MS = 30 * 60 * 1000;
const HISTORY_MIN_SCORE_DELTA = 1;

const toStatus = (score: number): NorthStarStatus => {
  if (score >= 75) return "on_track";
  if (score >= 50) return "at_risk";
  return "blocked";
};

const gradeScore = (grade: "LOW" | "MEDIUM" | "HIGH"): number => {
  if (grade === "HIGH") return 100;
  if (grade === "MEDIUM") return 70;
  return 35;
};

type HistoryPoint = {
  at: number;
  overallScore: number;
  recursionScore: number;
  mlScore: number;
  synergyScore: number;
};

function readHistory(): HistoryPoint[] {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(raw) as HistoryPoint[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p) =>
          p &&
          Number.isFinite(p.at) &&
          Number.isFinite(p.overallScore) &&
          Number.isFinite(p.recursionScore) &&
          Number.isFinite(p.mlScore) &&
          Number.isFinite(p.synergyScore),
      )
      .sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

function writeHistory(points: HistoryPoint[]): void {
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(
      HISTORY_FILE,
      JSON.stringify(points.slice(-HISTORY_MAX_POINTS), null, 2),
      "utf-8",
    );
  } catch {
    // non-fatal: history is observability only
  }
}

function appendHistoryPoint(next: HistoryPoint): HistoryPoint[] {
  const history = readHistory();
  const last = history[history.length - 1];
  const shouldAppend =
    !last ||
    next.at - last.at >= HISTORY_MIN_APPEND_MS ||
    Math.abs(next.overallScore - last.overallScore) >= HISTORY_MIN_SCORE_DELTA;
  const updated = shouldAppend ? [...history, next] : history;
  if (shouldAppend) writeHistory(updated);
  return updated.slice(-HISTORY_MAX_POINTS);
}

export async function buildRecursiveNorthStarResponse(
  runtime: IAgentRuntime,
): Promise<RecursiveNorthStarResponse> {
  const upliftService = runtime.getService(
    "VINCE_UPLIFT_EVALUATOR_SERVICE",
  ) as VinceUpliftEvaluatorService | null;
  const sufficiencyService = runtime.getService(
    "VINCE_DATA_SUFFICIENCY_SERVICE",
  ) as VinceDataSufficiencyService | null;
  const allocatorService = runtime.getService(
    "VINCE_PROOF_CAPITAL_ALLOCATOR_SERVICE",
  ) as VinceProofCapitalAllocatorService | null;
  const mlService = runtime.getService(
    "VINCE_ML_INFERENCE_SERVICE",
  ) as VinceMLInferenceService | null;
  const featureStore = runtime.getService(
    "VINCE_FEATURE_STORE_SERVICE",
  ) as VinceFeatureStoreService | null;
  const bandit = runtime.getService(
    "VINCE_WEIGHT_BANDIT_SERVICE",
  ) as VinceWeightBanditService | null;

  if (mlService?.ensureModelsLoaded) {
    await mlService.ensureModelsLoaded();
  }
  const mlStatus = mlService?.getMLStatus?.() ?? {
    modelsLoaded: [],
    signalQualityThreshold: 0.6,
    tpLevelIndices: [],
    tpLevelSkipped: null,
    suggestedMinStrength: null,
    suggestedMinConfidence: null,
  };
  const banditStatus = bandit?.getBanditStatus?.() ?? {
    isReady: false,
    totalTradesProcessed: 0,
  };
  const allocator = allocatorService?.getLatestSummary?.() ?? null;
  const computeScoresForWindow = async (windowDays: number) => {
    const sufficiency = sufficiencyService?.getSnapshot?.(windowDays) ?? {
      grade: "LOW" as const,
      sampleCount: 0,
    };
    const uplift = upliftService?.getSnapshot?.(windowDays) ?? null;
    const causal =
      upliftService?.getCausalSnapshot?.({
        windowDays,
        minimumEffect: 0.02,
        minimumSamplesPerArm: 12,
      }) ?? null;
    const completeTrades = featureStore
      ? await featureStore.getCompleteRecordCount(windowDays)
      : 0;
    const onnxStage = uplift?.byStage?.find((s) => s.stage === "onnx_enabled");
    const swarmStage = uplift?.byStage?.find(
      (s) => s.stage === "onnx_plus_swarm",
    );
    const upliftDelta = (swarmStage?.avgPnl ?? 0) - (onnxStage?.avgPnl ?? 0);
    const minSamplesPerArm = causal?.pairs?.length
      ? Math.min(
          ...causal.pairs.map((pair) =>
            Math.min(pair.controlCount, pair.treatmentCount),
          ),
        )
      : 0;
    const causalConfidenceScore = causal?.pairs?.length
      ? Math.round(
          causal.pairs.reduce((sum, pair) => sum + pair.confidenceScore, 0) /
            causal.pairs.length,
        )
      : 0;

    const recursionPenalty =
      (sufficiency.grade === "LOW" ? 2 : 0) +
      (allocator?.rolloutStage === "observe_only" ? 1 : 0);
    const mlPenalty =
      (mlStatus.modelsLoaded.length === 0 ? 1 : 0) +
      (completeTrades < 20 ? 1 : 0);
    const synergyPenalty =
      (upliftDelta <= 0 ? 1 : 0) + (minSamplesPerArm < 12 ? 1 : 0);
    const recursionScore = clamp(
      gradeScore(sufficiency.grade) * 0.45 +
        (allocator?.rolloutStage === "one_sleeve_auto_apply"
          ? 100
          : allocator?.rolloutStage === "recommendation"
            ? 75
            : 45) *
          0.3 +
        clamp((completeTrades / 60) * 100) * 0.25 -
        recursionPenalty * 4,
    );
    const mlScore = clamp(
      (mlStatus.modelsLoaded.length >= 3
        ? 100
        : mlStatus.modelsLoaded.length > 0
          ? 65
          : 30) *
        0.4 +
        clamp((completeTrades / 90) * 100) * 0.3 +
        (banditStatus.isReady ? 100 : 45) * 0.3 -
        mlPenalty * 4,
    );
    const synergyScore = clamp(
      clamp(50 + upliftDelta * 2) * 0.45 +
        causalConfidenceScore * 0.35 +
        clamp((minSamplesPerArm / 20) * 100) * 0.2 -
        synergyPenalty * 4,
    );
    const overallScore = Math.round(
      recursionScore * 0.34 + mlScore * 0.33 + synergyScore * 0.33,
    );
    return {
      sufficiency,
      uplift,
      causal,
      completeTrades,
      upliftDelta,
      minSamplesPerArm,
      causalConfidenceScore,
      recursionScore,
      mlScore,
      synergyScore,
      overallScore,
    };
  };

  const [window30, window7] = await Promise.all([
    computeScoresForWindow(30),
    computeScoresForWindow(7),
  ]);
  const sufficiency = window30.sufficiency;
  const uplift = window30.uplift;
  const causal = window30.causal;
  const completeTrades30d = window30.completeTrades;
  const upliftDelta = window30.upliftDelta;
  const minSamplesPerArm = window30.minSamplesPerArm;
  const causalConfidenceScore = window30.causalConfidenceScore;
  const avoidedDecisions30d = featureStore
    ? await featureStore.getAvoidedRecordCount(30)
    : 0;
  const sufficiencyTasks = sufficiencyService?.getBlockingTasks?.(30) ?? [];

  const recursionHighlights: string[] = [
    `${sufficiency.grade} sufficiency (${sufficiency.sampleCount} closed rows, 30d)`,
  ];
  const recursionBlockers = [
    ...sufficiencyTasks.slice(0, 5).map((task) => task.blocker),
  ];
  if (!allocator) {
    recursionBlockers.push("allocator_summary_unavailable");
  } else if (allocator.rolloutStage === "observe_only") {
    recursionBlockers.push("allocator_still_in_observe_only");
  } else {
    recursionHighlights.push(
      `Allocator in ${allocator.rolloutStage} (${allocator.reason})`,
    );
  }

  const mlHighlights: string[] = [
    `${mlStatus.modelsLoaded.length} ONNX models loaded`,
    `${completeTrades30d} complete trades in 30d`,
    `Signal quality threshold ${mlStatus.signalQualityThreshold.toFixed(2)}`,
  ];
  const mlBlockers: string[] = [];
  if (mlStatus.modelsLoaded.length === 0) mlBlockers.push("no_models_loaded");
  if (completeTrades30d < 20) mlBlockers.push("not_enough_complete_trades_30d");
  if (!banditStatus.isReady) mlBlockers.push("weight_bandit_not_ready");

  const synergyHighlights: string[] = [
    `Swarm uplift vs ONNX baseline: ${upliftDelta >= 0 ? "+" : ""}${upliftDelta.toFixed(2)} avg PnL`,
    `Causal confidence score: ${(causal?.pairs?.length ? Math.round(causal.pairs.reduce((sum, p) => sum + p.confidenceScore, 0) / causal.pairs.length) : 0).toFixed(0)}`,
  ];
  const synergyBlockers: string[] = [];
  if (upliftDelta <= 0) synergyBlockers.push("swarm_not_beating_single_agent");
  if (!causal?.promotionEligible)
    synergyBlockers.push("causal_promotion_not_eligible");
  if ((causal?.pairs?.length ?? 0) === 0)
    synergyBlockers.push("no_causal_pairs");
  if (minSamplesPerArm < 12)
    synergyBlockers.push("causal_sample_depth_below_12");

  const recursionScore = clamp(
    window30.recursionScore - recursionBlockers.length * 2,
  );
  const mlScore = clamp(window30.mlScore - mlBlockers.length * 2);
  const synergyScore = clamp(
    window30.synergyScore - synergyBlockers.length * 2,
  );

  const overallScore = Math.round(
    recursionScore * 0.34 + mlScore * 0.33 + synergyScore * 0.33,
  );

  const recursionStatus = toStatus(recursionScore);
  const mlStatusTag = toStatus(mlScore);
  const synergyStatus = toStatus(synergyScore);

  const fullRecursionReady =
    recursionScore >= 75 &&
    mlScore >= 70 &&
    recursionBlockers.length === 0 &&
    mlBlockers.length === 0;
  const onePlusOneEqThreeReady =
    synergyScore >= 75 &&
    upliftDelta > 0 &&
    (causal?.promotionEligible ?? false) &&
    synergyBlockers.length === 0;

  const why: string[] = [];
  if (fullRecursionReady) {
    why.push(
      "Recursive loop is healthy across sufficiency, allocator, and ML.",
    );
  } else {
    why.push("Recursive loop still has blockers before full autonomy.");
  }
  if (onePlusOneEqThreeReady) {
    why.push(
      "Multi-agent stack is beating single-agent baseline with confidence.",
    );
  } else {
    why.push("1+1=3 still needs stronger uplift and/or causal confidence.");
  }

  const now = Date.now();
  const persistedHistory = appendHistoryPoint({
    at: now,
    overallScore,
    recursionScore: Math.round(recursionScore),
    mlScore: Math.round(mlScore),
    synergyScore: Math.round(synergyScore),
  });

  return {
    scorecard: {
      overallScore,
      status: toStatus(overallScore),
    },
    pillars: {
      recursion: {
        score: Math.round(recursionScore),
        status: recursionStatus,
        highlights: recursionHighlights,
        blockers: recursionBlockers,
      },
      ml: {
        score: Math.round(mlScore),
        status: mlStatusTag,
        highlights: mlHighlights,
        blockers: mlBlockers,
      },
      synergy: {
        score: Math.round(synergyScore),
        status: synergyStatus,
        highlights: synergyHighlights,
        blockers: synergyBlockers,
      },
    },
    metrics: {
      recursion: {
        sufficiencyGrade: sufficiency.grade,
        sufficiencySampleCount: sufficiency.sampleCount,
        blockingTaskCount: sufficiencyTasks.length,
        allocatorStage: allocator?.rolloutStage ?? "observe_only",
        allocatorMode: allocator?.mode ?? "observe_only",
      },
      ml: {
        modelsLoaded: mlStatus.modelsLoaded,
        modelCount: mlStatus.modelsLoaded.length,
        signalQualityThreshold: mlStatus.signalQualityThreshold,
        completeTrades30d,
        avoidedDecisions30d,
        banditReady: Boolean(banditStatus.isReady),
        banditTradesProcessed: Number(banditStatus.totalTradesProcessed ?? 0),
      },
      synergy: {
        upliftDelta,
        causalPromotionEligible: Boolean(causal?.promotionEligible),
        causalConfidenceScore,
        causalPairCount: causal?.pairs?.length ?? 0,
        minSamplesPerArm,
      },
    },
    northStar: {
      fullRecursionReady,
      onePlusOneEqThreeReady,
      why,
    },
    trend: {
      windows: [
        {
          windowDays: 7,
          overallScore: window7.overallScore,
          recursionScore: Math.round(window7.recursionScore),
          mlScore: Math.round(window7.mlScore),
          synergyScore: Math.round(window7.synergyScore),
        },
        {
          windowDays: 30,
          overallScore: window30.overallScore,
          recursionScore: Math.round(window30.recursionScore),
          mlScore: Math.round(window30.mlScore),
          synergyScore: Math.round(window30.synergyScore),
        },
      ],
      deltaVs7d: Math.round(window30.overallScore - window7.overallScore),
      history: persistedHistory,
    },
    lastUpdated: now,
  };
}
