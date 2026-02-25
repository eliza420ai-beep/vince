/**
 * VincePnLReconciliation Service (#62)
 *
 * Reconciles paper P&L against live P&L, flags discrepancies, feeds drift sentinel.
 * Persist to data/pnl-reconciliation.jsonl (append-only).
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface ReconciliationRecord {
  timestamp: string;
  asset: string;
  tradeId: string;
  paperPnlUsd: number;
  livePnlUsd?: number;
  discrepancyUsd?: number;
  discrepancyPct?: number;
  reconciled: boolean;
}

const DATA_FILE = "pnl-reconciliation.jsonl";

// ==========================================
// Service
// ==========================================

export class VincePnLReconciliationService {
  private dataPath: string;
  private static _instance: VincePnLReconciliationService | null = null;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    this.dataPath = path.join(dir, DATA_FILE);
    this.ensureDir();
  }

  // ==========================================
  // Singleton
  // ==========================================

  static getInstance(): VincePnLReconciliationService {
    if (!VincePnLReconciliationService._instance) {
      VincePnLReconciliationService._instance =
        new VincePnLReconciliationService();
    }
    return VincePnLReconciliationService._instance;
  }

  static setInstance(instance: VincePnLReconciliationService): void {
    VincePnLReconciliationService._instance = instance;
  }

  // ==========================================
  // Core
  // ==========================================

  recordPaper(tradeId: string, asset: string, paperPnlUsd: number): void {
    const record: ReconciliationRecord = {
      timestamp: new Date().toISOString(),
      asset,
      tradeId,
      paperPnlUsd,
      reconciled: false,
    };
    this.append(record);
  }

  recordLive(tradeId: string, livePnlUsd: number): void {
    const all = this.readAll();
    const idx = all.findLastIndex((r) => r.tradeId === tradeId && !r.reconciled);
    if (idx === -1) return;

    const record = all[idx];
    record.livePnlUsd = livePnlUsd;
    record.discrepancyUsd = livePnlUsd - record.paperPnlUsd;
    // Avoid division by zero
    record.discrepancyPct =
      record.paperPnlUsd !== 0
        ? (record.discrepancyUsd / Math.abs(record.paperPnlUsd)) * 100
        : undefined;
    record.reconciled = true;

    this.rewriteAll(all);
  }

  getUnreconciled(): ReconciliationRecord[] {
    return this.readAll().filter((r) => !r.reconciled);
  }

  getDiscrepancies(thresholdUsd: number): ReconciliationRecord[] {
    return this.readAll().filter(
      (r) =>
        r.reconciled &&
        r.discrepancyUsd !== undefined &&
        Math.abs(r.discrepancyUsd) > thresholdUsd,
    );
  }

  reconcileAll(livePnlMap: Record<string, number>): void {
    const all = this.readAll();
    let changed = false;

    for (const record of all) {
      if (!record.reconciled && record.tradeId in livePnlMap) {
        const livePnlUsd = livePnlMap[record.tradeId];
        record.livePnlUsd = livePnlUsd;
        record.discrepancyUsd = livePnlUsd - record.paperPnlUsd;
        record.discrepancyPct =
          record.paperPnlUsd !== 0
            ? (record.discrepancyUsd / Math.abs(record.paperPnlUsd)) * 100
            : undefined;
        record.reconciled = true;
        changed = true;
      }
    }

    if (changed) {
      this.rewriteAll(all);
    }
  }

  // ==========================================
  // Persistence (JSONL)
  // ==========================================

  private readAll(): ReconciliationRecord[] {
    try {
      if (!fs.existsSync(this.dataPath)) return [];
      return fs
        .readFileSync(this.dataPath, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as ReconciliationRecord);
    } catch {
      return [];
    }
  }

  private append(record: ReconciliationRecord): void {
    try {
      fs.appendFileSync(this.dataPath, JSON.stringify(record) + "\n");
    } catch {
      // Non-fatal
    }
  }

  private rewriteAll(records: ReconciliationRecord[]): void {
    try {
      const content = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
      fs.writeFileSync(this.dataPath, content);
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
