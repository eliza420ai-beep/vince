/**
 * ForgePythonService — CPU fallback for Forge experiments when MLX is unavailable.
 *
 * Runs the existing VINCE training pipeline (train_models.py) with mutated hyperparameters
 * and evaluates the composite metric against the feature store.
 *
 * Used when:
 * - Non-Apple hardware (no MLX)
 * - autoresearch-mlx submodule not initialized
 * - FORGE_RUNTIME=python is explicitly set
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs";
import * as path from "node:path";
import { type IAgentRuntime, logger } from "@elizaos/core";

const execAsync = promisify(exec);
const REPO_ROOT = process.cwd();
const TRAIN_SCRIPT = path.join(
  REPO_ROOT,
  "src",
  "plugins",
  "plugin-vince",
  "scripts",
  "train_models.py",
);
const FEATURE_STORE_DIR = path.join(
  REPO_ROOT,
  ".elizadb",
  "vince-paper-bot",
  "features",
);
const MODELS_DIR = path.join(
  REPO_ROOT,
  ".elizadb",
  "vince-paper-bot",
  "models",
);

export interface PythonTrainResult {
  success: boolean;
  stdout: string;
  stderr: string;
  /** Holdout metrics from training_metadata.json */
  holdoutMetrics?: {
    signal_quality_auc?: number;
    position_sizing_r2?: number;
    tp_accuracy?: number;
    sl_calibration?: number;
  };
  durationSeconds: number;
}

export class ForgePythonService {
  static serviceType = "forge-python";

  constructor(protected runtime: IAgentRuntime) {}

  static async start(runtime: IAgentRuntime): Promise<ForgePythonService> {
    const svc = new ForgePythonService(runtime);
    logger.debug("[ForgePython] Service started");
    return svc;
  }

  async stop(): Promise<void> {
    logger.debug("[ForgePython] Service stopped");
  }

  /** Returns true if train_models.py exists and Python 3 is available. */
  async isAvailable(): Promise<boolean> {
    if (!fs.existsSync(TRAIN_SCRIPT)) {
      logger.debug("[ForgePython] train_models.py not found");
      return false;
    }
    try {
      await execAsync("python3 --version", {
        timeout: 5_000,
        encoding: "utf-8",
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Count rows in the feature store (eligibility check: need ≥50 for replay). */
  async getFeatureStoreRowCount(): Promise<number> {
    if (!fs.existsSync(FEATURE_STORE_DIR)) return 0;
    try {
      const files = fs
        .readdirSync(FEATURE_STORE_DIR)
        .filter((f) => f.endsWith(".jsonl"));
      let count = 0;
      for (const file of files) {
        const content = fs.readFileSync(
          path.join(FEATURE_STORE_DIR, file),
          "utf-8",
        );
        count += content.split("\n").filter((l) => l.trim()).length;
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Run train_models.py with optional hyperparameter overrides.
   * Returns parsed holdout metrics from training_metadata.json.
   */
  async runTraining(
    overrides: Record<string, string | number | boolean> = {},
    budgetMinutes = 60,
  ): Promise<PythonTrainResult> {
    const start = Date.now();

    if (!fs.existsSync(TRAIN_SCRIPT)) {
      return {
        success: false,
        stdout: "",
        stderr: `train_models.py not found at ${TRAIN_SCRIPT}`,
        durationSeconds: 0,
      };
    }

    const flags = Object.entries(overrides)
      .map(([k, v]) => `--${k} ${v}`)
      .join(" ");

    const cmd = `python3 "${TRAIN_SCRIPT}" ${flags}`.trim();

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: REPO_ROOT,
        timeout: budgetMinutes * 60 * 1000,
        encoding: "utf-8",
      });

      const durationSeconds = (Date.now() - start) / 1000;

      // Read holdout metrics from training_metadata.json
      let holdoutMetrics: PythonTrainResult["holdoutMetrics"];
      const metadataPath = path.join(MODELS_DIR, "training_metadata.json");
      if (fs.existsSync(metadataPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
          holdoutMetrics = meta?.holdout_metrics ?? meta?.metrics;
        } catch {
          // ignore parse error
        }
      }

      logger.info(
        `[ForgePython] Training complete in ${durationSeconds.toFixed(0)}s`,
      );
      return { success: true, stdout, stderr, holdoutMetrics, durationSeconds };
    } catch (err: any) {
      const durationSeconds = (Date.now() - start) / 1000;
      logger.warn("[ForgePython] Training failed:", err?.message);
      return {
        success: false,
        stdout: err?.stdout ?? "",
        stderr: err?.stderr ?? String(err),
        durationSeconds,
      };
    }
  }
}
