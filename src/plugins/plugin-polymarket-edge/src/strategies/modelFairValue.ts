/**
 * Model Fair Value strategy: Black-Scholes implied prob vs CLOB price.
 * Signals only when edge is large (default 15%) — no latency dependency.
 */

import type { EdgeStrategy, EdgeSignal, TickContext } from "./types";
import {
  impliedProbabilityAbove,
  clampVol,
} from "../services/impliedProbability";
import {
  DEFAULT_MODEL_MIN_EDGE_PCT,
  DEFAULT_MODEL_TICK_INTERVAL_MS,
  ENV_MODEL_MIN_EDGE_PCT,
  ENV_MODEL_TICK_INTERVAL_MS,
} from "../constants";

function getConfig(): Record<string, unknown> {
  const minEdgePct =
    typeof process.env[ENV_MODEL_MIN_EDGE_PCT] !== "undefined"
      ? parseFloat(process.env[ENV_MODEL_MIN_EDGE_PCT] as string)
      : DEFAULT_MODEL_MIN_EDGE_PCT;
  const tickIntervalMs =
    typeof process.env[ENV_MODEL_TICK_INTERVAL_MS] !== "undefined"
      ? parseInt(process.env[ENV_MODEL_TICK_INTERVAL_MS] as string, 10)
      : DEFAULT_MODEL_TICK_INTERVAL_MS;
  return { minEdgePct, tickIntervalMs };
}

const cfg = getConfig();

export const modelFairValueStrategy: EdgeStrategy = {
  name: "model_fair_value",
  description:
    "Compare Black-Scholes implied probability to CLOB price; signal when edge >= threshold (e.g. 15%).",
  tickIntervalMs: Number(cfg.tickIntervalMs),

  getConfig,

  tick: async (ctx: TickContext): Promise<EdgeSignal | null> => {
    const minEdgePct = Number(cfg.minEdgePct);
    const vol = clampVol(ctx.volatility > 0 ? ctx.volatility : 0.5);

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
