/**
 * Hard promotion validator — single source of truth for all promotion gates.
 * Evaluates every gate and returns structured failures (not only the first).
 * Used in replay scoring and immediately before commitWinner() as final guard.
 */

import type { ForgePolicyThresholds } from "../types/index.ts";

const MIN_COMPOSITE_DELTA = 0.005; // +0.5%
const MIN_WIN_RATE = 0.45;
const HARD_MAX_LEVERAGE = 40;
const HARD_MAX_SINGLE_TRADE_USD = 50_000;

export interface PromotionValidatorInput {
  composite: number;
  baselineComposite: number;
  winRate: number;
  maxDrawdownPct: number;
  policy: ForgePolicyThresholds | null;
  /** Optional data gates: holdout size and triggered-with-outcome count */
  holdoutCount?: number;
  withOutcome?: number;
}

const MIN_HOLDOUT_OUTCOMES = 30;
const MIN_TRIGGERED_FOR_GATE = 5;

export interface PromotionValidatorResult {
  passed: boolean;
  failures: string[];
}

/**
 * Evaluate all promotion gates. Returns passed: true only if every gate passes;
 * failures lists every failed check (explicit reject reasons).
 */
export function validatePromotion(
  input: PromotionValidatorInput,
): PromotionValidatorResult {
  const failures: string[] = [];

  const delta = input.composite - input.baselineComposite;
  if (delta < MIN_COMPOSITE_DELTA) {
    failures.push(`ΔComposite ${(delta * 100).toFixed(2)}% < required +0.5%`);
  }

  if (input.winRate < MIN_WIN_RATE) {
    failures.push(`Win rate ${(input.winRate * 100).toFixed(1)}% < 45% floor`);
  }

  if (
    input.policy &&
    input.maxDrawdownPct > input.policy.risk.max_drawdown_pct
  ) {
    failures.push(
      `Max drawdown ${input.maxDrawdownPct.toFixed(1)}% > policy limit ${input.policy.risk.max_drawdown_pct}%`,
    );
  }

  if (
    input.policy &&
    input.policy.position_limits.max_leverage > HARD_MAX_LEVERAGE
  ) {
    failures.push(
      `max_leverage ${input.policy.position_limits.max_leverage} > hard limit ${HARD_MAX_LEVERAGE}`,
    );
  }

  if (
    input.policy &&
    input.policy.position_limits.max_single_trade_usd >
      HARD_MAX_SINGLE_TRADE_USD
  ) {
    failures.push(
      `max_single_trade_usd ${input.policy.position_limits.max_single_trade_usd} > hard limit ${HARD_MAX_SINGLE_TRADE_USD}`,
    );
  }

  if (input.holdoutCount != null && input.holdoutCount < MIN_HOLDOUT_OUTCOMES) {
    failures.push(
      `Holdout ${input.holdoutCount} < ${MIN_HOLDOUT_OUTCOMES} required`,
    );
  }

  if (input.withOutcome != null && input.withOutcome < MIN_TRIGGERED_FOR_GATE) {
    failures.push(
      `Triggered with outcomes ${input.withOutcome} < ${MIN_TRIGGERED_FOR_GATE}`,
    );
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/** Build reject-reason counts from an array of failure strings (for summary). */
export function countRejectReasons(
  failureLists: string[][],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const list of failureLists) {
    for (const reason of list) {
      const key = reason.split(":")[0] ?? reason;
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}
