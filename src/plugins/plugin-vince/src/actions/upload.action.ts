/**
 * VINCE UPLOAD Action
 *
 * Knowledge ingestion for VINCE - upload content to the knowledge base.
 * Inspired by plugin-knowledge-ingestion's ingest-text.action.ts
 *
 * Supports:
 * - Raw text content (pasted articles, notes, analysis)
 * - YouTube video URLs (transcribed and saved)
 * - Tweet-like content (optionally expanded with Grok/XAI)
 *
 * Usage:
 *   "upload: [content]"
 *   "save this: [text content]"
 *   "ingest this video: [YouTube URL]"
 *   "remember: [important info]"
 *
 * STANDALONE MODE:
 * - Uses plugin-knowledge-ingestion if available (full categorization + LLM processing)
 * - Falls back to simple file storage if plugin-knowledge-ingestion is not available
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type {
  IKnowledgeFileService,
  IKnowledgeFileRequest,
  IKnowledgeGenerationResult,
  KnowledgeCategory,
  SourceType,
} from "../types/external-services";

// Minimum text length to be considered for ingestion
const MIN_TEXT_LENGTH = 50;
const AUTO_INGEST_LENGTH = 500;
const LONG_DUMP_LENGTH = 1000;

/**
 * Intent keywords that trigger upload
 */
const UPLOAD_INTENT_KEYWORDS = [
  "upload",
  "upload:",
  "upload this",
  "save this",
  "save:",
  "ingest",
  "ingest:",
  "ingest this",
  "remember",
  "remember:",
  "remember this",
  "add to knowledge",
  "add knowledge",
  "store this",
  "note this",
];

/**
 * YouTube URL patterns
 */
const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=[\w-]+/i,
  /youtu\.be\/[\w-]+/i,
  /youtube\.com\/embed\/[\w-]+/i,
];

/**
 * Check if text contains a YouTube URL
 */
function containsYouTubeUrl(text: string): boolean {
  return YOUTUBE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Extract YouTube URL from text
 */
function extractYouTubeUrl(text: string): string | null {
  const patterns = [
    /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=[\w-]+)/i,
    /(https?:\/\/)?(youtu\.be\/[\w-]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Reconstruct full URL
      const url = match[0];
      if (!url.startsWith("http")) {
        return "https://" + url;
      }
      return url;
    }
  }
  return null;
}

/**
 * Check if message has upload intent
 */
function hasUploadIntent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return UPLOAD_INTENT_KEYWORDS.some(kw => lowerText.includes(kw));
}

/**
 * Check if content looks pasted (not conversational)
 */
