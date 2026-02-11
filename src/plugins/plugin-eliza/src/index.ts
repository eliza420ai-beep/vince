/**
 * Plugin Eliza — Knowledge Expansion, Research & Content Production
 *
 * Eliza's dedicated plugin for:
 * - 24/7 knowledge base management and expansion
 * - Content ingestion (articles, YouTube, PDFs)
 * - Long-form essay production (Substack)
 * - Tweet drafting (X/Twitter)
 * - Voice learning and brand consistency
 *
 * Actions:
 * - UPLOAD: Ingest content (text, URLs, YouTube) into knowledge/
 * - ADD_MICHELIN_RESTAURANT: Add Michelin Guide restaurants to knowledge
 * - KNOWLEDGE_STATUS: Check health and coverage of knowledge base
 * - WRITE_ESSAY: Generate Substack essays from knowledge (voice-aware)
 * - DRAFT_TWEETS: Create tweet suggestions for @ikigaistudioxyz (voice-aware)
 * - REPURPOSE: Transform content between formats (essay↔thread↔linkedin)
 * - RESEARCH_QUEUE: Batch queue for content ingestion
 * - SUGGEST_TOPICS: AI-powered topic suggestions based on gaps & trends
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
import { repurposeAction } from "./actions/repurpose.action";
import { researchQueueAction } from "./actions/researchQueue.action";
import { suggestTopicsAction } from "./actions/suggestTopics.action";

// Import services
import { analyzeVoice } from "./services/voice.service";

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
- RESEARCH_QUEUE: Batch queue for content ingestion

✍️ CONTENT PRODUCTION:
- WRITE_ESSAY: Substack essays (voice-aware)
- DRAFT_TWEETS: Tweet suggestions (voice-aware)
- REPURPOSE: Transform content between formats

💡 INTELLIGENCE:
- SUGGEST_TOPICS: AI topic suggestions (gaps + trends)
- Voice learning from existing content`,

  actions: [
    elizaUploadAction,
    elizaMichelinAction,
    knowledgeStatusAction,
    writeEssayAction,
    draftTweetsAction,
    repurposeAction,
    researchQueueAction,
    suggestTopicsAction,
  ],

  init: async (_config, runtime: IAgentRuntime) => {
    const hasSummarize =
      !!process.env.OPENAI_API_KEY?.trim() ||
      !!process.env.ANTHROPIC_API_KEY?.trim() ||
      !!process.env.GEMINI_API_KEY?.trim();
    const hasTavily = !!process.env.TAVILY_API_KEY?.trim();

    // Pre-analyze voice on startup
    try {
      const profile = analyzeVoice();
      logger.info(
        `[Eliza Plugin] Voice profile loaded (${profile.analyzedFiles} files analyzed)`,
      );
    } catch (e) {
      logger.debug("[Eliza Plugin] Voice profile will be generated on first use");
    }

    logger.info(
      `[Eliza Plugin] ✅ Ready — 8 actions: UPLOAD, KNOWLEDGE_STATUS, WRITE_ESSAY, DRAFT_TWEETS, REPURPOSE, RESEARCH_QUEUE, SUGGEST_TOPICS | Voice learning: ✓ | Summarize: ${hasSummarize ? "✓" : "needs key"}`,
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
  repurposeAction,
  researchQueueAction,
  suggestTopicsAction,
};

// Export services
export { analyzeVoice, getVoicePromptAddition } from "./services/voice.service";

export default elizaPlugin;
