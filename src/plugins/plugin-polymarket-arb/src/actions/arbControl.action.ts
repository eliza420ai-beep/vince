/**
 * ARB_CONTROL – Pause, resume, or show config for the latency arb bot.
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

const ARB_ENGINE_SERVICE = "POLYMARKET_ARB_ENGINE_SERVICE";

export const arbControlAction: Action = {
  name: "ARB_CONTROL",
  similes: ["ARB_PAUSE", "ARB_RESUME", "ARB_CONFIG", "POLYMARKET_ARB_CONTROL"],
  description:
    "Pause or resume the Polymarket latency arb bot, or show current config (min edge, Kelly, max position).",

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const service = runtime.getService(ARB_ENGINE_SERVICE);
    if (!service) return false;
    const text = (message?.content?.text ?? "").toLowerCase();
    return (
      text.includes("arb pause") ||
      text.includes("arb resume") ||
      text.includes("pause arb") ||
      text.includes("resume arb") ||
      text.includes("arb config")
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
      const engine = runtime.getService(ARB_ENGINE_SERVICE) as {
        pause?: () => Promise<void>;
        resume?: () => Promise<void>;
        getConfig?: () => Record<string, unknown>;
      } | null;
      if (!engine) {
        const text = "Arb engine not available.";
        if (callback) await callback({ text });
        return { text, success: false };
      }
      const text = (message?.content?.text ?? "").toLowerCase();
      if (text.includes("pause")) {
        if (engine.pause) await engine.pause();
        const out = "Latency arb bot paused.";
        if (callback) await callback({ text: out });
        return { text: out, success: true };
      }
      if (text.includes("resume")) {
        if (engine.resume) await engine.resume();
        const out = "Latency arb bot resumed.";
        if (callback) await callback({ text: out });
        return { text: out, success: true };
      }
      if (text.includes("config") && engine.getConfig) {
        const cfg = engine.getConfig();
        const lines = [
          "**Arb config**",
          `Min edge: ${(cfg.minEdgePct as number) ?? 8}%`,
          `Kelly fraction: ${(cfg.kellyFraction as number) ?? 0.25}`,
          `Max position USD: ${(cfg.maxPositionUsd as number) ?? 200}`,
          `Max daily trades: ${(cfg.maxDailyTrades as number) ?? 150}`,
        ];
        const out = lines.join("\n");
        if (callback) await callback({ text: out });
        return { text: out, success: true };
      }
      const fallback = "Say 'arb pause', 'arb resume', or 'arb config'.";
      if (callback) await callback({ text: fallback });
      return { text: fallback, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ARB_CONTROL] ${msg}`);
      const text = `Arb control failed: ${msg}`;
      if (callback) await callback({ text });
      return { text, success: false };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "pause arb" } },
      {
        name: "Oracle",
        content: { text: "Latency arb bot paused.", actions: ["ARB_CONTROL"] },
      },
    ],
  ],
};

export default arbControlAction;
