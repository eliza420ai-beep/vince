/**
 * NAVAL_STARTUP_FOUNDER_CHECK — Should I start? Idea validation through Naval: specific knowledge, leverage, long-term games, accountability.
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
  "should I start a startup",
  "founder check naval",
  "startup idea validation",
  "naval startup",
  "should I found",
  "idea worth pursuing naval",
];

function wantsFounderCheck(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - their idea, background, and situation]

Naval's lens for "should I start?":
- Specific knowledge: Is this something only they can do, or generic?
- Leverage: What leverage do they have or can get? (code, media, labor, capital)
- Long-term games: Is this a long-term game with long-term people?
- Accountability: Will they take real accountability or just chase status?

Evaluate:
1. Is this specific knowledge or generic? (Can it be trained/outsourced?)
2. What leverage do they have or can get in 6–12 months?
3. Long-term game with long-term people? What compounds in 5 years?
4. One-line verdict: start, refine, or don't — and why.

Tie to specific knowledge, leverage, long-term games. Be direct.`;

export const navalStartupFounderCheckAction: Action = {
  name: "NAVAL_STARTUP_FOUNDER_CHECK",
  similes: ["STARTUP_FOUNDER_CHECK", "NAVAL_STARTUP", "IDEA_VALIDATION_NAVAL"],
  description:
    "Should I start? Idea validation through Naval: specific knowledge, leverage, long-term games. Verdict: start, refine, or don't — and why.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsFounderCheck(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_STARTUP_FOUNDER_CHECK] Action fired");
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

Answer in the requested structure. Give a clear verdict.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_STARTUP_FOUNDER_CHECK] Failed:", error);
      await callback({
        text: "Should you start? Check: specific knowledge (only you?), leverage (code/media/labor/capital), long-term game with long-term people. If two of those are weak, refine or wait. If you can't take real accountability, don't start for status.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Founder check naval: B2B tool for dev teams, I'm a solo dev with 10 years backend, no co-founder yet." } },
      { name: "{{agent}}", content: { text: "1. Specific knowledge: yes — you have the domain. 2. Leverage: code + could add media (content). 3. Long-term: B2B can compound with same accounts. 4. Verdict: start, but get one design or distribution ally so you're not only building. Ship a tiny slice and see who cares." } },
    ],
  ],
};