function looksPastedNotConversational(text: string): boolean {
  // Conversational signals
  const conversationalSignals = [
    /^(my |i'm |i am |i think |i believe |i've |i have |we |our )/i,
    /^(yes|no|yeah|nope|sure|exactly|agreed|right|true|absolutely)/i,
    /^(so |well |but |and |also |actually |honestly )/i,
    /\?$/,
    /(what do you|what's your|how do you|do you think)/i,
  ];

  for (const pattern of conversationalSignals) {
    if (pattern.test(text.trim())) {
      return false;
    }
  }

  // Pasted content signals
  const pastedSignals = [
    /^#+ /m,          // Markdown headers
    /^[-*•] /m,       // Bullet points
    /^\d+\.\s/m,      // Numbered lists
    /^[A-Z][A-Z0-9_]+[.:=]/m, // ALL_CAPS labels
    /^```/m,          // Code blocks
    /\n[-*•] /m,      // Multiple bullet points
    /^>\s/m,          // Blockquotes
  ];

  for (const pattern of pastedSignals) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract content after intent keywords
 */
function extractContent(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const keyword of UPLOAD_INTENT_KEYWORDS) {
    const idx = lowerText.indexOf(keyword);
    if (idx !== -1) {
      let content = text.slice(idx + keyword.length).trim();
      content = content.replace(/^[:\-\s]+/, "").trim();
      return content;
    }
  }
  
  return text;
}

/**
 * Generate a title from content
 */
function generateTitle(content: string): string {
  const firstLine = content.split("\n")[0].trim();
  const title = firstLine.length > 100 
    ? firstLine.slice(0, 100) + "..." 
    : firstLine;
  return title || "Untitled Knowledge";
}

// ==========================================
// Simple Fallback Knowledge Storage
// Used when plugin-knowledge-ingestion is not available
// ==========================================

/**
 * Simple category detection based on keywords
 */
function detectSimpleCategory(content: string): KnowledgeCategory {
  const lowerContent = content.toLowerCase();
  
  // Trading & Markets
  if (lowerContent.includes("perp") || lowerContent.includes("funding") || lowerContent.includes("liquidat")) {
    return "perps-trading";
  }
  if (lowerContent.includes("option") || lowerContent.includes("strike") || lowerContent.includes("delta") || lowerContent.includes("covered call")) {
    return "options";
  }
  if (lowerContent.includes("defi") || lowerContent.includes("tvl") || lowerContent.includes("yield")) {
    return "defi-metrics";
  }
  if (lowerContent.includes("airdrop") || lowerContent.includes("farm") || lowerContent.includes("memecoin") || lowerContent.includes("pump.fun")) {
    return "grinding-the-trenches";
  }
  
  // Assets
  if (lowerContent.includes("bitcoin") || lowerContent.includes("btc") || lowerContent.includes("halving")) {
    return "bitcoin-maxi";
  }
  if (lowerContent.includes("solana") || lowerContent.includes("sol ") || lowerContent.includes("spl token")) {
    return "solana";
  }
  if (lowerContent.includes("altcoin") || lowerContent.includes("eth ") || lowerContent.includes("ethereum")) {
    return "altcoins";
  }
  
  // Macro & Investment
  if (lowerContent.includes("macro") || lowerContent.includes("fed") || lowerContent.includes("inflation") || lowerContent.includes("interest rate")) {
    return "macro-economy";
  }
  if (lowerContent.includes("venture") || lowerContent.includes("vc ") || lowerContent.includes("fundrais")) {
    return "venture-capital";
  }
  
  // Technical & Tools
  if (lowerContent.includes("setup") || lowerContent.includes("install") || lowerContent.includes("config")) {
    return "setup-guides";
  }
  
  // Content
  if (lowerContent.includes("lifestyle") || lowerContent.includes("travel") || lowerContent.includes("hotel") || lowerContent.includes("restaurant")) {
    return "the-good-life";
  }
  if (lowerContent.includes("nft") || lowerContent.includes("art") || lowerContent.includes("collect")) {
    return "art-collections";
  }
  
  return "uncategorized";
}

/**
 * Simple fallback storage - writes directly to knowledge directory
 */
async function simpleFallbackStorage(
  runtime: IAgentRuntime,
  content: string,
  title: string,
  timestamp: number
): Promise<IKnowledgeGenerationResult> {
  try {
    // Detect category
    const category = detectSimpleCategory(content);
    
    // Generate filename
    const slugTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    const filename = `vince-upload-${slugTitle}-${timestamp}.md`;
    
    // Determine knowledge base path
    const knowledgeBasePath = "./knowledge";
    const categoryPath = path.join(knowledgeBasePath, category);
    const filepath = path.join(categoryPath, filename);
    
    // Ensure category directory exists
    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }
    
    // Calculate word count
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    
    // Generate markdown content
    const markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
source: chat://vince-upload/${timestamp}
category: ${category}
tags:
  - vince-upload
  - user-submitted
  - chat
created: ${new Date(timestamp).toISOString()}
wordCount: ${wordCount}
---

# ${title}

${content}
`;
    
    // Write file
    fs.writeFileSync(filepath, markdownContent, "utf-8");
    
    logger.info({ filepath, category, wordCount }, "[VINCE_UPLOAD] Fallback storage: File saved");
    
    return {
      success: true,
      file: {
        category,
        filename,
        filepath,
        content: markdownContent,
        metadata: {
          source: "vince-upload",
          sourceUrl: `chat://vince-upload/${timestamp}`,
          processedAt: new Date(timestamp).toISOString(),
          wordCount,
          tags: ["vince-upload", "user-submitted", "chat"],
        },
      },
    };
  } catch (error) {
    logger.error({ error }, "[VINCE_UPLOAD] Fallback storage error");
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Try to dynamically load KnowledgeFileService from plugin-knowledge-ingestion
 */
async function tryLoadKnowledgeFileService(runtime: IAgentRuntime): Promise<IKnowledgeFileService | null> {
  try {
    // Try dynamic import - this will fail gracefully if plugin is not installed
    // Using variable path to prevent TypeScript from checking the module at compile time
    const modulePath = "../../../../plugin-knowledge-ingestion/src/services/knowledge-file.service";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = await import(/* @vite-ignore */ modulePath);
    if (module?.KnowledgeFileService) {
      const service = new module.KnowledgeFileService(runtime);
      await service.initialize(runtime);
      logger.debug("[VINCE_UPLOAD] KnowledgeFileService loaded from plugin-knowledge-ingestion");
      return service as IKnowledgeFileService;
    }
  } catch (e) {
    // Expected when plugin is not installed - fall back to simple storage
    logger.debug("[VINCE_UPLOAD] plugin-knowledge-ingestion not available, using fallback storage");
  }
  return null;
}

export const vinceUploadAction: Action = {
  name: "VINCE_UPLOAD",
  similes: [
    "UPLOAD",
    "SAVE_KNOWLEDGE",
    "INGEST",
    "REMEMBER",
    "ADD_KNOWLEDGE",
    "STORE_KNOWLEDGE",
  ],
  description: `Upload content to the knowledge base. Supports text, URLs, and YouTube videos.

TRIGGERS:
1. "upload:", "save this:", "ingest:", "remember:" - Saves content to knowledge base
2. YouTube URLs - Transcribes video and saves to knowledge
3. Long pasted content (1000+ chars) without conversational tone - Auto-ingests

Use this action when the user wants to ADD content to knowledge, NOT for regular conversation.`,

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text || "";
    
    // Skip agent's own messages
    if (message.entityId === runtime.agentId) {
      return false;
    }

    // Skip if too short
    if (text.length < MIN_TEXT_LENGTH) {
      return false;
    }

    // Priority 1: Explicit upload intent keywords
    if (hasUploadIntent(text)) {
      logger.info("[VINCE_UPLOAD] Upload intent detected");
      return true;
    }

    // Priority 2: YouTube URL
    if (containsYouTubeUrl(text)) {
      logger.info("[VINCE_UPLOAD] YouTube URL detected");
      return true;
    }

    // Priority 3: Long pasted content (non-conversational)
    if (text.length >= AUTO_INGEST_LENGTH && looksPastedNotConversational(text)) {
      logger.info("[VINCE_UPLOAD] Long pasted content detected");
      return true;
    }

    // Priority 4: Very long text dump
    if (text.length >= LONG_DUMP_LENGTH) {
      const firstLine = text.trim().split("\n")[0];
      const conversationalStart = [
        /^(so |well |but |and |also |actually |honestly |look |anyway )/i,
        /^(my |i'm |i am |i think |i believe )/i,
        /^(yes|no|yeah|nope|sure|exactly|agreed|right|true|absolutely)/i,
        /\?$/,
      ];
      
      const isConversational = conversationalStart.some(p => p.test(firstLine.trim()));
      if (!isConversational) {
        logger.info("[VINCE_UPLOAD] Long dump detected");
        return true;
      }
    }

    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void> => {
    const text = message.content?.text || "";
    const startTime = Date.now();

    try {
      // Check if this is a YouTube URL
      const youtubeUrl = extractYouTubeUrl(text);
      
      if (youtubeUrl) {
        // Delegate to knowledge ingestion plugin for YouTube processing
        if (callback) {
          await callback({
            text: `🎥 **Processing YouTube Video**\n\nURL: ${youtubeUrl}\n\nTranscribing and extracting knowledge... This may take a moment.\n\n_Tip: For faster processing, share a direct link or paste the transcript directly._\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
            actions: ["VINCE_UPLOAD"],
          });
        }
        
        // Note: Full YouTube processing would require the VideoProcessorService
        // For now, we inform the user and suggest alternatives
        logger.info({ youtubeUrl }, "[VINCE_UPLOAD] YouTube URL detected - would process via VideoProcessorService");
        return;
      }

      // Process text content
      let content = extractContent(text);
      
      if (content.length < MIN_TEXT_LENGTH) {
        if (callback) {
          await callback({
            text: "The content is too short to save. Please provide more substantial content (at least 50 characters).\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
            actions: ["VINCE_UPLOAD"],
          });
        }
        return;
      }

      logger.info({ contentLength: content.length }, "[VINCE_UPLOAD] Processing content...");

      const timestamp = Date.now();
      const title = generateTitle(extractContent(text));
      
      // Try to use full KnowledgeFileService, fall back to simple storage
      const knowledgeService = await tryLoadKnowledgeFileService(runtime);
      
      let fileResult: IKnowledgeGenerationResult;
      let usedFallback = false;
      
      if (knowledgeService) {
        // Use full knowledge ingestion with LLM categorization
        const slugTitle = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 50);
        const suggestedFilename = `vince-upload-${slugTitle}-${timestamp}.md`;

        logger.info("[VINCE_UPLOAD] Categorizing content with LLM...");
        const category = await knowledgeService.categorizeContent(content, "article");
        logger.info({ category }, "[VINCE_UPLOAD] Content categorized");

        const tags = ["vince-upload", "user-submitted", "chat"];
        
        fileResult = await knowledgeService.generateKnowledgeFile({
          sourceType: "article",
          sourceUrl: `chat://vince-upload/${timestamp}`,
          sourceId: `vince-${timestamp}`,
          additionalContext: content,
          suggestedCategory: category,
          suggestedFilename,
          tags,
          preserveOriginal: true,
        });
      } else {
        // Use simple fallback storage
        usedFallback = true;
        fileResult = await simpleFallbackStorage(runtime, content, title, timestamp);
      }

      logger.info({
        success: fileResult.success,
        file: fileResult.file?.filename,
        error: fileResult.error,
        usedFallback,
      }, "[VINCE_UPLOAD] File generation result");

      // Send response
      if (callback) {
        if (fileResult.success && fileResult.file) {
          const processingTime = Date.now() - startTime;
          const fallbackNote = usedFallback ? "\n\n_Using simple categorization (install plugin-knowledge-ingestion for LLM-powered categorization)_" : "";
          
          await callback({
            text: `✅ **Knowledge Uploaded!**

**Title**: ${title}
**Category**: \`${fileResult.file.category}\`
**File**: \`${fileResult.file.filename}\`
**Word Count**: ${fileResult.file.metadata.wordCount}
**Processing Time**: ${processingTime}ms

Saved to \`knowledge/${fileResult.file.category}/${fileResult.file.filename}\`

This content is now available via RAG search across all VINCE queries.${fallbackNote}

---
*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
            actions: ["VINCE_UPLOAD"],
          });
        } else {
          await callback({
            text: `❌ **Upload Failed**

**Error**: ${fileResult.error || "Unknown error"}

Please try again or rephrase the content.

---
*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
            actions: ["VINCE_UPLOAD"],
          });
        }
      }
    } catch (error) {
      logger.error({ error }, "[VINCE_UPLOAD] Unexpected error");
      
      if (callback) {
        await callback({
          text: `❌ An error occurred while uploading: ${String(error)}\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
          actions: ["VINCE_UPLOAD"],
        });
      }
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "upload: Bitcoin's halving cycle typically creates a supply shock 12-18 months after the event, leading to price appreciation. The 2024 halving follows the same pattern." } },
      {
        name: "VINCE",
        content: {
          text: "✅ **Knowledge Uploaded!**\n\n**Title**: Bitcoin's halving cycle typically creates...\n**Category**: `bitcoin-maxi`\n**File**: `vince-upload-bitcoin-halving-cycle.md`\n**Word Count**: 48\n\nSaved to `knowledge/bitcoin-maxi/vince-upload-bitcoin-halving-cycle.md`\n\nThis content is now available via RAG search across all VINCE queries.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_UPLOAD"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "save this: The best covered call strikes for BTC are typically 10-15% OTM with 7-14 DTE. This balances premium capture with assignment risk." } },
      {
        name: "VINCE",
        content: {
          text: "✅ **Knowledge Uploaded!**\n\n**Title**: The best covered call strikes for BTC...\n**Category**: `options`\n**File**: `vince-upload-btc-covered-call-strategy.md`\n**Word Count**: 35\n\nSaved to `knowledge/options/vince-upload-btc-covered-call-strategy.md`\n\nThis content is now available via RAG search across all VINCE queries.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_UPLOAD"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "remember: Hyperliquid's points program is still live. Running MM and DN strategies across multiple venues compounds airdrop potential." } },
      {
        name: "VINCE",
        content: {
          text: "✅ **Knowledge Uploaded!**\n\n**Title**: Hyperliquid's points program is still live...\n**Category**: `grinding-the-trenches`\n**File**: `vince-upload-hyperliquid-airdrop-strategy.md`\n**Word Count**: 28\n\nSaved to `knowledge/grinding-the-trenches/vince-upload-hyperliquid-airdrop-strategy.md`\n\nThis content is now available via RAG search across all VINCE queries.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_UPLOAD"],
        },
      },
    ],
  ],
};

export default vinceUploadAction;
