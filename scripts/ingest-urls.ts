#!/usr/bin/env bun
/**
 * Batch URL → knowledge/ ingest using the summarize CLI.
 * Uses https://github.com/IkigaiLabsETH/summarize to extract or summarize URLs/YouTube,
 * then writes markdown into knowledge/<category>/ with frontmatter.
 *
 * Usage:
 *   bun run scripts/ingest-urls.ts https://example.com/article
 *   bun run scripts/ingest-urls.ts --file urls.txt
 *   bun run scripts/ingest-urls.ts --file urls.txt --extract
 *   bun run scripts/ingest-urls.ts "https://youtu.be/xxx" --youtube
 *
 * Options:
 *   --file <path>       Read URLs from file (one per line)
 *   --extract           Use summarize --extract only (no LLM; cheaper). For web URLs adds --format md.
 *   --youtube           Treat URLs as YouTube (--youtube auto)
 *   --slides            For YouTube: extract slide screenshots (--slides); requires yt-dlp, ffmpeg
 *   --slides-ocr        With --slides: run OCR on slides (requires tesseract)
 *   --length <preset>   Summary length when not --extract: long|xl|xxl|medium|short (default: long)
 *   --lang <code>       Output language (e.g. en, auto); summarize --lang
 *   --firecrawl         Pass --firecrawl auto for web URLs (needs FIRECRAWL_API_KEY)
 *   --knowledge-dir     Base knowledge dir (default: ./knowledge)
 *   --dry-run           Print what would be done, no writes
 *
 * Inputs: URLs (http(s)://) or local file paths (e.g. ./doc.pdf, /path/to/audio.mp3). Summarize supports PDF, audio, video, text.
 * Requires: bunx / npm install -g @steipete/summarize; API key for non-extract mode.
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const DEFAULT_KNOWLEDGE = "./knowledge";

type Category =
  | "perps-trading"
  | "options"
  | "defi-metrics"
  | "grinding-the-trenches"
  | "bitcoin-maxi"
  | "solana"
  | "altcoins"
  | "macro-economy"
  | "venture-capital"
  | "setup-guides"
  | "the-good-life"
  | "art-collections"
  | "uncategorized";

function detectCategory(content: string): Category {
  const lower = content.toLowerCase();
  if (lower.includes("perp") || lower.includes("funding") || lower.includes("liquidat")) return "perps-trading";
  if (lower.includes("option") || lower.includes("strike") || lower.includes("delta") || lower.includes("covered call")) return "options";
  if (lower.includes("defi") || lower.includes("tvl") || lower.includes("yield")) return "defi-metrics";
  if (lower.includes("airdrop") || lower.includes("farm") || lower.includes("memecoin") || lower.includes("pump.fun")) return "grinding-the-trenches";
  if (lower.includes("bitcoin") || lower.includes("btc") || lower.includes("halving")) return "bitcoin-maxi";
  if (lower.includes("solana") || lower.includes("sol ") || lower.includes("spl token")) return "solana";
  if (lower.includes("altcoin") || lower.includes("eth ") || lower.includes("ethereum")) return "altcoins";
  if (lower.includes("macro") || lower.includes("fed") || lower.includes("inflation") || lower.includes("interest rate")) return "macro-economy";
  if (lower.includes("venture") || lower.includes("vc ") || lower.includes("fundrais")) return "venture-capital";
  if (lower.includes("setup") || lower.includes("install") || lower.includes("config")) return "setup-guides";
  if (lower.includes("lifestyle") || lower.includes("travel") || lower.includes("hotel") || lower.includes("restaurant")) return "the-good-life";
  if (lower.includes("nft") || lower.includes("art") || lower.includes("collect")) return "art-collections";
  return "uncategorized";
}

function slugify(title: string, maxLen = 50): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen);
}

function generateTitle(content: string): string {
  const first = content.split("\n")[0].trim();
  return first.length > 100 ? first.slice(0, 100) + "..." : first || "Untitled";
}

const LENGTH_PRESETS = ["short", "medium", "long", "xl", "xxl"] as const;

function runSummarize(
  input: string,
  opts: {
    isYouTube?: boolean;
    extractOnly?: boolean;
    timeoutMs?: number;
    length?: string;
    formatMdForExtract?: boolean;
    slides?: boolean;
    slidesOcr?: boolean;
    slidesDir?: string;
    firecrawl?: boolean;
    lang?: string;
  }
): Promise<{ content: string } | null> {
  const {
    isYouTube = false,
    extractOnly = false,
    length: lengthOpt = "long",
    formatMdForExtract = true,
    slides = false,
    slidesOcr = false,
    slidesDir,
    firecrawl: useFirecrawl = false,
    lang: langOpt,
  } = opts;
  const len = LENGTH_PRESETS.includes(lengthOpt as (typeof LENGTH_PRESETS)[number]) ? lengthOpt : "long";
  let timeoutMs = isYouTube ? 120_000 : 90_000;
  if (slides) timeoutMs = 180_000;
  const timeoutSec = Math.ceil(timeoutMs / 1000) + 30;
  const timeoutArg = timeoutSec >= 60 ? `${Math.ceil(timeoutSec / 60)}m` : `${timeoutSec}s`;

  const args = ["@steipete/summarize", input, "--plain", "--no-color", "--timeout", timeoutArg];
  if (extractOnly) {
    args.push("--extract");
    if (formatMdForExtract && !isYouTube) args.push("--format", "md");
  } else {
    args.push("--length", len);
  }
  if (isYouTube) args.push("--youtube", "auto");
  if (slides) {
    args.push("--slides");
    if (slidesDir) args.push("--slides-dir", slidesDir);
    if (slidesOcr) args.push("--slides-ocr");
  }
  if (useFirecrawl && !isYouTube) args.push("--firecrawl", "auto");
  if (langOpt) args.push("--lang", langOpt);

  return new Promise((resolve) => {
    const child = spawn("bunx", args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf-8"); });
    child.stderr?.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf-8"); });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      console.error(`[ingest-urls] Timeout: ${input}`);
      resolve(null);
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error(`[ingest-urls] summarize exited ${code} for ${input}: ${stderr.slice(0, 200)}`);
        resolve(null);
        return;
      }
      const content = stdout.trim();
      if (content.length < 50) {
        console.error(`[ingest-urls] Too little content for ${input}`);
        resolve(null);
        return;
      }
      resolve({ content });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      console.error(`[ingest-urls] Spawn error: ${err.message}`);
      resolve(null);
    });
  });
}

function writeKnowledgeFile(
  knowledgeDir: string,
  category: Category,
  title: string,
  content: string,
  sourceUrl: string,
  dryRun: boolean
): string | null {
  const slug = slugify(title);
  const ts = Date.now();
  const filename = `ingest-${slug}-${ts}.md`;
  const categoryPath = path.join(knowledgeDir, category);
  const filepath = path.join(categoryPath, filename);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const knowledgeNote =
    "> **Knowledge base note:** Numbers and metrics here are illustrative from the source; use for methodologies and frameworks, not as current data. For live data use actions/APIs.";
  const markdown = `---
title: "${title.replace(/"/g, '\\"')}"
source: ${sourceUrl}
category: ${category}
tags:
  - ingest-urls
  - batch
created: ${new Date(ts).toISOString()}
wordCount: ${wordCount}
---

# ${title}

${knowledgeNote}

## Content

${content}
`;
  if (dryRun) {
    console.log(`[dry-run] Would write ${filepath} (${wordCount} words)`);
    return filepath;
  }
  if (!fs.existsSync(categoryPath)) fs.mkdirSync(categoryPath, { recursive: true });
  fs.writeFileSync(filepath, markdown, "utf-8");
  console.log(`[ingest-urls] Wrote ${filepath} (${wordCount} words)`);
  return filepath;
}

const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const extractOnly = args.includes("--extract");
const youtube = args.includes("--youtube");
const slides = args.includes("--slides");
const slidesOcr = args.includes("--slides-ocr");
const dryRun = args.includes("--dry-run");
const knowledgeIdx = args.indexOf("--knowledge-dir");
const knowledgeDir = knowledgeIdx >= 0 && args[knowledgeIdx + 1]
  ? args[knowledgeIdx + 1]
  : DEFAULT_KNOWLEDGE;
const lengthIdx = args.indexOf("--length");
const lengthPreset = lengthIdx >= 0 && args[lengthIdx + 1] ? args[lengthIdx + 1] : "long";
const langIdx = args.indexOf("--lang");
const langOpt = langIdx >= 0 && args[langIdx + 1] ? args[langIdx + 1] : undefined;
const firecrawl = args.includes("--firecrawl");
const slidesDir = slides ? path.join(knowledgeDir, ".slides") : undefined;

function isUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}
function isLocalPath(s: string): boolean {
  if (isUrl(s)) return false;
  const resolved = path.resolve(s);
  try {
    return fs.existsSync(resolved) && fs.statSync(resolved).isFile();
  } catch {
    return false;
  }
}

const inputs: string[] = [];
if (fileIdx >= 0 && args[fileIdx + 1]) {
  const listPath = path.resolve(args[fileIdx + 1]);
  if (!fs.existsSync(listPath)) {
    console.error(`File not found: ${listPath}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(listPath, "utf-8").split(/\n/);
  for (const line of lines) {
    const u = line.trim();
    if (!u) continue;
    if (isUrl(u)) inputs.push(u);
    else if (isLocalPath(u)) inputs.push(path.resolve(u));
  }
} else {
  const skipNext = new Set(["--file", "--length", "--lang", "--knowledge-dir"]);
  for (let i = 0; i < args.length; i++) {
    if (skipNext.has(args[i])) {
      i++;
      continue;
    }
    const a = args[i];
    if (isUrl(a)) inputs.push(a);
    else if (isLocalPath(a)) inputs.push(path.resolve(a));
  }
}

if (inputs.length === 0) {
  console.log(`
Usage:
  bun run scripts/ingest-urls.ts <url|path> [url2 ...]
  bun run scripts/ingest-urls.ts --file urls.txt [--extract] [--youtube] [--slides] [--dry-run]
  bun run scripts/ingest-urls.ts ./doc.pdf /path/to/audio.mp3
  bun run scripts/ingest-urls.ts --knowledge-dir ./knowledge --length xl --lang en

Options:
  --file <path>       One URL or file path per line
  --extract           summarize --extract only (no LLM); web URLs get --format md
  --youtube           Pass --youtube auto to summarize (URLs only)
  --slides            (YouTube) Extract slide screenshots; writes to <knowledge-dir>/.slides
  --slides-ocr        With --slides: run OCR on slides (requires tesseract)
  --length <preset>   long|xl|xxl|medium|short (default: long)
  --lang <code>       Output language (e.g. en, auto)
  --firecrawl         --firecrawl auto for web URLs (FIRECRAWL_API_KEY)
  --knowledge-dir    Default: ./knowledge
  --dry-run           No file writes
`);
  process.exit(1);
}

async function main() {
  console.log(`[ingest-urls] Processing ${inputs.length} input(s), extractOnly=${extractOnly}, youtube=${youtube}, slides=${slides}, length=${lengthPreset}, lang=${langOpt ?? "—"}, firecrawl=${firecrawl}, dryRun=${dryRun}`);
  let ok = 0;
  let fail = 0;
  for (const input of inputs) {
    const isYt = youtube && isUrl(input);
    const result = await runSummarize(input, {
      isYouTube: isYt,
      extractOnly,
      length: lengthPreset,
      formatMdForExtract: true,
      slides: isYt && slides,
      slidesOcr: slidesOcr,
      slidesDir,
      firecrawl: firecrawl && isUrl(input),
      lang: langOpt,
    });
    if (!result) {
      fail++;
      continue;
    }
    const title = generateTitle(result.content);
    const category = detectCategory(result.content);
    const sourceLabel = isUrl(input) ? input : `file://${path.resolve(input)}`;
    const written = writeKnowledgeFile(knowledgeDir, category, title, result.content, sourceLabel, dryRun);
    if (written) ok++;
    else fail++;
  }
  console.log(`[ingest-urls] Done: ${ok} saved, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
