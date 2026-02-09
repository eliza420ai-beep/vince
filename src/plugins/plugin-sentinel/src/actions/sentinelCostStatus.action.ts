/**
 * SENTINEL_COST_STATUS — Summarize project costs: token usage, LLM choice, Cursor, data API tiers, breakeven, 100K target, burn rate.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const COST_TRIGGERS = [
  "burn rate",
  "breakeven",
  "cost status",
  "what are we spending",
  "100k target",
  "100k/year",
  "how much does it cost to run",
  "usage",
  "token cost",
  "what's our burn",
  "on track for breakeven",
  "run rate",
  "monthly burn",
  "monthly spend",
  "our spend",
];

function wantsCostStatus(text: string): boolean {
  const lower = text.toLowerCase();
  return COST_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelCostStatusAction: Action = {
  name: "SENTINEL_COST_STATUS",
  similes: ["SENTINEL_BURN_STATUS", "COST_STEWARD_STATUS"],
  description:
    "Summarizes project costs from TREASURY and cost breakdown: token usage (Usage tab), LLM choice and cost, Cursor Max, data API tiers; breakeven and 100K target; emphasizes watching burn rate.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsCostStatus(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    logger.debug("[SENTINEL_COST_STATUS] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";

      const prompt = `You are Sentinel, the cost steward. Using ONLY the context below (TREASURY.md and cost breakdown), summarize project costs in one short paragraph or bullet list. Include: (1) token usage—Leaderboard → Usage tab, run_event logs, VINCE_USAGE_COST_PER_1K_TOKENS for estimated cost; (2) which LLM for what (TEXT_SMALL for simple, TEXT_LARGE for complex) and that we use cheaper models for simple tasks; (3) Cursor Max cost; (4) data API tiers (Nansen 100 credits, Sanbase 1K/mo, CoinGlass, etc.); (5) bottom line: breakeven, 100K/year target, and that we always watch burn rate. Do not fabricate—reference Usage tab and TREASURY. End with a one-line reminder to watch burn rate and target 100K.\n\nContext:\n${contextBlock}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return true;
    } catch (error) {
      logger.error("[SENTINEL_COST_STATUS] Failed:", error);
      await callback({
        text: "Cost summary couldn't be generated. Check Leaderboard → Usage and TREASURY.md (cost breakdown section) for token usage, LLM choice, Cursor, data API tiers, breakeven, and 100K target. Always watch burn rate.",
      });
      return false;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What's our burn? Are we on track for breakeven?" },
      },
      {
        name: "Sentinel",
        content: {
          text: "Usage tab shows token usage and estimated cost (set VINCE_USAGE_COST_PER_1K_TOKENS). TREASURY cost breakdown: TEXT_SMALL for simple tasks, TEXT_LARGE for complex; Cursor Max; Nansen 100 credits, Sanbase 1K/mo, CoinGlass. Bottom line: cover API + Cursor + data API; target 100K/year. Watch burn rate.",
        },
      },
    ],
  ],
};
