/**
 * Polymarket desk – Executor poll. Runs every 2 min; triggers POLYMARKET_EXECUTE_PENDING_ORDER
 * so Otaku picks up and executes the next pending sized order when configured.
 */

import type { IAgentRuntime, Memory, Task, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 min

function syntheticMessage(text: string, runtime: IAgentRuntime): Memory {
  return {
    id: "" as UUID,
    content: { text },
    roomId: ZERO_UUID,
    entityId: runtime.agentId,
    agentId: runtime.agentId,
    createdAt: Date.now(),
  };
}

export function registerPolymarketExecutePollTask(
  runtime: IAgentRuntime,
): void {
  runtime.registerTaskWorker({
    name: "POLYMARKET_EXECUTE_POLL",
    execute: async (rt, _options, task) => {
      if (process.env.POLYMARKET_DESK_SCHEDULE_ENABLED === "false") return;
      try {
        const msg = syntheticMessage("execute pending polymarket order", rt);
        await rt.processActions(msg, [], undefined, undefined);
      } catch (e) {
        logger.debug("[Otaku] Polymarket execute poll:", e);
      }
      if (task.id) {
        await rt.updateTask(task.id, {
          metadata: { ...task.metadata, updatedAt: Date.now() },
        });
      }
    },
  });

  const taskWorldId = runtime.agentId ?? ZERO_UUID;
  setImmediate(() => {
    runtime
      .createTask({
        name: "POLYMARKET_EXECUTE_POLL",
        description: "Poll and execute next pending Polymarket sized order",
        roomId: taskWorldId,
        worldId: taskWorldId,
        tags: ["polymarket", "desk", "executor"],
        metadata: { updateInterval: POLL_INTERVAL_MS, updatedAt: Date.now() },
      })
      .then(() =>
        logger.info(
          "[Otaku] Registered POLYMARKET_EXECUTE_POLL (2m). Set POLYMARKET_DESK_SCHEDULE_ENABLED=false to disable.",
        ),
      )
      .catch((e) =>
        logger.warn("[Otaku] createTask POLYMARKET_EXECUTE_POLL:", e),
      );
  });
}
