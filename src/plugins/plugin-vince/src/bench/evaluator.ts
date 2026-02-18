/**
 * VinceBench evaluator: Base + Bonus - Penalty scoring.
 * Adapted from HyperliquidBench scoring formula.
 */
import type {
  DecisionEvaluation,
  OutcomeCorrelation,
  Signature,
  VinceBenchConfig,
  VinceBenchReport,
} from "./types";
import { v4 as uuidv4 } from "uuid";

/** Check if a signature matches a domain allow pattern (e.g. "signal.quality.*"). */
function signatureMatchesPattern(sig: Signature, pattern: string): boolean {
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return sig === prefix || sig.startsWith(prefix + ".");
  }
  const sigParts = sig.split(".");
  const patternParts = pattern.split(".");
  if (sigParts.length !== patternParts.length) return false;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === "*") continue;
    if (patternParts[i] !== sigParts[i]) return false;
  }
  return true;
}

/** Check if signature matches any allow pattern for a domain. */
function signatureInDomain(sig: Signature, allow: string[]): boolean {
  return allow.some((p) => signatureMatchesPattern(sig, p));
}

/** Compute Base score: sum over domains of (weight * unique signatures in domain). */
function computeBase(
  perDecision: DecisionEvaluation[],
  config: VinceBenchConfig,
): { base: number; domainBreakdown: VinceBenchReport["domainBreakdown"] } {
  const domainBreakdown: VinceBenchReport["domainBreakdown"] = {};
  let base = 0;

  for (const [domainName, domain] of Object.entries(config.domains)) {
    const uniqueSigs = new Set<Signature>();
    for (const d of perDecision) {
      for (const sig of d.signatures) {
        if (signatureInDomain(sig, domain.allow)) uniqueSigs.add(sig);
      }
    }
    const contribution = domain.weight * uniqueSigs.size;
    base += contribution;
    domainBreakdown[domainName] = {
      weight: domain.weight,
      uniqueSignatures: uniqueSigs.size,
      contribution,
    };
  }

  return { base, domainBreakdown };
}

/** Compute Bonus: 0.25 * (distinct - 1) per window with 2+ distinct signatures. */
function computeBonus(
  perDecision: DecisionEvaluation[],
  windowMs: number,
): number {
  const byWindow = new Map<number, Set<Signature>>();
  for (const d of perDecision) {
    const key = d.windowKeyMs ?? Math.floor(d.timestamp / windowMs);
    let set = byWindow.get(key);
    if (!set) {
      set = new Set();
      byWindow.set(key, set);
    }
    for (const sig of d.signatures) set.add(sig);
  }
  let bonus = 0;
  for (const set of byWindow.values()) {
    if (set.size >= 2) bonus += 0.25 * (set.size - 1);
  }
  return bonus;
}

/** Compute Penalty: 0.1 per occurrence of a signature beyond cap. */
function computePenalty(
  signatureCounts: Record<string, number>,
  cap: number,
): number {
  let penalty = 0;
  for (const count of Object.values(signatureCounts)) {
    if (count > cap) penalty += 0.1 * (count - cap);
  }
  return penalty;
}

/** Collect all signatures and count occurrences. */
function countSignatures(perDecision: DecisionEvaluation[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of perDecision) {
    for (const sig of d.signatures) {
      counts[sig] = (counts[sig] ?? 0) + 1;
    }
  }
  return counts;
}

/** Find signatures that don't match any domain. */
function findUnmapped(
  signatureCounts: Record<string, number>,
  config: VinceBenchConfig,
): string[] {
  const allPatterns: string[] = [];
  for (const domain of Object.values(config.domains)) {
    allPatterns.push(...domain.allow);
  }
  return Object.keys(signatureCounts).filter(
    (sig) => !allPatterns.some((p) => signatureMatchesPattern(sig, p)),
  );
}

/**
 * Base contribution for a single decision (one signature list).
 * Used to persist per-record bench score for ML training.
 */
export function scoreSingleDecision(
  signatures: Signature[],
  config: VinceBenchConfig,
): number {
  let score = 0;
  for (const [_, domain] of Object.entries(config.domains)) {
    const uniqueInDecision = new Set<Signature>();
    for (const sig of signatures) {
      if (signatureInDomain(sig, domain.allow)) uniqueInDecision.add(sig);
    }
    score += domain.weight * uniqueInDecision.size;
  }
  return score;
}

/** Compute per-decision score (contribution from each domain for that decision's signatures). */
function perDecisionScores(
  perDecision: DecisionEvaluation[],
  config: VinceBenchConfig,
): void {
  for (const d of perDecision) {
    d.decisionScore = scoreSingleDecision(d.signatures, config);
    d.windowKeyMs = Math.floor(d.timestamp / config.per_decision_window_ms);
  }
}

/** Pearson correlation between two arrays. */
function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((a, b) => a + b * b, 0);
  const sumY2 = y.slice(0, n).reduce((a, b) => a + b * b, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

/** Outcome correlation: high vs low score win rate, and Pearson r(score, P&L). */
function computeOutcomeCorrelation(
  perDecision: DecisionEvaluation[],
): OutcomeCorrelation | undefined {
  const withOutcome = perDecision.filter((d) => d.outcome != null);
  if (withOutcome.length < 5) return undefined;
  const scores = withOutcome.map((d) => d.decisionScore ?? 0);
  const pnls = withOutcome.map((d) => d.outcome!.realizedPnlPct);
  const wins = withOutcome.map((d) => (d.outcome!.profitable ? 1 : 0));
  const median = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)] ?? 0;
  const highIdx = scores.map((s, i) => (s >= median ? i : -1)).filter((i) => i >= 0);
  const lowIdx = scores.map((s, i) => (s < median ? i : -1)).filter((i) => i >= 0);
  const highWins = highIdx.length ? highIdx.reduce((a, i) => a + wins[i], 0) / highIdx.length : 0;
  const lowWins = lowIdx.length ? lowIdx.reduce((a, i) => a + wins[i], 0) / lowIdx.length : 0;
  const correlation = pearson(scores, pnls);
  return {
    highScoreWinRate: highWins,
    lowScoreWinRate: lowWins,
    correlation,
  };
}

/**
 * Run the full evaluator on a list of decision evaluations and config.
 * Produces VinceBenchReport with base, bonus, penalty, final score, and optional outcome correlation.
 */
export function evaluate(
  perDecision: DecisionEvaluation[],
  config: VinceBenchConfig,
  runId?: string,
): VinceBenchReport {
  const windowMs = config.per_decision_window_ms;
  perDecisionScores(perDecision, config);

  const signatureCounts = countSignatures(perDecision);
  const { base, domainBreakdown } = computeBase(perDecision, config);
  const bonus = computeBonus(perDecision, windowMs);
  const penalty = computePenalty(signatureCounts, config.per_signature_cap);
  const unmappedSignatures = findUnmapped(signatureCounts, config);
  const outcomeCorrelation = computeOutcomeCorrelation(perDecision);

  return {
    version: config.version,
    runId: runId ?? uuidv4(),
    timestamp: Date.now(),
    scenarioCount: perDecision.length,
    scoring: {
      base,
      bonus,
      penalty,
      finalScore: base + bonus - penalty,
    },
    domainBreakdown,
    perDecision,
    signatureCounts,
    unmappedSignatures,
    outcomeCorrelation,
  };
}
