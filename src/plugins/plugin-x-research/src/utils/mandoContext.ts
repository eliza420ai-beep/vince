/**
 * MandoMinutes context for X-Research.
 * When available (same runtime or shared cache), pulse/vibe can frame output with "today's news".
 * Price-snapshot lines are filtered out so ECHO never displays stale prices.
 */

import * as fs from "node:fs/promises";
import path from "node:path";
import { logger, type IAgentRuntime } from "@elizaos/core";

const MANDO_RAW_CACHE_KEY = "mando_minutes:latest:v9";

const MANDO_SHARED_CACHE_MAX_AGE_MS =
  Number(process.env.MANDO_SHARED_CACHE_MAX_AGE_MS) || 86400000; // 24h

/** Pattern: ASSET: $?number[kKmMbB]? (optional % change). Avoids surfacing stale prices in ECHO. */
const PRICE_SNAPSHOT_REGEX =
  /\b(BTC|ETH|SOL|BNB|BTC\.D):\s*\$?[\d,.]+[kmb]?\s*(\([+-]?\d+\.?\d*%?\))?/gi;
const CRYPTO_PRICES_LABEL = /Cryptocurrency\s+Prices|^Prices:\s*/i;
const PRICE_PLACEHOLDER = "Market snapshot omitted; ask VINCE for prices.";

export interface MandoContextForX {
  vibeCheck: string;
  headlines: string[];
  /** Optional metadata for diagnostics and ranking visibility. */
  source?: "service" | "cache" | "shared_file";
  droppedCount?: number;
  tagCounts?: Record<MandoTopicTag, number>;
}

export type MandoTopicTag =
  | "macro"
  | "policy"
  | "ai"
  | "perps"
  | "hip3"
  | "regulatory"
  | "defi"
  | "crypto";

const MANDO_TAG_PATTERNS: Record<MandoTopicTag, RegExp> = {
  macro:
    /\b(macro|cpi|inflation|fed|fomc|rates?|treasury|dxy|yield|recession|gdp)\b/i,
  policy:
    /\b(policy|government|election|sanction|tariff|treasury|congress|senate)\b/i,
  ai: /\b(ai|openai|anthropic|claude|llm|gpu|inference|model)\b/i,
  perps: /\b(perp|perpetual|funding|liquidation|open interest|oi)\b/i,
  hip3: /\b(hip-?3|hyperliquid|mag7|semis|xyz100|us500|small2000)\b/i,
  regulatory: /\b(sec|cftc|doj|regulat|enforcement|lawsuit|compliance)\b/i,
  defi: /\b(defi|dex|amm|lending|staking|yield|tvl|morpho|aave|uniswap)\b/i,
  crypto: /\b(bitcoin|ethereum|solana|btc|eth|sol|altcoin|token|crypto)\b/i,
};

function logMandoSkip(reason: string): void {
  logger.debug(`[MandoContext] skip: ${reason}`);
}

