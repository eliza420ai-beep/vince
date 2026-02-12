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
import type { KnowledgeCategory, IKnowledgeGenerationResult } from "../types/upload";
import { getKnowledgeRoot } from "../config/paths";

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
  if (typeof content.text === "string" && content.text.trim()) parts.push(content.text.trim());
  const attachments = content.attachments as Array<{ url?: string }> | undefined;
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
  "upload", "upload:", "upload this", "save this", "save:", "ingest", "ingest:",
  "ingest this", "remember", "remember:", "remember this", "add to knowledge",
  "add knowledge", "store this", "note this",
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

const SUMMARY_LENGTH_PRESETS = ["short", "medium", "long", "xl", "xxl"] as const;

function getSummarizeCommand(cliArgs: string[]): { command: string; args: string[] } {
  const cwd = process.cwd();
  const binDir = path.join(cwd, "node_modules", ".bin");
  const localBin = path.join(binDir, "summarize");
  const localBinWin = path.join(binDir, "summarize.cmd");
  if (fs.existsSync(localBin) || (process.platform === "win32" && fs.existsSync(localBinWin))) {
    const cmd = process.platform === "win32" && fs.existsSync(localBinWin) ? localBinWin : localBin;
    return { command: cmd, args: cliArgs };
  }
  return { command: "bunx", args: ["@steipete/summarize", ...cliArgs] };
}

type SummarizeResult =
  | { content: string; sourceUrl: string }
  | { error: string; stderr?: string };

