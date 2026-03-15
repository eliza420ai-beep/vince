/**
 * VINCE Ticker Discovery Service
 *
 * Ranks sleeve tickers (and optional expansion universe) into PromoteNow / ResearchNext / Avoid.
 * Surfaces via leaderboard and optional portfolio_watchlist_candidates.json.
 * Does not auto-edit portfolio_tastytrade.json or portfolio_watchlist.json.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getCurrentSleeveTickers,
  type UniverseMode,
} from "../utils/fdCandidateUniverse";
import {
  getFdReplayRows,
  getFdReplayRowsForUniverse,
} from "../utils/fdReplayImporter";
import {
  rankDiscoveryCandidates,
  type FdDiscoveryCandidate,
} from "../utils/fdDiscoveryRanker";
import {
  applyPromotionPolicy,
  type PromotionPolicyContext,
  type PromotionVerdict,
} from "../utils/fdPromotionPolicy";

export type DiscoveryUniverseSelector = "sleeve" | "full";

export interface RankedCandidatesOptions {
  universe?: DiscoveryUniverseSelector;
  /** When universe is "full", which mode to use (curated_full vs us_broad). Default curated_full. */
  universeMode?: UniverseMode;
}

export interface RankedCandidatesResult {
  promoteNow: FdDiscoveryCandidate[];
  researchNext: FdDiscoveryCandidate[];
  avoid: FdDiscoveryCandidate[];
  /** When universe is "full": re-ranks of current sleeve members only. */
  existingSleeve: FdDiscoveryCandidate[];
  /** When universe is "full": net-new candidates from peer or expansion universe. */
  newCandidates: FdDiscoveryCandidate[];
  generatedAt: string;
}

export class VinceTickerDiscoveryService extends Service {
  static serviceType = "VINCE_TICKER_DISCOVERY_SERVICE";
  capabilityDescription =
    "Sleeve ticker discovery: rank candidates into PromoteNow / ResearchNext / Avoid for dashboard and reports";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceTickerDiscoveryService> {
    const service = new VinceTickerDiscoveryService(runtime);
    logger.info("[VinceTickerDiscovery] Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceTickerDiscovery] Service stopped");
  }

  /**
   * Get ranked candidates from FD replay rows.
   * - universe "sleeve": current tastytrade + watchlist only (backward compatible).
   * - universe "full": sleeve + peer + expansion; returns existingSleeve and newCandidates separately.
   */
  getRankedCandidates(
    projectRoot: string = process.cwd(),
    options?: RankedCandidatesOptions,
  ): RankedCandidatesResult {
    const universe = options?.universe ?? "sleeve";
    const rows =
      universe === "full"
        ? getFdReplayRowsForUniverse(projectRoot, {
            mode: options?.universeMode ?? "curated_full",
          })
        : getFdReplayRows(projectRoot);
    const sleeveTickers = new Set(getCurrentSleeveTickers(projectRoot));
    const ranked = rankDiscoveryCandidates(rows, { sleeveTickers });
    const promoteNow = ranked.filter((r) => r.bucket === "PromoteNow");
    const researchNext = ranked.filter((r) => r.bucket === "ResearchNext");
    const avoid = ranked.filter((r) => r.bucket === "Avoid");

    let existingSleeve: FdDiscoveryCandidate[] = [];
    let newCandidates: FdDiscoveryCandidate[] = [];
    if (universe === "full" && rows.some((r) => r.source != null)) {
      const sleeveTickers = new Set(
        rows.filter((r) => r.source === "sleeve").map((r) => r.ticker),
      );
      for (const r of ranked) {
        if (sleeveTickers.has(r.ticker)) existingSleeve.push(r);
        else newCandidates.push(r);
      }
    }

    return {
      promoteNow,
      researchNext,
      avoid,
      existingSleeve,
      newCandidates,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Apply promotion policy to ranked candidates. Ranking answers "is this interesting?";
   * policy answers "should this move toward live sleeve consideration now?"
   * Returns verdicts (eligibleForPromotion, requiresHumanReview, blockedByPolicy) per candidate.
   */
  getPromotionVerdicts(
    result: RankedCandidatesResult,
    projectRoot: string = process.cwd(),
    context?: Partial<PromotionPolicyContext>,
  ): PromotionVerdict[] {
    const all = [
      ...result.promoteNow,
      ...result.researchNext,
      ...result.avoid,
      ...result.existingSleeve,
      ...result.newCandidates,
    ];
    const seen = new Set<string>();
    const unique: FdDiscoveryCandidate[] = [];
    for (const c of all) {
      const key = c.ticker.toUpperCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }
    return applyPromotionPolicy(unique, {
      projectRoot,
      sleeveTickers: new Set(getCurrentSleeveTickers(projectRoot)),
      ...context,
    });
  }

  /**
   * Write ranked candidates to a JSON file (e.g. portfolio_watchlist_candidates.json).
   * Does not modify portfolio_tastytrade.json or portfolio_watchlist.json.
   * When options.universe is "full", payload includes existingSleeve and newCandidates.
   */
  writeCandidatesFile(
    projectRoot: string = process.cwd(),
    outputPath?: string,
    options?: RankedCandidatesOptions,
  ): string {
    const result = this.getRankedCandidates(projectRoot, options);
    return this.writeCandidatesFileFromResult(result, projectRoot, outputPath);
  }

  /**
   * Write candidates file from a precomputed result (avoids double getRankedCandidates).
   */
  writeCandidatesFileFromResult(
    result: RankedCandidatesResult,
    projectRoot: string = process.cwd(),
    outputPath?: string,
  ): string {
    const file =
      outputPath ??
      path.join(projectRoot, "portfolio_watchlist_candidates.json");
    const toEntry = (c: FdDiscoveryCandidate) => ({
      ticker: c.ticker,
      sleeve: c.sleeve,
      score: c.score,
      reason: c.reason,
    });
    const payload: Record<string, unknown> = {
      generatedAt: result.generatedAt,
      promoteNow: result.promoteNow.map(toEntry),
      researchNext: result.researchNext.map(toEntry),
      avoid: result.avoid.map(toEntry),
    };
    if (result.newCandidates.length > 0 || result.existingSleeve.length > 0) {
      payload.existingSleeve = result.existingSleeve.map(toEntry);
      payload.newCandidates = result.newCandidates.map(toEntry);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf-8");
    return file;
  }
}
