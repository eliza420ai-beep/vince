/**
 * NAVAL_PRODUCTIZE_YOURSELF — 12-month roadmap: build, sell, scale. Learn to sell + learn to build = unstoppable.
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
  "productize myself",
  "productize yourself",
  "sell and build",
  "12 month roadmap",
  "learn to sell learn to build",
];

function wantsProductize(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Naval's framework: Selling + Building = Unstoppable

About me:
[Use the user context below. They should describe:]
- Building skills: [WHAT YOU CAN CREATE - code, design, writing, etc.]
- Selling skills: [WHAT YOU CAN PERSUADE - pitching, marketing, negotiating]

Create a 12-month roadmap to "productize myself":

**Months 1-3:** [What to build/learn]
**Months 4-6:** [How to sell it]
**Months 7-9:** [Scale/automate]
**Months 10-12:** [Expected outcome]

Focus on intersection of specific knowledge + leverage. No generic advice.`;

export const navalProductizeYourselfAction: Action = {
  name: "NAVAL_PRODUCTIZE_YOURSELF",
  similes: ["PRODUCTIZE_YOURSELF", "SELL_AND_BUILD", "TWELVE_MONTH_ROADMAP"],
  description:
    "12-month roadmap to productize yourself: build (1-3), sell (4-6), scale (7-9), outcome (10-12). Specific knowledge + leverage.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsProductize(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_PRODUCTIZE_YOURSELF] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userContext = (message.content?.text ?? "").trim();
      const prompt = `${PROMPT_TEMPLATE}

User context:
${userContext}

${NO_AI_SLOP}

Answer in the requested structure. Be specific to them.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_PRODUCTIZE_YOURSELF] Failed:", error);
      await callback({
        text: "Learn to sell, learn to build. If you can do both, you're unstoppable. Roadmap: 1-3 build, 4-6 sell it, 7-9 scale, 10-12 outcome. Tie to your specific knowledge and leverage.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Productize myself. Building: code + design. Selling: weak, can write." } },
      { name: "{{agent}}", content: { text: "Months 1-3: Ship one product (design + code). Months 4-6: Write about it, one piece per week. Months 7-9: Automate or template the offer. Months 10-12: First paid cohort or product. Focus: your combo is the product." } },
    ],
  ],
};
