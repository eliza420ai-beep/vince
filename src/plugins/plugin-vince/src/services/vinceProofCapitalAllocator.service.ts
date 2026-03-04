import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import { VinceCapitalBucketsService } from "./vinceCapitalBuckets.service";
import type { VinceUpliftEvaluatorService } from "./vinceUpliftEvaluator.service";
import type { VinceDataSufficiencyService } from "./vinceDataSufficiency.service";
import type { VinceSourceQualityService } from "./vinceSourceQuality.service";

type AllocatorMode = "observe_only" | "recommendation" | "auto_apply";

export interface ProofAllocatorSummary {
  generatedAt: number;
  mode: AllocatorMode;
  sufficiencyGrade: "LOW" | "MEDIUM" | "HIGH";
  causalPromotionEligible: boolean;
  causalConfidenceScore: number;
  recommendedMaxSingleTradeUsd: number;
  currentMaxSingleTradeUsd: number;
  applied: boolean;
  rollbackApplied?: boolean;
  rolloutStage: "observe_only" | "recommendation" | "one_sleeve_auto_apply";
  reason: string;
}

export class VinceProofCapitalAllocatorService extends Service {
  static serviceType = "VINCE_PROOF_CAPITAL_ALLOCATOR_SERVICE";
  capabilityDescription =
    "Converts proof metrics into safe paper-bucket allocation adjustments";

  private timer: NodeJS.Timeout | null = null;
  private latestSummary: ProofAllocatorSummary | null = null;
  private readonly historyPath: string;
  private readonly verifiedClaimsPath: string;
  private readonly sufficiencyTasksPath: string;

