/**
 * Top100 FD snapshot refresh task: fundamentals, earnings, filings, insiders, company facts + snapshot rebuild.
 * Slower than price prewarm (e.g. 12h or 24h). Source tickers from portfolio JSONs.
 */

import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import { loadDexterPortfolioAssets } from "../utils/dexterPortfolio";
import { buildAllFdSnapshots } from "../utils/fdFactorBuilder";
import type { FdWarehouseDomain } from "../services/vinceFinancialDatasets.types";

const TASK_NAME = "VINCE_TOP100_FD_SNAPSHOT_REFRESH";
const DEFAULT_INTERVAL_HOURS = 24;
const DEFAULT_CONCURRENCY = 4;
const SNAPSHOT_DOMAINS: FdWarehouseDomain[] = [
  "fundamentals",
  "earnings",
  "filings",
  "insiders",
];

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min = 1,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return parsed;
}

function parseBool(value: string | undefined): boolean {
  const v = (value ?? "").toLowerCase().trim();
  return v === "true" || v === "1" || v === "yes";
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

export async function registerTop100FdSnapshotRefreshTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_TOP100_FD_SNAPSHOT_REFRESH_ENABLED !== "false" &&
    process.env.VINCE_TOP100_FD_SNAPSHOT_REFRESH_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[Top100FdSnapshotRefresh] Task disabled (VINCE_TOP100_FD_SNAPSHOT_REFRESH_ENABLED=false)",
    );
    return;
  }

  const intervalHours = parsePositiveInt(
    process.env.VINCE_TOP100_FD_SNAPSHOT_REFRESH_INTERVAL_HOURS,
    DEFAULT_INTERVAL_HOURS,
  );
  const concurrency = parsePositiveInt(
    process.env.VINCE_TOP100_FD_SNAPSHOT_REFRESH_CONCURRENCY,
    DEFAULT_CONCURRENCY,
    1,
  );
  const runOnStartup = parseBool(
    process.env.VINCE_TOP100_FD_SNAPSHOT_REFRESH_RUN_ON_STARTUP,
  );
  const intervalMs = intervalHours * 60 * 60 * 1000;

  const fdService = runtime.getService("VINCE_FINANCIAL_DATASETS_SERVICE") as {
    getApiKey?: () => string;
    refreshTicker?: (
      ticker: string,
      domains: FdWarehouseDomain[],
      projectRoot?: string,
    ) => Promise<{ domain: FdWarehouseDomain; ok: boolean }[]>;
    fetchAndCacheCompanyFacts?: (
      ticker: string,
      projectRoot?: string,
    ) => Promise<unknown>;
  } | null;

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async () => {
      const apiKey = process.env.FINANCIAL_DATASETS_API_KEY?.trim();
      if (!apiKey) {
        logger.warn(
          "[Top100FdSnapshotRefresh] FINANCIAL_DATASETS_API_KEY missing; skipping",
        );
        return;
      }

      const projectRoot = process.cwd();
      let tickers: string[];
      try {
        const assets = loadDexterPortfolioAssets(projectRoot);
        tickers = Array.from(
          new Set(
            assets.map((a) => a.ticker.toUpperCase().trim()).filter(Boolean),
          ),
        );
      } catch (err) {
        logger.warn(
          `[Top100FdSnapshotRefresh] load portfolio failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }

      if (tickers.length === 0) {
        logger.debug("[Top100FdSnapshotRefresh] no tickers; skipping");
        return;
      }

      if (fdService?.refreshTicker) {
        try {
          const refreshResults = await runWithConcurrency(
            tickers,
            concurrency,
            async (ticker) => {
              const results = await fdService.refreshTicker!(
                ticker,
                SNAPSHOT_DOMAINS,
                projectRoot,
              );
              return { ticker, results };
            },
          );
          const okByDomain: Record<string, number> = {};
          for (const { results } of refreshResults) {
            for (const r of results) {
              if (r.ok) okByDomain[r.domain] = (okByDomain[r.domain] ?? 0) + 1;
            }
          }
          logger.info(
            `[Top100FdSnapshotRefresh] refreshed ${tickers.length} tickers: ${JSON.stringify(okByDomain)}`,
          );
        } catch (err) {
          logger.warn(
            `[Top100FdSnapshotRefresh] domain refresh failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } else {
        logger.debug(
          "[Top100FdSnapshotRefresh] FD service not available; skipping domain refresh",
        );
      }

      if (fdService?.fetchAndCacheCompanyFacts) {
        try {
          await runWithConcurrency(tickers, concurrency, async (ticker) =>
            fdService.fetchAndCacheCompanyFacts!(ticker, projectRoot),
          );
          logger.info(
            `[Top100FdSnapshotRefresh] company facts cached for ${tickers.length} tickers`,
          );
        } catch (err) {
          logger.warn(
            `[Top100FdSnapshotRefresh] company facts fetch failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      try {
        const snapshots = buildAllFdSnapshots(projectRoot, tickers);
        logger.info(
          `[Top100FdSnapshotRefresh] built ${snapshots.length} FD snapshots`,
        );
      } catch (err) {
        logger.warn(
          `[Top100FdSnapshotRefresh] snapshot build failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  });

  const taskWorldId = runtime.agentId as UUID;
  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Refresh Top100 FD fundamentals/earnings/filings/insiders and rebuild factor snapshots",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "top100", "fd-snapshot", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: intervalMs,
    },
  });

  logger.info(
    `[Top100FdSnapshotRefresh] Task registered (interval ${intervalHours}h, concurrency=${concurrency}, runOnStartup=${runOnStartup})`,
  );

  if (runOnStartup) {
    setImmediate(async () => {
      try {
        const worker = runtime.getTaskWorker(TASK_NAME);
        const tasks = await runtime.getTasksByName(TASK_NAME);
        const task = tasks?.[0];
        if (worker && task) await worker.execute(runtime, {}, task);
      } catch (e) {
        logger.warn(
          `[Top100FdSnapshotRefresh] startup run failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    });
  }
}
