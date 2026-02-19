/**
 * NAVAL_PAPER_BEFORE_LIVE — Paper trade, learn, then optional real money. Don't bet the farm. Aligns with paper bot, avoid ruin.
 * On-topic: Self-improving paper bot, ML loop, no live execution until proven.
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
  "paper before live",
  "paper trading first",
  "paper then real",
  "don't bet the farm",
  "prove it paper",
  "learn then trade",
  "simulate first",
  "paper bot",
  "avoid ruin",
  "when to go live",
  "paper to live",
];

function wantsPaperBeforeLive(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — are they trading live, paper, or thinking about it?]

Paper-before-live lens:
- Paper = you learn with no ruin risk. Every trade is stored; the system improves. When you go live, you're not guessing.
- Ruin = one bad bet that wipes you out. Kelly, position sizing, invalidation — all of that gets tested on paper first.
- Benefit: prove the edge, then size. No "I'll figure it out with real money."

Analyze:
1. Are they paper-first or already live? If live, are they sized so one bad run can't ruin them?
2. One concrete step: e.g. "Run 90 trades paper, then review WHY THIS TRADE and PnL before a single live dollar" or "Set invalidation level before every position."
3. One rule: when do they allow themselves to go live (or add size)?

Direct. No hype. Give them the step and the rule.`;

export const navalPaperBeforeLiveAction: Action = {
  name: "NAVAL_PAPER_BEFORE_LIVE",
  similes: [
    "PAPER_BEFORE_LIVE",
    "PAPER_THEN_LIVE",
    "DONT_BET_THE_FARM",
    "PROVE_IT_PAPER",
  ],
  description:
    "Paper trade, learn, then optional real money. Don't bet the farm. One step and one rule for when to go live.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsPaperBeforeLive(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_PAPER_BEFORE_LIVE] Action fired");
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
      logger.error("[NAVAL_PAPER_BEFORE_LIVE] Failed:", error);
      await callback({
        text: "Paper before live. Run enough paper trades that you see WHY THIS TRADE and PnL. Set invalidation before every position. One rule: no live size until paper shows you're not betting the farm.",
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
          text: "When should I switch from paper to live? I've done 50 paper trades.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "50 is a start; 90+ gives the system enough to learn and you enough to see pattern. Step: review WHY THIS TRADE and net PnL. If you're not sizing so one bad run can't ruin you, stay paper. Rule: go live only when you have invalidation levels and position size that passes the ruin test.",
        },
      },
    ],
  ],
};
