/**
 * VINCE_HYPERSURFACE_WEEKLY_TEMP_WARM — Periodically runs BullBear fusion for BTC+HYPE
 * and writes vince:hypersurface_weekly_temp_check so Solus sees fresh 7d BULL/BEAR/NEUTRAL
 * without the user saying "options" first.
 */

import type { IAgentRuntime, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { runHypersurfaceWeeklyTempCheck } from "../utils/hypersurfaceWeeklyTempCheck";

const TASK_NAME = "VINCE_HYPERSURFACE_WEEKLY_TEMP_WARM";
const DEFAULT_INTERVAL_HOURS = 4;

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

export async function registerHypersurfaceWeeklyTempWarmTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_HYPERSURFACE_TEMP_WARM_ENABLED !== "false" &&
    process.env.VINCE_HYPERSURFACE_TEMP_WARM_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[HypersurfaceTempWarm] Disabled (VINCE_HYPERSURFACE_TEMP_WARM_ENABLED=false)",
    );
    return;
  }

  const intervalHours = parsePositiveInt(
    process.env.VINCE_HYPERSURFACE_TEMP_WARM_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt: IAgentRuntime, _options?: unknown, _task?: unknown) => {
      if (process.env.VINCE_HYPERSURFACE_TEMP_WARM_ENABLED === "false") return;
      try {
        const payload = await runHypersurfaceWeeklyTempCheck(rt);
        const line = payload.rows
          .map(
            (r) =>
              `${r.asset}=${r.temp}(${Math.round(r.conviction)}%/~${r.dataQualityScore}dq)`,
          )
          .join(" ");
        logger.info(`[HypersurfaceTempWarm] ${line}`);
      } catch (err) {
        logger.warn(
          `[HypersurfaceTempWarm] Failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  let existing: Awaited<ReturnType<IAgentRuntime["getTasksByName"]>> = [];
  try {
    existing = await runtime.getTasksByName(TASK_NAME);
  } catch (err) {
    logger.debug(
      `[HypersurfaceTempWarm] DB not ready, skip task row: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (existing.length === 0) {
    await runtime.createTask({
      name: TASK_NAME,
      description:
        "Warm Hypersurface 7d BULL/BEAR/NEUTRAL cache (BTC+HYPE) for Solus composeState.",
      roomId: taskWorldId,
      worldId: taskWorldId,
      tags: ["vince", "hypersurface", "options", "repeat"],
      metadata: {
        updatedAt: Date.now(),
        updateInterval: intervalMs,
      },
    });
  } else {
    logger.debug("[HypersurfaceTempWarm] Reusing existing scheduled task row");
  }

  logger.info(
    `[HypersurfaceTempWarm] Worker registered (every ${intervalHours}h). Set VINCE_HYPERSURFACE_TEMP_WARM_ENABLED=false to disable.`,
  );

  setImmediate(async () => {
    try {
      await runHypersurfaceWeeklyTempCheck(runtime);
      logger.info("[HypersurfaceTempWarm] Startup cache primed");
    } catch (err) {
      logger.warn(
        `[HypersurfaceTempWarm] Startup prime failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  });
}
