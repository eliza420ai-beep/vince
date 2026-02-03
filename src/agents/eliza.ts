/**
 * Eliza Agent - KNOWLEDGE Q&A
 *
 * General-purpose assistant for chatting with the knowledge base.
 * Uses the same knowledge/ directories as VINCE but with a neutral,
 * helpful persona—ideal for exploring frameworks, methodologies, and
 * research without the trading-focused lens.
 */

import { type IAgentRuntime, type ProjectAgent } from "@elizaos/core";
import { character } from "../character.ts";
import sqlPlugin from "@elizaos/plugin-sql";
import bootstrapPlugin from "@elizaos/plugin-bootstrap";
import anthropicPlugin from "@elizaos/plugin-anthropic";
import openaiPlugin from "@elizaos/plugin-openai";

const elizaAgent: ProjectAgent = {
  character,
  init: async (_runtime: IAgentRuntime) => {
    // Eliza is ready for knowledge Q&A
  },
  plugins: [
    sqlPlugin,
    bootstrapPlugin,
    ...(process.env.ANTHROPIC_API_KEY?.trim() ? [anthropicPlugin] : []),
    ...(process.env.OPENAI_API_KEY?.trim() ? [openaiPlugin] : []),
  ],
};

export { elizaAgent };
