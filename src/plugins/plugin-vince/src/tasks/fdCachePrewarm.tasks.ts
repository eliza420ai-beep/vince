import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import {
  prewarmFdPortfolioHistoryCache,
  readFdCacheManifest,
} from "../utils/fdPortfolioCachePrewarm";

const DEFAULT_INTERVAL_HOURS = 6;
const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_RANGE_YEARS = 5;
const TASK_NAME = "VINCE_FD_CACHE_PREWARM";

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function getManifestAgeHours(projectRoot = process.cwd()): number | null {
  const manifest = readFdCacheManifest(projectRoot);
  if (!manifest?.generatedAt) return null;
  const ts = new Date(manifest.generatedAt).getTime();
  if (!Number.isFinite(ts)) return null;
  return (Date.now() - ts) / (60 * 60 * 1000);
}

export async function registerFdCachePrewarmTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_FD_CACHE_PREWARM_ENABLED !== "false" &&
    process.env.VINCE_FD_CACHE_PREWARM_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[FdCachePrewarm] Task disabled (VINCE_FD_CACHE_PREWARM_ENABLED=false)",
    );
    return;
  }

  const intervalHours = parsePositiveInt(
    process.env.VINCE_FD_CACHE_PREWARM_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const maxAgeHours = parsePositiveInt(
    process.env.VINCE_FD_CACHE_MAX_AGE_HOURS,
    DEFAULT_MAX_AGE_HOURS,
  );
  const rangeYears = parsePositiveInt(
    process.env.VINCE_FD_CACHE_PREWARM_YEARS,
    DEFAULT_RANGE_YEARS,
  );
  const force = process.env.VINCE_FD_CACHE_PREWARM_FORCE === "true";
  const intervalMs = intervalHours * 60 * 60 * 1000;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async () => {
      const apiKey = process.env.FINANCIAL_DATASETS_API_KEY?.trim();
      if (!apiKey) {
        logger.warn(
          "[FdCachePrewarm] FINANCIAL_DATASETS_API_KEY missing; skipping prewarm",
        );
        return;
      }

      const ageHours = getManifestAgeHours();
      const shouldRefresh =
        force || ageHours == null || ageHours >= maxAgeHours;
      if (!shouldRefresh) {
        logger.debug(
          `[FdCachePrewarm] Cache still fresh (${ageHours.toFixed(1)}h old < ${maxAgeHours}h)`,
        );
        return;
      }

      try {
        const out = await prewarmFdPortfolioHistoryCache({
          years: rangeYears,
          force,
          apiKey,
        });
        logger.info(
          `[FdCachePrewarm] done | tickers=${out.tickerCount} hits=${out.hits} misses=${out.misses} range=${out.startDate}..${out.endDate}`,
        );
      } catch (err) {
        logger.warn(
          `[FdCachePrewarm] failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Prewarm Financial Datasets cache for tastytrade/watchlist portfolios when manifest is stale",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "fd-cache", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: intervalMs,
      maxAgeHours,
      rangeYears,
      force,
    },
  });

  logger.info(
    `[FdCachePrewarm] Task registered (interval ${intervalHours}h, stale-after ${maxAgeHours}h, years=${rangeYears})`,
  );
}
