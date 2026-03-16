import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import { loadTop100FromMarkdown } from "../utils/top100Stocks";
import { prewarmFdPortfolioHistoryCache } from "../utils/fdPortfolioCachePrewarm";

const TASK_NAME = "VINCE_TOP100_FD_PREWARM";
const DEFAULT_INTERVAL_HOURS = 12;
const DEFAULT_YEARS = 1;
const DEFAULT_CONCURRENCY = 4;

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

export async function registerTop100FdPrewarmTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_TOP100_FD_PREWARM_ENABLED !== "false" &&
    process.env.VINCE_TOP100_FD_PREWARM_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[Top100FdPrewarm] Task disabled (VINCE_TOP100_FD_PREWARM_ENABLED=false)",
    );
    return;
  }

  const intervalHours = parsePositiveInt(
    process.env.VINCE_TOP100_FD_PREWARM_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const years = parsePositiveInt(
    process.env.VINCE_TOP100_FD_PREWARM_YEARS,
    DEFAULT_YEARS,
    1,
  );
  const concurrency = parsePositiveInt(
    process.env.VINCE_TOP100_FD_PREWARM_CONCURRENCY,
    DEFAULT_CONCURRENCY,
    1,
  );
  const intervalMs = intervalHours * 60 * 60 * 1000;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async () => {
      const apiKey = process.env.FINANCIAL_DATASETS_API_KEY?.trim();
      if (!apiKey) {
        logger.warn(
          "[Top100FdPrewarm] FINANCIAL_DATASETS_API_KEY missing; skipping",
        );
        return;
      }

      let tickers: string[];
      try {
        const { rows } = loadTop100FromMarkdown(process.cwd());
        tickers = Array.from(
          new Set(
            rows.map((r) => r.ticker.toUpperCase().trim()).filter(Boolean),
          ),
        );
      } catch (err) {
        logger.warn(
          `[Top100FdPrewarm] load Top100 failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }

      if (tickers.length === 0) {
        logger.debug("[Top100FdPrewarm] no tickers; skipping");
        return;
      }

      try {
        const out = await prewarmFdPortfolioHistoryCache({
          projectRoot: process.cwd(),
          tickers,
          years,
          force: false,
          apiKey,
          concurrency,
        });
        logger.info(
          `[Top100FdPrewarm] tickers=${out.tickerCount} hits=${out.hits} misses=${out.misses} range=${out.startDate}..${out.endDate}`,
        );
      } catch (err) {
        logger.warn(
          `[Top100FdPrewarm] failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Prewarm FD prices cache for Top100 tickers only (prices, 1y); cost-controlled",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "top100", "fd-cache", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: intervalMs,
    },
  });

  logger.info(
    `[Top100FdPrewarm] Task registered (interval ${intervalHours}h, years=${years}, concurrency=${concurrency})`,
  );
}
