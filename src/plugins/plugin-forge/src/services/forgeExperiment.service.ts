/**
 * ForgeExperimentService — Mutation + evaluation harness.
 *
 * Responsibilities:
 * - Load policies/trading-policy.yaml and prompts/*.md
 * - Generate candidate mutations (threshold nudges, prompt tweaks)
 * - Run paper-bot replay to score each mutation
 * - Apply safety gate
 * - Coordinate with ForgeGitService (commit winners, revert losers)
 * - Return ForgeRunSummary
 *
 * Paper-bot replay: re-runs the last FORGE_REPLAY_DAYS of feature-store
 * data against the mutated policy and compares composite metric to baseline.
 * Minimum 50 replay trades required; skips experiment if fewer.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type IAgentRuntime, logger } from "@elizaos/core";
import type {
  ForgeExperimentConfig,
  ForgeExperimentResult,
  ForgeMutation,
  ForgePolicyThresholds,
  ForgeReplayResult,
  ForgeRunSummary,
  ForgeSurface,
  ForgeRuntime,
} from "../types/index.ts";
import { ForgeGitService } from "./forgeGit.service.ts";
import { ForgeMlxService } from "./forgeMlx.service.ts";
import { ForgePythonService } from "./forgePython.service.ts";
import {
  validatePromotion,
  countRejectReasons,
} from "./forgePromotionValidator.ts";
import { runLowDataRemediation } from "../utils/lowDataRemediation.ts";
import {
  loadForgeSignalCache,
  replayForRegime,
  replayWithWeights,
  splitHoldout,
  type ForgeSignalRecord,
  type ReplayMetrics,
} from "../../../plugin-vince/src/forge/forgeSignalCache.ts";

const REPO_ROOT = process.cwd();
const POLICY_PATH = path.join(REPO_ROOT, "policies", "trading-policy.yaml");
const SOUL_PATH = path.join(REPO_ROOT, "knowledge", "teammate", "SOUL.md");

/** Minimum composite delta (fraction) to commit a winner */
const MIN_COMPOSITE_DELTA = 0.005; // +0.5%
/** Minimum holdout records with outcomes required */
const MIN_HOLDOUT_OUTCOMES = 30;
/** Hard safety limits */
const HARD_MAX_LEVERAGE = 40;
const HARD_MAX_SINGLE_TRADE_USD = 50_000;
/** Replay defaults */
const DEFAULT_HOLDOUT_FRACTION = 0.2;
const MIN_TRIGGERED_FOR_GATE = 5;

interface ReplayContext {
  holdout: ForgeSignalRecord[];
  baselineResult: ForgeReplayResult;
  baselineWeights: Record<string, number>;
  baselineThresholds: {
    minStrength: number;
    minConfidence: number;
    minConfirming: number;
  };
}

export class ForgeExperimentService {
  static serviceType = "forge-experiment";

  private gitService?: ForgeGitService;
  private mlxService?: ForgeMlxService;
  private pythonService?: ForgePythonService;

  constructor(protected runtime: IAgentRuntime) {}

  static async start(runtime: IAgentRuntime): Promise<ForgeExperimentService> {
    const svc = new ForgeExperimentService(runtime);
    svc.gitService = await ForgeGitService.start(runtime);
    svc.mlxService = await ForgeMlxService.start(runtime);
    svc.pythonService = await ForgePythonService.start(runtime);
    logger.info("[ForgeExperiment] Service started");
    return svc;
  }

  async stop(): Promise<void> {
    logger.debug("[ForgeExperiment] Service stopped");
  }

