/**
 * Persistent Source Reputation Score (#72)
 *
 * Extends xSourceQuality with a long-term reputation score that accounts
 * for consistency, recency, and calibration over months.
 *
 * Persists to data/source-reputation.jsonl.
 */

import * as fs from "fs";
import * as path from "path";
import type {
  SourceQualityRecord,
  XSourceQualityService,
} from "./xSourceQuality.service";

// ==========================================
// Types
// ==========================================

export interface SourceReputationRecord {
  handle: string;
  reputationScore: number; // 0–100 composite
  consistencyScore: number; // std dev of weekly precision (lower = more consistent) — normalized 0–10
  recencyBonus: number; // 0–10, based on how recently they were active
  calibrationScore: number; // from xSourceQuality Brier-style, inverted (higher=better) 0–10
  tier: "tier-1" | "tier-2" | "tier-3" | "watchlist";
  lastRecalculated: string;
}

const FILE_NAME = "source-reputation.jsonl";

// ==========================================
// Service
// ==========================================

export class SourceReputationService {
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Recalculate reputation for a handle given a quality record.
   *
   * reputationScore = (precision * 40) + (calibrationScore * 30)
   *                 + (consistencyScore * 20) + (recencyBonus * 10)
   * All components normalized 0–10 scale before weighting → result 0–100
   */
  recalculate(
    handle: string,
    qualityRecord: SourceQualityRecord,
  ): SourceReputationRecord {
    // Precision: 0–1 → 0–10
    const precisionNorm = Math.min(
      10,
      Math.max(0, qualityRecord.precision * 10),
    );

    // Calibration: quality.calibration is 0–1, invert Brier logic:
    // calibration = 1 - |precision - avgConfidence|, so higher = better
    // Normalize to 0–10
    const calibrationNorm = Math.min(
      10,
      Math.max(0, qualityRecord.calibration * 10),
    );

    // Consistency: We approximate via recall proximity to precision
    // (in lieu of std dev data). Lower deviation = more consistent = higher score
    // deviation = |precision - recall| (0 = perfectly consistent)
    const deviation = Math.abs(qualityRecord.precision - qualityRecord.recall);
    const consistencyNorm = Math.min(10, Math.max(0, (1 - deviation) * 10));

    // Recency: based on lastUpdated — within 7 days = 10, fades to 0 at 90 days
    const lastUpdatedMs = new Date(qualityRecord.lastUpdated).getTime();
    const daysSinceUpdate =
      (Date.now() - lastUpdatedMs) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.min(10, Math.max(0, 10 - daysSinceUpdate / 9));

    // Weighted composite
    const reputationScore =
      precisionNorm * 4 + // precision * 40 (on 0–10 scale, weight is *4 to get out of 100)
      calibrationNorm * 3 + // calibration * 30
      consistencyNorm * 2 + // consistency * 20
      recencyBonus * 1; // recency * 10

    const tier = this.computeTier(reputationScore);

    const record: SourceReputationRecord = {
      handle,
      reputationScore: Math.min(100, Math.max(0, reputationScore)),
      consistencyScore: consistencyNorm,
      recencyBonus,
      calibrationScore: calibrationNorm,
      tier,
      lastRecalculated: new Date().toISOString(),
    };

    this.upsert(record);
    return record;
  }

  /**
   * Get sources in a given tier, sorted by reputationScore descending.
   */
  getTopTierSources(tier: string): SourceReputationRecord[] {
    return this.loadAll()
      .filter((r) => r.tier === tier)
      .sort((a, b) => b.reputationScore - a.reputationScore);
  }

  /**
   * Count sources per tier.
   */
  getTierBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {
      "tier-1": 0,
      "tier-2": 0,
      "tier-3": 0,
      watchlist: 0,
    };
    for (const r of this.loadAll()) {
      breakdown[r.tier] = (breakdown[r.tier] ?? 0) + 1;
    }
    return breakdown;
  }

  /**
   * Get a handle's stored reputation record when present.
   */
  getByHandle(handle: string): SourceReputationRecord | null {
    const normalized = handle.trim().toLowerCase();
    if (!normalized) return null;
    return (
      this.loadAll().find((r) => r.handle.toLowerCase() === normalized) ?? null
    );
  }

  /**
   * Reputation multiplier for downstream scoring.
   * - tier-1/high score: boost
   * - watchlist/low score: downweight
   */
  getReputationMultiplier(handle: string): number {
    const record = this.getByHandle(handle);
    if (!record) return 1.0;
    if (record.reputationScore >= 70) return 1.2;
    if (record.reputationScore >= 55) return 1.1;
    if (record.reputationScore <= 25) return 0.8;
    return 1.0;
  }

  /**
   * Recalculate all handles known to the quality service.
   */
  updateAllFromQuality(qualityService: XSourceQualityService): void {
    const all = qualityService.getTopSources(Number.MAX_SAFE_INTEGER);
    for (const qr of all) {
      this.recalculate(qr.handle, qr);
    }
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private computeTier(score: number): SourceReputationRecord["tier"] {
    if (score >= 70) return "tier-1";
    if (score >= 50) return "tier-2";
    if (score >= 30) return "tier-3";
    return "watchlist";
  }

  private loadAll(): SourceReputationRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const results: SourceReputationRecord[] = [];
    for (const line of lines) {
      try {
        results.push(JSON.parse(line) as SourceReputationRecord);
      } catch {
        // skip malformed
      }
    }
    return results;
  }

  private saveAll(records: SourceReputationRecord[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") +
        (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private upsert(record: SourceReputationRecord): void {
    const all = this.loadAll();
    const idx = all.findIndex((r) => r.handle === record.handle);
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.push(record);
    }
    this.saveAll(all);
  }
}
