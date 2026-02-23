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
 * Actions (15 total):
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
 * - POLISH: Transform generic copy into premium, brand-elevating content
 * - AUTO_RESEARCH: Autonomous knowledge expansion with gap analysis
 * - CONTENT_AUDIT: Content playbook from top X posts by engagement
 *
 * Services (7 total):
 * - voice.service: Voice profile analysis and brand consistency
 * - autoMonitor.service: Knowledge health monitoring and suggestions
 * - knowledgeGraph.service: Relationship tracking between content
 * - deduplication.service: Smart duplicate detection and archival
 * - sourceQuality.service: Source trust and provenance tracking
 * - styleGuide.service: Brand style rules, checking, and auto-fix
 * - researchAgenda.service: Research priorities, gaps, and session tracking
 *
 * Eliza uses plugin-inter-agent separately for ASK_AGENT.
 */

import type { Plugin, IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { handleUploadRequest } from "./routes/uploadRoute";

// Eliza owns content ingestion (UPLOAD) and ADD_MICHELIN; no dependency on plugin-vince.
import { uploadAction } from "./actions/upload.action";
import { addMichelinRestaurantAction } from "./actions/addMichelin.action";
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
import { polishContentAction } from "./actions/polishContent.action";
import { autoResearchAction } from "./actions/autoResearch.action";
import { contentAuditAction } from "./actions/contentAudit.action";

// Import services
import { analyzeVoice, getVoicePromptAddition } from "./services/voice.service";
import * as autoMonitorService from "./services/autoMonitor.service";
import * as knowledgeGraphService from "./services/knowledgeGraph.service";
import * as deduplicationService from "./services/deduplication.service";
import * as sourceQualityService from "./services/sourceQuality.service";
import * as styleGuideService from "./services/styleGuide.service";
import * as researchAgendaService from "./services/researchAgenda.service";
import { substackContextProvider } from "./providers/substackContext.provider";
import { tradingPerformanceProvider } from "./providers/tradingPerformance.provider";
import {
  getSubstackFeedUrl,
  fetchSubstackPosts,
} from "./services/substackFeed";

export const elizaPlugin: Plugin = {
  name: "plugin-eliza",
  description: `Eliza's knowledge & content plugin — 15 actions, 7 services, 1 provider (Substack).

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
  • Tone markers (avoid casual/promotional/AI-slop)
  • Prohibited phrases
  • Auto-fix for simple violations
- POLISH: Transform copy into premium content
  • Apple principles (benefit-led, simple)
  • Porsche principles (confident, crafted)
  • AI-slop detection and rewrite guidance
  • Before/after transformation examples

🔬 AUTONOMOUS RESEARCH:
- AUTO_RESEARCH: Systematic knowledge expansion
  • audit knowledge — Gap analysis vs coverage framework
  • research agenda — View priorities and queue
  • fill gaps — Auto-generate topics from gaps
  • research session — Autonomous research cycle
  • Tracks sessions, progress, and files created

📊 CONTENT AUDIT:
- CONTENT_AUDIT: Top posts analysis from top X posts (hooks, topics, formats). Uses plugin-x-research for X data; set ELIZA_X_BEARER_TOKEN for Eliza.
- SUBSTACK_CONTEXT provider: Recent Ikigai Studio Substack posts (RSS) + optional profile (Substack API). Set SUBSTACK_FEED_URL / ELIZA_SUBSTACK_LINKEDIN_HANDLE.`,

  providers: [substackContextProvider, tradingPerformanceProvider],

  routes: [
    {
      name: "eliza-upload",
      path: "/eliza/upload",
      type: "POST",
      handler: async (
        req: { body?: unknown; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
        runtime?: IAgentRuntime,
      ) => {
        const agentRuntime =
          runtime ??
          (req as any).runtime ??
          (req as any).agentRuntime ??
          (req as any).agent?.runtime;
        if (!agentRuntime) {
          res.status(503).json({
            error: "Upload requires agent context",
            hint: "Use /api/agents/:agentId/plugins/plugin-eliza/eliza/upload with Eliza's agentId",
          });
          return;
        }
        try {
          const body = (req.body ?? {}) as { type?: string; content?: string };
          const type = body.type === "youtube" ? "youtube" : "text";
          const result = await handleUploadRequest(agentRuntime, {
            type,
            content: body.content ?? "",
          });
          if (!result.success) {
            res.status(400).json(result);
            return;
          }
          res.json(result);
        } catch (err) {
          logger.warn(`[Eliza Plugin] Upload route error: ${err}`);
          res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
    {
      name: "eliza-substack",
      path: "/eliza/substack",
      type: "GET",
      handler: async (
        _req: { body?: unknown; [k: string]: unknown },
        res: {
          status: (n: number) => { json: (o: object) => void };
          json: (o: object) => void;
        },
      ) => {
        try {
          const feedUrl = getSubstackFeedUrl();
          const posts = await fetchSubstackPosts(feedUrl);
          res.status(200).json({ posts });
        } catch (err) {
          logger.warn(`[Eliza Plugin] Substack route error: ${err}`);
          res.status(500).json({
            posts: [],
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
  ],

  actions: [
    // Knowledge Management (Eliza-owned: UPLOAD, ADD_MICHELIN)
    uploadAction,
    addMichelinRestaurantAction,
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
    polishContentAction,
    // Autonomous Research
    autoResearchAction,
    // Content Audit (top posts analysis; uses plugin-x-research)
    contentAuditAction,
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
      logger.debug(
        "[Eliza Plugin] Voice profile will be generated on first use",
      );
    }

    // Initial knowledge scan (non-blocking)
    setTimeout(() => {
      try {
        autoMonitorService.runMonitorScan();
        knowledgeGraphService.buildKnowledgeGraph();
        sourceQualityService.scanAndUpdateQuality();
        logger.info(
          "[Eliza Plugin] Initial knowledge intelligence scan complete",
        );
      } catch (e) {
        logger.debug("[Eliza Plugin] Knowledge scan deferred");
      }
    }, 5000);

    // Patch messageService to intercept X/Twitter URLs and call the UPLOAD
    // handler directly. This bypasses both shouldRespond (LLM returns IGNORE
    // for bare URLs in GROUP channels) AND action selection (LLM picks X_THREAD
    // or REPLY instead of UPLOAD). For YouTube and upload-intent messages, we
    // still use isMention to let the normal flow handle them.
    const X_URL_RE =
      /https?:\/\/(www\.)?(x\.com|twitter\.com)\/\w+\/status\/\d+/i;
    const YT_URL_RE = /youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+/i;
    const UPLOAD_RE =
      /\b(upload|ingest|save this|add to knowledge|remember this)\b/i;

    const patchForUpload = () => {
      const svc = (runtime as any).messageService;
      if (!svc || typeof svc.handleMessage !== "function") return;
      if ((svc.handleMessage as any).__uploadPatched) return;

      const original = svc.handleMessage.bind(svc);
      svc.handleMessage = async function uploadPatchedHandler(
        rt: any,
        message: any,
        callback?: any,
        options?: any,
      ) {
        const text = message?.content?.text ?? "";
        const embedUrls = (message?.content?.embeds ?? [])
          .map((e: any) => e?.url ?? "")
          .join(" ");
        const combined = `${text} ${embedUrls}`;

        // X/Twitter URLs: call UPLOAD handler directly, skip LLM action selection
        if (X_URL_RE.test(combined)) {
          logger.info(
            "[Eliza Plugin] X URL detected — calling UPLOAD handler directly (bypassing LLM action selection)",
          );
          try {
            // Save the message to memory first (like bootstrap would)
            try {
              await runtime.createMemory(
                {
                  entityId: message.entityId,
                  agentId: runtime.agentId,
                  roomId: message.roomId,
                  content: message.content,
                  createdAt: Date.now(),
                },
                "messages",
              );
            } catch {
              // Memory creation might fail if already saved; continue
            }

            await uploadAction.handler(
              runtime,
              message,
              undefined,
              undefined,
              callback,
            );
            return {
              didRespond: true,
              responseContent: null,
              responseMessages: [],
              state: { values: {}, data: {}, text: "" },
              mode: "none",
            };
          } catch (err) {
            logger.error(
              { err },
              "[Eliza Plugin] Direct UPLOAD handler failed for X URL",
            );
            // Fall through to normal flow
          }
        }

        // YouTube and upload-intent: force isMention so shouldRespond passes,
        // then let the normal LLM action selection pick UPLOAD
        if (YT_URL_RE.test(combined) || UPLOAD_RE.test(text)) {
          if (!message.content) message.content = {};
          if (!message.content.mentionContext)
            message.content.mentionContext = {};
          message.content.mentionContext.isMention = true;
          logger.info(
            "[Eliza Plugin] Upload-eligible message — forcing isMention for shouldRespond bypass",
          );
        }
        return original(rt, message, callback, options);
      };
      (svc.handleMessage as any).__uploadPatched = true;
      logger.info(
        "[Eliza Plugin] Patched messageService — X URLs direct-handle, YouTube/upload isMention bypass",
      );
    };

    // Retry with delays since messageService registers after services start
    setTimeout(patchForUpload, 6000);
    setTimeout(patchForUpload, 15000);

    logger.info(
      `[Eliza Plugin] ✅ Ready — 15 actions | Voice: ✓ | Research: ✓ | Summarize: ${hasSummarize ? "✓" : "yes"}`,
    );
  },
};

// Export all actions
export {
  uploadAction,
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
  polishContentAction,
  autoResearchAction,
  contentAuditAction,
};

// Export services
export { analyzeVoice, getVoicePromptAddition } from "./services/voice.service";
export * as autoMonitor from "./services/autoMonitor.service";
export * as knowledgeGraph from "./services/knowledgeGraph.service";
export * as deduplication from "./services/deduplication.service";
export * as sourceQuality from "./services/sourceQuality.service";
export * as styleGuide from "./services/styleGuide.service";
export * as researchAgenda from "./services/researchAgenda.service";

export default elizaPlugin;
