/**
 * VINCE X (Twitter) Sentiment Service
 *
 * Produces trading sentiment (bullish/bearish/neutral + confidence) from X search
 * results for use by the signal aggregator. Staggered refresh: one asset per interval
 * (default 1 hour) so we never burst—e.g. 4 assets = each refreshed every 4h; 24 assets = full cycle every 24h.
 * Set X_SENTIMENT_ENABLED=false to disable background refresh (in-chat only).
 * Persistent cache file for restarts and optional cron. Depends on VinceXResearchService.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Service, logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import type { VinceXResearchService } from "./xResearch.service";
import type { XTweet } from "./xResearch.service";
import { X_RATE_LIMITED_UNTIL_CACHE_KEY } from "./xResearch.service";
import { CORE_ASSETS } from "../constants/targetAssets";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import {
  BULLISH_WORDS,
  BEARISH_WORDS,
  RISK_WORDS,
  PHRASE_OVERRIDES,
  NEGATION_WINDOW,
} from "../constants/sentimentKeywords";
import { loadEnvOnce } from "../utils/loadEnvOnce";

const STAGGER_INTERVAL_MS_DEFAULT = 60 * 60 * 1000; // 1h between single-asset refreshes (e.g. 24 assets = one per hour = full cycle every 24h)
const CACHE_FILENAME = "x-sentiment-cache.json";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getStaggerIntervalMs(): number {
  loadEnvOnce();
  const ms = parseInt(process.env.X_SENTIMENT_STAGGER_INTERVAL_MS ?? String(STAGGER_INTERVAL_MS_DEFAULT), 10);
  return Math.max(10 * 60_000, Math.min(ONE_DAY_MS, ms)); // 10 min to 24h
}

function isSentimentEnabled(): boolean {
  loadEnvOnce();
  const v = process.env.X_SENTIMENT_ENABLED;
  if (v === undefined || v === "") return true;
  return /^(1|true|yes)$/i.test(v.trim());
}

const CACHE_TTL_MS = ONE_DAY_MS; // 24h — refresh is staggered (e.g. one asset per hour); keep using last result until next refresh
const MIN_TWEETS_FOR_CONFIDENCE_DEFAULT = 3;
function getMinTweetsForConfidence(): number {
  loadEnvOnce();
  const v = process.env.X_SENTIMENT_MIN_TWEETS;
  if (v === undefined || v === "") return MIN_TWEETS_FOR_CONFIDENCE_DEFAULT;
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n < 1 ? MIN_TWEETS_FOR_CONFIDENCE_DEFAULT : Math.min(20, n);
}
const BULL_BEAR_THRESHOLD_DEFAULT = 0.15;
function getBullBearThreshold(): number {
  loadEnvOnce();
  const v = process.env.X_SENTIMENT_BULL_BEAR_THRESHOLD;
  if (v === undefined || v === "") return BULL_BEAR_THRESHOLD_DEFAULT;
  const n = parseFloat(v);
  return Number.isNaN(n) || n <= 0 ? BULL_BEAR_THRESHOLD_DEFAULT : Math.min(0.5, n);
}

/** Allowed since values for X search (X API start_time). Default 1d. */
const SINCE_OPTIONS = ["6h", "1d", "2d"] as const;
type SinceOption = (typeof SINCE_OPTIONS)[number];
function getSentimentSince(): string {
  loadEnvOnce();
  const v = (process.env.X_SENTIMENT_SINCE ?? "1d").trim().toLowerCase();
  if (SINCE_OPTIONS.includes(v as SinceOption)) return v;
  return "1d";
}

/** Sort order for X sentiment search. Default relevancy. */
function getSentimentSortOrder(): "relevancy" | "recency" {
  loadEnvOnce();
  const v = (process.env.X_SENTIMENT_SORT_ORDER ?? "relevancy").trim().toLowerCase();
  if (v === "recency") return "recency";
  return "relevancy";
}

