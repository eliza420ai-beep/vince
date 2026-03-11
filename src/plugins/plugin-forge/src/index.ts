/**
 * Plugin-Forge — MLX AutoResearch layer for VINCE v2.
 *
 * Overnight self-optimization: mutate policy thresholds / prompts / ML weights,
 * evaluate against paper-bot replay, commit winners (ΔComposite ≥ +0.5%).
 *
 * Optimization target: causal_uplift × Sharpe × brier_calibration
 *
 * Mutable surfaces (Phase 1):
 *   - policies/trading-policy.yaml
 *   - prompts/vince-entry-gate.md
 *   - prompts/solus-strike-ritual.md
 *
 * Actions:
 *   - FORGE_RUN: Trigger an on-demand experiment run
 *   - FORGE_REPORT: Show Forge status and last run results
 *   - FORGE_REVERT: Revert mutable files to HEAD
 *
 * Services:
 *   - forge-experiment: Mutation + evaluation harness
 *   - forge-mlx: MLX autoresearch subprocess wrapper
 *   - forge-python: CPU fallback (train_models.py)
 *   - forge-git: Branch management (create, commit, revert)
 *
 * Tasks:
 *   - FORGE_NIGHTLY_RUN: Overnight run at FORGE_NIGHTLY_HOUR_UTC (default 02:00 UTC)
 *
 * @see docs/FORGE_PROGRAM.md — research charter
 * @see docs/FORGE.md — agent brief
 * @see policies/trading-policy.yaml — mutable policy thresholds
 * @see prompts/ — mutable prompt files
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";

import { forgeRunAction } from "./actions/forgeRun.action.ts";
import { forgeReportAction } from "./actions/forgeReport.action.ts";
import { forgeRevertAction } from "./actions/forgeRevert.action.ts";

import { ForgeExperimentService } from "./services/forgeExperiment.service.ts";
import { ForgeMlxService } from "./services/forgeMlx.service.ts";
import { ForgePythonService } from "./services/forgePython.service.ts";
import { ForgeGitService } from "./services/forgeGit.service.ts";

import { registerForgeNightlyTask } from "./tasks/forgeNightly.tasks.ts";

export const forgePlugin: Plugin = {
  name: "forge",
  description:
    "MLX AutoResearch layer for VINCE v2. Overnight self-optimization experiments: mutate → replay → commit winners.",

  actions: [forgeRunAction, forgeReportAction, forgeRevertAction],

  // Services are registered individually; not listed in plugin.services
  // because they are used directly by actions and tasks rather than via getService().

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const enabled = process.env.FORGE_ENABLED !== "false";
    if (!enabled) {
      logger.debug(
        "[ForgePlugin] Disabled via FORGE_ENABLED=false. Skipping init.",
      );
      return;
    }

    logger.info("[ForgePlugin] Initializing Forge autoresearch plugin...");

    // Register nightly task
    try {
      await registerForgeNightlyTask(runtime);
    } catch (err) {
      logger.warn("[ForgePlugin] Failed to register nightly task:", err);
    }

    // Log runtime availability
    try {
      const mlx = await ForgeMlxService.start(runtime);
      const mlxAvail = await mlx.isAvailable();
      await mlx.stop();

      const py = await ForgePythonService.start(runtime);
      const pyAvail = await py.isAvailable();
      const rowCount = await py.getFeatureStoreRowCount();
      await py.stop();

      const rt = process.env.FORGE_RUNTIME ?? "mlx";
      const budget = process.env.FORGE_BUDGET_MINUTES ?? "120";
      const hour = process.env.FORGE_NIGHTLY_HOUR_UTC ?? "2";

      logger.info(
        `[ForgePlugin] Ready. Runtime: ${rt} (MLX ${mlxAvail ? "✓" : "✗"}, Python ${pyAvail ? "✓" : "✗"}). ` +
          `Feature store: ${rowCount} rows. Nightly at ${hour}:00 UTC. Budget: ${budget}min.`,
      );
    } catch (err) {
      logger.warn("[ForgePlugin] Runtime availability check failed:", err);
    }
  },
};

export {
  ForgeExperimentService,
  ForgeMlxService,
  ForgePythonService,
  ForgeGitService,
};
export { forgeRunAction, forgeReportAction, forgeRevertAction };
export * from "./types/index.ts";
