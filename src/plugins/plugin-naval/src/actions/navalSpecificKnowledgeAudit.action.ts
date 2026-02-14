/**
 * NAVAL_SPECIFIC_KNOWLEDGE_AUDIT — Naval analyzing career for specific knowledge (can't be trained, from experience, do for free, authentic).
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
  "specific knowledge audit",
  "specific knowledge",
  "what only i can do",
  "career audit naval",
  "can't be trained",
];

function wantsAudit(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `You are Naval Ravikant analyzing my career for specific knowledge.

About me: [Use the user context below as the person's background - work history, hobbies, weird interests, things they're known for]

Answer:
1. What specific knowledge do I have that can't be trained? (look for intersections no one else has)
2. What do I know from experience that can't be learned in school?
3. What would I do for free that people will eventually pay me for?
4. Where am I authentic that others are faking it?

Be ruthless. If I don't have specific knowledge yet, tell me where to build it.`;

export const navalSpecificKnowledgeAuditAction: Action = {
  name: "NAVAL_SPECIFIC_KNOWLEDGE_AUDIT",
  similes: ["SPECIFIC_KNOWLEDGE_AUDIT", "CAREER_AUDIT_NAVAL"],
  description:
    "Naval-style audit: find specific knowledge that can't be trained, from experience, what you'd do for free, where you're authentic. Be ruthless.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsAudit(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_SPECIFIC_KNOWLEDGE_AUDIT] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userContext = (message.content?.text ?? "").trim();
      const prompt = `${PROMPT_TEMPLATE}

User context:
${userContext}

${NO_AI_SLOP}

Answer in the requested structure. Be ruthless and concrete.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_SPECIFIC_KNOWLEDGE_AUDIT] Failed:", error);
      await callback({
        text: "Specific knowledge is what you find by following curiosity — intersections no one else has. If you don't have it yet, build it where you're willing to do the work for free.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Run the specific knowledge audit. About me: 10 years fintech, design + code, love systems." } },
      { name: "{{agent}}", content: { text: "1. Specific knowledge: fintech + design + systems — few have that combo. 2. From experience: how compliance and UX collide. 3. For free: you'd design better dashboards. 4. Authentic: you care about clarity; others fake the polish. Build: write and ship one product in public." } },
    ],
  ],
};
