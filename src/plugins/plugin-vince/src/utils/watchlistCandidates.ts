import * as fs from "node:fs";
import * as path from "node:path";

export type WatchlistCandidateStatus =
  | "discovered"
  | "researching"
  | "scored"
  | "approved"
  | "rejected"
  | "promoted";

export type WatchlistCandidateSource = "x" | "manual" | "news" | "filing";

export interface WatchlistCandidate {
  ticker: string;
  status: WatchlistCandidateStatus;
  source: WatchlistCandidateSource;
  discoveredAt: number;
  whyAdded: string;
  notes?: string;
}

export interface WatchlistCandidatesFile {
  candidates: WatchlistCandidate[];
}

function normalizeTicker(ticker: string): string {
  return ticker.toUpperCase().trim();
}

export function readWatchlistCandidates(
  projectRoot: string = process.cwd(),
): WatchlistCandidatesFile | null {
  const filePath = path.join(
    path.resolve(projectRoot),
    "portfolio_watchlist_candidates.json",
  );
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<WatchlistCandidatesFile>;
  const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  return {
    candidates: candidates
      .filter((c) => c && typeof (c as any).ticker === "string")
      .map((c) => ({
        ...c,
        ticker: normalizeTicker((c as any).ticker),
      })) as WatchlistCandidate[],
  };
}
