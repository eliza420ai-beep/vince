/**
 * TRAIN_SOLUS_CALIBRATION_WHEN_READY — When there are enough resolved assignment
 * predictions (default 50+), runs the Python training script to produce
 * assignment_calibrator.onnx. Same pattern as Vince's TRAIN_ONNX_WHEN_READY.
 *
 * - Runs on a schedule (default: every 12h via updateInterval).
 * - Skips if resolved count < min (50).
 * - Throttles to at most once per 24h.
 * - After success, calls SolusMlInferenceService.reloadModels() so new ONNX applies without restart.
 * - Gate: set SOLUS_TRAIN_CALIBRATION_ENABLED=false to disable.
 */

import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getResolvedCount,
  getStorePath,
} from "../utils/assignmentPredictionsStore";
import type { SolusMlInferenceService } from "../services/solusMlInference.service";

const TASK_NAME = "TRAIN_SOLUS_CALIBRATION_WHEN_READY";
const MIN_RESOLVED = 50;
const MIN_SAMPLES_ARG = String(MIN_RESOLVED);
const TRAIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h between runs
const UPDATE_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h check

function getModelsDir(): string {
  const raw = process.env.SOLUS_ML_MODELS_DIR ?? ".elizadb/solus/models";
  return path.resolve(process.cwd(), raw);
}

function getCooldownPath(): string {
  return path.join(getModelsDir(), "last_train_at.txt");
}

function getScriptPath(): string {
  return path.join(
    process.cwd(),
    "src",
    "plugins",
    "plugin-solus",
    "scripts",
    "train_solus_calibration.py",
  );
}

function getLastTrainTime(): number {
  try {
    const p = getCooldownPath();
    if (fs.existsSync(p)) {
      const s = fs.readFileSync(p, "utf-8").trim();
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
    const dir = getModelsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(getCooldownPath(), String(Date.now()), "utf-8");
  } catch (e) {
    logger.warn(`[TrainSolusCalibration] Could not write cooldown file: ${e}`);
  }
}

function runTrainingScript(): Promise<{
  success: boolean;
  stderr: string;
  stdout: string;
}> {
  const scriptPath = getScriptPath();
  const dataPath = getStorePath();
  const modelsDir = getModelsDir();

  if (!fs.existsSync(scriptPath)) {
    return Promise.resolve({
      success: false,
      stderr: "",
      stdout: `Script not found: ${scriptPath}. Run from repo root.`,
    });
  }

  return new Promise((resolve) => {
    const python = process.env.PYTHON ?? "python3";
    const args = [
      scriptPath,
      "--data",
      dataPath,
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
      logger.error(
        `[TrainSolusCalibration] Failed to start Python: ${err.message}`,
      );
      resolve({ success: false, stderr: err.message, stdout });
    });

    child.on("close", (code) => {
      const success = code === 0;
      if (success) {
        setLastTrainTime();
        logger.info(
          `[TrainSolusCalibration] Training completed. Models in ${modelsDir}`,
        );
      } else {
        logger.warn(
          `[TrainSolusCalibration] Script exited ${code}. stderr: ${stderr.slice(-500)}`,
        );
      }
      resolve({ success, stderr, stdout });
    });
  });
}

export async function registerSolusTrainCalibrationTask(
  runtime: IAgentRuntime,
  worldId?: UUID,
): Promise<void> {
  const enabled = process.env.SOLUS_TRAIN_CALIBRATION_ENABLED !== "false";
  if (!enabled) {
    logger.debug(
      "[TrainSolusCalibration] Task disabled (SOLUS_TRAIN_CALIBRATION_ENABLED=false).",
    );
    return;
  }

  const taskWorldId = worldId ?? (runtime.agentId as UUID);

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt) => {
      if (process.env.SOLUS_TRAIN_CALIBRATION_ENABLED === "false") return;

      const resolvedCount = getResolvedCount();
      if (resolvedCount < MIN_RESOLVED) {
        logger.info(
          `[TrainSolusCalibration] Skipping: ${resolvedCount} resolved (need ${MIN_RESOLVED}+). Resolve more predictions and re-run.`,
        );
        return;
      }

      const lastTrain = getLastTrainTime();
      const inCooldown =
        lastTrain > 0 && Date.now() - lastTrain < TRAIN_COOLDOWN_MS;
      if (inCooldown) {
        logger.debug(
          "[TrainSolusCalibration] Skipping: last training was < 24h ago.",
        );
        return;
      }

      logger.info(
        `[TrainSolusCalibration] Starting (${resolvedCount} resolved, min ${MIN_SAMPLES_ARG})...`,
      );
      const result = await runTrainingScript();

      if (result.success) {
        const mlService = rt.getService(
          "SOLUS_ML_INFERENCE_SERVICE",
        ) as SolusMlInferenceService | null;
        if (mlService?.reloadModels) {
          try {
            await mlService.reloadModels();
            logger.info(
              "[TrainSolusCalibration] ML calibrator reloaded (no restart needed).",
            );
          } catch (reloadErr) {
            logger.warn(
              `[TrainSolusCalibration] reloadModels failed: ${reloadErr}`,
            );
          }
        }
      } else if (result.stderr) {
        logger.warn(
          `[TrainSolusCalibration] Training failed: ${result.stderr.slice(-300)}`,
        );
      }
    },
  });

  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Train Solus assignment calibrator ONNX when 50+ resolved predictions; max once per 24h. Reloads ML service on success.",
    roomId: taskWorldId,
    worldId: taskWorldId,
    metadata: {
      updatedAt: Date.now(),
      updateInterval: UPDATE_INTERVAL_MS,
    },
    tags: ["solus", "calibration", "train", "onnx", "repeat"],
  });

  logger.info(
    "[TrainSolusCalibration] Task registered (50+ resolved, max 1/24h). Set SOLUS_TRAIN_CALIBRATION_ENABLED=false to disable.",
  );
}
