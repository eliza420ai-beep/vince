/**
 * VINCE UPLOAD Action
 *
 * Knowledge ingestion for VINCE - upload content to the knowledge base.
 * Inspired by plugin-knowledge-ingestion's ingest-text.action.ts
 *
 * Supports:
 * - Raw text content (pasted articles, notes, analysis)
 * - URLs (articles, PDFs): via steipete/summarize CLI when available
 * - YouTube video URLs: transcript + summary via summarize (--youtube auto)
 * - Tweet-like content (optionally expanded with Grok/XAI)
 *
 * Usage:
 *   "upload: [content]"
 *   "upload: https://example.com/article"
 *   "save this: [text content]"
 *   "ingest this video: [YouTube URL]"
 *   "remember: [important info]"
 *
 * SUMMARIZE INTEGRATION (optional):
 * - Uses summarize CLI via bunx: we invoke @steipete/summarize (upstream npm).
 *   Alternative: Ikigai fork https://github.com/IkigaiLabsETH/summarize (install from GitHub if desired).
 * - Install: bun install -g @steipete/summarize (or use bunx; no install required).
 * - Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY for summarize's model.
 * - VINCE_UPLOAD_EXTRACT_ONLY=true: use --extract only (transcript/extract, no LLM; saves cost).
 * - VINCE_UPLOAD_SUMMARY_LENGTH=long|xl|xxl|medium|short: summary length (default long).
 * - VINCE_UPLOAD_YOUTUBE_SLIDES=true: YouTube slide extraction (--slides); VINCE_UPLOAD_YOUTUBE_SLIDES_OCR=true for OCR.
 * - VINCE_UPLOAD_FIRECRAWL=auto|always: web fallback (FIRECRAWL_API_KEY); VINCE_UPLOAD_LANG for --lang.
 *
 * STANDALONE MODE:
 * - Uses plugin-knowledge-ingestion if available (full categorization + LLM processing)
 * - Falls back to simple file storage if plugin-knowledge-ingestion is not available
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  UUID,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { spawn } from "child_process";
import { isElizaAgent } from "../utils/dashboard";
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

/** Below this word count we warn that chat may have truncated; suggest sending the URL instead. */
const LOW_WORD_COUNT_WARN_THRESHOLD = 400;

/** When current message is short and matches these, we use the previous user message as content (avoids truncation from client). */
const UPLOAD_THAT_PATTERNS = [
  /^(upload|save|ingest|remember|add to knowledge|store)\s+(that|the above|the previous|it|this)\s*\.?$/i,
  /^(upload|save|ingest|remember)\s*:\s*that\s*\.?$/i,
];
const MAX_REFERENCE_MESSAGE_LENGTH = 120;

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
  return YOUTUBE_PATTERNS.some((pattern) => pattern.test(text));
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

/** Match a single http(s) URL in text (for article/PDF links) */
const GENERIC_URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;

/** X/Twitter URLs: we don't have X API; summarize can't fetch tweet/post content. Don't call summarize for these. */
const X_TWITTER_HOST_PATTERN = /^https?:\/\/(www\.)?(x\.com|twitter\.com)\//i;

function isXOrTwitterUrl(url: string): boolean {
  return X_TWITTER_HOST_PATTERN.test(url.trim());
}

function extractSingleUrl(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(GENERIC_URL_REGEX);
  if (!match) return null;
  const url = match[0].replace(/[.,;:!?)]+$/, ""); // trim trailing punctuation
  return url.length >= 10 ? url : null;
}

/** Allowed summary length presets (summarize --length). */
const SUMMARY_LENGTH_PRESETS = [
  "short",
  "medium",
  "long",
  "xl",
  "xxl",
] as const;

/** Resolve summarize CLI: use local node_modules/.bin/summarize if present, else bunx. */
function getSummarizeCommand(cliArgs: string[]): {
  command: string;
  args: string[];
} {
  const cwd = process.cwd();
  const binDir = path.join(cwd, "node_modules", ".bin");
  const localBin = path.join(binDir, "summarize");
  const localBinWin = path.join(binDir, "summarize.cmd");
  if (
    fs.existsSync(localBin) ||
    (process.platform === "win32" && fs.existsSync(localBinWin))
  ) {
    const cmd =
      process.platform === "win32" && fs.existsSync(localBinWin)
        ? localBinWin
        : localBin;
    return { command: cmd, args: cliArgs };
  }
  return { command: "bunx", args: ["@steipete/summarize", ...cliArgs] };
}

