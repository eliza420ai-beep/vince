/**
 * Prediction validation daily task (Phase 6 #32)
 */

import { type IAgentRuntime, type Task, logger } from "@elizaos/core";
import type { UUID } from "@elizaos/core";
import type { PredictionTrackerService } from "../services/predictionTracker.service";

const DAILY_MS = 24 * 60 * 60 * 1000;
const TASK_NAME = "VINCE_PREDICTION_VALIDATE";

export async function registerPredictionValidationTask(
  runtime: IAgentRuntime,
): Promise<void> {
  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime, _options: unknown, task: Task) => {
      try {
        const tracker = rt.getService<PredictionTrackerService>(
          "VINCE_PREDICTION_TRACKER_SERVICE",
        );
        if (!tracker) {
          logger.warn("[PredictionValidation] Tracker unavailable");
          return;
        }
        const result = await tracker.resolveDuePredictions();
        const brier = tracker.getBrierByAgent(30);
        logger.info(
          `[PredictionValidation] resolved=${result.resolved} correct=${result.correct} incorrect=${result.incorrect} brier=${JSON.stringify(brier)}`,
        );

        if (task.id) {
          await rt.updateTask(task.id, {
            metadata: { ...task.metadata, updatedAt: Date.now() },
          });
        }
      } catch (e) {
        logger.error(`[PredictionValidation] Task failed: ${e}`);
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  setImmediate(() => {
    runtime
      .createTask({
        name: TASK_NAME,
        description:
          "Daily: resolve due predictions and compute Brier calibration by agent",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["vince", "predictions", "repeat"],
        metadata: {
          updateInterval: DAILY_MS,
          updatedAt: Date.now(),
        },
      })
      .then(() => logger.info("[PredictionValidation] Task registered"))
      .catch((e) =>
        logger.warn(`[PredictionValidation] createTask failed: ${e}`),
      );
  });
}
