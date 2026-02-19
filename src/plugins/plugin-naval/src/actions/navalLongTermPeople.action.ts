/**
 * NAVAL_LONG_TERM_PEOPLE — Who are long-term people? Who compounds? One relationship to nurture or one to deprioritize.
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
  "long term people naval",
  "compounding relationships",
  "who should I invest in naval",
  "naval relationships",
  "long-term people audit",
];

function wantsLongTermPeople(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - work, friends, collaborators, who they spend time with]

Naval's frame:
- "Play long-term games with long-term people"
- "Compounding relationships make life easier"
- Long-term people = same players in 10 years; trust compounds; no zero-sum games

Analyze:
1. Who are they playing long-term games with? (Who's in it for the decade, not the transaction?)
2. Who compounds? (Makes life easier over time — mutual trust, shared context, no drama.)
3. One relationship to nurture (invest more time/truth) or one to deprioritize (stop over-investing in someone who doesn't compound).

Tie to "Compounding Relationships Make Life Easier." Be direct. No gossip — principles and one concrete move.`;

export const navalLongTermPeopleAction: Action = {
  name: "NAVAL_LONG_TERM_PEOPLE",
  similes: [
    "LONG_TERM_PEOPLE",
    "COMPOUNDING_RELATIONSHIPS",
    "NAVAL_RELATIONSHIPS_AUDIT",
  ],
  description:
    "Who in their life are long-term people? Who compounds? One relationship to nurture or one to deprioritize.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsLongTermPeople(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_LONG_TERM_PEOPLE] Action fired");
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
      logger.error("[NAVAL_LONG_TERM_PEOPLE] Failed:", error);
      await callback({
        text: "Play long-term games with long-term people. Compounding relationships make life easier — same players in 10 years, trust builds. Ask: who compounds? Nurture those. Who doesn't? Deprioritize without drama.",
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
          text: "Long term people naval: I have a few close friends, a co-founder I trust, and a lot of work acquaintances. Who should I invest in?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Long-term people: your co-founder and the close friends who've been there years. They compound — shared context, trust. Work acquaintances are fine but don't over-invest in people who disappear when the project ends. One move: double down on one friend you've neglected; or stop over-investing in one person who takes but doesn't compound.",
        },
      },
    ],
  ],
};
