/**
 * VINCE Narrative-to-Price Lag Model
 *
 * Tracks how narrative phase transitions predict future price moves.
 * Persists to data/narrative-lag.jsonl.
 * Plain TS class (no ElizaOS Service inheritance).
 *
 * PRD Phase 8, Task #42.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface NarrativeLagRecord {
  asset: string;
  narrativePhase: "inception" | "growth" | "peak" | "decline";
  transitionAt: string;
  priceAtTransition: number;
  priceAt24h?: number;
  priceAt48h?: number;
  priceDeltaPct24h?: number;
  priceDeltaPct48h?: number;
}

const FILE_NAME = "narrative-lag.jsonl";

// ==========================================
// Service
// ==========================================

export class VinceNarrativeLagService {
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): NarrativeLagRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: NarrativeLagRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as NarrativeLagRecord);
      } catch {
        // skip malformed
      }
    }
    return records;
  }

  private saveAll(records: NarrativeLagRecord[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private appendRecord(record: NarrativeLagRecord): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf-8");
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record a narrative phase transition for an asset at a given price.
   */
  recordTransition(
    asset: string,
    phase: NarrativeLagRecord["narrativePhase"],
    price: number,
  ): void {
    const record: NarrativeLagRecord = {
      asset,
      narrativePhase: phase,
      transitionAt: new Date().toISOString(),
      priceAtTransition: price,
    };
    this.appendRecord(record);
  }

  /**
   * Update 24h and 48h price outcomes for a specific transition.
   */
  updateOutcome(
    asset: string,
    transitionAt: string,
    price24h: number,
    price48h: number,
  ): void {
    const all = this.loadAll();
    let updated = false;
    for (const record of all) {
      if (record.asset === asset && record.transitionAt === transitionAt) {
        record.priceAt24h = price24h;
        record.priceAt48h = price48h;
        record.priceDeltaPct24h =
          ((price24h - record.priceAtTransition) / record.priceAtTransition) *
          100;
        record.priceDeltaPct48h =
          ((price48h - record.priceAtTransition) / record.priceAtTransition) *
          100;
        updated = true;
        break;
      }
    }
    if (updated) {
      this.saveAll(all);
    }
  }

  /**
   * Compute average price delta at 24h and 48h for a given asset + phase.
   */
  computeLagStats(
    asset: string,
    phase: NarrativeLagRecord["narrativePhase"],
  ): { avgDelta24h: number; avgDelta48h: number; sampleSize: number } {
    const resolved = this.loadAll().filter(
      (r) =>
        r.asset === asset &&
        r.narrativePhase === phase &&
        r.priceDeltaPct24h !== undefined &&
        r.priceDeltaPct48h !== undefined,
    );
    if (resolved.length === 0) {
      return { avgDelta24h: 0, avgDelta48h: 0, sampleSize: 0 };
    }
    const avgDelta24h =
      resolved.reduce((sum, r) => sum + (r.priceDeltaPct24h ?? 0), 0) /
      resolved.length;
    const avgDelta48h =
      resolved.reduce((sum, r) => sum + (r.priceDeltaPct48h ?? 0), 0) /
      resolved.length;
    return { avgDelta24h, avgDelta48h, sampleSize: resolved.length };
  }

  /**
   * Adjust confidence based on lag stats for the given asset+phase.
   * Output clamped to [base * 0.5, base * 1.5].
   */
  getLagAdjustedConfidence(
    asset: string,
    phase: NarrativeLagRecord["narrativePhase"],
    baseConf: number,
  ): number {
    const stats = this.computeLagStats(asset, phase);
    if (stats.sampleSize === 0) return baseConf;

    // Use avgDelta24h to boost/reduce confidence:
    // Positive average → bullish confirmation → boost
    // Negative average → bearish confirmation → reduce
    const delta = stats.avgDelta24h;
    const adjustment = delta / 10; // ±10% price move → ±1.0 confidence multiplier delta
    const multiplier = 1 + adjustment;
    const adjusted = baseConf * multiplier;

    // Clamp to [base * 0.5, base * 1.5]
    return Math.max(baseConf * 0.5, Math.min(baseConf * 1.5, adjusted));
  }
}
