/**
 * Vince Polymarket Sentiment Service
 *
 * Derives market sentiment (macro, stocks, crypto, BTC/ETH/SOL) from Polymarket
 * priority markets (odds). Feeds the signal aggregator and Solus market context;
 * ECHO surfaces it via POLYMARKET_VIBE. Uses PolymarketService when available
 * (plugin-polymarket-discovery on same runtime). Cache file for restarts and
 * cross-consumer (Solus, ECHO). Set POLYMARKET_SENTIMENT_ENABLED=false to disable.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Service, logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";

const CACHE_FILENAME = "polymarket-sentiment-cache.json";
const REFRESH_MIN_DEFAULT = 15;
const CONFIDENCE_FLOOR_DEFAULT = 40;

/** Tag slugs we fetch; map to sentiment buckets. */
const BUCKET_TAGS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  "fed-rates": "macro",
  treasuries: "macro",
  economy: "macro",
  geopolitics: "macro",
  stocks: "stocks",
  indicies: "stocks",
  indices: "stocks",
  ipo: "stocks",
};

export interface PolymarketSentimentEntry {
  score: number;
  label: "bullish" | "bearish" | "neutral";
  confidence: number;
  marketCount: number;
}

export type PolymarketSentimentMap = Record<
  string,
  PolymarketSentimentEntry | undefined
>;

interface CacheShape {
  updatedAt: number;
  sentiment: PolymarketSentimentMap;
}

/** Minimal market shape from PolymarketService (avoid importing from plugin-polymarket-discovery). */
interface MarketLike {
  question?: string;
  conditionId?: string;
  condition_id?: string;
  tokens?: Array<{ outcome?: string; price?: number }>;
  outcomePrices?: string | string[];
}

/** Minimal PolymarketService interface for fetching and pricing. */
interface PolymarketServiceLike {
  getEventsByTag(tagIdOrSlug: string, limit: number): Promise<MarketLike[]>;
  getPricesFromMarketPayload(market: MarketLike): {
    yes_price: string;
    no_price: string;
  } | null;
}

function getCacheFilePath(): string {
  return path.join(process.cwd(), ".elizadb", PERSISTENCE_DIR, CACHE_FILENAME);
}

function getRefreshMin(): number {
  const v = process.env.POLYMARKET_SENTIMENT_REFRESH_MIN?.trim();
  const n = v ? parseInt(v, 10) : REFRESH_MIN_DEFAULT;
  return Number.isFinite(n) && n >= 1 ? Math.min(120, n) : REFRESH_MIN_DEFAULT;
}

function isEnabled(): boolean {
  const v = process.env.POLYMARKET_SENTIMENT_ENABLED;
  if (v === undefined || v === "") return true;
  return /^(1|true|yes)$/i.test(v.trim());
}

function scoreToLabel(score: number): "bullish" | "bearish" | "neutral" {
  if (score > 0.55) return "bullish";
  if (score < 0.45) return "bearish";
  return "neutral";
}

function confidenceFromCount(n: number): number {
  return Math.min(100, Math.max(0, 35 + Math.min(15, n) * 3));
}

export class VincePolymarketSentimentService extends Service {
  static serviceType = "VINCE_POLYMARKET_SENTIMENT_SERVICE" as const;

  capabilityDescription =
    "Polymarket prediction-market sentiment (BTC/ETH/SOL/macro/stocks) for perps signal and Solus context";

  private cache: PolymarketSentimentMap = {};
  private cacheUpdatedAt = 0;
  private refreshMin = getRefreshMin();

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VincePolymarketSentimentService> {
    const svc = new VincePolymarketSentimentService(runtime);
    svc.loadCacheFromFile();
    logger.info(
      "[VincePolymarketSentiment] Started. Set POLYMARKET_SENTIMENT_ENABLED=false to disable.",
    );
    return svc;
  }

  isConfigured(): boolean {
    if (!isEnabled()) return false;
    const pm = this.runtime.getService(
      "POLYMARKET_DISCOVERY_SERVICE",
    ) as PolymarketServiceLike | null;
    return !!pm && typeof pm.getEventsByTag === "function";
  }

  /** Full bucket map for ECHO and Solus. */
  getPolymarketSentiment(): PolymarketSentimentMap {
    this.maybeRefresh();
    return { ...this.cache };
  }

