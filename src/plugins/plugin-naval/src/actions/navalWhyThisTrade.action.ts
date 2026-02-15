/**
 * NAVAL_WHY_THIS_TRADE — Know why you're in. Explainability, invalidation level. No black box. One level to set.
 * On-topic: WHY THIS TRADE, decision drivers, explainability, no live until you know why.
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
import { ALOHA_STYLE_RULES, BRAND_VOICE, NAVAL_STRUCTURED_NOTE, NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "why this trade",
  "why am i in",
  "invalidation level",
  "when am i wrong",
  "explain the trade",
  "decision drivers",
  "no black box",
  "know why you're in",
  "exit level",
  "when to exit",
  "why did i enter",
];

function wantsWhyThisTrade(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — they're in a trade, position, or commitment and may not have a clear "why" or "when I'm wrong"]

Why-this-trade lens:
- You don't enter without knowing why. You don't stay without knowing when you're wrong. Invalidation = the level or event that proves the thesis is broken.
- No black box: if you can't state the reason and the exit in one sentence each, you're gambling.
- Benefit: you cut losers when the level hits; you don't drift.

Analyze:
1. Do they have a stated "why" and "when I'm wrong" for the thing they're in? If not, that's the gap.
2. One concrete step: write the one-line why and the one-line invalidation. Now.
3. One rule: e.g. "No position without WHY and INVALIDATION written before size" or "If I can't explain it in 10 seconds, I close."

Direct. Give them the two lines (why + invalidation) and the rule.`;

export const navalWhyThisTradeAction: Action = {
  name: "NAVAL_WHY_THIS_TRADE",
  similes: ["WHY_THIS_TRADE", "INVALIDATION_LEVEL", "KNOW_WHY_YOURE_IN", "NO_BLACK_BOX"],
  description:
    "Know why you're in and when you're wrong. One-line why, one-line invalidation. No black box. One rule.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsWhyThisTrade(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_WHY_THIS_TRADE] Action fired");
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
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_WHY_THIS_TRADE] Failed:", error);
      await callback({
        text: "Why this trade: one line why you're in, one line when you're wrong (invalidation). No position without both. Rule: if you can't state them, you don't size.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "I'm in a position but I didn't write down when I'm wrong." } },
      { name: "{{agent}}", content: { text: "That's a gap. Step: write now. Why: one line (e.g. 'structure holds, targeting X'). Invalidation: one line (e.g. 'below Y we're wrong'). Rule: no new position without both written before size. You cut when the level hits; you don't drift." } },
    ],
  ],
};
