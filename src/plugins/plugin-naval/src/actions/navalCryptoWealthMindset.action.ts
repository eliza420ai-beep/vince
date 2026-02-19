/**
 * NAVAL_CRYPTO_WEALTH_MINDSET — Crypto/bitcoin/tokens through Naval's lens: build vs speculate, permissionless upside, earn while you sleep.
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
  "naval crypto",
  "crypto wealth",
  "bitcoin wealth mindset",
  "token mindset naval",
  "build in crypto vs trade",
  "crypto naval",
];

function wantsCryptoWealth(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below - are they holding, building, or considering crypto?]

Naval's lens on crypto/wealth:
- Wealth = assets that earn while you sleep; specific knowledge + leverage
- Creating vs capturing: positive sum (building) vs zero sum (speculation)
- Avoid status games and speculation traps

Analyze:
1. Are they creating or capturing? (Building something people want vs trading/speculating?)
2. Is this speculation or building specific knowledge + leverage?
3. What would "wealth in crypto" look like for them? (e.g. building a product, staking with a thesis, long-term hold with clear reasoning — not price targets.)

Tone: friend over coffee. No price targets or trading advice.`;

export const navalCryptoWealthMindsetAction: Action = {
  name: "NAVAL_CRYPTO_WEALTH_MINDSET",
  similes: [
    "CRYPTO_WEALTH_MINDSET",
    "NAVAL_CRYPTO",
    "BUILD_VS_SPECULATE_CRYPTO",
  ],
  description:
    "Crypto/bitcoin/tokens through Naval's lens: building vs speculating, permissionless upside, earn while you sleep. No price targets.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsCryptoWealth(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_CRYPTO_WEALTH_MINDSET] Action fired");
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

Answer in the requested structure. Be direct. No price targets.

Context (knowledge):\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_CRYPTO_WEALTH_MINDSET] Failed:", error);
      await callback({
        text: "Wealth in crypto = building specific knowledge + leverage (product, protocol, content), not just trading. If you're only speculating, ask: what would the build version look like? Earn while you sleep means something that pays you when you're not watching the chart.",
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
          text: "Naval crypto: I hold BTC and ETH, no building. Wondering if I'm just speculating.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Right now it's mostly speculation — your upside is price. Creation version: use your stack to fund or build something (tool, content, stake in a project) so you're adding value and building specific knowledge. Or get clear on a long-term thesis and treat hold as a deliberate choice, not a bet. Either way, shift some energy toward something that compounds when you're not looking at the chart.",
        },
      },
    ],
  ],
};
