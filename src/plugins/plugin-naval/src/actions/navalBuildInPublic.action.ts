/**
 * NAVAL_BUILD_IN_PUBLIC — Should I build this publicly? Accountability vs risk. Worst outcome if it flops. What to share weekly.
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
  "build in public",
  "building in public",
  "accountability leverage",
  "share publicly",
  "build publicly naval",
];

function wantsBuildInPublic(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Project: [Use the user context below - what they're building]

Naval's test:
"If you have high accountability and high risk, you get high returns."

Should I build this publicly?

1. What am I accountable for if this fails? (reputation, time, money)
2. What leverage do I gain by being public? (audience, feedback, credibility)
3. What's the worst thing someone could say if this flops?
4. Am I okay with that outcome?

Then: What would I share weekly to build in public without being cringe?`;

export const navalBuildInPublicAction: Action = {
  name: "NAVAL_BUILD_IN_PUBLIC",
  similes: ["BUILD_IN_PUBLIC", "ACCOUNTABILITY_LEVERAGE", "SHARE_PUBLICLY"],
  description:
    "Should you build publicly? Accountability if it fails, leverage from being public, worst outcome, OK with it? What to share weekly without being cringe.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsBuildInPublic(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_BUILD_IN_PUBLIC] Action fired");
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
      logger.error("[NAVAL_BUILD_IN_PUBLIC] Failed:", error);
      await callback({
        text: "High accountability + high risk = high returns. Build in public if you're okay with the worst thing someone could say. Share weekly: progress, lessons, one real number.",
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
          text: "Build in public? I'm building a small SaaS for indie devs.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "1. Accountable: reputation, time. 2. Leverage: early users, feedback, credibility. 3. Worst: 'another failed indie project.' 4. OK? If yes — share weekly: one metric (MRR, signups), one lesson, one build. No humble brag. Real numbers.",
        },
      },
    ],
  ],
};
