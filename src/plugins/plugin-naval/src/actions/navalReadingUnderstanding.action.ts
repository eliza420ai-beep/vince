/**
 * NAVAL_READING_UNDERSTANDING — Extract 3 mental models from a book, apply to your problem, should you finish, what to read next.
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
  "reading for understanding",
  "mental models in this book",
  "should i finish this book",
  "apply book to problem",
  "extract from book",
];

function wantsReadingUnderstanding(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Book: [Use the user context below - they should name the book and/or their specific problem]

Extract Naval's style:
1. What are the 3 core mental models in this book?
2. How would I apply each one to [YOUR SPECIFIC PROBLEM - use their context]?
3. What does this book assume that might be wrong?

Then:
- Should I finish this book or move on? (Naval abandons books freely)
- What should I read next based on what I'm trying to solve?

No summaries. Only actionable models and direct applications.`;

export const navalReadingUnderstandingAction: Action = {
  name: "NAVAL_READING_UNDERSTANDING",
  similes: [
    "READING_UNDERSTANDING",
    "BOOK_MENTAL_MODELS",
    "SHOULD_I_FINISH_BOOK",
  ],
  description:
    "Extract 3 mental models from a book, apply to your problem, what the book assumes wrong. Should you finish or move on? What to read next.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsReadingUnderstanding(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_READING_UNDERSTANDING] Action fired");
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

Answer in the requested structure. No fluff.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_READING_UNDERSTANDING] Failed:", error);
      await callback({
        text: "Three mental models, how to apply each to your problem, what the book assumes wrong. Then: finish or abandon (Naval abandons freely), and what to read next.",
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
          text: "Reading Antifragile. My problem: deciding whether to leave my job. Extract mental models and apply.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "1. Models: antifragility gains from volatility; optionality; barbell. 2. Apply: quitting is optionality; staying in a role that doesn't stress you = no gain. 3. Assumes: you can afford volatility. Finish if you want the full barbell argument. Next: optionality (Taleb or Naval on decision-making).",
        },
      },
    ],
  ],
};
