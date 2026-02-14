/**
 * SENTINEL_ART_GEMS — 3–5 concrete gems from elizaOS examples (especially art) with "we could use for X here".
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
  "art gems",
  "examples art",
  "reuse from elizaos art",
  "what can we take from examples",
  "elizaos examples",
  "examples/art",
];

function wantsArtGems(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelArtGemsAction: Action = {
  name: "SENTINEL_ART_GEMS",
  similes: ["ART_GEMS", "EXAMPLES_ART", "REUSE_EXAMPLES"],
  description:
    "Lists 3–5 concrete gems (pattern or file) from elizaOS/examples, especially art, with 'we could use for X here'. Uses knowledge elizaOS/examples/art if ingested; optional web search.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsArtGems(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_ART_GEMS] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const prompt = `You are Sentinel. The user asked for art gems or reusable patterns from elizaOS examples (especially art). Using the context below (internal-docs, any ingested elizaOS/examples/art knowledge), and your knowledge of github.com/elizaOS/examples (especially the art folder), write one short paragraph (flowing prose) with 3–5 concrete gems: for each, name the pattern or file and how we could use it here (e.g. NFT flow, generative UI, asset handling). If context has no art examples, use general elizaOS examples patterns. Refs: elizaOS/examples, elizaOS/examples/art.

${NO_AI_SLOP}

Context:\n${contextBlock}`;
      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_ART_GEMS] Failed:", error);
      await callback({
        text: "Art gems (elizaOS/examples/art): 1) Check the art folder for NFT/generative patterns. 2) Reuse action/provider structure for our ART lane. 3) Ingest examples/art into knowledge for concrete file refs. Refs: github.com/elizaOS/examples, internal-docs.",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What can we take from elizaOS examples art?" } },
      {
        name: "Sentinel",
        content: {
          text: "1) NFT flow pattern in examples/art — we could use for ART asset handling. 2) Generative prompt pattern — we could use for lifestyle/creative outputs. 3) Ingest examples/art into knowledge for exact file refs. Refs: elizaOS/examples/art.",
        },
      },
    ],
  ],
};
