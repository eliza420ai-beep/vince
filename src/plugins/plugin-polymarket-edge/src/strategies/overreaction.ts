/**
 * Overreaction (Poly Strat) strategy: detect crowd overreaction, signal underdog.
 * Price velocity + favorite spike + cheap underdog => BUY underdog.
 */

import type { EdgeStrategy, EdgeSignal, TickContext } from "./types";
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

const cfg = getConfig();
const lastSignalByCondition = new Map<string, number>();

export const overreactionStrategy: EdgeStrategy = {
  name: "overreaction",
  description:
    "Poly Strat: detect favorite spike + cheap underdog, signal BUY underdog for spread lock.",
  tickIntervalMs: 30_000, // 30s

  getConfig,

  tick: async (ctx: TickContext): Promise<EdgeSignal | null> => {
    const velocityPct = Number(cfg.velocityPct);
    const maxUnderdog = Number(cfg.maxUnderdogPrice);
    const cooldownMs = Number(cfg.cooldownMs);
    const now = ctx.now;

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

      lastSignalByCondition.set(cooldownKey, now);
      const edgeBps = (1 - underdogPrice - favoritePrice) * 10000; // locked spread
      return {
        strategy: "overreaction",
        source: "overreaction",
        market_id: c.conditionId,
        side: underdogIsNo ? "NO" : "YES",
        confidence: Math.min(
          1,
          (Math.abs(vel?.velocityPct ?? 0) / 10) * 0.5 + 0.5,
        ),
        edge_bps: edgeBps,
        forecast_prob: underdogPrice + 0.1, // slight mean reversion
        market_price: underdogPrice,
        metadata: {
          favoritePrice,
          underdogPrice,
          velocityPct: vel?.velocityPct ?? 0,
        },
      };
    }
    return null;
  },
};
