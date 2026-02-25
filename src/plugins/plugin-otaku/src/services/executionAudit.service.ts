/**
 * Execution Audit Trail (#60)
 *
 * Immutable append-only log of every execution decision (paper and live).
 * Provides full audit capability.
 *
 * NEVER rewrite existing entries. Only append.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ==========================================
// Types
// ==========================================

export interface ExecutionAuditEntry {
  auditId: string; // timestamp + random hex
  timestamp: string;
  tradeId: string;
  asset: string;
  direction: "long" | "short" | "close";
  sizeUsd: number;
  bucketId: string;
  executionType: "paper" | "live";
  decisionSource: string; // e.g. "signal-aggregator", "manual"
  preFlightChecks: {
    circuitBreakerClear: boolean;
    bucketEnabled: boolean;
    driftClear: boolean;
    premortemPassed: boolean;
    warRoomPassed: boolean;
  };
  outcome?: "filled" | "rejected" | "error";
  rejectionReason?: string;
  notes?: string;
}

const DATA_FILE = "execution-audit.jsonl";

// ==========================================
// Service
// ==========================================

export class ExecutionAuditService {
  private dataPath: string;
  private static _instance: ExecutionAuditService | null = null;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    this.dataPath = path.join(dir, DATA_FILE);
    this.ensureDir();
  }

  // ==========================================
  // Singleton
  // ==========================================

  static getInstance(): ExecutionAuditService {
    if (!ExecutionAuditService._instance) {
      ExecutionAuditService._instance = new ExecutionAuditService();
    }
    return ExecutionAuditService._instance;
  }

  static setInstance(instance: ExecutionAuditService): void {
    ExecutionAuditService._instance = instance;
  }

  // ==========================================
  // Core
  // ==========================================

  log(entry: Omit<ExecutionAuditEntry, "auditId" | "timestamp">): void {
    const full: ExecutionAuditEntry = {
      auditId: `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.append(full);
  }

  getAuditTrail(tradeId?: string): ExecutionAuditEntry[] {
    const all = this.readAll();
    if (!tradeId) return all;
    return all.filter((e) => e.tradeId === tradeId);
  }

  getRecentAudit(hours: number): ExecutionAuditEntry[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.readAll().filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff,
    );
  }

  getRejectionStats(): { reason: string; count: number }[] {
    const all = this.readAll();
    const rejected = all.filter((e) => e.outcome === "rejected");
    const counts = new Map<string, number>();
    for (const e of rejected) {
      const r = e.rejectionReason ?? "unknown";
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ==========================================
  // Persistence (JSONL append-only)
  // ==========================================

  private readAll(): ExecutionAuditEntry[] {
    try {
      if (!fs.existsSync(this.dataPath)) return [];
      return fs
        .readFileSync(this.dataPath, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as ExecutionAuditEntry);
    } catch {
      return [];
    }
  }

  private append(entry: ExecutionAuditEntry): void {
    try {
      fs.appendFileSync(this.dataPath, JSON.stringify(entry) + "\n");
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
