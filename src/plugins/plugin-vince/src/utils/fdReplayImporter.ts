/**
 * FD replay importer: historical FD snapshots + sleeve membership → replayable rows.
 * For use in bench and Forge-style experiments (rules-based studies from stored data).
 * Supports both current-sleeve-only and full candidate universe (sleeve + peer + expansion).
 */

import type { CandidateSource, UniverseMode } from "./fdCandidateUniverse";
import {
  getCandidateUniverseRows,
  getCandidateUniverseRowsForMode,
} from "./fdCandidateUniverse";
import { loadDexterPortfolioAssets } from "./dexterPortfolio";
import { readFdSnapshot } from "./fdFactorBuilder";
import type { FdTickerSnapshot } from "./fdFactorBuilder.types";

export interface FdReplayRow {
  ticker: string;
  sleeve: string;
  targetWeightPct: number;
  snapshot: FdTickerSnapshot | null;
  snapshotAt: string | null;
  /** Present when row comes from getFdReplayRowsForUniverse (sleeve | peer | expansion). */
  source?: CandidateSource;
}

/**
 * Load replayable rows for all FD sleeve tickers: sleeve metadata + latest FD snapshot per ticker.
 * Backtests and bench can consume this without live API calls.
 */
export function getFdReplayRows(
  projectRoot: string = process.cwd(),
): FdReplayRow[] {
  const assets = loadDexterPortfolioAssets(projectRoot);
  const fdSleeves = new Set(["tastytrade", "watchlist"]);
  const rows: FdReplayRow[] = [];
  const seen = new Set<string>();
  for (const a of assets) {
    if (!fdSleeves.has(a.sleeve)) continue;
    if (seen.has(a.ticker)) continue;
    seen.add(a.ticker);
    const snapshot = readFdSnapshot(a.ticker, projectRoot);
    rows.push({
      ticker: a.ticker,
      sleeve: a.sleeve,
      targetWeightPct: a.targetWeightPct,
      snapshot,
      snapshotAt: snapshot?.snapshotAt ?? null,
    });
  }
  return rows;
}

export type FdReplayUniverseOptions = {
  includeSleeve?: boolean;
  includePeers?: boolean;
  includeExpansion?: boolean;
  /** When set, use universe mode (curated_full or us_broad) instead of includeSleeve/Peers/Expansion. */
  mode?: UniverseMode;
};

const DEFAULT_REPLAY_UNIVERSE_OPTIONS: FdReplayUniverseOptions = {
  includeSleeve: true,
  includePeers: true,
  includeExpansion: true,
};

/**
 * Load replayable rows for the full candidate universe (sleeve + peer + expansion, or symbol_master for us_broad).
 * Each row has source (sleeve | peer | expansion | symbol_master). Use for discovery ranking of net-new names.
 */
export function getFdReplayRowsForUniverse(
  projectRoot: string = process.cwd(),
  options?: FdReplayUniverseOptions,
): FdReplayRow[] {
  const opts = { ...DEFAULT_REPLAY_UNIVERSE_OPTIONS, ...options };
  const candidateRows = opts.mode
    ? getCandidateUniverseRowsForMode(opts.mode, projectRoot)
    : getCandidateUniverseRows(projectRoot, {
        includeSleeve: opts.includeSleeve,
        includePeers: opts.includePeers,
        includeExpansion: opts.includeExpansion,
        sleeveFirst: true,
      });
  const rows: FdReplayRow[] = [];
  for (const c of candidateRows) {
    const snapshot = readFdSnapshot(c.ticker, projectRoot);
    rows.push({
      ticker: c.ticker,
      sleeve: c.sleeve ?? c.source,
      targetWeightPct: c.targetWeightPct ?? 0,
      snapshot,
      snapshotAt: snapshot?.snapshotAt ?? null,
      source: c.source,
    });
  }
  return rows;
}
