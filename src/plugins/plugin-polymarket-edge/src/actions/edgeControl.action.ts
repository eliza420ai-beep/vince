/**
 * EDGE_CONTROL – Pause or resume the Polymarket edge engine.
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

export const edgeControlAction: Action = {
  name: "EDGE_CONTROL",
  similes: ["EDGE_PAUSE", "EDGE_RESUME", "POLYMARKET_EDGE_CONTROL"],
  description: "Pause or resume the Polymarket edge engine.",

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const service = runtime.getService(EDGE_SERVICE_TYPES.EDGE_ENGINE);
    if (!service) return false;
    const text = (message?.content?.text ?? "").toLowerCase();
    return (
      text.includes("edge pause") ||
      text.includes("edge resume") ||
      text.includes("pause edge") ||
      text.includes("resume edge")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const engine = runtime.getService(EDGE_SERVICE_TYPES.EDGE_ENGINE) as {
        pause?: () => void;
        resume?: () => void;
      } | null;
      if (!engine) {
        const text = "Edge engine not available.";
        if (callback) await callback({ text });
        return { text, success: false };
      }
      const text = (message?.content?.text ?? "").toLowerCase();
      if (text.includes("pause")) {
        if (engine.pause) engine.pause();
        const out = "Edge engine paused.";
        if (callback) await callback({ text: out });
        return { text: out, success: true };
      }
      if (text.includes("resume")) {
        if (engine.resume) engine.resume();
        const out = "Edge engine resumed.";
        if (callback) await callback({ text: out });
        return { text: out, success: true };
      }
      const fallback = "Say 'edge pause' or 'edge resume'.";
      if (callback) await callback({ text: fallback });
      return { text: fallback, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[EDGE_CONTROL] ${msg}`);
      const text = `Edge control failed: ${msg}`;
      if (callback) await callback({ text });
      return { text, success: false };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "pause edge" } },
      {
        name: "Oracle",
        content: { text: "Edge engine paused.", actions: ["EDGE_CONTROL"] },
      },
    ],
  ],
};

export default edgeControlAction;
