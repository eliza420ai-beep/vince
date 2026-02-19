/**
 * NAVAL_SOVEREIGNTY_CONVICTION — Build on conviction alone. No permission. No VCs. Sovereignty over time, money, attention.
 * On-brand: LIVETHELIFETV / IKIGAI — no exit, no second best.
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
  BRAND_VOICE,
  NAVAL_STRUCTURED_NOTE,
  NO_AI_SLOP,
} from "../utils/alohaStyle";

const TRIGGERS = [
  "sovereignty",
  "conviction",
  "no permission",
  "no vcs",
  "build on conviction",
  "no exit",
  "permissionless",
  "own your time",
  "financial sovereignty",
];

function wantsSovereigntyConviction(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — job, side project, funding, or how they make decisions]

Naval + sovereignty lens:
- Wealth and freedom come from owning your time, your stack, and your attention. No one's permission required.
- Building on conviction = you don't need VCs or approval to ship. You underwrite the thesis; you execute.
- "No exit" means the game doesn't end when someone buys you out. You're playing a long-term game.

Analyze:
1. Where are they asking for permission (job, investors, audience) when they could just build?
2. What would "build on conviction alone" look like for them — one concrete shift?
3. One move toward sovereignty (time, money, or attention) they can make this quarter.

Be direct. No hype. No "you should consider" — give them the move.`;

export const navalSovereigntyConvictionAction: Action = {
  name: "NAVAL_SOVEREIGNTY_CONVICTION",
  similes: [
    "SOVEREIGNTY_CONVICTION",
    "NO_PERMISSION",
    "BUILD_ON_CONVICTION",
    "NO_VCs",
  ],
  description:
    "Build on conviction alone: no permission, no VCs. Sovereignty over time, money, attention. One concrete move toward owning the game.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSovereigntyConviction(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_SOVEREIGNTY_CONVICTION] Action fired");
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
          : ((response as { text?: string })?.text ?? String(response));
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[NAVAL_SOVEREIGNTY_CONVICTION] Failed:", error);
      await callback({
        text: "Sovereignty means you don't wait for permission. Build on conviction: underwrite your thesis, then execute. One move — take back time, money, or attention from whoever is renting it from you.",
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
          text: "I want to build on conviction, no VCs. Right now I'm full-time and side-project on weekends.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "You're already trading permission for a salary. Sovereignty move: name one thing you can ship that earns or compounds without your employer's stamp. Ship it. If it gets traction, you've got a wedge. No pitch deck, no approval — just one asset that pays you or builds your name on your terms.",
        },
      },
    ],
  ],
};
