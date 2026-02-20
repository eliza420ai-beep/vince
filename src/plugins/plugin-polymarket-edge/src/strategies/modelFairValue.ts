/**
 * Model Fair Value strategy: Black-Scholes implied prob vs CLOB price.
 * Signals only when edge is large (default 15%) and forecast is in a meaningful
 * range (5–95%) to avoid flooding with "100% / 0%" from deep ITM/OTM. Cooldown per market.
 */

import type { EdgeStrategy, EdgeSignal, TickContext } from "./types";
import {
  impliedProbabilityAbove,
  clampVol,
} from "../services/impliedProbability";
import {
  DEFAULT_MODEL_MIN_EDGE_PCT,
  DEFAULT_MODEL_TICK_INTERVAL_MS,
  DEFAULT_MODEL_MIN_FORECAST_PROB,
  DEFAULT_MODEL_MAX_FORECAST_PROB,
  DEFAULT_MODEL_COOLDOWN_MS,
  ENV_MODEL_MIN_EDGE_PCT,
  ENV_MODEL_TICK_INTERVAL_MS,
  ENV_MODEL_MIN_FORECAST_PROB,
  ENV_MODEL_MAX_FORECAST_PROB,
  ENV_MODEL_COOLDOWN_MS,
} from "../constants";

const modelFairValueCooldown = new Map<string, number>();

function getConfig(): Record<string, unknown> {
  const minEdgePct =
    typeof process.env[ENV_MODEL_MIN_EDGE_PCT] !== "undefined"
      ? parseFloat(process.env[ENV_MODEL_MIN_EDGE_PCT] as string)
      : DEFAULT_MODEL_MIN_EDGE_PCT;
  const tickIntervalMs =
    typeof process.env[ENV_MODEL_TICK_INTERVAL_MS] !== "undefined"
      ? parseInt(process.env[ENV_MODEL_TICK_INTERVAL_MS] as string, 10)
      : DEFAULT_MODEL_TICK_INTERVAL_MS;
  const minForecast =
    typeof process.env[ENV_MODEL_MIN_FORECAST_PROB] !== "undefined"
      ? parseFloat(process.env[ENV_MODEL_MIN_FORECAST_PROB] as string)
      : DEFAULT_MODEL_MIN_FORECAST_PROB;
  const maxForecast =
    typeof process.env[ENV_MODEL_MAX_FORECAST_PROB] !== "undefined"
      ? parseFloat(process.env[ENV_MODEL_MAX_FORECAST_PROB] as string)
      : DEFAULT_MODEL_MAX_FORECAST_PROB;
  const cooldownMs =
    typeof process.env[ENV_MODEL_COOLDOWN_MS] !== "undefined"
      ? parseInt(process.env[ENV_MODEL_COOLDOWN_MS] as string, 10)
      : DEFAULT_MODEL_COOLDOWN_MS;
  return {
    minEdgePct,
    tickIntervalMs,
    minForecastProb: minForecast,
    maxForecastProb: maxForecast,
    cooldownMs,
  };
}

const cfg = getConfig();

export const modelFairValueStrategy: EdgeStrategy = {
  name: "model_fair_value",
  description:
    "Compare Black-Scholes implied probability to CLOB price; signal when edge >= threshold and forecast in 5–95% range.",
  tickIntervalMs: Number(cfg.tickIntervalMs),

  getConfig,

  tick: async (ctx: TickContext): Promise<EdgeSignal | null> => {
    const minEdgePct = Number(cfg.minEdgePct);
    const minForecastProb = Number(cfg.minForecastProb);
    const maxForecastProb = Number(cfg.maxForecastProb);
    const cooldownMs = Number(cfg.cooldownMs);
    const vol = clampVol(ctx.volatility > 0 ? ctx.volatility : 0.5);
    const now = ctx.now;

    for (const c of ctx.contracts) {
      if (c.strikeUsd <= 0) continue; // skip non-BTC binary (overreaction/synth only)
      const yesState = ctx.getBookState(c.yesTokenId);
      if (!yesState || yesState.lastUpdateMs === 0) continue;

      const implied = impliedProbabilityAbove(
        ctx.spot,
        c.strikeUsd,
        c.expiryMs,
        vol,
      );
      // Only signal when model forecast is in a meaningful range (avoid 100% / 0% flood)
      if (implied < minForecastProb || implied > maxForecastProb) continue;

      const last = modelFairValueCooldown.get(c.conditionId);
      if (last != null && now - last < cooldownMs) continue;

      const marketPrice = yesState.midPrice;
      const edgeYesPct = (implied - marketPrice) * 100;
      const edgeNoPct = (1 - implied - (1 - marketPrice)) * 100;

      if (
        Math.abs(edgeYesPct) >= minEdgePct ||
        Math.abs(edgeNoPct) >= minEdgePct
      ) {
        const useYes = Math.abs(edgeYesPct) >= Math.abs(edgeNoPct);
        const edgePct = useYes ? edgeYesPct : edgeNoPct;
        const side = useYes ? "YES" : "NO";
        const forecastProb = useYes ? implied : 1 - implied;
        const marketPriceSide = useYes ? marketPrice : 1 - marketPrice;
        const edgeBps = edgePct * 100;

        modelFairValueCooldown.set(c.conditionId, now);

        return {
          strategy: "model_fair_value",
          source: "model_fair_value",
          market_id: c.conditionId,
          side: side as "YES" | "NO",
          confidence: Math.min(1, Math.abs(edgePct) / 20),
          edge_bps: edgeBps,
          forecast_prob: forecastProb,
          market_price: marketPriceSide,
          metadata: {
            spot: ctx.spot,
            strikeUsd: c.strikeUsd,
            expiryMs: c.expiryMs,
            volatility: vol,
          },
        };
      }
    }
    return null;
  },
};
