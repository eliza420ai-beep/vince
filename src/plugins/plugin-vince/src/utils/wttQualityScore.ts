import type { WttPick, WttRubric } from "./wttContract";

export type WttQualityBand = "auto_eligible" | "size_capped" | "blocked";

export type WttQualityReasonCode =
  | "WTT_Q_THESIS_TOO_THIN"
  | "WTT_Q_ENTRY_PRICE_MISSING"
  | "WTT_Q_RISK_USD_MISSING"
  | "WTT_Q_INVALIDATE_MISSING"
  | "WTT_Q_INVALIDATE_NOT_SPECIFIC"
  | "WTT_Q_INVALIDATE_NO_LEVEL"
  | "WTT_Q_INVALIDATE_NO_ASSET"
  | "WTT_Q_ALIGNMENT_WEAK"
  | "WTT_Q_EDGE_CROWDED"
  | "WTT_Q_PAYOFF_WEAK"
  | "WTT_Q_EV_THRESHOLD_MISSING"
  | "WTT_Q_KILL_CONDITIONS_MISSING"
  | "WTT_Q_ALT_MISSING"
  | "WTT_Q_ALT_SAME_AS_PRIMARY"
  | "WTT_Q_ALT_NO_DIRECTION";

export interface WttQualityReason {
  code: WttQualityReasonCode;
  message: string;
}

export interface WttQualityBreakdown {
  completeness: number; // 0-25
  invalidationClarity: number; // 0-25
  rubricConsistency: number; // 0-20
  riskDefinition: number; // 0-20
  altUsefulness: number; // 0-10
}

export interface WttQualityScoreResult {
  score: number; // 0-100
  band: WttQualityBand;
  breakdown: WttQualityBreakdown;
  reasons: WttQualityReason[];
}

export const WTT_AUTO_ELIGIBLE_MIN_SCORE = 80;
export const WTT_SIZE_CAPPED_MIN_SCORE = 65;
export const WTT_SIZE_CAPPED_MULTIPLIER = 0.5;

const ALIGNMENT_ORD: Record<WttRubric["alignment"], number> = {
  tangential: 1,
  partial: 2,
  exposed: 3,
  pure_play: 4,
  direct: 5,
};

const EDGE_ORD: Record<WttRubric["edge"], number> = {
  crowded: 1,
  consensus: 2,
  emerging: 3,
  undiscovered: 4,
};

const PAYOFF_ORD: Record<WttRubric["payoffShape"], number> = {
  capped: 1,
  linear: 2,
  moderate: 3,
  high: 4,
  max_asymmetry: 5,
};

function pushReason(
  reasons: WttQualityReason[],
  code: WttQualityReasonCode,
  message: string,
): void {
  reasons.push({ code, message });
}

function getBand(score: number): WttQualityBand {
  if (score >= WTT_AUTO_ELIGIBLE_MIN_SCORE) return "auto_eligible";
  if (score >= WTT_SIZE_CAPPED_MIN_SCORE) return "size_capped";
  return "blocked";
}

export function getWttSizeMultiplierForBand(band: WttQualityBand): number {
  if (band === "size_capped") return WTT_SIZE_CAPPED_MULTIPLIER;
  return 1;
}

