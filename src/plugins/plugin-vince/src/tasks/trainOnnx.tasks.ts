/**
 * ONNX Training Task
 *
 * When the feature store has 90+ complete trades (with outcome), runs the Python
 * training script to produce ONNX models. ML Inference Service loads models from
 * .elizadb/vince-paper-bot/models/ and uses them for signal quality, position
 * sizing, TP/SL optimization.
 *
 * - Runs on a schedule (default: every 12 hours via updateInterval).
 * - Skips if complete record count < 90.
 * - Throttles to at most once per 24h to avoid redundant training.
 * - Requires: Python 3, pip3 install -r scripts/requirements.txt (xgboost, onnxmltools, etc.)
 */

import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import type { VinceFeatureStoreService } from "../services/vinceFeatureStore.service";
import type { VinceMLInferenceService } from "../services/mlInference.service";
import { uploadModelsToSupabase } from "../utils/supabaseMlModels";

const MIN_COMPLETE_RECORDS = 90;
const MIN_SAMPLES_ARG = "90";
const TRAIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h between runs
const COOLDOWN_FILE = ".elizadb/vince-paper-bot/models/last_train_at.txt";
/** When recent win rate is below this and we have enough recent complete trades, allow retrain despite cooldown. */
const RETRAIN_RECENT_WIN_RATE_THRESHOLD = 0.45;
const RETRAIN_RECENT_MIN_TRADES = 20;
const RETRAIN_RECENT_LOOKBACK = 50;

function getDataDir(): string {
  return path.join(process.cwd(), ".elizadb", "vince-paper-bot", "features");
}

function getModelsDir(): string {
  return path.join(process.cwd(), ".elizadb", "vince-paper-bot", "models");
}

function getScriptPath(): string {
  return path.join(
    process.cwd(),
    "src",
    "plugins",
    "plugin-vince",
    "scripts",
    "train_models.py",
  );
}

function getLastTrainTime(): number {
  try {
    const cooldownPath = path.join(process.cwd(), COOLDOWN_FILE);
    if (fs.existsSync(cooldownPath)) {
      const s = fs.readFileSync(cooldownPath, "utf-8").trim();
      const t = parseInt(s, 10);
      if (!Number.isNaN(t)) return t;
    }
  } catch {
    // ignore
  }
  return 0;
}

function setLastTrainTime(): void {
  try {
    const modelsDir = path.dirname(path.join(process.cwd(), COOLDOWN_FILE));
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(process.cwd(), COOLDOWN_FILE),
      String(Date.now()),
      "utf-8",
    );
  } catch (e) {
    logger.warn(`[TrainONNX] Could not write cooldown file: ${e}`);
  }
}

/**
 * Run the Python training script. Resolves when the process exits.
 */
function runTrainingScript(): Promise<{
  success: boolean;
  stderr: string;
  stdout: string;
}> {
  const scriptPath = getScriptPath();
  const dataDir = getDataDir();
  const modelsDir = getModelsDir();

  if (!fs.existsSync(scriptPath)) {
    return Promise.resolve({
      success: false,
      stderr: "",
      stdout: `Script not found: ${scriptPath}. Run from repo root (vince).`,
    });
    // When plugin is bundled, script might live elsewhere; could add fallback.
  }

  return new Promise((resolve) => {
    const python = process.env.PYTHON || "python3";
    const args = [
      scriptPath,
      "--data",
      dataDir,
      "--output",
      modelsDir,
      "--min-samples",
      MIN_SAMPLES_ARG,
    ];

    const child = spawn(python, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      logger.error(`[TrainONNX] Failed to start Python: ${err.message}`);
      resolve({ success: false, stderr: err.message, stdout });
    });

    child.on("close", (code) => {
      const success = code === 0;
      if (success) {
        setLastTrainTime();
        logger.info(
          `[TrainONNX] Training completed successfully. Models in ${modelsDir}`,
        );
      } else {
        logger.warn(
          `[TrainONNX] Training exited with code ${code}. stderr: ${stderr.slice(-500)}`,
        );
      }
      resolve({ success, stderr, stdout });
    });
  });
}

