/**
 * NAVAL_WEALTH_CREATION_CAPTURE — Creating new value (positive sum) vs capturing existing (zero sum). If pure capture, what would creation look like?
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
  "wealth creation capture",
  "wealth creation vs capture",
  "positive sum zero sum",
  "creating vs capturing wealth",
];

function wantsWealthCreation(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Opportunity: [Use the user context below - job/business/project they're evaluating]

Naval's framework:
- Wealth creation = making something people want (positive sum)
- Wealth capture = extracting value from what exists (zero sum)

Analyze:
1. Am I creating new wealth or capturing existing wealth?
2. Is this a positive-sum game or zero-sum competition?
3. What value am I adding that didn't exist before?
4. Can this scale without my direct time?

If it's pure capture, what would the wealth creation version look like?`;

export const navalWealthCreationCaptureAction: Action = {
  name: "NAVAL_WEALTH_CREATION_CAPTURE",
  similes: [
    "WEALTH_CREATION_CAPTURE",
    "POSITIVE_SUM_ZERO_SUM",
    "CREATING_VS_CAPTURING",
  ],
  description:
    "Analyze opportunity: creating new wealth (positive sum) or capturing existing (zero sum). What value are you adding? If pure capture, what would creation look like?",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsWealthCreation(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_WEALTH_CREATION_CAPTURE] Action fired");
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
      logger.error("[NAVAL_WEALTH_CREATION_CAPTURE] Failed:", error);
      await callback({
        text: "Wealth creation = making something people want (positive sum). Wealth capture = taking from what exists (zero sum). You want to create. If you're only capturing, design the creation version.",
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
          text: "Wealth creation vs capture: I'm a recruiter taking a cut of placements.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Mostly capture — you're taking a cut of existing flows. Creation version: build a product that makes hiring better (e.g. matching, assessment) so you're adding new value. Or niche down so your placement is so good it's creation (outcome-based, you share risk).",
        },
      },
    ],
  ],
};
