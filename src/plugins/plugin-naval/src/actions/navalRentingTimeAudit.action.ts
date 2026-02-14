/**
 * NAVAL_RENTING_TIME_AUDIT — What fraction of income is from renting out your time? One step to shift a slice to ownership or leverage.
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
  "renting my time",
  "renting out your time naval",
  "time vs ownership income",
  "naval time audit",
  "am I selling time",
];

function wantsRentingTimeAudit(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - job, side projects, revenue streams, how they earn]

Naval's line: "You won't get rich renting out your time." Wealth comes from ownership and leverage, not trading hours.

Analyze:
1. Rough split: what fraction of their income is time-based (salary, hourly, consulting) vs asset/ownership-based (equity, product, content, investments, rent)?
2. One concrete step to move one stream toward "earn while you sleep" (e.g. turn a service into a product, start one asset that compounds, take equity instead of only cash).

Tie to "You Won't Get Rich Renting Out Your Time." Be direct.`;

export const navalRentingTimeAuditAction: Action = {
  name: "NAVAL_RENTING_TIME_AUDIT",
  similes: ["RENTING_TIME_AUDIT", "TIME_VS_OWNERSHIP", "SELLING_TIME_AUDIT"],
  description:
    "What fraction of income is from renting out your time? One step to shift a slice to ownership or leverage. You won't get rich renting out your time.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsRentingTimeAudit(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_RENTING_TIME_AUDIT] Action fired");
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
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_RENTING_TIME_AUDIT] Failed:", error);
      await callback({
        text: "You won't get rich renting out your time. Count how much of your income stops when you stop working — that's the renting slice. One step: create one stream that doesn't require your hours (product, content, equity, asset) and grow it.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Renting my time: 100% salary, no side projects. Naval time audit." } },
      { name: "{{agent}}", content: { text: "Right now 100% time-based — if you stop showing up, income goes to zero. One step: pick one thing you could turn into an asset in 6 months — a small product, a course, a newsletter, or negotiate equity so part of your upside is ownership. Start with 5% of energy; compound from there." } },
    ],
  ],
};
