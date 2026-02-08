/**
 * VINCE X (Twitter) Sentiment Service
 *
 * Produces trading sentiment (bullish/bearish/neutral + confidence) from X search
 * results for use by the signal aggregator. Caches per-asset; refreshes at configurable
 * interval (default 30 min) to respect X API rate limits. Depends on VinceXResearchService.
 */

import { Service, logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import type { VinceXResearchService } from "./xResearch.service";
import type { XTweet } from "./xResearch.service";
import { CORE_ASSETS } from "../constants/targetAssets";
import { loadEnvOnce } from "../utils/loadEnvOnce";

function getRefreshIntervalMs(): number {
  loadEnvOnce();
  const min = parseInt(process.env.X_SENTIMENT_REFRESH_MINUTES ?? "30", 10);
  return Math.max(15, Math.min(120, min)) * 60 * 1000;
}
function getAssetDelayMs(): number {
  loadEnvOnce();
  if (process.env.NODE_ENV === "test") return 0;
  const ms = parseInt(process.env.X_SENTIMENT_ASSET_DELAY_MS ?? "800", 10);
  return Math.max(400, Math.min(3000, ms));
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min (match default refresh)
const MIN_TWEETS_FOR_CONFIDENCE = 3;

/** Parse "Resets in Ns" from X API rate-limit error. Returns seconds or 0. Exported for tests. */
export function parseRateLimitResetSeconds(message: string): number {
  const match = message.match(/Resets?\s+in\s+(\d+)\s*s/i);
  return match ? Math.max(1, parseInt(match[1], 10)) : 0;
}
const BULLISH_WORDS = [
  "bullish",
  "moon",
  "pump",
  "buy",
  "long",
  "great",
  "love",
  "bull",
  "growth",
  "profit",
  "accumulate",
  "bottom",
];
const BEARISH_WORDS = [
  "bearish",
  "dump",
  "sell",
  "short",
  "bad",
  "hate",
  "bear",
  "crash",
  "fud",
  "top",
];
const RISK_WORDS = ["rug", "scam", "exploit", "hack", "drain", "stolen"];

function simpleSentiment(text: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of BULLISH_WORDS) {
    if (lower.includes(w)) score += 1;
  }
  for (const w of BEARISH_WORDS) {
    if (lower.includes(w)) score -= 1;
  }
  if (score === 0) return 0;
  return Math.max(-1, Math.min(1, score / 5));
}

function hasRiskKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return RISK_WORDS.some((w) => lower.includes(w));
}

interface CachedSentiment {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  hasHighRiskEvent: boolean;
  updatedAt: number;
}

export class VinceXSentimentService extends Service {
  static serviceType = "VINCE_X_SENTIMENT_SERVICE";

  private cache = new Map<string, CachedSentiment>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  /** When set, skip refresh until this time (ms) to respect X API rate limit. */
  private rateLimitedUntilMs = 0;
  private getDelayMs(): number {
    return getAssetDelayMs();
  }

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceXSentimentService> {
    loadEnvOnce();
    const service = new VinceXSentimentService(runtime);
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
      logger.info(
        "[VinceXSentimentService] X research not configured — X sentiment disabled. Set X_BEARER_TOKEN in .env to enable.",
      );
      return service;
    }
    const refreshMs = getRefreshIntervalMs();
    const delayMs = getAssetDelayMs();
    const refreshMin = Math.round(refreshMs / 60_000);
    logger.info(
      "[VinceXSentimentService] Started (refresh every " +
        refreshMin +
        " min, assets: " +
        CORE_ASSETS.join(", ") +
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
    await service.refreshAll();
    service.refreshTimer = setInterval(() => {
      service.refreshAll().catch((e) =>
        logger.warn("[VinceXSentimentService] Refresh failed: " + (e as Error).message),
      );
    }, refreshMs);
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
   */
  getTradingSentiment(asset: string): {
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
    hasHighRiskEvent: boolean;
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
    };
  }

  /**
   * Refresh sentiment for all core assets (called on interval).
   * Respects X API rate limit: on 429, backs off until the reset time and skips further calls.
   */
  async refreshAll(): Promise<void> {
    const xResearch = this.runtime.getService(
      "VINCE_X_RESEARCH_SERVICE",
    ) as VinceXResearchService | null;
    if (!xResearch?.isConfigured()) return;

    const now = Date.now();
    if (now < this.rateLimitedUntilMs) {
      const waitMin = Math.ceil((this.rateLimitedUntilMs - now) / 60_000);
      logger.debug(
        `[VinceXSentimentService] Skipping refresh — rate limited, retry in ~${waitMin} min`,
      );
      return;
    }

    for (const asset of CORE_ASSETS) {
      try {
        await this.refreshForAsset(asset, xResearch);
        await new Promise((r) => setTimeout(r, this.getDelayMs()));
      } catch (e) {
        const msg = (e as Error).message;
        const isRateLimit =
          msg.includes("rate limit") ||
          msg.includes("429") ||
          /Resets?\s+in\s+\d+\s*s/i.test(msg);
        if (isRateLimit) {
          const waitSec = parseRateLimitResetSeconds(msg) || 600;
          this.rateLimitedUntilMs = Date.now() + waitSec * 1000;
          logger.info(
            `[VinceXSentimentService] X API rate limited. Skipping refresh for ${Math.ceil(waitSec / 60)} min (serving cached sentiment).`,
          );
          return;
        }
        logger.debug(
          `[VinceXSentimentService] Refresh ${asset} failed: ${msg}`,
        );
      }
    }
  }

  private async refreshForAsset(
    asset: string,
    xResearch: VinceXResearchService,
  ): Promise<void> {
    const query = asset === "HYPE" ? "HYPE crypto" : `$${asset}`;
    const tweets = await xResearch.search(query, {
      maxResults: 30,
      pages: 1,
      sortOrder: "relevancy",
      since: "1d",
    });

    if (tweets.length < MIN_TWEETS_FOR_CONFIDENCE) {
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

    for (const t of tweets) {
      const s = simpleSentiment(t.text);
      if (hasRiskKeyword(t.text)) hasRisk = true;
      const weight = 1 + Math.log10(1 + (t.metrics.likes || 0));
      sumSentiment += s;
      weightedSum += s * weight;
      totalWeight += weight;
    }

    const avgRaw = sumSentiment / tweets.length;
    const avgWeighted = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const avgSentiment = avgWeighted !== 0 ? avgWeighted : avgRaw;

    let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
    if (avgSentiment > 0.15) sentiment = "bullish";
    else if (avgSentiment < -0.15) sentiment = "bearish";

    const strength = Math.min(1, Math.abs(avgSentiment) * 2 + tweets.length / 50);
    const confidence = Math.round(Math.min(100, strength * 70));

    this.cache.set(asset, {
      sentiment,
      confidence,
      hasHighRiskEvent: hasRisk,
      updatedAt: Date.now(),
    });
  }
}
