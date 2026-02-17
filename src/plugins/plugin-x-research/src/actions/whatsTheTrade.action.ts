/**
 * ECHO What's the Trade — On-demand action
 *
 * Runs the same belief-router style report as the daily task: thesis → adapters → ALOHA narrative → save.
 * Use this to see the report in action without waiting for the scheduled run.
 *
 * Trigger: "what's the trade", "run what's the trade", "belief router today", etc.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { runWhatsTheTradeReport } from "../tasks/whatsTheTradeDaily.tasks";

export const whatsTheTradeAction: Action = {
  name: "ECHO_WHATS_THE_TRADE",
  description:
    "Run the belief-router style report now: one thesis, live Kalshi/Robinhood/Hyperliquid data, ALOHA-style narrative. Saves to docs/standup/whats-the-trade/. Use when asked to run or show 'what\'s the trade', 'belief router', 'today\'s trade'.",
  similes: [
    "WHATS_THE_TRADE",
    "BELIEF_ROUTER",
    "RUN_WHATS_THE_TRADE",
    "TODAYS_TRADE",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    if (runtime.character?.name !== "ECHO") return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("what's the trade") ||
      text.includes("whats the trade") ||
      text.includes("belief router") ||
      text.includes("run what's the trade") ||
      text.includes("today's trade") ||
      text.includes("todays trade")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback
  ): Promise<void | { success: boolean; error?: string }> => {
    try {
      logger.info("[ECHO_WHATS_THE_TRADE] Running report...");
      const { filepath, report } = await runWhatsTheTradeReport(runtime);
      const sent = filepath
        ? `Report saved to \`${filepath}\`.\n\n---\n\n${report}`
        : report;
      if (callback) {
        await callback({
          text: sent,
          actions: ["ECHO_WHATS_THE_TRADE"],
        });
      }
      return { success: true };
    } catch (error) {
      logger.error({ error }, "[ECHO_WHATS_THE_TRADE] Failed");
      if (callback) {
        await callback({
          text: `Couldn't run the report: ${(error as Error).message}. Check logs and that \`skills/whats-the-trade\` has \`bun install\` and adapter scripts.`,
          actions: ["ECHO_WHATS_THE_TRADE"],
        });
      }
      return { success: false, error: (error as Error).message };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What's the trade today?" } },
      {
        name: "ECHO",
        content: {
          text: "Ran the belief-router report. **What's the trade** _Tuesday, Feb 18_ … [narrative + trade card]. Report saved to docs/standup/whats-the-trade/2026-02-18-whats-the-trade.md.",
          actions: ["ECHO_WHATS_THE_TRADE"],
        },
      },
    ],
  ],
};
