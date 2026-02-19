/**
 * NAVAL_AVOID_RUIN — Judgment, Kelly, don't bet the farm. For a bet they're making: are they risking ruin? One adjustment.
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
  "avoid ruin naval",
  "kelly criterion naval",
  "am I risking ruin",
  "naval judgment",
  "position sizing naval",
  "don't go broke",
];

function wantsAvoidRuin(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - the bet they're making: job quit, investment, startup, big move, etc.]

Naval's frame:
- "Judgment Is the Decisive Skill"
- "Kelly Criterion: Avoid Ruin" — don't bet so much that one bad outcome wipes you out
- Position sizing: can you survive the worst case and keep playing?

Analyze:
1. What's the worst-case outcome of this bet? (Be concrete.)
2. Is that ruin? (Can they not recover — financially, psychologically, or in reputation?)
3. How would they size the bet or add a floor so they avoid ruin? (e.g. keep 12 months runway, don't put all capital in one thing, have a walk-away line.)

Reference Kelly / avoid ruin. No formal math required — principle over formula. One concrete adjustment.`;

export const navalAvoidRuinAction: Action = {
  name: "NAVAL_AVOID_RUIN",
  similes: ["AVOID_RUIN", "KELLY_CRITERION_NAVAL", "POSITION_SIZING_NAVAL"],
  description:
    "For a decision or bet: are they risking ruin? Size the bet so one bad outcome doesn't wipe them out. Kelly / avoid ruin. One adjustment.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsAvoidRuin(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_AVOID_RUIN] Action fired");
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
      logger.error("[NAVAL_AVOID_RUIN] Failed:", error);
      await callback({
        text: "Avoid ruin: don't bet so much that one bad outcome ends the game. What's your worst case? If that's unrecoverable, size down — keep runway, diversify, or set a walk-away line. Judgment is the decisive skill.",
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
          text: "Avoid ruin naval: I'm thinking of quitting my job and going all-in on my startup. 6 months runway, no other income.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Worst case: 6 months pass, no revenue, you're out of cash and need a job under pressure. That's close to ruin — you lose negotiating power and peace. One adjustment: extend runway to 12 months (save, part-time, or a small round) or get a clear milestone that triggers 'get a job' so you're not betting everything with no exit.",
        },
      },
    ],
  ],
};
