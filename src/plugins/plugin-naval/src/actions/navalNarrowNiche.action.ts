/**
 * NAVAL_NARROW_NICHE — Narrow until you're the obvious choice. Who has the exact problem? What outcome? "Only person who [X] for [Y]."
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
  "narrow niche",
  "niche down",
  "obvious choice",
  "narrow until obvious",
  "so good you're the obvious choice",
];

function wantsNarrowNiche(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Current positioning: [Use the user context below - how they describe themselves]

Naval's approach: "Be so good at what you do that you're the obvious choice when someone has that specific problem."

Narrow this down:
1. Who has the exact problem I solve best?
2. What's the specific outcome they want?
3. What do I do that others in my field don't?

Keep narrowing until I can say: "I'm the only person who [SPECIFIC THING] for [SPECIFIC PEOPLE]"

If this feels too narrow, explain why that's actually good.`;

export const navalNarrowNicheAction: Action = {
  name: "NAVAL_NARROW_NICHE",
  similes: ["NARROW_NICHE", "NICHE_DOWN", "OBVIOUS_CHOICE"],
  description:
    "Narrow positioning until you're the obvious choice. Who has the exact problem? Specific outcome? I'm the only person who [X] for [Y]. Why too narrow is good.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsNarrowNiche(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_NARROW_NICHE] Action fired");
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

Answer in the requested structure. Be concrete.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_NARROW_NICHE] Failed:", error);
      await callback({
        text: "Narrow until you're the obvious choice for that specific problem. 'I'm the only person who [X] for [Y].' Too narrow is good — less competition, clearer message.",
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
          text: "Narrow niche. I'm a growth consultant for tech startups.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "1. Exact problem: Series A B2B SaaS that need to fix activation in first 90 days. 2. Outcome: 20% activation lift in one quarter. 3. Others don't: you do the first 100 users yourself. 'I'm the only person who does hands-on activation for Series A B2B SaaS.' Narrow = they know exactly when to call you.",
        },
      },
    ],
  ],
};