/** Result from summarize: success with content, or failure with optional stderr for user feedback */
type SummarizeResult =
  | { content: string; sourceUrl: string }
  | { error: string; stderr?: string };

/**
 * Run steipete/summarize CLI to get transcript or summary for a URL.
 * Uses bunx (Bun) so no global install is required. Retries once on non-zero exit.
 * @see https://github.com/IkigaiLabsETH/summarize (Ikigai fork); https://github.com/steipete/summarize (upstream)
 *
 * Env:
 * - VINCE_UPLOAD_EXTRACT_ONLY=true: --extract only (no LLM; saves cost).
 * - VINCE_UPLOAD_SUMMARY_LENGTH=long|xl|xxl|medium|short: summary length when not extract-only (default: long).
 * - VINCE_UPLOAD_YOUTUBE_SLIDES=true: for YouTube, add --slides (and --slides-ocr); writes to knowledge/.slides/.
 * - VINCE_UPLOAD_FIRECRAWL=auto|always: for web URLs, pass --firecrawl (needs FIRECRAWL_API_KEY when used).
 * - VINCE_UPLOAD_LANG=<code>: output language (e.g. en, auto); passed as --lang.
 * - CLI --timeout is set from our timeout so summarize doesn't exit early.
 */
async function runSummarizeCli(
  url: string,
  options: {
    isYouTube?: boolean;
    timeoutMs?: number;
    extractOnly?: boolean;
  } = {},
): Promise<SummarizeResult | null> {
  const { isYouTube = false, extractOnly } = options;
  const useExtractOnly =
    extractOnly ??
    (process.env.VINCE_UPLOAD_EXTRACT_ONLY === "true" ||
      process.env.VINCE_UPLOAD_EXTRACT_ONLY === "1");
  const youtubeSlides =
    isYouTube &&
    (process.env.VINCE_UPLOAD_YOUTUBE_SLIDES === "true" ||
      process.env.VINCE_UPLOAD_YOUTUBE_SLIDES === "1");
  const lengthEnv = (
    process.env.VINCE_UPLOAD_SUMMARY_LENGTH ?? "long"
  ).toLowerCase();
  const length = SUMMARY_LENGTH_PRESETS.includes(
    lengthEnv as (typeof SUMMARY_LENGTH_PRESETS)[number],
  )
    ? lengthEnv
    : "long";
  let timeoutMs = isYouTube ? 120_000 : 90_000;
  if (youtubeSlides) timeoutMs = 180_000;
  const timeoutSec = Math.ceil(timeoutMs / 1000) + 30;
  const timeoutArg =
    timeoutSec >= 60 ? `${Math.ceil(timeoutSec / 60)}m` : `${timeoutSec}s`;

  const cliArgs = [url, "--plain", "--no-color", "--timeout", timeoutArg];
  if (useExtractOnly) {
    cliArgs.push("--extract");
    if (!isYouTube) cliArgs.push("--format", "md");
  } else {
    cliArgs.push("--length", length);
  }
  if (isYouTube) {
    cliArgs.push("--youtube", "auto");
  }
  if (youtubeSlides) {
    cliArgs.push("--slides", "--slides-dir", "./knowledge/.slides");
    if (
      process.env.VINCE_UPLOAD_YOUTUBE_SLIDES_OCR === "true" ||
      process.env.VINCE_UPLOAD_YOUTUBE_SLIDES_OCR === "1"
    ) {
      cliArgs.push("--slides-ocr");
    }
  }
  const firecrawl = process.env.VINCE_UPLOAD_FIRECRAWL?.toLowerCase();
  if (!isYouTube && (firecrawl === "auto" || firecrawl === "always")) {
    cliArgs.push("--firecrawl", firecrawl);
  }
  const lang = process.env.VINCE_UPLOAD_LANG?.trim();
  if (lang) cliArgs.push("--lang", lang);

  const { command: summarizeCommand, args: summarizeArgs } =
    getSummarizeCommand(cliArgs);

  const runOne = (): Promise<SummarizeResult | null> =>
    new Promise((resolve) => {
      const child = spawn(summarizeCommand, summarizeArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf-8");
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf-8");
      });
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        logger.warn(
          { url, isYouTube, timeoutMs },
          "[VINCE_UPLOAD] summarize CLI timed out",
        );
        resolve({ error: "Timed out", stderr: stderr.slice(0, 300) });
      }, timeoutMs);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          logger.debug(
            { code, stderr: stderr.slice(0, 500) },
            "[VINCE_UPLOAD] summarize CLI exited non-zero",
          );
          resolve({
            error: "Summarize failed",
            stderr: stderr.trim().slice(0, 300),
          });
          return;
        }
        const content = stdout.trim();
        if (content.length < MIN_TEXT_LENGTH) {
          logger.debug("[VINCE_UPLOAD] summarize returned too little content");
          resolve({
            error: "Too little content",
            stderr: stderr.trim().slice(0, 200),
          });
          return;
        }
        resolve({ content, sourceUrl: url });
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        logger.debug(
          { err: String(err) },
          "[VINCE_UPLOAD] summarize CLI spawn error",
        );
        resolve({
          error: String(err),
          stderr: (err as Error).message?.slice(0, 200),
        });
      });
    });

  let result = await runOne();
  if (result && "error" in result && result.error !== "Too little content") {
    logger.info({ url }, "[VINCE_UPLOAD] summarize failed, retrying once");
    result = await runOne();
  }
  return result;
}

