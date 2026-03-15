/**
 * Vince Sentiment Gate — Adjusts position sizing and direction based on Echo CT sentiment and Oracle regime.
 * PRD: One Dream — Agent Synergy (§5.3). Sentiment is an input, not a veto; risk engine has final say.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

const CACHE_ECHO = "vince:echo_sentiment";
const CACHE_ORACLE = "vince:oracle_regime";

export interface SentimentGateInput {
  sentimentScore: number;
  sentimentLabel: string;
  regime: string;
}

export interface SentimentGateAdjustment {
  sizeMultiplier: number;
  skipLongs: boolean;
  skipShorts: boolean;
  sentimentScore: number;
  sentimentLabel: string;
  regime: string;
  adjustmentApplied: string;
}

/**
 * Read Echo sentiment and Oracle regime from cache (populated by echoSentiment and oracleRegime providers).
 * When cache is empty or stale, returns neutral so the bot is not blocked.
 */
export async function getSentimentGateInput(
  runtime: IAgentRuntime,
): Promise<SentimentGateInput> {
  const echoEntry = await runtime.getCache<{
    score: number;
    label: string;
    ts: number;
  }>(CACHE_ECHO);
  const oracleEntry = await runtime.getCache<{ regime: string; ts: number }>(
    CACHE_ORACLE,
  );

  const sentimentScore =
    echoEntry && Date.now() - echoEntry.ts < 20 * 60 * 1000
      ? echoEntry.score
      : 5;
  const sentimentLabel =
    echoEntry && Date.now() - echoEntry.ts < 20 * 60 * 1000
      ? echoEntry.label
      : "neutral";
  const regime =
    oracleEntry && Date.now() - oracleEntry.ts < 20 * 60 * 1000
      ? oracleEntry.regime
      : "uncertain";

  return { sentimentScore, sentimentLabel, regime };
}

/**
 * Compute size multiplier and skip flags from sentiment and regime.
 * - Risk-off regime: max position size halved (0.5x).
 * - Bearish sentiment (< 4): skip new longs.
 * - Bullish sentiment (> 7) + risk-on: full size (1.0x).
 * - Otherwise: neutral 1.0x, no skip.
 */
export function getSentimentGateAdjustment(
  input: SentimentGateInput,
  direction: "long" | "short",
): SentimentGateAdjustment {
  const { sentimentScore, sentimentLabel, regime } = input;
  const riskOff = regime === "risk-off";
  const riskOn = regime === "risk-on";
  const bearish = sentimentScore < 4 || sentimentLabel === "bearish";
  const bullish = sentimentScore > 7 || sentimentLabel === "bullish";

  let sizeMultiplier = 1.0;
  let skipLongs = false;
  let skipShorts = false;
  const reasons: string[] = [];

  if (riskOff) {
    sizeMultiplier = 0.5;
    reasons.push("risk-off regime: 0.5x size");
  }

  if (bearish) {
    skipLongs = true;
    reasons.push("bearish sentiment: skip new longs");
    if (!riskOff) {
      sizeMultiplier = Math.min(sizeMultiplier, 0.8);
      if (sizeMultiplier < 1) reasons.push("0.8x size");
    }
  }

  if (bullish && riskOn && !riskOff) {
    reasons.push("bullish + risk-on: full size");
  }

  if (sentimentScore <= 3 && direction === "short") {
    skipShorts = false;
  } else if (sentimentScore >= 8 && direction === "long") {
    skipLongs = false;
  }

  const adjustmentApplied =
    reasons.length > 0 ? reasons.join("; ") : "neutral (no adjustment)";

  return {
    sizeMultiplier,
    skipLongs,
    skipShorts,
    sentimentScore,
    sentimentLabel,
    regime,
    adjustmentApplied,
  };
}

/**
 * One-shot: get current gate adjustment for a given direction (for use in evaluateAndTrade).
 */
export async function getSentimentGateForDirection(
  runtime: IAgentRuntime,
  direction: "long" | "short",
): Promise<SentimentGateAdjustment> {
  const input = await getSentimentGateInput(runtime);
  const adj = getSentimentGateAdjustment(input, direction);
  if (adj.sizeMultiplier !== 1.0 || adj.skipLongs || adj.skipShorts) {
    logger.debug(
      `[VinceSentimentGate] ${direction} sentiment=${input.sentimentScore} ${input.sentimentLabel} regime=${input.regime} → ${adj.adjustmentApplied}`,
    );
  }
  return adj;
}
