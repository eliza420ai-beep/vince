/**
 * Counterfactual Engine Weekly Task (#22)
 *
 * Every 7 days: load avoided decisions, check outcomes,
 * generate report, push to Discord ops channels.
 */

import { type IAgentRuntime, type Task, logger } from "@elizaos/core";
import type { UUID } from "@elizaos/core";
import type { VinceCounterfactualService } from "../services/vinceCounterfactual.service";

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
const TASK_NAME = "VINCE_COUNTERFACTUAL_WEEKLY";

export async function registerCounterfactualWeeklyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.VINCE_COUNTERFACTUAL_ENABLED !== "false";
  if (!enabled) {
    logger.debug("[Counterfactual] Weekly task disabled");
    return;
  }

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime, _options: unknown, task: Task) => {
      try {
        const svc = rt.getService<VinceCounterfactualService>(
          "VINCE_COUNTERFACTUAL_SERVICE",
        );
        if (!svc) {
          logger.warn("[Counterfactual] Service not available, skipping");
          return;
        }

        const report = await svc.generateReport(7);

        const summary = [
          `**Counterfactual Report (7d)**`,
          `Avoided: ${report.totalAvoided} | Analyzed: ${report.analyzed}`,
          `Correct skips: ${report.correctSkips} (${report.correctSkipPct.toFixed(0)}%)`,
          `Missed winners: ${report.missedWinners}`,
          `Missed opportunity cost: $${report.missedOpportunityCostUsd.toFixed(0)}`,
          `Avg missed move: ${report.avgMissedPnlPct.toFixed(2)}%`,
          ``,
          `**Recommendations:**`,
          ...report.recommendations.map((r) => `• ${r}`),
        ].join("\n");

        logger.info(`[Counterfactual] ${summary}`);

        // Push to ops channels if available
        await pushToOpsChannels(rt, summary);

        if (task.id) {
          await rt.updateTask(task.id, {
            metadata: { ...task.metadata, updatedAt: Date.now() },
          });
        }
      } catch (e) {
        logger.error(`[Counterfactual] Weekly task failed: ${e}`);
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  setImmediate(() => {
    runtime
      .createTask({
        name: TASK_NAME,
        description: "Weekly counterfactual analysis of avoided trades",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["vince", "counterfactual", "genome", "repeat"],
        metadata: {
          updateInterval: WEEKLY_MS,
          updatedAt: Date.now(),
        },
      })
      .then(() => logger.info("[Counterfactual] Weekly task registered"))
      .catch((e) => logger.warn(`[Counterfactual] createTask failed: ${e}`));
  });
}

async function pushToOpsChannels(
  runtime: IAgentRuntime,
  message: string,
): Promise<void> {
  try {
    const discordService = runtime.getService("discord");
    if (!discordService) return;

    const rooms = await runtime.getRooms(runtime.agentId as UUID);
    for (const room of rooms) {
      const name = (room.name ?? "").toLowerCase();
      if (name.includes("ops") || name.includes("trading")) {
        await runtime.createMemory(
          {
            entityId: runtime.agentId as UUID,
            agentId: runtime.agentId as UUID,
            roomId: room.id as UUID,
            content: { text: message },
          },
          "messages",
        );
      }
    }
  } catch {
    // Non-critical
  }
}
