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
 *   --file <path>     Read URLs from file (one per line)
 *   --extract         Use summarize --extract only (no LLM; cheaper)
 *   --youtube         Treat URLs as YouTube (--youtube auto)
 *   --knowledge-dir   Base knowledge dir (default: ./knowledge)
 *   --dry-run         Print what would be done, no writes
 *
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

function runSummarize(
  url: string,
  opts: { isYouTube?: boolean; extractOnly?: boolean; timeoutMs?: number }
): Promise<{ content: string } | null> {
  const { isYouTube = false, extractOnly = false, timeoutMs = isYouTube ? 120_000 : 90_000 } = opts;
  const args = ["@steipete/summarize", url, "--plain", "--no-color"];
  if (extractOnly) args.push("--extract");
  else args.push("--length", "long");
  if (isYouTube) args.push("--youtube", "auto");

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
      console.error(`[ingest-urls] Timeout: ${url}`);
      resolve(null);
    }, timeoutMs);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.error(`[ingest-urls] summarize exited ${code} for ${url}: ${stderr.slice(0, 200)}`);
        resolve(null);
        return;
      }
      const content = stdout.trim();
      if (content.length < 50) {
        console.error(`[ingest-urls] Too little content for ${url}`);
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
const dryRun = args.includes("--dry-run");
const knowledgeIdx = args.indexOf("--knowledge-dir");
const knowledgeDir = knowledgeIdx >= 0 && args[knowledgeIdx + 1]
  ? args[knowledgeIdx + 1]
  : DEFAULT_KNOWLEDGE;

const urls: string[] = [];
if (fileIdx >= 0 && args[fileIdx + 1]) {
  const filePath = path.resolve(args[fileIdx + 1]);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const lines = fs.readFileSync(filePath, "utf-8").split(/\n/);
  for (const line of lines) {
    const u = line.trim();
    if (u && (u.startsWith("http://") || u.startsWith("https://"))) urls.push(u);
  }
} else {
  for (const a of args) {
    if (a.startsWith("http://") || a.startsWith("https://")) urls.push(a);
  }
}

if (urls.length === 0) {
  console.log(`
Usage:
  bun run scripts/ingest-urls.ts <url> [url2 ...]
  bun run scripts/ingest-urls.ts --file urls.txt [--extract] [--youtube] [--dry-run]
  bun run scripts/ingest-urls.ts --knowledge-dir ./knowledge

Options:
  --file <path>     One URL per line
  --extract         summarize --extract only (no LLM)
  --youtube         Pass --youtube auto to summarize
  --knowledge-dir   Default: ./knowledge
  --dry-run         No file writes
`);
  process.exit(1);
}

async function main() {
  console.log(`[ingest-urls] Processing ${urls.length} URL(s), extractOnly=${extractOnly}, youtube=${youtube}, dryRun=${dryRun}`);
  let ok = 0;
  let fail = 0;
  for (const url of urls) {
    const result = await runSummarize(url, { isYouTube: youtube, extractOnly });
    if (!result) {
      fail++;
      continue;
    }
    const title = generateTitle(result.content);
    const category = detectCategory(result.content);
    const written = writeKnowledgeFile(knowledgeDir, category, title, result.content, url, dryRun);
    if (written) ok++;
    else fail++;
  }
  console.log(`[ingest-urls] Done: ${ok} saved, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
