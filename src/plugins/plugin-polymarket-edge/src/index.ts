/**
 * Polymarket Edge Plugin
 *
 * Multi-strategy edge engine: overreaction (Poly Strat), model fair value,
 * Synth forecast. Feeds signals to plugin_polymarket_desk.signals for
 * Risk -> Executor pipeline. No latency dependency (Polymarket removed 0.5s delay Feb 2025).
 */

import type { Plugin } from "@elizaos/core";
import { edgeSchema } from "./schema/edge";
import { edgeStatusAction } from "./actions/edgeStatus.action";
import { edgeControlAction } from "./actions/edgeControl.action";
import { buildEdgeStatusHandler } from "./routes/edgeStatus";
import { buildEdgeSignalsHandler } from "./routes/edgeSignals";
import { BinanceSpotWsService } from "./services/binanceSpotWs.service";
import { PolymarketClobWsService } from "./services/polymarketClobWs.service";
import { EdgeEngineService } from "./services/edgeEngine.service";

export const pluginPolymarketEdge: Plugin = {
  name: "polymarket-edge",
  description:
    "Multi-strategy edge engine: overreaction, model fair value, Synth forecast. Feeds signals to desk pipeline.",

  schema: edgeSchema,

  routes: [
    {
      name: "edge-status",
      path: "/edge/status",
      type: "GET",
      handler: buildEdgeStatusHandler(),
    },
    {
      name: "edge-signals",
      path: "/edge/signals",
      type: "GET",
      handler: buildEdgeSignalsHandler(),
    },
  ],

  actions: [edgeStatusAction, edgeControlAction],

  services: [BinanceSpotWsService, PolymarketClobWsService, EdgeEngineService],

  init: async (_config, _runtime) => {
    // Services start themselves via static start()
  },
};

export default pluginPolymarketEdge;
export { edgeSchema } from "./schema/edge";
export type * from "./types";
export type * from "./strategies/types";
