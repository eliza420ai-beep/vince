/**
 * NAVAL_EXPECTED_VALUE — Best case, worst case, probability, EV per option. If you can't decide, the answer is no.
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
  "expected value",
  "ev decision",
  "best case worst case probability",
  "naval decision",
  "expected value calculator",
];

function wantsEV(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Decision: [Use the user context below - what they're deciding]

Options: [They may list 2-3 options in their context. If not, infer or ask.]

For each option, calculate:
- Best case outcome (what if it works perfectly?)
- Worst case outcome (what if it fails completely?)
- Probability of success (be honest, not optimistic)
- Expected value (best case × probability) - (worst case × (1 - probability)) or similar appropriate formula

Naval's rule: "If you can't decide, the answer is no."

Which option has highest EV? Or should I reject all of them?`;

export const navalExpectedValueAction: Action = {
  name: "NAVAL_EXPECTED_VALUE",
  similes: ["EXPECTED_VALUE", "EV_CALCULATOR", "NAVAL_DECISION_EV"],
  description:
    "Expected value calculator: best case, worst case, probability per option. Highest EV or reject all. If you can't decide, the answer is no.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsEV(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_EXPECTED_VALUE] Action fired");
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

Answer in the requested structure. Be concrete with numbers where possible.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_EXPECTED_VALUE] Failed:", error);
      await callback({
        text: "Decide by expected value: best case × P(success) minus worst case × P(fail). If you can't decide, the answer is no.",
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
          text: "Expected value: stay at job (safe, boring) vs quit and freelance. Best/worst/probability for each.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Stay: best = steady growth, worst = stagnation, P high. EV = low variance. Quit: best = 3x income, worst = run out of savings, P medium. EV = higher if P(success) > 0.4. If you can't assign P, answer is no — stay until you have signal.",
        },
      },
    ],
  ],
};
