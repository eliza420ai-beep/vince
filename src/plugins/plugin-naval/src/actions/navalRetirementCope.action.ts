/**
 * NAVAL_RETIREMENT_COPE — Retirement = stop sacrificing today for tomorrow. Do you love it or is it a cope? What changes to get there?
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
  "retirement cope",
  "retirement test",
  "would i do this if wealthy",
  "naval retirement",
  "stop sacrificing today",
];

function wantsRetirement(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `My current work: [Use the user context below - describe their job/business]

Naval's retirement test:
"Retirement is when you stop sacrificing today for an imaginary tomorrow. When today is complete, in and of itself, you're retired."

Be honest:
1. Am I doing this because I love it, or because I think it leads somewhere?
2. Would I do this if I was already wealthy?
3. What parts drain me that I'm justifying as "paying dues"?

If I'm not retired by this definition, what changes would get me there?`;

export const navalRetirementCopeAction: Action = {
  name: "NAVAL_RETIREMENT_COPE",
  similes: ["RETIREMENT_COPE", "RETIREMENT_TEST", "NAVAL_RETIREMENT"],
  description:
    "Retirement = today is complete in itself. Love it or leading somewhere? Would you do it if wealthy? What drains you? What changes get you there?",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsRetirement(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_RETIREMENT_COPE] Action fired");
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
      logger.error("[NAVAL_RETIREMENT_COPE] Failed:", error);
      await callback({
        text: "Retirement is when you stop sacrificing today for tomorrow. When today is complete in itself, you're retired. If you wouldn't do it if wealthy, something's wrong.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Retirement test. I'm in consulting, good pay, hate the travel and politics." } },
      { name: "{{agent}}", content: { text: "1. Love or leads somewhere? — Leads somewhere (pay). 2. If wealthy? — Probably not. 3. Draining: travel, politics — you're paying dues. Changes: niche to remote-only, or build product so you're not selling hours. Get to work you'd do for free." } },
    ],
  ],
};