/**
 * Register the task worker and create the recurring task.
 */
export const registerTrainOnnxTask = async (
  runtime: IAgentRuntime,
  worldId?: UUID,
) => {
  const taskWorldId = worldId || (runtime.agentId as UUID);

  runtime.registerTaskWorker({
    name: "TRAIN_ONNX_WHEN_READY",
    validate: async () => true,
    execute: async (rt, _options, _task) => {
      try {
        const featureStore = rt.getService(
          "VINCE_FEATURE_STORE_SERVICE",
        ) as VinceFeatureStoreService | null;
        if (!featureStore) {
          logger.debug("[TrainONNX] Feature store not available, skipping");
          return;
        }

        const completeCount = await featureStore.getCompleteRecordCount(365);
        if (completeCount < MIN_COMPLETE_RECORDS) {
          logger.info(
            `[TrainONNX] Skipping: ${completeCount} complete trades (need ${MIN_COMPLETE_RECORDS}+). Keep paper trading to collect more.`,
          );
          return;
        }

        const lastTrain = getLastTrainTime();
        const inCooldown =
          lastTrain > 0 && Date.now() - lastTrain < TRAIN_COOLDOWN_MS;
        if (inCooldown) {
          const records = await featureStore.loadRecords(30);
          const complete = records.filter((r) => r.outcome && r.labels);
          const recent = complete.slice(-RETRAIN_RECENT_LOOKBACK);
          const recentWinRate =
            recent.length >= RETRAIN_RECENT_MIN_TRADES
              ? recent.filter((r) => r.labels!.profitable).length /
                recent.length
              : null;
          if (
            recentWinRate !== null &&
            recentWinRate < RETRAIN_RECENT_WIN_RATE_THRESHOLD
          ) {
            logger.info(
              `[TrainONNX] Allowing retrain despite cooldown: recent win rate ${(recentWinRate * 100).toFixed(0)}% (last ${recent.length} trades) < ${RETRAIN_RECENT_WIN_RATE_THRESHOLD * 100}%`,
            );
          } else {
            logger.debug(
              "[TrainONNX] Skipping: last training was < 24h ago (cooldown)",
            );
            return;
          }
        }

        logger.info(
          `[TrainONNX] Starting training (${completeCount} complete records, min ${MIN_SAMPLES_ARG})...`,
        );
        const result = await runTrainingScript();
        if (!result.success && result.stderr) {
          logger.warn(
            `[TrainONNX] Training failed: ${result.stderr.slice(-300)}`,
          );
        } else if (result.success) {
          const modelsDir = getModelsDir();
          const uploaded = await uploadModelsToSupabase(rt, modelsDir);
          if (uploaded) {
            const mlService = rt.getService(
              "VINCE_ML_INFERENCE_SERVICE",
            ) as VinceMLInferenceService | null;
            if (mlService?.reloadModels) {
              await mlService.reloadModels();
              logger.info(
                "[TrainONNX] ML models reloaded; new thresholds active.",
              );
            }
          }
        }
      } catch (error) {
        logger.error(`[TrainONNX] Task error: ${error}`);
      }
    },
  });

  // Create recurring task (every 12 hours)
  await runtime.createTask({
    name: "TRAIN_ONNX_WHEN_READY",
    description: "Train ONNX models when feature store has 90+ complete trades",
    roomId: taskWorldId,
    worldId: taskWorldId,
    metadata: {
      updatedAt: Date.now(),
      updateInterval: 12 * 60 * 60 * 1000, // 12 hours
    },
    tags: ["train-onnx", "vince", "ml", "repeat"],
  });

  logger.info(
    "[TrainONNX] ONNX training task registered (runs when 90+ trades, max once per 24h)",
  );
};

export default registerTrainOnnxTask;
