/**
 * Solus-only store for assignment predictions: register, resolve, and Brier report.
 * Same Brier formula as skills/quant/2.py: mean((predictedProb - outcome)^2).
 * Store: JSONL at .elizadb/solus/solus-assignment-predictions.jsonl
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SOLUS_PERSIST_DIR = "solus";
const FILENAME = "solus-assignment-predictions.jsonl";

export interface AssignmentPredictionRow {
  asset: string;
  strike: number;
  expiryUtc: string;
  predictedAssignProb: number;
  createdAt: number;
  resolvedAt?: number;
  outcome?: 0 | 1;
  /** Optional context at record time for calibration notes / ML. */
  spotAtRecord?: number;
  atmIvAtRecord?: number;
  /** Optional lineage tags for Phase 14 attribution. */
  sourceLineage?: string[];
}

export interface AssignmentCalibrationReport {
  meanBrier: number;
  count: number;
  windowDays: number;
}

export interface SolusProofSnapshot {
  generatedAt: number;
  windowDays: number;
  resolvedCount: number;
  winRate: number;
  meanBrier: number;
  confidenceGrade: "LOW" | "MEDIUM" | "HIGH";
  promotionEligible: boolean;
}

export function getStoreDir(): string {
  if (
    typeof process !== "undefined" &&
    process.env?.SOLUS_ASSIGNMENT_PREDICTIONS_PATH
  ) {
    return path.dirname(process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH);
  }
  const base =
    typeof process !== "undefined" && process.env?.ELIZA_DB_DIR
      ? path.join(process.cwd(), process.env.ELIZA_DB_DIR)
      : path.join(process.cwd(), ".elizadb");
  return path.join(base, SOLUS_PERSIST_DIR);
}

export function getStorePath(): string {
  if (
    typeof process !== "undefined" &&
    process.env?.SOLUS_ASSIGNMENT_PREDICTIONS_PATH
  ) {
    return process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;
  }
  return path.join(getStoreDir(), FILENAME);
}

function getProofStorePath(): string {
  return path.join(getStoreDir(), "solus-proof-attribution.jsonl");
}

function ensureDir(): void {
  const dir = getStoreDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadRecords(): AssignmentPredictionRow[] {
  const filePath = getStorePath();
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines
      .map((line) => {
        try {
          return JSON.parse(line) as AssignmentPredictionRow;
        } catch {
          return null;
        }
      })
      .filter((r): r is AssignmentPredictionRow => r != null);
  } catch {
    return [];
  }
}

/**
 * Count of resolved predictions (resolvedAt set, outcome 0 or 1). Used by TRAIN_SOLUS_CALIBRATION_WHEN_READY.
 */
export function getResolvedCount(): number {
  const records = loadRecords();
  return records.filter(
    (r) =>
      r.resolvedAt != null &&
      r.outcome !== undefined &&
      (r.outcome === 0 || r.outcome === 1),
  ).length;
}

/**
 * Return unresolved predictions, newest first (by createdAt).
 */
export function getOpenPredictions(): AssignmentPredictionRow[] {
  const records = loadRecords();
  return records
    .filter((r) => !r.resolvedAt)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function appendRecord(
  row: Omit<AssignmentPredictionRow, "createdAt">,
): void {
  ensureDir();
  const full: AssignmentPredictionRow = {
    ...row,
    createdAt: Date.now(),
  };
  fs.appendFileSync(getStorePath(), JSON.stringify(full) + "\n");
}

function appendProofAttribution(row: {
  asset: string;
  strike: number;
  predictedAssignProb: number;
  outcome: 0 | 1;
  brier: number;
  sourceLineage: string[];
}): void {
  ensureDir();
  fs.appendFileSync(
    getProofStorePath(),
    JSON.stringify({
      kind: "solus_assignment",
      generatedAt: Date.now(),
      ...row,
    }) + "\n",
  );
}

/**
 * Resolve the latest open prediction matching asset and (optionally) strike.
 * Returns true if one was resolved.
 */
export function resolveLatestForAssetStrike(
  asset: string,
  outcome: 0 | 1,
  strike?: number,
): boolean {
  const records = loadRecords();
  const open = records.filter(
    (r) =>
      !r.resolvedAt &&
      r.asset.toUpperCase() === asset.toUpperCase() &&
      (strike == null || r.strike === strike),
  );
  if (open.length === 0) return false;
  const latest = open.sort((a, b) => b.createdAt - a.createdAt)[0];
  const resolved: AssignmentPredictionRow = {
    ...latest,
    resolvedAt: Date.now(),
    outcome,
  };
  const updated = records.map((r) => (r === latest ? resolved : r));
  ensureDir();
  fs.writeFileSync(
    getStorePath(),
    updated.map((r) => JSON.stringify(r)).join("\n") +
      (updated.length ? "\n" : ""),
  );
  const brier = (resolved.predictedAssignProb - outcome) ** 2;
  appendProofAttribution({
    asset: resolved.asset,
    strike: resolved.strike,
    predictedAssignProb: resolved.predictedAssignProb,
    outcome,
    brier,
    sourceLineage:
      resolved.sourceLineage && resolved.sourceLineage.length > 0
        ? resolved.sourceLineage
        : ["options_context", "solus_calibration_context"],
  });
  return true;
}

/**
 * Compute mean Brier over resolved rows in the last windowDays.
 * Brier = (predictedAssignProb - outcome)^2 per row; mean over resolved.
 */
export function computeBrier(windowDays = 30): AssignmentCalibrationReport {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const records = loadRecords();
  const resolved = records.filter(
    (r) =>
      r.resolvedAt != null && r.outcome !== undefined && r.resolvedAt >= cutoff,
  );
  if (resolved.length === 0) {
    return { meanBrier: 0, count: 0, windowDays };
  }
  const brierSum = resolved.reduce(
    (sum, r) => sum + (r.predictedAssignProb - (r.outcome ?? 0)) ** 2,
    0,
  );
  return {
    meanBrier: brierSum / resolved.length,
    count: resolved.length,
    windowDays,
  };
}

export function getSolusProofSnapshot(windowDays = 30): SolusProofSnapshot {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const records = loadRecords();
  const resolved = records.filter(
    (r) =>
      r.resolvedAt != null && r.outcome !== undefined && r.resolvedAt >= cutoff,
  );
  const count = resolved.length;
  let wins = 0;
  let brier = 0;
  for (const r of resolved) {
    if (r.outcome === 1) wins += 1;
    brier += (r.predictedAssignProb - (r.outcome ?? 0)) ** 2;
  }
  const meanBrier = count > 0 ? brier / count : 0;
  const winRate = count > 0 ? wins / count : 0;
  const confidenceGrade: "LOW" | "MEDIUM" | "HIGH" =
    count >= 80 ? "HIGH" : count >= 30 ? "MEDIUM" : "LOW";
  return {
    generatedAt: Date.now(),
    windowDays,
    resolvedCount: count,
    winRate,
    meanBrier,
    confidenceGrade,
    promotionEligible:
      confidenceGrade !== "LOW" && meanBrier > 0 && meanBrier <= 0.22,
  };
}
