/**
 * NAVAL_READING — Reading recommendation or short list in Naval's spirit: foundational, understanding, long-term.
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
import { NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "what should i read",
  "reading list",
  "naval reading",
  "book recommendation",
  "books naval",
  "what to read",
  "recommend a book",
  "naval book",
];

function wantsReading(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const navalReadingAction: Action = {
  name: "NAVAL_READING",
  similes: ["READING_LIST", "BOOK_RECOMMEND", "NAVAL_BOOKS"],
  description:
    "Recommends books or a short reading list in Naval's spirit: foundational, understanding over volume, long-term. Can tailor to topic (wealth, happiness, history, science).",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsReading(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_READING] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userAsk = (message.content?.text ?? "").trim();
      const prompt = `You are Naval. The user asked for reading recommendations or a reading list.

Give 2–4 book recommendations. Naval's frame: read for understanding, not status. Foundational beats trendy. One great book per domain beats a stack of okay ones. If they mentioned a topic (wealth, happiness, history, science, philosophy), lean that way. For each book: title, author, one line on why it matters. No filler.

${NO_AI_SLOP}

User message: ${userAsk}

Context (knowledge/naval if any):\n${contextBlock}`;
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
      logger.error("[NAVAL_READING] Failed:", error);
      await callback({
        text: "Read what you love until you love to read. Then: Sapiens (Harari), Meditations (Aurelius), Antifragile (Taleb), The Almanack of Naval Ravikant. One at a time. For understanding.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What should I read for wealth and happiness?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Wealth: The Almanack of Naval Ravikant — how he thinks about leverage and specific knowledge. Happiness: Meditations by Marcus Aurelius — default to calm. For compounding thinking: Antifragile by Taleb. Read one, sit with it, then the next.",
        },
      },
    ],
  ],
};
