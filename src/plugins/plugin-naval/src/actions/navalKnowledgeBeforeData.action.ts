/**
 * NAVAL_KNOWLEDGE_BEFORE_DATA — Knowledge = how to think; data = what's happening. Framework before numbers. Trench frameworks.
 * On-topic: Knowledge base, trench frameworks; actions supply data, knowledge supplies how to interpret.
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
  "knowledge before data",
  "framework before numbers",
  "how to think",
  "trench framework",
  "interpret the data",
  "knowledge vs data",
  "mental model then data",
  "lens then numbers",
  "theory before chart",
  "framework then facts",
];

function wantsKnowledgeBeforeData(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — are they drowning in data without a lens, or do they have a framework?]

Knowledge-before-data lens:
- Data = what's happening (prices, flows, headlines). Knowledge = how to think (frameworks, strike logic, meme lifecycle, when to size/skip/watch).
- Without a framework, data is noise. With one, data answers a question. You interpret through a lens, not raw numbers.
- Benefit: you stop reacting to every tick; you ask "what does this mean given my framework?"

Analyze:
1. Where are they data-heavy but framework-light? (Lots of inputs, no clear "how I decide.")
2. One concrete step: name one framework they could adopt or write (e.g. "invalidation before size," "positive sum vs capture," "signal not hype") and use it to filter the next 10 data points.
3. One rule: e.g. "I don't look at data until I've stated my framework for this decision" or "One lens per session."

Direct. Benefit-led: what they get is interpretation, not overload.`;

export const navalKnowledgeBeforeDataAction: Action = {
  name: "NAVAL_KNOWLEDGE_BEFORE_DATA",
  similes: [
    "KNOWLEDGE_BEFORE_DATA",
    "FRAMEWORK_BEFORE_NUMBERS",
    "TRENCH_FRAMEWORK",
    "LENS_THEN_DATA",
  ],
  description:
    "Knowledge = how to think; data = what's happening. One framework to adopt and one rule so they interpret, not overload.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsKnowledgeBeforeData(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_KNOWLEDGE_BEFORE_DATA] Action fired");
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
      logger.error("[NAVAL_KNOWLEDGE_BEFORE_DATA] Failed:", error);
      await callback({
        text: "Knowledge is how to think; data is what's happening. Pick one framework — invalidation before size, signal not hype, size/skip/watch — and run the next 10 data points through it. Rule: no data dive without a lens.",
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
          text: "I have so many data sources I don't know how to use them.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "You're data-heavy, framework-light. Step: name one lens — e.g. 'size/skip/watch with invalidation.' Run the next 10 inputs through that. Rule: one framework per decision. You get interpretation, not overload.",
        },
      },
    ],
  ],
};
