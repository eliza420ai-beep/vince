/**
 * FD discovery outcome tracking: persist weekly candidate lists for later calibration.
 * Each run appends a line to discovery-candidates-history.jsonl with timestamp, scores, reasons, universe source.
 * Immutable pick-time fields (entryBarDate, entryClose, horizons) make runs resolvable at 1m/3m.
 * Resolved outcomes are written to discovery-resolved-outcomes.jsonl keyed by runId + ticker + horizon.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { RankedCandidatesResult } from "../services/vinceTickerDiscovery.service";

const HISTORY_FILENAME = "discovery-candidates-history.jsonl";
const RESOLVED_FILENAME = "discovery-resolved-outcomes.jsonl";

export interface DiscoveryCandidateRecord {
  ticker: string;
  sleeve: string;
  score: number;
  reason: string;
  bucket: string;
  source?: "sleeve" | "peer" | "expansion";
  /** Immutable pick-time fields for resolution (set when run is written with entry prices). */
  snapshotAt?: string;
  entryBarDate?: string;
  entryClose?: number;
  horizon1mDueAt?: number;
  horizon3mDueAt?: number;
  priceFile?: string;
}

export interface DiscoveryRunRecord {
  discoveryRunId: string;
  generatedAt: string;
  timestamp: number;
  promoteNow: DiscoveryCandidateRecord[];
  researchNext: DiscoveryCandidateRecord[];
  avoid: DiscoveryCandidateRecord[];
  existingSleeve: DiscoveryCandidateRecord[];
  newCandidates: DiscoveryCandidateRecord[];
  snapshotHash?: string;
}

/** Single resolved outcome: one ticker, one horizon, from cached FD daily bars. */
export interface DiscoveryResolvedOutcome {
  runId: string;
  ticker: string;
  horizon: "1m" | "3m";
  entryBarDate: string;
  entryClose: number;
  targetBarDate: string;
  targetClose: number;
  returnPct: number;
  outcome: 0 | 1;
  resolvedAt: number;
  bucket?: string;
  candidateSource?: "sleeve" | "peer" | "expansion";
}

function getCacheDir(projectRoot: string): string {
  return path.join(projectRoot, ".elizadb", "financialdatasets-cache");
}

function getHistoryPath(projectRoot: string): string {
  return path.join(getCacheDir(projectRoot), HISTORY_FILENAME);
}

function getResolvedPath(projectRoot: string): string {
  return path.join(getCacheDir(projectRoot), RESOLVED_FILENAME);
}

function toRecord(
  c: {
    ticker: string;
    sleeve: string;
    score: number;
    reason: string;
    snapshotAt?: string | null;
  },
  bucket: string,
  source?: "sleeve" | "peer" | "expansion",
  pickTime?: {
    entryBarDate?: string;
    entryClose?: number;
    horizon1mDueAt?: number;
    horizon3mDueAt?: number;
    priceFile?: string;
  },
): DiscoveryCandidateRecord {
  const rec: DiscoveryCandidateRecord = {
    ticker: c.ticker,
    sleeve: c.sleeve,
    score: c.score,
    reason: c.reason,
    bucket,
    source,
  };
  if (c.snapshotAt) rec.snapshotAt = c.snapshotAt;
  if (pickTime) {
    if (pickTime.entryBarDate) rec.entryBarDate = pickTime.entryBarDate;
    if (pickTime.entryClose != null) rec.entryClose = pickTime.entryClose;
    if (pickTime.horizon1mDueAt != null)
      rec.horizon1mDueAt = pickTime.horizon1mDueAt;
    if (pickTime.horizon3mDueAt != null)
      rec.horizon3mDueAt = pickTime.horizon3mDueAt;
    if (pickTime.priceFile) rec.priceFile = pickTime.priceFile;
  }
  return rec;
}

/**
 * Append one discovery run to the history file for later outcome resolution and calibration.
 * Optional pickTimeByTicker: map of ticker -> pick-time fields (entryBarDate, entryClose, horizon1mDueAt, horizon3mDueAt, priceFile).
 * When provided, each candidate record is written with immutable fields for resolution.
 */