/** Build search query for an asset: expanded for majors ($BTC OR Bitcoin etc). */
export function buildSentimentQuery(asset: string): string {
  if (asset === "HYPE") return "HYPE crypto";
  const expanded: Record<string, string> = {
    BTC: "$BTC OR Bitcoin",
    ETH: "$ETH OR Ethereum",
    SOL: "$SOL OR Solana",
  };
  return expanded[asset] ?? `$${asset}`;
}

/** Parse "Resets in Ns" from X API rate-limit error. Returns seconds or 0. Exported for tests. */
export function parseRateLimitResetSeconds(message: string): number {
  const match = message.match(/Resets?\s+in\s+(\d+)\s*s/i);
  return match ? Math.max(1, parseInt(match[1], 10)) : 0;
}
/** Phrase override: if text matches a phrase, return -1 (bearish), 0 (neutral), or 1 (bullish); else null. */
function getPhraseOverride(text: string): number | null {
  const lower = text.toLowerCase();
  for (const { phrase, sentiment } of PHRASE_OVERRIDES) {
    if (lower.includes(phrase.toLowerCase())) {
      if (sentiment === "bullish") return 1;
      if (sentiment === "bearish") return -1;
      return 0;
    }
  }
  return null;
}

/** Check if the text preceding position `idx` (within NEGATION_WINDOW words) contains negation. */
function hasNegationBefore(lower: string, idx: number): boolean {
  const prefix = lower.slice(Math.max(0, idx - 35), idx);
  return /\b(not|n't|never|isn't|wasn't|aren't|won't|don't|doesn't|didn't)\s*$/i.test(prefix);
}

export interface SentimentKeywordLists {
  bullish: string[];
  bearish: string[];
  risk: string[];
}

/** Load keyword lists from env X_SENTIMENT_KEYWORDS_PATH (JSON: { bullish, bearish, risk }) or built-in. */
export function getKeywordLists(): SentimentKeywordLists {
  loadEnvOnce();
  const fp = process.env.X_SENTIMENT_KEYWORDS_PATH?.trim();
  if (!fp || !existsSync(fp)) {
    return { bullish: [...BULLISH_WORDS], bearish: [...BEARISH_WORDS], risk: [...RISK_WORDS] };
  }
  try {
    const data = JSON.parse(readFileSync(fp, "utf-8")) as Record<string, unknown>;
    const bullish = Array.isArray(data.bullish) ? (data.bullish as string[]) : [...BULLISH_WORDS];
    const bearish = Array.isArray(data.bearish) ? (data.bearish as string[]) : [...BEARISH_WORDS];
    const risk = Array.isArray(data.risk) ? (data.risk as string[]) : [...RISK_WORDS];
    return { bullish, bearish, risk };
  } catch {
    return { bullish: [...BULLISH_WORDS], bearish: [...BEARISH_WORDS], risk: [...RISK_WORDS] };
  }
}

/**
 * Per-tweet sentiment in [-1, 1]. Phrase overrides first; else word count with negation; then cap.
 * Exported for tests. Optional lists use built-in when not provided.
 */
export function simpleSentiment(
  text: string,
  lists?: { bullish?: string[]; bearish?: string[] },
): number {
  const lower = text.toLowerCase();
  const override = getPhraseOverride(text);
  if (override !== null) return override;

  const bullishWords = lists?.bullish ?? BULLISH_WORDS;
  const bearishWords = lists?.bearish ?? BEARISH_WORDS;
  let score = 0;
  for (const w of bullishWords) {
    const i = lower.indexOf(w);
    if (i === -1) continue;
    if (hasNegationBefore(lower, i)) score -= 1;
    else score += 1;
  }
  for (const w of bearishWords) {
    const i = lower.indexOf(w);
    if (i === -1) continue;
    if (hasNegationBefore(lower, i)) score += 1;
    else score -= 1;
  }
  if (score === 0) return 0;
  return Math.max(-1, Math.min(1, score / 5));
}

