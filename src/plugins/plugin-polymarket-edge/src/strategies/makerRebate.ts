/**
 * Maker Rebate strategy: paper-traded maker-side signals for 5-min BTC up/down markets.
 * At T-10s before window close, BTC direction is ~85% determined; post maker on winning side at 90–95c.
 * Zero maker fees + rebates; avoids dynamic taker fee curve.
 */

import type { EdgeStrategy, EdgeSignal, TickContext } from "./types";
import type { ContractMeta } from "../types";
import {
  BTC_5MIN_QUESTION_PATTERNS,
  DEFAULT_MAKER_REBATE_TICK_MS,
  DEFAULT_MAKER_REBATE_ENTRY_WINDOW_SEC,
  DEFAULT_MAKER_REBATE_MIN_CONFIDENCE,
  DEFAULT_MAKER_REBATE_MIN_ENTRY_PRICE,
  DEFAULT_MAKER_REBATE_COOLDOWN_MS,
  ENV_MAKER_REBATE_TICK_MS,
  ENV_MAKER_REBATE_ENTRY_WINDOW_SEC,
  ENV_MAKER_REBATE_MIN_CONFIDENCE,
  ENV_MAKER_REBATE_MIN_ENTRY_PRICE,
  ENV_MAKER_REBATE_COOLDOWN_MS,
} from "../constants";

const ENTRY_WINDOW_MS_MAX = 60 * 1000; // only consider markets expiring within 60s (5-min window)
const FEE_CURVE_C = 1; // normalized constant; max taker fee ~1.56% at p=0.5
const REBATE_PER_SHARE_USD = 0.001; // placeholder rebate estimate per share

function getConfig(): Record<string, unknown> {
  const tickIntervalMs =
    typeof process.env[ENV_MAKER_REBATE_TICK_MS] !== "undefined"
      ? parseInt(process.env[ENV_MAKER_REBATE_TICK_MS] as string, 10)
      : DEFAULT_MAKER_REBATE_TICK_MS;
  const entryWindowSec =
    typeof process.env[ENV_MAKER_REBATE_ENTRY_WINDOW_SEC] !== "undefined"
      ? parseInt(process.env[ENV_MAKER_REBATE_ENTRY_WINDOW_SEC] as string, 10)
      : DEFAULT_MAKER_REBATE_ENTRY_WINDOW_SEC;
  const minConfidence =
    typeof process.env[ENV_MAKER_REBATE_MIN_CONFIDENCE] !== "undefined"
      ? parseFloat(process.env[ENV_MAKER_REBATE_MIN_CONFIDENCE] as string)
      : DEFAULT_MAKER_REBATE_MIN_CONFIDENCE;
  const minEntryPrice =
    typeof process.env[ENV_MAKER_REBATE_MIN_ENTRY_PRICE] !== "undefined"
      ? parseFloat(process.env[ENV_MAKER_REBATE_MIN_ENTRY_PRICE] as string)
      : DEFAULT_MAKER_REBATE_MIN_ENTRY_PRICE;
  const cooldownMs =
    typeof process.env[ENV_MAKER_REBATE_COOLDOWN_MS] !== "undefined"
      ? parseInt(process.env[ENV_MAKER_REBATE_COOLDOWN_MS] as string, 10)
      : DEFAULT_MAKER_REBATE_COOLDOWN_MS;
  return {
    tickIntervalMs,
    entryWindowSec,
    minConfidence,
    minEntryPrice,
    cooldownMs,
  };
}

const cfg = getConfig();
const lastSignalByCondition = new Map<string, number>();

function is5MinBtcMarket(question: string): boolean {
  if (!question || typeof question !== "string") return false;
  const q = question.toLowerCase();
  if (!q.includes("btc") && !q.includes("bitcoin")) return false;
  return BTC_5MIN_QUESTION_PATTERNS.some((p) => p.test(question));
}

/** Taker fee (bps) from dynamic fee curve: fee = C * 0.25 * (p * (1-p))^2. Max ~156 bps at p=0.5. */
function takerFeeBps(p: number): number {
  const term = p * (1 - p);
  const feePct = FEE_CURVE_C * 0.25 * term * term;
  return Math.round(feePct * 10000);
}

/** Estimate fill probability for a maker order at entryPrice (0–1). */
function estimateFillProbability(
  entryPrice: number,
  bestBid: number,
  bestAsk: number,
  windowSecsRemaining: number,
): number {
  const spread = bestAsk > bestBid ? bestAsk - bestBid : 0.01;
  const insideSpread = entryPrice >= bestBid && entryPrice <= bestAsk;
  const tightSpread = spread <= 0.03 ? 1 : spread <= 0.06 ? 0.8 : 0.6;
  const timeBonus =
    windowSecsRemaining <= 10 ? 0.9 : windowSecsRemaining <= 30 ? 0.7 : 0.5;
  return Math.min(0.95, (insideSpread ? 0.85 : 0.6) * tightSpread * timeBonus);
}

