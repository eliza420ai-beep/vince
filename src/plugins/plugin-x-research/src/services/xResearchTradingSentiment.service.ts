/**
 * X Research Trading Sentiment Service
 *
 * Exposes getTradingSentiment(asset) for the paper trading signal aggregator when
 * X_SENTIMENT_USE_X_RESEARCH_PLUGIN=true. Uses topic-based search + quality-weighted
 * sentiment from plugin-x-research (topics, tier weighting, contrarian detection).
 * Results are cached in-memory and refreshed on a stagger (one asset per interval).
 */

import { Service, logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { initXClientFromEnv } from "./xClient.service";
import { getXSearchService } from "./xSearch.service";
import { getXSentimentService } from "./xSentiment.service";
import { TOPIC_BY_ID } from "../constants/topics";

const ASSET_TO_TOPIC_ID: Record<string, string> = {
  BTC: "btc",
  ETH: "eth",
  SOL: "sol",
  HYPE: "hype",
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min per asset
const STAGGER_MS = 15 * 60 * 1000; // refresh one asset every 15 min

export interface TradingSentimentResult {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  hasHighRiskEvent: boolean;
}

interface CachedEntry extends TradingSentimentResult {
  updatedAt: number;
}

export class XResearchTradingSentimentService extends Service {
  static serviceType = "X_RESEARCH_TRADING_SENTIMENT_SERVICE";
  capabilityDescription =
    "Trading sentiment from X (topic + quality weighting) for signal aggregator when X_SENTIMENT_USE_X_RESEARCH_PLUGIN=true";

  private cache = new Map<string, CachedEntry>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private staggerIndex = 0;
  private readonly assets = ["BTC", "ETH", "SOL", "HYPE"];

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<XResearchTradingSentimentService> {
    const service = new XResearchTradingSentimentService(runtime);
    try {
      initXClientFromEnv(runtime);
    } catch {
      logger.debug(
        "[XResearchTradingSentiment] X client not configured; getTradingSentiment will return neutral.",
      );
      return service;
    }
    service.refreshTimer = setInterval(() => {
      service
        .refreshOneAsset()
        .catch((e) =>
          logger.warn(
            `[XResearchTradingSentiment] refresh failed: ${(e as Error).message}`,
          ),
        );
    }, STAGGER_MS);
    service.refreshOneAsset().catch(() => {});
    return service;
  }

  async stop(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.cache.clear();
  }

  isConfigured(): boolean {
    try {
      initXClientFromEnv(this.runtime);
      return true;
    } catch {
      return false;
    }
  }

  private async refreshOneAsset(): Promise<void> {
    const asset = this.assets[this.staggerIndex % this.assets.length];
    this.staggerIndex += 1;
    const topicId = ASSET_TO_TOPIC_ID[asset];
    if (!topicId || !TOPIC_BY_ID[topicId]) return;
    try {
      initXClientFromEnv(this.runtime);
    } catch {
      return;
    }
    const searchService = getXSearchService();
    const sentimentService = getXSentimentService();
    const tweets = await searchService.searchTopic(topicId, {
      maxResults: 50,
      hoursBack: 24,
      cacheTtlMs: 10 * 60 * 1000,
    });
    if (!tweets?.length) {
      this.cache.set(asset, {
        sentiment: "neutral",
        confidence: 0,
        hasHighRiskEvent: false,
        updatedAt: Date.now(),
      });
      return;
    }
    const result = sentimentService.analyzeSentiment(tweets, {
      topics: [topicId],
      weightByTier: true,
      detectContrarian: true,
    });
    const dir = result.overallSentiment;
    const sentiment: TradingSentimentResult["sentiment"] =
      dir === "mixed"
        ? "neutral"
        : dir === "bullish" || dir === "bearish"
          ? dir
          : "neutral";
    const confidence = Math.min(100, Math.max(0, result.overallConfidence));
    const hasHighRiskEvent =
      Array.isArray(result.warnings) && result.warnings.length > 0;
    this.cache.set(asset, {
      sentiment,
      confidence,
      hasHighRiskEvent,
      updatedAt: Date.now(),
    });
  }

  /**
   * Same shape as VinceXSentimentService.getTradingSentiment for aggregator compatibility.
   * Returns from cache (sync); confidence 0–100.
   */
  getTradingSentiment(asset: string): TradingSentimentResult {
    const topicId = ASSET_TO_TOPIC_ID[asset?.toUpperCase()];
    if (!topicId || !TOPIC_BY_ID[topicId]) {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
    const cached = this.cache.get(asset?.toUpperCase());
    if (!cached) {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
    if (Date.now() - cached.updatedAt > CACHE_TTL_MS) {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
    return {
      sentiment: cached.sentiment,
      confidence: cached.confidence,
      hasHighRiskEvent: cached.hasHighRiskEvent,
    };
  }
}