export function hasRiskKeyword(text: string, riskWords?: string[]): boolean {
  const lower = text.toLowerCase();
  const words = riskWords ?? RISK_WORDS;
  return words.some((w) => lower.includes(w));
}

/** Max engagement weight per tweet so one viral tweet doesn't dominate. Default 3. */
const ENGAGEMENT_CAP_DEFAULT = 3;
function getEngagementCap(): number {
  loadEnvOnce();
  const v = process.env.X_SENTIMENT_ENGAGEMENT_CAP;
  if (v === undefined || v === "") return ENGAGEMENT_CAP_DEFAULT;
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n < 1 ? ENGAGEMENT_CAP_DEFAULT : Math.min(20, n);
}

/** Min tweets with risk keywords to set hasHighRiskEvent. Default 2 to reduce single-troll false positives. */
const RISK_MIN_TWEETS_DEFAULT = 2;
function getRiskMinTweets(): number {
  loadEnvOnce();
  const v = process.env.X_SENTIMENT_RISK_MIN_TWEETS;
  if (v === undefined || v === "") return RISK_MIN_TWEETS_DEFAULT;
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n < 1 ? 1 : Math.min(10, n);
}

interface CachedSentiment {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  hasHighRiskEvent: boolean;
  updatedAt: number;
}

/** Cache file shape for persistence. Exported for cron script. */
export type XSentimentCacheFile = Record<string, CachedSentiment>;

function getCacheFilePath(): string {
  const dir = path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR);
  return path.join(dir, CACHE_FILENAME);
}

export class VinceXSentimentService extends Service {
  static serviceType = "VINCE_X_SENTIMENT_SERVICE";
  capabilityDescription = "X (Twitter) sentiment for core assets (staggered refresh, cache)";

  private cache = new Map<string, CachedSentiment>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private staggerIndex = 0;
  /** When set, skip refresh until this time (ms) to respect X API rate limit. */
  private rateLimitedUntilMs = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceXSentimentService> {
    loadEnvOnce();
    const service = new VinceXSentimentService(runtime);
    service.loadCacheFromFile();
    // Runtime starts all services in parallel; XResearch may not be registered yet. Yield and retry once.
    let xResearch = runtime.getService(
      "VINCE_X_RESEARCH_SERVICE",
    ) as VinceXResearchService | null;
    if (!xResearch?.isConfigured()) {
      await new Promise((r) => setImmediate(r));
      xResearch = runtime.getService(
        "VINCE_X_RESEARCH_SERVICE",
      ) as VinceXResearchService | null;
    }
    if (!xResearch?.isConfigured()) {
      service.cache.clear();
      logger.info(
        "[VinceXSentimentService] X research not configured — X sentiment disabled. Set X_BEARER_TOKEN in .env to enable.",
      );
      return service;
    }
    if (!isSentimentEnabled()) {
      logger.info(
        "[VinceXSentimentService] Background refresh disabled (X_SENTIMENT_ENABLED=false). Serving from cache; in-chat VINCE_X_RESEARCH uses X API.",
      );
      return service;
    }
    const staggerMs = getStaggerIntervalMs();
    const staggerMin = Math.round(staggerMs / 60_000);
    const cachePath = getCacheFilePath();
    const cycleHours = (staggerMs * CORE_ASSETS.length) / (60 * 60 * 1000);
    logger.info(
      "[VinceXSentimentService] Started (one asset every " +
        (staggerMin >= 60 ? `${Math.round(staggerMin / 60)}h` : `${staggerMin} min`) +
        ", " +
        CORE_ASSETS.length +
        " assets = full cycle every " +
        (cycleHours >= 1 ? `${cycleHours.toFixed(1)}h` : `${Math.round(cycleHours * 60)} min`) +
        ", cache: " +
        cachePath +
        ")",
    );
    // Stagger initial refresh 0–2 min to avoid multi-agent burst (shared X token). Skip in tests.
    if (process.env.NODE_ENV !== "test" && !process.env.X_SENTIMENT_JITTER_MS) {
      const jitterMs = Math.floor(Math.random() * 2 * 60 * 1000);
      await new Promise((r) => setTimeout(r, jitterMs));
    } else if (process.env.X_SENTIMENT_JITTER_MS) {
      const ms = Math.max(0, parseInt(process.env.X_SENTIMENT_JITTER_MS, 10));
      await new Promise((r) => setTimeout(r, ms));
    }
    await service.refreshOneAsset(0);
    service.staggerIndex = 1; // next tick will do SOL, then ETH, HYPE, then back to BTC
    service.refreshTimer = setInterval(() => {
      const idx = service.staggerIndex % CORE_ASSETS.length;
      service
        .refreshOneAsset(idx)
        .then(() => {
          service.staggerIndex += 1;
        })
        .catch((e) =>
          logger.warn("[VinceXSentimentService] Refresh failed: " + (e as Error).message),
        );
    }, staggerMs);
    return service;
  }

