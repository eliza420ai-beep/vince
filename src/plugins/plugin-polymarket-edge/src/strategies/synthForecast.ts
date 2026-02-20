/**
 * Synth Forecast strategy: compare Synth API forecast to CLOB mid price.
 * Signals when edge >= threshold (default 200 bps). No-op when SYNTH_API_KEY not set.
 */

import type { EdgeStrategy, EdgeSignal, TickContext } from "./types";
import { getSynthForecast } from "../services/synthClient";
import {
  DEFAULT_SYNTH_POLL_INTERVAL_MS,
  DEFAULT_SYNTH_EDGE_BPS,
} from "../constants";

const EDGE_BPS_ENV = "EDGE_SYNTH_EDGE_BPS";
const ASSET = "BTC";

function getConfig(): Record<string, unknown> {
  const pollIntervalMs =
    typeof process.env.EDGE_SYNTH_POLL_INTERVAL_MS !== "undefined"
      ? parseInt(process.env.EDGE_SYNTH_POLL_INTERVAL_MS as string, 10)
      : DEFAULT_SYNTH_POLL_INTERVAL_MS;
  const edgeBps =
    typeof process.env[EDGE_BPS_ENV] !== "undefined"
      ? parseFloat(process.env[EDGE_BPS_ENV] as string)
      : DEFAULT_SYNTH_EDGE_BPS;
  return { pollIntervalMs, edgeBps };
}

const cfg = getConfig();

export const synthForecastStrategy: EdgeStrategy = {
  name: "synth",
  description:
    "Compare Synth forecast probability to CLOB price; signal when edge >= threshold (e.g. 200 bps).",
  tickIntervalMs: Number(cfg.pollIntervalMs),

  getConfig,

  tick: async (ctx: TickContext): Promise<EdgeSignal | null> => {
    if (!process.env.SYNTH_API_KEY?.trim()) return null;

    const edgeBps = Number(cfg.edgeBps);
    const forecast = await getSynthForecast(ASSET);
    const synthProb = forecast.probability;

    for (const c of ctx.contracts) {
      const yesState = ctx.getBookState(c.yesTokenId);
      if (!yesState || yesState.lastUpdateMs === 0) continue;

      const marketPrice = yesState.midPrice;
      const edgeBpsYes = (synthProb - marketPrice) * 10000;
      const edgeBpsNo = (1 - synthProb - (1 - marketPrice)) * 10000;

      if (Math.abs(edgeBpsYes) >= edgeBps || Math.abs(edgeBpsNo) >= edgeBps) {
        const useYes = Math.abs(edgeBpsYes) >= Math.abs(edgeBpsNo);
        const side = useYes ? "YES" : "NO";
        const marketPriceSide = useYes ? marketPrice : 1 - marketPrice;
        const bps = useYes ? edgeBpsYes : edgeBpsNo;
        const forecastProb = useYes ? synthProb : 1 - synthProb;

        return {
          strategy: "synth",
          source: "synth",
          market_id: c.conditionId,
          side: side as "YES" | "NO",
          confidence: Math.min(1, Math.abs(bps) / 500),
          edge_bps: bps,
          forecast_prob: forecastProb,
          market_price: marketPriceSide,
          metadata: { asset: ASSET, synthSource: forecast.source },
        };
      }
    }
    return null;
  },
};