  constructor(protected runtime: IAgentRuntime) {
    super();
    const base = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);
    this.historyPath = path.join(base, "proof-allocator-history.jsonl");
    this.verifiedClaimsPath = path.join(base, "verified-claims.json");
    this.sufficiencyTasksPath = path.join(base, "sufficiency-tasks.json");
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceProofCapitalAllocatorService> {
    const svc = new VinceProofCapitalAllocatorService(runtime);
    const enabled =
      runtime.getSetting?.("VINCE_PHASE14_PROOF_ENGINE_ENABLED") === true ||
      runtime.getSetting?.("VINCE_PHASE14_PROOF_ENGINE_ENABLED") === "true" ||
      process.env.VINCE_PHASE14_PROOF_ENGINE_ENABLED === "true";
    if (enabled) {
      // Every 6h; allocator is slow-moving and should not thrash.
      svc.timer = setInterval(
        () => {
          void svc.reconcile();
        },
        6 * 60 * 60 * 1000,
      );
      void svc.reconcile();
    }
    return svc;
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getLatestSummary(): ProofAllocatorSummary | null {
    return this.latestSummary;
  }

  async reconcile(): Promise<ProofAllocatorSummary> {
    const modeRaw =
      (this.runtime.getSetting?.("VINCE_PROOF_ALLOCATOR_MODE") as string) ??
      process.env.VINCE_PROOF_ALLOCATOR_MODE ??
      "observe_only";
    const mode: AllocatorMode =
      modeRaw === "auto_apply" || modeRaw === "recommendation"
        ? modeRaw
        : "observe_only";

    const uplift = this.runtime.getService(
      "VINCE_UPLIFT_EVALUATOR_SERVICE",
    ) as VinceUpliftEvaluatorService | null;
    const sufficiency = this.runtime.getService(
      "VINCE_DATA_SUFFICIENCY_SERVICE",
    ) as VinceDataSufficiencyService | null;
    const sourceQuality = this.runtime.getService(
      "VINCE_SOURCE_QUALITY_SERVICE",
    ) as VinceSourceQualityService | null;

    const upliftSnap = uplift?.getSnapshot?.(30);
    const causalMinEffect = Number(
      this.runtime.getSetting?.("VINCE_PHASE15_CAUSAL_MIN_EFFECT") ??
        process.env.VINCE_PHASE15_CAUSAL_MIN_EFFECT ??
        0.02,
    );
    const causalMinSamples = Number(
      this.runtime.getSetting?.("VINCE_PHASE15_CAUSAL_MIN_SAMPLES_PER_ARM") ??
        process.env.VINCE_PHASE15_CAUSAL_MIN_SAMPLES_PER_ARM ??
        12,
    );
    const causal = uplift?.getCausalSnapshot?.({
      windowDays: 30,
      minimumEffect: causalMinEffect,
      minimumSamplesPerArm: causalMinSamples,
    });
    const sufficiencySnap = sufficiency?.getSnapshot?.(30);
    const sourceSnap = sourceQuality?.getSnapshot?.(30);
    const grade = sufficiencySnap?.grade ?? "LOW";

    const bucketSvc = VinceCapitalBucketsService.getInstance();
    const paper = bucketSvc.getBucket("paper");
    const currentCap = paper.maxSingleTradeUsd;
    const onnxStage = upliftSnap?.byStage.find(
      (s) => s.stage === "onnx_enabled",
    );
    const swarmStage = upliftSnap?.byStage.find(
      (s) => s.stage === "onnx_plus_swarm",
    );
    const signalEdge = (swarmStage?.avgPnl ?? 0) - (onnxStage?.avgPnl ?? 0);
    const highQualitySources =
      sourceSnap?.sources.filter((s) => s.qualityScore >= 70).length ?? 0;
    const causalConfidenceScore = Math.round(
      (causal?.pairs?.reduce((sum, p) => sum + p.confidenceScore, 0) ?? 0) /
        Math.max(1, causal?.pairs?.length ?? 0),
    );
    const causalPromotionEligible = causal?.promotionEligible === true;

    let recommended = currentCap;
    let reason = "no_change";
    if (grade === "LOW") {
      recommended = Math.max(2000, Math.round(currentCap * 0.9));
      reason = "low_sufficiency_reduce_risk";
    } else if (
      signalEdge > 0 &&
      highQualitySources >= 2 &&
      causalPromotionEligible
    ) {
      recommended = Math.min(25000, Math.round(currentCap * 1.05));
      reason = "validated_uplift_increase_risk";
    } else if (signalEdge < 0 || !causalPromotionEligible) {
      recommended = Math.max(2000, Math.round(currentCap * 0.95));
      reason = !causalPromotionEligible
        ? "causal_confidence_failed_reduce_risk"
        : "negative_uplift_reduce_risk";
    }

    let applied = false;
    let rollbackApplied = false;
    if (mode === "auto_apply") {
      const minGradeRaw =
        (this.runtime.getSetting?.(
          "VINCE_PROOF_MIN_SUFFICIENCY_GRADE",
        ) as string) ??
        process.env.VINCE_PROOF_MIN_SUFFICIENCY_GRADE ??
        "MEDIUM";
      const minGrade = minGradeRaw === "HIGH" ? "HIGH" : "MEDIUM";
      const gradeOk =
        minGrade === "HIGH"
          ? grade === "HIGH"
          : grade === "MEDIUM" || grade === "HIGH";
      if (!gradeOk && recommended > currentCap) {
        recommended = currentCap;
        reason = "blocked_low_sufficiency_for_increase";
      }
      if (!causalPromotionEligible && recommended > currentCap) {
        recommended = currentCap;
        reason = "blocked_causal_confidence_for_increase";
      }
      if (recommended !== currentCap) {
        bucketSvc.updateBucketConfig("paper", {
          maxSingleTradeUsd: recommended,
        });
        applied = true;
      }
      // Rollback-aware guard: if causal confidence failed and last action increased risk, revert one step.
      if (!causalPromotionEligible) {
        const prior = this.getLastHistoryEntry();
        if (
          prior &&
          prior.recommendedMaxSingleTradeUsd > prior.currentMaxSingleTradeUsd
        ) {
          const rollbackTarget = Math.max(2000, prior.currentMaxSingleTradeUsd);
          bucketSvc.updateBucketConfig("paper", {
            maxSingleTradeUsd: rollbackTarget,
          });
          rollbackApplied = true;
          applied = true;
          recommended = rollbackTarget;
          reason = "rollback_on_causal_failure";
        }
      }
      const sourceEnabled =
        this.runtime.getSetting?.("VINCE_SOURCE_QUALITY_ENABLED") === true ||
        this.runtime.getSetting?.("VINCE_SOURCE_QUALITY_ENABLED") === "true" ||
        process.env.VINCE_SOURCE_QUALITY_ENABLED === "true";
      if (sourceEnabled) {
        await sourceQuality?.applyRecommendations?.(30);
      }
    }

    const summary: ProofAllocatorSummary = {
      generatedAt: Date.now(),
      mode,
      sufficiencyGrade: grade,
      causalPromotionEligible,
      causalConfidenceScore,
      recommendedMaxSingleTradeUsd: recommended,
      currentMaxSingleTradeUsd: currentCap,
      applied,
      rollbackApplied,
      rolloutStage:
        mode === "auto_apply"
          ? "one_sleeve_auto_apply"
          : mode === "recommendation"
            ? "recommendation"
            : "observe_only",
      reason,
    };
    this.latestSummary = summary;
    this.appendHistory(summary);
    this.writeVerifiedClaims(summary, causal);
    this.writeSufficiencyTasks(
      sufficiency?.getBlockingTasks?.(30) ?? [],
      summary.sufficiencyGrade,
    );
    if (applied) {
      logger.info(
        `[VinceProofAllocator] Applied paper cap ${currentCap} -> ${recommended} (${reason})`,
      );
    }
    return summary;
  }

  private appendHistory(summary: ProofAllocatorSummary): void {
    try {
      fs.mkdirSync(path.dirname(this.historyPath), { recursive: true });
      fs.appendFileSync(
        this.historyPath,
        JSON.stringify(summary) + "\n",
        "utf-8",
      );
    } catch {
      // non-fatal
    }
  }

  private getLastHistoryEntry(): ProofAllocatorSummary | null {
    try {
      if (!fs.existsSync(this.historyPath)) return null;
      const lines = fs
        .readFileSync(this.historyPath, "utf-8")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) return null;
      return JSON.parse(lines[lines.length - 1]) as ProofAllocatorSummary;
    } catch {
      return null;
    }
  }