  /**
   * Per-asset trading sentiment for signal aggregator (same shape as XSentiment).
   * Only BTC, ETH, SOL have buckets; others return neutral.
   */
  getTradingSentiment(asset: string): {
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
    hasHighRiskEvent: boolean;
  } {
    this.maybeRefresh();
    const key = asset.toUpperCase();
    const entry = this.cache[key];
    if (!entry) {
      return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false };
    }
    return {
      sentiment: entry.label,
      confidence: entry.confidence,
      hasHighRiskEvent: false,
    };
  }

  /** One-line summary for Solus market context, e.g. "BTC 72% | macro 55% | stocks 48%". */
  getSummaryLine(): string | null {
    this.maybeRefresh();
    const parts: string[] = [];
    for (const [bucket, entry] of Object.entries(this.cache)) {
      if (entry && entry.marketCount > 0) {
        const pct = Math.round(entry.score * 100);
        const label =
          entry.label === "neutral"
            ? ""
            : entry.label === "bullish"
              ? " up"
              : " down";
        parts.push(`${bucket} ${pct}%${label}`);
      }
    }
    if (parts.length === 0) return null;
    return `Polymarket: ${parts.join(" | ")}`;
  }

  private maybeRefresh(): void {
    const intervalMs = this.refreshMin * 60 * 1000;
    if (
      Date.now() - this.cacheUpdatedAt < intervalMs &&
      Object.keys(this.cache).length > 0
    ) {
      return;
    }
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    if (!isEnabled()) return;
    const pm = this.runtime.getService(
      "POLYMARKET_DISCOVERY_SERVICE",
    ) as PolymarketServiceLike | null;
    if (!pm || typeof pm.getEventsByTag !== "function") {
      logger.debug(
        "[VincePolymarketSentiment] POLYMARKET_DISCOVERY_SERVICE not available; skip refresh.",
      );
      return;
    }
    try {
      const next: Record<string, { sum: number; n: number }> = {};
      const tagSlugs = Object.keys(BUCKET_TAGS);
      for (const slug of tagSlugs) {
        const bucket = BUCKET_TAGS[slug];
        try {
          const markets = await pm.getEventsByTag(slug, 15);
          for (const m of markets) {
            const prices = pm.getPricesFromMarketPayload(m);
            if (prices) {
              const yesNum = parseFloat(prices.yes_price);
              if (!Number.isNaN(yesNum) && yesNum >= 0 && yesNum <= 1) {
                if (!next[bucket]) next[bucket] = { sum: 0, n: 0 };
                next[bucket].sum += yesNum;
                next[bucket].n += 1;
              }
            }
          }
        } catch (e) {
          logger.debug(
            `[VincePolymarketSentiment] getEventsByTag(${slug}) failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      const sentiment: PolymarketSentimentMap = {};
      for (const [bucket, { sum, n }] of Object.entries(next)) {
        if (n > 0) {
          const score = sum / n;
          sentiment[bucket] = {
            score,
            label: scoreToLabel(score),
            confidence: confidenceFromCount(n),
            marketCount: n,
          };
        }
      }
      this.cache = sentiment;
      this.cacheUpdatedAt = Date.now();
      this.writeCacheToFile();
      if (Object.keys(sentiment).length > 0) {
        logger.debug(
          `[VincePolymarketSentiment] Refreshed: ${Object.entries(sentiment)
            .map(([b, e]) => `${b} ${e!.label} (${e!.marketCount} markets)`)
            .join(", ")}`,
        );
      }
    } catch (e) {
      logger.warn(
        `[VincePolymarketSentiment] Refresh failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  loadCacheFromFile(): void {
    const filePath = getCacheFilePath();
    if (!existsSync(filePath)) return;
    try {
      const raw = readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw) as CacheShape;
      if (data.sentiment && typeof data.sentiment === "object") {
        this.cache = data.sentiment;
        this.cacheUpdatedAt = data.updatedAt ?? 0;
      }
    } catch {
      // ignore
    }
  }

  private writeCacheToFile(): void {
    try {
      const dir = path.dirname(getCacheFilePath());
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const data: CacheShape = {
        updatedAt: this.cacheUpdatedAt,
        sentiment: this.cache,
      };
      writeFileSync(getCacheFilePath(), JSON.stringify(data, null, 0), "utf-8");
    } catch (e) {
      logger.debug(
        `[VincePolymarketSentiment] Write cache failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async stop(): Promise<void> {
    this.cache = {};
    this.cacheUpdatedAt = 0;
  }
}
