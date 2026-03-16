import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import { VinceYahooQuotesService } from "../services/vinceYahooQuotes.service";

const TASK_NAME = "VINCE_TOP100_YAHOO_REFRESH";
const DEFAULT_INTERVAL_HOURS = 6;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_BATCH_SIZE = 16;

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

export async function registerTop100YahooRefreshTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_TOP100_YAHOO_REFRESH_ENABLED !== "false" &&
    process.env.VINCE_TOP100_YAHOO_REFRESH_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[Top100YahooRefresh] Task disabled (VINCE_TOP100_YAHOO_REFRESH_ENABLED=false)",
    );
    return;
  }

  const intervalHours = parsePositiveInt(
    process.env.VINCE_TOP100_YAHOO_REFRESH_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const ttlMsRaw = process.env.VINCE_TOP100_YAHOO_TTL_MS;
  const ttlMs =
    typeof ttlMsRaw === "string" && ttlMsRaw.length
      ? Number.parseInt(ttlMsRaw, 10)
      : DEFAULT_TTL_MS;
  const batchSize = parsePositiveInt(
    process.env.VINCE_TOP100_YAHOO_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
  );
  const runOnStartup =
    process.env.VINCE_TOP100_YAHOO_RUN_ON_STARTUP !== "false" &&
    process.env.VINCE_TOP100_YAHOO_RUN_ON_STARTUP !== "0";

  const intervalMs = intervalHours * 60 * 60 * 1000;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async () => {
      const svc = runtime.getService(
        VinceYahooQuotesService.serviceType,
      ) as VinceYahooQuotesService | null;
      if (!svc) {
        logger.warn(
          "[Top100YahooRefresh] Yahoo quote service not available; skipping",
        );
        return;
      }
      try {
        const result = await svc.refreshTop100Quotes({
          projectRoot: process.cwd(),
          ttlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS,
          batchSize,
          retryMisses: true,
        });
        logger.info(
          `[Top100YahooRefresh] requested=${result.requested} fetched=${result.fetched} skippedFresh=${result.skippedFresh} missed=${result.missed.length}${result.missed.length ? ` [${result.missed.slice(0, 5).join(", ")}${result.missed.length > 5 ? "…" : ""}]` : ""}`,
        );
      } catch (err) {
        logger.warn(
          `[Top100YahooRefresh] failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Refresh Yahoo quote cache for all Top100 tickers with retry for missed symbols",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "top100", "yahoo", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: intervalMs,
    },
  });

  if (runOnStartup) {
    setImmediate(async () => {
      const svc = runtime.getService(
        VinceYahooQuotesService.serviceType,
      ) as VinceYahooQuotesService | null;
      if (!svc) return;
      try {
        const result = await svc.refreshTop100Quotes({
          projectRoot: process.cwd(),
          ttlMs: Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS,
          batchSize,
          retryMisses: true,
        });
        logger.info(
          `[Top100YahooRefresh] startup run: requested=${result.requested} fetched=${result.fetched} missed=${result.missed.length}`,
        );
      } catch (err) {
        logger.warn(
          `[Top100YahooRefresh] startup run failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  }

  logger.info(
    `[Top100YahooRefresh] Task registered (interval ${intervalHours}h, batchSize=${batchSize}, runOnStartup=${runOnStartup})`,
  );
}
