/**
 * ForgeMlxService — Apple Silicon MLX autoresearch runner.
 *
 * Wraps the `autoresearch-mlx` submodule at src/tools/forge/autoresearch-mlx/.
 * When MLX is unavailable (non-Apple hardware or submodule not initialized),
 * it falls back to forgePython.service.ts.
 *
 * The composite metric passed to autoresearch-mlx:
 *   causal_uplift × Sharpe × (1 - brier_score)
 *
 * This replaces the upstream metric in autoresearch-mlx with VINCE's metric.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import { type IAgentRuntime, logger } from "@elizaos/core";

const execAsync = promisify(exec);
const REPO_ROOT = process.cwd();
const MLX_DIR = path.join(
  REPO_ROOT,
  "src",
  "tools",
  "forge",
  "autoresearch-mlx",
);
const MLX_MAIN = path.join(MLX_DIR, "run_autoresearch.py");

export interface MlxRunResult {
  /** Whether MLX was available and ran successfully */
  success: boolean;
  /** Raw stdout from MLX process */
  stdout: string;
  /** Any stderr */
  stderr: string;
  /** Composite metric score from MLX run */
  compositeScore?: number;
  /** Duration in seconds */
  durationSeconds: number;
}

export class ForgeMlxService {
  static serviceType = "forge-mlx";

  constructor(protected runtime: IAgentRuntime) {}

  static async start(runtime: IAgentRuntime): Promise<ForgeMlxService> {
    const svc = new ForgeMlxService(runtime);
    logger.debug("[ForgeMlx] Service started");
    return svc;
  }

  async stop(): Promise<void> {
    logger.debug("[ForgeMlx] Service stopped");
  }

  /** Returns true if the MLX submodule is initialized and Python/MLX is available. */
  async isAvailable(): Promise<boolean> {
    if (!fs.existsSync(MLX_MAIN)) {
      logger.debug("[ForgeMlx] autoresearch-mlx submodule not initialized");
      return false;
    }
    try {
      await execAsync("python3 -c 'import mlx'", {
        cwd: MLX_DIR,
        timeout: 10_000,
        encoding: "utf-8",
      });
      return true;
    } catch {
      logger.debug("[ForgeMlx] MLX Python package not available");
      return false;
    }
  }

  /**
   * Run autoresearch-mlx with VINCE's composite metric.
   *
   * @param featureStorePath - Path to JSONL feature store file
   * @param budgetMinutes - Max runtime budget
   * @param targetMetric - Override metric expression (default: vince composite)
   */
  async runAutoresearch(
    featureStorePath: string,
    budgetMinutes: number,
    targetMetric = "causal_uplift * sharpe * (1 - brier_score)",
  ): Promise<MlxRunResult> {
    const start = Date.now();
    if (!fs.existsSync(MLX_MAIN)) {
      return {
        success: false,
        stdout: "",
        stderr:
          "autoresearch-mlx submodule not initialized. Run: git submodule update --init",
        durationSeconds: 0,
      };
    }

    const cmd = [
      "python3",
      MLX_MAIN,
      `--feature-store "${featureStorePath}"`,
      `--budget-minutes ${budgetMinutes}`,
      `--metric "${targetMetric}"`,
      "--output-format json",
    ].join(" ");

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: MLX_DIR,
        timeout: budgetMinutes * 60 * 1000 + 30_000,
        encoding: "utf-8",
      });

      const durationSeconds = (Date.now() - start) / 1000;
      let compositeScore: number | undefined;
      try {
        const parsed = JSON.parse(stdout);
        compositeScore = parsed?.composite_score ?? parsed?.metric;
      } catch {
        // stdout is not JSON — extract from last line
        const lastLine = stdout.trim().split("\n").at(-1) ?? "";
        const match = lastLine.match(/composite[_\s]+score[:\s]+([\d.]+)/i);
        if (match) compositeScore = parseFloat(match[1]);
      }

      logger.info(
        `[ForgeMlx] Run complete in ${durationSeconds.toFixed(0)}s. Composite: ${compositeScore ?? "n/a"}`,
      );
      return { success: true, stdout, stderr, compositeScore, durationSeconds };
    } catch (err: any) {
      const durationSeconds = (Date.now() - start) / 1000;
      logger.warn("[ForgeMlx] autoresearch-mlx run failed:", err?.message);
      return {
        success: false,
        stdout: err?.stdout ?? "",
        stderr: err?.stderr ?? String(err),
        durationSeconds,
      };
    }
  }
}
