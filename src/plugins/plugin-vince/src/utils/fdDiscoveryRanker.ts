/**
 * FD discovery ranker: sector-aware, catalyst-aware, diversification-aware gem scoring.
 * Subscores: sleeve-fit, momentum/trend, catalyst/event, valuation/quality, diversification, regime-aware.
 */

import type { FdTickerSnapshot } from "./fdFactorBuilder.types";
import type { FdReplayRow } from "./fdReplayImporter";

export type DiscoveryBucket = "PromoteNow" | "ResearchNext" | "Avoid";

export interface FdDiscoveryCandidate {
  ticker: string;
  sleeve: string;
  targetWeightPct: number;
  bucket: DiscoveryBucket;
  score: number;
  reason: string;
  snapshotAt: string | null;
}

export interface GemSubscores {
  sleeveFit: number;
  momentumTrend: number;
  catalystEvent: number;
  valuationQuality: number;
  diversification: number;
  regime: number;
  reasonParts: string[];
}

/**
 * Cross-sectional stats for z-scores when we have a cohort of snapshots.
 */
function cohortMomentumStats(snapshots: (FdTickerSnapshot | null)[]): {
  mean: number;
  sd: number;
  n: number;
} {
  const values = snapshots
    .filter(
      (s): s is FdTickerSnapshot =>
        s != null &&
        typeof (s as FdTickerSnapshot).momentum_3m_pct === "number",
    )
    .map((s) => (s as FdTickerSnapshot).momentum_3m_pct as number);
  if (values.length === 0) return { mean: 0, sd: 1, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(variance) || 1;
  return { mean, sd, n: values.length };
}

/**
 * Compute structured subscores and combined gem score (0–1) for one snapshot.
 * Optional cohortMom3: { mean, sd } for z-score; sleeveTickers: set of current sleeve tickers for fit/diversification.
 */
export function scoreTickerForDiscovery(
  snapshot: FdTickerSnapshot | null,
  options?: {
    cohortMom3?: { mean: number; sd: number };
    sleeveTickers?: Set<string>;
    inSleeve?: boolean;
  },
): { score: number; reason: string; subscores?: GemSubscores } {
  const reasonParts: string[] = [];
  const sleeveTickers = options?.sleeveTickers ?? new Set<string>();
  const inSleeve =
    options?.inSleeve ??
    (snapshot != null ? sleeveTickers.has(snapshot.ticker) : false);

  // Sleeve-fit: already in sleeve = higher fit for re-rank; net-new = neutral
  const sleeveFit = inSleeve ? 0.9 : 0.5;
  if (inSleeve) reasonParts.push("in sleeve");

  if (!snapshot) {
    const score = 0.3;
    return {
      score,
      reason: "no snapshot",
      subscores: {
        sleeveFit,
        momentumTrend: 0.3,
        catalystEvent: 0.3,
        valuationQuality: 0.3,
        diversification: 0.5,
        regime: 0.5,
        reasonParts: ["no snapshot"],
      },
    };
  }

  const mom1 = snapshot.momentum_1m_pct ?? 0;
  const mom3 = snapshot.momentum_3m_pct ?? 0;
  const mom12 = snapshot.momentum_12m_pct ?? 0;
  const vol = snapshot.vol_realized_20d ?? 25;
  const skew = snapshot.insider_buy_sell_skew ?? 0;
  const dollarVol = snapshot.dollar_volume_avg ?? 0;
  const margin = snapshot.operating_margin_pct ?? null;
  const growth = snapshot.revenue_growth_yoy_pct ?? null;
  const evSales = snapshot.ev_sales_ttm ?? null;
  const fcfYield = snapshot.fcf_yield_pct ?? null;
  const filing30 = snapshot.filing_count_30d ?? 0;
  const filing90 = snapshot.filing_count_90d ?? 0;
  const insiderBuy = snapshot.insider_buy_count ?? 0;
  const insiderSell = snapshot.insider_sell_count ?? 0;
  const surprise = snapshot.earnings_surprise_pct ?? null;
  const sectorRelMom = snapshot.sector_relative_momentum_3m_pct ?? null;

  // Momentum/trend subscore (0–1): absolute and optional sector-relative
  let momentumTrend = 0.5;
  if (mom3 > 10) {
    momentumTrend += 0.15;
    reasonParts.push(`3m +${mom3.toFixed(0)}%`);
  } else if (mom3 > 5) {
    momentumTrend += 0.08;
    reasonParts.push(`3m +${mom3.toFixed(0)}%`);
  }
  if (mom12 > 15) {
    momentumTrend += 0.1;
    reasonParts.push(`12m +${mom12.toFixed(0)}%`);
  } else if (mom12 > 10) {
    momentumTrend += 0.05;
  }
  if (sectorRelMom != null && sectorRelMom > 0) {
    momentumTrend += 0.05;
    reasonParts.push("sector-relative strength");
  }
  momentumTrend = Math.max(0, Math.min(1, momentumTrend));

  // Catalyst/event subscore: filings, earnings recency, insider cluster
  let catalystEvent = 0.5;
  if (snapshot.recent_8k) {
    catalystEvent += 0.1;
    reasonParts.push("recent 8-K");
  }
  if (filing90 >= 2) {
    catalystEvent += 0.05;
    reasonParts.push("filing activity");
  }
  if (insiderBuy >= 2 && skew > 0.2) {
    catalystEvent += 0.1;
    reasonParts.push("insider cluster buy");
  }
  if (insiderSell >= 2 && skew < -0.2) {
    catalystEvent -= 0.1;
    reasonParts.push("insider cluster sell");
  }
  if (surprise != null && surprise > 5) {
    catalystEvent += 0.05;
    reasonParts.push("earnings beat");
  }
  catalystEvent = Math.max(0, Math.min(1, catalystEvent));

  // Valuation/quality subscore
  let valuationQuality = 0.5;
  if (margin != null && margin > 15) {
    valuationQuality += 0.1;
    reasonParts.push("margin");
  }
  if (growth != null && growth > 10) {
    valuationQuality += 0.08;
    reasonParts.push("revenue growth");
  }
  if (fcfYield != null && fcfYield > 5) {
    valuationQuality += 0.05;
    reasonParts.push("FCF yield");
  }
  if (evSales != null && evSales > 0 && evSales < 5) {
    valuationQuality += 0.05;
  }
  if (dollarVol >= 1e6) {
    valuationQuality += 0.05;
    reasonParts.push("liquid");
  }
  valuationQuality = Math.max(0, Math.min(1, valuationQuality));

  // Diversification: net-new names add more diversification than sleeve re-ranks
  const diversification = inSleeve ? 0.5 : 0.7;
  if (!inSleeve && (momentumTrend > 0.55 || catalystEvent > 0.55)) {
    reasonParts.push("diversification");
  }

  // Regime-aware: vol penalty for very high vol; moderate vol ok
  let regime = 0.5;
  if (vol > 0 && vol < 50) {
    regime += 0.05;
    if (vol < 40) reasonParts.push("moderate vol");
  } else if (vol > 60) {
    regime -= 0.1;
    reasonParts.push("high vol");
  }
  if (skew > 0.2) {
    regime += 0.05;
  }
  if (skew < -0.3) {
    regime -= 0.1;
  }
  regime = Math.max(0, Math.min(1, regime));

  // Combined score: weighted average of subscores
  const w = {
    sleeveFit: 0.15,
    momentumTrend: 0.25,
    catalystEvent: 0.2,
    valuationQuality: 0.2,
    diversification: 0.1,
    regime: 0.1,
  };
  const score =
    w.sleeveFit * sleeveFit +
    w.momentumTrend * momentumTrend +
    w.catalystEvent * catalystEvent +
    w.valuationQuality * valuationQuality +
    w.diversification * diversification +
    w.regime * regime;
  const clamped = Math.max(0, Math.min(1, score));
  const reason = reasonParts.length ? reasonParts.join(", ") : "baseline";

  return {
    score: clamped,
    reason,
    subscores: {
      sleeveFit,
      momentumTrend,
      catalystEvent,
      valuationQuality,
      diversification,
      regime,
      reasonParts,
    },
  };
}

/**
 * Bucket a score into PromoteNow / ResearchNext / Avoid.
 */
export function bucketFromScore(score: number): DiscoveryBucket {
  if (score >= 0.6) return "PromoteNow";
  if (score >= 0.35) return "ResearchNext";
  return "Avoid";
}

/**
 * Rank replay rows into three buckets. Uses cross-sectional momentum when multiple snapshots exist.
 * Optional sleeveTickers: set of current sleeve tickers for sleeve-fit and diversification.
 */
export function rankDiscoveryCandidates(
  rows: FdReplayRow[],
  options?: { sleeveTickers?: Set<string> },
): FdDiscoveryCandidate[] {
  const sleeveTickers = options?.sleeveTickers ?? new Set<string>();
  const snapshots = rows.map((r) => r.snapshot);
  const cohort = cohortMomentumStats(snapshots);
  const cohortMom3 =
    cohort.n >= 2 ? { mean: cohort.mean, sd: cohort.sd } : undefined;

  const out: FdDiscoveryCandidate[] = [];
  for (const row of rows) {
    const snapshot = row.snapshot;
    const inSleeve = sleeveTickers.has(row.ticker);
    const { score, reason } = scoreTickerForDiscovery(snapshot ?? null, {
      cohortMom3,
      sleeveTickers,
      inSleeve,
    });
    out.push({
      ticker: row.ticker,
      sleeve: row.sleeve,
      targetWeightPct: row.targetWeightPct,
      bucket: bucketFromScore(score),
      score,
      reason,
      snapshotAt: row.snapshotAt ?? null,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}
