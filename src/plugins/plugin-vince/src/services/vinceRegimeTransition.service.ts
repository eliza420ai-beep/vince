/**
 * VINCE Regime Transition Forecaster
 *
 * Tracks regime transitions and computes transition risk.
 * Persists to data/regime-history.jsonl.
 * Plain TS class with optional static singleton.
 *
 * PRD Phase 8, Task #45.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface RegimeTransitionRecord {
  timestamp: string;
  from: string;
  to: string;
  durationMs: number;
}

const FILE_NAME = "regime-history.jsonl";
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// ==========================================
// Service
// ==========================================

export class VinceRegimeTransitionService {
  private static _instance: VinceRegimeTransitionService | undefined;
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Static singleton
  // ==========================================

  static getInstance(): VinceRegimeTransitionService | undefined {
    return VinceRegimeTransitionService._instance;
  }

  static setInstance(svc: VinceRegimeTransitionService): void {
    VinceRegimeTransitionService._instance = svc;
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): RegimeTransitionRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: RegimeTransitionRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as RegimeTransitionRecord);
      } catch {
        // skip malformed
      }
    }
    return records;
  }

  private appendRecord(record: RegimeTransitionRecord): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf-8");
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record a regime transition.
   */
  recordTransition(from: string, to: string, durationMs?: number): void {
    const record: RegimeTransitionRecord = {
      timestamp: new Date().toISOString(),
      from,
      to,
      durationMs: durationMs ?? 0,
    };
    this.appendRecord(record);
  }

  /**
   * Get probability of transitioning from `current` to each target regime
   * based on historical data from the last 90 days.
   */
  getTransitionProbability(current: string): Record<string, number> {
    const cutoff = Date.now() - NINETY_DAYS_MS;
    const recent = this.loadAll().filter(
      (r) =>
        r.from === current && new Date(r.timestamp).getTime() >= cutoff,
    );

    if (recent.length === 0) return {};

    const counts: Record<string, number> = {};
    for (const r of recent) {
      counts[r.to] = (counts[r.to] ?? 0) + 1;
    }

    const total = recent.length;
    const probs: Record<string, number> = {};
    for (const [to, count] of Object.entries(counts)) {
      probs[to] = count / total;
    }
    return probs;
  }

  /**
   * Transition risk: 0–1. Defined as 1 - max(probabilities).
   * Returns 0 if no historical data.
   */
  getTransitionRisk(current: string): number {
    const probs = this.getTransitionProbability(current);
    const values = Object.values(probs);
    if (values.length === 0) return 0;
    const maxProb = Math.max(...values);
    return Math.max(0, Math.min(1, 1 - maxProb));
  }

  /**
   * Returns true when transition risk > 0.6 (reduce position heat).
   */
  shouldReduceHeat(current: string): boolean {
    return this.getTransitionRisk(current) > 0.6;
  }
}
