/**
 * Weekly FD discovery report: write ranked candidates to portfolio_watchlist_candidates.json.
 * One atomic run: same ticker set → rank once → capture entry closes from cache → write outcomes-ready
 * history → register 1m/3m fd_discovery predictions from that run → write candidates file.
 * Does not auto-edit portfolio files. When VINCE_FD_DISCOVERY_FULL_UNIVERSE=true, uses full universe.
 */

import { type IAgentRuntime, logger } from "@elizaos/core";
import * as path from "node:path";
import { getFullCandidateUniverse } from "../utils/fdCandidateUniverse";
import {
  appendDiscoveryRun,
  buildFdDiscoveryPredictionInput,
} from "../utils/fdDiscoveryOutcomes";
import { getCloseOnOrAfterDate } from "../utils/financialDatasetsCache";
import type { VinceTickerDiscoveryService } from "../services/vinceTickerDiscovery.service";
import type { VinceFinancialDatasetsService } from "../services/vinceFinancialDatasets.service";
import type { PredictionTrackerService } from "../services/predictionTracker.service";
import type { FdDiscoveryCandidate } from "../utils/fdDiscoveryRanker";

const TASK_NAME = "VINCE_FD_DISCOVERY_WEEKLY";

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
      const discovery = runtime.getService(
        "VINCE_TICKER_DISCOVERY_SERVICE",
      ) as VinceTickerDiscoveryService | null;
      const fd = runtime.getService(
        "VINCE_FINANCIAL_DATASETS_SERVICE",
      ) as VinceFinancialDatasetsService | null;
      const projectRoot = process.cwd();
      const useFullUniverse =
        process.env.VINCE_FD_DISCOVERY_FULL_UNIVERSE === "true" ||
        process.env.VINCE_FD_DISCOVERY_FULL_UNIVERSE === "1";

      if (fd) {
        try {
          if (useFullUniverse) {
            const tickers = getFullCandidateUniverse(projectRoot);
            if (tickers.length > 0) {
              await fd.refreshForTickers(tickers, projectRoot);
              fd.buildSnapshots(projectRoot, { tickers });
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
        logger.warn(
          "[FdDiscoveryWeekly] VinceTickerDiscoveryService not found",
        );
        return;
      }

      try {
        const options = useFullUniverse
          ? { universe: "full" as const }
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

        const tracker = runtime.getService(
          "VINCE_PREDICTION_TRACKER_SERVICE",
        ) as PredictionTrackerService | null;
        if (tracker) {
          let registered = 0;
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

        const file = discovery.writeCandidatesFileFromResult(
          result,
          projectRoot,
        );
        logger.info(`[FdDiscoveryWeekly] Wrote ${file}`);
      } catch (e) {
        logger.warn(`[FdDiscoveryWeekly] writeCandidatesFile failed: ${e}`);
      }
    },
  });
}
