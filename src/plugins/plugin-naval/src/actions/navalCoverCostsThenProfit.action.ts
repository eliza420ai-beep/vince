/**
 * NAVAL_COVER_COSTS_THEN_PROFIT — Mandate: cover costs, then profitability. No endless burn. One number to know.
 * On-topic: TREASURY.md, cost steward, mandate to cover costs then profit.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import {
  ALOHA_STYLE_RULES,
  BRAND_VOICE,
  NAVAL_STRUCTURED_NOTE,
  NO_AI_SLOP,
} from "../utils/alohaStyle";

const TRIGGERS = [
  "cover costs",
  "cover costs then profit",
  "burn rate",
  "breakeven",
  "cost steward",
  "no endless burn",
  "when do we profit",
  "runway",
  "cost coverage",
  "profitable mandate",
  "treasury",
];

function wantsCoverCostsThenProfit(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — project, side hustle, or business: what they spend vs earn]

Cover-costs-then-profit lens:
- Mandate: cover costs first. Then profitability. No "we'll figure out revenue later" forever.
- One number to know: burn per month, or what revenue covers it. If you don't know the number, you're flying blind.
- Benefit: you stop burning without a target. Either you're moving toward breakeven or you're not.

Analyze:
1. Do they know their monthly burn (or cost to run the thing)? If not, that's step one.
2. One concrete step: e.g. "List every recurring cost; sum it. That's the number to cover" or "Set a breakeven date and work backward."
3. One rule: e.g. "We don't add cost without a path to cover it" or "Quarterly: are we closer to breakeven or not?"

Direct. No hype. Give them the number to know and the rule.`;

export const navalCoverCostsThenProfitAction: Action = {
  name: "NAVAL_COVER_COSTS_THEN_PROFIT",
  similes: [
    "COVER_COSTS_THEN_PROFIT",
    "BURNRATE_BREAKEVEN",
    "NO_ENDLESS_BURN",
    "COST_STEWARD",
  ],
  description:
    "Cover costs, then profitability. No endless burn. One number to know (burn or breakeven) and one rule.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsCoverCostsThenProfit(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_COVER_COSTS_THEN_PROFIT] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userContext = (message.content?.text ?? "").trim();
      const prompt = `${PROMPT_TEMPLATE}

User context:
${userContext}

${BRAND_VOICE}

${ALOHA_STYLE_RULES}

${NAVAL_STRUCTURED_NOTE}

${NO_AI_SLOP}

Answer in the requested structure. Be direct.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_COVER_COSTS_THEN_PROFIT] Failed:", error);
      await callback({
        text: "Cover costs, then profit. One number: monthly burn (or what revenue covers it). One rule: we don't add cost without a path to cover it. Quarterly: closer to breakeven or not?",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "We're burning on API and infra. When do we need to be profitable?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Step one: sum every recurring cost. That's your monthly number to cover. Rule: no new cost without a plan to cover it (revenue, cut elsewhere, or timeline to breakeven). Set a breakeven date and work backward. If you don't know the number, you're burning blind.",
        },
      },
    ],
  ],
};
