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

function getPricesCacheDir(projectRoot: string = process.cwd()): string {
  return path.join(
    projectRoot,
    ".elizadb",
    "financialdatasets-cache",
    "prices",
  );
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Parse date string (YYYY-MM-DD or ISO) to time; return null if invalid. */
function parseDateToTime(s: string | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Get close from row; prefer date then time for ordering. */
function rowDate(row: FdPriceRow): string | undefined {
  return (row.date as string) ?? (row.time as string);
}

/**
 * Return latest cache file for ticker (by fetchedAt desc, fallback mtime desc).
 * @param projectRoot - Root for .elizadb/financialdatasets-cache (default process.cwd()).
 */
export function getLatestFdCacheForTicker(
  projectRootOrTicker: string,
  tickerArg?: string,
): FdCacheEnvelope | null {
  const projectRoot =
    tickerArg !== undefined ? projectRootOrTicker : process.cwd();
  const ticker = tickerArg !== undefined ? tickerArg : projectRootOrTicker;
  const dir = getPricesCacheDir(projectRoot);
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

/**
 * Get close price on or after the given ISO date using nearest-trading-day logic.
 * Uses cached FD daily bars; returns the close of the first bar with date >= isoDate.
 */
export function getCloseOnOrAfterDate(
  projectRoot: string,
  ticker: string,
  isoDate: string,
): { date: string; close: number } | null {
  const payload = getLatestFdCacheForTicker(projectRoot, ticker);
  if (!payload?.rows?.length) return null;
  const targetTime = parseDateToTime(isoDate);
  if (targetTime == null) return null;

  const sorted = [...payload.rows].sort((a, b) => {
    const ta = parseDateToTime(rowDate(a)) ?? 0;
    const tb = parseDateToTime(rowDate(b)) ?? 0;
    return ta - tb;
  });

  for (const row of sorted) {
    const rowT = parseDateToTime(rowDate(row));
    if (rowT == null) continue;
    if (rowT >= targetTime) {
      const c = row.close;
      if (isFiniteNumber(c)) return { date: rowDate(row) ?? isoDate, close: c };
      break;
    }
  }
  const last = sorted[sorted.length - 1];
  if (last) {
    const c = last.close;
    if (isFiniteNumber(c)) return { date: rowDate(last) ?? isoDate, close: c };
  }
  return null;
}

/**
 * Return (pct) between entry and target dates using nearest-trading-day logic.
 * entryDate and targetDate are ISO date strings. Uses FD cached daily bars.
 */
export function getReturnBetweenDates(
  projectRoot: string,
  ticker: string,
  entryDate: string,
  targetDate: string,
): {
  entryClose: number;
  targetClose: number;
  targetBarDate: string;
  returnPct: number;
} | null {
  const entry = getCloseOnOrAfterDate(projectRoot, ticker, entryDate);
  const target = getCloseOnOrAfterDate(projectRoot, ticker, targetDate);
  if (!entry || !target) return null;
  const entryTime = parseDateToTime(entry.date);
  const targetTime = parseDateToTime(target.date);
  if (entryTime == null || targetTime == null || targetTime < entryTime)
    return null;
  if (entry.close === 0) return null;
  const returnPct = ((target.close - entry.close) / entry.close) * 100;
  return {
    entryClose: entry.close,
    targetClose: target.close,
    targetBarDate: target.date,
    returnPct,
  };
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

export interface FdSparklinePoint {
  date: string;
  close: number;
}

export function summarizeFdCachedHistory(
  ticker: string,
  projectRoot: string = process.cwd(),
): FdCachedHistorySummary | null {
  const payload = getLatestFdCacheForTicker(projectRoot, ticker);
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

/**
 * Compute 1D return from cached FD daily bars as (latest close - previous bar close) / previous bar close.
 * Use this for row-level 1D when Yahoo/HIP-3 are absent; avoids calendar-day offset issues (e.g. weekends).
 */
export function getPreviousBarReturn1d(
  projectRoot: string,
  ticker: string,
): { returnPct: number; latestDate: string; previousDate: string } | null {
  const payload = getLatestFdCacheForTicker(projectRoot, ticker);
  if (!payload?.rows?.length) return null;
  const sorted = [...payload.rows].sort((a, b) => {
    const ta = parseDateToTime(rowDate(a)) ?? 0;
    const tb = parseDateToTime(rowDate(b)) ?? 0;
    return ta - tb;
  });
  if (sorted.length < 2) return null;
  const prev = sorted[sorted.length - 2];
  const latest = sorted[sorted.length - 1];
  const prevClose = prev?.close;
  const latestClose = latest?.close;
  if (
    !isFiniteNumber(prevClose) ||
    !isFiniteNumber(latestClose) ||
    prevClose === 0
  )
    return null;
  const returnPct = ((latestClose - prevClose) / prevClose) * 100;
  return {
    returnPct,
    latestDate: String(rowDate(latest)).slice(0, 10),
    previousDate: String(rowDate(prev)).slice(0, 10),
  };
}

/** Convenience: trailing return over N calendar days using cached daily bars. */
export function getTrailingReturnDays(
  projectRoot: string,
  ticker: string,
  days: number,
): { returnPct: number; endDate: string; endPrice: number } | null {
  if (!Number.isFinite(days) || days <= 0) return null;
  const payload = getLatestFdCacheForTicker(projectRoot, ticker);
  if (!payload?.rows?.length) return null;
  const endDate = payload.endDate;
  const end = getCloseOnOrAfterDate(projectRoot, ticker, endDate);
  if (!end) return null;
  const endTime = parseDateToTime(end.date);
  if (endTime == null) return null;
  const msOffset = days * 24 * 60 * 60 * 1000;
  const startIso = new Date(endTime - msOffset).toISOString().slice(0, 10);
  const start = getCloseOnOrAfterDate(projectRoot, ticker, startIso);
  if (!start) return null;
  if (start.close === 0) return null;
  const returnPct = ((end.close - start.close) / start.close) * 100;
  return { returnPct, endDate: end.date, endPrice: end.close };
}

/** Extract a compact recent close series from cached FD daily bars for mini charts. */
export function getRecentFdSparkline(
  projectRoot: string,
  ticker: string,
  options?: {
    maxPoints?: number;
    lookbackDays?: number;
  },
): FdSparklinePoint[] | null {
  const payload = getLatestFdCacheForTicker(projectRoot, ticker);
  if (!payload?.rows?.length) return null;

  const maxPoints = Math.max(7, options?.maxPoints ?? 24);
  const lookbackDays = Math.max(7, options?.lookbackDays ?? 45);

  const sorted = [...payload.rows].sort((a, b) => {
    const ta = parseDateToTime(rowDate(a)) ?? 0;
    const tb = parseDateToTime(rowDate(b)) ?? 0;
    return ta - tb;
  });

  const latestRow = sorted[sorted.length - 1];
  const latestTime = parseDateToTime(rowDate(latestRow));
  if (latestTime == null) return null;

  const cutoff = latestTime - lookbackDays * 24 * 60 * 60 * 1000;
  const recent = sorted
    .filter((row) => {
      const t = parseDateToTime(rowDate(row));
      return t != null && t >= cutoff && isFiniteNumber(row.close);
    })
    .map((row) => ({
      date: String(rowDate(row)).slice(0, 10),
      close: row.close as number,
    }));

  if (!recent.length) return null;
  if (recent.length <= maxPoints) return recent;

  const step = (recent.length - 1) / (maxPoints - 1);
  const compact: FdSparklinePoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    compact.push(recent[Math.round(i * step)]);
  }
  return compact;
}
