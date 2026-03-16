import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import { buildTop100StocksSection } from "../utils/top100Enrichment";
import { appendTop100Snapshot } from "../utils/top100History";

const TASK_NAME = "VINCE_TOP100_SNAPSHOT";
const DEFAULT_INTERVAL_HOURS = 24;

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

export async function registerTop100SnapshotTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_TOP100_SNAPSHOT_ENABLED !== "false" &&
    process.env.VINCE_TOP100_SNAPSHOT_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[Top100Snapshot] Task disabled (VINCE_TOP100_SNAPSHOT_ENABLED=false)",
    );
    return;
  }

  const intervalHours = parsePositiveInt(
    process.env.VINCE_TOP100_SNAPSHOT_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const intervalMs = intervalHours * 60 * 60 * 1000;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async () => {
      try {
        const { section, status } = buildTop100StocksSection({
          projectRoot: process.cwd(),
          hip3: null,
        });
        if (!section?.rows?.length) {
          logger.debug("[Top100Snapshot] skipped: no rows");
          return;
        }

        const result = appendTop100Snapshot({
          rows: section.rows,
          status,
          projectRoot: process.cwd(),
        });
        logger.info(
          `[Top100Snapshot] ${result.appended ? "appended" : "skipped"} | rows=${section.rows.length} status=${status}${result.reason ? ` reason=${result.reason}` : ""}`,
        );
      } catch (err) {
        logger.warn(
          `[Top100Snapshot] failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Capture compact Top100 snapshots for history-based drift and ritual modules",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "top100", "history", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: intervalMs,
    },
  });

  logger.info(`[Top100Snapshot] Task registered (interval ${intervalHours}h)`);
}
