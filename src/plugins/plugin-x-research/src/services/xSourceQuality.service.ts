/**
 * X Source Quality Engine
 *
 * Tracks per-handle prediction precision, recall, and calibration.
 * Persists to data/x-source-quality.jsonl.
 * Plain TS class (no ElizaOS Service inheritance).
 *
 * PRD Phase 8, Task #41.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface SourceQualityRecord {
  handle: string;
  precision: number;
  recall: number;
  calibration: number;
  timeToResolutionHrs: number;
  totalPredictions: number;
  correctPredictions: number;
  lastUpdated: string;
}

const FILE_NAME = "x-source-quality.jsonl";

// ==========================================
// Service
// ==========================================

export class XSourceQualityService {
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): SourceQualityRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: SourceQualityRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as SourceQualityRecord);
      } catch {
        // skip malformed
      }
    }
    return records;
  }

  private saveAll(records: SourceQualityRecord[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private getRecord(handle: string): SourceQualityRecord | undefined {
    return this.loadAll().find((r) => r.handle === handle);
  }

  private upsert(updated: SourceQualityRecord): void {
    const all = this.loadAll();
    const idx = all.findIndex((r) => r.handle === updated.handle);
    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.push(updated);
    }
    this.saveAll(all);
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record a prediction for a handle.
   * If `correct` is provided, it's resolved immediately.
   * If omitted, it counts as a pending prediction (no effect on correctPredictions).
   */
  recordPrediction(
    handle: string,
    direction: string,
    confidence: number,
    correct?: boolean,
  ): void {
    const existing = this.getRecord(handle) ?? {
      handle,
      precision: 0,
      recall: 0,
      calibration: 0,
      timeToResolutionHrs: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      lastUpdated: new Date().toISOString(),
    };

    existing.totalPredictions += 1;

    if (correct !== undefined && correct) {
      existing.correctPredictions += 1;
    }

    // Recompute precision
    existing.precision =
      existing.totalPredictions > 0
        ? existing.correctPredictions / existing.totalPredictions
        : 0;

    // Calibration: track how close confidence is to actual win rate
    // Simple incremental update: calibration = 1 - |precision - avgConfidence|
    // We approximate with current confidence vs precision
    const confDecimal = confidence / 100;
    existing.calibration = Math.max(
      0,
      1 - Math.abs(existing.precision - confDecimal),
    );

    // Recall stays at precision for single-label binary classification (no FN data)
    existing.recall = existing.precision;

    existing.lastUpdated = new Date().toISOString();

    this.upsert(existing);
  }

  /**
   * Top N sources by precision (desc).
   */
  getTopSources(n: number): SourceQualityRecord[] {
    return this.loadAll()
      .sort((a, b) => b.precision - a.precision)
      .slice(0, n);
  }

  /**
   * Underperforming sources: lowest precision, filtered to those with ≥ 1 prediction.
   */
  getUnderperformingSources(n: number): SourceQualityRecord[] {
    return this.loadAll()
      .filter((r) => r.totalPredictions > 0)
      .sort((a, b) => a.precision - b.precision)
      .slice(0, n);
  }

  /**
   * Quality multiplier for a handle:
   * - precision < 0.4 → 0.5
   * - precision > 0.6 → 1.5
   * - else           → 1.0
   * - no data        → 1.0 (default)
   */
  getQualityMultiplier(handle: string): number {
    const record = this.getRecord(handle);
    if (!record) return 1.0;
    if (record.precision < 0.4) return 0.5;
    if (record.precision > 0.6) return 1.5;
    return 1.0;
  }
}
