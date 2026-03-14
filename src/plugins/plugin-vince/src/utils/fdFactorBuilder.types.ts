/**
 * FD factor snapshot schema for backtests, projections, and discovery ranking.
 * One snapshot per ticker; built from warehouse prices, fundamentals, earnings, filings, insiders.
 */

export interface FdTickerSnapshot {
  ticker: string;
  snapshotAt: string; // ISO
  /** Price-based */
  momentum_1m_pct: number | null;
  momentum_3m_pct: number | null;
  momentum_6m_pct: number | null;
  momentum_12m_pct: number | null;
  vol_realized_20d: number | null;
  drawdown_pct: number | null;
  dollar_volume_avg: number | null;
  /** Valuation / fundamentals (when available) */
  ev_sales_ttm: number | null;
  fcf_yield_pct: number | null;
  gross_margin_pct: number | null;
  /** Quality */
  revenue_growth_yoy_pct: number | null;
  operating_margin_pct: number | null;
  /** Event / catalyst */
  days_since_earnings: number | null;
  recent_8k: boolean;
  recent_10q: boolean;
  recent_10k: boolean;
  /** Filing intensity */
  filing_count_30d: number;
  filing_count_90d: number;
  /** Insider: skew and cluster (counts for cluster-buying vs one-off) */
  insider_buy_sell_skew: number | null;
  insider_buy_count: number;
  insider_sell_count: number;
  /** Earnings surprise / revision (when available from envelope) */
  earnings_surprise_pct: number | null;
  /** Sector-relative / cross-sectional (filled when cohort available, e.g. in ranker) */
  sector_relative_momentum_3m_pct: number | null;
  /** Metadata */
  rowCount: number;
  startDate: string | null;
  endDate: string | null;
  [k: string]: unknown;
}
