/**
 * Grok Auto-Pulse parser for paper trading integration.
 *
 * Reads knowledge/internal-docs/grok-auto-*.md (latest by mtime) and extracts:
 * - Regime (neutral / bullish / bearish) for regime alignment
 * - Top 3 Research Ideas → per-asset bias (long/short) for signal aggregator
 *
 * Used by Signal Aggregator as source "GrokExpert" so the daily narrative
 * can nudge the paper algo (e.g. "Long ETH-USD perp" → ETH long bias).
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

const GROK_AUTO_DIR = "knowledge/internal-docs";
const GROK_AUTO_PREFIX = "grok-auto-";
const GROK_AUTO_SUFFIX = ".md";
/** Only use pulse files from the last 36 hours so we don't trade on stale narrative */
const MAX_AGE_MS = 36 * 60 * 60 * 1000;

/** Asset tickers we recognize in research ideas (case-insensitive match) */
const ASSET_TICKERS = ["BTC", "ETH", "SOL", "HYPE"] as const;

export interface GrokResearchIdea {
  asset: string;
  direction: "long" | "short";
  raw: string;
}

export interface GrokPulseData {
  regime: "bullish" | "bearish" | "neutral";
  fearGreed?: number;
  topTradersLongPct?: number;
  researchIdeas: GrokResearchIdea[];
  generatedAt?: number;
  filePath: string;
  /** Paragraph after **Market Read** (for bot explanations). */
  marketRead?: string;
  /** Line/paragraph after **Knowledge Gap** (for backtest/knowledge queue). */
  knowledgeGap?: string;
}

/**
 * Find the most recent grok-auto-*.md file in knowledge/internal-docs.
 */
function findLatestGrokAutoFile(cwd: string): string | null {
  const dir = path.join(cwd, GROK_AUTO_DIR);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  const grokFiles = files.filter(
    (f) => f.startsWith(GROK_AUTO_PREFIX) && f.endsWith(GROK_AUTO_SUFFIX),
  );
  if (grokFiles.length === 0) return null;

  let latest: string | null = null;
  let latestMtime = 0;
  for (const f of grokFiles) {
    const full = path.join(dir, f);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs > latestMtime) {
        latestMtime = stat.mtimeMs;
        latest = full;
      }
    } catch {
      // skip
    }
  }
  return latest;
}

/**
 * Parse regime from a line like "Date: Tuesday, Feb 10 | Regime: neutral" or "Regime: neutral".
 */
function parseRegime(text: string): "bullish" | "bearish" | "neutral" {
  const lower = text.toLowerCase();
  const regimeMatch = text.match(/Regime:\s*(\w+)/i);
  if (regimeMatch) {
    const r = regimeMatch[1].toLowerCase();
    if (r === "bullish") return "bullish";
    if (r === "bearish") return "bearish";
    return "neutral";
  }
  if (lower.includes("extreme fear") || lower.includes("capitulation")) return "neutral";
  return "neutral";
}

/**
 * Parse Fear & Greed from "Fear & Greed: 9/100".
 */
function parseFearGreed(text: string): number | undefined {
  const m = text.match(/Fear\s*&\s*Greed:\s*(\d+)\/100/i);
  return m ? parseInt(m[1], 10) : undefined;
}

/**
 * Parse Top Traders from "Top Traders: 55.1% long".
 */
function parseTopTradersLong(text: string): number | undefined {
  const m = text.match(/Top\s*Traders:\s*([\d.]+)\%\s*long/i);
  return m ? parseFloat(m[1]) : undefined;
}

/**
 * Infer asset and direction from a research idea line.
 * e.g. "Long ETH-USD perp at $3.2K" → { asset: "ETH", direction: "long" }
 *      "Buy BTC $100K calls" → { asset: "BTC", direction: "long" }
 *      "Stack SOL HIP-3 basket" → { asset: "SOL", direction: "long" }
 */
function parseResearchIdeaLine(line: string): GrokResearchIdea | null {
  const trimmed = line.replace(/^\d+\.\s*\*\*[^*]+\*\*:\s*/, "").trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  const isLong =
    /\b(long|buy|stack|accumulate|add)\b/i.test(trimmed) &&
    !/\b(short|sell|reduce)\b/i.test(trimmed);
  const isShort = /\b(short|sell|reduce)\b/i.test(trimmed);

  let direction: "long" | "short" = isShort ? "short" : isLong ? "long" : "long";
  let asset: string | null = null;

  for (const ticker of ASSET_TICKERS) {
    const re = new RegExp(`\\b${ticker}\\b`, "i");
    if (re.test(trimmed)) {
      asset = ticker;
      break;
    }
  }

  if (!asset) return null;
  return { asset, direction, raw: trimmed };
}

