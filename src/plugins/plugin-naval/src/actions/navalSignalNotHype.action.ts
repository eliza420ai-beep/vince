/**
 * NAVAL_SIGNAL_NOT_HYPE — Battle-tested signal from the trenches. Scar tissue into signal. No hype, no shilling, no timing the market.
 * On-brand: "No hype. No shilling. No timing the market." — LIVETHELIFETV / IKIGAI.
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
import { ALOHA_STYLE_RULES, BRAND_VOICE, NAVAL_STRUCTURED_NOTE, NO_AI_SLOP } from "../utils/alohaStyle";

const TRIGGERS = [
  "signal not hype",
  "battle tested signal",
  "scar tissue",
  "no hype no shilling",
  "no timing the market",
  "signal from the trenches",
  "trenches signal",
  "turned pain into signal",
  "stop shilling",
  "cut the hype",
];

function wantsSignalNotHype(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — how they share takes, post, or advise others]

Signal vs hype (Naval + battle-tested lens):
- Signal = what you've lived. Early, wrong, hurt, still standing. Concrete. No alpha promises, no price targets, no "this is the trade."
- Hype = shilling, timing the market, hopium, second-best. We don't sell hope. We share what we've lived.
- "Battle-tested signal from the trenches" = scar tissue turned into something useful. One person's pattern recognition, clearly labeled.

Analyze:
1. In their last few weeks of content or decisions — are they generating signal or hype? (Be specific.)
2. What would "signal not hype" look like for them? One shift in how they communicate or decide.
3. One rule they can adopt: e.g. "I only share what I've done or would do myself" or "No price targets, only framework."

Direct. No meta-commentary. Give them the rule and the shift.`;

export const navalSignalNotHypeAction: Action = {
  name: "NAVAL_SIGNAL_NOT_HYPE",
  similes: ["SIGNAL_NOT_HYPE", "BATTLE_TESTED_SIGNAL", "SCAR_TISSUE_SIGNAL", "NO_HYPE_NO_SHILLING"],
  description:
    "Battle-tested signal from the trenches. Scar tissue into signal. No hype, no shilling, no timing the market. One shift and one rule.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSignalNotHype(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_SIGNAL_NOT_HYPE] Action fired");
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
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_SIGNAL_NOT_HYPE] Failed:", error);
      await callback({
        text: "Signal = what you've lived. Early, wrong, hurt, still standing. No hype, no shilling, no timing the market. One rule: only share what you've done or would do yourself. No price targets — only framework.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "How do I turn scar tissue into signal? I've been early and wrong a bunch, don't want to shill." } },
      { name: "{{agent}}", content: { text: "Signal is pattern recognition from experience. You're not selling the next trade — you're sharing what you learned when you were early or wrong. Shift: frame every take as 'here's what happened to me, here's what I'd do differently.' Rule: no price targets, no 'this is the call.' Only framework and story. That's battle-tested." } },
    ],
  ],
};
