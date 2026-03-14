import * as fs from "node:fs";
import * as path from "node:path";

export interface FdPriceRow {
  time?: string;
  date?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  [k: string]: unknown;
}

export interface FdCacheEnvelope {
  ticker: string;
  source: "financialdatasets";
  endpoint: string;
  interval: "day";
  startDate: string;
  endDate: string;
  fetchedAt: string;
  rowCount: number;
  rows: FdPriceRow[];
}

function getPricesCacheDir(): string {
  return path.join(
    process.cwd(),
    ".elizadb",
    "financialdatasets-cache",
    "prices",
  );
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Return latest cache file for ticker (by fetchedAt desc, fallback mtime desc).
 */
export function getLatestFdCacheForTicker(
  ticker: string,
): FdCacheEnvelope | null {
  const dir = getPricesCacheDir();
  if (!fs.existsSync(dir)) return null;

  const upper = ticker.toUpperCase().trim();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${upper}_`) && f.endsWith("_day.json"))
    .map((f) => path.join(dir, f));
  if (files.length === 0) return null;

  let best: { payload: FdCacheEnvelope; score: number } | null = null;
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, "utf-8");
      const payload = JSON.parse(raw) as FdCacheEnvelope;
      const score = payload.fetchedAt
        ? new Date(payload.fetchedAt).getTime()
        : fs.statSync(file).mtimeMs;
      if (!best || score > best.score) {
        best = { payload, score };
      }
    } catch {
      // ignore invalid cache files
    }
  }
  return best?.payload ?? null;
}

export interface FdCachedHistorySummary {
  ticker: string;
  rowCount: number;
  startDate: string;
  endDate: string;
  fetchedAt: string;
  firstClose: number | null;
  lastClose: number | null;
  returnPct: number | null;
  avgVolume: number | null;
}

export function summarizeFdCachedHistory(
  ticker: string,
): FdCachedHistorySummary | null {
  const payload = getLatestFdCacheForTicker(ticker);
  if (!payload || !Array.isArray(payload.rows) || payload.rows.length === 0) {
    return null;
  }

  const closes = payload.rows.map((r) => r.close).filter(isFiniteNumber);
  const volumes = payload.rows.map((r) => r.volume).filter(isFiniteNumber);
  const firstClose = closes.length > 0 ? closes[0] : null;
  const lastClose = closes.length > 0 ? closes[closes.length - 1] : null;
  const returnPct =
    firstClose && lastClose
      ? ((lastClose - firstClose) / firstClose) * 100
      : null;
  const avgVolume =
    volumes.length > 0
      ? volumes.reduce((a, b) => a + b, 0) / volumes.length
      : null;

  return {
    ticker: payload.ticker,
    rowCount: payload.rows.length,
    startDate: payload.startDate,
    endDate: payload.endDate,
    fetchedAt: payload.fetchedAt,
    firstClose,
    lastClose,
    returnPct,
    avgVolume,
  };
}