/**
 * Parse **Top 3 Research Ideas** section: lines after that header until next ** section or end.
 */
function parseResearchIdeas(content: string): GrokResearchIdea[] {
  const ideas: GrokResearchIdea[] = [];
  const marker = "**Top 3 Research Ideas**";
  const idx = content.indexOf(marker);
  if (idx === -1) return ideas;

  const after = content.slice(idx + marker.length);
  const nextSection = after.search(/\n\s*\*\*[^*]+\*\*/);
  const block = nextSection === -1 ? after : after.slice(0, nextSection);
  const lines = block.split(/\n/).filter((l) => /^\s*\d+\./.test(l));

  for (const line of lines) {
    const idea = parseResearchIdeaLine(line);
    if (idea) ideas.push(idea);
  }
  return ideas;
}

/**
 * Parse **Generated** ISO timestamp from the frontmatter.
 */
function parseGeneratedAt(content: string): number | undefined {
  const m = content.match(/\*\*Generated\*\*:\s*(\S+)/);
  if (!m) return undefined;
  const t = Date.parse(m[1]);
  return Number.isNaN(t) ? undefined : t;
}

/**
 * Extract paragraph after **Market Read** until the next **-headed line.
 */
function parseMarketRead(content: string): string | undefined {
  const marker = "**Market Read**";
  const idx = content.indexOf(marker);
  if (idx === -1) return undefined;
  const after = content.slice(idx + marker.length);
  const nextSection = after.search(/\n\s*\*\*[^*]+\*\*/);
  const block = nextSection === -1 ? after : after.slice(0, nextSection);
  const trimmed = block.replace(/^\s*\n?/, "").replace(/\n?\s*$/, "").trim();
  return trimmed || undefined;
}

/**
 * Extract line/paragraph after **Knowledge Gap** until the next **-headed line.
 * Exported for use in grokExpert.tasks when appending to knowledge-gaps-log.
 */
export function parseKnowledgeGap(content: string): string | undefined {
  const marker = "**Knowledge Gap**";
  const idx = content.indexOf(marker);
  if (idx === -1) return undefined;
  const after = content.slice(idx + marker.length);
  const nextSection = after.search(/\n\s*\*\*[^*]+\*\*/);
  const block = nextSection === -1 ? after : after.slice(0, nextSection);
  const trimmed = block.replace(/^\s*\n?/, "").replace(/\n?\s*$/, "").trim();
  return trimmed || undefined;
}

/**
 * Return a formatted "GROK MARKET READ" section for inclusion in bot explanation context.
 * Returns "" if no pulse or no marketRead.
 */
export function getGrokMarketReadSection(cwd: string = process.cwd()): string {
  const pulse = loadLatestGrokPulse(cwd);
  if (!pulse?.marketRead?.trim()) return "";
  return "\n=== GROK MARKET READ (today) ===\n" + pulse.marketRead.trim() + "\n";
}

/**
 * Load and parse the latest grok-auto pulse file.
 * Returns null if no file, file too old, or parse error.
 */
export function loadLatestGrokPulse(cwd: string = process.cwd()): GrokPulseData | null {
  const filePath = findLatestGrokAutoFile(cwd);
  if (!filePath) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const stat = fs.statSync(filePath);
    const age = Date.now() - stat.mtimeMs;
    if (age > MAX_AGE_MS) {
      logger.debug(
        `[GrokPulseParser] Skipping stale pulse (${Math.round(age / 3600000)}h old): ${path.basename(filePath)}`,
      );
      return null;
    }

    const regime = parseRegime(raw);
    const fearGreed = parseFearGreed(raw);
    const topTradersLongPct = parseTopTradersLong(raw);
    const researchIdeas = parseResearchIdeas(raw);
    const generatedAt = parseGeneratedAt(raw);
    const marketRead = parseMarketRead(raw);
    const knowledgeGap = parseKnowledgeGap(raw);

    return {
      regime,
      fearGreed,
      topTradersLongPct,
      researchIdeas,
      generatedAt: generatedAt ?? stat.mtimeMs,
      filePath,
      ...(marketRead && { marketRead }),
      ...(knowledgeGap && { knowledgeGap }),
    };
  } catch (e) {
    logger.debug(`[GrokPulseParser] Parse error for ${filePath}: ${e}`);
    return null;
  }
}