  async stop(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.cache.clear();
    this.rateLimitedUntilMs = 0;
    logger.info("[VinceXSentimentService] Stopped");
  }

  isConfigured(): boolean {
    const xResearch = this.runtime.getService(
      "VINCE_X_RESEARCH_SERVICE",
    ) as VinceXResearchService | null;
    return !!xResearch?.isConfigured();
  }

  /**
   * Same interface as NewsSentiment for the signal aggregator.
   * updatedAt is included for UI (e.g. "Updated X min ago").
   */
  getTradingSentiment(asset: string): {
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
    hasHighRiskEvent: boolean;
    updatedAt?: number;
  } {
    const cached = this.cache.get(asset);
    if (!cached) {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
    const age = Date.now() - cached.updatedAt;
    if (age > CACHE_TTL_MS) {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
    return {
      sentiment: cached.sentiment,
      confidence: cached.confidence,
      hasHighRiskEvent: cached.hasHighRiskEvent,
      updatedAt: cached.updatedAt,
    };
  }

  /** Load persistent cache from file so getTradingSentiment has data on startup. */
  loadCacheFromFile(): void {
    const filePath = getCacheFilePath();
    if (!existsSync(filePath)) return;
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw) as XSentimentCacheFile;
      if (data && typeof data === "object") {
        for (const [asset, entry] of Object.entries(data)) {
          if (
            entry &&
            typeof entry.sentiment === "string" &&
            typeof entry.confidence === "number" &&
            typeof entry.updatedAt === "number"
          ) {
            this.cache.set(asset, {
              sentiment: entry.sentiment,
              confidence: entry.confidence,
              hasHighRiskEvent: !!entry.hasHighRiskEvent,
              updatedAt: entry.updatedAt,
            });
          }
        }
      }
    } catch {
      // ignore invalid or missing file
    }
  }

  /** Persist one asset's cache entry to file (merge with existing). */
  private saveAssetToCacheFile(asset: string): void {
    const entry = this.cache.get(asset);
    if (!entry) return;
    const filePath = getCacheFilePath();
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    let data: XSentimentCacheFile = {};
    if (existsSync(filePath)) {
      try {
        data = JSON.parse(readFileSync(filePath, "utf-8")) as XSentimentCacheFile;
      } catch {
        // overwrite with fresh object
      }
    }
    data[asset] = entry;
    writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    logger.debug("[VinceXSentimentService] Updated cache file for " + asset);
  }

