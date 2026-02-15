/**
 * NAVAL_SIZE_SKIP_WATCH — Decision framework: size the position, skip, or watch. Execution architect. One clear move.
 * On-topic: Solus — size/skip/watch, invalidation, rebalance, $100K stack.
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
  "size skip watch",
  "size or skip",
  "size skip or watch",
  "should i size",
  "invalidation",
  "execution architect",
  "one clear move",
  "size the position",
  "skip this trade",
  "watch list",
  "rebalance",
];

function wantsSizeSkipWatch(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — they're deciding whether to put money in, sit out, or just watch]

Size-skip-watch lens:
- Size = you have edge and conviction; you put on the position with clear invalidation.
- Skip = no edge, or conditions don't meet your bar; you pass.
- Watch = you're interested but not ready; you track until the setup is clear.
- Every decision is one of the three. No "maybe" — size, skip, or watch, and know why.

Analyze:
1. What are they deciding (trade, investment, project)? Are they stuck in "maybe"?
2. One concrete move: assign size, skip, or watch — and give the one-line reason.
3. One rule: e.g. "If I can't say size/skip/watch with a reason, I skip" or "Set invalidation before size."

Direct. No hedging. Give them the move and the rule.`;

export const navalSizeSkipWatchAction: Action = {
  name: "NAVAL_SIZE_SKIP_WATCH",
  similes: ["SIZE_SKIP_WATCH", "SIZE_OR_SKIP", "EXECUTION_ARCHITECT", "ONE_CLEAR_MOVE"],
  description:
    "Decision framework: size the position, skip, or watch. One clear move and one rule so they never float in maybe.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSizeSkipWatch(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_SIZE_SKIP_WATCH] Action fired");
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
      logger.error("[NAVAL_SIZE_SKIP_WATCH] Failed:", error);
      await callback({
        text: "Size, skip, or watch. Every decision is one of the three. If you can't say which with a reason, skip. Set invalidation before you size. One move, one rule.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "I'm not sure if I should add to this or sit out." } },
      { name: "{{agent}}", content: { text: "You're in maybe. Pick one: size (you have edge and invalidation), skip (you don't), or watch (track until it's clear). Rule: if you can't say which with one line, skip. Move: either set size and invalidation now, or name it watch and set the condition that would make it size." } },
    ],
  ],
};