/** Returns contracts that are 5-min BTC markets with expiry in the entry window (0 to entryWindowSec from now). */
function filter5MinEntryWindow(
  contracts: ContractMeta[],
  now: number,
  entryWindowSec: number,
): ContractMeta[] {
  const entryWindowMs = entryWindowSec * 1000;
  return contracts.filter((c) => {
    if (!is5MinBtcMarket(c.question)) return false;
    const secsToExpiry = (c.expiryMs - now) / 1000;
    return (
      secsToExpiry > 0 &&
      secsToExpiry <= entryWindowSec &&
      c.expiryMs - now <= ENTRY_WINDOW_MS_MAX
    );
  });
}

export const makerRebateStrategy: EdgeStrategy = {
  name: "maker_rebate",
  description:
    "Paper-traded maker signals for 5-min BTC up/down: post on winning side at 90–95c in last 10s, zero fees + rebates.",
  tickIntervalMs:
    Number((cfg as { tickIntervalMs?: number }).tickIntervalMs) ||
    DEFAULT_MAKER_REBATE_TICK_MS,

  getConfig,

  tick: async (ctx: TickContext): Promise<EdgeSignal | null> => {
    const entryWindowSec = Number(cfg.entryWindowSec);
    const minConfidence = Number(cfg.minConfidence);
    const minEntryPrice = Number(cfg.minEntryPrice);
    const cooldownMs = Number(cfg.cooldownMs);
    const now = ctx.now;

    const candidates = filter5MinEntryWindow(
      ctx.contracts,
      now,
      entryWindowSec,
    );
    for (const c of candidates) {
      const cooldownKey = c.conditionId;
      if ((lastSignalByCondition.get(cooldownKey) ?? 0) + cooldownMs > now)
        continue;

      const yesState = ctx.getBookState(c.yesTokenId);
      const noState = ctx.getBookState(c.noTokenId);
      if (!yesState || !noState || yesState.lastUpdateMs === 0) continue;

      const yesPrice = yesState.midPrice;
      const noPrice = noState.midPrice;
      const yesVel = ctx.getPriceVelocity(c.yesTokenId);
      const noVel = ctx.getPriceVelocity(c.noTokenId);

      // YES = typically "BTC up", NO = "BTC down". Use velocity: positive YES velocity => bullish.
      const yesMomentum = yesVel?.velocityPct ?? 0;
      const noMomentum = noVel?.velocityPct ?? 0;
      const confidenceYes = Math.min(
        1,
        0.5 + yesMomentum / 20 - noMomentum / 20,
      );
      const confidenceNo = Math.min(
        1,
        0.5 + noMomentum / 20 - yesMomentum / 20,
      );

      const side: "YES" | "NO" = confidenceYes >= confidenceNo ? "YES" : "NO";
      const confidence = side === "YES" ? confidenceYes : confidenceNo;
      if (confidence < minConfidence) continue;

      const marketPrice = side === "YES" ? yesPrice : noPrice;
      const bestBid = side === "YES" ? yesState.bestBid : noState.bestBid;
      const bestAsk = side === "YES" ? yesState.bestAsk : noState.bestAsk;

      // Maker entry at 90–95c; must be >= minEntryPrice (default 0.88).
      const rawMakerEntry = Math.min(
        0.95,
        Math.max(minEntryPrice, marketPrice - 0.02),
      );
      const makerEntryPrice = Math.round(rawMakerEntry * 100) / 100;
      if (makerEntryPrice < minEntryPrice) continue;

      const windowSecsRemaining = (c.expiryMs - now) / 1000;
      const takerFeeAvoidedBps = takerFeeBps(marketPrice);
      const estimatedFillProb = estimateFillProbability(
        makerEntryPrice,
        bestBid,
        bestAsk,
        windowSecsRemaining,
      );
      const edgeBps = (1.0 - makerEntryPrice) * 10000;
      const estimatedRebateUsd = REBATE_PER_SHARE_USD;
      const btcMomentumPct = side === "YES" ? yesMomentum : noMomentum;

      lastSignalByCondition.set(cooldownKey, now);

      const label =
        c.question.length > 60 ? c.question.slice(0, 57) + "…" : c.question;
      const rationale =
        `Maker rebate (5-min BTC). "${label}". ` +
        `Side ${side} at ${(makerEntryPrice * 100).toFixed(0)}c, ` +
        `confidence ${(confidence * 100).toFixed(0)}%, ` +
        `~${windowSecsRemaining.toFixed(0)}s to expiry. ` +
        `BTC momentum ${btcMomentumPct > 0 ? "+" : ""}${btcMomentumPct.toFixed(1)}%. ` +
        `Taker fee avoided ${takerFeeAvoidedBps} bps; est. fill ${(estimatedFillProb * 100).toFixed(0)}%.`;

      return {
        strategy: "maker_rebate",
        source: "maker_rebate",
        market_id: c.conditionId,
        side,
        confidence,
        edge_bps: edgeBps,
        forecast_prob: confidence,
        market_price: marketPrice,
        metadata: {
          rationale,
          makerEntryPrice,
          takerFeeAvoidedBps,
          estimatedFillProb,
          estimatedRebateUsd,
          windowSecsRemaining,
          btcMomentumPct,
          btcSpot: ctx.spot,
          strikeUsd: c.strikeUsd,
          isMakerOrder: true,
        },
      };
    }
    return null;
  },
};
