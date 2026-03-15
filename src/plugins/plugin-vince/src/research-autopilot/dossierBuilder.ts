/**
 * Research Autopilot — canonical ticker dossier format and mapping from watchlist/discovery outputs.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  TickerDossier,
  TickerDossierSourceBucket,
  ResearchAutopilotSelectionMode,
} from "./types";

export interface WatchlistCandidateEntry {
  ticker: string;
  sleeve: string;
  score: number;
  reason: string;
}

export interface WatchlistCandidatesFile {
  generatedAt?: string;
  promoteNow: WatchlistCandidateEntry[];
  researchNext: WatchlistCandidateEntry[];
  avoid?: WatchlistCandidateEntry[];
  newCandidates?: WatchlistCandidateEntry[];
  existingSleeve?: WatchlistCandidateEntry[];
}

const CANDIDATES_FILENAME = "portfolio_watchlist_candidates.json";

function toDossier(
  entry: WatchlistCandidateEntry,
  sourceBucket: TickerDossierSourceBucket,
): TickerDossier {
  return {
    symbol: entry.ticker,
    sourceBucket,
    discoveryReason: entry.reason,
    businessSummary: undefined,
    thesisBullets: undefined,
    bullCase: undefined,
    bearCase: undefined,
    catalysts: undefined,
    risks: undefined,
    citations: undefined,
  };
}

/**
 * Load candidates from portfolio_watchlist_candidates.json (or given path).
 */
export function loadWatchlistCandidates(
  projectRoot: string = process.cwd(),
  candidatesPath?: string,
): WatchlistCandidatesFile | null {
  const pathToUse =
    candidatesPath ?? path.join(projectRoot, CANDIDATES_FILENAME);
  if (!fs.existsSync(pathToUse)) return null;
  try {
    const raw = fs.readFileSync(pathToUse, "utf-8");
    const data = JSON.parse(raw) as WatchlistCandidatesFile;
    if (!Array.isArray(data.promoteNow) || !Array.isArray(data.researchNext)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Select symbols from candidates file by mode, up to maxCount.
 */
export function selectSymbols(
  candidates: WatchlistCandidatesFile,
  mode: ResearchAutopilotSelectionMode,
  maxCount: number,
  customSymbols?: string[],
): string[] {
  let list: WatchlistCandidateEntry[] = [];
  if (mode === "add_now") {
    list = [...candidates.promoteNow];
  } else if (mode === "research_next") {
    list = [...candidates.researchNext];
  } else if (mode === "net_new") {
    list = [...(candidates.newCandidates ?? [])];
  } else if (mode === "add_now_plus_research") {
    list = [...candidates.promoteNow, ...candidates.researchNext];
  } else if (mode === "custom_symbols" && customSymbols?.length) {
    const set = new Set(customSymbols.map((s) => s.trim().toUpperCase()));
    const fromPromote = candidates.promoteNow.filter((e) => set.has(e.ticker));
    const fromResearch = candidates.researchNext.filter((e) =>
      set.has(e.ticker),
    );
    const fromNew = (candidates.newCandidates ?? []).filter((e) =>
      set.has(e.ticker),
    );
    list = [...fromPromote, ...fromResearch, ...fromNew];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of list) {
    if (seen.has(e.ticker)) continue;
    seen.add(e.ticker);
    out.push(e.ticker);
    if (out.length >= maxCount) break;
  }
  return out;
}

/**
 * Build canonical dossiers for selected symbols from the candidates file.
 */
export function buildDossiersFromCandidates(
  candidates: WatchlistCandidatesFile,
  selectedSymbols: string[],
): TickerDossier[] {
  const set = new Set(selectedSymbols);
  const byTicker = new Map<
    string,
    { entry: WatchlistCandidateEntry; bucket: TickerDossierSourceBucket }
  >();

  for (const e of candidates.promoteNow) {
    if (set.has(e.ticker))
      byTicker.set(e.ticker, { entry: e, bucket: "add_now" });
  }
  for (const e of candidates.researchNext) {
    if (set.has(e.ticker) && !byTicker.has(e.ticker))
      byTicker.set(e.ticker, { entry: e, bucket: "research_next" });
  }
  for (const e of candidates.newCandidates ?? []) {
    if (set.has(e.ticker) && !byTicker.has(e.ticker))
      byTicker.set(e.ticker, { entry: e, bucket: "net_new" });
  }

  return selectedSymbols
    .map((sym) => {
      const v = byTicker.get(sym);
      if (!v) return null;
      return toDossier(v.entry, v.bucket);
    })
    .filter((d): d is TickerDossier => d != null);
}
