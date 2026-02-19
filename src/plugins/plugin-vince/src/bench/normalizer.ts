/**
 * VinceBench normalizer: maps a FeatureRecord to decision-quality signatures.
 * Pure function: (record: FeatureRecord) => Signature[]
 */
import type { FeatureRecord } from "../services/vinceFeatureStore.service";
import type { Signature } from "./types";

const CONFIDENCE_HIGH = 75;
const SOURCE_COUNT_MULTI = 3;
const OPEN_WINDOW_BOOST_MIN = 0.01;

/**
 * Normalize a single feature record into a list of decision-quality signatures.
 * Inspects signal, execution, outcome, session, regime, and avoided fields.
 */
export function normalize(record: FeatureRecord): Signature[] {
  const sigs: Signature[] = [];

  if (record.avoided) {
    emitAvoidSignatures(record.avoided.reason, sigs);
    return sigs;
  }

  const { signal, session, regime, execution, outcome } = record;

  emitSignalQualitySignatures(signal, regime, sigs);
  emitPositionAndEntrySignatures(execution, sigs);
  emitRiskSignatures(execution, outcome, sigs);
  emitTimingSignatures(session, sigs);
  emitRegimeSignatures(regime, sigs);

  return sigs;
}

function emitAvoidSignatures(reason: string, sigs: Signature[]): void {
  const r = reason.toLowerCase();
  if (r.includes("circuit") || r.includes("pause"))
    sigs.push("avoid.circuit_breaker_blocked");
  if (r.includes("cooldown")) sigs.push("avoid.cooldown_blocked");
  if (r.includes("time filter") || r.includes("time filter blocked"))
    sigs.push("avoid.time_filter_blocked");
  if (
    r.includes("similar") ||
    r.includes("similarity") ||
    r.includes("suggest avoid")
  )
    sigs.push("avoid.similarity_avoid");
  if (r.includes("book") || r.includes("imbalance"))
    sigs.push("avoid.book_imbalance_rejected");
  if (
    r.includes("quality") ||
    r.includes("threshold") ||
    r.includes("strength") ||
    r.includes("confidence")
  )
    sigs.push("avoid.low_quality_rejected");
  if (r.includes("regime") || r.includes("mismatch"))
    sigs.push("avoid.regime_mismatch_rejected");
  if (sigs.length === 0) sigs.push("avoid.low_quality_rejected");
}

function emitSignalQualitySignatures(
  signal: FeatureRecord["signal"],
  regime: FeatureRecord["regime"],
  sigs: Signature[],
): void {
  if (signal.confidence >= CONFIDENCE_HIGH)
    sigs.push("signal.quality.high_confidence");
  if (signal.sourceCount >= SOURCE_COUNT_MULTI)
    sigs.push("signal.quality.multi_source_confirmed");
  if (signal.hasCascadeSignal) sigs.push("signal.quality.cascade_detected");
  if (signal.hasFundingExtreme)
    sigs.push("signal.quality.funding_extreme_used");
  if (signal.hasWhaleSignal) sigs.push("signal.quality.ml_filtered");
  if (signal.openWindowBoost >= OPEN_WINDOW_BOOST_MIN)
    sigs.push("entry.open_window_boost");
  const regimeAligned =
    (regime.marketRegime === "bullish" && signal.direction === "long") ||
    (regime.marketRegime === "bearish" && signal.direction === "short") ||
    regime.marketRegime === "neutral" ||
    regime.marketRegime === "volatile";
  if (regimeAligned && signal.direction !== "neutral")
    sigs.push("signal.quality.regime_aligned");
}

function emitPositionAndEntrySignatures(
  execution: FeatureRecord["execution"],
  sigs: Signature[],
): void {
  if (!execution?.executed) return;
  if (execution.streakMultiplier !== 1 && execution.streakMultiplier > 0)
    sigs.push("position.sizing.streak_adjusted");
  if (execution.positionSizePct > 0 && execution.positionSizePct <= 10)
    sigs.push("position.sizing.goal_aware");
  if (execution.usedPullbackEntry === true) sigs.push("entry.pullback_used");
  if (execution.entryAtrPct > 0) sigs.push("entry.session_optimal");
  if (execution.takeProfitPrices.length > 0) sigs.push("entry.limit_order");
}

function emitRiskSignatures(
  execution: FeatureRecord["execution"],
  outcome: FeatureRecord["outcome"],
  sigs: Signature[],
): void {
  if (!execution?.executed) return;
  if (execution.entryAtrPct > 0 && execution.stopLossDistancePct > 0)
    sigs.push("risk.sl_atr_based");
  if (execution.takeProfitPrices.length >= 2) sigs.push("risk.tp_structured");
  if (execution.leverage >= 1 && execution.leverage <= 10)
    sigs.push("risk.leverage_appropriate");
  sigs.push("risk.circuit_breaker_respected");
  sigs.push("risk.max_exposure_within_limits");
  if (outcome?.exitReason) sigs.push("risk.cooldown_respected");
}

function emitTimingSignatures(
  session: FeatureRecord["session"],
  sigs: Signature[],
): void {
  const favorable = ["europe", "us", "overlap"].includes(session.session);
  if (favorable) sigs.push("timing.session_favorable");
  if (session.isOpenWindow) sigs.push("timing.window_open");
  if (session.isWeekend) sigs.push("timing.weekend_reduced");
  if (!session.isWeekend) sigs.push("timing.cooldown_respected");
}

function emitRegimeSignatures(
  regime: FeatureRecord["regime"],
  sigs: Signature[],
): void {
  if (regime.marketRegime && regime.marketRegime !== "unknown")
    sigs.push("regime.detected");
  if (regime.volatilityRegime && regime.volatilityRegime !== "unknown")
    sigs.push("regime.volatility_adjusted");
  if (
    regime.marketRegime &&
    ["bullish", "bearish", "neutral", "volatile"].includes(regime.marketRegime)
  )
    sigs.push("regime.strategy_adapted");
}
