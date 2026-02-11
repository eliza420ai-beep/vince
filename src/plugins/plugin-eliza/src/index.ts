/**
 * Plugin Eliza — Knowledge Expansion, Research & Content Production
 *
 * Eliza's dedicated plugin for:
 * - 24/7 knowledge base management and expansion
 * - Content ingestion (articles, YouTube, PDFs)
 * - Long-form essay production (Substack)
 * - Tweet drafting (X/Twitter)
 * - Voice learning and brand consistency
 * - Research briefs and trend analysis
 * - Knowledge intelligence (graph, deduplication, quality)
 *
 * Actions (13 total):
 * - UPLOAD: Ingest content (text, URLs, YouTube) into knowledge/
 * - ADD_MICHELIN_RESTAURANT: Add Michelin Guide restaurants to knowledge
 * - KNOWLEDGE_STATUS: Check health and coverage of knowledge base
 * - WRITE_ESSAY: Generate Substack essays from knowledge (voice-aware)
 * - DRAFT_TWEETS: Create tweet suggestions for @ikigaistudioxyz (voice-aware)
 * - REPURPOSE: Transform content between formats (essay↔thread↔linkedin)
 * - RESEARCH_QUEUE: Batch queue for content ingestion
 * - SUGGEST_TOPICS: AI-powered topic suggestions based on gaps & trends
 * - RESEARCH_BRIEF: Generate concise research briefs from knowledge
 * - TREND_CONNECTION: Connect knowledge to VINCE's market trends
 * - KNOWLEDGE_INTEL: Unified intelligence (monitor, graph, dedupe, quality)
 * - STYLE_CHECK: Brand style guide enforcement and auto-fix
 *
 * Services (6 total):
 * - voice.service: Voice profile analysis and brand consistency
 * - autoMonitor.service: Knowledge health monitoring and suggestions
 * - knowledgeGraph.service: Relationship tracking between content
 * - deduplication.service: Smart duplicate detection and archival
 * - sourceQuality.service: Source trust and provenance tracking
 * - styleGuide.service: Brand style rules, checking, and auto-fix
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
import { researchBriefsAction } from "./actions/researchBriefs.action";
import { trendConnectionAction } from "./actions/trendConnection.action";
import { knowledgeIntelligenceAction } from "./actions/knowledgeIntelligence.action";
import { styleCheckAction } from "./actions/styleCheck.action";

// Import services
import { analyzeVoice, getVoicePromptAddition } from "./services/voice.service";
import * as autoMonitorService from "./services/autoMonitor.service";
import * as knowledgeGraphService from "./services/knowledgeGraph.service";
import * as deduplicationService from "./services/deduplication.service";
import * as sourceQualityService from "./services/sourceQuality.service";
import * as styleGuideService from "./services/styleGuide.service";

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
  description: `Eliza's knowledge & content plugin — 13 actions, 6 services.

📚 KNOWLEDGE MANAGEMENT:
- UPLOAD: Ingest text, URLs, YouTube → knowledge/
- ADD_MICHELIN_RESTAURANT: Michelin Guide links → knowledge/
- KNOWLEDGE_STATUS: Health check on knowledge base
- RESEARCH_QUEUE: Batch queue for content ingestion

✍️ CONTENT PRODUCTION:
- WRITE_ESSAY: Substack essays (voice-aware)
- DRAFT_TWEETS: Tweet suggestions (voice-aware)
- REPURPOSE: Transform content between formats

🔬 RESEARCH:
- RESEARCH_BRIEF: Concise research briefs from knowledge
- TREND_CONNECTION: Connect knowledge to market trends (via VINCE)
- SUGGEST_TOPICS: AI topic suggestions (gaps + trends)

🧠 INTELLIGENCE:
- KNOWLEDGE_INTEL: Unified access to monitoring, graph, deduplication, quality
  • Auto-Monitor: Health tracking and suggestions
  • Knowledge Graph: Relationship mapping
  • Deduplication: Duplicate detection and archival
  • Source Quality: Trust and provenance tracking

🎨 BRAND & QUALITY:
- STYLE_CHECK: Enforce brand style guide
  • Terminology rules (preferred terms)
  • Capitalization (brands, acronyms)
  • Tone markers (avoid casual/promotional)
  • Prohibited phrases
  • Auto-fix for simple violations`,

  actions: [
    // Knowledge Management
    elizaUploadAction,
    elizaMichelinAction,
    knowledgeStatusAction,
    researchQueueAction,
    // Content Production
    writeEssayAction,
    draftTweetsAction,
    repurposeAction,
    // Research
    researchBriefsAction,
    trendConnectionAction,
    suggestTopicsAction,
    // Intelligence
    knowledgeIntelligenceAction,
    // Brand & Quality
    styleCheckAction,
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

    // Initial knowledge scan (non-blocking)
    setTimeout(() => {
      try {
        autoMonitorService.runMonitorScan();
        knowledgeGraphService.buildKnowledgeGraph();
        sourceQualityService.scanAndUpdateQuality();
        logger.info("[Eliza Plugin] Initial knowledge intelligence scan complete");
      } catch (e) {
        logger.debug("[Eliza Plugin] Knowledge scan deferred");
      }
    }, 5000);

    logger.info(
      `[Eliza Plugin] ✅ Ready — 12 actions: UPLOAD, KNOWLEDGE_STATUS, WRITE_ESSAY, DRAFT_TWEETS, REPURPOSE, RESEARCH_QUEUE, SUGGEST_TOPICS, RESEARCH_BRIEF, TREND_CONNECTION, KNOWLEDGE_INTEL, STYLE_CHECK | Voice: ✓ | Summarize: ${hasSummarize ? "✓" : "needs key"}`,
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
  researchBriefsAction,
  trendConnectionAction,
  knowledgeIntelligenceAction,
  styleCheckAction,
};

// Export services
export { analyzeVoice, getVoicePromptAddition } from "./services/voice.service";
export * as autoMonitor from "./services/autoMonitor.service";
export * as knowledgeGraph from "./services/knowledgeGraph.service";
export * as deduplication from "./services/deduplication.service";
export * as sourceQuality from "./services/sourceQuality.service";
export * as styleGuide from "./services/styleGuide.service";

export default elizaPlugin;
