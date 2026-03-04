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
      allocatorSummaryAvailable: boolean;
      allocatorSummaryStale: boolean;
      allocatorSummaryAgeMs: number | null;
      allocatorSummarySource: "live" | "history" | "none";
      coverageVelocity: {
        missingClosedRowsTo20: number;
        missingDistinctDaysTo7: number;
        missingRegimeDepthTo5: number;
      };
      sufficiencyBlockingReasons: string[];
      sufficiencyBlockersByDimension: Record<string, string>;
      sufficiencyActions: string[];
    };
    ml: {
      modelsLoaded: string[];
      modelCount: number;
      signalQualityThreshold: number;
      completeTrades30d: number;
      avoidedDecisions30d: number;
      banditReady: boolean;
      banditTradesProcessed: number;
      readinessReasons: string[];
      missingModelFiles: string[];
      modelsDir: string;
      onnxRuntimeAvailable: boolean;
      lastLoadError: string | null;
      lastLoadErrorCode: string | null;
      banditInitError: string | null;
      runtimeProbe: {
        checkedAt: number;
        importOk: boolean;
        cpuBackendOk: boolean;
        modelSessionOk: boolean;
        modelPathChecked: string | null;
        code: string | null;
        message: string | null;
        providerAttempts: Array<{
          strategy: "cpu_explicit" | "default";
          success: boolean;
          error: string | null;
          code: string | null;
        }>;
      } | null;
      runtimeFingerprint: {
        capturedAt: number;
        execPath: string;
        releaseName: string;
        nodeVersion: string;
        napiVersion: string | null;
        nodeOptions: string | null;
        nativeAddonsDisabled: boolean;
        recoveryCooldownUntil: number | null;
      } | null;
      providerAttemptsByModel: Record<
        string,
        Array<{
          strategy: "cpu_explicit" | "default";
          success: boolean;
          error: string | null;
          code: string | null;
        }>
      >;
    };
    synergy: {
      upliftDelta: number;
      causalPromotionEligible: boolean;
      causalConfidenceScore: number;
      causalPairCount: number;
      minSamplesPerArm: number;
      nearPassDepthRatio: number;
      nearPassEffectRatio: number;
      nearPassBonus: number;
      coverageVelocity: {
        stageDeficitTotal: number;
        pairDeficitTotal: number;
        minSamplesPerArmDeficit: number;
      };
      promotionReasons: string[];
      causalPairs: Array<{
        label: string;
        controlStage: string;
        treatmentStage: string;
        controlCount: number;
        treatmentCount: number;
        upliftDelta: number;
        ciLower: number;
        ciUpper: number;
        confidenceScore: number;
        smoothedUpliftDelta?: number;
        smoothedCiLower?: number;
        smoothedConfidenceScore?: number;
        passed: boolean;
        failureReason?: string;
      }>;
      stageDepth: {
        minimumSamplesPerArm: number;
        allStagesReady: boolean;
        perStage: Array<{
          stage: string;
          count: number;
          deficitToMin: number;
        }>;
        pairDepth: Array<{
          label: string;
          controlStage: string;
          treatmentStage: string;
          controlCount: number;
          treatmentCount: number;
          minArmSamples: number;
          deficitToMin: number;
        }>;
      };
    };
  };
  northStar: {
    fullRecursionReady: boolean;
    onePlusOneEqThreeReady: boolean;
    why: string[];
  };
  milestones: {
    recursion3d: {
      pass: boolean;
      observedPoints: number;
      target: string;
    };
    ml3d: {
      pass: boolean;
      observedPoints: number;
      target: string;
    };
    synergy7d: {
      pass: boolean;
      observedPoints: number;
      target: string;
    };
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

export interface RecursiveNorthStarOperatorStatus {
  blockers: {
    recursion: string[];
    ml: string[];
    synergy: string[];
  };
  triage: {
    ml: {
      readinessReasons: string[];
      lastLoadError: string | null;
      lastLoadErrorCode: string | null;
      probe: RecursiveNorthStarResponse["metrics"]["ml"]["runtimeProbe"];
      runtimeFingerprint: RecursiveNorthStarResponse["metrics"]["ml"]["runtimeFingerprint"];
      nextActions: string[];
      prioritizedNextActions: Array<{
        priority: 1 | 2 | 3;
        label: "P1" | "P2" | "P3";
        reasonCode: string;
        action: string;
      }>;
    };
    recursion: {
      sufficiencyTasks: string[];
      nextActions: string[];
      prioritizedNextActions: Array<{
        priority: 1 | 2 | 3;
        label: "P1" | "P2" | "P3";
        reasonCode: string;
        action: string;
      }>;
    };
    synergy: {
      promotionReasons: string[];
      stageDeficits: Array<{
        stage: string;
        deficitToMin: number;
      }>;
      pairDeficits: Array<{
        label: string;
        deficitToMin: number;
      }>;
      nextActions: string[];
      prioritizedNextActions: Array<{
        priority: 1 | 2 | 3;
        label: "P1" | "P2" | "P3";
        reasonCode: string;
        action: string;
      }>;
    };
  };
  weeklySnapshot: {
    available: boolean;
    path: string | null;
    capturedAtMs: number | null;
  };
  generatedAt: number;
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
const WEEKLY_SNAPSHOT_DIR = path.join(
  process.cwd(),
  "docs",
  "standup",
  "recursive-snapshots",
);
const SYNERGY_MINIMUM_EFFECT = 0.015;
const SYNERGY_MINIMUM_SAMPLES_PER_ARM = 10;
const BLOCKER_SCORE_DEDUCTION = 1.5;
const PILLAR_PENALTY_WEIGHT = 3.5;

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

function getLatestWeeklySnapshotMeta(): {
  available: boolean;
  path: string | null;
  capturedAtMs: number | null;
} {
  try {
    if (!fs.existsSync(WEEKLY_SNAPSHOT_DIR)) {
      return { available: false, path: null, capturedAtMs: null };
    }
    const files = fs
      .readdirSync(WEEKLY_SNAPSHOT_DIR)
      .filter((name) => name.endsWith(".json"));
    if (files.length === 0) {
      return { available: false, path: null, capturedAtMs: null };
    }
    let latest: { name: string; mtimeMs: number } | null = null;
    for (const name of files) {
      const fullPath = path.join(WEEKLY_SNAPSHOT_DIR, name);
      const stat = fs.statSync(fullPath);
      if (!latest || stat.mtimeMs > latest.mtimeMs) {
        latest = { name, mtimeMs: stat.mtimeMs };
      }
    }
    if (!latest) return { available: false, path: null, capturedAtMs: null };
    return {
      available: true,
      path: path.join("docs", "standup", "recursive-snapshots", latest.name),
      capturedAtMs: Math.round(latest.mtimeMs),
    };
  } catch {
    return { available: false, path: null, capturedAtMs: null };
  }
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
  const mlStatusRaw = mlService?.getMLStatus?.() ?? {};
  const mlStatus = {
    modelsLoaded: [],
    signalQualityThreshold: 0.6,
    tpLevelIndices: [],
    tpLevelSkipped: null,
    suggestedMinStrength: null,
    suggestedMinConfidence: null,
    readinessReasons: ["ml_service_unavailable"],
    missingModelFiles: [],
    modelsDir: "",
    onnxRuntimeAvailable: false,
    lastLoadError: null,
    lastLoadErrorCode: null,
    runtimeProbe: null,
    runtimeFingerprint: null,
    providerAttemptsByModel: {},
    ...mlStatusRaw,
  };
  const banditStatus = bandit?.getBanditStatus?.() ?? {
    isReady: false,
    totalTradesProcessed: 0,
    initError: "bandit_service_unavailable",
  };
  let allocatorMeta =
    allocatorService?.getLatestSummaryWithFallback?.() ?? null;
  let allocator =
    allocatorMeta?.summary ?? allocatorService?.getLatestSummary?.() ?? null;
  if (!allocatorMeta && !allocator && allocatorService?.reconcile) {
    try {
      allocator = await allocatorService.reconcile();
      allocatorMeta =
        allocatorService?.getLatestSummaryWithFallback?.() ??
        (allocator
          ? {
              summary: allocator,
              source: "live" as const,
              stale: false,
              ageMs: 0,
            }
          : null);
    } catch {
      // Best-effort warm-up; keep blocker behavior when allocator cannot reconcile.
    }
  }
  const allocatorSummaryStale = Boolean(allocatorMeta?.stale);
  const allocatorSummaryAgeMs = allocatorMeta?.ageMs ?? null;
  const allocatorSummarySource = allocatorMeta?.source ?? "none";
  const computeScoresForWindow = async (windowDays: number) => {
    const sufficiency = sufficiencyService?.getSnapshot?.(windowDays) ?? {
      grade: "LOW" as const,
      sampleCount: 0,
      blockingReasons: [],
      blockersByDimension: {},
    };
    const uplift = upliftService?.getSnapshot?.(windowDays) ?? null;
    const causal =
      upliftService?.getCausalSnapshot?.({
        windowDays,
        minimumEffect: SYNERGY_MINIMUM_EFFECT,
        minimumSamplesPerArm: SYNERGY_MINIMUM_SAMPLES_PER_ARM,
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
          causal.pairs.reduce(
            (sum, pair) =>
              sum + (pair.smoothedConfidenceScore ?? pair.confidenceScore),
            0,
          ) / causal.pairs.length,
        )
      : 0;
    const minCiLower = causal?.pairs?.length
      ? Math.min(
          ...causal.pairs.map((pair) => pair.smoothedCiLower ?? pair.ciLower),
        )
      : 0;
    const nearPassDepthRatio = clamp(
      minSamplesPerArm / SYNERGY_MINIMUM_SAMPLES_PER_ARM,
      0,
      1,
    );
    const nearPassEffectRatio = clamp(
      minCiLower / SYNERGY_MINIMUM_EFFECT,
      0,
      1,
    );
    const nearPassBonus =
      upliftDelta > 0
        ? (nearPassDepthRatio * 0.6 + nearPassEffectRatio * 0.4) * 6
        : 0;

    const recursionPenalty =
      (sufficiency.grade === "LOW" ? 2 : 0) +
      (allocator?.rolloutStage === "observe_only" ? 1 : 0);
    const mlPenalty =
      (mlStatus.modelsLoaded.length === 0 ? 1 : 0) +
      (completeTrades < 20 ? 1 : 0);
    const synergyPenalty =
      (upliftDelta <= 0 ? 1 : 0) +
      (minSamplesPerArm < SYNERGY_MINIMUM_SAMPLES_PER_ARM ? 1 : 0);
    const recursionScore = clamp(
      gradeScore(sufficiency.grade) * 0.45 +
        (allocator?.rolloutStage === "one_sleeve_auto_apply"
          ? 100
          : allocator?.rolloutStage === "recommendation"
            ? 75
            : 45) *
          0.3 +
        clamp((completeTrades / 60) * 100) * 0.25 -
        recursionPenalty * PILLAR_PENALTY_WEIGHT,
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
        mlPenalty * PILLAR_PENALTY_WEIGHT,
    );
    const synergyScore = clamp(
      clamp(50 + upliftDelta * 2) * 0.45 +
        causalConfidenceScore * 0.35 +
        clamp((minSamplesPerArm / 20) * 100) * 0.2 +
        nearPassBonus -
        synergyPenalty * PILLAR_PENALTY_WEIGHT,
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
      nearPassDepthRatio,
      nearPassEffectRatio,
      nearPassBonus,
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
  const stageDepth =
    upliftService?.getCausalStageDepthSummary?.(
      30,
      SYNERGY_MINIMUM_SAMPLES_PER_ARM,
    ) ??
    ({
      minimumSamplesPerArm: SYNERGY_MINIMUM_SAMPLES_PER_ARM,
      allStagesReady: false,
      perStage: [],
      pairDepth: [],
    } as const);
  const completeTrades30d = window30.completeTrades;
  const upliftDelta = window30.upliftDelta;
  const minSamplesPerArm = window30.minSamplesPerArm;
  const causalConfidenceScore = window30.causalConfidenceScore;
  const nearPassDepthRatio = window30.nearPassDepthRatio;
  const nearPassEffectRatio = window30.nearPassEffectRatio;
  const nearPassBonus = window30.nearPassBonus;
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
  if (allocator) {
    const ageMinutes =
      allocatorSummaryAgeMs != null
        ? Math.round(allocatorSummaryAgeMs / 60000)
        : 0;
    recursionHighlights.push(
      `Allocator summary ${allocatorSummaryStale ? "stale" : "fresh"} (${allocatorSummarySource}, ${ageMinutes}m old)`,
    );
  }

  const mlHighlights: string[] = [
    `${mlStatus.modelsLoaded.length} ONNX models loaded`,
    `${completeTrades30d} complete trades in 30d`,
    `Signal quality threshold ${mlStatus.signalQualityThreshold.toFixed(2)}`,
  ];
  if (mlStatus.readinessReasons.length > 0) {
    mlHighlights.push(`ML readiness: ${mlStatus.readinessReasons.join(", ")}`);
  }
  const mlBlockers: string[] = [];
  if (mlStatus.modelsLoaded.length === 0) mlBlockers.push("no_models_loaded");
  if (completeTrades30d < 20) mlBlockers.push("not_enough_complete_trades_30d");
  if (!banditStatus.isReady) mlBlockers.push("weight_bandit_not_ready");

  const synergyHighlights: string[] = [
    `Swarm uplift vs ONNX baseline: ${upliftDelta >= 0 ? "+" : ""}${upliftDelta.toFixed(2)} avg PnL`,
    `Causal confidence score: ${(causal?.pairs?.length ? Math.round(causal.pairs.reduce((sum, p) => sum + p.confidenceScore, 0) / causal.pairs.length) : 0).toFixed(0)}`,
    `Causal promotion eligible: ${(causal?.promotionEligible ?? false) ? "yes" : "no"} (min effect ${(SYNERGY_MINIMUM_EFFECT * 100).toFixed(1)}%)`,
    `Per-arm sample depth: ${minSamplesPerArm}/${SYNERGY_MINIMUM_SAMPLES_PER_ARM} target`,
    `Near-pass progress: depth ${(nearPassDepthRatio * 100).toFixed(0)}% · effect ${(nearPassEffectRatio * 100).toFixed(0)}%`,
  ];
  const synergyBlockers: string[] = [];
  if (upliftDelta <= 0) synergyBlockers.push("swarm_not_beating_single_agent");
  if (!causal?.promotionEligible)
    synergyBlockers.push("causal_promotion_not_eligible");
  if ((causal?.pairs?.length ?? 0) === 0)
    synergyBlockers.push("no_causal_pairs");
  if (minSamplesPerArm < SYNERGY_MINIMUM_SAMPLES_PER_ARM)
    synergyBlockers.push("causal_sample_depth_below_target");

  const recursionScore = clamp(
    window30.recursionScore -
      recursionBlockers.length * BLOCKER_SCORE_DEDUCTION,
  );
  const mlScore = clamp(
    window30.mlScore - mlBlockers.length * BLOCKER_SCORE_DEDUCTION,
  );
  const synergyScore = clamp(
    window30.synergyScore - synergyBlockers.length * BLOCKER_SCORE_DEDUCTION,
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
  const history3d = persistedHistory.filter(
    (point) => now - point.at <= 3 * 24 * 60 * 60 * 1000,
  );
  const history7d = persistedHistory.filter(
    (point) => now - point.at <= 7 * 24 * 60 * 60 * 1000,
  );
  const recursion3dPass =
    recursionBlockers.length === 0 &&
    history3d.length > 0 &&
    history3d.every((point) => point.recursionScore >= 75);
  const ml3dPass =
    mlBlockers.length === 0 &&
    history3d.length > 0 &&
    history3d.every((point) => point.mlScore >= 70);
  const synergy7dPass =
    onePlusOneEqThreeReady &&
    history7d.length > 0 &&
    history7d.every((point) => point.synergyScore >= 75);

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
        allocatorSummaryAvailable: Boolean(allocator),
        allocatorSummaryStale,
        allocatorSummaryAgeMs,
        allocatorSummarySource,
        coverageVelocity: {
          missingClosedRowsTo20: Math.max(
            0,
            20 - Number(sufficiency.sampleCount ?? 0),
          ),
          missingDistinctDaysTo7: Math.max(
            0,
            7 - Number((sufficiency as any).timeCoverageDays ?? 0),
          ),
          missingRegimeDepthTo5: Math.max(
            0,
            5 - Number((sufficiency as any).minRegimeSampleCount ?? 0),
          ),
        },
        sufficiencyBlockingReasons: sufficiency.blockingReasons ?? [],
        sufficiencyBlockersByDimension: sufficiency.blockersByDimension ?? {},
        sufficiencyActions: sufficiencyTasks.map((task) => task.action),
      },
      ml: {
        modelsLoaded: mlStatus.modelsLoaded,
        modelCount: mlStatus.modelsLoaded.length,
        signalQualityThreshold: mlStatus.signalQualityThreshold,
        completeTrades30d,
        avoidedDecisions30d,
        banditReady: Boolean(banditStatus.isReady),
        banditTradesProcessed: Number(banditStatus.totalTradesProcessed ?? 0),
        readinessReasons: mlStatus.readinessReasons ?? [],
        missingModelFiles: mlStatus.missingModelFiles ?? [],
        modelsDir: mlStatus.modelsDir ?? "",
        onnxRuntimeAvailable: Boolean(mlStatus.onnxRuntimeAvailable),
        lastLoadError: mlStatus.lastLoadError ?? null,
        lastLoadErrorCode: mlStatus.lastLoadErrorCode ?? null,
        banditInitError: banditStatus.initError ?? null,
        runtimeProbe: mlStatus.runtimeProbe ?? null,
        runtimeFingerprint: mlStatus.runtimeFingerprint ?? null,
        providerAttemptsByModel: mlStatus.providerAttemptsByModel ?? {},
      },
      synergy: {
        upliftDelta,
        causalPromotionEligible: Boolean(causal?.promotionEligible),
        causalConfidenceScore,
        causalPairCount: causal?.pairs?.length ?? 0,
        minSamplesPerArm,
        nearPassDepthRatio,
        nearPassEffectRatio,
        nearPassBonus,
        coverageVelocity: {
          stageDeficitTotal: stageDepth.perStage.reduce(
            (sum, row) => sum + Math.max(0, row.deficitToMin),
            0,
          ),
          pairDeficitTotal: stageDepth.pairDepth.reduce(
            (sum, row) => sum + Math.max(0, row.deficitToMin),
            0,
          ),
          minSamplesPerArmDeficit: Math.max(
            0,
            SYNERGY_MINIMUM_SAMPLES_PER_ARM - minSamplesPerArm,
          ),
        },
        promotionReasons: causal?.promotionReasons ?? [],
        causalPairs:
          causal?.pairs?.map((pair) => ({
            label: pair.label,
            controlStage: pair.controlStage,
            treatmentStage: pair.treatmentStage,
            controlCount: pair.controlCount,
            treatmentCount: pair.treatmentCount,
            upliftDelta: pair.upliftDelta,
            ciLower: pair.ciLower,
            ciUpper: pair.ciUpper,
            confidenceScore: pair.confidenceScore,
            smoothedUpliftDelta: pair.smoothedUpliftDelta,
            smoothedCiLower: pair.smoothedCiLower,
            smoothedConfidenceScore: pair.smoothedConfidenceScore,
            passed: pair.passed,
            failureReason: pair.failureReason,
          })) ?? [],
        stageDepth: {
          minimumSamplesPerArm: stageDepth.minimumSamplesPerArm,
          allStagesReady: stageDepth.allStagesReady,
          perStage: stageDepth.perStage.map((row) => ({
            stage: row.stage,
            count: row.count,
            deficitToMin: row.deficitToMin,
          })),
          pairDepth: stageDepth.pairDepth.map((row) => ({
            label: row.label,
            controlStage: row.controlStage,
            treatmentStage: row.treatmentStage,
            controlCount: row.controlCount,
            treatmentCount: row.treatmentCount,
            minArmSamples: row.minArmSamples,
            deficitToMin: row.deficitToMin,
          })),
        },
      },
    },
    northStar: {
      fullRecursionReady,
      onePlusOneEqThreeReady,
      why,
    },
    milestones: {
      recursion3d: {
        pass: recursion3dPass,
        observedPoints: history3d.length,
        target: "No recursion blockers and recursion score >= 75 for 3d",
      },
      ml3d: {
        pass: ml3dPass,
        observedPoints: history3d.length,
        target: "No ML blockers and ML score >= 70 for 3d",
      },
      synergy7d: {
        pass: synergy7dPass,
        observedPoints: history7d.length,
        target: "1+1=3 ready and synergy score >= 75 for 7d",
      },
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

export async function buildRecursiveNorthStarOperatorStatus(
  runtime: IAgentRuntime,
): Promise<RecursiveNorthStarOperatorStatus> {
  const snapshot = await buildRecursiveNorthStarResponse(runtime);
  const weeklySnapshot = getLatestWeeklySnapshotMeta();
  const hasMlBlocker = snapshot.pillars.ml.blockers.length > 0;
  const hasRecursionBlocker = snapshot.pillars.recursion.blockers.length > 0;
  const hasSynergyBlocker = snapshot.pillars.synergy.blockers.length > 0;
  const mlReasons = new Set(snapshot.metrics.ml.readinessReasons);
  const recursionBlockers = new Set(snapshot.pillars.recursion.blockers);
  const synergyBlockers = new Set(snapshot.pillars.synergy.blockers);
  const stageDeficits = snapshot.metrics.synergy.stageDepth.perStage
    .filter((row) => row.deficitToMin > 0)
    .sort((a, b) => b.deficitToMin - a.deficitToMin)
    .map((row) => ({ stage: row.stage, deficitToMin: row.deficitToMin }));
  const pairDeficits = snapshot.metrics.synergy.stageDepth.pairDepth
    .filter((row) => row.deficitToMin > 0)
    .sort((a, b) => b.deficitToMin - a.deficitToMin)
    .map((row) => ({ label: row.label, deficitToMin: row.deficitToMin }));
  const toPrioritizedActions = (
    entries: Array<{ action: string; reasonCode: string }>,
  ): Array<{
    priority: 1 | 2 | 3;
    label: "P1" | "P2" | "P3";
    reasonCode: string;
    action: string;
  }> =>
    entries.map((entry, idx) => {
      const priority = (Math.min(idx + 1, 3) as 1 | 2 | 3) ?? 3;
      return {
        priority,
        label: `P${priority}` as "P1" | "P2" | "P3",
        reasonCode: entry.reasonCode,
        action: entry.action,
      };
    });
  const mlNextActions: string[] = [];
  const mlActionEntries: Array<{ action: string; reasonCode: string }> = [];
  if (
    snapshot.pillars.ml.blockers.includes("no_models_loaded") ||
    mlReasons.has("onnxruntime_import_failed") ||
    mlReasons.has("onnxruntime_unavailable")
  ) {
    const action =
      "Restore ONNX runtime first: verify Node LTS runtime, reinstall deps, and confirm modelsLoaded > 0.";
    mlNextActions.push(action);
    mlActionEntries.push({
      action,
      reasonCode: "no_models_loaded_or_runtime_unavailable",
    });
  }
  if (mlReasons.has("onnx_cpu_backend_unavailable")) {
    const action =
      "Backend probe is failing in-process: verify runtimeFingerprint (node, loader, module path) and rerun recursive endpoint after restart.";
    mlNextActions.push(action);
    mlActionEntries.push({
      action,
      reasonCode: "onnx_cpu_backend_unavailable",
    });
  }
  if (mlReasons.has("missing_expected_model_files")) {
    const action =
      "Regenerate or sync missing model artifacts in modelsDir before next ML cycle.";
    mlNextActions.push(action);
    mlActionEntries.push({
      action,
      reasonCode: "missing_expected_model_files",
    });
  }
  if (
    snapshot.metrics.ml.runtimeFingerprint?.recoveryCooldownUntil &&
    snapshot.metrics.ml.runtimeFingerprint.recoveryCooldownUntil > Date.now()
  ) {
    const action =
      "Recovery cooldown is active; wait for cooldown expiry, then trigger a fresh model load probe.";
    mlNextActions.push(action);
    mlActionEntries.push({
      action,
      reasonCode: "onnx_recovery_cooldown_active",
    });
  }
  if (!hasMlBlocker) {
    const action =
      "ML loop is healthy; keep model/runtime checks in daily review and focus effort on recursion + synergy blockers.";
    mlNextActions.push(action);
    mlActionEntries.push({
      action,
      reasonCode: "ml_loop_healthy",
    });
  }

  const recursionNextActions: string[] = [];
  const recursionActionEntries: Array<{ action: string; reasonCode: string }> =
    [];
  if (recursionBlockers.has("sample_count_below_20")) {
    const action = "Increase closed outcomes to at least 20 rows in 30d.";
    recursionNextActions.push(action);
    recursionActionEntries.push({
      action,
      reasonCode: "sample_count_below_20",
    });
  }
  if (recursionBlockers.has("time_coverage_below_7d")) {
    const action =
      "Spread closes across at least 7 distinct days (avoid one-day bursts).";
    recursionNextActions.push(action);
    recursionActionEntries.push({
      action,
      reasonCode: "time_coverage_below_7d",
    });
  }
  if (recursionBlockers.has("regime_depth_below_5")) {
    const action =
      "Balance closes across active regimes so each regime reaches minimum depth >= 5.";
    recursionNextActions.push(action);
    recursionActionEntries.push({
      action,
      reasonCode: "regime_depth_below_5",
    });
  }
  if (recursionBlockers.has("allocator_summary_unavailable")) {
    const action =
      "Restore allocator summary visibility (service health + latest summary persistence).";
    recursionNextActions.push(action);
    recursionActionEntries.push({
      action,
      reasonCode: "allocator_summary_unavailable",
    });
  }
  if (!hasRecursionBlocker) {
    const action =
      "Recursion loop is clear; preserve balanced close cadence to keep sufficiency green.";
    recursionNextActions.push(action);
    recursionActionEntries.push({
      action,
      reasonCode: "recursion_loop_healthy",
    });
  }

  const topPairDeficits = pairDeficits.slice(0, 2).map((row) => row.label);
  const synergyNextActions: string[] = [];
  const synergyActionEntries: Array<{ action: string; reasonCode: string }> =
    [];
  if (synergyBlockers.has("causal_sample_depth_below_target")) {
    const action = `Fill pair depth to >=${SYNERGY_MINIMUM_SAMPLES_PER_ARM} per arm, starting with: ${topPairDeficits.join(", ") || "largest deficit pairs"}.`;
    synergyNextActions.push(action);
    synergyActionEntries.push({
      action,
      reasonCode: "causal_sample_depth_below_target",
    });
  }
  if (synergyBlockers.has("swarm_not_beating_single_agent")) {
    const action =
      "Improve treatment-stage edge so swarm avg PnL stays above ONNX baseline.";
    synergyNextActions.push(action);
    synergyActionEntries.push({
      action,
      reasonCode: "swarm_not_beating_single_agent",
    });
  }
  if (synergyBlockers.has("causal_promotion_not_eligible")) {
    const action = `Raise causal quality (ciLower >= ${SYNERGY_MINIMUM_EFFECT.toFixed(3)} where possible) while keeping upliftDelta positive.`;
    synergyNextActions.push(action);
    synergyActionEntries.push({
      action,
      reasonCode: "causal_promotion_not_eligible",
    });
  }
  if (!hasSynergyBlocker) {
    const action =
      "Synergy proof is clear; maintain balanced stage sampling to protect promotion eligibility.";
    synergyNextActions.push(action);
    synergyActionEntries.push({
      action,
      reasonCode: "synergy_proof_healthy",
    });
  }

  return {
    blockers: {
      recursion: snapshot.pillars.recursion.blockers,
      ml: snapshot.pillars.ml.blockers,
      synergy: snapshot.pillars.synergy.blockers,
    },
    triage: {
      ml: {
        readinessReasons: snapshot.metrics.ml.readinessReasons,
        lastLoadError: snapshot.metrics.ml.lastLoadError,
        lastLoadErrorCode: snapshot.metrics.ml.lastLoadErrorCode,
        probe: snapshot.metrics.ml.runtimeProbe,
        runtimeFingerprint: snapshot.metrics.ml.runtimeFingerprint,
        nextActions: mlNextActions,
        prioritizedNextActions: toPrioritizedActions(mlActionEntries),
      },
      recursion: {
        sufficiencyTasks: snapshot.pillars.recursion.blockers,
        nextActions: recursionNextActions,
        prioritizedNextActions: toPrioritizedActions(recursionActionEntries),
      },
      synergy: {
        promotionReasons: snapshot.metrics.synergy.promotionReasons,
        stageDeficits,
        pairDeficits,
        nextActions: synergyNextActions,
        prioritizedNextActions: toPrioritizedActions(synergyActionEntries),
      },
    },
    weeklySnapshot,
    generatedAt: Date.now(),
  };
}
