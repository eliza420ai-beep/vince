/**
 * NAVAL_WEALTH_VS_MONEY — Wealth = assets that earn while you sleep. Money = claim on future labor. How to shift from money toward wealth.
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
  "wealth vs money",
  "assets that earn while you sleep",
  "wealth definition naval",
  "money vs wealth",
  "how to build wealth not money",
];

function wantsWealthVsMoney(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - job, side project, investments, or how they earn]

Naval's framework:
- Wealth = assets that earn while you sleep
- Money = a claim on future labor (you trade time for it)

Analyze:
1. Are they currently earning money or building wealth? (Where does their income come from when they stop working?)
2. What would "earn while you sleep" look like for them specifically?
3. One concrete step to shift the ratio toward wealth (ownership, assets, leverage).

Cite "Seek Wealth, Not Money or Status" where relevant. Be direct.`;

export const navalWealthVsMoneyAction: Action = {
  name: "NAVAL_WEALTH_VS_MONEY",
  similes: [
    "WEALTH_VS_MONEY",
    "EARN_WHILE_YOU_SLEEP",
    "WEALTH_DEFINITION_NAVAL",
  ],
  description:
    "Wealth = assets that earn while you sleep. Money = claim on future labor. Analyze their situation and give one concrete step to shift toward wealth.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsWealthVsMoney(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_WEALTH_VS_MONEY] Action fired");
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
      logger.error("[NAVAL_WEALTH_VS_MONEY] Failed:", error);
      await callback({
        text: "Wealth is assets that earn while you sleep. Money is a claim on future labor. You want to shift from trading time for money toward owning things that work for you. One step: what can you build or buy that pays you when you're not in the room?",
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
          text: "Wealth vs money: I'm a senior dev, high salary, no side projects or investments.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "You're earning money — if you stop coding, the income stops. Wealth would be something that pays you when you're not trading hours: product, content, equity, or assets. One step: ship one small thing that can earn without your direct time (course, tool, stake in a project) and see what sticks.",
        },
      },
    ],
  ],
};
