/**
 * NAVAL_ESCAPE_COMPETITION — Find 2-3 skill intersections where you're top 10% each, combination unique, demand exists. What would you call yourself?
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
import { ALOHA_STYLE_RULES, NAVAL_STRUCTURED_NOTE, NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "escape competition",
  "skill intersection",
  "monopoly",
  "unique combination",
  "competition is for losers",
];

function wantsEscapeCompetition(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `List my skills/knowledge: [Use the user context below - everything they're decent at]

Naval's insight: "Combine things you're good at until you're the best in the world at that combination."

Find 2-3 skill intersections where:
1. I'm top 10% in each individual skill
2. The combination is unique (almost no one else has all 3)
3. There's actual demand for this combination

Then: What would I call myself? (not job title - identity)

Example: "Developer + Writer + Crypto" = "Technical storyteller for web3"`;

export const navalEscapeCompetitionAction: Action = {
  name: "NAVAL_ESCAPE_COMPETITION",
  similes: ["ESCAPE_COMPETITION", "SKILL_INTERSECTION", "NAVAL_MONOPOLY"],
  description:
    "Find 2-3 skill intersections: top 10% each, unique combo, demand. What would you call yourself (identity, not job title)?",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsEscapeCompetition(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_ESCAPE_COMPETITION] Action fired");
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
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_ESCAPE_COMPETITION] Failed:", error);
      await callback({
        text: "Combine skills until you're the best in the world at that combination. Top 10% in each, unique combo, real demand. Name the identity, not the job title.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Escape competition. I'm good at: writing, crypto, community building, product." } },
      { name: "{{agent}}", content: { text: "Intersection 1: Writing + Crypto + Product = technical PM who can ship and explain. Intersection 2: Crypto + Community + Writing = narrative lead for DAOs. Identity: 'Person who ships and explains crypto product for communities.'" } },
    ],
  ],
};
