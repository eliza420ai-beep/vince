/**
 * NAVAL_MEDITATION_STILLNESS — Why meditation/stillness matters for judgment and peace; one practical way to start or deepen.
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
  "naval meditation",
  "stillness naval",
  "meditation for judgment",
  "mental clarity naval",
  "naval calm",
];

function wantsMeditationStillness(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - are they asking how to start, why it matters, or how to deepen?]

Naval's frame:
- Meditation and stillness sharpen judgment
- Finding peace from mind — not from external conditions
- "On Meditation", "Finding Peace from Mind" (nav.al)

Answer:
1. How does stillness sharpen judgment in Naval's frame? (Clear mind = better decisions; less reactivity; see reality as it is.)
2. One practical step to start or deepen (e.g. 5 min daily, observe thoughts without grabbing, reduce input/clutter). No dogma — no specific app or school required.

Tone: friend over coffee. Brief. No spiritual overload.`;

export const navalMeditationStillnessAction: Action = {
  name: "NAVAL_MEDITATION_STILLNESS",
  similes: ["MEDITATION_STILLNESS", "NAVAL_MEDITATION", "STILLNESS_JUDGMENT"],
  description:
    "Why meditation/stillness matters for judgment and peace. One practical way to start or deepen. No dogma.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsMeditationStillness(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_MEDITATION_STILLNESS] Action fired");
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
      logger.error("[NAVAL_MEDITATION_STILLNESS] Failed:", error);
      await callback({
        text: "Stillness sharpens judgment — less reactivity, clearer decisions. One step: 5 minutes a day, sit and watch your thoughts without following them. Or just reduce input: less scroll, more silence.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Naval meditation: I've never meditated. Why should I and how do I start?" } },
      { name: "{{agent}}", content: { text: "In Naval's frame it's about judgment — a calm mind sees reality better and makes fewer impulsive calls. Start with 5 minutes: sit, breathe, notice thoughts without grabbing them. No app required. Do it daily; the compound effect is clarity over time." } },
    ],
  ],
};
