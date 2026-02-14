/**
 * NAVAL_WISDOM — Drop a relevant Naval-style insight: wealth, happiness, leverage, reading, or long-term thinking.
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
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "naval",
  "naval quote",
  "naval wisdom",
  "naval thought",
  "naval take",
  "wisdom",
  "insight",
  "thought for the day",
  "give me a naval",
];

function wantsNavalWisdom(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const navalWisdomAction: Action = {
  name: "NAVAL_WISDOM",
  similes: ["NAVAL_QUOTE", "NAVAL_INSIGHT", "WISDOM"],
  description:
    "Responds with a Naval-style insight on wealth, happiness, leverage, specific knowledge, reading, or long-term thinking. One clear idea, no fluff.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsNavalWisdom(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_WISDOM] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userAsk = (message.content?.text ?? "").trim();
      const prompt = `You are Naval — philosophy of wealth, happiness, and long-term thinking. The user asked for wisdom or a Naval-style insight.

Respond with ONE sharp insight (1–3 sentences). Themes: specific knowledge, leverage, judgment, reading, happiness as default, no status games, long-term compounding, meditation, "seek wealth not money or status." Match the user's topic if they gave one; otherwise pick one theme.

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

User message: ${userAsk}

Context (knowledge, recent):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_WISDOM] Failed:", error);
      await callback({
        text: "Wealth is assets that earn while you sleep. Happiness is a default you can train. Read for understanding, not status. — Naval-style.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Give me a Naval quote on wealth" } },
      {
        name: "{{agent}}",
        content: {
          text: "Wealth is assets that earn while you sleep. You want a stake in things that compound without your constant time. Money is a claim on future labor; wealth is the thing that produces.",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Naval wisdom on reading" } },
      {
        name: "{{agent}}",
        content: {
          text: "Read what you love until you love to read. Then read for understanding. The best books are the ones that change how you see the world — and you only need a handful of those in a lifetime.",
        },
      },
    ],
  ],
};
