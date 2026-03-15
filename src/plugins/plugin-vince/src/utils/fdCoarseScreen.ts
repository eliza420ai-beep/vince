/**
 * Coarse screening (stage 1): price-only filters and metrics.
 * Used before expensive enrichment so we only fetch fundamentals/filings/earnings/insiders for survivors.
 * Hard filters: US common stocks (caller provides list), price floor, liquidity floor, min history.
 */

import type { FdPriceRow } from "./financialDatasetsCache";
import {
  getLatestFdCacheForTicker,
  type FdCacheEnvelope,
} from "./financialDatasetsCache";

export interface CoarseScreenOptions {
  /** Min close price (e.g. 5). Default 2. */
  minPrice?: number;
  /** Min avg dollar volume (close * volume). Default 500_000. */
  minDollarVolume?: number;
  /** Min trading days in history. Default 252 (≈1y). */
  minBars?: number;
  /** Max number of tickers to return after filtering (top by coarse score). Default 1000. */
  topN?: number;
  /** Coarse score weights: momentum 12m, then liquidity. Higher = more likely to pass. */
}

export interface CoarseScreenResultRow {
  ticker: string;
  pass: boolean;
  lastClose: number | null;
  momentum12mPct: number | null;
  vol20dPct: number | null;
  maxDrawdownPct: number | null;
  dollarVolumeAvg: number | null;
  barCount: number;
  coarseScore: number;
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseDate(s: string | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : null;
}

function getClose(r: FdPriceRow): number | null {
  const c = r.close;
  return isNum(c) ? c : null;
}

function sortedRows(rows: FdPriceRow[]): FdPriceRow[] {
  return [...rows].sort((a, b) => {
    const da = parseDate((a.date ?? a.time) as string) ?? 0;
    const db = parseDate((b.date ?? b.time) as string) ?? 0;
    return da - db;
  });
}

function returnPct(
  sorted: FdPriceRow[],
  endIdx: number,
  numDays: number,
): number | null {
  const startIdx = Math.max(0, endIdx - numDays);
  const cStart = getClose(sorted[startIdx]);
  const cEnd = getClose(sorted[endIdx]);
  if (cStart == null || cEnd == null || cStart === 0) return null;
  return ((cEnd - cStart) / cStart) * 100;
}

function realizedVolPct(sorted: FdPriceRow[], lastN: number): number | null {
  const closes = sorted.map(getClose).filter((c): c is number => c != null);
  if (closes.length < 2 || lastN < 2) return null;
  const start = Math.max(0, closes.length - lastN);
  const slice = closes.slice(start);
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const r = (slice[i]! - slice[i - 1]!) / slice[i - 1]!;
    returns.push(r);
  }
  if (returns.length === 0) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);
  return dailyVol * Math.sqrt(252) * 100;
}

function maxDrawdownPct(sorted: FdPriceRow[]): number | null {
  const closes = sorted.map(getClose).filter((c): c is number => c != null);
  if (closes.length < 2) return null;
  let peak = closes[0]!;
  let maxDd = 0;
  for (let i = 1; i < closes.length; i++) {
    const c = closes[i]!;
    if (c > peak) peak = c;
    const dd = ((peak - c) / peak) * 100;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

function avgDollarVolume(sorted: FdPriceRow[]): number | null {
  const pairs = sorted
    .map((r) => {
      const c = getClose(r);
      const v = r.volume;
      return c != null && isNum(v) ? c * v : null;
    })
    .filter((x): x is number => x != null);
  if (pairs.length === 0) return null;
  return pairs.reduce((a, b) => a + b, 0) / pairs.length;
}

function computeCoarseRow(
  ticker: string,
  payload: FdCacheEnvelope | null,
  opts: {
    minPrice: number;
    minDollarVolume: number;
    minBars: number;
  },
): CoarseScreenResultRow {
  if (!payload?.rows?.length) {
    return {
      ticker,
      pass: false,
      lastClose: null,
      momentum12mPct: null,
      vol20dPct: null,
      maxDrawdownPct: null,
      dollarVolumeAvg: null,
      barCount: 0,
      coarseScore: 0,
    };
  }
  const sorted = sortedRows(payload.rows as FdPriceRow[]);
  const barCount = sorted.length;
  const lastIdx = barCount - 1;
  const lastClose = getClose(sorted[lastIdx]);
  const momentum12mPct = returnPct(sorted, lastIdx, 252);
  const vol20dPct = realizedVolPct(sorted, 20);
  const maxDd = maxDrawdownPct(sorted);
  const dollarVolumeAvg = avgDollarVolume(sorted);

  const pass =
    lastClose != null &&
    lastClose >= opts.minPrice &&
    dollarVolumeAvg != null &&
    dollarVolumeAvg >= opts.minDollarVolume &&
    barCount >= opts.minBars;

  const momScore =
    momentum12mPct != null
      ? Math.min(1, Math.max(0, (momentum12mPct + 50) / 150))
      : 0.5;
  const liqScore =
    dollarVolumeAvg != null && opts.minDollarVolume > 0
      ? Math.min(1, Math.log10(dollarVolumeAvg / opts.minDollarVolume + 1) / 4)
      : 0;
  const coarseScore = pass ? momScore * 0.6 + liqScore * 0.4 : 0;

  return {
    ticker,
    pass,
    lastClose,
    momentum12mPct,
    vol20dPct,
    maxDrawdownPct: maxDd,
    dollarVolumeAvg,
    barCount,
    coarseScore,
  };
}

/**
 * Run coarse screen on tickers using only cached price data.
 * Returns survivors (and optionally all rows for diagnostics).
 * Use before calling refreshTicker / buildSnapshots for large universes.
 */
export function coarseScreenFromPriceCache(
  tickers: string[],
  projectRoot: string = process.cwd(),
  options?: CoarseScreenOptions,
): {
  survivors: string[];
  screenedCount: number;
  rows: CoarseScreenResultRow[];
} {
  const minPrice = options?.minPrice ?? 2;
  const minDollarVolume = options?.minDollarVolume ?? 500_000;
  const minBars = options?.minBars ?? 252;
  const topN = options?.topN ?? 1000;

  const opts = { minPrice, minDollarVolume, minBars };
  const rows: CoarseScreenResultRow[] = [];

  for (const ticker of tickers) {
    const payload = getLatestFdCacheForTicker(projectRoot, ticker);
    rows.push(computeCoarseRow(ticker, payload, opts));
  }

  const passing = rows.filter((r) => r.pass);
  passing.sort((a, b) => b.coarseScore - a.coarseScore);
  const survivors = passing.slice(0, topN).map((r) => r.ticker);

  return {
    survivors,
    screenedCount: tickers.length,
    rows,
  };
}
