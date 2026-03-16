import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import type { Top100StockRow } from "./top100Stocks";

export type Top100SnapshotStatus = "loading" | "ok" | "stale" | "error";

export interface Top100SnapshotRow {
  id: string;
  ticker: string;
  rank?: number;
  liveRank?: number;
  composite?: number;
  change1dPct?: number;
  change7dPct?: number;
  change30dPct?: number;
  priceLive?: number;
  marketCap?: number;
  marketCapSource?: "yahoo" | "hip3" | "fd_cache" | "profile_cache";
  quoteSource?: "yahoo" | "hip3" | "fd_cache";
  quoteUpdatedAt?: number;
}

export interface Top100Snapshot {
  snapshotId: string;
  capturedAt: number;
  top100FileMtimeMs: number;
  top100FileHash: string;
  sectionStatus: Top100SnapshotStatus;
  rowsHash: string;
  rows: Top100SnapshotRow[];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function getTop100Dir(projectRoot: string = process.cwd()): string {
  return path.join(projectRoot, ".elizadb", "top100");
}

export function getTop100HistoryPath(
  projectRoot: string = process.cwd(),
): string {
  return path.join(getTop100Dir(projectRoot), "top100-snapshots.jsonl");
}

export function getTop100SourceMeta(projectRoot: string = process.cwd()): {
  top100FileMtimeMs: number;
  top100FileHash: string;
} {
  const filePath = path.join(projectRoot, "TOP100.md");
  const stat = fs.statSync(filePath);
  const raw = fs.readFileSync(filePath, "utf-8");
  return {
    top100FileMtimeMs: stat.mtimeMs,
    top100FileHash: createHash("sha1").update(raw).digest("hex"),
  };
}

function toSnapshotRows(rows: Top100StockRow[]): Top100SnapshotRow[] {
  return rows.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    rank: row.rank,
    liveRank: row.liveRank,
    composite: row.composite,
    change1dPct: row.change1dPct,
    change7dPct: row.change7dPct,
    change30dPct: row.change30dPct,
    priceLive: row.priceLive,
    marketCap: row.marketCap,
    marketCapSource: row.marketCapSource,
    quoteSource: row.quoteSource,
    quoteUpdatedAt: row.quoteUpdatedAt,
  }));
}

function makeRowsHash(rows: Top100SnapshotRow[]): string {
  return createHash("sha1").update(JSON.stringify(rows)).digest("hex");
}

function parseSnapshotLine(line: string): Top100Snapshot | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Top100Snapshot;
    if (
      !parsed ||
      !Array.isArray(parsed.rows) ||
      typeof parsed.snapshotId !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readLatestTop100Snapshot(
  projectRoot: string = process.cwd(),
): Top100Snapshot | null {
  const filePath = getTop100HistoryPath(projectRoot);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return null;
    const lines = raw.trimEnd().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const parsed = parseSnapshotLine(lines[i] ?? "");
      if (parsed) return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function appendTop100Snapshot(args: {
  rows: Top100StockRow[];
  status: Top100SnapshotStatus;
  projectRoot?: string;
  dedupeWindowMs?: number;
}): {
  appended: boolean;
  snapshot: Top100Snapshot;
  reason?: "duplicate_recent";
} {
  const projectRoot = args.projectRoot ?? process.cwd();
  const dedupeWindowMs = isFiniteNumber(args.dedupeWindowMs)
    ? Math.max(0, args.dedupeWindowMs)
    : 30 * 60 * 1000;
  const rows = toSnapshotRows(args.rows);
  const { top100FileHash, top100FileMtimeMs } =
    getTop100SourceMeta(projectRoot);
  const rowsHash = makeRowsHash(rows);
  const capturedAt = Date.now();
  const snapshot: Top100Snapshot = {
    snapshotId: `top100-${capturedAt}`,
    capturedAt,
    top100FileMtimeMs,
    top100FileHash,
    sectionStatus: args.status,
    rowsHash,
    rows,
  };

  const latest = readLatestTop100Snapshot(projectRoot);
  if (
    latest &&
    latest.rowsHash === rowsHash &&
    latest.top100FileHash === top100FileHash &&
    capturedAt - latest.capturedAt < dedupeWindowMs
  ) {
    return {
      appended: false,
      snapshot,
      reason: "duplicate_recent",
    };
  }

  const dir = getTop100Dir(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(
    getTop100HistoryPath(projectRoot),
    `${JSON.stringify(snapshot)}\n`,
    "utf-8",
  );

  return { appended: true, snapshot };
}
