/**
 * ARB_STATUS – Report latency arb bot status (paper/live, trades today, P&L, paused).
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

export const arbStatusAction: Action = {
  name: "ARB_STATUS",
  similes: ["ARB_STATUS", "LATENCY_ARB_STATUS", "POLYMARKET_ARB_STATUS"],
  description:
    "Report Polymarket latency arb bot status: paper vs live, trades today, P&L, circuit breaker, and pause state.",

  validate: async (runtime: IAgentRuntime) => {
    const service = runtime.getService(ARB_ENGINE_SERVICE);
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
      const engine = runtime.getService(ARB_ENGINE_SERVICE) as {
        getStatus?: () => Promise<Record<string, unknown>>;
      } | null;
      if (!engine?.getStatus) {
        const text = "Arb engine not available or getStatus not implemented.";
        if (callback) await callback({ text });
        return { text, success: false };
      }
      const status = await engine.getStatus();
      const lines = [
        "**Latency arb status**",
        `Mode: ${(status.liveExecution as boolean) ? "LIVE" : "PAPER"}`,
        `Paused: ${(status.paused as boolean) ?? false}`,
        `Trades today: ${(status.tradesToday as number) ?? 0}`,
        `Win count: ${(status.winCountToday as number) ?? 0}`,
        `Today P&L (USD): ${(status.todayPnlUsd as number) ?? 0}`,
        `Bankroll: $${(status.bankrollUsd as number) ?? 0}`,
        `Contracts watched: ${(status.contractsWatched as number) ?? 0}`,
        `BTC last price: $${(status.btcLastPrice as number) ?? "—"}`,
      ];
      const text = lines.join("\n");
      if (callback) await callback({ text });
      return { text, success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ARB_STATUS] ${msg}`);
      const text = `Arb status failed: ${msg}`;
      if (callback) await callback({ text });
      return { text, success: false };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "arb status" } },
      {
        name: "Oracle",
        content: {
          text: "Latency arb status: PAPER, 12 trades today, +$45. Contracts watched: 4.",
          actions: ["ARB_STATUS"],
        },
      },
    ],
  ],
};

export default arbStatusAction;