export function appendDiscoveryRun(
  result: RankedCandidatesResult,
  projectRoot: string = process.cwd(),
  pickTimeByTicker?: Map<
    string,
    {
      entryBarDate: string;
      entryClose: number;
      horizon1mDueAt: number;
      horizon3mDueAt: number;
      priceFile?: string;
    }
  >,
): string {
  const dir = getCacheDir(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const timestamp = Date.now();
  const discoveryRunId = `fd-${timestamp}`;
  const filePath = getHistoryPath(projectRoot);
  const pickFor = (ticker: string) =>
    pickTimeByTicker?.get(ticker.toUpperCase().trim());
  const record: DiscoveryRunRecord = {
    discoveryRunId,
    generatedAt: result.generatedAt,
    timestamp,
    promoteNow: result.promoteNow.map((c) =>
      toRecord(c, "PromoteNow", undefined, pickFor(c.ticker)),
    ),
    researchNext: result.researchNext.map((c) =>
      toRecord(c, "ResearchNext", undefined, pickFor(c.ticker)),
    ),
    avoid: result.avoid.map((c) =>
      toRecord(c, "Avoid", undefined, pickFor(c.ticker)),
    ),
    existingSleeve: result.existingSleeve.map((c) =>
      toRecord(c, "PromoteNow", "sleeve", pickFor(c.ticker)),
    ),
    newCandidates: result.newCandidates.map((c) =>
      toRecord(
        c,
        c.bucket ?? "ResearchNext",
        c.sleeve === "peer"
          ? "peer"
          : c.sleeve === "expansion"
            ? "expansion"
            : undefined,
        pickFor(c.ticker),
      ),
    ),
  };
  const line = JSON.stringify(record) + "\n";
  fs.appendFileSync(filePath, line, "utf-8");
  return discoveryRunId;
}

/**
 * Append a single resolved outcome to discovery-resolved-outcomes.jsonl.
 * Keyed by runId + ticker + horizon for idempotent resolution.
 */
export function appendResolvedOutcome(
  outcome: DiscoveryResolvedOutcome,
  projectRoot: string = process.cwd(),
): void {
  const dir = getCacheDir(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = getResolvedPath(projectRoot);
  fs.appendFileSync(filePath, JSON.stringify(outcome) + "\n", "utf-8");
}

/** Horizon to prediction horizon hours (~22 td/mo, ~66 td/3mo). */
export const FD_DISCOVERY_HORIZON_HOURS_1M = 22 * 24;
export const FD_DISCOVERY_HORIZON_HOURS_3M = 66 * 24;

/**
 * Build metadata and params for registering one fd_discovery prediction (1m or 3m).
 * Used by weekly task to register from the ranked run with richer metadata.
 */
export function buildFdDiscoveryPredictionInput(
  ticker: string,
  horizon: "1m" | "3m",
  opts: {
    discoveryRunId: string;
    entryBarDate: string;
    entryClose: number;
    bucket: string;
    candidateSource?: "sleeve" | "peer" | "expansion";
    discoveryScore: number;
    direction?: "up" | "down" | "long" | "short";
  },
): {
  agent: string;
  kind: "fd_discovery";
  direction: "up" | "down";
  confidenceProb: number;
  horizonHours: number;
  asset: string;
  metadata: Record<string, unknown>;
} {
  const horizonHours =
    horizon === "1m"
      ? FD_DISCOVERY_HORIZON_HOURS_1M
      : FD_DISCOVERY_HORIZON_HOURS_3M;
  const direction =
    opts.direction === "down" || opts.direction === "short" ? "down" : "up";
  return {
    agent: "vince",
    kind: "fd_discovery",
    direction,
    confidenceProb: 0.5,
    horizonHours,
    asset: ticker.toUpperCase().trim(),
    metadata: {
      entryPrice: opts.entryClose,
      entryBarDate: opts.entryBarDate,
      bucket: opts.bucket,
      candidateSource: opts.candidateSource,
      discoveryScore: opts.discoveryScore,
      discoveryRunId: opts.discoveryRunId,
      horizonLabel: horizon,
    },
  };
}

export interface ReadResolvedOptions {
  runId?: string;
  horizon?: "1m" | "3m";
  since?: number;
  limit?: number;
}

/**
 * Read resolved outcomes (newest first by resolvedAt). Optional filter by runId, horizon, since.
 */
export function readResolvedOutcomes(
  projectRoot: string = process.cwd(),
  options?: ReadResolvedOptions,
): DiscoveryResolvedOutcome[] {
  const filePath = getResolvedPath(projectRoot);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);
  let parsed: DiscoveryResolvedOutcome[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const row = JSON.parse(lines[i]!) as DiscoveryResolvedOutcome;
      if (options?.runId && row.runId !== options.runId) continue;
      if (options?.horizon && row.horizon !== options.horizon) continue;
      if (options?.since != null && (row.resolvedAt ?? 0) < options.since)
        continue;
      parsed.push(row);
      if (options?.limit != null && parsed.length >= options.limit) break;
    } catch {
      // skip malformed
    }
  }
  return parsed;
}

/**
 * Read last N discovery runs from history (newest first).
 * Legacy rows without discoveryRunId get a synthetic id for backward compatibility.
 */
export function readDiscoveryRunHistory(
  projectRoot: string = process.cwd(),
  limit: number = 20,
): DiscoveryRunRecord[] {
  const filePath = getHistoryPath(projectRoot);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);
  const parsed: DiscoveryRunRecord[] = [];
  for (let i = lines.length - 1; i >= 0 && parsed.length < limit; i--) {
    try {
      const row = JSON.parse(lines[i]!) as Partial<DiscoveryRunRecord> & {
        timestamp?: number;
      };
      if (!row.discoveryRunId && row.timestamp != null) {
        row.discoveryRunId = `fd-${row.timestamp}`;
      } else if (!row.discoveryRunId) {
        row.discoveryRunId = `fd-legacy-${i}`;
      }
      parsed.push(row as DiscoveryRunRecord);
    } catch {
      // skip malformed lines
    }
  }
  return parsed;
}
