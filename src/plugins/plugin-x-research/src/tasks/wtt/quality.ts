import type { WttPick } from "../../../../../shared/wttContract";

export interface ThesisQualityResult {
  ok: boolean;
  reasons: string[];
}

const THESIS_ASYMMETRY_PATTERN =
  /\b(vs|versus|outperform|underperform|mispric|relative|discount|premium|spread|rotation|fade)\b/i;
const THESIS_GENERIC_PATTERN =
  /\b(markets?\s+(are|is)\s+(bullish|bearish)|crypto\s+is\s+(bullish|bearish)|risk[-\s]?on|risk[-\s]?off)\b/i;

export function evaluateThesisQuality(
  thesis: string,
  allowedTickers: readonly string[],
): ThesisQualityResult {
  const reasons: string[] = [];
  const trimmed = thesis.trim();
  if (trimmed.length < 24) reasons.push("too_short");
  if (trimmed.length > 240) reasons.push("too_long");

  const hasTicker = allowedTickers.some(
    (t) =>
      new RegExp(`\\b${t}\\b`, "i").test(trimmed) ||
      new RegExp(`\\$${t}\\b`, "i").test(trimmed),
  );
  if (!hasTicker) reasons.push("missing_ticker");
  if (!THESIS_ASYMMETRY_PATTERN.test(trimmed))
    reasons.push("missing_asymmetry");
  if (THESIS_GENERIC_PATTERN.test(trimmed)) reasons.push("too_generic");
  return { ok: reasons.length === 0, reasons };
}

export function computeWttPickConfidence(
  pick: WttPick,
  repeatCount = 0,
  rotationNudgeThreshold = 3,
): number {
  let score = 50;

  if (pick.rubric.edge === "undiscovered") score += 10;
  else if (pick.rubric.edge === "emerging") score += 7;
  else if (pick.rubric.edge === "consensus") score += 2;
  else score -= 4;

  if (pick.rubric.payoffShape === "max_asymmetry") score += 8;
  else if (pick.rubric.payoffShape === "high") score += 5;
  else if (pick.rubric.payoffShape === "linear") score -= 2;
  else if (pick.rubric.payoffShape === "capped") score -= 3;

  if (
    pick.rubric.alignment === "direct" ||
    pick.rubric.alignment === "pure_play"
  )
    score += 4;
  if (pick.rubric.timingForgiveness === "very_forgiving") score += 3;
  if (pick.rubric.timingForgiveness === "very_punishing") score -= 3;

  if (pick.invalidateCondition?.trim()) score += 3;
  if ((pick.killConditions?.length ?? 0) > 0) score += 2;
  if (typeof pick.evThresholdPct === "number") {
    if (pick.evThresholdPct >= 20) score += 4;
    else if (pick.evThresholdPct >= 10) score += 2;
  }

  if (repeatCount >= rotationNudgeThreshold) {
    score -= Math.min(12, repeatCount * 3);
  }

  return Math.max(35, Math.min(85, Math.round(score)));
}
