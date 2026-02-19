/**
 * NAVAL_CREDIBILITY_VS_STATUS — Audit last 6 months: building credibility or chasing status? What to kill, what to double down on.
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
  "credibility vs status",
  "credibility or status",
  "building credibility",
  "status audit",
  "naval audit 6 months",
];

function wantsCredibility(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Naval distinguishes:
- Status = relative position in hierarchy (I'm above you)
- Credibility = trust earned through accountability (I delivered before)

Audit my last 6 months:
[Use the user context below - they describe: projects, posts, career moves, time spent]

For each activity:
- Am I building credibility or chasing status?
- Will this matter in 5 years?
- Would I do this if no one knew about it?

What should I kill? What should I double down on?`;

export const navalCredibilityVsStatusAction: Action = {
  name: "NAVAL_CREDIBILITY_VS_STATUS",
  similes: ["CREDIBILITY_VS_STATUS", "STATUS_AUDIT", "CREDIBILITY_AUDIT"],
  description:
    "Audit last 6 months: credibility (delivered, accountable) vs status (hierarchy, optics). What to kill, what to double down on.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsCredibility(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_CREDIBILITY_VS_STATUS] Action fired");
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
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_CREDIBILITY_VS_STATUS] Failed:", error);
      await callback({
        text: "Credibility = trust from delivering. Status = position in a hierarchy. Kill what's only status. Double down on what builds credibility and would matter in 5 years.",
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
          text: "Credibility vs status audit. Last 6 months: promoted to lead, shipped 2 features, started a newsletter, lots of LinkedIn.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Lead title = status. Shipped features = credibility. Newsletter = credibility if you keep delivering. LinkedIn = status unless it's proof of work. Kill: LinkedIn theater. Double down: ship, newsletter with real takes.",
        },
      },
    ],
  ],
};
