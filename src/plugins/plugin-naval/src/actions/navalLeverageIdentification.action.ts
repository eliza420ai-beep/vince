/**
 * NAVAL_LEVERAGE_IDENTIFICATION — Which leverage do I have (code, media, labor, capital)? How to acquire? Rank by ease to scale.
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
import { ALOHA_STYLE_RULES, NAVAL_STRUCTURED_NOTE, NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "leverage identification",
  "which leverage",
  "code media labor capital",
  "my leverage",
  "do i have leverage",
];

function wantsLeverage(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `<context>Naval defines leverage as: code (software), media (content with no marginal cost), labor (people working for you), capital (money)</context>

<task>Analyze my current position:
[Use the user context below as: DESCRIBE YOUR SKILLS, RESOURCES, NETWORK, ASSETS]

For each type of leverage, tell me:
- Do I have it? (yes/no + evidence)
- How could I acquire it in 6 months?
- Which type matches my specific knowledge best?
</task>

Rank the 4 types by "easiest for me to scale right now." Show your reasoning.`;

export const navalLeverageIdentificationAction: Action = {
  name: "NAVAL_LEVERAGE_IDENTIFICATION",
  similes: ["LEVERAGE_IDENTIFICATION", "WHICH_LEVERAGE", "MY_LEVERAGE"],
  description:
    "Analyze which leverage (code, media, labor, capital) you have, how to acquire in 6 months, which matches your specific knowledge. Rank by easiest to scale.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsLeverage(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_LEVERAGE_IDENTIFICATION] Action fired");
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

Answer in the requested structure. Be concrete.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_LEVERAGE_IDENTIFICATION] Failed:", error);
      await callback({
        text: "Leverage: code, media, labor, capital. Code and media scale with zero marginal cost. Rank them by what you can actually get in 6 months and what fits your specific knowledge.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Which leverage do I have? I'm a writer with a small audience, no code, some savings." } },
      { name: "{{agent}}", content: { text: "Media: yes — you have audience. Scale: write one thing that compounds (course, book). Code: no — acquire by shipping one tool in 6 months. Labor: no. Capital: some — use to buy time. Rank: media first, then code, then capital, then labor." } },
    ],
  ],
};
