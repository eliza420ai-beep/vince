/**
 * FD candidate universe: current sleeve, peer universe, and expansion universe
 * so discovery can rank net-new names, not just current sleeve members.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  getFdSleeveTickers,
  loadDexterPortfolioAssets,
} from "./dexterPortfolio";

export type CandidateSource = "sleeve" | "peer" | "expansion";

export interface CandidateUniverseRow {
  ticker: string;
  source: CandidateSource;
  sleeve?: string;
  targetWeightPct?: number;
  snapshotAt: number;
}

const FD_PEER_UNIVERSE_FILE = "fd_peer_universe.json";
const FD_EXPANSION_UNIVERSE_FILE = "fd_expansion_universe.json";

/** Default search paths for universe seed files (first existing wins). */
function getUniverseSearchDirs(projectRoot: string): string[] {
  return [
    path.join(projectRoot, "knowledge", "trading"),
    path.join(projectRoot, ".elizadb", "financialdatasets-cache"),
    path.join(projectRoot, "knowledge"),
  ];
}

/**
 * Load a JSON array of ticker strings from a file.
 * Searches knowledge/trading, .elizadb/financialdatasets-cache, knowledge.
 */
function loadTickerListFromFile(
  filename: string,
  projectRoot: string,
): string[] {
  for (const dir of getUniverseSearchDirs(projectRoot)) {
    const filepath = path.join(dir, filename);
    if (!fs.existsSync(filepath)) continue;
    try {
      const raw = fs.readFileSync(filepath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data
          .filter(
            (s: unknown) =>
              typeof s === "string" && (s as string).trim() !== "",
          )
          .map((s: string) => (s as string).trim().toUpperCase());
      }
      if (data && Array.isArray(data.tickers)) {
        return (data.tickers as string[])
          .filter((s) => typeof s === "string" && s.trim() !== "")
          .map((s) => s.trim().toUpperCase());
      }
    } catch {
      // skip invalid file
    }
  }
  return [];
}

/** Current sleeve tickers (tastytrade + watchlist). Deduplicated, uppercase. */
export function getCurrentSleeveTickers(projectRoot?: string): string[] {
  return getFdSleeveTickers(projectRoot ?? process.cwd());
}

/** Peer/sector comp tickers from fd_peer_universe.json (or empty). */
export function getPeerUniverseTickers(projectRoot?: string): string[] {
  return loadTickerListFromFile(
    FD_PEER_UNIVERSE_FILE,
    projectRoot ?? process.cwd(),
  );
}

/** Expansion universe: curated liquid US equities from fd_expansion_universe.json (or empty). */
export function getExpansionUniverseTickers(projectRoot?: string): string[] {
  return loadTickerListFromFile(
    FD_EXPANSION_UNIVERSE_FILE,
    projectRoot ?? process.cwd(),
  );
}

export interface FullUniverseOptions {
  includeSleeve?: boolean;
  includePeers?: boolean;
  includeExpansion?: boolean;
  /** If true, sleeve tickers are first and dedup from peers/expansion. Default true. */
  sleeveFirst?: boolean;
}

const DEFAULT_FULL_OPTIONS: FullUniverseOptions = {
  includeSleeve: true,
  includePeers: true,
  includeExpansion: true,
  sleeveFirst: true,
};

/**
 * Full candidate universe: union of sleeve + peers + expansion with optional dedup.
 * Order: sleeve first (when sleeveFirst), then peers, then expansion; duplicates removed by first occurrence.
 */
export function getFullCandidateUniverse(
  projectRoot?: string,
  options?: FullUniverseOptions,
): string[] {
  const root = projectRoot ?? process.cwd();
  const opts = { ...DEFAULT_FULL_OPTIONS, ...options };
  const seen = new Set<string>();
  const out: string[] = [];

  if (opts.includeSleeve) {
    for (const t of getCurrentSleeveTickers(root)) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  if (opts.includePeers) {
    for (const t of getPeerUniverseTickers(root)) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  if (opts.includeExpansion) {
    for (const t of getExpansionUniverseTickers(root)) {
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

/**
 * Candidate universe as rows with source (sleeve | peer | expansion) for discovery and replay.
 */
export function getCandidateUniverseRows(
  projectRoot?: string,
  options?: FullUniverseOptions,
): CandidateUniverseRow[] {
  const root = projectRoot ?? process.cwd();
  const snapshotAt = Date.now();
  const opts = { ...DEFAULT_FULL_OPTIONS, ...options };
  const rows: CandidateUniverseRow[] = [];
  const seenTicker = new Set<string>();

  if (opts.includeSleeve) {
    const assets = loadDexterPortfolioAssets(root);
    const fdSleeves = new Set(["tastytrade", "watchlist"]);
    for (const a of assets) {
      if (!fdSleeves.has(a.sleeve)) continue;
      if (seenTicker.has(a.ticker)) continue;
      seenTicker.add(a.ticker);
      rows.push({
        ticker: a.ticker,
        source: "sleeve",
        sleeve: a.sleeve,
        targetWeightPct: a.targetWeightPct,
        snapshotAt,
      });
    }
  }
  if (opts.includePeers) {
    for (const t of getPeerUniverseTickers(root)) {
      if (seenTicker.has(t)) continue;
      seenTicker.add(t);
      rows.push({
        ticker: t,
        source: "peer",
        snapshotAt,
      });
    }
  }
  if (opts.includeExpansion) {
    for (const t of getExpansionUniverseTickers(root)) {
      if (seenTicker.has(t)) continue;
      seenTicker.add(t);
      rows.push({
        ticker: t,
        source: "expansion",
        snapshotAt,
      });
    }
  }
  return rows;
}
