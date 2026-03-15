/**
 * FD candidate universe: current sleeve, peer universe, expansion universe,
 * and optional broad US symbol master for discovery.
 *
 * Universe modes: sleeve (tastytrade + watchlist only), curated_full (sleeve + peer + expansion),
 * us_broad (symbol master — US common stocks, tradable on major US exchanges; north star is tastytrade).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  getFdSleeveTickers,
  loadDexterPortfolioAssets,
} from "./dexterPortfolio";

export type CandidateSource = "sleeve" | "peer" | "expansion" | "symbol_master";

/** Discovery universe mode: what set of tickers to run discovery on. */
export type UniverseMode = "sleeve" | "curated_full" | "us_broad";

/** One row in the FD symbol master (built from FD coverage or external list). */
export interface SymbolMasterRow {
  ticker: string;
  exchange?: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  country?: string;
  listingStatus?: string;
}

export interface CandidateUniverseRow {
  ticker: string;
  source: CandidateSource;
  sleeve?: string;
  targetWeightPct?: number;
  snapshotAt: number;
}

const FD_PEER_UNIVERSE_FILE = "fd_peer_universe.json";
const FD_EXPANSION_UNIVERSE_FILE = "fd_expansion_universe.json";
/** Symbol master: US equity tickers (tastytrade-tradeable scope: US exchange-listed). */
const FD_SYMBOL_MASTER_FILE = "fd_symbol_master.json";

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

export interface SymbolMasterOptions {
  /** Only include US-listed (country US or exchange NYSE/NASDAQ/AMEX). Default true for us_broad. */
  usOnly?: boolean;
  /** Allowed exchanges (e.g. NYSE, NASDAQ, AMEX). When set, filters to these for tastytrade-tradeable scope. */
  exchanges?: string[];
}

/**
 * Load symbol master rows from fd_symbol_master.json.
 * File format: { tickers: string[] } or { symbols: SymbolMasterRow[] } or SymbolMasterRow[].
 */
export function loadSymbolMaster(projectRoot?: string): SymbolMasterRow[] {
  const root = projectRoot ?? process.cwd();
  for (const dir of getUniverseSearchDirs(root)) {
    const filepath = path.join(dir, FD_SYMBOL_MASTER_FILE);
    if (!fs.existsSync(filepath)) continue;
    try {
      const raw = fs.readFileSync(filepath, "utf-8");
      const data = JSON.parse(raw) as unknown;
      if (Array.isArray(data)) {
        return (data as SymbolMasterRow[]).filter(
          (r) => r && typeof r.ticker === "string" && r.ticker.trim() !== "",
        );
      }
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj.symbols))
          return (obj.symbols as SymbolMasterRow[]).filter(
            (r) => r && typeof r.ticker === "string" && r.ticker.trim() !== "",
          );
        if (Array.isArray(obj.tickers))
          return (obj.tickers as string[]).map((t) => ({
            ticker: String(t).trim().toUpperCase(),
          }));
      }
    } catch {
      // skip invalid file
    }
  }
  return [];
}

/**
 * Tickers from the symbol master, optionally filtered to US exchanges (tastytrade-tradeable scope).
 */
export function getSymbolMasterTickers(
  projectRoot?: string,
  options?: SymbolMasterOptions,
): string[] {
  const rows = loadSymbolMaster(projectRoot ?? process.cwd());
  const opts = options ?? {};
  const usOnly = opts.usOnly !== false;
  const exchanges = opts.exchanges?.length
    ? new Set(opts.exchanges.map((e) => e.toUpperCase()))
    : null;

  return rows
    .filter((r) => {
      const t = r.ticker.trim().toUpperCase();
      if (!t) return false;
      if (usOnly && r.country && r.country.toUpperCase() !== "US") return false;
      if (usOnly && r.exchange) {
        const ex = r.exchange.toUpperCase();
        if (ex !== "NYSE" && ex !== "NASDAQ" && ex !== "AMEX") return false;
      }
      if (exchanges && r.exchange && !exchanges.has(r.exchange.toUpperCase()))
        return false;
      return true;
    })
    .map((r) => r.ticker.trim().toUpperCase());
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

export interface CandidateUniverseForModeOptions {
  /** For us_broad: filter symbol master to US exchanges. Default true. */
  symbolMasterUsOnly?: boolean;
  /** For us_broad: allowed exchanges (NYSE, NASDAQ, AMEX). */
  symbolMasterExchanges?: string[];
  /** For curated_full: same as FullUniverseOptions. */
  fullOptions?: FullUniverseOptions;
}

/**
 * Get candidate ticker list for a given universe mode.
 * - sleeve: current tastytrade + watchlist only.
 * - curated_full: sleeve + peer + expansion (existing full).
 * - us_broad: symbol master (fd_symbol_master.json), US/tastytrade-tradeable when options set; falls back to curated_full if no master file.
 */
export function getCandidateUniverseForMode(
  mode: UniverseMode,
  projectRoot?: string,
  options?: CandidateUniverseForModeOptions,
): string[] {
  const root = projectRoot ?? process.cwd();
  if (mode === "sleeve") return getCurrentSleeveTickers(root);
  if (mode === "curated_full") {
    return getFullCandidateUniverse(root, options?.fullOptions);
  }
  if (mode === "us_broad") {
    const tickers = getSymbolMasterTickers(root, {
      usOnly: options?.symbolMasterUsOnly ?? true,
      exchanges: options?.symbolMasterExchanges,
    });
    if (tickers.length > 0) return tickers;
    return getFullCandidateUniverse(root, options?.fullOptions);
  }
  return getFullCandidateUniverse(root, options?.fullOptions);
}

/**
 * Get candidate universe as rows with source for a given mode.
 * us_broad rows get source "symbol_master"; if fallback to curated_full, rows keep sleeve/peer/expansion.
 */
export function getCandidateUniverseRowsForMode(
  mode: UniverseMode,
  projectRoot?: string,
  options?: CandidateUniverseForModeOptions,
): CandidateUniverseRow[] {
  const root = projectRoot ?? process.cwd();
  const snapshotAt = Date.now();

  if (mode === "sleeve") {
    const assets = loadDexterPortfolioAssets(root);
    const fdSleeves = new Set(["tastytrade", "watchlist"]);
    return assets
      .filter((a) => fdSleeves.has(a.sleeve))
      .map((a) => ({
        ticker: a.ticker,
        source: "sleeve" as CandidateSource,
        sleeve: a.sleeve,
        targetWeightPct: a.targetWeightPct,
        snapshotAt,
      }));
  }

  if (mode === "us_broad") {
    const masterTickers = getSymbolMasterTickers(root, {
      usOnly: options?.symbolMasterUsOnly ?? true,
      exchanges: options?.symbolMasterExchanges,
    });
    if (masterTickers.length > 0) {
      return masterTickers.map((ticker) => ({
        ticker,
        source: "symbol_master" as CandidateSource,
        snapshotAt,
      }));
    }
  }

  return getCandidateUniverseRows(root, options?.fullOptions);
}
