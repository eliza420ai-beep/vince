/**
 * Plugin Eliza — Knowledge Expansion & Research
 *
 * Eliza's dedicated plugin for 24/7 research and knowledge base expansion.
 * No trading, no live data — just knowledge ingestion and management.
 *
 * Actions:
 * - UPLOAD: Ingest content (text, URLs, YouTube) into knowledge/
 * - ADD_MICHELIN_RESTAURANT: Add Michelin Guide restaurants to knowledge
 *
 * Eliza uses plugin-inter-agent separately for ASK_AGENT.
 */

import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

// Import actions from plugin-vince (knowledge ingestion only)
import { vinceUploadAction } from "../../plugin-vince/src/actions/upload.action";
import { addMichelinRestaurantAction } from "../../plugin-vince/src/actions/addMichelin.action";

// Re-export with Eliza-appropriate names
const elizaUploadAction = {
  ...vinceUploadAction,
  name: "UPLOAD",
  description: `Upload content to the knowledge base. Supports text, URLs, and YouTube videos.

TRIGGERS:
- "upload:", "save this:", "ingest:", "remember:" — Saves content to knowledge/
- YouTube URLs — Transcribes video and saves transcript + summary
- Article/PDF URLs — Fetches and summarizes via summarize CLI
- Long pasted content (1000+ chars) — Auto-ingests

Use this for expanding the knowledge corpus with research, articles, videos, and frameworks.`,
};

// Keep original name ADD_MICHELIN_RESTAURANT as referenced in Eliza's system prompt
const elizaMichelinAction = addMichelinRestaurantAction;

export const elizaPlugin: Plugin = {
  name: "plugin-eliza",
  description: `Eliza's knowledge expansion plugin. UPLOAD content (text, URLs, YouTube) to knowledge/. ADD_MICHELIN_RESTAURANT for Michelin Guide links in #knowledge channel.`,

  actions: [elizaUploadAction, elizaMichelinAction],

  init: async (_config, runtime: IAgentRuntime) => {
    const hasTavily = !!process.env.TAVILY_API_KEY?.trim();
    const hasSummarize =
      !!process.env.OPENAI_API_KEY?.trim() ||
      !!process.env.ANTHROPIC_API_KEY?.trim() ||
      !!process.env.GEMINI_API_KEY?.trim();

    logger.info(
      `[Eliza Plugin] ✅ Knowledge expansion ready — UPLOAD (summarize: ${hasSummarize ? "available" : "needs API key"}), ADD_MICHELIN_RESTAURANT, web search: ${hasTavily ? "available" : "needs TAVILY_API_KEY"}`,
    );
  },
};

export { elizaUploadAction, elizaMichelinAction, addMichelinRestaurantAction };
export default elizaPlugin;