/**
 * Check if message has upload intent
 */
function hasUploadIntent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return UPLOAD_INTENT_KEYWORDS.some((kw) => lowerText.includes(kw));
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
    /^#+ /m, // Markdown headers
    /^[-*•] /m, // Bullet points
    /^\d+\.\s/m, // Numbered lists
    /^[A-Z][A-Z0-9_]+[.:=]/m, // ALL_CAPS labels
    /^```/m, // Code blocks
    /\n[-*•] /m, // Multiple bullet points
    /^>\s/m, // Blockquotes
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

/** True if text looks like "upload that" / "save the above" (short reference to previous message). */
function looksLikeUploadThat(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length > MAX_REFERENCE_MESSAGE_LENGTH) return false;
  return UPLOAD_THAT_PATTERNS.some((p) => p.test(trimmed));
}

/** Max recent user messages to combine when building paste content (captures multi-message dumps). */
const MAX_RECENT_USER_MESSAGES_TO_COMBINE = 10;

/**
 * Get content from recent user messages, concatenated oldest-first.
 * Used for "upload that" and to capture pastes split across multiple messages (no X API).
 * Returns null if no usable content.
 */
async function getRecentUserMessagesContent(
  runtime: IAgentRuntime,
  roomId: UUID,
  currentMessageId: string | undefined,
  options: { minLength?: number; maxMessages?: number } = {},
): Promise<string | null> {
  const {
    minLength = MIN_TEXT_LENGTH,
    maxMessages = MAX_RECENT_USER_MESSAGES_TO_COMBINE,
  } = options;
  try {
    const memories = await runtime.getMemories({
      roomId,
      count: 25,
      tableName: "messages",
    });
    const userMessages = memories.filter((m) => m.entityId !== runtime.agentId);
    const byNewest = [...userMessages].sort(
      (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
    );
    let startIdx = 0;
    if (currentMessageId) {
      const idx = byNewest.findIndex((m) => m.id === currentMessageId);
      if (idx === 0) startIdx = 1;
    }
    const toCombine = byNewest.slice(startIdx, startIdx + maxMessages);
    const parts: string[] = [];
    for (const m of toCombine.reverse()) {
      const text = m?.content?.text?.trim();
      if (text) parts.push(text);
    }
    const content = parts.join("\n\n").trim();
    if (content.length >= minLength) return content;
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a title from content
 */
function generateTitle(content: string): string {
  const firstLine = content.split("\n")[0].trim();
  const title =
    firstLine.length > 100 ? firstLine.slice(0, 100) + "..." : firstLine;
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

  // Bots, frameworks, internal tools (check before generic "option" catches OpenClaw/etc.)
  if (
    lowerContent.includes("openclaw") ||
    lowerContent.includes("clawdbot") ||
    lowerContent.includes("claw bot") ||
    lowerContent.includes("claw framework")
  ) {
    return "internal-docs";
  }

  // Trading & Markets
  if (
    lowerContent.includes("perp") ||
    lowerContent.includes("funding") ||
    lowerContent.includes("liquidat")
  ) {
    return "perps-trading";
  }
  if (
    lowerContent.includes("option") ||
    lowerContent.includes("strike") ||
    lowerContent.includes("delta") ||
    lowerContent.includes("covered call")
  ) {
    return "options";
  }
  if (
    lowerContent.includes("defi") ||
    lowerContent.includes("tvl") ||
    lowerContent.includes("yield")
  ) {
    return "defi-metrics";
  }
  if (
    lowerContent.includes("airdrop") ||
    lowerContent.includes("farm") ||
    lowerContent.includes("memecoin") ||
    lowerContent.includes("pump.fun")
  ) {
    return "grinding-the-trenches";
  }

  // Assets
  if (
    lowerContent.includes("bitcoin") ||
    lowerContent.includes("btc") ||
    lowerContent.includes("halving")
  ) {
    return "bitcoin-maxi";
  }
  if (
    lowerContent.includes("solana") ||
    lowerContent.includes("sol ") ||
    lowerContent.includes("spl token")
  ) {
    return "solana";
  }
  if (
    lowerContent.includes("altcoin") ||
    lowerContent.includes("eth ") ||
    lowerContent.includes("ethereum")
  ) {
    return "altcoins";
  }

  // Macro & Investment
  if (
    lowerContent.includes("macro") ||
    lowerContent.includes("fed") ||
    lowerContent.includes("inflation") ||
    lowerContent.includes("interest rate")
  ) {
    return "macro-economy";
  }
  if (
    lowerContent.includes("venture") ||
    lowerContent.includes("vc ") ||
    lowerContent.includes("fundrais")
  ) {
    return "venture-capital";
  }

  // Technical & Tools
  if (
    lowerContent.includes("setup") ||
    lowerContent.includes("install") ||
    lowerContent.includes("config")
  ) {
    return "setup-guides";
  }

  // Content
  if (
    lowerContent.includes("lifestyle") ||
    lowerContent.includes("travel") ||
    lowerContent.includes("hotel") ||
    lowerContent.includes("restaurant")
  ) {
    return "the-good-life";
  }
  // Framework / philosophy / essay-style synthesis (before art so "The Art of X" books don't hit art-collections)
  if (
    lowerContent.includes("framework") ||
    lowerContent.includes("synthesis") ||
    lowerContent.includes("latticework") ||
    lowerContent.includes("mental model") ||
    lowerContent.includes("munger") ||
    lowerContent.includes("taleb") ||
    lowerContent.includes("bostrom") ||
    lowerContent.includes("decision-making") ||
    (lowerContent.includes("philosophy") &&
      (lowerContent.includes("trading") ||
        lowerContent.includes("investment") ||
        lowerContent.includes("economics")))
  ) {
    return "substack-essays";
  }
  // art-collections: require real art/NFT/collectibles context, not bare "art" (e.g. "The Art of Manipulation")
  const artLike =
    lowerContent.includes("nft") ||
    lowerContent.includes("collectibles") ||
    lowerContent.includes("cryptopunk") ||
    lowerContent.includes("opensea") ||
    lowerContent.includes("generative art") ||
    lowerContent.includes("physical art") ||
    lowerContent.includes("art market") ||
    (lowerContent.includes("collect") &&
      (lowerContent.includes("art") || lowerContent.includes("nft")));
  if (artLike) {
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
  timestamp: number,
  opts?: { sourceUrl?: string; ingestedWith?: string },
): Promise<IKnowledgeGenerationResult> {
  try {
    const sourceUrl = opts?.sourceUrl ?? `chat://vince-upload/${timestamp}`;
    const ingestedWith = opts?.ingestedWith ?? "vince-upload";
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
    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

    // Generate markdown content (structure aligns with knowledge/README.md and KNOWLEDGE-USAGE-GUIDELINES.md)
    const knowledgeNote = `> **Knowledge base note:** Numbers and metrics here are illustrative from the source; use for methodologies and frameworks, not as current data. For live data use actions/APIs.`;
    const markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
