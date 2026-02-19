/**
 * NAVAL_HAPPINESS_DESIRE_AUDIT — Happiness as skill, desire as contract to be unhappy, peace in motion. One desire to drop or one habit for the default.
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
  "happiness audit naval",
  "desire contract",
  "naval happiness",
  "why am I unhappy naval",
  "peace in motion",
  "happiness as skill naval",
];

function wantsHappinessDesireAudit(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - what they want, what bothers them, or why they're asking]

Naval's framework:
- Happiness is a skill you can develop; a default you can train
- Desire is a contract you make to be unhappy until you get it
- The path to peace is truth; happiness is peace in motion
- Not something you pursue after wealth — internal, not external

Analyze:
1. Which desires are contracts to be unhappy? (What are they chasing that keeps them from being at peace now?)
2. Are they chasing something external to feel happy? (Status, approval, a future state?)
3. One concrete step: drop one desire, or add one practice that builds the "happiness default" (e.g. stillness, less comparison, acceptance).

Cite "Happiness Is a Skill", "Desire Is a Contract You Make to Be Unhappy", or "Peace in Motion" where relevant. Be direct and kind.`;

export const navalHappinessDesireAuditAction: Action = {
  name: "NAVAL_HAPPINESS_DESIRE_AUDIT",
  similes: [
    "HAPPINESS_DESIRE_AUDIT",
    "DESIRE_CONTRACT",
    "PEACE_IN_MOTION_AUDIT",
  ],
  description:
    "Happiness as skill, desire as contract to be unhappy. Which desires trap them? What would peace in motion look like? One step: drop a desire or add a practice.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsHappinessDesireAudit(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_HAPPINESS_DESIRE_AUDIT] Action fired");
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

Answer in the requested structure. Be direct and kind.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_HAPPINESS_DESIRE_AUDIT] Failed:", error);
      await callback({
        text: "Happiness is a default you can train. Desire is a contract to be unhappy until you get it. Ask: which desire can I drop? Or what one practice builds the default — stillness, less comparison, truth.",
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
          text: "Happiness audit naval: I'm always anxious about the next milestone — promotion, house, approval from my parents.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Those are desire contracts — you've tied peace to outcomes you don't control. Promotion and house and approval keep moving. One step: pick one (e.g. parental approval) and ask what you'd feel if you stopped needing it. Or add five minutes of stillness daily so the default isn't 'waiting for the next thing.'",
        },
      },
    ],
  ],
};
