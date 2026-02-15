/**
 * NAVAL_THESIS_FIRST — Underwrite your thesis before you execute. Thesis → execution. No hype, no shipping without a spine.
 * On-brand: "Thesis first. Underwritten on Substack. Executed by agents."
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
  "thesis first",
  "thesis before execution",
  "underwrite thesis",
  "what's my thesis",
  "thesis then execute",
  "write thesis",
  "thesis then ship",
  "spine of my work",
];

function wantsThesisFirst(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — what they're building, trading, or deciding]

Thesis-first lens:
- You underwrite the thesis (in writing, in public or private) before you execute. That becomes your spine. No shipping without a view.
- Thesis = what you believe and why. Execution = what you do with that belief. Order matters.
- If you can't state your thesis in a few sentences, you're reacting, not building.

Analyze:
1. What thesis are they actually operating on? (Or what do they think it is?)
2. Is their current execution aligned with that thesis, or are they drifting?
3. One concrete step: write or sharpen the thesis (Substack post, one-pager, or internal doc) before the next big move.

Direct. No filler. Give them the step.`;

export const navalThesisFirstAction: Action = {
  name: "NAVAL_THESIS_FIRST",
  similes: ["THESIS_FIRST", "UNDERWRITE_THESIS", "THESIS_THEN_EXECUTE", "THESIS_BEFORE_SHIP"],
  description:
    "Underwrite your thesis before you execute. State what you believe; then ship. One step to write or sharpen the thesis before the next move.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsThesisFirst(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_THESIS_FIRST] Action fired");
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
      logger.error("[NAVAL_THESIS_FIRST] Failed:", error);
      await callback({
        text: "Thesis first: write what you believe and why. Then execute. If you can't state it in a few sentences, you're reacting. One step: put the thesis on paper before the next big move.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Thesis first — I'm jumping into a new project but I haven't written down why." } },
      { name: "{{agent}}", content: { text: "Your thesis is your spine. Right now you're moving without one. Step: before the next sprint, write one page. What do you believe about this space, this product, and why are you the one building it? Ship that to yourself or Substack. Then execute. Everything you do should trace back to that page." } },
    ],
  ],
};
