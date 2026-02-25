/**
 * VinceDriftSentinel Service (#58)
 *
 * Detects when live portfolio behavior drifts from expected paper-trading behavior.
 * Flags operator when drift is detected.
 *
 * Config env vars (with defaults):
 *   DRIFT_WARN_THRESHOLD_PCT  — warn if drift > 5%
 *   DRIFT_HALT_THRESHOLD_PCT  — halt bucket if drift > 15%
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface DriftReport {
  timestamp: string;
  asset: string;
  paperPnlPct: number;
  livePnlPct: number;
  driftPct: number; // abs(live - paper)
  driftBreached: boolean; // driftPct > threshold
  action: "none" | "warn" | "halt";
}

const DATA_FILE = "drift-reports.jsonl";

// ==========================================
// Service
// ==========================================

export class VinceDriftSentinelService {
  private dataPath: string;
  private warnThreshold: number;
  private haltThreshold: number;
  private static _instance: VinceDriftSentinelService | null = null;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    this.dataPath = path.join(dir, DATA_FILE);
    this.warnThreshold = Number(process.env.DRIFT_WARN_THRESHOLD_PCT ?? 5);
    this.haltThreshold = Number(process.env.DRIFT_HALT_THRESHOLD_PCT ?? 15);
    this.ensureDir();
  }

  // ==========================================
  // Singleton
  // ==========================================

  static getInstance(): VinceDriftSentinelService {
    if (!VinceDriftSentinelService._instance) {
      VinceDriftSentinelService._instance = new VinceDriftSentinelService();
    }
    return VinceDriftSentinelService._instance;
  }

  static setInstance(instance: VinceDriftSentinelService): void {
    VinceDriftSentinelService._instance = instance;
  }

  // ==========================================
  // Core
  // ==========================================

  recordDrift(
    asset: string,
    paperPnlPct: number,
    livePnlPct: number,
  ): DriftReport {
    const driftPct = Math.abs(livePnlPct - paperPnlPct);

    let action: DriftReport["action"] = "none";
    if (driftPct > this.haltThreshold) {
      action = "halt";
    } else if (driftPct > this.warnThreshold) {
      action = "warn";
    }

    const report: DriftReport = {
      timestamp: new Date().toISOString(),
      asset,
      paperPnlPct,
      livePnlPct,
      driftPct,
      driftBreached: driftPct > this.warnThreshold,
      action,
    };

    this.append(report);
    return report;
  }

  getRecentDrift(hours: number): DriftReport[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.readAll().filter(
      (r) => new Date(r.timestamp).getTime() >= cutoff,
    );
  }

  getMaxDrift(hours: number): number {
    const reports = this.getRecentDrift(hours);
    if (reports.length === 0) return 0;
    return Math.max(...reports.map((r) => r.driftPct));
  }

  shouldHalt(asset?: string): boolean {
    const reports = this.getRecentDrift(24);
    if (asset) {
      return reports.some((r) => r.asset === asset && r.action === "halt");
    }
    return reports.some((r) => r.action === "halt");
  }

  getWarnCount(hours: number): number {
    return this.getRecentDrift(hours).filter(
      (r) => r.action === "warn" || r.action === "halt",
    ).length;
  }

  // ==========================================
  // Persistence (JSONL append-only)
  // ==========================================

  private readAll(): DriftReport[] {
    try {
      if (!fs.existsSync(this.dataPath)) return [];
      return fs
        .readFileSync(this.dataPath, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as DriftReport);
    } catch {
      return [];
    }
  }

  private append(report: DriftReport): void {
    try {
      fs.appendFileSync(this.dataPath, JSON.stringify(report) + "\n");
    } catch {
      // Non-fatal
    }
  }

  private ensureDir(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch {
      // Non-fatal
    }
  }
}

/** Singleton export for direct import. */
export const vinceDriftSentinel = VinceDriftSentinelService.getInstance();
