/**
 * FD factor builder: raw warehouse cache → normalized per-ticker snapshots.
 * Persists to snapshots/ for backtests, projections, and discovery ranking.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getLatestFdCacheForTicker } from "./financialDatasetsCache";
import type { FdPriceRow } from "./financialDatasetsCache";
import { getFdSleeveTickers } from "./dexterPortfolio";
import type { FdTickerSnapshot } from "./fdFactorBuilder.types";

const CACHE_ROOT = ".elizadb/financialdatasets-cache";

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

function getVolume(r: FdPriceRow): number | null {
  return isNum(r.volume) ? r.volume : null;
}

function getOpen(r: FdPriceRow): number | null {
  return isNum(r.open) ? r.open : null;
}

/** Sort rows by date ascending; use date or time field */
function sortedRows(rows: FdPriceRow[]): FdPriceRow[] {
  return [...rows].sort((a, b) => {
    const da = parseDate((a.date ?? a.time) as string) ?? 0;
    const db = parseDate((b.date ?? b.time) as string) ?? 0;
    return da - db;
  });
}

/** Return over period ending at endIdx (0 = last row). Period length in trading days approx. */
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

/** Realized vol (annualized) from daily returns over last N days */
function realizedVol(sorted: FdPriceRow[], lastN: number): number | null {
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
  return dailyVol * Math.sqrt(252) * 100; // annualized pct
}

/** Max drawdown from peak (pct) */
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

/** Avg dollar volume over the series */
function avgDollarVolume(sorted: FdPriceRow[]): number | null {
  const pairs = sorted
    .map((r) => {
      const c = getClose(r);
      const v = getVolume(r);
      return c != null && v != null ? c * v : null;
    })
    .filter((x): x is number => x != null);
  if (pairs.length === 0) return null;
  return pairs.reduce((a, b) => a + b, 0) / pairs.length;
}

