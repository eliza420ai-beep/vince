/**
 * NAVAL_TOUCH_GRASS — Live well so you don't burn out. Step away. Kelly lane: balance, not 12h screens. One rule for when to step away.
 * On-topic: Kelly, lifestyle, "treat crypto to live well, not be consumed."
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
  "touch grass",
  "burnout",
  "step away",
  "live well",
  "not be consumed",
  "balance trading",
  "screens 12 hours",
  "when to stop",
  "recharge",
  "lifestyle balance",
  "kelly lane",
  "touch grass naval",
];

function wantsTouchGrass(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — how they work: hours, screens, when they stop]

Touch-grass lens:
- The point isn't to be consumed by the game. It's to stay in the game and live well. Burnout kills edge and judgment.
- One rule: when do they step away? (Time, trigger, or ritual.) No "I'll stop when it's done" — it's never done.
- Benefit: you get focus when you're on and peace when you're off. Better decisions, not more hours.

Analyze:
1. Where are they over the line? (No stop time, no ritual, checking after hours.)
2. One concrete rule: e.g. "No charts after 8pm" or "One ALOHA in the morning, then close until the push" or "Weekends = no trading, only life."
3. One ritual: what do they do instead when they step away? (Dining, wine, move, read — something that isn't another screen.)

Direct. Benefit-led: what they get is sustainability and better judgment.`;

export const navalTouchGrassAction: Action = {
  name: "NAVAL_TOUCH_GRASS",
  similes: [
    "TOUCH_GRASS",
    "LIVE_WELL_NOT_CONSUMED",
    "STEP_AWAY",
    "BALANCE_TRADING",
  ],
  description:
    "Live well so you don't burn out. One rule for when to step away and one ritual that isn't another screen.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsTouchGrass(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_TOUCH_GRASS] Action fired");
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
      logger.error("[NAVAL_TOUCH_GRASS] Failed:", error);
      await callback({
        text: "Touch grass: the game never ends. Set one rule — when you step away (time, or after one digest). One ritual that isn't a screen: move, eat well, wine, read. You get sustainability and better judgment.",
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
          text: "I'm glued to charts. How do I touch grass without feeling I'm missing out?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "You're not missing out; you're preserving edge. Rule: one ALOHA in the morning, then close the tab until the next push. No chart refresh in between. Ritual: after you read it, do one thing that isn't a screen — walk, meal, call. The push will still be there. You get focus when on, peace when off.",
        },
      },
    ],
  ],
};