  /** Load and parse policies/trading-policy.yaml (simple key extraction). */
  loadPolicy(): ForgePolicyThresholds | null {
    if (!fs.existsSync(POLICY_PATH)) {
      logger.warn("[ForgeExperiment] policies/trading-policy.yaml not found");
      return null;
    }
    try {
      // Minimal YAML parser for simple key: value lines (no nested arrays)
      const raw = fs.readFileSync(POLICY_PATH, "utf-8");
      const result: any = { version: "1.0" };
      let currentSection = result;
      let sectionKey = "";

      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const sectionMatch = trimmed.match(/^(\w+):$/);
        if (sectionMatch) {
          sectionKey = sectionMatch[1];
          result[sectionKey] = {};
          currentSection = result[sectionKey];
          continue;
        }

        const kvMatch = trimmed.match(/^(\w+):\s+(.+)$/);
        if (kvMatch) {
          const key = kvMatch[1];
          const raw_val = kvMatch[2].trim();
          let val: number | string | boolean = raw_val;
          if (!isNaN(Number(raw_val))) val = Number(raw_val);
          else if (raw_val === "true") val = true;
          else if (raw_val === "false") val = false;

          if (sectionKey) {
            currentSection[key] = val;
          } else {
            result[key] = val;
          }
        }
      }
      return result as ForgePolicyThresholds;
    } catch (err) {
      logger.error("[ForgeExperiment] Failed to parse policy:", err);
      return null;
    }
  }

  /** Read the current SOUL.md for investment thesis context. */
  readSoulThesis(): string {
    if (!fs.existsSync(SOUL_PATH)) return "(SOUL.md not found)";
    try {
      return fs.readFileSync(SOUL_PATH, "utf-8").slice(0, 2000);
    } catch {
      return "(Could not read SOUL.md)";
    }
  }

  /** Count rows in the feature store. */
  async getFeatureStoreRowCount(): Promise<number> {
    return this.pythonService?.getFeatureStoreRowCount() ?? 0;
  }

  private getHoldoutFraction(): number {
    const raw = Number(process.env.FORGE_HOLDOUT_FRACTION ?? "0.2");
    if (!Number.isFinite(raw) || raw <= 0.05 || raw >= 0.5) {
      return DEFAULT_HOLDOUT_FRACTION;
    }
    return raw;
  }

  private getConfirmWindows(): number {
    const raw = Number(process.env.FORGE_CONFIRM_WINDOWS ?? "3");
    if (!Number.isFinite(raw) || raw < 1) return 3;
    return Math.floor(raw);
  }

  private requireRegimeOosImprovement(): boolean {
    return process.env.FORGE_REQUIRE_REGIME_OOS_IMPROVEMENT !== "false";
  }

  private requireWindowConfirmation(): boolean {
    return process.env.FORGE_REQUIRE_WINDOW_CONFIRMATION !== "false";
  }

  private buildReplayThresholds(policy: ForgePolicyThresholds): {
    minStrength: number;
    minConfidence: number;
    minConfirming: number;
  } {
    return {
      minStrength: policy.signal.min_strength,
      minConfidence: policy.signal.min_confidence,
      minConfirming: policy.signal.min_confirming_signals,
    };
  }

  private getBaselineWeights(
    records: ForgeSignalRecord[],
  ): Record<string, number> {
    const latest = [...records]
      .reverse()
      .find(
        (r) => r.weightsSnapshot && Object.keys(r.weightsSnapshot).length > 0,
      );
    return latest?.weightsSnapshot ?? {};
  }

  private toForgeReplayResult(metrics: ReplayMetrics): ForgeReplayResult {
    const causalUplift = metrics.winRate;
    const brierScore = metrics.brierScore;
    return {
      tradeCount: metrics.withOutcome,
      winRate: metrics.winRate,
      sharpe: metrics.sharpe,
      causalUplift,
      brierScore,
      composite: causalUplift * metrics.sharpe * (1 - brierScore),
      maxDrawdownPct: metrics.maxDrawdown * 100,
      safetyGatePassed: false,
    };
  }

  private checkRegimeOosGate(
    holdout: ForgeSignalRecord[],
    baselineWeights: Record<string, number>,
    baselineThresholds: {
      minStrength: number;
      minConfidence: number;
      minConfirming: number;
    },
    candidateThresholds: {
      minStrength: number;
      minConfidence: number;
      minConfirming: number;
    },
  ): { passed: boolean; reason?: string } {
    if (!this.requireRegimeOosImprovement()) return { passed: true };

    const baseline = replayForRegime(
      holdout,
      "uncertain",
      { sourceWeights: baselineWeights, defaultWeight: 1.0 },
      baselineThresholds,
    );
    const candidate = replayForRegime(
      holdout,
      "uncertain",
      { sourceWeights: baselineWeights, defaultWeight: 1.0 },
      candidateThresholds,
    );

    if (
      baseline.withOutcome < MIN_TRIGGERED_FOR_GATE ||
      candidate.withOutcome < MIN_TRIGGERED_FOR_GATE
    ) {
      return { passed: true };
    }

    const sharpeDelta = candidate.sharpe - baseline.sharpe;
    const winRateDelta = candidate.winRate - baseline.winRate;

    if (sharpeDelta < -0.1 || winRateDelta < -0.03) {
      return {
        passed: false,
        reason:
          "Regime OOS gate failed (uncertain regime degraded beyond tolerance)",
      };
    }

    return { passed: true };
  }

  private checkWindowConfirmationGate(
    holdout: ForgeSignalRecord[],
    baselineWeights: Record<string, number>,
    baselineThresholds: {
      minStrength: number;
      minConfidence: number;
      minConfirming: number;
    },
    candidateThresholds: {
      minStrength: number;
      minConfidence: number;
      minConfirming: number;
    },
  ): { passed: boolean; reason?: string } {
    if (!this.requireWindowConfirmation()) return { passed: true };

    const windows = this.getConfirmWindows();
    if (windows <= 1 || holdout.length < windows * 5) return { passed: true };

    const ordered = [...holdout].sort((a, b) => a.evaluatedAt - b.evaluatedAt);
    const windowSize = Math.max(1, Math.floor(ordered.length / windows));
    let improvedWindows = 0;
    let evaluatedWindows = 0;

    for (let i = 0; i < windows; i++) {
      const start = i * windowSize;
      const end = i === windows - 1 ? ordered.length : (i + 1) * windowSize;
      const slice = ordered.slice(start, end);
      if (slice.length === 0) continue;

      const base = replayWithWeights(
        slice,
        { sourceWeights: baselineWeights, defaultWeight: 1.0 },
        baselineThresholds,
      );
      const cand = replayWithWeights(
        slice,
        { sourceWeights: baselineWeights, defaultWeight: 1.0 },
        candidateThresholds,
      );

      if (
        base.withOutcome < MIN_TRIGGERED_FOR_GATE ||
        cand.withOutcome < MIN_TRIGGERED_FOR_GATE
      ) {
        continue;
      }

      evaluatedWindows++;
      if (cand.sharpe >= base.sharpe && cand.winRate >= base.winRate - 0.01) {
        improvedWindows++;
      }
    }

    if (evaluatedWindows === 0) return { passed: true };
    if (improvedWindows < Math.ceil(evaluatedWindows / 2)) {
      return {
        passed: false,
        reason: `Window confirmation failed (${improvedWindows}/${evaluatedWindows} windows improved)`,
      };
    }
    return { passed: true };
  }

  /**
   * Generate candidate mutations for Phase 1 (policy thresholds).
   * Each mutation nudges one numeric threshold by a small percentage.
   */
  generatePolicyMutations(
    policy: ForgePolicyThresholds,
    maxCount = 5,
  ): ForgeMutation[] {
    const candidates: ForgeMutation[] = [];

    const nudge = (
      filePath: string,
      keyPath: string,
      current: number,
      direction: 1 | -1,
      pct: number,
      description: string,
    ): ForgeMutation => {
      const after = Math.round(current * (1 + direction * pct) * 100) / 100;
      return { filePath, keyPath, before: current, after, description };
    };

    // Sentiment gate nudges
    const sg = policy.sentiment_gate;
    candidates.push(
      nudge(
        "policies/trading-policy.yaml",
        "sentiment_gate.bearish_threshold",
        sg.bearish_threshold,
        1,
        0.1,
        "Raise bearish_threshold: tighter bearish filter (skip longs earlier)",
      ),
      nudge(
        "policies/trading-policy.yaml",
        "sentiment_gate.bearish_size_multiplier",
        sg.bearish_size_multiplier,
        1,
        0.05,
        "Raise bearish_size_multiplier: less size reduction on bearish signal",
      ),
    );

    // Signal threshold nudges
    const sig = policy.signal;
    candidates.push(
      nudge(
        "policies/trading-policy.yaml",
        "signal.min_strength",
        sig.min_strength,
        1,
        0.1,
        "Raise min_strength: filter lower-quality signals",
      ),
      nudge(
        "policies/trading-policy.yaml",
        "signal.min_confidence",
        sig.min_confidence,
        1,
        0.1,
        "Raise min_confidence: require higher confidence before entry",
      ),
    );

    // ML gate nudge
    const ml = policy.ml_gate;
    candidates.push(
      nudge(
        "policies/trading-policy.yaml",
        "ml_gate.signal_quality_threshold",
        ml.signal_quality_threshold,
        1,
        0.05,
        "Raise ML signal quality threshold: filter weaker ONNX signals",
      ),
    );

    return candidates.slice(0, maxCount);
  }

  /**
   * Apply a mutation to policies/trading-policy.yaml by replacing the value.
   * Returns true if the file was successfully modified.
   */
  applyPolicyMutation(mutation: ForgeMutation): boolean {
    if (!fs.existsSync(POLICY_PATH)) return false;
    try {
      const content = fs.readFileSync(POLICY_PATH, "utf-8");
      const keyLeaf = mutation.keyPath.split(".").at(-1) ?? mutation.keyPath;
      const pattern = new RegExp(`(\\s+${keyLeaf}:\\s+)([^\\n#]+)`, "m");
      const updated = content.replace(pattern, (_m, prefix) => {
        return `${prefix}${mutation.after}`;
      });
      if (updated === content) {
        logger.warn(
          `[ForgeExperiment] Mutation pattern not found: ${mutation.keyPath}`,
        );
        return false;
      }
      fs.writeFileSync(POLICY_PATH, updated, "utf-8");
      logger.debug(
        `[ForgeExperiment] Applied mutation: ${mutation.keyPath} ${mutation.before} → ${mutation.after}`,
      );
      return true;
    } catch (err) {
      logger.error("[ForgeExperiment] Failed to apply mutation:", err);
      return false;
    }
  }

  /**
   * Deterministic replay backed by Forge signal cache.
   * No randomization, no external API calls.
   */
  async runPaperBotReplay(
    mutation: ForgeMutation,
    ctx: ReplayContext,
  ): Promise<ForgeReplayResult> {
    logger.debug(
      `[ForgeExperiment] Replaying mutation deterministically: ${mutation.description}`,
    );
    const policy = this.loadPolicy();
    if (!policy) {
      return {
        ...ctx.baselineResult,
        safetyGatePassed: false,
        safetyGateReason: "Policy missing during replay",
      };
    }

    const candidateThresholds = this.buildReplayThresholds(policy);

    const candidateMetrics = replayWithWeights(
      ctx.holdout,
      { sourceWeights: ctx.baselineWeights, defaultWeight: 1.0 },
      candidateThresholds,
    );

    if (candidateMetrics.withOutcome < MIN_TRIGGERED_FOR_GATE) {
      return {
        ...this.toForgeReplayResult(candidateMetrics),
        safetyGatePassed: false,
        safetyGateReason: `Insufficient holdout outcomes after mutation: ${candidateMetrics.withOutcome} < ${MIN_TRIGGERED_FOR_GATE}`,
      };
    }

    const regimeGate = this.checkRegimeOosGate(
      ctx.holdout,
      ctx.baselineWeights,
      ctx.baselineThresholds,
      candidateThresholds,
    );
    if (!regimeGate.passed) {
      return {
        ...this.toForgeReplayResult(candidateMetrics),
        safetyGatePassed: false,
        safetyGateReason: regimeGate.reason,
      };
    }

    const windowGate = this.checkWindowConfirmationGate(
      ctx.holdout,
      ctx.baselineWeights,
      ctx.baselineThresholds,
      candidateThresholds,
    );
    if (!windowGate.passed) {
      return {
        ...this.toForgeReplayResult(candidateMetrics),
        safetyGatePassed: false,
        safetyGateReason: windowGate.reason,
      };
    }

    const candidateResult = this.toForgeReplayResult(candidateMetrics);
    const promotion = validatePromotion({
      composite: candidateResult.composite,
      baselineComposite: ctx.baselineResult.composite,
      winRate: candidateResult.winRate,
      maxDrawdownPct: candidateResult.maxDrawdownPct,
      policy,
      holdoutCount: ctx.holdout.length,
      withOutcome: candidateMetrics.withOutcome,
    });

    return {
      ...candidateResult,
      safetyGatePassed: promotion.passed,
      safetyGateReason: promotion.failures[0],
      gateFailures:
        promotion.failures.length > 0 ? promotion.failures : undefined,
    };
  }

  /** Apply the safety gate rules. Returns passed: true if all rules pass. */
  checkSafetyGate(
    composite: number,
    baselineComposite: number,
    winRate: number,
    maxDrawdownPct: number,
    policy: ForgePolicyThresholds | null,
  ): { passed: boolean; reason?: string } {
    const delta = composite - baselineComposite;
    if (delta < MIN_COMPOSITE_DELTA) {
      return {
        passed: false,
        reason: `ΔComposite ${(delta * 100).toFixed(2)}% < required +0.5%`,
      };
    }
    if (winRate < 0.45) {
      return {
        passed: false,
        reason: `Win rate ${(winRate * 100).toFixed(1)}% < 45% floor`,
      };
    }
    if (policy && maxDrawdownPct > policy.risk.max_drawdown_pct) {
      return {
        passed: false,
        reason: `Max drawdown ${maxDrawdownPct.toFixed(1)}% > policy limit ${policy.risk.max_drawdown_pct}%`,
      };
    }
    if (policy && policy.position_limits.max_leverage > HARD_MAX_LEVERAGE) {
      return {
        passed: false,
        reason: `max_leverage ${policy.position_limits.max_leverage} > hard limit ${HARD_MAX_LEVERAGE}`,
      };
    }
    if (
      policy &&
      policy.position_limits.max_single_trade_usd > HARD_MAX_SINGLE_TRADE_USD
    ) {
      return {
        passed: false,
        reason: `max_single_trade_usd ${policy.position_limits.max_single_trade_usd} > hard limit ${HARD_MAX_SINGLE_TRADE_USD}`,
      };
    }
    return { passed: true };
  }

  /** Get deterministic baseline replay result (current main branch policy + weights). */
  async getBaselineContext(
    policy: ForgePolicyThresholds,
  ): Promise<ReplayContext> {
    const allRecords = loadForgeSignalCache()
      .filter((r) => r.outcome !== undefined && typeof r.pnlPct === "number")
      .sort((a, b) => a.evaluatedAt - b.evaluatedAt);

    const { holdout } = splitHoldout(allRecords, this.getHoldoutFraction());
    const baselineWeights = this.getBaselineWeights(allRecords);
    const baselineThresholds = this.buildReplayThresholds(policy);
    const baselineMetrics = replayWithWeights(
      holdout,
      { sourceWeights: baselineWeights, defaultWeight: 1.0 },
      baselineThresholds,
    );
    const baselineResult = this.toForgeReplayResult(baselineMetrics);
    return {
      holdout,
      baselineResult,
      baselineWeights,
      baselineThresholds,
    };
  }

  /**
   * Run a full nightly experiment loop.
   * Returns a ForgeRunSummary with all results.
   */
  async runNightlyExperiments(opts: {
    budgetMinutes: number;
    runtime: ForgeRuntime;
    maxExperiments: number;
    targetMetric: string;
  }): Promise<ForgeRunSummary> {
    const startTime = Date.now();
    const date = new Date().toISOString().slice(0, 10);
    const summary: ForgeRunSummary = {
      date,
      experimentsRun: 0,
      winners: [],
      losers: [],
      baselineComposite: 0,
      bestCompositeDelta: 0,
      runtime: opts.runtime,
      budgetConsumedMinutes: 0,
      safetyGateStatus: "not_reached",
      committedBranches: [],
    };

    const cacheLabeledCount = loadForgeSignalCache().filter(
      (r) => r.outcome !== undefined && typeof r.pnlPct === "number",
    ).length;
    if (cacheLabeledCount < MIN_HOLDOUT_OUTCOMES) {
      logger.info(
        `[ForgeExperiment] Skipping run: only ${cacheLabeledCount} labeled forge-cache rows (need ${MIN_HOLDOUT_OUTCOMES})`,
      );
      await runLowDataRemediation(this.runtime, {
        holdoutCount: cacheLabeledCount,
        reason: "nightly low labeled count",
      });
      summary.safetyGateStatus = "not_reached";
      return summary;
    }

    const policy = this.loadPolicy();
    if (!policy) {
      logger.error(
        "[ForgeExperiment] Cannot run without policies/trading-policy.yaml",
      );
      return summary;
    }

    const replayCtx = await this.getBaselineContext(policy);
    if (replayCtx.holdout.length < MIN_HOLDOUT_OUTCOMES) {
      logger.info(
        `[ForgeExperiment] Skipping run: holdout too small (${replayCtx.holdout.length} < ${MIN_HOLDOUT_OUTCOMES})`,
      );
      await runLowDataRemediation(this.runtime, {
        holdoutCount: replayCtx.holdout.length,
        withOutcome: replayCtx.baselineResult.tradeCount,
        reason: "nightly holdout too small",
      });
      summary.safetyGateStatus = "not_reached";
      return summary;
    }
    summary.baselineComposite = replayCtx.baselineResult.composite;

    const mutations = this.generatePolicyMutations(policy, opts.maxExperiments);
    logger.info(
      `[ForgeExperiment] Starting ${mutations.length} experiments. Baseline composite: ${replayCtx.baselineResult.composite.toFixed(4)} (holdout=${replayCtx.holdout.length})`,
    );

    const initialBranch = await this.gitService!.getCurrentBranch();

    for (let i = 0; i < mutations.length; i++) {
      const elapsed = (Date.now() - startTime) / 60_000;
      if (elapsed > opts.budgetMinutes) {
        logger.info("[ForgeExperiment] Budget exhausted — stopping early");
        break;
      }

      const mutation = mutations[i];
      const experimentId = String(i + 1).padStart(3, "0");
      const config: ForgeExperimentConfig = {
        id: `exp-${date.replace(/-/g, "")}-${experimentId}`,
        branch: `forge/experiment-${date.replace(/-/g, "")}-${experimentId}`,
        startedAt: new Date().toISOString(),
        surface: "policy_threshold" as ForgeSurface,
        mutation,
      };

      logger.debug(
        `[ForgeExperiment] Experiment ${experimentId}: ${mutation.description}`,
      );

      // Apply mutation
      const applied = this.applyPolicyMutation(mutation);
      if (!applied) {
        logger.warn(
          `[ForgeExperiment] Could not apply mutation ${experimentId}, skipping`,
        );
        continue;
      }

      // Run replay
      const result = await this.runPaperBotReplay(mutation, replayCtx);
      const compositeDelta =
        result.composite - replayCtx.baselineResult.composite;
      const expResult: ForgeExperimentResult = {
        config,
        result,
        compositeDelta,
        winner: result.safetyGatePassed,
        durationSeconds: (Date.now() - startTime) / 1000,
        gateFailures: result.gateFailures,
      };

      summary.experimentsRun++;

      if (result.safetyGatePassed) {
        // Hard guard: validate again immediately before commit
        const policy = this.loadPolicy();
        const hardCheck = validatePromotion({
          composite: result.composite,
          baselineComposite: replayCtx.baselineResult.composite,
          winRate: result.winRate,
          maxDrawdownPct: result.maxDrawdownPct,
          policy,
          holdoutCount: replayCtx.holdout.length,
          withOutcome: result.tradeCount,
        });
        if (!hardCheck.passed) {
          logger.warn(
            `[ForgeExperiment] Hard promotion guard blocked commit: ${hardCheck.failures.join("; ")}`,
          );
          await this.gitService!.revertLoser(mutation.filePath);
          summary.losers.push({
            ...expResult,
            winner: false,
            gateFailures: hardCheck.failures,
          });
          summary.safetyGateStatus = "failed";
          continue;
        }
        summary.safetyGateStatus = "passed";
        try {
          await this.gitService!.createExperimentBranch(experimentId);
          await this.gitService!.commitWinner(config, expResult);
          await this.gitService!.returnToMain();
          summary.winners.push(expResult);
          summary.committedBranches.push(config.branch);
          if (compositeDelta > summary.bestCompositeDelta) {
            summary.bestCompositeDelta = compositeDelta;
          }
          logger.info(
            `[ForgeExperiment] Winner committed: ${mutation.description} (+${(compositeDelta * 100).toFixed(2)}%)`,
          );
        } catch (err) {
          logger.error("[ForgeExperiment] Failed to commit winner:", err);
          await this.gitService!.revertLoser(mutation.filePath);
        }
      } else {
        summary.safetyGateStatus = "failed";
        await this.gitService!.revertLoser(mutation.filePath);
        summary.losers.push(expResult);
        logger.debug(
          `[ForgeExperiment] Loser reverted: ${mutation.description} — ${result.safetyGateReason}`,
        );
      }
    }

    // Return to original branch
    if ((await this.gitService!.getCurrentBranch()) !== initialBranch) {
      await this.gitService!.returnToMain();
    }

    summary.budgetConsumedMinutes = (Date.now() - startTime) / 60_000;
    summary.rejectReasonCounts = countRejectReasons(
      summary.losers.map((l) => l.gateFailures ?? []),
    );
    logger.info(
      `[ForgeExperiment] Run complete. ${summary.winners.length} winners, ${summary.losers.length} losers. Best ΔComposite: +${(summary.bestCompositeDelta * 100).toFixed(2)}%`,
    );
    return summary;
  }
}
