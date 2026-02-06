/**
 * Extended snapshot logic for paper trading (DATA_LEVERAGE).
 * Pure helpers: book-imbalance filter and confidence adjustments (SMA20, funding reversal).
 * Used by vincePaperTrading.service in evaluateAndTrade().
 */

export interface ExtendedSnapshot {
  bookImbalance: number | null;
  priceVsSma20: number | null;
  fundingDelta: number | null;
  dvol: number | null;
}

export interface SignalDirection {
  direction: "long" | "short" | "neutral";
  confidence: number;
}

/** Reject long when bookImbalance < -this; reject short when bookImbalance > this. */
export const BOOK_IMBALANCE_THRESHOLD = 0.2;
/** Min |fundingDelta| for reversal boost (e.g. 0.03%). */
export const FUNDING_DELTA_THRESHOLD = 0.0003;
/** Confidence added per SMA20 alignment or funding reversal. */
export const CONFIDENCE_BOOST = 5;
export const MAX_CONFIDENCE = 100;

/**
 * Returns whether to reject the signal due to order book imbalance.
 * - Long: reject when book favors sellers (bookImbalance < -threshold).
 * - Short: reject when book favors buyers (bookImbalance > threshold).
 * @param threshold - Optional; when provided (e.g. 0.4 in aggressive mode), use instead of BOOK_IMBALANCE_THRESHOLD for looser filter.
 */
export function getBookImbalanceRejection(
  signal: SignalDirection,
  snapshot: ExtendedSnapshot | null,
  threshold: number = BOOK_IMBALANCE_THRESHOLD,
): { reject: boolean; reason?: string } {
  if (signal.direction === "neutral") return { reject: false };
  const book = snapshot?.bookImbalance;
  if (book == null) return { reject: false };
  if (signal.direction === "long" && book < -threshold) {
    return {
      reject: true,
      reason: `Order book favors sellers (imbalance ${book.toFixed(2)})`,
    };
  }
  if (signal.direction === "short" && book > threshold) {
    return {
      reject: true,
      reason: `Order book favors buyers (imbalance ${book.toFixed(2)})`,
    };
  }
  return { reject: false };
}

/**
 * Confidence boost when price vs SMA20 aligns with direction (long + above SMA, short + below SMA).
 */
export function getSma20ConfidenceBoost(
  signal: SignalDirection,
  snapshot: ExtendedSnapshot | null,
): number {
  if (signal.direction === "neutral") return 0;
  const pct = snapshot?.priceVsSma20;
  if (pct == null) return 0;
  if (signal.direction === "long" && pct > 0) return CONFIDENCE_BOOST;
  if (signal.direction === "short" && pct < 0) return CONFIDENCE_BOOST;
  return 0;
}

/**
 * Confidence boost when funding delta is significant and current funding has opposite sign (reversal).
 */
export function getFundingReversalConfidenceBoost(
  snapshot: ExtendedSnapshot | null,
  fundingRate: number,
): number {
  const delta = snapshot?.fundingDelta;
  if (delta == null || Math.abs(delta) <= FUNDING_DELTA_THRESHOLD) return 0;
  const oppositeSigns =
    (delta > 0 && fundingRate < 0) || (delta < 0 && fundingRate > 0);
  return oppositeSigns ? CONFIDENCE_BOOST : 0;
}

/**
 * Combined confidence after SMA20 and funding reversal boosts. Capped at MAX_CONFIDENCE.
 */
export function getAdjustedConfidence(
  signal: SignalDirection,
  snapshot: ExtendedSnapshot | null,
  fundingRate: number,
): number {
  let c = signal.confidence;
  c += getSma20ConfidenceBoost(signal, snapshot);
  c += getFundingReversalConfidenceBoost(snapshot, fundingRate);
  return Math.min(MAX_CONFIDENCE, c);
}
