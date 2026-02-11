/**
 * Plugin Eliza — Knowledge Expansion, Research & Content Production
 *
 * Eliza's dedicated plugin for:
 * - 24/7 knowledge base management and expansion
 * - Content ingestion (articles, YouTube, PDFs)
 * - Long-form essay production (Substack)
 * - Tweet drafting (X/Twitter)
 *
 * Actions:
 * - UPLOAD: Ingest content (text, URLs, YouTube) into knowledge/
 * - ADD_MICHELIN_RESTAURANT: Add Michelin Guide restaurants to knowledge
 * - KNOWLEDGE_STATUS: Check health and coverage of knowledge base
 * - WRITE_ESSAY: Generate Substack essays from knowledge
 * - DRAFT_TWEETS: Create tweet suggestions for @ikigaistudioxyz
 *
 * Eliza uses plugin-inter-agent separately for ASK_AGENT.
 */

import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

// Import actions from plugin-vince (knowledge ingestion)
import { vinceUploadAction } from "../../plugin-vince/src/actions/upload.action";
import { addMichelinRestaurantAction } from "../../plugin-vince/src/actions/addMichelin.action";

// Import Eliza's own actions
import { knowledgeStatusAction } from "./actions/knowledgeStatus.action";
import { writeEssayAction } from "./actions/writeEssay.action";
import { draftTweetsAction } from "./actions/draftTweets.action";

// Re-export upload with Eliza-appropriate name
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
  description: `Eliza's knowledge & content plugin.

📚 KNOWLEDGE MANAGEMENT:
- UPLOAD: Ingest text, URLs, YouTube → knowledge/
- ADD_MICHELIN_RESTAURANT: Michelin Guide links → knowledge/
- KNOWLEDGE_STATUS: Health check on knowledge base

✍️ CONTENT PRODUCTION:
- WRITE_ESSAY: Substack essays (https://ikigaistudio.substack.com/)
- DRAFT_TWEETS: Tweet suggestions for @ikigaistudioxyz`,

  actions: [
    elizaUploadAction,
    elizaMichelinAction,
    knowledgeStatusAction,
    writeEssayAction,
    draftTweetsAction,
  ],

  init: async (_config, runtime: IAgentRuntime) => {
    const hasSummarize =
      !!process.env.OPENAI_API_KEY?.trim() ||
      !!process.env.ANTHROPIC_API_KEY?.trim() ||
      !!process.env.GEMINI_API_KEY?.trim();
    const hasTavily = !!process.env.TAVILY_API_KEY?.trim();

    logger.info(
      `[Eliza Plugin] ✅ Ready — UPLOAD (summarize: ${hasSummarize ? "✓" : "needs key"}), KNOWLEDGE_STATUS, WRITE_ESSAY (Substack), DRAFT_TWEETS (@ikigaistudioxyz), web search: ${hasTavily ? "✓" : "needs TAVILY"}`,
    );
  },
};

// Export all actions
export {
  elizaUploadAction,
  elizaMichelinAction,
  addMichelinRestaurantAction,
  knowledgeStatusAction,
  writeEssayAction,
  draftTweetsAction,
};

export default elizaPlugin;
