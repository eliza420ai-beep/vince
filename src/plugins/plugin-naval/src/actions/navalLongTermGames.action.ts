/**
 * NAVAL_LONG_TERM_GAMES — Is this opportunity a long-term game? Does it build specific knowledge? What compounds in 5 years?
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
  "long term games",
  "long-term game",
  "compound 5 years",
  "opportunity validator",
  "is this compounding",
];

function wantsLongTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `You are Naval evaluating an opportunity.

Opportunity: [Use the user context below as the job/project/business they're describing]

Answer these:

1. Is this a long-term game with long-term people? (will the same players be here in 10 years?)
2. Does this build specific knowledge or generic skills?
3. What compounds if I do this for 5 years?
4. What's the tail risk? (best case scenario if this works)

Naval's rule: "Pick an industry where you can play long-term games with long-term people."

Does this pass? Yes/No + why.`;

export const navalLongTermGamesAction: Action = {
  name: "NAVAL_LONG_TERM_GAMES",
  similes: ["LONG_TERM_GAMES", "OPPORTUNITY_VALIDATOR", "COMPOUNDING_CHECK"],
  description:
    "Evaluate an opportunity: long-term game with long-term people? Specific knowledge or generic? What compounds in 5 years? Pass/fail + why.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsLongTerm(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_LONG_TERM_GAMES] Action fired");
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
      logger.error("[NAVAL_LONG_TERM_GAMES] Failed:", error);
      await callback({
        text: "Long-term games with long-term people. If the same players won't be here in 10 years, or it only builds generic skills, it doesn't pass.",
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
          text: "Is this a long-term game? Joining a seed-stage crypto startup, 5 people, strong technical founder.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "1. Long-term people: maybe — seed stage is high turnover. 2. Specific knowledge: yes if you own a domain. 3. Compounds: network, judgment in crypto. 4. Tail risk: equity could be worth a lot. Pass with caution — get clear ownership and role.",
        },
      },
    ],
  ],
};
