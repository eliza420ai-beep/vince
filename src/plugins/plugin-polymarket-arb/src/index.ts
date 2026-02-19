/**
 * Polymarket Latency Arb Plugin
 *
 * Holds dual WebSocket connections: Binance spot (BTC) and Polymarket CLOB.
 * Detects edge when BTC moves and Polymarket contract price lags; paper trades
 * by default, live execution when POLYMARKET_ARB_LIVE=true.
 */

import type { Plugin } from "@elizaos/core";
import { arbSchema } from "./schema/arb";
import { arbStatusAction } from "./actions/arbStatus.action";
import { arbControlAction } from "./actions/arbControl.action";
import { buildArbStatusHandler } from "./routes/arbStatus";
import { BinanceSpotWsService } from "./services/binanceSpotWs.service";
import { PolymarketClobWsService } from "./services/polymarketClobWs.service";
import { ArbEngineService } from "./services/arbEngine.service";

export const pluginPolymarketArb: Plugin = {
  name: "polymarket-arb",
  description:
    "Polymarket latency arb: Binance spot + Polymarket CLOB WebSockets, edge detection, paper/live execution.",

  schema: arbSchema,

  routes: [
    {
      name: "arb-status",
      path: "/arb/status",
      type: "GET",
      handler: buildArbStatusHandler(),
    },
  ],

  actions: [arbStatusAction, arbControlAction],

  services: [BinanceSpotWsService, PolymarketClobWsService, ArbEngineService],

  init: async (_config, _runtime) => {
    // Services start themselves via static start(); engine wires feeds in start()
  },
};

export default pluginPolymarketArb;
export { arbSchema } from "./schema/arb";
export type * from "./types";
