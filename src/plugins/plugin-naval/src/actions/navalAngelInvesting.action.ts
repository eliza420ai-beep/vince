/**
 * NAVAL_ANGEL_INVESTING — Should they angel invest? How to think about early-stage bets (founder, thesis, check size, avoid ruin). Framework only.
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
  NAVAL_STRUCTURED_NOTE,
  NO_AI_SLOP,
} from "../utils/alohaStyle";

const TRIGGERS = [
  "angel invest naval",
  "should I angel invest",
  "naval angel",
  "early stage investing naval",
  "how to angel invest",
];

function wantsAngelInvesting(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - experience, capital, goals, stage of life]

Naval's frame (from "How to Angel Invest"):
- Angel investing = early-stage bets on founders and ideas
- Long-term people, specific knowledge, avoid ruin on any single check
- Not deal advice — framework: when it fits, what to optimize for

Analyze:
1. Is angel investing a fit for their situation? (Capital they can afford to lose, timeline that allows 7–10 year holds, access to deal flow or co-investors?)
2. Naval-style principles: bet on long-term people, align with specific knowledge you understand, never bet so much on one deal that it's ruin.
3. One concrete takeaway (e.g. start with small checks and learn, or focus on one thesis, or "not yet — build wealth first").

Cite "How to Angel Invest" where relevant. Framework only — no specific deal or legal advice.`;

export const navalAngelInvestingAction: Action = {
  name: "NAVAL_ANGEL_INVESTING",
  similes: ["ANGEL_INVESTING_NAVAL", "NAVAL_ANGEL", "EARLY_STAGE_INVESTING"],
  description:
    "Should they angel invest? How to think about early-stage bets: founder, thesis, check size, avoid ruin. Framework only.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsAngelInvesting(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_ANGEL_INVESTING] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userContext = (message.content?.text ?? "").trim();
      const prompt = `${PROMPT_TEMPLATE}

User context:
${userContext}

${ALOHA_STYLE_RULES}

${NAVAL_STRUCTURED_NOTE}

${NO_AI_SLOP}

Answer in the requested structure. Be direct. Framework only.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_ANGEL_INVESTING] Failed:", error);
      await callback({
        text: "Angel investing: bet on long-term people and ideas you understand. Size checks so no single loss is ruin. If you don't have capital you can lose or 7–10 year patience, build wealth first. See Naval's 'How to Angel Invest' on nav.al.",
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
          text: "Should I angel invest? I have some savings, 10 years in tech, no investing experience.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Fit: you have domain and potentially access. Principle: only invest what you can afford to lose; one check shouldn't be ruin. One takeaway: start with small checks (e.g. 1–2% of investable) in founders you'd back with your time. Learn the game before scaling. Naval: long-term people, avoid ruin on any single bet.",
        },
      },
    ],
  ],
};
