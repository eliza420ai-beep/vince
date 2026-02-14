/**
 * NAVAL_ACCOUNTABILITY_AUTHENTICITY — Authentic or looks good? Willing to be publicly accountable? What if no one was watching?
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
  "accountability authenticity",
  "authentic or status",
  "naval test decision",
  "nothing to hide nothing to prove",
];

function wantsAccountability(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `I'm considering: [Use the user context below as the decision/career move they're describing]

Naval's test:
- "If you're authentic, you have nothing to hide and nothing to prove"
- "Take accountability so people know who to credit or blame"

Be honest:
1. Am I doing this because it's authentic to me, or because it looks good?
2. Am I willing to be publicly accountable for this outcome?
3. What would I do if no one was watching and I couldn't brag about it?

If this fails the authenticity test, what would pass it?`;

export const navalAccountabilityAuthenticityAction: Action = {
  name: "NAVAL_ACCOUNTABILITY_AUTHENTICITY",
  similes: ["ACCOUNTABILITY_AUTHENTICITY", "AUTHENTICITY_TEST", "NAVAL_DECISION_TEST"],
  description:
    "Naval's test: authentic or for show? Willing to be publicly accountable? What would you do if no one was watching? If it fails, what would pass?",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsAccountability(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_ACCOUNTABILITY_AUTHENTICITY] Action fired");
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
      logger.error("[NAVAL_ACCOUNTABILITY_AUTHENTICITY] Failed:", error);
      await callback({
        text: "Authentic: nothing to hide, nothing to prove. Accountable: people know who to credit or blame. If you wouldn't do it with no one watching, it's not authentic.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Considering taking a VP title at a growth-stage company. Accountability vs authenticity?" } },
      { name: "{{agent}}", content: { text: "1. Authentic or looks good? — Does the work excite you or the title? 2. Publicly accountable? — Can you own the outcome in public? 3. If no one watching? — Would you still want the job? If it's mostly title, what would pass: a role where you'd do the work even without the title." } },
    ],
  ],
};
