/**
 * SOLUS_OPTIONS_REFRESH — Scheduled task that fetches Deribit options context
 * and writes it to SolusOptionsCacheService so SOLUS_OPTIONS_CONTEXT returns
 * instantly when the user asks (warm cache). Runs every 10–15 min when enabled.
 */

import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { fetchAndBuildOptionsContext } from "../providers/solusOptionsContext.provider";
import type { SolusOptionsCacheService } from "../services/solusOptionsCache.service";

const TASK_NAME = "SOLUS_OPTIONS_REFRESH";
const UPDATE_INTERVAL_MS = 10 * 60 * 1000; // 10 min

export async function registerSolusOptionsRefreshTask(
  runtime: IAgentRuntime,
  worldId?: UUID,
): Promise<void> {
  const enabled = process.env.SOLUS_OPTIONS_REFRESH_ENABLED !== "false";
  if (!enabled) {
    logger.debug(
      "[SolusOptionsRefresh] Task disabled (SOLUS_OPTIONS_REFRESH_ENABLED=false).",
    );
    return;
  }

  const taskWorldId = worldId ?? (runtime.agentId as UUID);

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt) => {
      if (process.env.SOLUS_OPTIONS_REFRESH_ENABLED === "false") return;

      const cacheService = rt.getService("SOLUS_OPTIONS_CACHE_SERVICE") as
        | SolusOptionsCacheService
        | null
        | undefined;
      if (!cacheService?.setCached) {
        logger.debug("[SolusOptionsRefresh] No cache service, skipping.");
        return;
      }

      const result = await fetchAndBuildOptionsContext(rt);
      if (result) {
        cacheService.setCached({
          text: result.text,
          optionsByAsset: result.optionsByAsset,
        });
        logger.debug(
          "[SolusOptionsRefresh] Options context cached for SOLUS_OPTIONS_CONTEXT.",
        );
      }
    },
  });

  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Refresh Deribit options context into cache so Solus has warm data (every 10 min).",
    roomId: taskWorldId,
    worldId: taskWorldId,
    metadata: {
      updatedAt: Date.now(),
      updateInterval: UPDATE_INTERVAL_MS,
    },
    tags: ["solus", "options", "deribit", "refresh", "repeat"],
  });

  logger.info(
    "[SolusOptionsRefresh] Task registered (every 10 min). Set SOLUS_OPTIONS_REFRESH_ENABLED=false to disable.",
  );
}
