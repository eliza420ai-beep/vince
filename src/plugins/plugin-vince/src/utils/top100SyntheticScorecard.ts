import type { FdTickerSnapshot } from "./fdFactorBuilder.types";
import type { Top100StockRow } from "./top100Stocks";

/** Clamp and scale a value to 0–100. null/NaN -> 50 (neutral). */
function toScore(
  value: number | null | undefined,
  low: number,
  high: number,
): number {
  if (value == null || !Number.isFinite(value)) return 50;
  if (high === low) return 50;
  const pct = Math.max(0, Math.min(100, ((value - low) / (high - low)) * 100));
  return Math.round(pct * 10) / 10;
}

/** Growth: revenue_growth_yoy_pct. Higher is better. */
function growthScore(s: FdTickerSnapshot): number {
  const v = s.revenue_growth_yoy_pct;
  return toScore(v, -20, 50);
}

/** Profit: operating_margin_pct, gross_margin_pct. Higher is better. */
function profitScore(s: FdTickerSnapshot): number {
  const op = s.operating_margin_pct ?? 0;
  const gross = s.gross_margin_pct ?? 0;
  const combined =
    Number.isFinite(op) && Number.isFinite(gross)
      ? (op + gross) / 2
      : op || gross;
  return toScore(combined, -10, 50);
}

/** Momentum: momentum_3m_pct, momentum_12m_pct. Higher is better. */
function momentumScore(s: FdTickerSnapshot): number {
  const m3 = s.momentum_3m_pct ?? 0;
  const m12 = s.momentum_12m_pct ?? 0;
  const combined =
    Number.isFinite(m3) && Number.isFinite(m12)
      ? m3 * 0.4 + m12 * 0.6
      : m3 || m12;
  return toScore(combined, -30, 80);
}

/** Earnings: earnings_surprise_pct (positive = beat), days_since_earnings (recent = better). */
function earningsScore(s: FdTickerSnapshot): number {
  const surprise = s.earnings_surprise_pct ?? 0;
  const days = s.days_since_earnings ?? 999;
  const surpriseScore = toScore(surprise, -10, 15);
  const recencyScore =
    days <= 30 ? 80 : days <= 90 ? 60 : days <= 180 ? 45 : 35;
  return Math.round((surpriseScore * 0.5 + recencyScore * 0.5) * 10) / 10;
}

/** Insider: buy_sell_skew. Positive = more buys. */
function insiderScore(s: FdTickerSnapshot): number {
  const skew = s.insider_buy_sell_skew;
  return toScore(skew ?? 0, -1, 1);
}

/** Valuation: ev_sales (lower can be better), fcf_yield (higher better). Simplified to one 0–100. */
function valuationScore(s: FdTickerSnapshot): number {
  const ev = s.ev_sales_ttm;
  const fcf = s.fcf_yield_pct;
  if (
    ev != null &&
    Number.isFinite(ev) &&
    fcf != null &&
    Number.isFinite(fcf)
  ) {
    const evScore = 100 - toScore(ev, 0, 20);
    const fcfScore = toScore(fcf, -5, 15);
    return Math.round((evScore * 0.4 + fcfScore * 0.6) * 10) / 10;
  }
  if (fcf != null && Number.isFinite(fcf)) return toScore(fcf, -5, 15);
  if (ev != null && Number.isFinite(ev))
    return Math.round((100 - toScore(ev, 0, 20)) * 10) / 10;
  return 50;
}

/** Balance sheet: heuristic from margins + FCF. */
function balanceSheetScore(s: FdTickerSnapshot): number {
  const op = s.operating_margin_pct ?? 0;
  const fcf = s.fcf_yield_pct ?? 0;
  const combined =
    Number.isFinite(op) && Number.isFinite(fcf) ? (op + fcf) / 2 : op || fcf;
  return toScore(combined, -20, 40);
}

export interface SyntheticScorecard {
  composite: number;
  growthScore: number;
  valuationScore: number;
  momentumScore: number;
  profitScore: number;
  earningsScore: number;
  balanceSheetScore: number;
  insiderScore: number;
}

const WEIGHTS = {
  growthScore: 0.15,
  valuationScore: 0.1,
  momentumScore: 0.2,
  profitScore: 0.15,
  earningsScore: 0.15,
  balanceSheetScore: 0.1,
  insiderScore: 0.15,
};

/**
 * Compute synthetic composite and sub-scores from FD snapshot.
 * Use when row has no composite (e.g. portfolio-driven universe without TOP100 scorecard).
 */
export function computeSyntheticScore(
  _row: Top100StockRow,
  snapshot: FdTickerSnapshot | null,
): SyntheticScorecard | null {
  if (!snapshot) return null;

  const growthScoreVal = growthScore(snapshot);
  const valuationScoreVal = valuationScore(snapshot);
  const momentumScoreVal = momentumScore(snapshot);
  const profitScoreVal = profitScore(snapshot);
  const earningsScoreVal = earningsScore(snapshot);
  const balanceSheetScoreVal = balanceSheetScore(snapshot);
  const insiderScoreVal = insiderScore(snapshot);

  const composite =
    growthScoreVal * WEIGHTS.growthScore +
    valuationScoreVal * WEIGHTS.valuationScore +
    momentumScoreVal * WEIGHTS.momentumScore +
    profitScoreVal * WEIGHTS.profitScore +
    earningsScoreVal * WEIGHTS.earningsScore +
    balanceSheetScoreVal * WEIGHTS.balanceSheetScore +
    insiderScoreVal * WEIGHTS.insiderScore;

  return {
    composite: Math.round(composite * 10) / 10,
    growthScore: growthScoreVal,
    valuationScore: valuationScoreVal,
    momentumScore: momentumScoreVal,
    profitScore: profitScoreVal,
    earningsScore: earningsScoreVal,
    balanceSheetScore: balanceSheetScoreVal,
    insiderScore: insiderScoreVal,
  };
}