source: ${sourceUrl}
category: ${category}
ingestedWith: ${ingestedWith}
tags:
  - vince-upload
  - user-submitted
  - chat
created: ${new Date(timestamp).toISOString()}
wordCount: ${wordCount}
---

# ${title}

${knowledgeNote}

## Content

${content}
`;

    // Write file
    fs.writeFileSync(filepath, markdownContent, "utf-8");

    logger.info(
      { filepath, category, wordCount },
      "[VINCE_UPLOAD] Fallback storage: File saved",
    );

    return {
      success: true,
      file: {
        category,
        filename,
        filepath,
        content: markdownContent,
        metadata: {
          source: "vince-upload",
          sourceUrl,
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
async function tryLoadKnowledgeFileService(
  runtime: IAgentRuntime,
): Promise<IKnowledgeFileService | null> {
  try {
    // Try dynamic import - this will fail gracefully if plugin is not installed
    // Using variable path to prevent TypeScript from checking the module at compile time
    const modulePath =
      "../../../../plugin-knowledge-ingestion/src/services/knowledge-file.service";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = await import(/* @vite-ignore */ modulePath);
    if (module?.KnowledgeFileService) {
      const service = new module.KnowledgeFileService(runtime);
      await service.initialize(runtime);
      logger.debug(
        "[VINCE_UPLOAD] KnowledgeFileService loaded from plugin-knowledge-ingestion",
      );
      return service as IKnowledgeFileService;
    }
  } catch (e) {
    // Expected when plugin is not installed - fall back to simple storage
    logger.debug(
      "[VINCE_UPLOAD] plugin-knowledge-ingestion not available, using fallback storage",
    );
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
  description: `Feed VINCE more knowledge so the ML pipeline keeps getting smarter. Supports text, URLs, and YouTube videos.

