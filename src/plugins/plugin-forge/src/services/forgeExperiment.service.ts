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
import { appendCompositeSnapshot } from "../utils/compositeHistory.ts";
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
const PROMPT_VINCE_GATE = path.join(
  REPO_ROOT,
  "prompts",
  "vince-entry-gate.md",
);
const PROMPT_SOLUS_RITUAL = path.join(
  REPO_ROOT,
  "prompts",
  "solus-strike-ritual.md",
);

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
  /** Rule-based baseline (equal weights, no Thompson Sampling) for causal uplift */
  ruleBasedMetrics: ReplayMetrics;
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

  /**
   * Score thesis alignment: experiments that contradict SOUL.md (e.g. loosening gates
   * when thesis says "do not carelessly execute") get 0.8× multiplier on composite.
   */
  private getThesisAlignmentMultiplier(mutation: ForgeMutation): number {
    const soul = this.readSoulThesis().toLowerCase();
    const pushBack =
      soul.includes("push back") ||
      soul.includes("do not carelessly execute") ||
      soul.includes("human decides");
    if (!pushBack) return 1.0;
    const before = typeof mutation.before === "number" ? mutation.before : null;
    const after = typeof mutation.after === "number" ? mutation.after : null;
    if (before === null || after === null) return 1.0;
    const key = mutation.keyPath.toLowerCase();
    const isEntryGate =
      key.includes("strength") ||
      key.includes("confidence") ||
      key.includes("confirming");
    const isPolicyGate =
      key.includes("min_strength") ||
      key.includes("min_confidence") ||
      key.includes("bearish_threshold");
    if ((isEntryGate || isPolicyGate) && after < before) {
      return 0.8;
    }
    return 1.0;
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

  /**
   * Build ForgeReplayResult. When ruleBasedWinRate is provided, causal_uplift = winRate - ruleBasedWinRate
   * (honest causation vs rule-based baseline); otherwise legacy: causalUplift = winRate.
   */
  private toForgeReplayResult(
    metrics: ReplayMetrics,
    ruleBasedWinRate?: number,
  ): ForgeReplayResult {
    const causalUplift =
      ruleBasedWinRate !== undefined
        ? metrics.winRate - ruleBasedWinRate
        : metrics.winRate;
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
   * Generate candidate mutations for prompt files (vince-entry-gate, solus-strike-ritual).
   * Mutates only numeric thresholds in rule lines; bounded variations.
   */
  generatePromptMutations(maxCount = 5): ForgeMutation[] {
    const candidates: ForgeMutation[] = [];

    // vince-entry-gate.md: rule thresholds
    if (fs.existsSync(PROMPT_VINCE_GATE)) {
      const raw = fs.readFileSync(PROMPT_VINCE_GATE, "utf-8");
      const riskOffMatch = raw.match(/risk-off AND strength\s*<\s*(\d+)/);
      const bearishMatch = raw.match(/bearish AND strength\s*<\s*(\d+)/);
      const confirmingMatch = raw.match(
        /confirming\s*<\s*(\d+)\s+for any HIP-3/,
      );
      if (riskOffMatch) {
        const current = parseInt(riskOffMatch[1], 10);
        [current - 5, current + 5]
          .filter((v) => v >= 50 && v <= 85)
          .forEach((after) => {
            candidates.push({
              filePath: "prompts/vince-entry-gate.md",
              keyPath: "rule.risk_off_strength",
              before: current,
              after,
              description: `Vince gate: risk-off strength threshold ${current} → ${after}`,
            });
          });
      }
      if (bearishMatch) {
        const current = parseInt(bearishMatch[1], 10);
        [current - 5, current + 5]
          .filter((v) => v >= 55 && v <= 90)
          .forEach((after) => {
            candidates.push({
              filePath: "prompts/vince-entry-gate.md",
              keyPath: "rule.bearish_strength",
              before: current,
              after,
              description: `Vince gate: bearish long strength threshold ${current} → ${after}`,
            });
          });
      }
      if (confirmingMatch) {
        const current = parseInt(confirmingMatch[1], 10);
        [current - 1, current + 1]
          .filter((v) => v >= 1 && v <= 5)
          .forEach((after) => {
            candidates.push({
              filePath: "prompts/vince-entry-gate.md",
              keyPath: "rule.hip3_confirming",
              before: current,
              after,
              description: `Vince gate: HIP-3 confirming minimum ${current} → ${after}`,
            });
          });
      }
    }

    return candidates.slice(0, maxCount);
  }

  /**
   * Apply a prompt file mutation by replacing the numeric value in the matching rule line.
   * Returns true if the file was successfully modified.
   */
  applyPromptMutation(mutation: ForgeMutation): boolean {
    const fullPath = path.join(REPO_ROOT, mutation.filePath);
    if (!fs.existsSync(fullPath)) return false;
    try {
      const original = fs.readFileSync(fullPath, "utf-8");
      let content = original;
      const afterStr = String(mutation.after);
      if (mutation.filePath === "prompts/vince-entry-gate.md") {
        if (mutation.keyPath === "rule.risk_off_strength") {
          content = content.replace(
            /(regime is risk-off AND )strength < \d+/,
            `$1strength < ${afterStr}`,
          );
        } else if (mutation.keyPath === "rule.bearish_strength") {
          content = content.replace(
            /(sentiment_label is bearish AND )strength < \d+/,
            `$1strength < ${afterStr}`,
          );
        } else if (mutation.keyPath === "rule.hip3_confirming") {
          content = content.replace(
            /confirming < \d+(?= for any HIP-3)/,
            `confirming < ${afterStr}`,
          );
        }
      }
      if (content === original) {
        logger.warn(
          `[ForgeExperiment] Prompt mutation pattern not found: ${mutation.keyPath}`,
        );
        return false;
      }
      fs.writeFileSync(fullPath, content, "utf-8");
      logger.debug(
        `[ForgeExperiment] Applied prompt mutation: ${mutation.keyPath} ${mutation.before} → ${mutation.after}`,
      );
      return true;
    } catch (err) {
      logger.error("[ForgeExperiment] Failed to apply prompt mutation:", err);
      return false;
    }
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

    const ruleWinRate = ctx.ruleBasedMetrics.winRate;
    if (candidateMetrics.withOutcome < MIN_TRIGGERED_FOR_GATE) {
      return {
        ...this.toForgeReplayResult(candidateMetrics, ruleWinRate),
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
        ...this.toForgeReplayResult(candidateMetrics, ruleWinRate),
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
        ...this.toForgeReplayResult(candidateMetrics, ruleWinRate),
        safetyGatePassed: false,
        safetyGateReason: windowGate.reason,
      };
    }

    const candidateResult = this.toForgeReplayResult(
      candidateMetrics,
      ruleWinRate,
    );
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
    const ruleBasedMetrics = replayWithWeights(
      holdout,
      { sourceWeights: {}, defaultWeight: 1.0 },
      baselineThresholds,
    );
    const baselineMetrics = replayWithWeights(
      holdout,
      { sourceWeights: baselineWeights, defaultWeight: 1.0 },
      baselineThresholds,
    );
    const baselineResult = this.toForgeReplayResult(
      baselineMetrics,
      ruleBasedMetrics.winRate,
    );
    return {
      holdout,
      baselineResult,
      ruleBasedMetrics,
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

    if (
      process.env.FORGE_USE_MLX === "true" &&
      opts.runtime === "mlx" &&
      this.mlxService
    ) {
      const available = await this.mlxService.isAvailable();
      if (available) {
        const featureStorePath = path.join(
          REPO_ROOT,
          ".elizadb",
          "forge",
          "signal-cache.jsonl",
        );
        logger.info(
          "[ForgeExperiment] Running MLX autoresearch (FORGE_USE_MLX=true)",
        );
        const result = await this.mlxService.runAutoresearch(
          featureStorePath,
          opts.budgetMinutes,
          opts.targetMetric,
        );
        summary.experimentsRun = 1;
        summary.budgetConsumedMinutes = result.durationSeconds / 60;
        if (result.compositeScore != null) {
          summary.bestCompositeDelta = result.compositeScore;
        }
        summary.runtime = "mlx";
        try {
          appendCompositeSnapshot("forge-composite-history", {
            date: summary.date,
            baseline_composite: summary.baselineComposite,
            best_candidate_composite: summary.bestCompositeDelta,
            delta: summary.bestCompositeDelta,
            winners: summary.winners.length,
            losers: summary.losers.length,
            runtime: "mlx",
          });
        } catch (e) {
          logger.debug(
            "[ForgeExperiment] Could not append forge-composite-history:",
            e,
          );
        }
        return summary;
      }
    }

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

    const policyMutations = this.generatePolicyMutations(
      policy,
      Math.max(1, Math.floor(opts.maxExperiments / 2)),
    );
    const promptMutations = this.generatePromptMutations(
      Math.max(0, opts.maxExperiments - policyMutations.length),
    );
    const mutations = [...policyMutations, ...promptMutations].slice(
      0,
      opts.maxExperiments,
    );
    logger.info(
      `[ForgeExperiment] Starting ${mutations.length} experiments (${policyMutations.length} policy, ${promptMutations.length} prompt). Baseline composite: ${replayCtx.baselineResult.composite.toFixed(4)} (holdout=${replayCtx.holdout.length})`,
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
      const isPromptMutation = mutation.filePath.startsWith("prompts/");
      const surface: ForgeSurface = isPromptMutation
        ? mutation.filePath.includes("vince-entry-gate")
          ? "prompt_vince_gate"
          : "prompt_solus_ritual"
        : "policy_threshold";
      const config: ForgeExperimentConfig = {
        id: `exp-${date.replace(/-/g, "")}-${experimentId}`,
        branch: `forge/experiment-${date.replace(/-/g, "")}-${experimentId}`,
        startedAt: new Date().toISOString(),
        surface,
        mutation,
      };

      logger.debug(
        `[ForgeExperiment] Experiment ${experimentId}: ${mutation.description}`,
      );

      // Apply mutation (policy YAML or prompt file)
      const applied = isPromptMutation
        ? this.applyPromptMutation(mutation)
        : this.applyPolicyMutation(mutation);
      if (!applied) {
        logger.warn(
          `[ForgeExperiment] Could not apply mutation ${experimentId}, skipping`,
        );
        continue;
      }

      // Run replay
      const result = await this.runPaperBotReplay(mutation, replayCtx);
      const thesisMultiplier = this.getThesisAlignmentMultiplier(mutation);
      const adjustedComposite = result.composite * thesisMultiplier;
      const compositeDelta =
        adjustedComposite - replayCtx.baselineResult.composite;
      const resultWithAlignment = {
        ...result,
        composite: adjustedComposite,
        thesisAlignment: thesisMultiplier,
      };
      const promotion = validatePromotion({
        composite: adjustedComposite,
        baselineComposite: replayCtx.baselineResult.composite,
        winRate: result.winRate,
        maxDrawdownPct: result.maxDrawdownPct,
        policy: this.loadPolicy() ?? null,
        holdoutCount: replayCtx.holdout.length,
        withOutcome: result.tradeCount,
      });
      const expResult: ForgeExperimentResult = {
        config,
        result: resultWithAlignment,
        compositeDelta,
        winner: promotion.passed,
        durationSeconds: (Date.now() - startTime) / 1000,
        gateFailures:
          promotion.failures.length > 0 ? promotion.failures : undefined,
      };

      summary.experimentsRun++;

      if (promotion.passed) {
        // Hard guard: validate again immediately before commit
        const policy = this.loadPolicy();
        const hardCheck = validatePromotion({
          composite: adjustedComposite,
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
          `[ForgeExperiment] Loser reverted: ${mutation.description} — ${(expResult.gateFailures ?? [])[0] ?? result.safetyGateReason}`,
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
    try {
      appendCompositeSnapshot("forge-composite-history", {
        date: summary.date,
        baseline_composite: summary.baselineComposite,
        best_candidate_composite:
          summary.baselineComposite + summary.bestCompositeDelta,
        delta: summary.bestCompositeDelta,
        winners: summary.winners.length,
        losers: summary.losers.length,
        runtime: summary.runtime,
      });
    } catch (e) {
      logger.debug(
        "[ForgeExperiment] Could not append forge-composite-history:",
        e,
      );
    }
    logger.info(
      `[ForgeExperiment] Run complete. ${summary.winners.length} winners, ${summary.losers.length} losers. Best ΔComposite: +${(summary.bestCompositeDelta * 100).toFixed(2)}%`,
    );
    return summary;
  }
}
