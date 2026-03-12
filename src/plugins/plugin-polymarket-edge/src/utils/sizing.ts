/**
 * Kelly-based suggested size for edge signals.
 * Quarter-Kelly by default; capped by maxPositionPct and min/max USD.
 */

const DEFAULT_BANKROLL_USD = 10_000;
const DEFAULT_KELLY_FRACTION = 0.25;
const DEFAULT_MAX_POSITION_PCT = 0.1;
const DEFAULT_MIN_SIZE_USD = 5;
const DEFAULT_MAX_SIZE_USD = 500;

export interface ComputeSuggestedSizeOptions {
  edgeFraction: number;
  marketPrice: number;
  confidence?: number;
  bankrollUsd?: number;
  kellyFraction?: number;
  maxPositionPct?: number;
  minSizeUsd?: number;
  maxSizeUsd?: number;
}

/**
 * Compute suggested position size in USD from edge and confidence.
 * Uses quarter-Kelly: f = edge * confidence * kellyFraction, capped by maxPositionPct.
 */
export function computeSuggestedSizeUsd(
  options: ComputeSuggestedSizeOptions,
): number {
  const {
    edgeFraction,
    marketPrice,
    confidence = 0.5,
    bankrollUsd = DEFAULT_BANKROLL_USD,
    kellyFraction = DEFAULT_KELLY_FRACTION,
    maxPositionPct = DEFAULT_MAX_POSITION_PCT,
    minSizeUsd = DEFAULT_MIN_SIZE_USD,
    maxSizeUsd = DEFAULT_MAX_SIZE_USD,
  } = options;

  if (edgeFraction <= 0 || marketPrice <= 0) return minSizeUsd;

  const kellyPct = (edgeFraction / marketPrice) * confidence * kellyFraction;
  const cappedPct = Math.min(kellyPct, maxPositionPct);
  let sizeUsd = bankrollUsd * cappedPct;
  sizeUsd = Math.max(minSizeUsd, Math.min(maxSizeUsd, sizeUsd));
  return Math.round(sizeUsd * 100) / 100;
}
