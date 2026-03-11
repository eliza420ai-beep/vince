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

const REPO_ROOT = process.cwd();
const POLICY_PATH = path.join(REPO_ROOT, "policies", "trading-policy.yaml");
const PROMPTS_DIR = path.join(REPO_ROOT, "prompts");
const FEATURE_STORE_DIR = path.join(
  REPO_ROOT,
  ".elizadb",
  "vince-paper-bot",
  "features",
);
const SOUL_PATH = path.join(REPO_ROOT, "knowledge", "teammate", "SOUL.md");

/** Minimum composite delta (fraction) to commit a winner */
const MIN_COMPOSITE_DELTA = 0.005; // +0.5%
/** Minimum replay trades required */
const MIN_REPLAY_TRADES = 50;
/** Hard safety limits */
const HARD_MAX_LEVERAGE = 40;
const HARD_MAX_SINGLE_TRADE_USD = 50_000;

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
      const pattern = new RegExp(
        `(\\s+${keyLeaf}:\\s+)${String(mutation.before).replace(".", "\\.")}`,
        "m",
      );
      const updated = content.replace(pattern, `$1${mutation.after}`);
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
   * Simulate a paper-bot replay with current policy (stub implementation).
   * In full implementation this calls VincePaperTradingService.replayFeatureStore().
   * For now returns a synthetic result based on the mutation direction.
   */
  async runPaperBotReplay(
    mutation: ForgeMutation,
    baseline: ForgeReplayResult,
  ): Promise<ForgeReplayResult> {
    const rowCount = await this.getFeatureStoreRowCount();
    if (rowCount < MIN_REPLAY_TRADES) {
      return {
        tradeCount: rowCount,
        winRate: baseline.winRate,
        sharpe: baseline.sharpe,
        causalUplift: 0,
        brierScore: baseline.brierScore,
        composite: baseline.composite,
        maxDrawdownPct: baseline.maxDrawdownPct,
        safetyGatePassed: false,
        safetyGateReason: `Insufficient feature-store rows: ${rowCount} < ${MIN_REPLAY_TRADES}`,
      };
    }

    // Stub: small random delta simulating the replay result.
    // Replace with real replay call when VincePaperTradingService.replayFeatureStore() is implemented.
    const delta = (Math.random() - 0.4) * 0.02; // slight upward bias for testing
    const winRate = Math.max(
      0.3,
      Math.min(0.8, baseline.winRate + delta * 0.5),
    );
    const sharpe = Math.max(0.1, baseline.sharpe + delta * 0.3);
    const causalUplift = winRate - baseline.winRate;
    const brierScore = Math.max(0.1, baseline.brierScore - delta * 0.1);
    const composite = causalUplift * sharpe * (1 - brierScore);

    const maxDrawdownPct =
      baseline.maxDrawdownPct * (1 + (Math.random() - 0.5) * 0.1);

    const policy = this.loadPolicy();
    const safetyCheck = this.checkSafetyGate(
      composite,
      baseline.composite,
      winRate,
      maxDrawdownPct,
      policy,
    );

    return {
      tradeCount: rowCount,
      winRate,
      sharpe,
      causalUplift,
      brierScore,
      composite,
      maxDrawdownPct,
      safetyGatePassed: safetyCheck.passed,
      safetyGateReason: safetyCheck.reason,
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

  /** Get baseline replay result (current main branch). */
  async getBaselineResult(): Promise<ForgeReplayResult> {
    // Stub baseline — will be replaced with actual replay
    return {
      tradeCount: await this.getFeatureStoreRowCount(),
      winRate: 0.52,
      sharpe: 1.2,
      causalUplift: 0.0,
      brierScore: 0.3,
      composite: 0.52 * 1.2 * (1 - 0.3),
      maxDrawdownPct: 8.0,
      safetyGatePassed: true,
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

    const rowCount = await this.getFeatureStoreRowCount();
    if (rowCount < MIN_REPLAY_TRADES) {
      logger.info(
        `[ForgeExperiment] Skipping run: only ${rowCount} feature rows (need ${MIN_REPLAY_TRADES})`,
      );
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

    const baseline = await this.getBaselineResult();
    summary.baselineComposite = baseline.composite;

    const mutations = this.generatePolicyMutations(policy, opts.maxExperiments);
    logger.info(
      `[ForgeExperiment] Starting ${mutations.length} experiments. Baseline composite: ${baseline.composite.toFixed(4)}`,
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
      const result = await this.runPaperBotReplay(mutation, baseline);
      const compositeDelta = result.composite - baseline.composite;
      const expResult: ForgeExperimentResult = {
        config,
        result,
        compositeDelta,
        winner: result.safetyGatePassed,
        durationSeconds: (Date.now() - startTime) / 1000,
      };

      summary.experimentsRun++;

      if (result.safetyGatePassed) {
        summary.safetyGateStatus = "passed";
        // Commit winner on new branch
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
        // Revert loser
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
    logger.info(
      `[ForgeExperiment] Run complete. ${summary.winners.length} winners, ${summary.losers.length} losers. Best ΔComposite: +${(summary.bestCompositeDelta * 100).toFixed(2)}%`,
    );
    return summary;
  }
}
