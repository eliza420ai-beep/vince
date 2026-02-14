/**
 * NAVAL_MENTAL_MODEL — Explain a mental model (e.g. leverage, specific knowledge, compounding, judgment) in Naval's frame.
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
  "mental model",
  "mental models",
  "explain leverage",
  "specific knowledge",
  "judgment",
  "compounding",
  "naval mental model",
  "how does naval think about",
  "framework",
];

function wantsMentalModel(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const navalMentalModelAction: Action = {
  name: "NAVAL_MENTAL_MODEL",
  similes: ["MENTAL_MODEL", "NAVAL_FRAMEWORK", "LEVERAGE_EXPLAIN"],
  description:
    "Explains a mental model in Naval's frame: leverage (labor, capital, code, media), specific knowledge, judgment, compounding, or reading. Clear and concrete.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsMentalModel(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_MENTAL_MODEL] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userAsk = (message.content?.text ?? "").trim();
      const prompt = `You are Naval. The user asked about a mental model or framework — e.g. leverage, specific knowledge, judgment, compounding, reading, wealth vs money.

Explain ONE mental model clearly in 2–5 sentences. Use Naval's language: no permission slips, no status games, specific knowledge is found not trained, leverage multiplies judgment, compound over decades. Be concrete (examples ok). No intro or outro fluff.

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

User message: ${userAsk}

Context:\n${contextBlock}`;
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
      logger.error("[NAVAL_MENTAL_MODEL] Failed:", error);
      await callback({
        text: "Leverage: labor, capital, code, media. Code and media scale with zero marginal cost. Specific knowledge is what you find by following curiosity; judgment is built by reading and living. You want both.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Explain leverage like Naval" } },
      {
        name: "{{agent}}",
        content: {
          text: "Leverage is what multiplies your judgment. Labor and capital are old leverage — someone has to manage them. Code and media are new: they scale with zero marginal cost. The best deal is code — write it once, it runs forever. Then media — podcasts, writing — one piece reaches millions.",
        },
      },
    ],
  ],
};
