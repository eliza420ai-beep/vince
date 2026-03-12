/**
 * Overreaction (Poly Strat) strategy: detect crowd overreaction, signal underdog.
 * Price velocity + favorite spike + cheap underdog => BUY underdog.
 */

import type { EdgeStrategy, EdgeSignal, TickContext } from "./types";
import { computeSuggestedSizeUsd } from "../utils/sizing";
import {
  DEFAULT_OVERREACTION_VELOCITY_PCT,
  DEFAULT_OVERREACTION_WINDOW_MS,
  DEFAULT_OVERREACTION_MAX_UNDERDOG_PRICE,
  DEFAULT_OVERREACTION_COOLDOWN_MS,
  ENV_OVERREACTION_VELOCITY_PCT,
  ENV_OVERREACTION_WINDOW_MS,
  ENV_OVERREACTION_MAX_UNDERDOG_PRICE,
  ENV_OVERREACTION_COOLDOWN_MS,
} from "../constants";

function getConfig(): Record<string, unknown> {
  const velocityPct =
    typeof process.env[ENV_OVERREACTION_VELOCITY_PCT] !== "undefined"
      ? parseFloat(process.env[ENV_OVERREACTION_VELOCITY_PCT] as string)
      : DEFAULT_OVERREACTION_VELOCITY_PCT;
  const windowMs =
    typeof process.env[ENV_OVERREACTION_WINDOW_MS] !== "undefined"
      ? parseInt(process.env[ENV_OVERREACTION_WINDOW_MS] as string, 10)
      : DEFAULT_OVERREACTION_WINDOW_MS;
  const maxUnderdogPrice =
    typeof process.env[ENV_OVERREACTION_MAX_UNDERDOG_PRICE] !== "undefined"
      ? parseFloat(process.env[ENV_OVERREACTION_MAX_UNDERDOG_PRICE] as string)
      : DEFAULT_OVERREACTION_MAX_UNDERDOG_PRICE;
  const cooldownMs =
    typeof process.env[ENV_OVERREACTION_COOLDOWN_MS] !== "undefined"
      ? parseInt(process.env[ENV_OVERREACTION_COOLDOWN_MS] as string, 10)
      : DEFAULT_OVERREACTION_COOLDOWN_MS;
  return { velocityPct, windowMs, maxUnderdogPrice, cooldownMs };
}

const lastSignalByCondition = new Map<string, number>();

export const overreactionStrategy: EdgeStrategy = {
  name: "overreaction",
  description:
    "Poly Strat: detect favorite spike + cheap underdog, signal BUY underdog for spread lock.",
  tickIntervalMs: 30_000, // 30s

  getConfig,

  tick: async (ctx: TickContext): Promise<EdgeSignal | null> => {
    const cfg = getConfig() as Record<string, unknown>;
    const velocityPct = Number(cfg.velocityPct);
    const maxUnderdog = Number(cfg.maxUnderdogPrice);
    const cooldownMs = Number(cfg.cooldownMs);
    const now = ctx.now;
    const candidates: EdgeSignal[] = [];

    for (const c of ctx.contracts) {
      const cooldownKey = c.conditionId;
      if ((lastSignalByCondition.get(cooldownKey) ?? 0) + cooldownMs > now)
        continue;

      const yesState = ctx.getBookState(c.yesTokenId);
      const noState = ctx.getBookState(c.noTokenId);
      if (!yesState || !noState) continue;

      const yesPrice = yesState.midPrice;
      const noPrice = noState.midPrice;
      // Underdog = cheaper side. We want underdog <= maxUnderdog (e.g. 0.15).
      const underdogIsNo = noPrice <= yesPrice;
      const underdogPrice = underdogIsNo ? noPrice : yesPrice;
      const favoritePrice = underdogIsNo ? yesPrice : noPrice;

      if (underdogPrice > maxUnderdog) continue;
      if (favoritePrice < 0.7) continue; // need a clear favorite

      const underdogTokenId = underdogIsNo ? c.noTokenId : c.yesTokenId;
      const vel = ctx.getPriceVelocity(underdogTokenId);
      const yesVel = ctx.getPriceVelocity(c.yesTokenId);
      const spikeEnough =
        (yesVel && Math.abs(yesVel.velocityPct) >= velocityPct) ||
        (vel && Math.abs(vel.velocityPct) >= velocityPct);
      if (!spikeEnough) continue;

      // Edge = mean reversion expectation: underdog should revert toward
      // its pre-spike level, estimated as 10 pct points above current.
      const revertTarget = Math.min(underdogPrice + 0.1, 0.3);
      const edgeBps = (revertTarget - underdogPrice) * 10000;
      if (edgeBps < 200) continue; // need at least 200 bps directional edge

      lastSignalByCondition.set(cooldownKey, now);
      const side = underdogIsNo ? "NO" : "YES";
      const favPct = `${(favoritePrice * 100).toFixed(1)}%`;
      const underPct = `${(underdogPrice * 100).toFixed(1)}%`;
      const velPct = vel?.velocityPct ?? 0;
      const label =
        c.question.length > 60 ? c.question.slice(0, 57) + "…" : c.question;
      const rationale =
        `Crowd overreaction on "${label}". ` +
        `Favorite spiked to ${favPct}, underdog dropped to ${underPct}. ` +
        `Price velocity ${velPct > 0 ? "+" : ""}${velPct.toFixed(1)}%. ` +
        `Buying ${side} (underdog) at ${underPct} — expecting revert toward ${(revertTarget * 100).toFixed(0)}% (${edgeBps.toFixed(0)} bps edge).`;

      const confidence = Math.min(
        1,
        (Math.abs(vel?.velocityPct ?? 0) / 10) * 0.5 + 0.5,
      );
      const edgeFraction = Math.abs(edgeBps) / 10000;
      const suggested_size_usd = computeSuggestedSizeUsd({
        edgeFraction,
        marketPrice: underdogPrice,
        confidence,
        bankrollUsd: ctx.bankrollUsd,
      });

      candidates.push({
        strategy: "overreaction",
        source: "overreaction",
        market_id: c.conditionId,
        side: side as "YES" | "NO",
        confidence,
        edge_bps: edgeBps,
        forecast_prob: underdogPrice + 0.1, // slight mean reversion
        market_price: underdogPrice,
        suggested_size_usd,
        metadata: {
          rationale,
          favoritePrice,
          underdogPrice,
          velocityPct: velPct,
        },
      });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => Math.abs(b.edge_bps) - Math.abs(a.edge_bps));
    return candidates[0];
  },
};
