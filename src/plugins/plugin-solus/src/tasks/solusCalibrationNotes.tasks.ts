/**
 * SOLUS_UPDATE_CALIBRATION_NOTES — Recurring task that computes calibration notes
 * (Brier by asset, by IV bucket) from resolved assignment predictions and writes
 * to solus-calibration-notes.txt for injection into SOLUS_CALIBRATION_CONTEXT.
 */

import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { writeCalibrationNotesFile } from "../utils/calibrationNotes";

const TASK_NAME = "SOLUS_UPDATE_CALIBRATION_NOTES";
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function registerSolusCalibrationNotesTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.SOLUS_CALIBRATION_NOTES_ENABLED !== "false";
  if (!enabled) {
    logger.debug(
      "[SolusCalibrationNotes] Task disabled (set SOLUS_CALIBRATION_NOTES_ENABLED=true to enable).",
    );
    return;
  }

  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async () => {
      if (process.env.SOLUS_CALIBRATION_NOTES_ENABLED === "false") return;
      try {
        writeCalibrationNotesFile();
        logger.debug("[SolusCalibrationNotes] Calibration notes file updated.");
      } catch (error) {
        logger.warn("[SolusCalibrationNotes] Failed to write notes:", error);
      }
    },
  });

  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Compute calibration notes (Brier by asset/IV) from resolved predictions and write to solus-calibration-notes.txt for SOLUS_CALIBRATION_CONTEXT.",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["solus", "calibration", "repeat", "daily"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: DAILY_INTERVAL_MS,
    },
  });

  logger.info(
    "[SolusCalibrationNotes] Task registered (daily). Updates solus-calibration-notes.txt for recursive learning.",
  );
}
