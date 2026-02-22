/**
 * Eliza UPLOAD Action — Content ingestion for the knowledge base.
 *
 * Eliza owns content ingestion (UPLOAD) and content production; this action
 * is self-contained in plugin-eliza (no dependency on plugin-vince).
 *
 * Supports: raw text, URLs (articles/PDFs), YouTube (transcript + summary)
 * via @steipete/summarize CLI. Same env vars as the shared pipeline for
 * compatibility: VINCE_UPLOAD_EXTRACT_ONLY, VINCE_UPLOAD_SUMMARY_LENGTH, etc.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  UUID,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type {
  KnowledgeCategory,
  IKnowledgeGenerationResult,
} from "../types/upload";
import { getKnowledgeRoot } from "../config/paths";
import {
  initXClientFromEnv,
  getXClient,
} from "../../../plugin-x-research/src/services/xClient.service";
import { XThreadsService } from "../../../plugin-x-research/src/services/xThreads.service";

const MIN_TEXT_LENGTH = 50;

function looksLikeMichelinEmbedDump(content: string): boolean {
  if (!content || !content.includes("guide.michelin.com")) return false;
  const hasRepeatedEmbed =
    (content.match(/Embed\s*#\d+/gi)?.length ?? 0) >= 2 ||
    (content.match(/MICHELIN Guide Restaurant/gi)?.length ?? 0) >= 2;
  return hasRepeatedEmbed;
}

function getMessageTextForUrlCheck(message: Memory): string {
  const content = message.content as Record<string, unknown> | undefined;
  if (!content) return message.content?.text ?? "";
  const parts: string[] = [];
  if (typeof content.text === "string" && content.text.trim())
    parts.push(content.text.trim());
  const attachments = content.attachments as
    | Array<{ url?: string }>
    | undefined;
  if (Array.isArray(attachments)) {
    for (const a of attachments) {
      if (a?.url && typeof a.url === "string") parts.push(a.url);
    }
  }
  const embeds = content.embeds as Array<{ url?: string }> | undefined;
  if (Array.isArray(embeds)) {
    for (const e of embeds) {
      if (e?.url && typeof e.url === "string") parts.push(e.url);
    }
  }
  return parts.join(" ");
}

const AUTO_INGEST_LENGTH = 500;
const LONG_DUMP_LENGTH = 1000;
const LOW_WORD_COUNT_WARN_THRESHOLD = 400;

const UPLOAD_THAT_PATTERNS = [
  /^(upload|save|ingest|remember|add to knowledge|store)\s+(that|the above|the previous|it|this)\s*\.?$/i,
  /^(upload|save|ingest|remember)\s*:\s*that\s*\.?$/i,
];
const MAX_REFERENCE_MESSAGE_LENGTH = 120;

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

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=[\w-]+/i,
  /youtu\.be\/[\w-]+/i,
  /youtube\.com\/embed\/[\w-]+/i,
];

function containsYouTubeUrl(text: string): boolean {
  return YOUTUBE_PATTERNS.some((p) => p.test(text));
}

function extractYouTubeUrl(text: string): string | null {
  const patterns = [
    /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=[\w-]+)/i,
    /(https?:\/\/)?(youtu\.be\/[\w-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const url = match[0];
      return url.startsWith("http") ? url : "https://" + url;
    }
  }
  return null;
}

const GENERIC_URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;
const X_TWITTER_HOST_PATTERN = /^https?:\/\/(www\.)?(x\.com|twitter\.com)\//i;

function isXOrTwitterUrl(url: string): boolean {
  return X_TWITTER_HOST_PATTERN.test(url.trim());
}

function extractSingleUrl(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(GENERIC_URL_REGEX);
  if (!match) return null;
  const url = match[0].replace(/[.,;:!?)]+$/, "");
  return url.length >= 10 ? url : null;
}

const SUMMARY_LENGTH_PRESETS = [
  "short",
  "medium",
  "long",
  "xl",
  "xxl",
] as const;

// Custom word counts (e.g. "3000", "5k", "10000") are also valid for the CLI
const CUSTOM_LENGTH_RE = /^\d+k?$/i;

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

type SummarizeResult =
  | { content: string; sourceUrl: string }
  | { error: string; stderr?: string };

async function runSummarizeCli(
  url: string,
  options: {
    isYouTube?: boolean;
    timeoutMs?: number;
    extractOnly?: boolean;
  } = {},
): Promise<SummarizeResult | null> {
  const { isYouTube = false, extractOnly } = options;
  // YouTube defaults to extract mode (full transcript) unless explicitly disabled.
  // Model output limits (~4096 tokens) make summaries too short for long podcasts.
  // Full transcripts are better for RAG anyway. Set VINCE_UPLOAD_EXTRACT_ONLY=false to force summary mode.
  const envExtract = process.env.VINCE_UPLOAD_EXTRACT_ONLY?.toLowerCase();
  const useExtractOnly =
    extractOnly ??
    (envExtract === "true" || envExtract === "1"
      ? true
      : envExtract === "false" || envExtract === "0"
        ? false
        : isYouTube);
  const youtubeSlides =
    isYouTube &&
    (process.env.VINCE_UPLOAD_YOUTUBE_SLIDES === "true" ||
      process.env.VINCE_UPLOAD_YOUTUBE_SLIDES === "1");
  // Accepts presets (short/medium/long/xl/xxl) or custom word counts (e.g. "3000", "5k")
  const lengthEnv = (process.env.VINCE_UPLOAD_SUMMARY_LENGTH ?? "xl")
    .toLowerCase()
    .trim();
  const isPreset = SUMMARY_LENGTH_PRESETS.includes(
    lengthEnv as (typeof SUMMARY_LENGTH_PRESETS)[number],
  );
  const isCustom = CUSTOM_LENGTH_RE.test(lengthEnv);
  const length = isPreset || isCustom ? lengthEnv : "xl";
  // Allow setting max output tokens for even longer summaries (e.g., 8000 for 90-min interviews)
  const maxOutputTokens = process.env.VINCE_UPLOAD_MAX_TOKENS;
  // Longer timeouts for xl/xxl content
  const isLongContent =
    length === "xl" || length === "xxl" || !!maxOutputTokens;
  let timeoutMs = isYouTube ? (isLongContent ? 360_000 : 240_000) : 90_000;
  if (youtubeSlides) timeoutMs = 360_000;
  const timeoutSec = Math.ceil(timeoutMs / 1000) + 30;
  const timeoutArg =
    timeoutSec >= 60 ? `${Math.ceil(timeoutSec / 60)}m` : `${timeoutSec}s`;

  const cliArgs = [url, "--plain", "--no-color", "--timeout", timeoutArg];
  if (useExtractOnly) {
    cliArgs.push("--extract", "--format", "md");
    if (isYouTube) cliArgs.push("--markdown-mode", "llm");
  } else {
    cliArgs.push("--length", length);
    // Allow extra output tokens for very long content (e.g., 8000 for 90-min interviews)
    if (maxOutputTokens) {
      cliArgs.push("--max-output-tokens", maxOutputTokens);
    }
  }
  if (isYouTube) cliArgs.push("--youtube", "auto");
  if (youtubeSlides) {
    const knowledgeRoot = getKnowledgeRoot();
    cliArgs.push(
      "--slides",
      "--slides-dir",
      path.join(knowledgeRoot, ".slides"),
    );
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

  logger.info(
    { cmd: summarizeCommand, args: summarizeArgs.join(" ") },
    "[UPLOAD] summarize CLI command",
  );

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
          "[UPLOAD] summarize CLI timed out",
        );
        resolve({ error: "Timed out", stderr: stderr.slice(0, 300) });
      }, timeoutMs);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          logger.debug(
            { code, stderr: stderr.slice(0, 500) },
            "[UPLOAD] summarize CLI exited non-zero",
          );
          resolve({
            error: "Summarize failed",
            stderr: stderr.trim().slice(0, 300),
          });
          return;
        }
        const content = stdout.trim();
        if (content.length < MIN_TEXT_LENGTH) {
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
        resolve({
          error: String(err),
          stderr: (err as Error).message?.slice(0, 200),
        });
      });
    });

  let result = await runOne();
  if (result && "error" in result && result.error !== "Too little content") {
    logger.info({ url }, "[UPLOAD] summarize failed, retrying once");
    result = await runOne();
  }
  return result;
}

function hasUploadIntent(text: string): boolean {
  return UPLOAD_INTENT_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
}

function looksPastedNotConversational(text: string): boolean {
  const conversationalSignals = [
    /^(my |i'm |i am |i think |i believe |i've |i have |we |our )/i,
    /^(yes|no|yeah|nope|sure|exactly|agreed|right|true|absolutely)/i,
    /^(so |well |but |and |also |actually |honestly )/i,
    /\?$/,
    /(what do you|what's your|how do you|do you think)/i,
  ];
  for (const pattern of conversationalSignals) {
    if (pattern.test(text.trim())) return false;
  }
  const pastedSignals = [
    /^#+ /m,
    /^[-*•] /m,
    /^\d+\.\s/m,
    /^[A-Z][A-Z0-9_]+[.:=]/m,
    /^```/m,
    /\n[-*•] /m,
    /^>\s/m,
  ];
  for (const pattern of pastedSignals) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function extractContent(text: string): string {
  const lowerText = text.toLowerCase();
  for (const keyword of UPLOAD_INTENT_KEYWORDS) {
    const idx = lowerText.indexOf(keyword);
    if (idx !== -1) {
      let content = text
        .slice(idx + keyword.length)
        .trim()
        .replace(/^[:\-\s]+/, "")
        .trim();
      return content;
    }
  }
  return text;
}

function looksLikeUploadThat(text: string): boolean {
  if (text.trim().length > MAX_REFERENCE_MESSAGE_LENGTH) return false;
  return UPLOAD_THAT_PATTERNS.some((p) => p.test(text.trim()));
}

const MAX_RECENT_USER_MESSAGES_TO_COMBINE = 10;

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
    return content.length >= minLength ? content : null;
  } catch {
    return null;
  }
}

function generateTitle(content: string): string {
  const firstLine = content.split("\n")[0].trim();
  return firstLine.length > 100
    ? firstLine.slice(0, 100) + "..."
    : firstLine || "Untitled Knowledge";
}

function detectSimpleCategory(content: string): KnowledgeCategory {
  // For X/Twitter content, strip author/metadata lines to avoid false positives
  // from handles (e.g. "ikigailabsETH" triggering "altcoins" via "eth ")
  const isXContent =
    content.startsWith("Tweet by @") ||
    content.startsWith("Thread by @") ||
    content.startsWith("Twitter Article by @");
  let textForMatching = content;
  if (isXContent) {
    textForMatching = content
      .split("\n")
      .filter((line) => {
        const l = line.trim().toLowerCase();
        return (
          !l.startsWith("tweet by @") &&
          !l.startsWith("thread by @") &&
          !l.startsWith("twitter article by @") &&
          !l.startsWith("source:") &&
          !l.startsWith("engagement:") &&
          !l.startsWith("posted:")
        );
      })
      .join("\n");
  }
  const lowerContent = textForMatching.toLowerCase();
  if (
    lowerContent.includes("openclaw") ||
    lowerContent.includes("clawdbot") ||
    lowerContent.includes("claw bot") ||
    lowerContent.includes("claw framework")
  )
    return "internal-docs";
  if (
    lowerContent.includes("perp") ||
    lowerContent.includes("funding") ||
    lowerContent.includes("liquidat")
  )
    return "perps-trading";
  if (
    /\boptions?\s+(chain|trading|strategy|spread|premium|expir)/i.test(
      textForMatching,
    ) ||
    lowerContent.includes("covered call") ||
    lowerContent.includes("put option") ||
    lowerContent.includes("call option") ||
    lowerContent.includes("strike price") ||
    lowerContent.includes("implied volatility") ||
    (lowerContent.includes("strike") && lowerContent.includes("expir"))
  )
    return "options";
  if (
    lowerContent.includes("defi") ||
    lowerContent.includes("tvl") ||
    lowerContent.includes("yield")
  )
    return "defi-metrics";
  if (
    lowerContent.includes("airdrop") ||
    lowerContent.includes("farm") ||
    lowerContent.includes("memecoin") ||
    lowerContent.includes("pump.fun")
  )
    return "grinding-the-trenches";
  // Specific categories first (venture-capital, macro) before broad ones (altcoins)
  if (
    lowerContent.includes("venture") ||
    lowerContent.includes("vc ") ||
    lowerContent.includes("fundrais") ||
    lowerContent.includes("fund raise") ||
    lowerContent.includes("lp ") ||
    lowerContent.includes("limited partner")
  )
    return "venture-capital";
  if (
    lowerContent.includes("macro") ||
    lowerContent.includes("fed") ||
    lowerContent.includes("inflation") ||
    lowerContent.includes("interest rate")
  )
    return "macro-economy";
  if (
    lowerContent.includes("bitcoin") ||
    lowerContent.includes("btc") ||
    lowerContent.includes("halving")
  )
    return "bitcoin-maxi";
  if (
    lowerContent.includes("solana") ||
    lowerContent.includes("sol ") ||
    lowerContent.includes("spl token")
  )
    return "solana";
  if (
    lowerContent.includes("altcoin") ||
    lowerContent.includes("eth ") ||
    lowerContent.includes("ethereum")
  )
    return "altcoins";
  if (
    lowerContent.includes("setup") ||
    lowerContent.includes("install") ||
    lowerContent.includes("config")
  )
    return "setup-guides";
  if (
    lowerContent.includes("lifestyle") ||
    lowerContent.includes("travel") ||
    lowerContent.includes("hotel") ||
    lowerContent.includes("restaurant")
  )
    return "the-good-life";
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
  )
    return "substack-essays";
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
  if (artLike) return "art-collections";
  if (
    lowerContent.includes("ai agent") ||
    lowerContent.includes("ai agents") ||
    lowerContent.includes("agent framework") ||
    lowerContent.includes("elizaos") ||
    lowerContent.includes("eliza os") ||
    lowerContent.includes("autonomous agent") ||
    lowerContent.includes("multi-agent") ||
    lowerContent.includes("agent economy") ||
    lowerContent.includes("agent infrastructure")
  )
    return "ai-agents";
  if (isXContent) return "x-posts";
  return "uncategorized";
}

async function simpleFallbackStorage(
  _runtime: IAgentRuntime,
  content: string,
  title: string,
  timestamp: number,
  opts?: { sourceUrl?: string; ingestedWith?: string },
): Promise<IKnowledgeGenerationResult> {
  try {
    if (looksLikeMichelinEmbedDump(content)) {
      logger.debug(
        "[UPLOAD] simpleFallbackStorage: refused Michelin embed dump",
      );
      return {
        success: false,
        error:
          "Michelin link preview content: post link in #knowledge for ADD_MICHELIN_RESTAURANT",
      };
    }
    const sourceUrl = opts?.sourceUrl ?? `chat://eliza-upload/${timestamp}`;
    const ingestedWith = opts?.ingestedWith ?? "eliza-upload";
    const category = detectSimpleCategory(content);
    const slugTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);
    const filename = `eliza-upload-${slugTitle}-${timestamp}.md`;

    const knowledgeBasePath = getKnowledgeRoot();
    const categoryPath = path.join(knowledgeBasePath, category);
    const filepath = path.join(categoryPath, filename);

    if (!fs.existsSync(categoryPath)) {
      fs.mkdirSync(categoryPath, { recursive: true });
    }

    const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
    const knowledgeNote = `> **Knowledge base note:** Numbers and metrics here are illustrative from the source; use for methodologies and frameworks, not as current data. For live data use VINCE.`;
    const markdownContent = `---
title: "${title.replace(/"/g, '\\"')}"
source: ${sourceUrl}
category: ${category}
ingestedWith: ${ingestedWith}
tags:
  - eliza-upload
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

    fs.writeFileSync(filepath, markdownContent, "utf-8");
    logger.debug({ filepath, category, wordCount }, "[UPLOAD] File saved");

    return {
      success: true,
      file: {
        category,
        filename,
        filepath,
        content: markdownContent,
        metadata: {
          source: "eliza-upload",
          sourceUrl,
          processedAt: new Date(timestamp).toISOString(),
          wordCount,
          tags: ["eliza-upload", "user-submitted", "chat"],
        },
      },
    };
  } catch (error) {
    logger.error({ error }, "[UPLOAD] Fallback storage error");
    return { success: false, error: String(error) };
  }
}

const ELIZA_FOOTER =
  "\n\n---\nAsk me about this content anytime, or `upload` more.";

export const uploadAction: Action = {
  name: "UPLOAD",
  similes: [
    "SAVE_KNOWLEDGE",
    "INGEST",
    "REMEMBER",
    "ADD_KNOWLEDGE",
    "STORE_KNOWLEDGE",
    "FETCH_TWEET",
    "SAVE_TWEET",
    "FETCH_THREAD",
  ],
  description: `Upload content to the knowledge base. Supports text, URLs, YouTube videos, and X/Twitter posts and threads.

IMPORTANT: When the user shares an X (twitter.com or x.com) link, ALWAYS use this action. This action fetches the full tweet or thread via the X API and saves it to the knowledge base. Do NOT reply with advice to copy-paste — this action handles X links directly.

TRIGGERS:
- X/Twitter URLs (x.com/*/status/* or twitter.com/*/status/*) — Fetches tweet or full thread via API and saves
- YouTube URLs — Transcribes video and saves transcript + summary
- Article/PDF URLs — Fetches and summarizes via summarize CLI
- "upload:", "save this:", "ingest:", "remember:" — Saves content to knowledge/
- Long pasted content (1000+ chars) — Auto-ingests

Use this for expanding the knowledge corpus with research, articles, videos, tweets, threads, and frameworks.`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text || "";
    const fullMessageText = getMessageTextForUrlCheck(message);

    if (message.entityId === runtime.agentId) return false;
    if (fullMessageText.includes("guide.michelin.com")) {
      logger.debug(
        "[UPLOAD] Skipping: Michelin link → use #knowledge + ADD_MICHELIN_RESTAURANT",
      );
      return false;
    }
    if (containsYouTubeUrl(text)) return true;
    // Auto-trigger on X/Twitter links - no keyword needed
    if (extractSingleUrl(text) && isXOrTwitterUrl(extractSingleUrl(text)!))
      return true;
    if (text.length < MIN_TEXT_LENGTH) return false;
    if (hasUploadIntent(text)) return true;
    if (text.length >= AUTO_INGEST_LENGTH && looksPastedNotConversational(text))
      return true;
    if (text.length >= LONG_DUMP_LENGTH) {
      const firstLine = text.trim().split("\n")[0];
      const conversationalStart = [
        /^(so |well |but |and |also |actually |honestly |look |anyway )/i,
        /^(my |i'm |i am |i think |i believe )/i,
        /^(yes|no|yeah|nope|sure|exactly|agreed|right|true|absolutely)/i,
        /\?$/,
      ];
      if (!conversationalStart.some((p) => p.test(firstLine.trim())))
        return true;
    }
    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const text = message.content?.text || "";
    const fullText = getMessageTextForUrlCheck(message);
    const startTime = Date.now();

    try {
      const youtubeUrl = extractYouTubeUrl(fullText);
      if (youtubeUrl) {
        if (callback) {
          await callback({
            text: `🎥 **Processing YouTube**\n\n${youtubeUrl}\n\nFetching transcript and summary via summarize... This may take 1–2 minutes.${ELIZA_FOOTER}`,
            actions: ["UPLOAD"],
          });
        }
        const summarized = await runSummarizeCli(youtubeUrl, {
          isYouTube: true,
        });
        if (summarized && "content" in summarized) {
          const timestamp = Date.now();
          const title = generateTitle(summarized.content);
          const fileResult = await simpleFallbackStorage(
            runtime,
            summarized.content,
            title,
            timestamp,
            { sourceUrl: summarized.sourceUrl, ingestedWith: "summarize" },
          );
          if (callback && fileResult.success && fileResult.file) {
            // Extract a preview from the content (first 300 chars, strip markdown)
            const contentPreview = summarized.content
              .slice(0, 300)
              .replace(/[#*_`]/g, "")
              .replace(/\n+/g, " ")
              .trim();
            await callback({
              text: `✅ **YouTube saved to knowledge**\n\n**Source**: ${summarized.sourceUrl}\n**Category**: \`${fileResult.file.category}\`\n**File**: \`${fileResult.file.filename}\`\n**Words**: ${fileResult.file.metadata.wordCount}\n\n> ${contentPreview}...\n\n💡 Want me to turn this into a **tweet thread** or **substack**?${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: true,
            });
          } else if (callback && !fileResult.success) {
            await callback({
              text: `❌ Save failed: ${fileResult.error ?? "Unknown"}${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
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
            text: `⚠️ **Couldn't fetch that YouTube**\n\n${errMsg}\n\n• Install: \`bun install -g @steipete/summarize\` and set \`OPENAI_API_KEY\` or \`GEMINI_API_KEY\`\n• Or paste the transcript here and I'll save it.${ELIZA_FOOTER}`,
            actions: ["UPLOAD"],
            success: false,
          });
        }
        return;
      }

      let content = extractContent(text);
      // Check text first, then fall back to fullText (which includes embeds/attachments)
      const singleUrl =
        (content.trim().length < 500 && extractSingleUrl(content)) ||
        extractSingleUrl(fullText);

      // ── X/Twitter URL: fetch tweet or thread via API ──────────────
      // Auto-triggers on X links (no "upload" keyword required)
      if (singleUrl && isXOrTwitterUrl(singleUrl)) {
        try {
          initXClientFromEnv(runtime);
          const xClient = getXClient();

          if (!xClient) {
            if (callback) {
              await callback({
                text: `X API not configured. Set ELIZA_X_BEARER_TOKEN or X_BEARER_TOKEN in your .env to fetch tweets and threads.${ELIZA_FOOTER}`,
                actions: ["UPLOAD"],
                success: false,
              });
            }
            return;
          }

          const tweetIdMatch = singleUrl.match(
            /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
          );
          if (!tweetIdMatch) {
            if (callback) {
              await callback({
                text: `Couldn't parse tweet ID from that URL: ${singleUrl}${ELIZA_FOOTER}`,
                actions: ["UPLOAD"],
                success: false,
              });
            }
            return;
          }

          const tweetId = tweetIdMatch[1];

          if (callback) {
            await callback({
              text: `Fetching from X...\n\n${singleUrl}`,
              actions: ["UPLOAD"],
            });
          }

          // Try thread fetch first (handles both single tweets and threads)
          let threadTweets: Array<{
            text: string;
            author?: { username?: string; name?: string };
            authorId?: string;
            metrics?: {
              likeCount?: number;
              retweetCount?: number;
              replyCount?: number;
            };
            id: string;
            createdAt?: string;
          }> = [];
          try {
            const threadsService = new XThreadsService(xClient);
            threadTweets = await threadsService.getThread(tweetId);
          } catch (threadErr) {
            logger.debug(
              { threadErr },
              "[UPLOAD] Thread fetch failed, falling back to single tweet",
            );
          }

          // Fallback: single tweet
          if (threadTweets.length === 0) {
            const tweet = await xClient.getTweet(tweetId);
            if (tweet) {
              threadTweets = [tweet];
            }
          }

          if (threadTweets.length === 0) {
            if (callback) {
              await callback({
                text: `Tweet not found — it may be deleted or private.${ELIZA_FOOTER}`,
                actions: ["UPLOAD"],
                success: false,
              });
            }
            return;
          }

          const rootTweet = threadTweets[0];
          const authorHandle =
            rootTweet.author?.username ?? rootTweet.authorId ?? "unknown";
          const authorName = rootTweet.author?.name ?? authorHandle;
          const isThread = threadTweets.length > 1;

          // Detect Twitter Articles / t.co-only tweets: if all tweets are just
          // t.co links, the real content is the article behind the link. Fetch it.
          const TCO_ONLY_RE = /^https?:\/\/t\.co\/\w+$/;
          const allTco = threadTweets.every((t) =>
            TCO_ONLY_RE.test(t.text.trim()),
          );

          if (allTco) {
            // Twitter Article: the tweet text is just a t.co redirect to an
            // X-hosted article. X blocks scrapers, so we can't fetch the body.
            // But the API gives us article.title. Save what we have and tell
            // the user to paste the full text if they want the body.
            const articleTitle = (rootTweet as any).article?.title as
              | string
              | undefined;
            const totalLikes = threadTweets.reduce(
              (s, t) => s + (t.metrics?.likeCount ?? 0),
              0,
            );
            const totalRTs = threadTweets.reduce(
              (s, t) => s + (t.metrics?.retweetCount ?? 0),
              0,
            );
            const totalReplies = threadTweets.reduce(
              (s, t) => s + (t.metrics?.replyCount ?? 0),
              0,
            );

            if (articleTitle) {
              logger.info(
                { articleTitle },
                "[UPLOAD] Twitter Article detected — saving title and metadata",
              );
              const timestamp = Date.now();
              const articleContent = [
                `Twitter Article by @${authorHandle} (${authorName})`,
                "",
                `# ${articleTitle}`,
                "",
                `> This is a Twitter Article (long-form post hosted on X). The full article body`,
                `> is only available on x.com. To add the full text: open the link, copy the`,
                `> article content, paste it here, and say "upload that."`,
                "",
                "---",
                `Source: ${singleUrl}`,
                `Engagement: ${totalLikes} likes | ${totalRTs} retweets | ${totalReplies} replies`,
                rootTweet.createdAt ? `Posted: ${rootTweet.createdAt}` : "",
              ]
                .filter(Boolean)
                .join("\n");

              const fileResult = await simpleFallbackStorage(
                runtime,
                articleContent,
                `${authorHandle}-${articleTitle}`,
                timestamp,
                { sourceUrl: singleUrl, ingestedWith: "x-api" },
              );
              if (callback && fileResult.success && fileResult.file) {
                await callback({
                  text: `**Twitter Article saved (metadata)**\n\n**Title**: ${articleTitle}\n**Author**: @${authorHandle}\n**Source**: ${singleUrl}\n**Category**: \`${fileResult.file.category}\`\n**Engagement**: ${totalLikes} likes, ${totalRTs} RTs, ${totalReplies} replies\n\nThis is a Twitter Article — X doesn't expose the full body via API. To get the full text into the corpus: open the link, copy the article content, paste it here, and say **"upload that"**.${ELIZA_FOOTER}`,
                  actions: ["UPLOAD"],
                  success: true,
                });
              } else if (callback && !fileResult.success) {
                await callback({
                  text: `Save failed: ${fileResult.error ?? "Unknown"}${ELIZA_FOOTER}`,
                  actions: ["UPLOAD"],
                  success: false,
                });
              }
              return;
            }
            // No article title — fall through to save raw tweet
            logger.debug(
              "[UPLOAD] t.co tweet with no article title, saving as-is",
            );
          }

          // Build formatted content
          const header = isThread
            ? `Thread by @${authorHandle} (${authorName}) — ${threadTweets.length} tweets`
            : `Tweet by @${authorHandle} (${authorName})`;

          const tweetBlocks = threadTweets.map((t, i) => {
            const prefix = isThread
              ? `**[${i + 1}/${threadTweets.length}]** `
              : "";
            return `${prefix}${t.text}`;
          });

          const totalLikes = threadTweets.reduce(
            (s, t) => s + (t.metrics?.likeCount ?? 0),
            0,
          );
          const totalRTs = threadTweets.reduce(
            (s, t) => s + (t.metrics?.retweetCount ?? 0),
            0,
          );
          const totalReplies = threadTweets.reduce(
            (s, t) => s + (t.metrics?.replyCount ?? 0),
            0,
          );

          const tweetContent = [
            header,
            "",
            ...tweetBlocks,
            "",
            "---",
            `Source: ${singleUrl}`,
            `Engagement: ${totalLikes} likes | ${totalRTs} retweets | ${totalReplies} replies`,
            rootTweet.createdAt ? `Posted: ${rootTweet.createdAt}` : "",
          ]
            .filter(Boolean)
            .join("\n");

          // Save to knowledge
          const timestamp = Date.now();
          const title = isThread
            ? `${authorHandle}-thread-${rootTweet.text
                .slice(0, 60)
                .replace(/[^a-zA-Z0-9 ]/g, "")
                .trim()}`
            : `${authorHandle}-${rootTweet.text
                .slice(0, 60)
                .replace(/[^a-zA-Z0-9 ]/g, "")
                .trim()}`;

          const fileResult = await simpleFallbackStorage(
            runtime,
            tweetContent,
            title,
            timestamp,
            { sourceUrl: singleUrl, ingestedWith: "x-api" },
          );

          if (callback && fileResult.success && fileResult.file) {
            const preview = rootTweet.text.slice(0, 200);
            const typeLabel = isThread
              ? `Thread (${threadTweets.length} tweets)`
              : "Tweet";
            await callback({
              text: `**${typeLabel} saved to knowledge**\n\n**Author**: @${authorHandle}\n**Source**: ${singleUrl}\n**Category**: \`${fileResult.file.category}\`\n**File**: \`${fileResult.file.filename}\`\n**Words**: ${fileResult.file.metadata.wordCount}\n\n> ${preview}...${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: true,
            });
          } else if (callback && !fileResult.success) {
            await callback({
              text: `Save failed: ${fileResult.error ?? "Unknown"}${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
            });
          }
          return;
        } catch (xErr) {
          logger.error({ error: xErr }, "[UPLOAD] X fetch error");
          if (callback) {
            await callback({
              text: `Couldn't fetch that X post. Make sure X_BEARER_TOKEN is set in your .env. Alternatively, copy the text and paste it here, then say **"upload that"**.${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
            });
          }
          return;
        }
      }

      if (singleUrl && hasUploadIntent(text)) {
        if (singleUrl.includes("guide.michelin.com")) {
          if (callback) {
            await callback({
              text: `🔗 **Post this link in #knowledge** and I'll run **ADD_MICHELIN_RESTAURANT** to add the restaurant to \`knowledge/the-good-life/michelin-restaurants/\`.${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
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
              text: `🔗 **Fetching URL**\n\n${singleUrl}\n\nSummarizing... (up to ~90s)${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
            });
          }
          const summarized = await runSummarizeCli(singleUrl, {
            isYouTube: false,
          });
          if (summarized && "content" in summarized) {
            content = summarized.content;
            const timestamp = Date.now();
            const title = generateTitle(content);
            const fileResult = await simpleFallbackStorage(
              runtime,
              content,
              title,
              timestamp,
              { sourceUrl: summarized.sourceUrl, ingestedWith: "summarize" },
            );
            if (callback && fileResult.success && fileResult.file) {
              // Extract a preview from the content (first 300 chars, strip markdown)
              const contentPreview = content
                .slice(0, 300)
                .replace(/[#*_`]/g, "")
                .replace(/\n+/g, " ")
                .trim();
              await callback({
                text: `✅ **URL saved to knowledge**\n\n**Source**: ${summarized.sourceUrl}\n**Category**: \`${fileResult.file.category}\`\n**File**: \`${fileResult.file.filename}\`\n**Words**: ${fileResult.file.metadata.wordCount}\n\n> ${contentPreview}...\n\n💡 Want me to turn this into a **tweet thread** or **substack**?${ELIZA_FOOTER}`,
                actions: ["UPLOAD"],
                success: true,
              });
            } else if (callback && !fileResult.success) {
              await callback({
                text: `❌ Save failed: ${fileResult.error ?? "Unknown"}${ELIZA_FOOTER}`,
                actions: ["UPLOAD"],
                success: false,
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
              text: `⚠️ **Couldn't fetch that URL**\n\n${errMsg}${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
            });
          }
          return;
        }
      }

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
          logger.debug(
            { contentLength: content.length },
            "[UPLOAD] Using combined recent user messages (upload that)",
          );
        }
      }

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
            logger.debug(
              { contentLength: content.length },
              "[UPLOAD] Prepended recent user messages",
            );
          }
        }
      }

      if (looksLikeMichelinEmbedDump(content)) {
        if (callback) {
          await callback({
            text: `🔗 **Post the restaurant link in #knowledge** and I'll run **ADD_MICHELIN_RESTAURANT** to add it properly.${ELIZA_FOOTER}`,
            actions: ["UPLOAD"],
            success: false,
          });
        }
        return;
      }

      if (content.length < MIN_TEXT_LENGTH) {
        if (callback) {
          await callback({
            text: `The content is too short to save. Please provide more substantial content (at least 50 characters).${ELIZA_FOOTER}`,
            actions: ["UPLOAD"],
            success: false,
          });
        }
        return;
      }

      logger.debug(
        { contentLength: content.length },
        "[UPLOAD] Processing content...",
      );

      const timestamp = Date.now();
      const title = generateTitle(extractContent(text));
      const fileResult = await simpleFallbackStorage(
        runtime,
        content,
        title,
        timestamp,
      );

      if (callback) {
        if (fileResult.success && fileResult.file) {
          const processingTime = Date.now() - startTime;
          const wordCount = fileResult.file.metadata.wordCount ?? 0;
          const truncationWarning =
            wordCount > 0 && wordCount < LOW_WORD_COUNT_WARN_THRESHOLD
              ? `\n\n⚠️ **Only ${wordCount} words were received.** If you pasted a long article, split into 2–3 messages and say \`upload that\` to combine.`
              : "";
          const uploadOut = `✅ **Knowledge Uploaded!**

**Title**: ${title}
**Category**: \`${fileResult.file.category}\`
**File**: \`${fileResult.file.filename}\`
**Word Count**: ${wordCount}
**Processing Time**: ${processingTime}ms

Saved to \`knowledge/${fileResult.file.category}/${fileResult.file.filename}\`${truncationWarning}${ELIZA_FOOTER}`;
          const out = "Here's the upload—\n\n" + uploadOut;
          await callback({
            text: out,
            actions: ["UPLOAD"],
            success: true,
          });
        } else {
          await callback({
            text: `❌ **Upload Failed**\n\n**Error**: ${fileResult.error || "Unknown error"}${ELIZA_FOOTER}`,
            actions: ["UPLOAD"],
            success: false,
          });
        }
      }
    } catch (error) {
      logger.error({ error }, "[UPLOAD] Unexpected error");
      if (callback) {
        await callback({
          text: `❌ An error occurred while uploading: ${String(error)}${ELIZA_FOOTER}`,
          actions: ["UPLOAD"],
          success: false,
        });
      }
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "https://x.com/gregisenberg/status/20252691991578259",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Fetching from X...\n\nhttps://x.com/gregisenberg/status/20252691991578259",
          actions: ["UPLOAD"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: {
          text: "https://twitter.com/elaboratedhack/status/1234567890",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Fetching from X...\n\nhttps://twitter.com/elaboratedhack/status/1234567890",
          actions: ["UPLOAD"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: {
          text: "upload: Bitcoin's halving cycle typically creates a supply shock 12-18 months after the event.",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text:
            "✅ **Knowledge Uploaded!**\n\n**Title**: Bitcoin's halving cycle...\n**Category**: `bitcoin-maxi`\n**File**: `eliza-upload-bitcoin-halving-cycle.md`\n\nSaved to `knowledge/bitcoin-maxi/eliza-upload-bitcoin-halving-cycle.md`" +
            ELIZA_FOOTER,
          actions: ["UPLOAD"],
        },
      },
    ],
  ],
};

export default uploadAction;
