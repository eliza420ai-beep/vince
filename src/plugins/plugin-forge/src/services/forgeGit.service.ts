/**
 * ForgeGitService — Branch management for Forge experiments.
 *
 * Responsibilities:
 * - Create experiment branches: forge/experiment-YYYYMMDD-NNN
 * - Commit winning mutations
 * - Revert (stash drop) losing mutations
 * - Create auto-PRs describing the mutation and delta
 *
 * Safety: never operates on main directly. All work is branch-isolated.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { type IAgentRuntime, logger } from "@elizaos/core";
import type {
  ForgeExperimentConfig,
  ForgeExperimentResult,
} from "../types/index.ts";

const execAsync = promisify(exec);
const REPO_ROOT = process.cwd();
const EXEC_OPTS = {
  cwd: REPO_ROOT,
  encoding: "utf-8" as const,
  timeout: 30_000,
};

export class ForgeGitService {
  static serviceType = "forge-git";

  constructor(protected runtime: IAgentRuntime) {}

  static async start(runtime: IAgentRuntime): Promise<ForgeGitService> {
    const svc = new ForgeGitService(runtime);
    logger.debug("[ForgeGit] Service started");
    return svc;
  }

  async stop(): Promise<void> {
    logger.debug("[ForgeGit] Service stopped");
  }

  /** Generate a unique experiment branch name. */
  async createExperimentBranch(experimentId: string): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const branch = `forge/experiment-${date}-${experimentId.slice(-3)}`;
    try {
      await execAsync(`git checkout -b ${branch}`, EXEC_OPTS);
      logger.debug(`[ForgeGit] Created branch: ${branch}`);
      return branch;
    } catch (err) {
      logger.error(`[ForgeGit] Failed to create branch ${branch}:`, err);
      throw err;
    }
  }

  /** Stage and commit a winning mutation to the current branch. */
  async commitWinner(
    config: ForgeExperimentConfig,
    result: ForgeExperimentResult,
  ): Promise<void> {
    const msg =
      `forge: ${config.mutation.description}\n\n` +
      `Surface: ${config.surface}\n` +
      `File: ${config.mutation.filePath}\n` +
      `Key: ${config.mutation.keyPath}\n` +
      `Before: ${config.mutation.before}  After: ${config.mutation.after}\n` +
      `ΔComposite: +${(result.compositeDelta * 100).toFixed(2)}%\n` +
      `Sharpe: ${result.result.sharpe.toFixed(3)}  ` +
      `WinRate: ${(result.result.winRate * 100).toFixed(1)}%  ` +
      `Brier: ${result.result.brierScore.toFixed(3)}\n` +
      `Trades replayed: ${result.result.tradeCount}\n` +
      `Safety gate: passed`;

    try {
      await execAsync(`git add ${config.mutation.filePath}`, EXEC_OPTS);
      await execAsync(`git commit -m "${msg.replace(/"/g, "'")}"`, EXEC_OPTS);
      logger.info(
        `[ForgeGit] Committed winner: ${config.mutation.description} (+${(result.compositeDelta * 100).toFixed(2)}%)`,
      );
    } catch (err) {
      logger.error("[ForgeGit] Failed to commit winner:", err);
      throw err;
    }
  }

  /** Revert any uncommitted changes (losing experiment). */
  async revertLoser(filePath: string): Promise<void> {
    try {
      await execAsync(`git checkout -- ${filePath}`, EXEC_OPTS);
      logger.debug(`[ForgeGit] Reverted: ${filePath}`);
    } catch (err) {
      logger.warn(`[ForgeGit] Could not revert ${filePath}:`, err);
    }
  }

  /** Switch back to main after an experiment run. */
  async returnToMain(): Promise<void> {
    try {
      await execAsync("git checkout main", EXEC_OPTS);
      logger.debug("[ForgeGit] Returned to main");
    } catch {
      try {
        await execAsync("git checkout -", EXEC_OPTS);
      } catch (err) {
        logger.warn("[ForgeGit] Could not return to main:", err);
      }
    }
  }

  /** Get the current git branch name. */
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        "git branch --show-current",
        EXEC_OPTS,
      );
      return stdout.trim();
    } catch {
      return "unknown";
    }
  }

  /** List all forge experiment branches. */
  async listExperimentBranches(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        "git branch --list 'forge/experiment-*'",
        EXEC_OPTS,
      );
      return stdout
        .split("\n")
        .map((l) => l.trim().replace(/^\*\s*/, ""))
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
