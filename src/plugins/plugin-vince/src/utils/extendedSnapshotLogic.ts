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
 * Confidence boost/penalty based on volume ratio vs 7-day average.
 * High volume confirms momentum; low volume suggests fakeouts.
 * - Spike (>= 2.0x): +5 confidence (moves stick)
 * - Elevated (>= 1.5x): +3 confidence
 * - Low (< 0.5x): -5 confidence (dead session, fakeouts likely)
 * - Low (< 0.8x): -3 confidence
 */
export function getVolumeConfidenceAdjustment(volumeRatio: number): number {
  if (volumeRatio >= 2.0) return CONFIDENCE_BOOST; // +5
  if (volumeRatio >= 1.5) return 3;
  if (volumeRatio < 0.5) return -CONFIDENCE_BOOST; // -5
  if (volumeRatio < 0.8) return -3;
  return 0;
}

/**
 * OI change as momentum confirmation.
 * Rising OI + price moving with direction = new money confirming. Declining OI = unwinding.
 */
export function getOIChangeConfidenceAdjustment(
  direction: "long" | "short" | "neutral",
  oiChange24h: number | null,
  priceChange24h: number,
): number {
  if (direction === "neutral" || oiChange24h == null) return 0;
  // Rising OI + aligned price move = confirmation
  if (oiChange24h > 3 && direction === "long" && priceChange24h > 0)
    return CONFIDENCE_BOOST;
  if (oiChange24h > 3 && direction === "short" && priceChange24h < 0)
    return CONFIDENCE_BOOST;
  // Declining OI = positions unwinding, moves less likely to stick
  if (oiChange24h < -5) return -CONFIDENCE_BOOST;
  return 0;
}

/**
 * Price vs daily open for intraday bias.
 * Trading with the intraday trend (above/below daily open) is higher conviction.
 */
export function getDailyOpenConfidenceAdjustment(
  direction: "long" | "short" | "neutral",
  currentPrice: number,
  dailyOpenPrice: number | null,
): number {
  if (direction === "neutral" || dailyOpenPrice == null || dailyOpenPrice <= 0)
    return 0;
  const aboveOpen = currentPrice > dailyOpenPrice;
  if (direction === "long" && aboveOpen) return 3;
  if (direction === "short" && !aboveOpen) return 3;
  if (direction === "long" && !aboveOpen) return -3;
  if (direction === "short" && aboveOpen) return -3;
  return 0;
}

/**
 * RSI overbought/oversold adjustment.
 * Going long when overbought or short when oversold = exhaustion risk (penalty).
 * Going short when overbought or long when oversold = mean-reversion (boost).
 */
export function getRSIConfidenceAdjustment(
  direction: "long" | "short" | "neutral",
  rsi: number | null,
): number {
  if (direction === "neutral" || rsi == null) return 0;
  if (rsi > 75 && direction === "long") return -CONFIDENCE_BOOST; // overbought + long = exhaustion risk
  if (rsi < 25 && direction === "short") return -CONFIDENCE_BOOST; // oversold + short = exhaustion risk
  if (rsi > 75 && direction === "short") return 3; // overbought + short = mean-reversion
  if (rsi < 25 && direction === "long") return 3; // oversold + long = mean-reversion
  return 0;
}

/**
 * Additional market context for confidence adjustments.
 * Passed alongside ExtendedSnapshot to getAdjustedConfidence.
 */
export interface MarketContext {
  volumeRatio?: number;
  oiChange24h?: number;
  priceChange24h?: number;
  currentPrice?: number;
  dailyOpenPrice?: number;
  rsi?: number;
  fearGreedValue?: number;
}

/**
 * Combined confidence after all adjustments. Capped at 0-100.
 * Adjustments: SMA20, funding reversal, volume, OI change, daily open, RSI.
 */
export function getAdjustedConfidence(
  signal: SignalDirection,
  snapshot: ExtendedSnapshot | null,
  fundingRate: number,
  volumeRatio?: number,
  marketCtx?: MarketContext,
): number {
  let c = signal.confidence;
  c += getSma20ConfidenceBoost(signal, snapshot);
  c += getFundingReversalConfidenceBoost(snapshot, fundingRate);
  if (volumeRatio != null && volumeRatio > 0) {
    c += getVolumeConfidenceAdjustment(volumeRatio);
  }
  if (marketCtx) {
    c += getOIChangeConfidenceAdjustment(
      signal.direction,
      marketCtx.oiChange24h ?? null,
      marketCtx.priceChange24h ?? 0,
    );
    c += getDailyOpenConfidenceAdjustment(
      signal.direction,
      marketCtx.currentPrice ?? 0,
      marketCtx.dailyOpenPrice ?? null,
    );
    c += getRSIConfidenceAdjustment(signal.direction, marketCtx.rsi ?? null);
  }
  return Math.min(MAX_CONFIDENCE, Math.max(0, c));
}
