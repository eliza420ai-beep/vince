/**
 * Rollback Orchestrator Service
 *
 * Detects performance regressions and orchestrates automatic rollback to
 * last-known-good state. Persists events to data/rollback-events.jsonl.
 *
 * PRD: One Dream Phase 12 — Task #74
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";

export type RollbackTrigger =
  | "win-rate-regression"
  | "drawdown-threshold"
  | "genome-degradation"
  | "circuit-breaker-cascade"
  | "manual";

export interface RollbackEvent {
  triggerId: string; // unique id
  trigger: RollbackTrigger;
  detectedAt: string;
  fromState: string; // description of state being rolled back from
  toState: string; // description of target state
  status: "pending" | "in-progress" | "completed" | "failed";
  completedAt?: string;
  notes?: string;
}

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");
const ROLLBACK_FILE = "rollback-events.jsonl";

export class RollbackOrchestratorService {
  private readonly rollbackPath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? DEFAULT_DATA_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.rollbackPath = path.join(dir, ROLLBACK_FILE);
  }

  // ── Thresholds ─────────────────────────────────────────────────────────────

  private get winRateFloor(): number {
    const val = parseFloat(process.env.ROLLBACK_WIN_RATE_FLOOR ?? "0.45");
    return isNaN(val) ? 0.45 : val;
  }

  private get drawdownCeiling(): number {
    const val = parseFloat(
      process.env.ROLLBACK_DRAWDOWN_CEILING ?? "0.20",
    );
    return isNaN(val) ? 0.2 : val;
  }

  private get genomeDegradationThreshold(): number {
    const val = parseFloat(
      process.env.ROLLBACK_GENOME_DEGRADATION ?? "-0.1",
    );
    return isNaN(val) ? -0.1 : val;
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private readAll(): RollbackEvent[] {
    if (!fs.existsSync(this.rollbackPath)) return [];
    const content = fs.readFileSync(this.rollbackPath, "utf-8");
    const events: RollbackEvent[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        events.push(JSON.parse(trimmed) as RollbackEvent);
      } catch {
        // skip malformed
      }
    }
    return events;
  }

  private writeAll(events: RollbackEvent[]): void {
    const lines = events.map((e) => JSON.stringify(e)).join("\n");
    fs.writeFileSync(this.rollbackPath, lines + (lines ? "\n" : ""), "utf-8");
  }

  private append(event: RollbackEvent): void {
    const line = JSON.stringify(event) + "\n";
    fs.appendFileSync(this.rollbackPath, line, "utf-8");
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Check performance metrics against trigger thresholds.
   * Returns the first triggered RollbackTrigger, or null if none.
   */
  checkTriggers(metrics: {
    winRate: number;
    drawdownPct: number;
    genomeFitnessDelta: number;
  }): RollbackTrigger | null {
    if (metrics.winRate < this.winRateFloor) {
      return "win-rate-regression";
    }
    if (metrics.drawdownPct > this.drawdownCeiling) {
      return "drawdown-threshold";
    }
    if (metrics.genomeFitnessDelta < this.genomeDegradationThreshold) {
      return "genome-degradation";
    }
    return null;
  }

  /**
   * Create and persist a new rollback event with status "pending".
   */
  initiateRollback(
    trigger: RollbackTrigger,
    fromState: string,
    toState: string,
  ): RollbackEvent {
    const event: RollbackEvent = {
      triggerId: uuidv4(),
      trigger,
      detectedAt: new Date().toISOString(),
      fromState,
      toState,
      status: "pending",
    };
    this.append(event);
    return event;
  }

  /**
   * Mark a rollback event as completed or failed.
   */
  completeRollback(
    triggerId: string,
    success: boolean,
    notes?: string,
  ): void {
    const all = this.readAll();
    const updated = all.map((e) => {
      if (e.triggerId !== triggerId) return e;
      return {
        ...e,
        status: success ? ("completed" as const) : ("failed" as const),
        completedAt: new Date().toISOString(),
        ...(notes ? { notes } : {}),
      };
    });
    this.writeAll(updated);
  }

  /**
   * Return events with status "pending" or "in-progress".
   */
  getActiveRollbacks(): RollbackEvent[] {
    return this.readAll().filter(
      (e) => e.status === "pending" || e.status === "in-progress",
    );
  }

  /**
   * Return all rollback events (full history).
   */
  getRollbackHistory(): RollbackEvent[] {
    return this.readAll();
  }

  /**
   * True if any rollback is pending or in-progress.
   */
  hasPendingRollback(): boolean {
    return this.getActiveRollbacks().length > 0;
  }

  // ── Singleton ──────────────────────────────────────────────────────────────

  private static _instance: RollbackOrchestratorService | null = null;

  static getInstance(): RollbackOrchestratorService {
    if (!RollbackOrchestratorService._instance) {
      RollbackOrchestratorService._instance = new RollbackOrchestratorService();
    }
    return RollbackOrchestratorService._instance;
  }

  static setInstance(instance: RollbackOrchestratorService): void {
    RollbackOrchestratorService._instance = instance;
  }
}
