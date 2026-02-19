/**
 * NAVAL_ONE_TERMINAL — One place for intel. Stop fragmenting across 20 tools. ClawTerm, Bloomberg-style. One source of truth.
 * On-topic: ClawTerm, "definitive onchain intelligence layer," not 20 fragmented dashboards.
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
  "one terminal",
  "single terminal",
  "one place for intel",
  "too many tools",
  "fragmented dashboards",
  "20 tools",
  "clawterm",
  "bloomberg terminal",
  "one source of truth",
  "consolidate tools",
  "one dashboard",
];

function wantsOneTerminal(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const PROMPT_TEMPLATE = `Context: [Use the user context below — how many places they check for markets, intel, or execution]

One-terminal lens:
- Fragmentation = 20 tabs, Dune then Nansen then DexScreener then Discord. You react to alerts; you don't have a single place that feeds you.
- One terminal = one place (or one command) that gives you the picture. Bloomberg-style: when you open it, you're in the game. No hunting.
- Benefit: you stop context-switching. One open, one read, one move.

Analyze:
1. How many places do they currently use to "get the picture"? List the sprawl.
2. One concrete shift: what could one terminal or one aggregator replace? (Even if it's "one morning command that pulls it all.")
3. One rule: e.g. "I don't open a second tool until I've used the first" or "One URL, one digest — that's my terminal."

Direct. Benefit-led: what they get is one place, not chaos.`;

export const navalOneTerminalAction: Action = {
  name: "NAVAL_ONE_TERMINAL",
  similes: [
    "ONE_TERMINAL",
    "ONE_PLACE_FOR_INTEL",
    "CLAWTERM",
    "STOP_FRAGMENTING",
  ],
  description:
    "One place for intel. Stop fragmenting across 20 tools. One shift so they have one source of truth, not chaos.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsOneTerminal(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[NAVAL_ONE_TERMINAL] Action fired");
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
      logger.error("[NAVAL_ONE_TERMINAL] Failed:", error);
      await callback({
        text: "One terminal: one place (or one command) that gives you the picture. Rule: don't open a second tool until the first has given you what you need. You get one source of truth, not 20 tabs.",
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
          text: "I'm jumping between Dune, DexScreener, Discord, and five other things.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "That's fragmentation. Shift: one place — call it your terminal — that aggregates or one command that pulls it. Rule: one URL or one digest; that's your open. No second tab until you've used the first. You get one place, not chaos.",
        },
      },
    ],
  ],
};
