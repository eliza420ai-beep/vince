/**
 * VINCE Research-to-Trade Attribution
 *
 * Links trades to X source clusters and tracks attribution performance.
 * Persists to data/trade-attribution.jsonl.
 * Plain TS class (no ElizaOS Service inheritance).
 *
 * PRD Phase 8, Task #43.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface AttributionRecord {
  tradeId: string;
  asset: string;
  direction: string;
  openedAt: string;
  sourceClusters: string[];
  confidence: number;
  closedAt?: string;
  pnl?: number;
  outcome?: "win" | "loss" | "scratch";
}

const FILE_NAME = "trade-attribution.jsonl";

// ==========================================
// Service
// ==========================================

export class VinceXSourceAttributionService {
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): AttributionRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: AttributionRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as AttributionRecord);
      } catch {
        // skip malformed
      }
    }
    return records;
  }

  private saveAll(records: AttributionRecord[]): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.filePath,
      records.map((r) => JSON.stringify(r)).join("\n") +
        (records.length ? "\n" : ""),
      "utf-8",
    );
  }

  private appendRecord(record: AttributionRecord): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf-8");
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record the opening of a trade with its source clusters.
   */
  recordOpen(
    tradeId: string,
    asset: string,
    direction: string,
    sourceClusters: string[],
    confidence: number,
  ): void {
    const record: AttributionRecord = {
      tradeId,
      asset,
      direction,
      openedAt: new Date().toISOString(),
      sourceClusters,
      confidence,
    };
    this.appendRecord(record);
  }

  /**
   * Update a trade with close details, rewriting the file.
   */
  recordClose(
    tradeId: string,
    pnl: number,
    outcome: "win" | "loss" | "scratch",
  ): void {
    const all = this.loadAll();
    let found = false;
    for (const record of all) {
      if (record.tradeId === tradeId) {
        record.closedAt = new Date().toISOString();
        record.pnl = pnl;
        record.outcome = outcome;
        found = true;
        break;
      }
    }
    if (found) {
      this.saveAll(all);
    }
  }

  /**
   * Get attribution stats per source cluster, sorted by winRate desc.
   */
  getAttributionStats(): {
    source: string;
    winRate: number;
    avgPnl: number;
    tradeCount: number;
  }[] {
    const closed = this.loadAll().filter((r) => r.outcome !== undefined);

    // Build per-source stats
    const sourceMap = new Map<
      string,
      { wins: number; total: number; totalPnl: number }
    >();

    for (const record of closed) {
      for (const source of record.sourceClusters) {
        if (!sourceMap.has(source)) {
          sourceMap.set(source, { wins: 0, total: 0, totalPnl: 0 });
        }
        const stats = sourceMap.get(source)!;
        stats.total += 1;
        stats.totalPnl += record.pnl ?? 0;
        if (record.outcome === "win") {
          stats.wins += 1;
        }
      }
    }

    return Array.from(sourceMap.entries())
      .map(([source, stats]) => ({
        source,
        winRate: stats.total > 0 ? stats.wins / stats.total : 0,
        avgPnl: stats.total > 0 ? stats.totalPnl / stats.total : 0,
        tradeCount: stats.total,
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }
}
