/**
 * VINCE X (Twitter) Sentiment Service
 *
 * Produces trading sentiment (bullish/bearish/neutral + confidence) from X search
 * results for use by the signal aggregator. Staggered refresh: one asset per interval
 * (default 1 hour) so we never burst—e.g. 4 assets = each refreshed every 4h; 24 assets = full cycle every 24h.
 * Set X_SENTIMENT_ENABLED=false to disable background refresh (in-chat only).
 * Persistent cache file for restarts and optional cron. Depends on VinceXResearchService.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
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
} from "../constants/sentimentKeywords";
import { loadEnvOnce } from "../utils/loadEnvOnce";
import {
  computeSentimentFromTweets,
  type SentimentKeywordLists,
  type SentimentCacheEntry,
  type ComputeSentimentOptions,
  simpleSentiment,
  hasRiskKeyword,
} from "../utils/xSentimentLogic";

export { simpleSentiment, hasRiskKeyword };

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

/** Assets to refresh for X sentiment. Default CORE_ASSETS; override with X_SENTIMENT_ASSETS (comma-separated). */
function getSentimentAssets(): string[] {
  loadEnvOnce();
  const v = process.env.X_SENTIMENT_ASSETS?.trim();
  if (!v) return [...CORE_ASSETS];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Build search query for an asset: expanded for known tickers ($BTC OR Bitcoin etc). */
export function buildSentimentQuery(asset: string): string {
  if (asset === "HYPE") return "HYPE crypto";
  const expanded: Record<string, string> = {
    BTC: "$BTC OR Bitcoin",
    ETH: "$ETH OR Ethereum",
    SOL: "$SOL OR Solana",
    DOGE: "$DOGE OR Dogecoin",
    PEPE: "$PEPE OR Pepe",
  };
  return expanded[asset] ?? `$${asset}`;
}

/** Parse "Resets in Ns" from X API rate-limit error. Returns seconds or 0. Exported for tests. */
export function parseRateLimitResetSeconds(message: string): number {
  const match = message.match(/Resets?\s+in\s+(\d+)\s*s/i);
  return match ? Math.max(1, parseInt(match[1], 10)) : 0;
}

/** True when a second token is set for sentiment/background so in-chat keeps using primary. */
function useBackgroundToken(): boolean {
  loadEnvOnce();
  return !!(process.env.X_BEARER_TOKEN_SENTIMENT?.trim() || process.env.X_BEARER_TOKEN_BACKGROUND?.trim());
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
      logger.debug(
        "[VinceXSentimentService] X research not configured — X sentiment disabled. Set X_BEARER_TOKEN in .env to enable.",
      );
      return service;
    }
    if (!isSentimentEnabled()) {
      logger.debug(
        "[VinceXSentimentService] Background refresh disabled (X_SENTIMENT_ENABLED=false). Serving from cache; in-chat VINCE_X_RESEARCH uses X API.",
      );
      return service;
    }
    const staggerMs = getStaggerIntervalMs();
    const staggerMin = Math.round(staggerMs / 60_000);
    const cachePath = getCacheFilePath();
    const sentimentAssets = getSentimentAssets();
    const cycleHours = (staggerMs * sentimentAssets.length) / (60 * 60 * 1000);
    logger.debug(
      "[VinceXSentimentService] Started (one asset every " +
        (staggerMin >= 60 ? `${Math.round(staggerMin / 60)}h` : `${staggerMin} min`) +
        ", " +
        sentimentAssets.length +
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
      const sentimentAssets = getSentimentAssets();
      const idx = service.staggerIndex % sentimentAssets.length;
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
    logger.debug("[VinceXSentimentService] Stopped");
  }

  isConfigured(): boolean {
    const xResearch = this.runtime.getService(
      "VINCE_X_RESEARCH_SERVICE",
    ) as VinceXResearchService | null;
    return !!xResearch?.isConfigured();
  }

  /** When rate limited, returns Unix ms after which refresh will retry. Caller can show "Retry in Xs". */
  getRateLimitedUntilMs(): number {
    return this.rateLimitedUntilMs;
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

  private listSentimentCache: CachedSentiment | null = null;
  private listSentimentCacheTs = 0;
  private static LIST_SENTIMENT_TTL_MS = 15 * 60 * 1000; // 15 min

  /**
   * Sentiment over the curated list feed (X_LIST_ID). Same scoring as per-asset; cached 15 min.
   * Returns neutral when list not configured or X_SENTIMENT_LIST_ENABLED=false.
   */
  async getListSentiment(): Promise<{
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
    hasHighRiskEvent: boolean;
    updatedAt?: number;
  }> {
    loadEnvOnce();
    const listEnabled = process.env.X_SENTIMENT_LIST_ENABLED;
    if (listEnabled !== undefined && listEnabled !== "" && !/^(1|true|yes)$/i.test(listEnabled.trim())) {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
    const xResearch = this.runtime.getService(
      "VINCE_X_RESEARCH_SERVICE",
    ) as VinceXResearchService | null;
    if (!xResearch?.isConfigured()) return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    const listId = xResearch.getListId();
    if (!listId) return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    const now = Date.now();
    if (this.listSentimentCache && now - this.listSentimentCacheTs < VinceXSentimentService.LIST_SENTIMENT_TTL_MS) {
      return {
        sentiment: this.listSentimentCache.sentiment,
        confidence: this.listSentimentCache.confidence,
        hasHighRiskEvent: this.listSentimentCache.hasHighRiskEvent,
        updatedAt: this.listSentimentCache.updatedAt,
      };
    }
    try {
      const { tweets } = await xResearch.getListPosts(listId, { maxResults: 50, useBackgroundToken: useBackgroundToken() });
      const entry = computeSentimentFromTweets(tweets, {
        keywordLists: getKeywordLists(),
        minTweets: getMinTweetsForConfidence(),
        bullBearThreshold: getBullBearThreshold(),
        engagementCap: getEngagementCap(),
        riskMinTweets: getRiskMinTweets(),
      });
      this.listSentimentCache = entry;
      this.listSentimentCacheTs = now;
      return { ...entry };
    } catch {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
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
    const tmpPath = `${filePath}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmpPath, filePath);
    logger.debug("[VinceXSentimentService] Updated cache file for " + asset);
  }

  /**
   * Refresh sentiment for one asset (staggered tick). Respects rate limit; on 429
   * sets rateLimitedUntilMs so subsequent ticks skip until reset. With multiple sentiment tokens, cooldown is per-token.
   */
  async refreshOneAsset(index: number): Promise<void> {
    const xResearch = this.runtime.getService(
      "VINCE_X_RESEARCH_SERVICE",
    ) as VinceXResearchService | null;
    if (!xResearch?.isConfigured()) return;

    const limitKey = useBackgroundToken()
      ? xResearch.getSentimentCooldownKey(index)
      : X_RATE_LIMITED_UNTIL_CACHE_KEY;
    const cachedUntil = await this.runtime.getCache<number>(limitKey);
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

    const sentimentAssets = getSentimentAssets();
    const asset = sentimentAssets[index % sentimentAssets.length];
    try {
      await this.refreshForAsset(asset, xResearch, index);
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
        const limitKey = useBackgroundToken()
          ? xResearch.getSentimentCooldownKey(index)
          : X_RATE_LIMITED_UNTIL_CACHE_KEY;
        await this.runtime.setCache(limitKey, this.rateLimitedUntilMs);
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
    assetIndex: number,
  ): Promise<void> {
    const query = buildSentimentQuery(asset);
    const since = getSentimentSince();
    const sortOrder = getSentimentSortOrder();
    const tweets =
      "searchForSentiment" in xResearch && typeof xResearch.searchForSentiment === "function"
        ? await xResearch.searchForSentiment(query, { pages: 2, since, sortOrder, tokenIndex: assetIndex })
        : await xResearch.search(query, {
            maxResults: 30,
            pages: 1,
            sortOrder,
            since,
            useBackgroundToken: useBackgroundToken(),
            tokenIndex: assetIndex,
          });

    const entry = computeSentimentFromTweets(tweets, {
      keywordLists: getKeywordLists(),
      minTweets: getMinTweetsForConfidence(),
      bullBearThreshold: getBullBearThreshold(),
      engagementCap: getEngagementCap(),
      riskMinTweets: getRiskMinTweets(),
    });
    this.cache.set(asset, entry);
  }

  /**
   * Thin wrapper: fetch tweets via searchForSentiment (or search fallback) then compute keyword-based sentiment.
   * Optionally prioritizes VIP/quality handles and sorts by engagement. For opinionated BTC/crypto queries
   * add terms like (bullish OR bearish OR price OR buy OR sell).
   */
  async getTopicSentiment(
    query: string,
    opts: {
      pages?: number;
      since?: string;
      sortOrder?: "relevancy" | "recency";
      tokenIndex?: number;
      minEngagement?: number;
      minFollowers?: number;
      prioritizeVips?: boolean;
      sortByMetric?: "likes" | "impressions" | "retweets" | "replies";
    } & Partial<ComputeSentimentOptions> = {},
  ): Promise<{ tweets: XTweet[]; sentiment: SentimentCacheEntry }> {
    const xResearch = this.runtime.getService("VINCE_X_RESEARCH_SERVICE") as VinceXResearchService | null;
    if (!xResearch) throw new Error("VinceXResearchService not available");
    let tweets: XTweet[];
    if ("searchForSentiment" in xResearch && typeof xResearch.searchForSentiment === "function") {
      tweets = await xResearch.searchForSentiment(query, {
        pages: opts.pages ?? 2,
        since: opts.since ?? getSentimentSince(),
        sortOrder: opts.sortOrder ?? getSentimentSortOrder(),
        tokenIndex: opts.tokenIndex,
        minEngagement: opts.minEngagement,
        minFollowers: opts.minFollowers,
      });
    } else {
      const raw = await xResearch.search(query, {
        maxResults: 100,
        pages: opts.pages ?? 2,
        sortOrder: opts.sortOrder ?? getSentimentSortOrder(),
        since: opts.since ?? getSentimentSince(),
        useBackgroundToken: useBackgroundToken(),
        tokenIndex: opts.tokenIndex,
      });
      const minEng = opts.minEngagement ?? 0;
      const minFoll = opts.minFollowers ?? 0;
      tweets = raw.filter(
        (t) => t.metrics.likes >= minEng && (t.author_followers ?? 0) >= minFoll,
      );
    }
    if (opts.prioritizeVips ?? true) {
      const vips = await xResearch.getQualityAccountHandles();
      tweets = xResearch.reorderTweetsWithVipFirst(tweets, vips);
    }
    if (opts.sortByMetric) {
      tweets = xResearch.sortBy(tweets, opts.sortByMetric);
    }
    tweets = xResearch.dedupeById(tweets);
    const { keywordLists, minTweets, bullBearThreshold, engagementCap, riskMinTweets } = opts;
    const entry = computeSentimentFromTweets(tweets, {
      keywordLists: keywordLists ?? getKeywordLists(),
      minTweets: minTweets ?? getMinTweetsForConfidence(),
      bullBearThreshold: bullBearThreshold ?? getBullBearThreshold(),
      engagementCap: engagementCap ?? getEngagementCap(),
      riskMinTweets: riskMinTweets ?? getRiskMinTweets(),
    });
    return { tweets, sentiment: entry };
  }
}