  /**
   * Refresh sentiment for one asset (staggered tick). Respects rate limit; on 429
   * sets rateLimitedUntilMs so subsequent ticks skip until reset.
   */
  async refreshOneAsset(index: number): Promise<void> {
    const xResearch = this.runtime.getService(
      "VINCE_X_RESEARCH_SERVICE",
    ) as VinceXResearchService | null;
    if (!xResearch?.isConfigured()) return;

    // Sync from shared cache so we respect cooldowns set by in-chat X research (same token).
    const cachedUntil = await this.runtime.getCache<number>(X_RATE_LIMITED_UNTIL_CACHE_KEY);
    if (cachedUntil && cachedUntil > this.rateLimitedUntilMs) {
      this.rateLimitedUntilMs = cachedUntil;
    }

    const now = Date.now();
    if (now < this.rateLimitedUntilMs) {
      const waitMin = Math.ceil((this.rateLimitedUntilMs - now) / 60_000);
      logger.debug(
        `[VinceXSentimentService] Skipping refresh — rate limited, retry in ~${waitMin} min`,
      );
      return;
    }

    const asset = CORE_ASSETS[index % CORE_ASSETS.length];
    try {
      await this.refreshForAsset(asset, xResearch);
      this.saveAssetToCacheFile(asset);
    } catch (e) {
      const msg = (e as Error).message;
      const isRateLimit =
        msg.includes("rate limit") ||
        msg.includes("429") ||
        /Resets?\s+in\s+\d+\s*s/i.test(msg);
      if (isRateLimit) {
        const waitSec = parseRateLimitResetSeconds(msg) || 600;
        this.rateLimitedUntilMs = Date.now() + waitSec * 1000;
        await this.runtime.setCache(X_RATE_LIMITED_UNTIL_CACHE_KEY, this.rateLimitedUntilMs);
        logger.info(
          `[VinceXSentimentService] X API rate limited. Skipping refresh for ${Math.ceil(waitSec / 60)} min (serving cached sentiment).`,
        );
        return; // Do not throw — allow service to start and serve from cache; timer will retry after reset
      }
      throw e;
    }
  }

  private async refreshForAsset(
    asset: string,
    xResearch: VinceXResearchService,
  ): Promise<void> {
    const query = buildSentimentQuery(asset);
    const since = getSentimentSince();
    const sortOrder = getSentimentSortOrder();
    const tweets = await xResearch.search(query, {
      maxResults: 30,
      pages: 1,
      sortOrder,
      since,
    });

    const minTweets = getMinTweetsForConfidence();
    if (tweets.length < minTweets) {
      this.cache.set(asset, {
        sentiment: "neutral",
        confidence: 0,
        hasHighRiskEvent: false,
        updatedAt: Date.now(),
      });
      return;
    }

    let sumSentiment = 0;
    let weightedSum = 0;
    let totalWeight = 0;
    let hasRisk = false;

    const keywordLists = getKeywordLists();
    const engagementCap = getEngagementCap();
    let riskTweetCount = 0;
    for (const t of tweets) {
      const s = simpleSentiment(t.text, {
        bullish: keywordLists.bullish,
        bearish: keywordLists.bearish,
      });
      if (hasRiskKeyword(t.text, keywordLists.risk)) riskTweetCount += 1;
      const rawWeight = 1 + Math.log10(1 + (t.metrics.likes || 0));
      const weight = Math.min(rawWeight, engagementCap);
      sumSentiment += s;
      weightedSum += s * weight;
      totalWeight += weight;
    }
    const minRiskTweets = getRiskMinTweets();
    hasRisk = riskTweetCount >= minRiskTweets;

    const avgRaw = sumSentiment / tweets.length;
    const avgWeighted = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const avgSentiment = avgWeighted !== 0 ? avgWeighted : avgRaw;

    const threshold = getBullBearThreshold();
    let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
    if (avgSentiment > threshold) sentiment = "bullish";
    else if (avgSentiment < -threshold) sentiment = "bearish";

    // Tuned so small-but-clear samples reach ~40: e.g. 5 tweets + 0.2 avg -> strength ~0.6 -> confidence 42
    const strength = Math.min(
      1,
      Math.abs(avgSentiment) * 2 +
        tweets.length / 25 +
        (tweets.length >= minTweets && Math.abs(avgSentiment) > 0.2 ? 0.08 : 0),
    );
    const confidence = Math.round(Math.min(100, strength * 70));

    this.cache.set(asset, {
      sentiment,
      confidence,
      hasHighRiskEvent: hasRisk,
      updatedAt: Date.now(),
    });
  }
}