TRIGGERS:
1. "upload:", "save this:", "ingest:", "remember:" - Saves content to knowledge base
2. YouTube URLs - Transcribes video and saves to knowledge
3. Long pasted content (1000+ chars) without conversational tone - Auto-ingests

Use this action whenever you want to add long-form research to knowledge/.`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text || "";

    // Skip agent's own messages
    if (message.entityId === runtime.agentId) {
      return false;
    }

    // Priority 1: Standalone or prominent YouTube URL (allow even if short)
    if (containsYouTubeUrl(text)) {
      logger.info("[VINCE_UPLOAD] YouTube URL detected");
      return true;
    }

    // Skip if too short for other content (including upload-intent-only like "upload")
    if (text.length < MIN_TEXT_LENGTH) {
      return false;
    }

    // Priority 2: Explicit upload intent keywords
    if (hasUploadIntent(text)) {
      logger.info("[VINCE_UPLOAD] Upload intent detected");
      return true;
    }

    // Priority 3: Long pasted content (non-conversational)
    if (
      text.length >= AUTO_INGEST_LENGTH &&
      looksPastedNotConversational(text)
    ) {
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

      const isConversational = conversationalStart.some((p) =>
        p.test(firstLine.trim()),
      );
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
    callback?: HandlerCallback,
  ): Promise<void> => {
    const text = message.content?.text || "";
    const startTime = Date.now();

    try {
      // --- YouTube: run summarize CLI (transcript + summary) then save ---
      const youtubeUrl = extractYouTubeUrl(text);
      if (youtubeUrl) {
        if (callback) {
          await callback({
            text: `🎥 **Processing YouTube**\n\n${youtubeUrl}\n\nFetching transcript and summary via summarize... This may take 1–2 minutes.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
            actions: ["VINCE_UPLOAD"],
          });
        }
        const summarized = await runSummarizeCli(youtubeUrl, {
          isYouTube: true,
        });
        if (summarized && "content" in summarized) {
          const timestamp = Date.now();
          const title = generateTitle(summarized.content);
          const knowledgeService = await tryLoadKnowledgeFileService(runtime);
          const fileResult = knowledgeService
            ? await (async () => {
                const category = await knowledgeService.categorizeContent(
                  summarized.content,
                  "article",
                );
                const slugTitle = title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .slice(0, 50);
                return knowledgeService.generateKnowledgeFile({
                  sourceType: "article",
                  sourceUrl: summarized.sourceUrl,
                  sourceId: `vince-${timestamp}`,
                  additionalContext: summarized.content,
                  suggestedCategory: category,
                  suggestedFilename: `vince-upload-${slugTitle}-${timestamp}.md`,
                  tags: ["vince-upload", "user-submitted", "youtube"],
                  preserveOriginal: true,
                });
              })()
            : await simpleFallbackStorage(
                runtime,
                summarized.content,
                title,
                timestamp,
                { sourceUrl: summarized.sourceUrl, ingestedWith: "summarize" },
              );
          if (callback && fileResult.success && fileResult.file) {
            await callback({
              text: `✅ **YouTube saved to knowledge**\n\n**Source**: ${summarized.sourceUrl}\n**Category**: \`${fileResult.file.category}\`\n**File**: \`${fileResult.file.filename}\`\n**Words**: ${fileResult.file.metadata.wordCount}\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
              actions: ["VINCE_UPLOAD"],
            });
          } else if (callback && !fileResult.success) {
            await callback({
              text: `❌ Save failed: ${fileResult.error ?? "Unknown"}\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
              actions: ["VINCE_UPLOAD"],
            });
          }
          return;
        }
        if (callback) {
          const errMsg =
            summarized && "error" in summarized
              ? [summarized.error, summarized.stderr]
                  .filter(Boolean)
                  .join(summarized.stderr ? "\n(summarize): " : "")
              : "summarize timed out or isn't installed";
          await callback({
            text: `⚠️ **Couldn't fetch that YouTube**\n\n${errMsg}\n\n• Install: \`bun install -g @steipete/summarize\` and set \`OPENAI_API_KEY\` or \`GEMINI_API_KEY\`\n• Or paste the transcript here and I'll save it.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
            actions: ["VINCE_UPLOAD"],
          });
        }
        return;
      }

      // --- Single URL (article/PDF): run summarize then save (skip X/twitter — no API, summarize can't get post content) ---
      let content = extractContent(text);
      const singleUrl =
        content.trim().length < 500 && extractSingleUrl(content);
      if (singleUrl && hasUploadIntent(text)) {
        if (isXOrTwitterUrl(singleUrl)) {
          if (callback) {
            await callback({
              text: `⚠️ **X (Twitter) links can't be fetched here**\n\nWe don't have the X API, so I can't pull the post/thread content from that link. Summarize only gets the page shell (hence the 14-word “article” you saw).\n\n**What works:** Paste the thread or article text into chat (in one or more messages), then say **\"upload that\"** and I'll combine those messages and save them to knowledge so we keep most or all of the content.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
              actions: ["VINCE_UPLOAD"],
            });
          }
          return;
        }
        const urlContent = content.trim();
        if (
          urlContent === singleUrl ||
          (urlContent.startsWith(singleUrl) &&
            urlContent.length < singleUrl.length + 50)
        ) {
          if (callback) {
            await callback({
              text: `🔗 **Fetching URL**\n\n${singleUrl}\n\nSummarizing... (up to ~90s)\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
              actions: ["VINCE_UPLOAD"],
            });
          }
          const summarized = await runSummarizeCli(singleUrl, {
            isYouTube: false,
          });
          if (summarized && "content" in summarized) {
            content = summarized.content;
            const timestamp = Date.now();
            const title = generateTitle(content);
            const knowledgeService = await tryLoadKnowledgeFileService(runtime);
            let fileResult: IKnowledgeGenerationResult;
            if (knowledgeService) {
              const category = await knowledgeService.categorizeContent(
                content,
                "article",
              );
              const slugTitle = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 50);
              fileResult = await knowledgeService.generateKnowledgeFile({
                sourceType: "article",
                sourceUrl: summarized.sourceUrl,
                sourceId: `vince-${timestamp}`,
                additionalContext: content,
                suggestedCategory: category,
                suggestedFilename: `vince-upload-${slugTitle}-${timestamp}.md`,
                tags: ["vince-upload", "user-submitted", "url"],
                preserveOriginal: true,
              });
            } else {
              fileResult = await simpleFallbackStorage(
                runtime,
                content,
                title,
                timestamp,
                { sourceUrl: summarized.sourceUrl, ingestedWith: "summarize" },
              );
            }
            if (callback && fileResult.success && fileResult.file) {
              await callback({
                text: `✅ **URL saved to knowledge**\n\n**Source**: ${summarized.sourceUrl}\n**Category**: \`${fileResult.file.category}\`\n**File**: \`${fileResult.file.filename}\`\n**Words**: ${fileResult.file.metadata.wordCount}\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
                actions: ["VINCE_UPLOAD"],
              });
            } else if (callback && !fileResult.success) {
              await callback({
                text: `❌ Save failed: ${fileResult.error ?? "Unknown"}\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
                actions: ["VINCE_UPLOAD"],
              });
            }
            return;
          }
          if (callback) {
            const errMsg =
              summarized && "error" in summarized
                ? [summarized.error, summarized.stderr]
                    .filter(Boolean)
                    .join(summarized.stderr ? "\n(summarize): " : "")
                : "Install `bun install -g @steipete/summarize` and set an API key, or paste the article text here.";
            await callback({
              text: `⚠️ **Couldn't fetch that URL**\n\n${errMsg}\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*`,
              actions: ["VINCE_UPLOAD"],
            });
          }
          return;
        }
      }

      // --- "Upload that" / "save that": use recent user messages combined (captures full dumps split across messages; no X API) ---
      if (
        content.length <= MAX_REFERENCE_MESSAGE_LENGTH &&
        looksLikeUploadThat(text)
      ) {
        const combinedContent = await getRecentUserMessagesContent(
          runtime,
          message.roomId,
          message.id,
          {
            minLength: MIN_TEXT_LENGTH,
            maxMessages: MAX_RECENT_USER_MESSAGES_TO_COMBINE,
          },
        );
        if (combinedContent) {
          content = combinedContent;
          logger.info(
            { contentLength: content.length },
            "[VINCE_UPLOAD] Using combined recent user messages (upload that)",
          );
        }
      }

      // --- Plain text / pasted content: prepend recent user messages so multi-message dumps are captured (no X API) ---
      if (content.length >= MIN_TEXT_LENGTH) {
        const previousBlock = await getRecentUserMessagesContent(
          runtime,
          message.roomId,
          message.id,
          { minLength: 100, maxMessages: MAX_RECENT_USER_MESSAGES_TO_COMBINE },
        );
        if (
          previousBlock &&
          previousBlock.length > 0 &&
          !previousBlock.includes(content.trim().slice(0, 200))
        ) {
          const combined = `${previousBlock}\n\n${content}`.trim();
          if (combined.length > content.length) {
            content = combined;
            logger.info(
              { contentLength: content.length },
              "[VINCE_UPLOAD] Prepended recent user messages to capture full dump",
            );
          }
        }
      }

      // --- Plain text / pasted content ---
      if (content.length < MIN_TEXT_LENGTH) {
        if (callback) {
          await callback({
            text: "The content is too short to save. Please provide more substantial content (at least 50 characters).\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
            actions: ["VINCE_UPLOAD"],
          });
        }
        return;
      }

      logger.info(
        { contentLength: content.length },
        "[VINCE_UPLOAD] Processing content...",
      );

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
        const category = await knowledgeService.categorizeContent(
          content,
          "article",
        );
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
        fileResult = await simpleFallbackStorage(
          runtime,
          content,
          title,
          timestamp,
        );
      }

      logger.info(
        {
          success: fileResult.success,
          file: fileResult.file?.filename,
          error: fileResult.error,
          usedFallback,
        },
        "[VINCE_UPLOAD] File generation result",
      );

      // Send response
      if (callback) {
        if (fileResult.success && fileResult.file) {
          const processingTime = Date.now() - startTime;
          const wordCount = fileResult.file.metadata.wordCount ?? 0;
          const truncationWarning =
            wordCount > 0 && wordCount < LOW_WORD_COUNT_WARN_THRESHOLD
              ? `\n\n⚠️ **Only ${wordCount} words were received.** If you pasted a long article or thread, the chat may have truncated it. **Tip:** split the dump into 2–3 messages (paste chunk 1, send; paste chunk 2, send; then say \`upload that\`) so we combine them into one file.`
              : "";

          const forEliza = isElizaAgent(runtime);
          const footer = forEliza
            ? `\n\n---\nAsk me about this content anytime, or \`upload\` more.`
            : `\n\n---\nNext moves: \`ALOHA\` (vibe check) · \`PERPS\` (apply it) · \`OPTIONS\` (strike work)`;

          await callback({
            text: `✅ **Knowledge Uploaded!**

**Title**: ${title}
**Category**: \`${fileResult.file.category}\`
**File**: \`${fileResult.file.filename}\`
**Word Count**: ${wordCount}
**Processing Time**: ${processingTime}ms

Saved to \`knowledge/${fileResult.file.category}/${fileResult.file.filename}\`${truncationWarning}${footer}`,
            actions: ["VINCE_UPLOAD"],
          });
        } else {
          await callback({
            text: `❌ **Upload Failed**

**Error**: ${fileResult.error || "Unknown error"}

Please try again or rephrase the content.

---
Need context instead? \`ALOHA\` · \`PERPS\` · \`OPTIONS\``,
            actions: ["VINCE_UPLOAD"],
          });
        }
      }
    } catch (error) {
      logger.error({ error }, "[VINCE_UPLOAD] Unexpected error");

      if (callback) {
        await callback({
          text: `❌ An error occurred while uploading: ${String(error)}\n\n---\nNeed context instead? \`ALOHA\` · \`PERPS\` · \`OPTIONS\``,
          actions: ["VINCE_UPLOAD"],
        });
      }
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "upload: Bitcoin's halving cycle typically creates a supply shock 12-18 months after the event, leading to price appreciation. The 2024 halving follows the same pattern.",
        },
      },
      {
        name: "VINCE",
        content: {
          text: "✅ **Knowledge Uploaded!**\n\n**Title**: Bitcoin's halving cycle typically creates...\n**Category**: `bitcoin-maxi`\n**File**: `vince-upload-bitcoin-halving-cycle.md`\n**Word Count**: 48\n\nSaved to `knowledge/bitcoin-maxi/vince-upload-bitcoin-halving-cycle.md`\n\n---\nNext moves: `ALOHA` · `PERPS` · `OPTIONS`",
          actions: ["VINCE_UPLOAD"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "save this: The best covered call strikes for BTC are typically 10-15% OTM with 7-14 DTE. This balances premium capture with assignment risk.",
        },
      },
      {
        name: "VINCE",
        content: {
          text: "✅ **Knowledge Uploaded!**\n\n**Title**: The best covered call strikes for BTC...\n**Category**: `options`\n**File**: `vince-upload-btc-covered-call-strategy.md`\n**Word Count**: 35\n\nSaved to `knowledge/options/vince-upload-btc-covered-call-strategy.md`\n\n---\nNext moves: `ALOHA` · `PERPS` · `OPTIONS`",
          actions: ["VINCE_UPLOAD"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "remember: Hyperliquid's points program is still live. Running MM and DN strategies across multiple venues compounds airdrop potential.",
        },
      },
      {
        name: "VINCE",
        content: {
          text: "✅ **Knowledge Uploaded!**\n\n**Title**: Hyperliquid's points program is still live...\n**Category**: `grinding-the-trenches`\n**File**: `vince-upload-hyperliquid-airdrop-strategy.md`\n**Word Count**: 28\n\nSaved to `knowledge/grinding-the-trenches/vince-upload-hyperliquid-airdrop-strategy.md`\n\n---\nNext moves: `ALOHA` · `PERPS` · `OPTIONS`",
          actions: ["VINCE_UPLOAD"],
        },
      },
    ],
  ],
};

export default vinceUploadAction;