export function scoreWttPickQuality(pick: WttPick): WttQualityScoreResult {
  const reasons: WttQualityReason[] = [];

  // 1) completeness (25)
  let completeness = 0;
  if (pick.thesis.trim().length >= 20) {
    completeness += 5;
  } else {
    pushReason(
      reasons,
      "WTT_Q_THESIS_TOO_THIN",
      "Thesis is too short to be reliably actionable.",
    );
  }
  completeness += 5; // ticker/direction/instrument are already contract-validated
  if (pick.primaryEntryPrice > 0) {
    completeness += 5;
  } else {
    pushReason(
      reasons,
      "WTT_Q_ENTRY_PRICE_MISSING",
      "Primary entry price is missing or zero.",
    );
  }
  if (pick.primaryRiskUsd > 0) {
    completeness += 5;
  } else {
    pushReason(
      reasons,
      "WTT_Q_RISK_USD_MISSING",
      "Primary risk USD is missing or zero.",
    );
  }
  if (
    pick.invalidateCondition.trim().length > 0 &&
    pick.invalidateCondition.trim().toLowerCase() !== "n/a"
  ) {
    completeness += 5;
  } else {
    pushReason(
      reasons,
      "WTT_Q_INVALIDATE_MISSING",
      "Invalidation condition is missing or placeholder.",
    );
  }

  // 2) invalidation clarity (25)
  let invalidationClarity = 0;
  const invalidation = pick.invalidateCondition.trim();
  const invalidationLc = invalidation.toLowerCase();
  const hasComparator = /(<|>|below|above|under|over|cross|break)/i.test(
    invalidation,
  );
  const hasNumericLevel = /\d/.test(invalidation);
  const hasAssetMention =
    invalidation.toUpperCase().includes(pick.primaryTicker.toUpperCase()) ||
    (pick.altTicker
      ? invalidation.toUpperCase().includes(pick.altTicker.toUpperCase())
      : false);

  if (hasComparator) {
    invalidationClarity += 10;
  } else if (invalidationLc.length > 0 && invalidationLc !== "n/a") {
    pushReason(
      reasons,
      "WTT_Q_INVALIDATE_NOT_SPECIFIC",
      "Invalidation should include a clear trigger operator (below/above/< />).",
    );
  }
  if (hasNumericLevel) {
    invalidationClarity += 10;
  } else if (invalidationLc.length > 0 && invalidationLc !== "n/a") {
    pushReason(
      reasons,
      "WTT_Q_INVALIDATE_NO_LEVEL",
      "Invalidation should include a numeric level when possible.",
    );
  }
  if (hasAssetMention) {
    invalidationClarity += 5;
  } else if (invalidationLc.length > 0 && invalidationLc !== "n/a") {
    pushReason(
      reasons,
      "WTT_Q_INVALIDATE_NO_ASSET",
      "Invalidation should name the affected asset/ticker.",
    );
  }

  // 3) rubric consistency (20)
  let rubricConsistency = 0;
  const alignment = ALIGNMENT_ORD[pick.rubric.alignment];
  const edge = EDGE_ORD[pick.rubric.edge];
  const payoff = PAYOFF_ORD[pick.rubric.payoffShape];

  if (alignment >= 3) {
    rubricConsistency += 8;
  } else {
    pushReason(
      reasons,
      "WTT_Q_ALIGNMENT_WEAK",
      "Rubric alignment is weak (partial/tangential).",
    );
  }
  if (edge >= 2) {
    rubricConsistency += 6;
  } else {
    pushReason(
      reasons,
      "WTT_Q_EDGE_CROWDED",
      "Rubric edge is crowded; asymmetry may be degraded.",
    );
  }
  if (payoff >= 3) {
    rubricConsistency += 6;
  } else {
    pushReason(
      reasons,
      "WTT_Q_PAYOFF_WEAK",
      "Payoff shape is linear/capped; asymmetry is limited.",
    );
  }

  // 4) risk definition (20)
  let riskDefinition = 0;
  if (pick.primaryRiskUsd > 0) {
    riskDefinition += 8;
  }
  if (pick.killConditions.length > 0) {
    riskDefinition += 6;
  } else {
    pushReason(
      reasons,
      "WTT_Q_KILL_CONDITIONS_MISSING",
      "Kill conditions are missing.",
    );
  }
  if (
    pick.evThresholdPct != null &&
    Number.isFinite(pick.evThresholdPct) &&
    pick.evThresholdPct > 0
  ) {
    riskDefinition += 6;
  } else {
    pushReason(
      reasons,
      "WTT_Q_EV_THRESHOLD_MISSING",
      "EV threshold percent is missing.",
    );
  }

  // 5) alt usefulness (10)
  let altUsefulness = 0;
  if (!pick.altTicker) {
    pushReason(
      reasons,
      "WTT_Q_ALT_MISSING",
      "Alternative expression is missing.",
    );
  } else if (
    pick.altTicker.toUpperCase() === pick.primaryTicker.toUpperCase()
  ) {
    pushReason(
      reasons,
      "WTT_Q_ALT_SAME_AS_PRIMARY",
      "Alternative ticker should differ from primary ticker.",
    );
  } else {
    altUsefulness += 5;
  }
  if (!pick.altDirection) {
    pushReason(
      reasons,
      "WTT_Q_ALT_NO_DIRECTION",
      "Alternative expression should include explicit direction.",
    );
  } else if (
    pick.altDirection !== pick.primaryDirection &&
    pick.altTicker &&
    pick.altTicker.toUpperCase() !== pick.primaryTicker.toUpperCase()
  ) {
    altUsefulness += 5;
  } else {
    altUsefulness += 2;
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      completeness +
        invalidationClarity +
        rubricConsistency +
        riskDefinition +
        altUsefulness,
    ),
  );
  return {
    score,
    band: getBand(score),
    breakdown: {
      completeness,
      invalidationClarity,
      rubricConsistency,
      riskDefinition,
      altUsefulness,
    },
    reasons,
  };
}