async function runSummarizeCli(
  url: string,
  options: { isYouTube?: boolean; timeoutMs?: number; extractOnly?: boolean } = {},
): Promise<SummarizeResult | null> {
  const { isYouTube = false, extractOnly } = options;
  const useExtractOnly =
    extractOnly ??
    (process.env.VINCE_UPLOAD_EXTRACT_ONLY === "true" || process.env.VINCE_UPLOAD_EXTRACT_ONLY === "1");
  const youtubeSlides =
    isYouTube &&
    (process.env.VINCE_UPLOAD_YOUTUBE_SLIDES === "true" || process.env.VINCE_UPLOAD_YOUTUBE_SLIDES === "1");
  const lengthEnv = (process.env.VINCE_UPLOAD_SUMMARY_LENGTH ?? "long").toLowerCase();
  const length = SUMMARY_LENGTH_PRESETS.includes(lengthEnv as (typeof SUMMARY_LENGTH_PRESETS)[number])
    ? lengthEnv
    : "long";
  let timeoutMs = isYouTube ? 120_000 : 90_000;
  if (youtubeSlides) timeoutMs = 180_000;
  const timeoutSec = Math.ceil(timeoutMs / 1000) + 30;
  const timeoutArg = timeoutSec >= 60 ? `${Math.ceil(timeoutSec / 60)}m` : `${timeoutSec}s`;

  const cliArgs = [url, "--plain", "--no-color", "--timeout", timeoutArg];
  if (useExtractOnly) {
    cliArgs.push("--extract");
    if (!isYouTube) cliArgs.push("--format", "md");
  } else {
    cliArgs.push("--length", length);
  }
  if (isYouTube) cliArgs.push("--youtube", "auto");
  if (youtubeSlides) {
    const knowledgeRoot = getKnowledgeRoot();
    cliArgs.push("--slides", "--slides-dir", path.join(knowledgeRoot, ".slides"));
    if (process.env.VINCE_UPLOAD_YOUTUBE_SLIDES_OCR === "true" || process.env.VINCE_UPLOAD_YOUTUBE_SLIDES_OCR === "1") {
      cliArgs.push("--slides-ocr");
    }
  }
  const firecrawl = process.env.VINCE_UPLOAD_FIRECRAWL?.toLowerCase();
  if (!isYouTube && (firecrawl === "auto" || firecrawl === "always")) {
    cliArgs.push("--firecrawl", firecrawl);
  }
  const lang = process.env.VINCE_UPLOAD_LANG?.trim();
  if (lang) cliArgs.push("--lang", lang);

  const { command: summarizeCommand, args: summarizeArgs } = getSummarizeCommand(cliArgs);

  const runOne = (): Promise<SummarizeResult | null> =>
    new Promise((resolve) => {
      const child = spawn(summarizeCommand, summarizeArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf-8"); });
      child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf-8"); });
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        logger.warn({ url, isYouTube, timeoutMs }, "[UPLOAD] summarize CLI timed out");
        resolve({ error: "Timed out", stderr: stderr.slice(0, 300) });
      }, timeoutMs);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          logger.debug({ code, stderr: stderr.slice(0, 500) }, "[UPLOAD] summarize CLI exited non-zero");
          resolve({ error: "Summarize failed", stderr: stderr.trim().slice(0, 300) });
          return;
        }
        const content = stdout.trim();
        if (content.length < MIN_TEXT_LENGTH) {
          resolve({ error: "Too little content", stderr: stderr.trim().slice(0, 200) });
          return;
        }
        resolve({ content, sourceUrl: url });
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({ error: String(err), stderr: (err as Error).message?.slice(0, 200) });
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
  const pastedSignals = [/^#+ /m, /^[-*•] /m, /^\d+\.\s/m, /^[A-Z][A-Z0-9_]+[.:=]/m, /^```/m, /\n[-*•] /m, /^>\s/m];
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
      let content = text.slice(idx + keyword.length).trim().replace(/^[:\-\s]+/, "").trim();
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
  const { minLength = MIN_TEXT_LENGTH, maxMessages = MAX_RECENT_USER_MESSAGES_TO_COMBINE } = options;
  try {
    const memories = await runtime.getMemories({ roomId, count: 25, tableName: "messages" });
    const userMessages = memories.filter((m) => m.entityId !== runtime.agentId);
    const byNewest = [...userMessages].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
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
  return firstLine.length > 100 ? firstLine.slice(0, 100) + "..." : firstLine || "Untitled Knowledge";
}

function detectSimpleCategory(content: string): KnowledgeCategory {
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes("openclaw") || lowerContent.includes("clawdbot") || lowerContent.includes("claw bot") || lowerContent.includes("claw framework")) return "internal-docs";
  if (lowerContent.includes("perp") || lowerContent.includes("funding") || lowerContent.includes("liquidat")) return "perps-trading";
  if (lowerContent.includes("option") || lowerContent.includes("strike") || lowerContent.includes("delta") || lowerContent.includes("covered call")) return "options";
  if (lowerContent.includes("defi") || lowerContent.includes("tvl") || lowerContent.includes("yield")) return "defi-metrics";
  if (lowerContent.includes("airdrop") || lowerContent.includes("farm") || lowerContent.includes("memecoin") || lowerContent.includes("pump.fun")) return "grinding-the-trenches";
  if (lowerContent.includes("bitcoin") || lowerContent.includes("btc") || lowerContent.includes("halving")) return "bitcoin-maxi";
  if (lowerContent.includes("solana") || lowerContent.includes("sol ") || lowerContent.includes("spl token")) return "solana";
  if (lowerContent.includes("altcoin") || lowerContent.includes("eth ") || lowerContent.includes("ethereum")) return "altcoins";
  if (lowerContent.includes("macro") || lowerContent.includes("fed") || lowerContent.includes("inflation") || lowerContent.includes("interest rate")) return "macro-economy";
  if (lowerContent.includes("venture") || lowerContent.includes("vc ") || lowerContent.includes("fundrais")) return "venture-capital";
  if (lowerContent.includes("setup") || lowerContent.includes("install") || lowerContent.includes("config")) return "setup-guides";
  if (lowerContent.includes("lifestyle") || lowerContent.includes("travel") || lowerContent.includes("hotel") || lowerContent.includes("restaurant")) return "the-good-life";
  if (lowerContent.includes("framework") || lowerContent.includes("synthesis") || lowerContent.includes("latticework") || lowerContent.includes("mental model") || lowerContent.includes("munger") || lowerContent.includes("taleb") || lowerContent.includes("bostrom") || lowerContent.includes("decision-making") || (lowerContent.includes("philosophy") && (lowerContent.includes("trading") || lowerContent.includes("investment") || lowerContent.includes("economics")))) return "substack-essays";
  const artLike = lowerContent.includes("nft") || lowerContent.includes("collectibles") || lowerContent.includes("cryptopunk") || lowerContent.includes("opensea") || lowerContent.includes("generative art") || lowerContent.includes("physical art") || lowerContent.includes("art market") || (lowerContent.includes("collect") && (lowerContent.includes("art") || lowerContent.includes("nft")));
  if (artLike) return "art-collections";
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
      logger.debug("[UPLOAD] simpleFallbackStorage: refused Michelin embed dump");
      return { success: false, error: "Michelin link preview content: post link in #knowledge for ADD_MICHELIN_RESTAURANT" };
    }
    const sourceUrl = opts?.sourceUrl ?? `chat://eliza-upload/${timestamp}`;
    const ingestedWith = opts?.ingestedWith ?? "eliza-upload";
    const category = detectSimpleCategory(content);
    const slugTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
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

const ELIZA_FOOTER = "\n\n---\nAsk me about this content anytime, or `upload` more.";

export const uploadAction: Action = {
  name: "UPLOAD",
  similes: ["SAVE_KNOWLEDGE", "INGEST", "REMEMBER", "ADD_KNOWLEDGE", "STORE_KNOWLEDGE"],
  description: `Upload content to the knowledge base. Supports text, URLs, and YouTube videos.

TRIGGERS:
- "upload:", "save this:", "ingest:", "remember:" — Saves content to knowledge/
- YouTube URLs — Transcribes video and saves transcript + summary
- Article/PDF URLs — Fetches and summarizes via summarize CLI
- Long pasted content (1000+ chars) — Auto-ingests

Use this for expanding the knowledge corpus with research, articles, videos, and frameworks.`,

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text || "";
    const fullMessageText = getMessageTextForUrlCheck(message);

    if (message.entityId === runtime.agentId) return false;
    if (fullMessageText.includes("guide.michelin.com")) {
      logger.debug("[UPLOAD] Skipping: Michelin link → use #knowledge + ADD_MICHELIN_RESTAURANT");
      return false;
    }
    if (containsYouTubeUrl(text)) return true;
    if (text.length < MIN_TEXT_LENGTH) return false;
    if (hasUploadIntent(text)) return true;
    if (text.length >= AUTO_INGEST_LENGTH && looksPastedNotConversational(text)) return true;
    if (text.length >= LONG_DUMP_LENGTH) {
      const firstLine = text.trim().split("\n")[0];
      const conversationalStart = [/^(so |well |but |and |also |actually |honestly |look |anyway )/i, /^(my |i'm |i am |i think |i believe )/i, /^(yes|no|yeah|nope|sure|exactly|agreed|right|true|absolutely)/i, /\?$/];
      if (!conversationalStart.some((p) => p.test(firstLine.trim()))) return true;
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
    const startTime = Date.now();

    try {
      const youtubeUrl = extractYouTubeUrl(text);
      if (youtubeUrl) {
        if (callback) {
          await callback({
            text: `🎥 **Processing YouTube**\n\n${youtubeUrl}\n\nFetching transcript and summary via summarize... This may take 1–2 minutes.${ELIZA_FOOTER}`,
            actions: ["UPLOAD"],
          });
        }
        const summarized = await runSummarizeCli(youtubeUrl, { isYouTube: true });
        if (summarized && "content" in summarized) {
          const timestamp = Date.now();
          const title = generateTitle(summarized.content);
          const fileResult = await simpleFallbackStorage(runtime, summarized.content, title, timestamp, { sourceUrl: summarized.sourceUrl, ingestedWith: "summarize" });
          if (callback && fileResult.success && fileResult.file) {
            await callback({
              text: `✅ **YouTube saved to knowledge**\n\n**Source**: ${summarized.sourceUrl}\n**Category**: \`${fileResult.file.category}\`\n**File**: \`${fileResult.file.filename}\`\n**Words**: ${fileResult.file.metadata.wordCount}${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: true,
            });
          } else if (callback && !fileResult.success) {
            await callback({ text: `❌ Save failed: ${fileResult.error ?? "Unknown"}${ELIZA_FOOTER}`, actions: ["UPLOAD"], success: false });
          }
          return;
        }
        if (callback) {
          const errMsg = summarized && "error" in summarized ? [summarized.error, summarized.stderr].filter(Boolean).join(summarized.stderr ? "\n(summarize): " : "") : "summarize timed out or isn't installed";
          await callback({
            text: `⚠️ **Couldn't fetch that YouTube**\n\n${errMsg}\n\n• Install: \`bun install -g @steipete/summarize\` and set \`OPENAI_API_KEY\` or \`GEMINI_API_KEY\`\n• Or paste the transcript here and I'll save it.${ELIZA_FOOTER}`,
            actions: ["UPLOAD"],
            success: false,
          });
        }
        return;
      }

      let content = extractContent(text);
      const singleUrl = content.trim().length < 500 && extractSingleUrl(content);
      if (singleUrl && hasUploadIntent(text)) {
        if (isXOrTwitterUrl(singleUrl)) {
          if (callback) {
            await callback({
              text: `⚠️ **X (Twitter) links can't be fetched here**\n\nPaste the thread or article text, then say **"upload that"** and I'll save it to knowledge.${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
            });
          }
          return;
        }
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
        if (urlContent === singleUrl || (urlContent.startsWith(singleUrl) && urlContent.length < singleUrl.length + 50)) {
          if (callback) {
            await callback({
              text: `🔗 **Fetching URL**\n\n${singleUrl}\n\nSummarizing... (up to ~90s)${ELIZA_FOOTER}`,
              actions: ["UPLOAD"],
              success: false,
            });
          }
          const summarized = await runSummarizeCli(singleUrl, { isYouTube: false });
          if (summarized && "content" in summarized) {
            content = summarized.content;
            const timestamp = Date.now();
            const title = generateTitle(content);
            const fileResult = await simpleFallbackStorage(runtime, content, title, timestamp, { sourceUrl: summarized.sourceUrl, ingestedWith: "summarize" });
            if (callback && fileResult.success && fileResult.file) {
              await callback({
                text: `✅ **URL saved to knowledge**\n\n**Source**: ${summarized.sourceUrl}\n**Category**: \`${fileResult.file.category}\`\n**File**: \`${fileResult.file.filename}\`\n**Words**: ${fileResult.file.metadata.wordCount}${ELIZA_FOOTER}`,
                actions: ["UPLOAD"],
                success: true,
              });
            } else if (callback && !fileResult.success) {
              await callback({ text: `❌ Save failed: ${fileResult.error ?? "Unknown"}${ELIZA_FOOTER}`, actions: ["UPLOAD"], success: false });
            }
            return;
          }
          if (callback) {
            const errMsg = summarized && "error" in summarized ? [summarized.error, summarized.stderr].filter(Boolean).join(summarized.stderr ? "\n(summarize): " : "") : "Install `bun install -g @steipete/summarize` and set an API key, or paste the article text here.";
            await callback({ text: `⚠️ **Couldn't fetch that URL**\n\n${errMsg}${ELIZA_FOOTER}`, actions: ["UPLOAD"], success: false });
          }
          return;
        }
      }

      if (content.length <= MAX_REFERENCE_MESSAGE_LENGTH && looksLikeUploadThat(text)) {
        const combinedContent = await getRecentUserMessagesContent(runtime, message.roomId, message.id, { minLength: MIN_TEXT_LENGTH, maxMessages: MAX_RECENT_USER_MESSAGES_TO_COMBINE });
        if (combinedContent) {
          content = combinedContent;
          logger.debug({ contentLength: content.length }, "[UPLOAD] Using combined recent user messages (upload that)");
        }
      }

      if (content.length >= MIN_TEXT_LENGTH) {
        const previousBlock = await getRecentUserMessagesContent(runtime, message.roomId, message.id, { minLength: 100, maxMessages: MAX_RECENT_USER_MESSAGES_TO_COMBINE });
        if (previousBlock && previousBlock.length > 0 && !previousBlock.includes(content.trim().slice(0, 200))) {
          const combined = `${previousBlock}\n\n${content}`.trim();
          if (combined.length > content.length) {
            content = combined;
            logger.debug({ contentLength: content.length }, "[UPLOAD] Prepended recent user messages");
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

      logger.debug({ contentLength: content.length }, "[UPLOAD] Processing content...");

      const timestamp = Date.now();
      const title = generateTitle(extractContent(text));
      const fileResult = await simpleFallbackStorage(runtime, content, title, timestamp);

      if (callback) {
        if (fileResult.success && fileResult.file) {
          const processingTime = Date.now() - startTime;
          const wordCount = fileResult.file.metadata.wordCount ?? 0;
          const truncationWarning = wordCount > 0 && wordCount < LOW_WORD_COUNT_WARN_THRESHOLD
            ? `\n\n⚠️ **Only ${wordCount} words were received.** If you pasted a long article, split into 2–3 messages and say \`upload that\` to combine.`
            : "";
          await callback({
            text: `✅ **Knowledge Uploaded!**

**Title**: ${title}
**Category**: \`${fileResult.file.category}\`
**File**: \`${fileResult.file.filename}\`
**Word Count**: ${wordCount}
**Processing Time**: ${processingTime}ms

Saved to \`knowledge/${fileResult.file.category}/${fileResult.file.filename}\`${truncationWarning}${ELIZA_FOOTER}`,
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
      { name: "{{user1}}", content: { text: "upload: Bitcoin's halving cycle typically creates a supply shock 12-18 months after the event." } },
      { name: "Eliza", content: { text: "✅ **Knowledge Uploaded!**\n\n**Title**: Bitcoin's halving cycle...\n**Category**: `bitcoin-maxi`\n**File**: `eliza-upload-bitcoin-halving-cycle.md`\n\nSaved to `knowledge/bitcoin-maxi/eliza-upload-bitcoin-halving-cycle.md`" + ELIZA_FOOTER, actions: ["UPLOAD"] } },
    ],
  ],
};

export default uploadAction;
