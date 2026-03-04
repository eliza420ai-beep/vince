import * as fs from "node:fs";
import * as path from "node:path";
import type { SolusStockRecommendation } from "./stockScoring";

const SOLUS_PERSIST_DIR = "solus";
const STOCK_CALLS_FILE = "solus-stock-recommendations.jsonl";
const STOCK_CALIBRATION_NOTES_FILE = "solus-stock-calibration-notes.txt";

export interface SolusStockRecommendationRow {
  ticker: string;
  theme: string;
  thesisRole: string;
  recommendation: SolusStockRecommendation;
  netEdgeScore: number;
  invalidation: string;
  createdAt: number;
  entryPrice?: number;
  reviewAfterDays?: number;
  resolvedAt?: number;
  exitPrice?: number;
  realizedReturnPct?: number;
  outcome?: "win" | "loss" | "neutral";
  outcomeNote?: string;
}

export interface StockCalibrationBucket {
  bucket: "high" | "mid" | "low";
  count: number;
  winRate: number;
  avgReturnPct: number;
}

export function getSolusPersistDir(): string {
  const base =
    typeof process !== "undefined" && process.env?.ELIZA_DB_DIR
      ? path.join(process.cwd(), process.env.ELIZA_DB_DIR)
      : path.join(process.cwd(), ".elizadb");
  return path.join(base, SOLUS_PERSIST_DIR);
}

export function getStockCallsStorePath(): string {
  return path.join(getSolusPersistDir(), STOCK_CALLS_FILE);
}

export function getStockCalibrationNotesPath(): string {
  return path.join(getSolusPersistDir(), STOCK_CALIBRATION_NOTES_FILE);
}

function ensureDir(): void {
  const dir = getSolusPersistDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadStockCallRecords(): SolusStockRecommendationRow[] {
  const filePath = getStockCallsStorePath();
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as SolusStockRecommendationRow;
        } catch {
          return null;
        }
      })
      .filter((r): r is SolusStockRecommendationRow => r != null);
  } catch {
    return [];
  }
}

export function appendStockCallRecord(
  row: Omit<SolusStockRecommendationRow, "createdAt">,
): void {
  ensureDir();
  const full: SolusStockRecommendationRow = {
    ...row,
    createdAt: Date.now(),
  };
  fs.appendFileSync(getStockCallsStorePath(), JSON.stringify(full) + "\n");
}

export function saveStockCallRecords(
  rows: SolusStockRecommendationRow[],
): void {
  ensureDir();
  fs.writeFileSync(
    getStockCallsStorePath(),
    rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""),
    "utf-8",
  );
}

function bucketForScore(score: number): "high" | "mid" | "low" {
  if (score >= 70) return "high";
  if (score >= 45) return "mid";
  return "low";
}

export function buildStockCalibrationBuckets(
  rows: SolusStockRecommendationRow[],
): StockCalibrationBucket[] {
  const resolved = rows.filter(
    (r) => r.resolvedAt && typeof r.realizedReturnPct === "number",
  );
  const buckets: Array<"high" | "mid" | "low"> = ["high", "mid", "low"];
  return buckets.map((bucket) => {
    const group = resolved.filter(
      (r) => bucketForScore(r.netEdgeScore) === bucket,
    );
    if (group.length === 0) {
      return { bucket, count: 0, winRate: 0, avgReturnPct: 0 };
    }
    const wins = group.filter((r) => r.outcome === "win").length;
    const avgReturn =
      group.reduce((sum, r) => sum + (r.realizedReturnPct ?? 0), 0) /
      group.length;
    return {
      bucket,
      count: group.length,
      winRate: wins / group.length,
      avgReturnPct: avgReturn,
    };
  });
}

export function writeStockCalibrationNotes(text: string): void {
  ensureDir();
  fs.writeFileSync(getStockCalibrationNotesPath(), text, "utf-8");
}

export function readStockCalibrationNotes(): string | null {
  const p = getStockCalibrationNotesPath();
  try {
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, "utf-8").trim() || null;
  } catch {
    return null;
  }
}
