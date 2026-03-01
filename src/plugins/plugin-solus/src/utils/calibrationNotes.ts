/**
 * Compute calibration notes from resolved assignment predictions (Brier by asset, by IV bucket)
 * and write to solus-calibration-notes.txt for injection into SOLUS_CALIBRATION_CONTEXT.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  loadRecords,
  computeBrier,
  getStoreDir,
  type AssignmentPredictionRow,
} from "./assignmentPredictionsStore";

const CALIBRATION_NOTES_FILENAME = "solus-calibration-notes.txt";
const MIN_BUCKET_SIZE = 5;
const WINDOW_DAYS = 90;

function brierForRows(rows: AssignmentPredictionRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce(
    (s, r) => s + (r.predictedAssignProb - (r.outcome ?? 0)) ** 2,
    0,
  );
  return sum / rows.length;
}

function meanErrorForRows(rows: AssignmentPredictionRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce(
    (s, r) => s + (r.predictedAssignProb - (r.outcome ?? 0)),
    0,
  );
  return sum / rows.length;
}

/** IV bucket key for grouping. */
function ivBucket(atmIv: number | undefined): string | null {
  if (atmIv == null || !Number.isFinite(atmIv)) return null;
  if (atmIv < 50) return "iv_under_50";
  if (atmIv <= 60) return "iv_50_60";
  return "iv_over_60";
}

/**
 * Compute calibration notes and return as text. Does not write to file.
 */
export function computeCalibrationNotes(windowDays = WINDOW_DAYS): string {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const records = loadRecords();
  const resolved = records.filter(
    (r) =>
      r.resolvedAt != null && r.outcome !== undefined && r.resolvedAt >= cutoff,
  );
  if (resolved.length === 0) {
    return "";
  }

  const lines: string[] = [];
  const overall = computeBrier(windowDays);
  lines.push(
    `Overall (last ${windowDays}d): Brier = ${overall.meanBrier.toFixed(4)} (n = ${overall.count}).`,
  );

  const byAsset = new Map<string, AssignmentPredictionRow[]>();
  for (const r of resolved) {
    const a = r.asset.toUpperCase();
    if (!byAsset.has(a)) byAsset.set(a, []);
    byAsset.get(a)!.push(r);
  }
  for (const [asset, rows] of byAsset) {
    if (rows.length < MIN_BUCKET_SIZE) continue;
    const b = brierForRows(rows);
    const err = meanErrorForRows(rows);
    const bias =
      err > 0.05
        ? "overconfident"
        : err < -0.05
          ? "underconfident"
          : "roughly calibrated";
    lines.push(
      `  ${asset}: Brier = ${b.toFixed(4)} (n = ${rows.length}); ${bias} (mean error ${(err * 100).toFixed(1)}%).`,
    );
  }

  const withIv = resolved.filter(
    (r) => r.atmIvAtRecord != null && Number.isFinite(r.atmIvAtRecord),
  );
  if (withIv.length >= MIN_BUCKET_SIZE) {
    const byBucket = new Map<string, AssignmentPredictionRow[]>();
    for (const r of withIv) {
      const b = ivBucket(r.atmIvAtRecord!) ?? "other";
      if (!byBucket.has(b)) byBucket.set(b, []);
      byBucket.get(b)!.push(r);
    }
    const bucketLabels: Record<string, string> = {
      iv_under_50: "IV < 50%",
      iv_50_60: "IV 50–60%",
      iv_over_60: "IV > 60%",
    };
    for (const [key, rows] of byBucket) {
      if (rows.length < MIN_BUCKET_SIZE) continue;
      const b = brierForRows(rows);
      const label = bucketLabels[key] ?? key;
      lines.push(`  ${label}: Brier = ${b.toFixed(4)} (n = ${rows.length}).`);
    }
  }

  return ["Learning:", ...lines].join(" ");
}

/**
 * Get the path to the calibration notes file.
 */
export function getCalibrationNotesPath(): string {
  return path.join(getStoreDir(), CALIBRATION_NOTES_FILENAME);
}

/**
 * Compute calibration notes and write to .elizadb/solus/solus-calibration-notes.txt.
 * Ensures directory exists. Overwrites existing file. Only writes when there is content.
 */
export function writeCalibrationNotesFile(windowDays = WINDOW_DAYS): void {
  const text = computeCalibrationNotes(windowDays);
  if (!text.trim()) return;
  const dir = getStoreDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = getCalibrationNotesPath();
  fs.writeFileSync(filePath, text, "utf-8");
}
