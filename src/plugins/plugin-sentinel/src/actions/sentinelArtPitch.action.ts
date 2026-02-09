/**
 * SENTINEL_ART_PITCH — Gen art / creative coding ideas in the style of Meridian, QQL, Ringers, Fidenza, XCOPY.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const TRIGGERS = [
  "gen art idea",
  "gen art",
  "xcopy style",
  "xcopy",
  "help with creative coding",
  "creative coding",
  "meridian style",
  "qql style",
  "ringers style",
  "fidenza style",
  "generative art",
  "ideas for gen art",
  "art in the style of",
];

function wantsArtPitch(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelArtPitchAction: Action = {
  name: "SENTINEL_ART_PITCH",
  similes: ["GEN_ART_IDEAS", "XCOPY_STYLE", "CREATIVE_CODING_IDEAS"],
  description:
    "Suggests gen art or creative coding ideas and angles in the style of Meridian, QQL, Ringers, Fidenza, XCOPY; surfaces ART gems from elizaOS examples.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsArtPitch(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<boolean> => {
    logger.debug("[SENTINEL_ART_PITCH] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();

      const prompt = `You are Sentinel. 10% of the time you're locked in on gen art (Meridian, QQL, Ringers, Fidenza style); huge fan of XCOPY. The user asked for gen art or creative coding ideas. Using the context below (internal-docs, sentinel-docs, any elizaOS examples/art knowledge), suggest:
1) 2–4 concrete angles or project ideas in the spirit of Meridian, QQL, Ringers, Fidenza, or XCOPY (generative, algorithmic, on-chain or off).
2) One or two ART gems from elizaOS/examples we could reuse (pattern or file + "we could use for X").
Keep it short: numbered list, one line per item. No preamble. If they named a specific style (e.g. XCOPY, Fidenza), lead with that. Refs: elizaOS/examples/art, knowledge/art-collections.

User message: ${userText}

Context:\n${contextBlock}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : (response as { text?: string })?.text ?? String(response);
      await callback({ text: text.trim() });
      return true;
    } catch (error) {
      logger.error("[SENTINEL_ART_PITCH] Failed:", error);
      await callback({
        text: "Gen art / XCOPY-style ideas: 1) Check elizaOS/examples/art for generative patterns. 2) Meridian/QQL/Ringers/Fidenza = long-form generative, parameters, editions. 3) XCOPY = glitch, motion, crypto-native. Ingest examples/art into knowledge for concrete refs. Refs: github.com/elizaOS/examples, knowledge/art-collections.",
      });
      return false;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Give me a gen art idea in XCOPY style." },
      },
      {
        name: "Sentinel",
        content: {
          text: "1) Glitch/motion loop with parameterized intensity (XCOPY vibe)—we could use for a single-edition generative piece. 2) On-chain trait derivation from seed (Ringers-style)—elizaOS examples/art has NFT flow we could adapt. 3) Ingest examples/art for exact patterns. Refs: elizaOS/examples/art, XCOPY.",
        },
      },
    ],
  ],
};
