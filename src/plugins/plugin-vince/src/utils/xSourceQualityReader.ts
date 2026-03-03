/**
 * Reads data/x-source-quality.jsonl (same format as plugin-x-research XSourceQualityService)
 * to apply per-handle quality multipliers in the signal aggregator without depending on plugin-x-research.
 * Precision < 0.4 → 0.5x, > 0.6 → 1.5x, else 1.0x.
 */

import * as fs from "fs";
import * as path from "path";

const FILE_NAME = "x-source-quality.jsonl";

interface SourceQualityRecord {
  handle: string;
  precision: number;
  totalPredictions: number;
  correctPredictions: number;
  lastUpdated: string;
}

let cachedRecords: SourceQualityRecord[] | null = null;
let cachedPath: string | null = null;

function getFilePath(dataDir?: string): string {
  const dir = dataDir ?? path.join(process.cwd(), "data");
  return path.join(dir, FILE_NAME);
}

function loadAll(dataDir?: string): SourceQualityRecord[] {
  const filePath = getFilePath(dataDir);
  if (cachedRecords !== null && cachedPath === filePath) return cachedRecords;
  cachedPath = filePath;
  if (!fs.existsSync(filePath)) {
    cachedRecords = [];
    return cachedRecords;
  }
  try {
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: SourceQualityRecord[] = [];
    for (const line of lines) {
      try {
        const r = JSON.parse(line) as SourceQualityRecord;
        if (r?.handle != null && typeof r.precision === "number")
          records.push(r);
      } catch {
        // skip malformed
      }
    }
    cachedRecords = records;
    return records;
  } catch {
    cachedRecords = [];
    return [];
  }
}

/**
 * Quality multiplier for a handle (precision < 0.4 → 0.5, > 0.6 → 1.5, else 1.0).
 * No data → 1.0.
 */
export function getQualityMultiplier(handle: string, dataDir?: string): number {
  const records = loadAll(dataDir);
  const record = records.find((r) => r.handle === handle);
  if (!record) return 1.0;
  if (record.precision < 0.4) return 0.5;
  if (record.precision > 0.6) return 1.5;
  return 1.0;
}

/**
 * Average quality multiplier for a list of handles. Returns 1.0 if list is empty.
 */
export function getAverageQualityMultiplier(
  handles: string[],
  dataDir?: string,
): number {
  if (!handles.length) return 1.0;
  const sum = handles.reduce((s, h) => s + getQualityMultiplier(h, dataDir), 0);
  return sum / handles.length;
}

/**
 * Clear in-memory cache (e.g. for tests or after external update to the file).
 */
export function clearQualityCache(): void {
  cachedRecords = null;
  cachedPath = null;
}
