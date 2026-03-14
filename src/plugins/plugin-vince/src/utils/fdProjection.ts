/**
 * FD forward projection: heuristic scores from factor snapshots for prediction tracking.
 * Use explicit scored heuristics; later can add a dedicated model.
 */

import type { FdTickerSnapshot } from "./fdFactorBuilder.types";

export type FdProjectionDirection = "up" | "down";

export interface FdProjectionScore {
  ticker: string;
  direction: FdProjectionDirection;
  confidenceProb: number;
  horizonHours: number;
  reason: string;
  /** 1m return regime: bullish / bearish / neutral */
  regime1m: "bullish" | "bearish" | "neutral";
  /** Optional: expected move band (e.g. ±5% around earnings) */
  expectedMovePct?: number;
}

/**
 * Score a snapshot into a simple 1m forward projection (momentum + vol + event).
 * No live API calls; used for prediction tracking and reporting.
 */
export function scoreFdProjection(
  snapshot: FdTickerSnapshot,
): FdProjectionScore {
  const ticker = snapshot.ticker;
  const mom3 = snapshot.momentum_3m_pct ?? 0;
  const mom1 = snapshot.momentum_1m_pct ?? 0;
  const vol = snapshot.vol_realized_20d ?? 20;
  const skew = snapshot.insider_buy_sell_skew ?? 0;
  const daysSinceEarnings = snapshot.days_since_earnings ?? 999;

  let direction: FdProjectionDirection = "up";
  let confidenceProb = 0.5;
  let regime1m: "bullish" | "bearish" | "neutral" = "neutral";
  const reasons: string[] = [];

  if (mom3 > 5) {
    direction = "up";
    confidenceProb = 0.5 + Math.min(0.2, mom3 / 500);
    regime1m = "bullish";
    reasons.push(`3m momentum +${mom3.toFixed(1)}%`);
  } else if (mom3 < -5) {
    direction = "down";
    confidenceProb = 0.5 + Math.min(0.2, -mom3 / 500);
    regime1m = "bearish";
    reasons.push(`3m momentum ${mom3.toFixed(1)}%`);
  }

  if (skew > 0.2) {
    confidenceProb = Math.min(0.85, confidenceProb + 0.05);
    reasons.push("insider buy skew");
  } else if (skew < -0.2) {
    confidenceProb = Math.max(0.15, confidenceProb - 0.05);
    reasons.push("insider sell skew");
  }

  if (daysSinceEarnings < 30 && snapshot.recent_8k) {
    reasons.push("near earnings");
  }
  if (vol > 40) {
    confidenceProb = confidenceProb * 0.9;
    reasons.push("elevated vol");
  }

  const horizonHours = 24 * 22; // ~22 trading days
  const reason = reasons.length ? reasons.join("; ") : "momentum/vol heuristic";

  return {
    ticker,
    direction,
    confidenceProb: Math.max(0.1, Math.min(0.9, confidenceProb)),
    horizonHours,
    reason,
    regime1m,
    expectedMovePct: vol > 0 ? Math.min(30, vol * 0.5) : undefined,
  };
}