/** Normalize headline for robust dedupe and rough similarity checks. */
export function normalizeHeadlineForCompare(title: string): string {
  return title
    .toLowerCase()
    .replace(/[$#]([a-z0-9_]+)/gi, "$1")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headlineTokens(title: string): Set<string> {
  const tokens = normalizeHeadlineForCompare(title)
    .split(" ")
    .filter((t) => t.length >= 3);
  return new Set(tokens);
}

function similarityScore(a: string, b: string): number {
  const ta = headlineTokens(a);
  const tb = headlineTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  const union = ta.size + tb.size - overlap;
  return union > 0 ? overlap / union : 0;
}

function noveltyScore(title: string): number {
  const tokens = headlineTokens(title);
  let score = 0;
  for (const t of tokens) {
    score += Math.min(10, t.length);
  }
  return score;
}

/** Extract coarse research tags from a headline. */
export function extractMandoHeadlineTags(title: string): MandoTopicTag[] {
  const out: MandoTopicTag[] = [];
  for (const [tag, re] of Object.entries(MANDO_TAG_PATTERNS)) {
    if (re.test(title)) out.push(tag as MandoTopicTag);
  }
  return out;
}

function dedupeAndRankHeadlines(rawTitles: string[]): {
  headlines: string[];
  droppedCount: number;
  tagCounts: Record<MandoTopicTag, number>;
} {
  const cleaned = rawTitles
    .map((t) => t?.trim())
    .filter((t): t is string => Boolean(t) && !isPriceLikeHeadline(t));
  const indexed = cleaned.map((title, idx) => ({
    title,
    idx,
    score: noveltyScore(title) - idx * 0.25, // light recency preference for earlier headlines
  }));
  indexed.sort((a, b) => b.score - a.score);

  const kept: string[] = [];
  let droppedCount = 0;
  for (const row of indexed) {
    const duplicate = kept.some((k) => similarityScore(k, row.title) >= 0.65);
    if (duplicate) {
      droppedCount += 1;
      continue;
    }
    kept.push(row.title);
  }

  // Stable output ordering by the original relative order for readability.
  const finalHeadlines = kept.sort(
    (a, b) => cleaned.indexOf(a) - cleaned.indexOf(b),
  );
  const tagCounts = {} as Record<MandoTopicTag, number>;
  for (const t of finalHeadlines) {
    for (const tag of extractMandoHeadlineTags(t)) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  return { headlines: finalHeadlines.slice(0, 10), droppedCount, tagCounts };
}

/**
 * Returns true if the line looks like a price snapshot or a "Cryptocurrency Prices" block,
 * so we can filter it from headlines and sanitize vibeCheck (avoid stale prices in ECHO).
 */
export function isPriceLikeHeadline(title: string): boolean {
  if (!title || typeof title !== "string") return false;
  const t = title.trim();
  if (CRYPTO_PRICES_LABEL.test(t)) return true;
  PRICE_SNAPSHOT_REGEX.lastIndex = 0;
  return PRICE_SNAPSHOT_REGEX.test(t);
}

/**
 * Remove price-snapshot segments from a vibe string. If the whole string is price-like, return placeholder.
 */
function sanitizeVibeCheck(vibe: string): string {
  if (!vibe || typeof vibe !== "string") return vibe;
  if (isPriceLikeHeadline(vibe)) return PRICE_PLACEHOLDER;
  const priceRe = new RegExp(PRICE_SNAPSHOT_REGEX.source, "gi");
  let out = vibe.replace(priceRe, "").replace(CRYPTO_PRICES_LABEL, "");
  out = out
    .replace(/\s*;\s*;\s*/g, "; ")
    .replace(/^\s*;\s*|;\s*$/g, "")
    .trim();
  if (!out || out.length < 10) return PRICE_PLACEHOLDER;
  return out.slice(0, 150);
}

/**
 * Get MandoMinutes context for X research when available.
 * 1. Prefer VinceNewsSentimentService (getVibeCheck + getTopHeadlines).
 * 2. Fallback: runtime cache mando_minutes:latest:v9 (raw articles).
 * 3. Fallback: shared file at .elizadb/shared/mando_minutes_latest_v9.json (for ECHO-only runs).
 * Returns null if no source has data.
 */
export async function getMandoContextForX(
  runtime: IAgentRuntime,
): Promise<MandoContextForX | null> {
  const news = runtime.getService("VINCE_NEWS_SENTIMENT_SERVICE") as {
    getVibeCheck?: () => string;
    getTopHeadlines?: (limit: number) => Array<{ title: string }>;
    hasData?: () => boolean;
  } | null;

  if (news) {
    try {
      if (typeof news.hasData === "function" && !news.hasData()) {
        logMandoSkip("service_no_data");
        return null;
      }
      const rawVibe =
        typeof news.getVibeCheck === "function" ? news.getVibeCheck() : "";
      const topHeadlines =
        typeof news.getTopHeadlines === "function"
          ? news.getTopHeadlines(8)
          : [];
      const { headlines, droppedCount, tagCounts } = dedupeAndRankHeadlines(
        topHeadlines.map((n) => n.title ?? ""),
      );
      if (
        !rawVibe ||
        rawVibe === "No news data yet." ||
        headlines.length === 0
      ) {
        logMandoSkip("service_empty_after_filter");
        return null;
      }
      return {
        vibeCheck: sanitizeVibeCheck(rawVibe),
        headlines,
        source: "service",
        droppedCount,
        tagCounts,
      };
    } catch {
      logMandoSkip("service_error");
      return null;
    }
  }

  try {
    const raw = await runtime.getCache<{
      articles?: Array<{ title: string; url?: string }>;
      timestamp?: number;
    }>(MANDO_RAW_CACHE_KEY);
    if (raw?.articles?.length) {
      const { headlines, droppedCount, tagCounts } = dedupeAndRankHeadlines(
        raw.articles.map((a) => a.title ?? ""),
      );
      if (headlines.length === 0) {
        logMandoSkip("cache_empty_after_filter");
        return null;
      }
      const rawVibeFromHeadlines =
        "Headlines: " +
        headlines
          .slice(0, 5)
          .map((a) => a)
          .join("; ")
          .slice(0, 150);
      return {
        vibeCheck: sanitizeVibeCheck(rawVibeFromHeadlines),
        headlines,
        source: "cache",
        droppedCount,
        tagCounts,
      };
    }
  } catch {
    logMandoSkip("cache_error");
  }

  const sharedPath =
    process.env.MANDO_SHARED_CACHE_PATH ||
    path.join(
      process.cwd(),
      ".elizadb",
      "shared",
      "mando_minutes_latest_v9.json",
    );
  try {
    const content = await fs.readFile(sharedPath, "utf-8");
    const raw = JSON.parse(content) as {
      articles?: Array<{ title: string; url?: string }>;
      timestamp?: number;
    };
    if (!Array.isArray(raw?.articles) || raw.articles.length === 0) {
      logMandoSkip("file_empty_articles");
      return null;
    }
    if (
      typeof raw.timestamp === "number" &&
      Date.now() - raw.timestamp > MANDO_SHARED_CACHE_MAX_AGE_MS
    ) {
      logMandoSkip("file_stale");
      return null;
    }
    const { headlines, droppedCount, tagCounts } = dedupeAndRankHeadlines(
      raw.articles.map((a) => a.title ?? ""),
    );
    if (headlines.length === 0) {
      logMandoSkip("file_empty_after_filter");
      return null;
    }
    const rawVibeFromHeadlines =
      "Headlines: " +
      headlines
        .slice(0, 5)
        .map((a) => a)
        .join("; ")
        .slice(0, 150);
    return {
      vibeCheck: sanitizeVibeCheck(rawVibeFromHeadlines),
      headlines,
      source: "shared_file",
      droppedCount,
      tagCounts,
    };
  } catch {
    logMandoSkip("file_missing_or_parse_error");
    return null;
  }
}