function loadFundamentalsEnvelope(
  ticker: string,
  projectRoot: string,
): Record<string, unknown> | null {
  const dir = path.join(projectRoot, CACHE_ROOT, "fundamentals");
  const file = path.join(
    dir,
    `${ticker.toUpperCase().trim()}_fundamentals.json`,
  );
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadEarningsEnvelope(
  ticker: string,
  projectRoot: string,
): Record<string, unknown> | null {
  const dir = path.join(projectRoot, CACHE_ROOT, "earnings");
  const file = path.join(dir, `${ticker.toUpperCase().trim()}_earnings.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadFilingsEnvelope(
  ticker: string,
  projectRoot: string,
): Record<string, unknown> | null {
  const dir = path.join(projectRoot, CACHE_ROOT, "filings");
  const file = path.join(dir, `${ticker.toUpperCase().trim()}_filings.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadInsidersEnvelope(
  ticker: string,
  projectRoot: string,
): Record<string, unknown> | null {
  const dir = path.join(projectRoot, CACHE_ROOT, "insiders");
  const file = path.join(dir, `${ticker.toUpperCase().trim()}_insiders.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Days since most recent earnings (from earnings envelope report_period or filings 8-K). */
function daysSinceEarnings(
  earnings: Record<string, unknown> | null,
  filings: Record<string, unknown> | null,
): number | null {
  let latest: string | null = null;
  if (earnings?.earnings && typeof earnings.earnings === "object") {
    const rp = (earnings.earnings as Record<string, unknown>).report_period;
    if (typeof rp === "string") latest = rp;
  }
  if (!latest && Array.isArray(filings?.filings)) {
    const eights = (filings.filings as Record<string, unknown>[]).filter(
      (f) => f.filing_type === "8-K",
    );
    for (const f of eights) {
      const d = f.report_date ?? f.filing_date;
      if (typeof d === "string" && (!latest || d > latest)) latest = d;
    }
  }
  if (!latest) return null;
  const t = new Date(latest).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

/** Recent 8-K / 10-Q / 10-K in last 90 days */
function recentFiling(
  filings: Record<string, unknown> | null,
  type: string,
  withinDays: number,
): boolean {
  if (!Array.isArray(filings?.filings)) return false;
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  return (filings.filings as Record<string, unknown>[]).some((f) => {
    if (f.filing_type !== type) return false;
    const d = f.filing_date ?? f.report_date;
    if (typeof d !== "string") return false;
    return new Date(d).getTime() >= cutoff;
  });
}

/** Filing counts in last 30d and 90d for catalyst intensity */
function filingCounts(filings: Record<string, unknown> | null): {
  count30d: number;
  count90d: number;
} {
  let count30d = 0;
  let count90d = 0;
  if (!Array.isArray(filings?.filings)) return { count30d, count90d };
  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const ms90 = 90 * 24 * 60 * 60 * 1000;
  for (const f of filings.filings as Record<string, unknown>[]) {
    const d = f.filing_date ?? f.report_date;
    if (typeof d !== "string") continue;
    const t = new Date(d).getTime();
    if (!Number.isFinite(t)) continue;
    if (now - t <= ms30) count30d++;
    if (now - t <= ms90) count90d++;
  }
  return { count30d, count90d };
}

/** Insider buy vs sell skew and counts (cluster-buying vs one-off). */
function insiderSkewAndCounts(insiders: Record<string, unknown> | null): {
  skew: number | null;
  buyCount: number;
  sellCount: number;
} {
  const trades = insiders?.insider_trades;
  if (!Array.isArray(trades) || trades.length === 0) {
    return { skew: null, buyCount: 0, sellCount: 0 };
  }
  let buySum = 0;
  let sellSum = 0;
  let buyCount = 0;
  let sellCount = 0;
  for (const t of trades as Record<string, unknown>[]) {
    const v = typeof t.transaction_value === "number" ? t.transaction_value : 0;
    const type = String(t.transaction_type ?? "").toLowerCase();
    if (type.includes("buy") || type.includes("p") || type === "p") {
      buySum += v;
      buyCount++;
    } else if (type.includes("sell") || type.includes("s") || type === "s") {
      sellSum += Math.abs(v);
      sellCount++;
    }
  }
  const total = buySum + sellSum;
  const skew = total === 0 ? null : (buySum - sellSum) / total;
  return { skew, buyCount, sellCount };
}

/** Valuation/quality from fundamentals/earnings when available */
function valuationAndQuality(
  fundamentals: Record<string, unknown> | null,
  earnings: Record<string, unknown> | null,
): {
  ev_sales_ttm: number | null;
  fcf_yield_pct: number | null;
  gross_margin_pct: number | null;
  revenue_growth_yoy_pct: number | null;
  operating_margin_pct: number | null;
} {
  let ev_sales_ttm: number | null = null;
  let fcf_yield_pct: number | null = null;
  let gross_margin_pct: number | null = null;
  let revenue_growth_yoy_pct: number | null = null;
  let operating_margin_pct: number | null = null;

  const inc = fundamentals?.incomeStatements as
    | Record<string, unknown>[]
    | undefined;
  if (Array.isArray(inc) && inc.length > 0) {
    const latest = inc[0] as Record<string, unknown>;
    const rev = typeof latest.revenue === "number" ? latest.revenue : null;
    const gross =
      typeof latest.gross_profit === "number" ? latest.gross_profit : null;
    const opInc =
      typeof latest.operating_income === "number"
        ? latest.operating_income
        : null;
    if (rev != null && rev > 0 && gross != null)
      gross_margin_pct = (gross / rev) * 100;
    if (rev != null && rev > 0 && opInc != null)
      operating_margin_pct = (opInc / rev) * 100;
  }

  const earn = earnings?.earnings;
  if (earn && typeof earn === "object") {
    const q = (earn as Record<string, unknown>).quarterly as
      | Record<string, unknown>
      | undefined;
    const a = (earn as Record<string, unknown>).annual as
      | Record<string, unknown>
      | undefined;
    const src = q ?? a;
    if (src && typeof src.revenue_chg === "number")
      revenue_growth_yoy_pct = src.revenue_chg;
    if (src && typeof src.free_cash_flow === "number") {
      // FCF yield would need market cap; leave null or approximate later
      fcf_yield_pct = null;
    }
  }

  return {
    ev_sales_ttm,
    fcf_yield_pct,
    gross_margin_pct,
    revenue_growth_yoy_pct,
    operating_margin_pct,
  };
}

/** Earnings surprise (actual vs estimate) when available from earnings envelope */
function earningsSurprisePct(
  earnings: Record<string, unknown> | null,
): number | null {
  const earn = earnings?.earnings;
  if (!earn || typeof earn !== "object") return null;
  const q = (earn as Record<string, unknown>).quarterly as
    | Record<string, unknown>
    | undefined;
  const a = (earn as Record<string, unknown>).annual as
    | Record<string, unknown>
    | undefined;
  const src = q ?? a;
  if (!src) return null;
  const actual = typeof src.actual === "number" ? src.actual : null;
  const estimate = typeof src.estimate === "number" ? src.estimate : null;
  if (actual == null || estimate == null || estimate === 0) return null;
  return ((actual - estimate) / Math.abs(estimate)) * 100;
}

/**
 * Compute one ticker snapshot from warehouse data.
 * Uses projectRoot for price cache and all cache paths so outcome resolution is deterministic.
 */
export function computeFdSnapshot(
  ticker: string,
  projectRoot: string = process.cwd(),
): FdTickerSnapshot {
  const upper = ticker.toUpperCase().trim();
  const pricePayload = getLatestFdCacheForTicker(projectRoot, upper);
  const fundamentals = loadFundamentalsEnvelope(upper, projectRoot);
  const earnings = loadEarningsEnvelope(upper, projectRoot);
  const filings = loadFilingsEnvelope(upper, projectRoot);
  const insiders = loadInsidersEnvelope(upper, projectRoot);

  const vq = valuationAndQuality(
    fundamentals,
    earnings as Record<string, unknown> | null,
  );
  const filingCountsRes = filingCounts(filings);
  const insiderRes = insiderSkewAndCounts(insiders);
  const earningsSurprise = earningsSurprisePct(
    earnings as Record<string, unknown> | null,
  );

  const snapshot: FdTickerSnapshot = {
    ticker: upper,
    snapshotAt: new Date().toISOString(),
    momentum_1m_pct: null,
    momentum_3m_pct: null,
    momentum_6m_pct: null,
    momentum_12m_pct: null,
    vol_realized_20d: null,
    drawdown_pct: null,
    dollar_volume_avg: null,
    ev_sales_ttm: vq.ev_sales_ttm,
    fcf_yield_pct: vq.fcf_yield_pct,
    gross_margin_pct: vq.gross_margin_pct,
    revenue_growth_yoy_pct: vq.revenue_growth_yoy_pct,
    operating_margin_pct: vq.operating_margin_pct,
    days_since_earnings: daysSinceEarnings(
      earnings as Record<string, unknown> | null,
      filings,
    ),
    recent_8k: recentFiling(filings, "8-K", 90),
    recent_10q: recentFiling(filings, "10-Q", 90),
    recent_10k: recentFiling(filings, "10-K", 365),
    filing_count_30d: filingCountsRes.count30d,
    filing_count_90d: filingCountsRes.count90d,
    insider_buy_sell_skew: insiderRes.skew,
    insider_buy_count: insiderRes.buyCount,
    insider_sell_count: insiderRes.sellCount,
    earnings_surprise_pct: earningsSurprise,
    sector_relative_momentum_3m_pct: null,
    rowCount: 0,
    startDate: null,
    endDate: null,
  };

  if (!pricePayload?.rows?.length) return snapshot;

  const sorted = sortedRows(pricePayload.rows);
  const n = sorted.length - 1;
  const tradingDays1m = 22;
  const tradingDays3m = 63;
  const tradingDays6m = 126;
  const tradingDays12m = 252;

  snapshot.momentum_1m_pct = returnPct(sorted, n, tradingDays1m);
  snapshot.momentum_3m_pct = returnPct(sorted, n, tradingDays3m);
  snapshot.momentum_6m_pct = returnPct(sorted, n, tradingDays6m);
  snapshot.momentum_12m_pct = returnPct(sorted, n, tradingDays12m);
  snapshot.vol_realized_20d = realizedVol(sorted, 20);
  snapshot.drawdown_pct = maxDrawdownPct(sorted);
  snapshot.dollar_volume_avg = avgDollarVolume(sorted);
  snapshot.rowCount = sorted.length;
  snapshot.startDate =
    (sorted[0] && ((sorted[0].date ?? sorted[0].time) as string)) ?? null;
  snapshot.endDate =
    (sorted[n] && ((sorted[n].date ?? sorted[n].time) as string)) ?? null;

  return snapshot;
}

/** Write snapshot to snapshots/{ticker}_snapshot.json */
export function writeFdSnapshot(
  ticker: string,
  snapshot: FdTickerSnapshot,
  projectRoot: string = process.cwd(),
): string {
  const dir = path.join(projectRoot, CACHE_ROOT, "snapshots");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${snapshot.ticker}_snapshot.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf-8");
  return file;
}

/** Build and persist snapshot for one ticker. */
export function buildFdSnapshotForTicker(
  ticker: string,
  projectRoot: string = process.cwd(),
): FdTickerSnapshot {
  const snapshot = computeFdSnapshot(ticker, projectRoot);
  writeFdSnapshot(ticker, snapshot, projectRoot);
  return snapshot;
}

/** Build snapshots for FD sleeve tickers, or for a given list when provided (e.g. full candidate universe). */
export function buildAllFdSnapshots(
  projectRoot: string = process.cwd(),
  tickersOverride?: string[],
): FdTickerSnapshot[] {
  const tickers =
    tickersOverride && tickersOverride.length > 0
      ? [...new Set(tickersOverride.map((t) => t.toUpperCase().trim()))]
      : getFdSleeveTickers(projectRoot);
  const out: FdTickerSnapshot[] = [];
  for (const t of tickers) {
    out.push(buildFdSnapshotForTicker(t, projectRoot));
  }
  return out;
}

/** Read existing snapshot from disk if present. */
export function readFdSnapshot(
  ticker: string,
  projectRoot: string = process.cwd(),
): FdTickerSnapshot | null {
  const dir = path.join(projectRoot, CACHE_ROOT, "snapshots");
  const file = path.join(dir, `${ticker.toUpperCase().trim()}_snapshot.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as FdTickerSnapshot;
  } catch {
    return null;
  }
}