  private writeVerifiedClaims(
    summary: ProofAllocatorSummary,
    causal?: {
      pairs?: Array<{
        label: string;
        ciLower: number;
        confidenceScore: number;
        passed: boolean;
      }>;
    },
  ): void {
    try {
      const claims = (causal?.pairs ?? [])
        .filter((p) => p.passed && p.confidenceScore >= 60)
        .map((p) => ({
          id: `claim-${p.label}`,
          label: p.label,
          confidence: Math.max(0, Math.min(1, p.confidenceScore / 100)),
          effectLowerBound: p.ciLower,
          source: "vince_phase15_causal_uplift",
        }));
      const payload = {
        generatedAt: Date.now(),
        allocator: summary,
        claims,
      };
      fs.mkdirSync(path.dirname(this.verifiedClaimsPath), { recursive: true });
      fs.writeFileSync(
        this.verifiedClaimsPath,
        JSON.stringify(payload, null, 2),
      );
    } catch {
      // non-fatal
    }
  }

  private writeSufficiencyTasks(
    tasks: Array<{
      id: string;
      title: string;
      blocker: string;
      action: string;
    }>,
    grade: "LOW" | "MEDIUM" | "HIGH",
  ): void {
    try {
      const payload = {
        generatedAt: Date.now(),
        grade,
        tasks,
      };
      fs.mkdirSync(path.dirname(this.sufficiencyTasksPath), {
        recursive: true,
      });
      fs.writeFileSync(
        this.sufficiencyTasksPath,
        JSON.stringify(payload, null, 2),
      );
    } catch {
      // non-fatal
    }
  }
}
