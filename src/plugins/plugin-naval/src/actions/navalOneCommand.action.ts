/**
 * NAVAL_ONE_COMMAND — One command that gives you the full picture. Vibe, perps, options, trade today? No ten tabs.
 * On-topic: ALOHA = one command → vibe check + PERPS + OPTIONS + "trade today?"
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
  "one command",
  "single command",
  "full picture",
  "vibe check",
  "aloha",
  "one digest",
  "stop opening tabs",
  "ten tabs",
  "one ask",
  "single ask",
  "everything in one",
];

function wantsOneCommand(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — how they check markets, get intel, or start their day]

One-command lens:
- One command = you get vibe, posture, and "what now?" in one shot. No opening ten tabs or asking five questions.
- Benefit: focus. You spend seconds, not minutes, to know where things stand. The rest is execution or life.
- If they're still running multiple checks or asks, collapse them into one ritual.

Analyze:
1. What do they currently do to "get the picture"? (List the steps or tabs.)
2. One concrete shift: what could one command or one digest replace? Name it (e.g. "ALOHA" or "morning brief").
3. One rule: e.g. "I run [X] once at [time]; that's my picture. No refresh until the next one."

Direct. Benefit-led: what they get is one read, then move.`;

export const navalOneCommandAction: Action = {
  name: "NAVAL_ONE_COMMAND",
  similes: [
    "ONE_COMMAND",
    "ALOHA_ONE_COMMAND",
    "FULL_PICTURE_ONE_ASK",
    "ONE_DIGEST",
  ],
  description:
    "One command gives you the full picture: vibe, perps, options, trade today? One shift so they stop opening ten tabs.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsOneCommand(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_ONE_COMMAND] Action fired");
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
      logger.error("[NAVAL_ONE_COMMAND] Failed:", error);
      await callback({
        text: "One command: run it once and get vibe, perps, options, and whether to trade. One read, then move. Rule: no ten tabs — one command at a set time, then close.",
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
          text: "I open like six things every morning to see where the market is.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "That's six pulls. Shift: one command — call it ALOHA or morning brief — that gives you vibe, perps pulse, options posture, and 'trade today?' in one shot. Rule: run it once when you start; that's your picture. No refresh until the next run. You get one read, then you move.",
        },
      },
    ],
  ],
};
