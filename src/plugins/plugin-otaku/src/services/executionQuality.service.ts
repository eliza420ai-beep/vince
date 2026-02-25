/**
 * Execution Quality Model
 *
 * Tracks slippage, fill times, and execution penalties per trade.
 * Persists to data/execution-quality.jsonl.
 * Plain TS class (no ElizaOS Service inheritance).
 *
 * PRD Phase 8, Task #44.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface ExecutionRecord {
  tradeId: string;
  recordedAt: string;
  expectedEntry: number;
  actualEntry: number;
  slippagePct: number;
  executionPenalty: number;
  expectedExit?: number;
  actualExit?: number;
  exitSlippagePct?: number;
  fillTimeMs?: number;
  routeUsed?: string;
  thesisScore?: number;
}

const FILE_NAME = "execution-quality.jsonl";

function computePenalty(slippagePct: number): number {
  return Math.abs(slippagePct) > 0.5
    ? Math.min(20, Math.abs(slippagePct) * 0.5)
    : 0;
}

// ==========================================
// Service
// ==========================================

export class ExecutionQualityService {
  private readonly filePath: string;

  constructor(dataDir?: string) {
    const dir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, FILE_NAME);
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private loadAll(): ExecutionRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs
      .readFileSync(this.filePath, "utf-8")
      .split("\n")
      .filter((l) => l.trim());
    const records: ExecutionRecord[] = [];
    for (const line of lines) {
      try {
        records.push(JSON.parse(line) as ExecutionRecord);
      } catch {
        // skip malformed
      }
    }
    return records;
  }

  private appendRecord(record: ExecutionRecord): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(record) + "\n", "utf-8");
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Record an execution event. Computes slippage and penalty automatically.
   */
  recordExecution(
    params: Omit<ExecutionRecord, "recordedAt" | "executionPenalty">,
  ): void {
    const record: ExecutionRecord = {
      ...params,
      recordedAt: new Date().toISOString(),
      executionPenalty: computePenalty(params.slippagePct),
    };
    this.appendRecord(record);
  }

  /**
   * Average execution penalty over the last 7 days.
   */
  getWeeklyDrag(): number {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = this.loadAll().filter(
      (r) => new Date(r.recordedAt).getTime() >= cutoff,
    );
    if (recent.length === 0) return 0;
    const total = recent.reduce((sum, r) => sum + r.executionPenalty, 0);
    return total / recent.length;
  }

  /**
   * Execution grade based on average absolute slippage over all records.
   * - avg |slippage| < 0.2 → "A"
   * - avg |slippage| < 0.5 → "B"
   * - avg |slippage| < 1.0 → "C"
   * - else                 → "D"
   */
  getExecutionGrade(): "A" | "B" | "C" | "D" {
    const all = this.loadAll();
    if (all.length === 0) return "A";
    const avgAbsSlippage =
      all.reduce((sum, r) => sum + Math.abs(r.slippagePct), 0) / all.length;
    if (avgAbsSlippage < 0.2) return "A";
    if (avgAbsSlippage < 0.5) return "B";
    if (avgAbsSlippage < 1.0) return "C";
    return "D";
  }
}
