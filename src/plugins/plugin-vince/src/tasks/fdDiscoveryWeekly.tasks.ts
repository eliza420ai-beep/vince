/**
 * Weekly FD discovery report: write ranked candidates to portfolio_watchlist_candidates.json.
 * One atomic run: same ticker set → rank once → capture entry closes from cache → write outcomes-ready
 * history → register 1m/3m fd_discovery predictions from that run → write candidates file.
 * Does not auto-edit portfolio files. When VINCE_FD_DISCOVERY_FULL_UNIVERSE=true, uses full universe.
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import {
  getCandidateUniverseForMode,
  type UniverseMode,
} from "../utils/fdCandidateUniverse";
import {
  appendDiscoveryRun,
  buildFdDiscoveryPredictionInput,
  writeDiscoveryMetrics,
} from "../utils/fdDiscoveryOutcomes";
import { getCloseOnOrAfterDate } from "../utils/financialDatasetsCache";
import type { VinceTickerDiscoveryService } from "../services/vinceTickerDiscovery.service";
import type { VinceFinancialDatasetsService } from "../services/vinceFinancialDatasets.service";
import type { PredictionTrackerService } from "../services/predictionTracker.service";
import type { FdDiscoveryCandidate } from "../utils/fdDiscoveryRanker";

const TASK_NAME = "VINCE_FD_DISCOVERY_WEEKLY";

export interface FdDiscoveryRunResult {
  success: boolean;
  file?: string;
  discoveryRunId?: string;
  registeredPredictions?: number;
  candidateCounts?: {
    promoteNow: number;
    researchNext: number;
    avoid: number;
    existingSleeve: number;
    newCandidates: number;
  };
  useFullUniverse: boolean;
  message?: string;
}

export async function runFdDiscoveryNow(
  runtime: IAgentRuntime,
  projectRoot: string = process.cwd(),
): Promise<FdDiscoveryRunResult> {
  const discovery = runtime.getService(
    "VINCE_TICKER_DISCOVERY_SERVICE",
  ) as VinceTickerDiscoveryService | null;
  const fd = runtime.getService(
    "VINCE_FINANCIAL_DATASETS_SERVICE",
  ) as VinceFinancialDatasetsService | null;
  const useFullUniverse =
    process.env.VINCE_FD_DISCOVERY_FULL_UNIVERSE === "true" ||
    process.env.VINCE_FD_DISCOVERY_FULL_UNIVERSE === "1";
  const modeRaw = process.env.VINCE_FD_DISCOVERY_UNIVERSE_MODE as
    | UniverseMode
    | undefined;
  const universeMode: UniverseMode =
    modeRaw === "sleeve" || modeRaw === "curated_full" || modeRaw === "us_broad"
      ? modeRaw
      : useFullUniverse
        ? "curated_full"
        : "sleeve";

  let lastRefreshScreened: number | undefined;
  let lastRefreshEnriched: number | undefined;
  if (fd) {
    try {
      if (universeMode !== "sleeve") {
        const tickers = getCandidateUniverseForMode(universeMode, projectRoot);
        if (tickers.length > 0) {
          const refreshResult = await fd.refreshForTickers(
            tickers,
            projectRoot,
          );
          if (refreshResult.coarseScreen) {
            lastRefreshScreened = refreshResult.coarseScreen.screenedCount;
            lastRefreshEnriched = refreshResult.coarseScreen.survivorsCount;
          } else {
            lastRefreshEnriched =
              refreshResult.enrichedTickers?.length ??
              refreshResult.other?.length ??
              tickers.length;
          }
          const toSnapshot = refreshResult.enrichedTickers ?? tickers;
          fd.buildSnapshots(projectRoot, { tickers: toSnapshot });
        } else {
          fd.buildSnapshots(projectRoot);
        }
      } else {
        fd.buildSnapshots(projectRoot);
      }
    } catch (e) {
      logger.warn(`[FdDiscoveryWeekly] buildSnapshots failed: ${e}`);
    }
  }

  if (!discovery) {
    const message = "VinceTickerDiscoveryService not found";
    logger.warn(`[FdDiscoveryWeekly] ${message}`);
    return { success: false, message, useFullUniverse };
  }

  try {
    const options =
      universeMode !== "sleeve"
        ? { universe: "full" as const, universeMode }
        : undefined;
    const result = discovery.getRankedCandidates(projectRoot, options);
    const todayIso = new Date().toISOString().slice(0, 10);
    const allCandidates: FdDiscoveryCandidate[] = [
      ...result.promoteNow,
      ...result.researchNext,
      ...result.avoid,
      ...result.existingSleeve,
      ...result.newCandidates,
    ];
    const seen = new Set<string>();
    const uniqueCandidates: FdDiscoveryCandidate[] = [];
    for (const c of allCandidates) {
      const key = c.ticker.toUpperCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueCandidates.push(c);
    }

    const pickTimeByTicker = new Map<
      string,
      {
        entryBarDate: string;
        entryClose: number;
        horizon1mDueAt: number;
        horizon3mDueAt: number;
        priceFile?: string;
      }
    >();
    const horizon1mDueAt = Date.now() + 22 * 24 * 60 * 60 * 1000;
    const horizon3mDueAt = Date.now() + 66 * 24 * 60 * 60 * 1000;
    for (const c of uniqueCandidates) {
      const entry = getCloseOnOrAfterDate(projectRoot, c.ticker, todayIso);
      if (entry) {
        pickTimeByTicker.set(c.ticker.toUpperCase().trim(), {
          entryBarDate: entry.date,
          entryClose: entry.close,
          horizon1mDueAt,
          horizon3mDueAt,
        });
      }
    }

    const discoveryRunId = appendDiscoveryRun(
      result,
      projectRoot,
      pickTimeByTicker,
    );

    const rankedCount =
      result.promoteNow.length +
      result.researchNext.length +
      result.avoid.length +
      (result.existingSleeve?.length ?? 0) +
      (result.newCandidates?.length ?? 0);
    writeDiscoveryMetrics(projectRoot, {
      ...(lastRefreshScreened != null && {
        screenedCount: lastRefreshScreened,
      }),
      enrichedCount: lastRefreshEnriched ?? rankedCount,
      rankedCount,
      generatedAt: result.generatedAt,
    });

    const tracker = runtime.getService(
      "VINCE_PREDICTION_TRACKER_SERVICE",
    ) as PredictionTrackerService | null;
    let registered = 0;
    if (tracker) {
      for (const c of uniqueCandidates) {
        const pick = pickTimeByTicker.get(c.ticker.toUpperCase().trim());
        if (!pick) continue;
        const source =
          c.sleeve === "peer"
            ? ("peer" as const)
            : c.sleeve === "expansion"
              ? ("expansion" as const)
              : ("sleeve" as const);
        for (const horizon of ["1m", "3m"] as const) {
          const input = buildFdDiscoveryPredictionInput(c.ticker, horizon, {
            discoveryRunId,
            entryBarDate: pick.entryBarDate,
            entryClose: pick.entryClose,
            bucket: c.bucket ?? "ResearchNext",
            candidateSource: source,
            discoveryScore: c.score,
          });
          await tracker.registerPrediction(
            {
              agent: input.agent,
              kind: input.kind,
              direction: input.direction,
              confidenceProb: input.confidenceProb,
              horizonHours: input.horizonHours,
              asset: input.asset,
              metadata: input.metadata,
            },
            projectRoot,
          );
          registered++;
        }
      }
      if (registered > 0) {
        logger.info(
          `[FdDiscoveryWeekly] Registered ${registered} fd_discovery predictions (1m+3m)`,
        );
      }
    }

    const file = discovery.writeCandidatesFileFromResult(result, projectRoot);
    logger.info(`[FdDiscoveryWeekly] Wrote ${file}`);
    return {
      success: true,
      file,
      discoveryRunId,
      registeredPredictions: registered,
      candidateCounts: {
        promoteNow: result.promoteNow.length,
        researchNext: result.researchNext.length,
        avoid: result.avoid.length,
        existingSleeve: result.existingSleeve.length,
        newCandidates: result.newCandidates.length,
      },
      useFullUniverse,
    };
  } catch (e) {
    const message = String(e);
    logger.warn(`[FdDiscoveryWeekly] writeCandidatesFile failed: ${message}`);
    return { success: false, message, useFullUniverse };
  }
}

export async function registerFdDiscoveryWeeklyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.VINCE_FD_DISCOVERY_WEEKLY_ENABLED !== "false" &&
    process.env.VINCE_FD_DISCOVERY_WEEKLY_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[FdDiscoveryWeekly] Task disabled (VINCE_FD_DISCOVERY_WEEKLY_ENABLED=false)",
    );
    return;
  }

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (_runtime, _options, _task) => {
      await runFdDiscoveryNow(runtime, process.cwd());
    },
  });
}
