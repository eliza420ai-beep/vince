/**
 * EDGE_STATUS – Report Polymarket edge engine status (strategies, contracts, paused).
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  logger,
} from "@elizaos/core";
import { EDGE_SERVICE_TYPES } from "../constants";

export const edgeStatusAction: Action = {
  name: "EDGE_STATUS",
  similes: ["EDGE_STATUS", "POLYMARKET_EDGE_STATUS", "EDGE_ENGINE_STATUS"],
  description:
    "Report Polymarket edge engine status: strategies, contracts watched, BTC price, pause state.",

  validate: async (runtime: IAgentRuntime) => {
    const service = runtime.getService(EDGE_SERVICE_TYPES.EDGE_ENGINE);
    return !!service;
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const engine = runtime.getService(EDGE_SERVICE_TYPES.EDGE_ENGINE) as {
        getStatus?: () => Record<string, unknown>;
      } | null;
      if (!engine?.getStatus) {
        const text = "Edge engine not available or getStatus not implemented.";
        if (callback) await callback({ text });
        return { text, success: false };
      }
      const status = engine.getStatus();
      const lines = [
        "**Edge engine status**",
        `Paused: ${(status.paused as boolean) ?? false}`,
        `Contracts watched: ${(status.contractsWatched as number) ?? 0}`,
        `BTC last price: $${(status.btcLastPrice as number) ?? "—"}`,
        `Strategies: ${Object.keys(status.strategies ?? {}).join(", ") || "none"}`,
      ];
      const text = lines.join("\n");
      if (callback) await callback({ text });
      return { text, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[EDGE_STATUS] ${msg}`);
      const text = `Edge status failed: ${msg}`;
      if (callback) await callback({ text });
      return { text, success: false };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "edge status" } },
      {
        name: "Oracle",
        content: {
          text: "Edge engine status: 4 contracts watched. Strategies: overreaction, model_fair_value, synth.",
          actions: ["EDGE_STATUS"],
        },
      },
    ],
  ],
};

export default edgeStatusAction;
