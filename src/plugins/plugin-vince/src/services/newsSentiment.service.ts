/**
 * VINCE News Sentiment Service
 *
 * Tracks news and sentiment from MandoMinutes:
 * - Reads from shared MandoMinutes cache (mando_minutes:latest)
 * - Sentiment analysis with bullish/bearish keyword detection
 * - Risk event detection (hacks, exploits, SEC actions)
 * - Asset-specific news filtering (BTC, ETH, SOL, HYPE)
 *
 * Integrates with plugin-web-search's MANDO_MINUTES action.
 */

import fs from "node:fs";
import path from "node:path";
import { Service, type IAgentRuntime, ModelType, logger } from "@elizaos/core";
import { PuppeteerBrowserService } from "./fallbacks/puppeteer.browser";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import { isVinceAgent, isElizaAgent } from "../utils/dashboard";

// ==========================================
// Sentiment Analysis Constants
// ==========================================

/** Keywords that indicate bullish sentiment */
const BULLISH_KEYWORDS = [
  // Price action
  "rally",
  "surge",
  "breakout",
  "ath",
  "all-time high",
  "moon",
  "pump",
  "gains",
  "soars",
  "jumps",
  "spikes",
  "climbs",
  "rises",
  // Institutional
  "etf inflow",
  "inflows",
  "accumulation",
  "accumulating",
  "buying",
  "institutional",
  "adoption",
  "approval",
  "approved",
  "launch",
  // Positive news ("record" removed - ambiguous: "record outflows" is bearish)
  "bullish",
  "optimistic",
  "upgrade",
  "partnership",
  "milestone",
  "record high",
  "record inflow",
  "expansion",
  "growth",
  "success",
  "breakthrough",
];

/** Keywords that indicate bearish sentiment */
const BEARISH_KEYWORDS = [
  // Price action
  "crash",
  "dump",
  "plunge",
  "selloff",
  "sell-off",
  "sell off",
  "decline",
  "drop",
  "falls",
  "fell",
  "fall",
  "sinks",
  "tumbles",
  "slides",
  "slide",
  "correction",
  "capitulation",
  // Negative events
  "hack",
  "hacked",
  "exploit",
  "exploited",
  "rug",
  "rugged",
  "scam",
  "sec",
  "lawsuit",
  "investigation",
  "probes",
  "ban",
  "banned",
  "crackdown",
  // Outflows / pullbacks
  "etf outflow",
  "outflows",
  "distribution",
  "selling",
  "liquidation",
  "retreat",
  "retreats",
  "retreating",
  "sunset",
  "sunsets",
  "bearish",
  "pessimistic",
  "downgrade",
  "failure",
  "collapse",
];

/** Keywords that indicate risk events requiring alerts */
const RISK_EVENT_KEYWORDS = [
  { keyword: "hack", type: "security", severity: "critical" as const },
  { keyword: "hacked", type: "security", severity: "critical" as const },
  { keyword: "exploit", type: "security", severity: "critical" as const },
  { keyword: "exploited", type: "security", severity: "critical" as const },
  { keyword: "rug", type: "scam", severity: "critical" as const },
  { keyword: "rugged", type: "scam", severity: "critical" as const },
  { keyword: "sec", type: "regulatory", severity: "warning" as const },
  { keyword: "lawsuit", type: "legal", severity: "warning" as const },
  { keyword: "investigation", type: "legal", severity: "warning" as const },
  { keyword: "ban", type: "regulatory", severity: "warning" as const },
  { keyword: "banned", type: "regulatory", severity: "warning" as const },
  { keyword: "crackdown", type: "regulatory", severity: "warning" as const },
  { keyword: "delisting", type: "exchange", severity: "warning" as const },
  { keyword: "insolvency", type: "financial", severity: "critical" as const },
  { keyword: "bankruptcy", type: "financial", severity: "critical" as const },
];

/** Assets to track in news headlines */
const TRACKED_ASSETS = [
  "BTC",
  "ETH",
  "SOL",
  "HYPE",
  "XRP",
  "ADA",
  "AVAX",
  "LINK",
  "DOT",
  "MATIC",
];

const CORE_NEWS_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;

// ==========================================
// Theme Detection for Human Summaries
// ==========================================

/** News themes for grouping and narrative generation */
type NewsTheme =
  | "regulatory"
  | "security"
  | "price"
  | "institutional"
  | "macro"
  | "defi"
  | "meme"
  | "other";

/** Keywords that indicate each theme */
const THEME_KEYWORDS: Record<NewsTheme, string[]> = {
  regulatory: [
    "sec",
    "cftc",
    "regulation",
    "regulator",
    "lawsuit",
    "legal",
    "ban",
    "banned",
    "crackdown",
    "investigation",
    "compliance",
    "license",
    "licensed",
    "sanction",
    "enforcement",
    "court",
    "ruling",
    "legislation",
    "congress",
    "senate",
    "bill",
  ],
  security: [
    "hack",
    "hacked",
    "exploit",
    "exploited",
    "breach",
    "vulnerability",
    "attack",
    "drained",
    "stolen",
    "theft",
    "security",
    "bug",
    "patch",
    "audit",
    "compromised",
  ],
  price: [
    "rally",
    "surge",
    "pump",
    "dump",
    "crash",
    "ath",
    "all-time",
    "breakout",
    "correction",
    "dip",
    "bounce",
    "resistance",
    "support",
    "100k",
    "50k",
    "200k",
    "price",
    "trading",
    "volume",
    "market cap",
    "gains",
    "losses",
  ],
  institutional: [
    "etf",
    "blackrock",
    "fidelity",
    "grayscale",
    "institutional",
    "hedge fund",
    "bank",
    "jpmorgan",
    "goldman",
    "morgan stanley",
    "custody",
    "adoption",
    "wall street",
    "traditional finance",
    "tradfi",
    "inflow",
    "outflow",
    "approval",
  ],
  macro: [
    "fed",
    "federal reserve",
    "interest rate",
    "inflation",
    "cpi",
    "ppi",
    "gdp",
    "unemployment",
    "treasury",
    "bond",
    "yield",
    "dollar",
    "dxy",
    "economy",
    "recession",
    "tariff",
    "trade war",
    "china",
    "europe",
    "japan",
  ],
  defi: [
    "defi",
    "lending",
    "borrowing",
    "yield",
    "apy",
    "tvl",
    "liquidity",
    "aave",
    "compound",
    "uniswap",
    "curve",
    "pendle",
    "staking",
    "restaking",
    "lsd",
    "liquid staking",
    "bridge",
    "cross-chain",
  ],
  meme: [
    "meme",
    "memecoin",
    "doge",
    "shib",
    "pepe",
    "bonk",
    "wif",
    "trump",
    "ai agent",
    "ai token",
    "degen",
    "ape",
    "fomo",
    "100x",
    "moon",
  ],
  other: [], // Fallback
};

interface ThemedNews {
  theme: NewsTheme;
  articles: NewsItem[];
  topHeadline: string;
}

/** MandoMinutes shared cache keys (plugin-web-search uses both) */
const MANDO_CACHE_KEYS = [
  "mando_minutes:latest:v9", // Used by dailyNewsDigest.ts and cryptoNews.ts
  "mando_minutes:latest", // Used by mandoMinutes.ts
];

/** MandoMinutes URL for direct fetching (must match plugin-web-search) */
const MANDO_MINUTES_URL = "https://www.mandominutes.com/Latest";

// ==========================================
// Types
// ==========================================

export interface NewsItem {
  title: string;
  source: string;
  sentiment: "bullish" | "bearish" | "neutral";
  impact: "high" | "medium" | "low";
  assets: string[];
  timestamp: number;
  category?: string;
  /** Optional link for deep dive (from MandoMinutes article) */
  url?: string;
  /** Optional per-asset sentiment overrides extracted from mixed headlines. */
  perAssetSentiment?: Partial<
    Record<"BTC" | "ETH" | "SOL" | "HYPE", "bullish" | "bearish" | "neutral">
  >;
}

export interface RiskEvent {
  type: string;
  description: string;
  severity: "critical" | "warning" | "info";
  assets: string[];
  timestamp: number;
}

/** MandoMinutes cache format from plugin-web-search */
interface MandoCacheData {
  articles: Array<{
    title: string;
    source?: string;
    url?: string;
    categories?: string[];
    publishedAt?: string;
  }>;
  timestamp: number;
  /** Inferred publish date from page (ISO string) - set when we do direct fetch */
  inferredPublishDate?: string;
}

// ==========================================
// Service Implementation
// ==========================================

export class VinceNewsSentimentService extends Service {
  static serviceType = "VINCE_NEWS_SENTIMENT_SERVICE";
  capabilityDescription =
    "News sentiment and risk event tracking via MandoMinutes";

  private newsCache: NewsItem[] = [];
  private riskEvents: RiskEvent[] = [];
  private priceSnapshots: Array<{
    asset: string;
    changePct: number;
    timestamp: number;
  }> = [];
  private lastUpdate = 0;
  private lastMandoFetch = 0;
  private lastMandoWarnTime = 0;
  private llmHeadlineSentimentCache = new Map<
    string,
    Partial<Record<string, "bullish" | "bearish" | "neutral">>
  >();
  /** Inferred Mando publish date (ISO) - used for freshness gate on daily push */
  private lastInferredMandoDate: string | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  /** 15 min (match plugin-web-search). Daily push runs at 16:00 UTC, after MandoMinutes update (~4:20 PM Paris). */
  private readonly MANDO_CACHE_TTL_MS = 15 * 60 * 1000;
  private readonly MANDO_WARN_COOLDOWN_MS = 5 * 60 * 1000; // 5 min - avoid repetitive MandoMinutes warn spam
  /** Reject tiny/bad payloads so nav junk never overwrites good headline sets. */
  private readonly MANDO_MIN_VALID_HEADLINES = 10;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceNewsSentimentService> {
    const service = new VinceNewsSentimentService(runtime);
    const shouldPrint = isVinceAgent(runtime);
    const skipHeavyInit = isElizaAgent(runtime);

    if (skipHeavyInit) {
      logger.info(
        "[VinceNewsSentiment] Service initialized (Eliza - no startup fetch)",
      );
      return service;
    }

    try {
      await service.repairSharedCacheFromLastKnownGood();
      await service.fetchFromMandoMinutes();
      const stats = service.getDebugStats();
      if (shouldPrint) {
        if (stats.hasData) {
          service.printDetailedDashboard();
        } else {
          startBox();
          logLine("📰 MANDOMINUTES NEWS DASHBOARD");
          logEmpty();
          sep();
          logEmpty();
          logLine("⏳ No cached data - fetching in background...");
          endBox();
        }
      }
      if (!stats.hasData) {
        setTimeout(async () => {
          try {
            logger.info("[VinceNewsSentiment] Background fetch starting...");
            await service.fetchFromMandoMinutes();
            if (shouldPrint) {
              const bgStats = service.getDebugStats();
              if (bgStats.hasData) {
                service.printDetailedDashboard();
              }
            }
          } catch (bgErr) {
            logger.debug(
              `[VinceNewsSentiment] Background fetch failed: ${bgErr}`,
            );
          }
        }, 10000);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      if (shouldPrint) {
        startBox();
        logLine(`⚠️  Initial fetch failed: ${err}`);
        endBox();
      }
    }

    logger.info(
      "[VinceNewsSentiment] Service initialized (MandoMinutes integration)",
    );
    return service;
  }

  /**
   * Print detailed dashboard (same box style as paper trade-opened banner).
   */
  private printDetailedDashboard(): void {
    const stats = this.getDebugStats();
    const sentiment = this.getOverallSentiment();
    const topHeadlines = this.getTopHeadlines(5);
    const riskEvents = this.getActiveRiskEvents();

    startBox();
    logLine("📰 MANDOMINUTES NEWS DASHBOARD");
    logEmpty();
    sep();
    logEmpty();
    const vibeCheck = this.getVibeCheck();
    const vibeEmoji =
      vibeCheck.includes("Risk-off") || vibeCheck.includes("⚠️")
        ? "⚠️"
        : vibeCheck.includes("Risk-on")
          ? "💡"
          : "📋";
    logLine(`${vibeEmoji} ${vibeCheck}`);
    logEmpty();
    const sentEmoji =
      sentiment.sentiment === "bullish"
        ? "🟢"
        : sentiment.sentiment === "bearish"
          ? "🔴"
          : "⚪";
    logLine(
      `${sentEmoji} ${sentiment.sentiment.toUpperCase()} (${Math.round(sentiment.confidence)}% confidence)`,
    );
    logLine(
      `${stats.totalNews} articles (🟢${stats.bullishCount} 🔴${stats.bearishCount} ⚪${stats.neutralCount})`,
    );
    logEmpty();
    sep();
    logEmpty();
    logLine("📋 TOP HEADLINES:");
    for (const news of topHeadlines) {
      const emoji =
        news.sentiment === "bullish"
          ? "🟢"
          : news.sentiment === "bearish"
            ? "🔴"
            : "⚪";
      const impactTag = news.impact === "high" ? "❗" : "";
      const title = news.title ?? "";
      const headline =
        title.length > 55 ? title.substring(0, 52) + "..." : title;
      logLine(`${emoji}${impactTag} ${headline}`);
    }
    if (riskEvents.length > 0) {
      logEmpty();
      sep();
      logEmpty();
      logLine("⚠️  ACTIVE RISK EVENTS:");
      for (const event of riskEvents.slice(0, 3)) {
        const sevEmoji =
          event.severity === "critical"
            ? "🚨"
            : event.severity === "warning"
              ? "⚠️"
              : "⚡";
        const desc =
          (event.description?.length ?? 0) > 52
            ? (event.description ?? "").substring(0, 49) + "..."
            : (event.description ?? "");
        logLine(`${sevEmoji} ${desc}`);
        const assets = event.assets ?? [];
        if (assets.length > 0) {
          logLine(`   Affects: ${assets.slice(0, 5).join(", ")}`);
        }
      }
    }
    logEmpty();
    sep();
    logEmpty();
    const tldr = this.getTLDR();
    const tldrEmoji =
      tldr.includes("RISK") || tldr.includes("BEARISH")
        ? "⚠️"
        : tldr.includes("BULLISH") || tldr.includes("CATALYST")
          ? "💡"
          : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();
  }

  async stop(): Promise<void> {
    logger.info("[VinceNewsSentiment] Service stopped");
  }

  /**
   * Refresh data from MandoMinutes shared cache.
   * @param forceDirectFetch - When true, bypass cache and fetch directly (for freshness check / date extraction). Use for daily push.
   */
  async refreshData(forceDirectFetch = false): Promise<void> {
    const now = Date.now();
    if (!forceDirectFetch && now - this.lastUpdate < this.CACHE_TTL_MS) {
      return;
    }

    // Fetch from MandoMinutes cache (or direct if forceDirectFetch)
    await this.fetchFromMandoMinutes(forceDirectFetch);

    // Clear old entries (older than 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    this.newsCache = this.newsCache.filter((n) => n.timestamp > oneDayAgo);
    this.riskEvents = this.riskEvents.filter((e) => e.timestamp > oneDayAgo);

    this.lastUpdate = now;
  }

  /**
   * Fetch news from the shared MandoMinutes cache
   * This cache is populated by plugin-web-search's MANDO_MINUTES action
   * Falls back to direct browser fetch if cache is empty
   * @param forceDirect - When true, skip cache and always fetch directly (for freshness/date extraction)
   */
  private async fetchFromMandoMinutes(forceDirect = false): Promise<void> {
    try {
      let cached: MandoCacheData | null = null;

      if (!forceDirect) {
        for (const cacheKey of MANDO_CACHE_KEYS) {
          const result = await this.runtime.getCache<MandoCacheData>(cacheKey);
          if (result && result.articles && result.articles.length > 0) {
            if (Date.now() - result.timestamp <= this.MANDO_CACHE_TTL_MS * 2) {
              if (this.isValidMandoPayload(result)) {
                cached = result;
                const ageMinutes = Math.round(
                  (Date.now() - result.timestamp) / 60000,
                );
                logger.info(
                  `[VinceNewsSentiment] Found cache at ${cacheKey} with ${result.articles.length} articles (${ageMinutes}m old)`,
                );
                break;
              }
              logger.warn(
                `[VinceNewsSentiment] Ignoring low-quality Mando cache at ${cacheKey} (${result.articles.length} items)`,
              );
              await this.invalidateMandoCache(cacheKey);
            }
          }
        }
      }

      // If runtime cache is empty/invalid, try shared file cache used across agents.
      if (!forceDirect && (!cached || !cached.articles?.length)) {
        const shared = this.loadSharedMandoCache();
        if (shared && this.isValidMandoPayload(shared)) {
          const ageMinutes = Math.round(
            (Date.now() - shared.timestamp) / 60000,
          );
          logger.info(
            `[VinceNewsSentiment] Using shared Mando cache with ${shared.articles.length} articles (${ageMinutes}m old)`,
          );
          cached = shared;
        } else if (shared) {
          logger.warn(
            `[VinceNewsSentiment] Ignoring low-quality shared Mando cache (${shared.articles?.length ?? 0} items)`,
          );
        }
      }

      // Final safety net: restore last-known-good shared snapshot when current
      // runtime/shared caches are empty or junk.
      if (!forceDirect && (!cached || !cached.articles?.length)) {
        const lastGood = this.loadLastGoodSharedMandoCache();
        if (lastGood && this.isValidMandoPayload(lastGood)) {
          const ageMinutes = Math.round(
            (Date.now() - lastGood.timestamp) / 60000,
          );
          logger.info(
            `[VinceNewsSentiment] Restored last-known-good Mando cache (${lastGood.articles.length} articles, ${ageMinutes}m old)`,
          );
          cached = lastGood;
        }
      }

      // If no cache or force direct, fetch via browser
      if (
        forceDirect ||
        !cached ||
        !cached.articles ||
        cached.articles.length === 0
      ) {
        if (forceDirect) {
          logger.info(
            "[VinceNewsSentiment] Force direct fetch for freshness check",
          );
        }
        logger.debug(
          "[VinceNewsSentiment] MandoMinutes cache empty - attempting direct fetch",
        );
        cached = await this.fetchDirectFromBrowser();

        if (!cached) {
          cached = await this.fetchFromMandoApi();
        }
        if (!cached) {
          return;
        }
        if (!this.isValidMandoPayload(cached)) {
          logger.warn(
            "[VinceNewsSentiment] Direct Mando payload rejected by quality gate",
          );
          return;
        }
      }

      // Don't re-process if we already have this data
      if (cached.timestamp === this.lastMandoFetch) {
        return;
      }

      if (cached.inferredPublishDate) {
        this.lastInferredMandoDate = cached.inferredPublishDate;
      }
      await this.persistLastKnownGoodMandoCache(cached);

      if (isVinceAgent(this.runtime)) {
        startBox();
        logLine(
          `✅ MANDOMINUTES: ${cached.articles.length} HEADLINES FROM CACHE`,
        );
        logEmpty();
        sep();
        logEmpty();
        for (let i = 0; i < cached.articles.length; i++) {
          const title = cached.articles[i].title ?? "";
          const truncated =
            title.length > 55 ? title.substring(0, 52) + "..." : title;
          logLine(`${(i + 1).toString().padStart(2, " ")}. ${truncated}`);
        }
        endBox();
      }
      logger.info(
        `[VinceNewsSentiment] ✅ Processing ${cached.articles.length} articles from MandoMinutes cache`,
      );
      this.lastMandoFetch = cached.timestamp;

      // Convert and analyze each article
      this.priceSnapshots = [];
      for (const article of cached.articles) {
        if (!article.title || article.title.length < 10) continue;

        // Parse price-embedded lines (e.g. "BTC: 75.2k (-4%) | ETH: 2200 (-4%)") for metrics
        const priceSnaps = this.parsePriceSnapshotsFromTitle(
          article.title,
          cached.timestamp,
        );
        if (priceSnaps.length > 0) {
          this.priceSnapshots.push(...priceSnaps);
        }

        // Analyze sentiment (price lines often end up neutral)
        const sentiment = this.analyzeSentiment(article.title);

        // Detect assets mentioned
        const assets = this.detectAssets(article.title);
        let perAssetSentiment: Partial<
          Record<
            "BTC" | "ETH" | "SOL" | "HYPE",
            "bullish" | "bearish" | "neutral"
          >
        > = {};
        let riskAssets = assets;
        if (assets.length > 0) {
          const extracted = this.extractPerAssetSentimentFromHeadline(
            article.title,
            assets,
            sentiment,
          );
          if (extracted.ambiguous && assets.length > 1) {
            const llm = await this.extractPerAssetSentimentWithLLM(
              article.title,
              assets,
            );
            if (llm) {
              perAssetSentiment = llm as Partial<
                Record<
                  "BTC" | "ETH" | "SOL" | "HYPE",
                  "bullish" | "bearish" | "neutral"
                >
              >;
            } else {
              perAssetSentiment = extracted.perAsset as Partial<
                Record<
                  "BTC" | "ETH" | "SOL" | "HYPE",
                  "bullish" | "bearish" | "neutral"
                >
              >;
            }
          } else {
            perAssetSentiment = extracted.perAsset as Partial<
              Record<
                "BTC" | "ETH" | "SOL" | "HYPE",
                "bullish" | "bearish" | "neutral"
              >
            >;
          }
          riskAssets = this.extractPerAssetRiskFromHeadline(
            article.title,
            assets,
          );
        }

        // Determine impact based on keywords and asset mentions
        const impact = this.determineImpact(article.title, assets);

        // Extract source from MandoMinutes format
        const source = this.extractSource(article.source || "MandoMinutes");

        // Determine category
        const category = article.categories?.[0] || "crypto";

        // Add or update in cache so dashboard/API shows ALL headlines (including price lines)
        const existingIdx = this.newsCache.findIndex(
          (n) =>
            this.normalizeForSentiment(n.title) ===
            this.normalizeForSentiment(article.title),
        );
        const item: NewsItem = {
          title: article.title,
          source,
          sentiment,
          impact,
          assets,
          category,
          timestamp: cached.timestamp,
          ...(Object.keys(perAssetSentiment).length > 0 && {
            perAssetSentiment,
          }),
          ...(article.url && { url: article.url }),
        };
        if (existingIdx >= 0) {
          this.newsCache[existingIdx] = item;
        } else {
          this.newsCache.push(item);
        }

        // Check for risk events
        this.detectRiskEvents(article.title, riskAssets, cached.timestamp);
      }

      // Keep only last 150 items (MandoMinutes has 30-50 per day)
      if (this.newsCache.length > 150) {
        this.newsCache = this.newsCache.slice(-150);
      }

      const sentimentCounts = {
        bullish: this.newsCache.filter((n) => n.sentiment === "bullish").length,
        bearish: this.newsCache.filter((n) => n.sentiment === "bearish").length,
        neutral: this.newsCache.filter((n) => n.sentiment === "neutral").length,
      };
      logger.info(
        `[VinceNewsSentiment] Processed: ${sentimentCounts.bullish} bullish, ${sentimentCounts.bearish} bearish, ${sentimentCounts.neutral} neutral`,
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.debug(
        `[VinceNewsSentiment] Failed to fetch from MandoMinutes: ${errMsg}`,
      );
    }
  }

  /**
   * Non-browser fallback: use Mando's own API endpoint used by their Latest page.
   * This avoids agent-browser dependency when navigation fails.
   */
  private async fetchFromMandoApi(): Promise<MandoCacheData | null> {
    try {
      const urls = [
        "https://www.mandominutes.com/api/getRecentPost?language=English",
        "https://www.mandominutes.com/api/getRecentPost",
      ];
      let payload: any = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
          if (!res.ok) continue;
          payload = await res.json();
          if (payload) break;
        } catch {
          // try next url
        }
      }
      if (!payload) return null;

      const richText =
        payload?.content?.free?.web ??
        payload?.content?.free?.rss ??
        payload?.preview_text ??
        "";
      if (!richText || typeof richText !== "string") return null;

      const cleaned = this.normalizeMandoApiContent(richText);
      const inferredDate = this.extractMandoPublishDate(cleaned);
      const articles = this.parseMandoMinutesContent(cleaned);
      if (!articles.length) return null;

      const cacheData: MandoCacheData = {
        articles,
        timestamp: Date.now(),
        ...(inferredDate && { inferredPublishDate: inferredDate }),
      };
      if (!this.isValidMandoPayload(cacheData)) return null;

      await this.runtime.setCache(MANDO_CACHE_KEYS[0], cacheData);
      const sharedPath = this.getSharedMandoCachePath();
      try {
        const dir = path.dirname(sharedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          sharedPath,
          JSON.stringify(cacheData, null, 2),
          "utf-8",
        );
        await this.persistLastKnownGoodMandoCache(cacheData);
      } catch (err) {
        logger.debug(
          `[VinceNewsSentiment] Mando API shared cache write failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      logger.info(
        `[VinceNewsSentiment] ✅ Mando API fallback SUCCESS: ${articles.length} headlines loaded`,
      );
      return cacheData;
    } catch (error) {
      logger.debug(
        `[VinceNewsSentiment] Mando API fallback failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Direct fetch from MandoMinutes using native Puppeteer browser
   * via the agent-browser CLI. This is required because the Latest page
   * is rendered client-side; plain HTTP fetch will not contain headlines.
   */
  private async fetchDirectFromBrowser(): Promise<MandoCacheData | null> {
    const browser = new PuppeteerBrowserService();

    try {
      logger.info(
        "[VinceNewsSentiment] Fetching MandoMinutes via Puppeteer...",
      );

      const navResult = await browser.navigate(MANDO_MINUTES_URL, undefined, {
        retries: 2,
        retryDelay: 3000,
        timeout: 45000,
      });

      if (!navResult.success) {
        const errMsg = navResult.error?.split("\n")[0] || "Unknown error";
        const now = Date.now();

        // Make it very clear when agent-browser is missing/misconfigured.
        if (
          /agent-browser/i.test(errMsg) ||
          /command not found/i.test(errMsg) ||
          /ENOENT/i.test(errMsg) ||
          /not recognized as an internal or external command/i.test(errMsg)
        ) {
          if (now - this.lastMandoWarnTime >= this.MANDO_WARN_COOLDOWN_MS) {
            this.lastMandoWarnTime = now;
            logger.warn(
              `[VinceNewsSentiment] MandoMinutes fetch failed: agent-browser CLI not available (${errMsg}). Install and add "agent-browser" to PATH to restore automatic headlines.`,
            );
          } else {
            logger.debug(
              `[VinceNewsSentiment] MandoMinutes fetch failed: agent-browser CLI not available (${errMsg}).`,
            );
          }
        } else if (
          now - this.lastMandoWarnTime >=
          this.MANDO_WARN_COOLDOWN_MS
        ) {
          this.lastMandoWarnTime = now;
          logger.warn(
            `[VinceNewsSentiment] MandoMinutes fetch failed: ${errMsg}`,
          );
        } else {
          logger.debug(
            `[VinceNewsSentiment] MandoMinutes fetch failed: ${errMsg}`,
          );
        }
        return null;
      }

      const pageContent = await browser.getPageContent();

      if (!pageContent || pageContent.length < 200) {
        const now = Date.now();
        if (now - this.lastMandoWarnTime >= this.MANDO_WARN_COOLDOWN_MS) {
          this.lastMandoWarnTime = now;
          logger.warn(
            `[VinceNewsSentiment] MandoMinutes content too short (${pageContent?.length || 0} chars)`,
          );
        } else {
          logger.debug(
            `[VinceNewsSentiment] MandoMinutes content too short (${pageContent?.length || 0} chars)`,
          );
        }
        return null;
      }

      logger.debug(
        `[VinceNewsSentiment] Got MandoMinutes content: ${pageContent.length} chars`,
      );

      const inferredDate = this.extractMandoPublishDate(pageContent);
      if (inferredDate) {
        this.lastInferredMandoDate = inferredDate;
        logger.info(
          `[VinceNewsSentiment] Inferred Mando publish date: ${inferredDate}`,
        );
      } else {
        logger.debug(
          "[VinceNewsSentiment] Could not infer Mando publish date from page",
        );
      }

      // Parse the content to extract headlines
      const articles = this.parseMandoMinutesContent(pageContent);

      if (articles.length === 0) {
        const now = Date.now();
        if (now - this.lastMandoWarnTime >= this.MANDO_WARN_COOLDOWN_MS) {
          this.lastMandoWarnTime = now;
          logger.warn(
            "[VinceNewsSentiment] No articles parsed from MandoMinutes",
          );
        } else {
          logger.debug(
            "[VinceNewsSentiment] No articles parsed from MandoMinutes",
          );
        }
        return null;
      }

      logger.info(
        `[VinceNewsSentiment] ✅ MandoMinutes SUCCESS: ${articles.length} headlines loaded`,
      );

      // Cache the result for other services
      const cacheData: MandoCacheData = {
        articles,
        timestamp: Date.now(),
        ...(inferredDate && { inferredPublishDate: inferredDate }),
      };

      if (!this.isValidMandoPayload(cacheData)) {
        logger.warn(
          `[VinceNewsSentiment] Parsed payload failed quality gate (${cacheData.articles.length} items)`,
        );
        return null;
      }

      await this.runtime.setCache(MANDO_CACHE_KEYS[0], cacheData);

      const sharedPath = this.getSharedMandoCachePath();
      try {
        const dir = path.dirname(sharedPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(
          sharedPath,
          JSON.stringify(cacheData, null, 2),
          "utf-8",
        );
        await this.persistLastKnownGoodMandoCache(cacheData);
      } catch (err) {
        logger.debug(
          `[VinceNewsSentiment] Shared cache write failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      return cacheData;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const now = Date.now();
      if (now - this.lastMandoWarnTime >= this.MANDO_WARN_COOLDOWN_MS) {
        this.lastMandoWarnTime = now;
        logger.warn(`[VinceNewsSentiment] MandoMinutes fetch error: ${errMsg}`);
      } else {
        logger.debug(
          `[VinceNewsSentiment] MandoMinutes fetch error: ${errMsg}`,
        );
      }
      return null;
    } finally {
      // Always close browser to free resources
      await browser.close();
    }
  }

  /**
   * Extract publish date from MandoMinutes page content.
   * Tries common patterns: "Feb 5", "February 5, 2025", "2025-02-05", "5 Feb 2025".
   * Returns ISO date string (YYYY-MM-DD) or null if not found.
   * Used for freshness gate: daily push only when Mando has updated.
   */
  private extractMandoPublishDate(content: string): string | null {
    if (!content || content.length < 50) return null;
    const fullText = content;

    const patterns: Array<{
      regex: RegExp;
      parse: (m: RegExpExecArray) => string | null;
    }> = [
      // ISO: 2025-02-05
      {
        regex: /\b(20\d{2})-(\d{2})-(\d{2})\b/,
        parse: (m) => `${m[1]}-${m[2]}-${m[3]}`,
      },
      // Feb 5, 2025 or February 5, 2025 (month name + day + year)
      {
        regex:
          /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i,
        parse: (m) => {
          const mon: Record<string, string> = {
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            may: "05",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12",
          };
          const month = mon[m[1].toLowerCase().slice(0, 3)];
          const day = m[2].padStart(2, "0");
          return month ? `${m[3]}-${month}-${day}` : null;
        },
      },
      // 5 Feb 2025 or 5 February 2025 (day + month + year)
      {
        regex:
          /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(20\d{2})\b/i,
        parse: (m) => {
          const mon: Record<string, string> = {
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            may: "05",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12",
          };
          const month = mon[m[2].toLowerCase().slice(0, 3)];
          const day = m[1].padStart(2, "0");
          return month ? `${m[3]}-${month}-${day}` : null;
        },
      },
      // Feb 5 or February 5 (no year - assume current year)
      {
        regex:
          /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})\b(?!\s*,\s*20\d{2})/i,
        parse: (m) => {
          const mon: Record<string, string> = {
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            may: "05",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12",
          };
          const month = mon[m[1].toLowerCase().slice(0, 3)];
          const day = m[2].padStart(2, "0");
          const year = new Date().getFullYear().toString();
          return month ? `${year}-${month}-${day}` : null;
        },
      },
    ];

    for (const { regex, parse } of patterns) {
      const m = regex.exec(fullText);
      if (m) {
        const iso = parse(m);
        if (iso) return iso;
      }
    }
    return null;
  }

  /**
   * Parse MandoMinutes content - handles plain text format from document.body.innerText
   * MandoMinutes typically has 30-50 articles per day across categories
   */
  private parseMandoMinutesContent(
    content: string,
  ): Array<{ title: string; source?: string; categories?: string[] }> {
    const articles: Array<{
      title: string;
      source?: string;
      categories?: string[];
    }> = [];
    const seen = new Set<string>();
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let currentCategory: "crypto" | "macro" | "leftcurve" = "crypto";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect category headers (standalone section names in plain text)
      if (/^Crypto$/i.test(line) || /^Crypto\s*News$/i.test(line)) {
        currentCategory = "crypto";
        continue;
      }
      if (
        /^Macro\s*(&|and)?\s*General$/i.test(line) ||
        /^Macro$/i.test(line) ||
        /^General$/i.test(line)
      ) {
        currentCategory = "macro";
        continue;
      }
      if (/^Left\s*Curve/i.test(line) || /^Degen/i.test(line)) {
        currentCategory = "leftcurve";
        continue;
      }

      // Skip non-content lines
      if (this.isSkippableLine(line)) continue;

      // Detect headlines (bullets or substantive lines)
      const headline = this.extractHeadline(line);
      if (headline) {
        // Look ahead for source
        const source = this.lookAheadForSource(lines, i);
        this.addParsedArticle(
          articles,
          seen,
          headline,
          source,
          currentCategory,
        );
      }
    }

    logger.info(
      `[VinceNewsSentiment] Parsed ${articles.length} articles (crypto: ${articles.filter((a) => a.categories?.[0] === "crypto").length}, macro: ${articles.filter((a) => a.categories?.[0] === "macro").length}, leftcurve: ${articles.filter((a) => a.categories?.[0] === "leftcurve").length})`,
    );

    return articles;
  }

  /**
   * Convert API-provided rich text/HTML into parser-friendly plain text while
   * preserving line boundaries between logical blocks.
   */
  private normalizeMandoApiContent(content: string): string {
    return content
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<(p|div|li|h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Parse price-embedded headlines (e.g. "BTC: 75.2k (-4%) | ETH: 2200 (-4%)")
   * Returns array of { asset, changePct } for trading sentiment.
   */
  private parsePriceSnapshotsFromTitle(
    title: string,
    timestamp: number,
  ): Array<{ asset: string; changePct: number; timestamp: number }> {
    const results: Array<{
      asset: string;
      changePct: number;
      timestamp: number;
    }> = [];
    const regex = /([A-Z]{2,5}):\s*\$?[\d,.]+[kmb]?\s*\(([+-]?\d+\.?\d*)%?\)/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(title)) !== null) {
      const asset = m[1].toUpperCase();
      const changePct = parseFloat(m[2]);
      if (!Number.isNaN(changePct) && TRACKED_ASSETS.includes(asset)) {
        results.push({ asset, changePct, timestamp });
      }
    }
    return results;
  }

  /**
   * True if the line is a price-snapshot line (e.g. "BTC: 66.8k (-1%)") or "Cryptocurrency Prices" block.
   * Such lines are not stored as headlines so ECHO and others never see stale prices.
   */
  private isPriceSnapshotLine(line: string): boolean {
    if (!line || typeof line !== "string") return false;
    const t = line.trim();
    if (/Cryptocurrency\s+Prices|^Prices:\s*/i.test(t)) return true;
    return /\b(BTC|ETH|SOL|BNB|BTC\.D):\s*\$?[\d,.]+[kmb]?\s*(\([+-]?\d+\.?\d*%?\))?/i.test(
      t,
    );
  }

  private normalizeMandoTitle(title: string): string {
    return title.toLowerCase().replace(/\s+/g, " ").trim();
  }

  private isLikelyMandoNavJunk(title: string): boolean {
    const normalized = this.normalizeMandoTitle(title);
    return (
      normalized.includes("minutesaffiliate") ||
      normalized.includes("podcastsfollow") ||
      normalized.includes("affiliatepodcasts")
    );
  }

  private isLikelyMandoStyleNoise(title: string): boolean {
    const t = title.trim();
    if (!t) return false;
    if (/[{}]/.test(t)) return true;
    if (/^[@.#]/.test(t)) return true;
    if (/^--[a-z0-9-]+/i.test(t)) return true;
    if (/:\s*#[0-9a-f]{3,8}\b/i.test(t)) return true;
    if (/var\(--|!important|@font-face|unicode-range/i.test(t)) return true;
    if (
      /(font-family|background-color|border-color|line-height|padding|margin|display|width|height|src:\s*url\(|woff2?|rgba?\()/i.test(
        t,
      )
    )
      return true;
    // CSS declaration-like lines
    if (/^[a-z-]+\s*:\s*[^;]+;?$/i.test(t) && t.length < 140) return true;
    return false;
  }

  private isSyntheticTestHeadline(title: string): boolean {
    const t = title.trim();
    return (
      /^runtime headline\s+\d+\b/i.test(t) ||
      /^shared headline\s+\d+\b/i.test(t) ||
      /^recovered headline\s+\d+\b/i.test(t)
    );
  }

  private isValidMandoPayload(
    payload: MandoCacheData | null | undefined,
  ): boolean {
    if (
      !payload ||
      !Array.isArray(payload.articles) ||
      payload.articles.length === 0
    )
      return false;

    const titles = payload.articles
      .map((a) => (a?.title ?? "").trim())
      .filter((t) => t.length > 0);
    if (titles.length === 0) return false;
    if (titles.some((t) => this.isSyntheticTestHeadline(t))) return false;

    const junkCount = titles.filter((t) => this.isLikelyMandoNavJunk(t)).length;
    const styleNoiseCount = titles.filter((t) =>
      this.isLikelyMandoStyleNoise(t),
    ).length;
    const substantive = titles.filter(
      (t) =>
        t.length >= 20 &&
        !this.isLikelyMandoNavJunk(t) &&
        !this.isLikelyMandoStyleNoise(t),
    );
    const uniqueSubstantive = new Set(
      substantive.map((t) => this.normalizeMandoTitle(t)),
    ).size;

    if (junkCount > 0 && uniqueSubstantive === 0) return false;
    if (
      styleNoiseCount > 0 &&
      styleNoiseCount >= Math.max(3, Math.floor(titles.length * 0.25))
    )
      return false;
    if (uniqueSubstantive >= this.MANDO_MIN_VALID_HEADLINES) return true;
    // Allow occasional shorter editions when content quality is otherwise clean.
    if (uniqueSubstantive >= 5 && junkCount === 0) return true;
    return false;
  }

  private async invalidateMandoCache(cacheKey: string): Promise<void> {
    try {
      await this.runtime.setCache(cacheKey, {
        articles: [],
        timestamp: Date.now(),
      } as MandoCacheData);
    } catch (err) {
      logger.debug(
        `[VinceNewsSentiment] Failed to invalidate cache ${cacheKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private getSharedMandoCachePath(): string {
    return (
      process.env.MANDO_SHARED_CACHE_PATH ||
      path.join(
        process.cwd(),
        ".elizadb",
        "shared",
        "mando_minutes_latest_v9.json",
      )
    );
  }

  private getLastGoodSharedMandoCachePath(): string {
    const sharedPath = this.getSharedMandoCachePath();
    if (sharedPath.toLowerCase().endsWith(".json")) {
      return sharedPath.replace(/\.json$/i, "_last_good.json");
    }
    return `${sharedPath}_last_good.json`;
  }

  private loadSharedMandoCache(): MandoCacheData | null {
    const sharedPath = this.getSharedMandoCachePath();
    try {
      if (!fs.existsSync(sharedPath)) return null;
      const raw = fs.readFileSync(sharedPath, "utf-8");
      if (!raw?.trim()) return null;
      return JSON.parse(raw) as MandoCacheData;
    } catch (err) {
      logger.debug(
        `[VinceNewsSentiment] Shared cache read failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private loadLastGoodSharedMandoCache(): MandoCacheData | null {
    const sharedPath = this.getLastGoodSharedMandoCachePath();
    try {
      if (!fs.existsSync(sharedPath)) return null;
      const raw = fs.readFileSync(sharedPath, "utf-8");
      if (!raw?.trim()) return null;
      return JSON.parse(raw) as MandoCacheData;
    } catch (err) {
      logger.debug(
        `[VinceNewsSentiment] Last-good cache read failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async persistLastKnownGoodMandoCache(
    payload: MandoCacheData | null | undefined,
  ): Promise<void> {
    if (!payload || !this.isValidMandoPayload(payload)) return;
    const sharedPath = this.getLastGoodSharedMandoCachePath();
    try {
      const dir = path.dirname(sharedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(sharedPath, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      logger.debug(
        `[VinceNewsSentiment] Last-good cache write failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async repairSharedCacheFromLastKnownGood(): Promise<void> {
    const shared = this.loadSharedMandoCache();
    if (shared && this.isValidMandoPayload(shared)) return;

    const lastGood = this.loadLastGoodSharedMandoCache();
    if (!lastGood || !this.isValidMandoPayload(lastGood)) return;

    const sharedPath = this.getSharedMandoCachePath();
    try {
      const dir = path.dirname(sharedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(sharedPath, JSON.stringify(lastGood, null, 2), "utf-8");
      await this.runtime.setCache(MANDO_CACHE_KEYS[0], lastGood);
      logger.info(
        `[VinceNewsSentiment] Repaired shared Mando cache from last-known-good (${lastGood.articles.length} articles)`,
      );
    } catch (err) {
      logger.debug(
        `[VinceNewsSentiment] Shared cache repair failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Add a parsed article with deduplication
   */
  private addParsedArticle(
    articles: Array<{ title: string; source?: string; categories?: string[] }>,
    seen: Set<string>,
    headline: string,
    source: string,
    category: "crypto" | "macro" | "leftcurve",
  ): void {
    if (this.isPriceSnapshotLine(headline)) return;
    const normalized = headline.toLowerCase().trim();

    // Reject nav/footer junk that may slip through (e.g. "MinutesAffiliatePodcastsFollow on")
    if (
      normalized.includes("minutesaffiliate") ||
      normalized.includes("podcastsfollow") ||
      this.isLikelyMandoStyleNoise(headline)
    )
      return;

    const isAcceptableLength =
      (normalized.length >= 15 && normalized.length <= 300) ||
      this.isHighValueShortMandoLine(headline);
    if (
      isAcceptableLength &&
      !seen.has(normalized) &&
      !normalized.includes("cookie") &&
      !normalized.includes("subscribe")
    ) {
      seen.add(normalized);
      articles.push({
        title: headline.trim(),
        source: source || "MandoMinutes",
        categories: [category],
      });
    }
  }

  /**
   * Check if a line should be skipped (navigation, footer, etc.)
   */
  private isSkippableLine(line: string): boolean {
    if (this.isLikelyMandoStyleNoise(line)) return true;
    const skipPatterns = [
      /^Subscribe/i,
      /^Follow/i,
      /^Cookie/i,
      /^Disclaimer/i,
      /^Terms$/i,
      /^Privacy$/i,
      /^Loading/i,
      /^Mando\s*Minutes$/i,
      /^@\w+$/,
      /^https?:\/\//,
      /^All Minutes$/i,
      /^Site Logo$/i,
      /^Comic by/i,
      /^newsletter/i,
      /^MandoMinutes$/i,
      /^\d+\s*(min|sec|hour|day)s?\s*(ago|read)?$/i,
      // Site nav concatenated in plain text (e.g. "MinutesAffiliatePodcastsFollow on")
      /MinutesAffiliate|PodcastsFollow\s*on/i,
    ];
    return skipPatterns.some((p) => p.test(line)) || line.length < 10;
  }

  /**
   * Extract headline from a line (removes bullets, validates)
   */
  private extractHeadline(line: string): string | null {
    // Remove bullet points and leading punctuation
    let clean = line.replace(/^[•\-\*▸►]\s*/, "").trim();

    // Skip if too short, unless it's a known compact market headline.
    if (clean.length < 20 && !this.isHighValueShortMandoLine(clean))
      return null;

    // Skip if it looks like a source name (short, known sources)
    const knownSources =
      /^(The Block|CoinDesk|Reuters|Bloomberg|Decrypt|DL News|WSJ|CNBC|Cointelegraph|BeInCrypto|Blockworks|Unchained|The Defiant|CryptoSlate|NewsBTC|Bitcoinist|U\.Today|AMBCrypto|Benzinga|MarketWatch|Yahoo Finance|Forbes|Fortune|TechCrunch|Wired|Ars Technica)$/i;
    if (knownSources.test(clean)) return null;

    // Skip price-only items like "BTC: 90k" or "ETH: $3,400 (+5%)"
    if (
      /^[A-Z]{2,5}:\s*\$?[\d,]+[kmb]?\s*(\([+-]?\d+\.?\d*%?\))?$/i.test(clean)
    )
      return null;

    // Skip navigation/UI elements
    if (
      /^(Home|About|Contact|Login|Sign up|Register|Menu|Search)$/i.test(clean)
    )
      return null;

    return clean;
  }

  /**
   * Some valid Mando headlines are compact (e.g. "Hot coins: SKR").
   * Allow a narrow set of short, high-signal patterns without opening junk.
   */
  private isHighValueShortMandoLine(line: string): boolean {
    const t = line.trim();
    if (t.length < 10) return false;
    return (
      /^Hot coins:\s*\S+/i.test(t) ||
      /^Hot NFTs:\s*\S+/i.test(t) ||
      /^Top Gainers:\s*\S+/i.test(t) ||
      /^BTC ETFs?:/i.test(t) ||
      /^ETH ETFs?:/i.test(t)
    );
  }

  /**
   * Look ahead in lines array to find source name
   */
  private lookAheadForSource(lines: string[], currentIndex: number): string {
    // Known news source names
    const sourcePatterns =
      /^(The Block|CoinDesk|Reuters|Bloomberg|Decrypt|DL News|WSJ|CNBC|Cointelegraph|BeInCrypto|Blockworks|Unchained|The Defiant|CryptoSlate|NewsBTC|Bitcoinist|U\.Today|AMBCrypto|Benzinga|MarketWatch|Yahoo Finance|Forbes|Fortune|TechCrunch|Wired|Ars Technica)$/i;

    // Check next 1-3 lines for source name
    for (
      let j = currentIndex + 1;
      j <= currentIndex + 3 && j < lines.length;
      j++
    ) {
      const nextLine = lines[j].trim();
      // Stop if we hit another headline (has bullet) or category header
      if (/^[•\-\*▸►]/.test(nextLine)) break;
      if (/^(Crypto|Macro|Left Curve|General|Degen)/i.test(nextLine)) break;

      if (sourcePatterns.test(nextLine)) {
        return nextLine;
      }
    }
    return "MandoMinutes";
  }

  /**
   * Phrases that mean "gains are being lost" — treat as bearish even though "gains" is a bullish word
   */
  private static readonly NEGATIVE_GAINS_PHRASES = [
    "erases gains",
    "erases gain",
    "gains erased",
    "gain erased",
    "erase gains",
    "erase gain",
    "erasing gains",
    "give up gains",
    "gave up gains",
    "giving up gains",
    "gives up gains",
    "wiped gains",
    "wiping out gains",
    "gains wiped",
    "wipes out gains",
    "reverses gains",
    "reversing gains",
    "reversed gains",
    "lose gains",
    "losing gains",
    "lost gains",
    "loses gains",
    "continues to slide",
    "continues to fall",
    "touches $",
    "etf outflow",
    "etf outflows",
    "withdrawals",
    "probing",
    "probes",
    "sanctions evasion",
    "sanctions probe",
  ];

  /** Category weights per asset for trading algo (macro vs crypto vs leftcurve) */
  private static readonly CATEGORY_WEIGHTS: Record<
    string,
    Record<string, number>
  > = {
    BTC: { crypto: 1.0, macro: 1.5, leftcurve: 0.7 },
    ETH: { crypto: 1.0, macro: 1.2, leftcurve: 0.8 },
    SOL: { crypto: 1.0, macro: 0.9, leftcurve: 1.3 },
    HYPE: { crypto: 1.0, macro: 0.8, leftcurve: 1.2 },
  };

  /**
   * Normalize text for sentiment matching: unicode (apostrophes, spaces), trim.
   * Handles MandoMinutes encoding quirks (e.g. "Trump's" vs "Trump\u2019s").
   */
  private normalizeForSentiment(text: string): string {
    return text
      .normalize("NFKC")
      .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'") // fancy apostrophes → ASCII
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /**
   * Analyze sentiment of a headline using keyword matching
   */
  private analyzeSentiment(text: string): "bullish" | "bearish" | "neutral" {
    const lower = this.normalizeForSentiment(text);
    let bullishScore = 0;
    let bearishScore = 0;

    // Explicit ETF flow lines like "BTC ETFs: -$206m | ETH ETFs: -$50m"
    // should be classified by signed net flow, even when "outflow" word is absent.
    const etfFlowSignal = this.getEtfFlowSentiment(lower);
    if (etfFlowSignal) return etfFlowSignal;

    // Override: "erases gains", "gains wiped" etc. are bearish (gains being lost).
    // Return immediately — these phrases trump bullish keywords like "gains" or "win".
    for (const phrase of VinceNewsSentimentService.NEGATIVE_GAINS_PHRASES) {
      if (lower.includes(phrase)) {
        return "bearish";
      }
    }

    for (const keyword of BULLISH_KEYWORDS) {
      if (lower.includes(keyword)) {
        bullishScore++;
      }
    }

    for (const keyword of BEARISH_KEYWORDS) {
      if (lower.includes(keyword)) {
        bearishScore++;
      }
    }

    // Need a clear signal to classify
    if (bullishScore > bearishScore && bullishScore >= 1) {
      return "bullish";
    }
    if (bearishScore > bullishScore && bearishScore >= 1) {
      return "bearish";
    }

    return "neutral";
  }

  /**
   * Parse signed ETF flow headlines and infer direction from net sign.
   * Returns null when not an ETF flow line or when no signed values are found.
   */
  private getEtfFlowSentiment(
    normalizedText: string,
  ): "bullish" | "bearish" | null {
    const byAsset = this.extractEtfFlowByAsset(normalizedText);
    const vals = Object.values(byAsset);
    if (!vals.length) return null;
    const bull = vals.filter((v) => v === "bullish").length;
    const bear = vals.filter((v) => v === "bearish").length;
    if (bear > bull) return "bearish";
    if (bull > bear) return "bullish";
    return null;
  }

  private extractEtfFlowByAsset(
    normalizedText: string,
  ): Partial<Record<string, "bullish" | "bearish">> {
    const out: Partial<Record<string, "bullish" | "bearish">> = {};
    const line = normalizedText.normalize("NFKC");
    const patterns: Array<{ re: RegExp; asset: string }> = [
      {
        re: /\b(btc|bitcoin)\s*etfs?:\s*([+\-−–—])\s*\$?\s*(\d[\d.,]*)\s*([kmbt]?)/i,
        asset: "BTC",
      },
      {
        re: /\b(eth|ethereum)\s*etfs?:\s*([+\-−–—])\s*\$?\s*(\d[\d.,]*)\s*([kmbt]?)/i,
        asset: "ETH",
      },
    ];
    for (const p of patterns) {
      const m = line.match(p.re);
      if (!m) continue;
      const sign =
        m[2] === "-" || m[2] === "−" || m[2] === "–" || m[2] === "—" ? -1 : 1;
      const raw = (m[3] || "").replace(/,/g, "");
      const n = Number.parseFloat(raw);
      if (Number.isNaN(n)) continue;
      const suffix = (m[4] || "").toLowerCase();
      const mult =
        suffix === "k"
          ? 1e3
          : suffix === "m"
            ? 1e6
            : suffix === "b"
              ? 1e9
              : suffix === "t"
                ? 1e12
                : 1;
      const signed = sign * n * mult;
      if (signed < 0) out[p.asset] = "bearish";
      else if (signed > 0) out[p.asset] = "bullish";
    }
    return out;
  }

  private normalizeHeadlineKey(text: string): string {
    return this.normalizeForSentiment(text);
  }

  private splitHeadlineClauses(text: string): string[] {
    return text
      .split(/\s+(?:while|but|whereas|however|vs\.?|versus|as)\s+|[;|]/i)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  private extractPerAssetSentimentFromHeadline(
    text: string,
    detectedAssets: string[],
    fallbackSentiment: "bullish" | "bearish" | "neutral",
  ): {
    perAsset: Partial<Record<string, "bullish" | "bearish" | "neutral">>;
    confidence: number;
    ambiguous: boolean;
  } {
    const perAsset: Partial<Record<string, "bullish" | "bearish" | "neutral">> =
      {};
    if (!detectedAssets.length) {
      return { perAsset, confidence: 0, ambiguous: false };
    }

    const normalized = this.normalizeForSentiment(text);
    const etfByAsset = this.extractEtfFlowByAsset(normalized);
    for (const [asset, s] of Object.entries(etfByAsset)) perAsset[asset] = s;

    const clauses = this.splitHeadlineClauses(text);
    for (const clause of clauses) {
      const clauseAssets = this.detectAssets(clause);
      if (!clauseAssets.length) continue;
      const clauseSent = this.analyzeSentiment(clause);
      if (clauseSent === "neutral") continue;
      for (const a of clauseAssets) {
        if (detectedAssets.includes(a)) perAsset[a] = clauseSent;
      }
    }

    // Ensure every detected asset has at least fallback sentiment.
    for (const a of detectedAssets) {
      if (!perAsset[a]) perAsset[a] = fallbackSentiment;
    }

    const unique = new Set(Object.values(perAsset));
    const ambiguous =
      detectedAssets.length > 1 &&
      unique.size === 1 &&
      /\b(while|but|whereas|however|versus|vs)\b/i.test(text);
    const confidence = ambiguous ? 45 : detectedAssets.length > 1 ? 65 : 75;
    return { perAsset, confidence, ambiguous };
  }

  private extractPerAssetRiskFromHeadline(
    text: string,
    detectedAssets: string[],
  ): string[] {
    if (!detectedAssets.length) return [];
    const lower = this.normalizeForSentiment(text);
    const hasRiskKeyword = RISK_EVENT_KEYWORDS.some((r) =>
      lower.includes(r.keyword),
    );
    if (!hasRiskKeyword) return [];
    if (detectedAssets.length === 1) return detectedAssets;

    const narrowed = detectedAssets.filter((asset) => {
      const names =
        asset === "BTC"
          ? /(btc|bitcoin)/
          : asset === "ETH"
            ? /(eth|ethereum)/
            : asset === "SOL"
              ? /(sol|solana)/
              : asset === "HYPE"
                ? /(hype|hyperliquid)/
                : new RegExp(`\\b${asset.toLowerCase()}\\b`);
      return new RegExp(
        `${names.source}.{0,36}(hack|exploit|lawsuit|probe|investigation|ban|crackdown)`,
        "i",
      ).test(lower);
    });
    return narrowed.length ? narrowed : detectedAssets;
  }

  private async extractPerAssetSentimentWithLLM(
    headline: string,
    detectedAssets: string[],
  ): Promise<Partial<
    Record<string, "bullish" | "bearish" | "neutral">
  > | null> {
    const key = this.normalizeHeadlineKey(headline);
    const cached = this.llmHeadlineSentimentCache.get(key);
    if (cached) return cached;
    if (!this.runtime?.useModel || detectedAssets.length < 2) return null;

    try {
      const prompt = [
        "Extract per-asset sentiment from this crypto headline.",
        `Headline: ${headline}`,
        `Assets: ${detectedAssets.join(", ")}`,
        "Return ONLY compact JSON object with keys as asset tickers and values as bullish|bearish|neutral.",
        'Example: {"BTC":"bearish","ETH":"bullish"}',
      ].join("\n");
      const response = await this.runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const raw =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? "");
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]) as Record<string, string>;
      const out: Partial<Record<string, "bullish" | "bearish" | "neutral">> =
        {};
      for (const asset of detectedAssets) {
        const v = parsed[asset];
        if (v === "bullish" || v === "bearish" || v === "neutral")
          out[asset] = v;
      }
      if (!Object.keys(out).length) return null;
      this.llmHeadlineSentimentCache.set(key, out);
      return out;
    } catch (err) {
      logger.debug(
        `[VinceNewsSentiment] Per-asset LLM parse skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Public API for testing and callers: get sentiment for a single headline.
   * Uses the same keyword + NEGATIVE_GAINS_PHRASES logic as analyzeSentiment.
   */
  getSentimentForHeadline(text: string): "bullish" | "bearish" | "neutral" {
    return this.analyzeSentiment(text);
  }

  /**
   * Detect which assets are mentioned in a headline
   */
  private detectAssets(text: string): string[] {
    const upper = text.toUpperCase();
    const assets: string[] = [];

    for (const asset of TRACKED_ASSETS) {
      // Check for exact match (with word boundaries)
      const regex = new RegExp(`\\b${asset}\\b`, "i");
      if (regex.test(upper)) {
        assets.push(asset);
      }
    }

    // Also check common names
    if (/\b(bitcoin|btc)\b/i.test(text)) assets.push("BTC");
    if (/\b(ethereum|eth)\b/i.test(text)) assets.push("ETH");
    if (/\b(solana|sol)\b/i.test(text)) assets.push("SOL");
    if (/\b(hyperliquid|hype|hl)\b/i.test(text)) assets.push("HYPE");

    // Deduplicate
    return [...new Set(assets)];
  }

  /**
   * Determine the impact level of a news item
   */
  private determineImpact(
    text: string,
    assets: string[],
  ): "high" | "medium" | "low" {
    const lower = text.toLowerCase();

    // High impact: Major events, hacks, regulatory, or affects BTC/ETH
    const highImpactKeywords = [
      "hack",
      "exploit",
      "sec",
      "etf",
      "approval",
      "ban",
      "crash",
      "bankruptcy",
      "billion",
      "record",
      "ath",
      "all-time",
    ];

    for (const keyword of highImpactKeywords) {
      if (lower.includes(keyword)) {
        return "high";
      }
    }

    // High impact if it mentions BTC or ETH
    if (assets.includes("BTC") || assets.includes("ETH")) {
      return "medium";
    }

    // Medium impact for other tracked assets
    if (assets.length > 0) {
      return "medium";
    }

    return "low";
  }

  /**
   * Extract clean source name from MandoMinutes format
   */
  private extractSource(source: string): string {
    // MandoMinutes often formats as "MandoMinutes/SourceName"
    if (source.includes("/")) {
      return source.split("/").pop() || source;
    }
    return source;
  }

  /**
   * Detect and record risk events from headlines
   */
  private detectRiskEvents(
    text: string,
    assets: string[],
    timestamp: number,
  ): void {
    const lower = text.toLowerCase();

    for (const risk of RISK_EVENT_KEYWORDS) {
      if (lower.includes(risk.keyword)) {
        // Check if we already have this risk event
        const exists = this.riskEvents.some(
          (e) => e.description.toLowerCase() === text.toLowerCase(),
        );

        if (!exists) {
          this.riskEvents.push({
            type: risk.type,
            description: text,
            severity: risk.severity,
            assets: assets.length > 0 ? assets : ["MARKET"],
            timestamp,
          });

          logger.info(
            `[VinceNewsSentiment] Risk event detected: [${risk.severity}] ${text}`,
          );
        }
        break; // Only record once per headline
      }
    }
  }

  /**
   * Add a news item (can be called by other services or actions)
   */
  addNewsItem(item: Omit<NewsItem, "timestamp">): void {
    this.newsCache.push({
      ...item,
      timestamp: Date.now(),
    });

    // Keep only last 150 items (MandoMinutes has 30-50 per day)
    if (this.newsCache.length > 150) {
      this.newsCache = this.newsCache.slice(-150);
    }
  }

  /**
   * Add a risk event
   */
  addRiskEvent(event: Omit<RiskEvent, "timestamp">): void {
    this.riskEvents.push({
      ...event,
      timestamp: Date.now(),
    });

    // Keep only last 50 events
    if (this.riskEvents.length > 50) {
      this.riskEvents = this.riskEvents.slice(-50);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): {
    newsCount: number;
    riskEventCount: number;
    lastUpdate: number;
  } {
    return {
      newsCount: this.newsCache.length,
      riskEventCount: this.riskEvents.length,
      lastUpdate: this.lastUpdate,
    };
  }

  getRecentNews(limit: number = 10): NewsItem[] {
    return this.newsCache
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get top headlines by impact, with sentiment breakdown
   */
  getTopHeadlines(limit: number = 5): NewsItem[] {
    return this.newsCache
      .sort((a, b) => {
        // Sort by impact first, then recency
        const impactOrder = { high: 3, medium: 2, low: 1 };
        const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
        if (impactDiff !== 0) return impactDiff;
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit);
  }

  /**
   * Get all headlines for dashboard/News tab (no limit). Same sort as getTopHeadlines.
   */
  getAllHeadlines(): NewsItem[] {
    return [...this.newsCache].sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.timestamp - a.timestamp;
    });
  }

  getNewsByAsset(asset: string): NewsItem[] {
    return this.newsCache
      .filter((n) => n.assets.includes(asset))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get news by category (crypto, macro, leftcurve)
   */
  getNewsByCategory(category: string): NewsItem[] {
    return this.newsCache
      .filter((n) => n.category === category)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getActiveRiskEvents(): RiskEvent[] {
    return this.riskEvents
      .filter((e) => Date.now() - e.timestamp < 4 * 60 * 60 * 1000) // Last 4 hours
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getActiveRiskEventsForAsset(asset: string): RiskEvent[] {
    return this.getActiveRiskEvents().filter(
      (e) => e.assets.includes(asset) || e.assets.includes("MARKET"),
    );
  }

  getCriticalRiskEvents(): RiskEvent[] {
    return this.getActiveRiskEvents().filter((e) => e.severity === "critical");
  }

  /**
   * Get price-based sentiment contribution from snapshots (avg change < 0 → bearish, > 0 → bullish).
   * Weight ~2 headlines so it doesn't dominate keyword sentiment.
   */
  private getPriceSentimentContribution(
    snapshots: Array<{ asset: string; changePct: number }>,
    assetFilter?: string,
  ): { bullishAdd: number; bearishAdd: number } {
    const filtered = assetFilter
      ? snapshots.filter((s) => s.asset === assetFilter)
      : snapshots;
    if (filtered.length === 0) return { bullishAdd: 0, bearishAdd: 0 };
    const avgChange =
      filtered.reduce((s, x) => s + x.changePct, 0) / filtered.length;
    if (Math.abs(avgChange) < 0.5) return { bullishAdd: 0, bearishAdd: 0 };
    const contrib = Math.min(3, Math.abs(avgChange) / 2);
    return avgChange > 0
      ? { bullishAdd: contrib, bearishAdd: 0 }
      : { bullishAdd: 0, bearishAdd: contrib };
  }

  /**
   * Blend score-based and headcount-based confidence for better calibration.
   */
  private blendConfidence(
    scoreConfidence: number,
    bullishCount: number,
    bearishCount: number,
    totalRelevant: number,
  ): number {
    const headcountConfidence =
      totalRelevant > 0
        ? Math.min(
            100,
            (Math.abs(bullishCount - bearishCount) /
              Math.max(1, totalRelevant)) *
              100,
          )
        : 0;
    return Math.round(0.6 * scoreConfidence + 0.4 * headcountConfidence);
  }

  /**
   * Get overall market sentiment from news
   * Uses keyword counts per headline, weighted by recency and impact; includes price snapshots and headcount calibration.
   */
  getOverallSentiment(): {
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
  } {
    let bullishScore = 0;
    let bearishScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    const now = Date.now();
    const bullishExamples: string[] = [];
    const bearishExamples: string[] = [];

    for (const news of this.newsCache) {
      const ageHours = (now - news.timestamp) / (60 * 60 * 1000);
      const recencyWeight = Math.max(0.1, 1 - ageHours / 24);
      const impactWeight =
        news.impact === "high" ? 3 : news.impact === "medium" ? 2 : 1;
      const weight = recencyWeight * impactWeight;

      if (news.sentiment === "bullish") {
        bullishScore += weight;
        bullishCount++;
        if (bullishExamples.length < 3)
          bullishExamples.push(news.title.slice(0, 60));
      } else if (news.sentiment === "bearish") {
        bearishScore += weight;
        bearishCount++;
        if (bearishExamples.length < 3)
          bearishExamples.push(news.title.slice(0, 60));
      }
    }

    const priceContrib = this.getPriceSentimentContribution(
      this.priceSnapshots,
    );
    bullishScore += priceContrib.bullishAdd;
    bearishScore += priceContrib.bearishAdd;

    const totalScore = bullishScore + bearishScore;
    if (totalScore === 0 && this.newsCache.length === 0) {
      return { sentiment: "neutral", confidence: 0 };
    }

    const sentiment =
      bullishScore > bearishScore * 1.2
        ? "bullish"
        : bearishScore > bullishScore * 1.2
          ? "bearish"
          : "neutral";
    const scoreConf =
      totalScore > 0
        ? Math.min(
            100,
            (Math.abs(bullishScore - bearishScore) / totalScore) * 100,
          )
        : 0;
    const confidence = this.blendConfidence(
      scoreConf,
      bullishCount,
      bearishCount,
      bullishCount + bearishCount,
    );

    logger.debug(
      `[VinceNewsSentiment] Overall ${sentiment}: weighted bullish=${bullishScore.toFixed(1)} bearish=${bearishScore.toFixed(1)} ` +
        `(confidence ${confidence}%). Bullish sample: ${bullishExamples.join(" | ")}. Bearish sample: ${bearishExamples.join(" | ")}.`,
    );

    return { sentiment, confidence };
  }

  /**
   * Get sentiment for a specific asset with category weighting and macro vs crypto split.
   * Crypto+leftcurve weighted for perps; macro weighted higher for BTC.
   */
  getAssetSentiment(asset: string): {
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
    newsCount: number;
  } {
    const assetNews = this.getNewsByAsset(asset);
    const catWeights = VinceNewsSentimentService.CATEGORY_WEIGHTS[asset] ?? {
      crypto: 1,
      macro: 1,
      leftcurve: 1,
    };
    const now = Date.now();
    let bullishScore = 0;
    let bearishScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;

    for (const news of assetNews) {
      const ageHours = (now - news.timestamp) / (60 * 60 * 1000);
      const recencyWeight = Math.max(0.1, 1 - ageHours / 24);
      const impactWeight =
        news.impact === "high" ? 3 : news.impact === "medium" ? 2 : 1;
      const cat = (news.category || "crypto") as
        | "crypto"
        | "macro"
        | "leftcurve";
      const catWeight = catWeights[cat] ?? 1;
      const weight = recencyWeight * impactWeight * catWeight;

      const effectiveSentiment =
        news.perAssetSentiment?.[asset as "BTC" | "ETH" | "SOL" | "HYPE"] ??
        news.sentiment;
      if (effectiveSentiment === "bullish") {
        bullishScore += weight;
        bullishCount++;
      } else if (effectiveSentiment === "bearish") {
        bearishScore += weight;
        bearishCount++;
      }
    }

    const priceContrib = this.getPriceSentimentContribution(
      this.priceSnapshots,
      asset,
    );
    bullishScore += priceContrib.bullishAdd;
    bearishScore += priceContrib.bearishAdd;

    const totalScore = bullishScore + bearishScore;
    if (totalScore === 0 && assetNews.length === 0) {
      return { sentiment: "neutral", confidence: 0, newsCount: 0 };
    }

    const sentiment =
      bullishScore > bearishScore * 1.2
        ? "bullish"
        : bearishScore > bullishScore * 1.2
          ? "bearish"
          : "neutral";
    const scoreConf =
      totalScore > 0
        ? Math.min(
            100,
            (Math.abs(bullishScore - bearishScore) / totalScore) * 100,
          )
        : 0;
    const confidence = this.blendConfidence(
      scoreConf,
      bullishCount,
      bearishCount,
      bullishCount + bearishCount,
    );

    return { sentiment, confidence, newsCount: assetNews.length };
  }

  /**
   * Get sentiment for trading algo: prefers asset-specific when newsCount >= 2, else overall.
   * Also returns hasHighRiskEvent for risk dampening.
   */
  getTradingSentiment(asset: string): {
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
    hasHighRiskEvent: boolean;
  } {
    const assetSent = this.getAssetSentiment(asset);
    const overall = this.getOverallSentiment();
    const activeEvents = this.getActiveRiskEvents().filter(
      (e) => e.assets.includes(asset) || e.assets.includes("MARKET"),
    );
    const hasHighRiskEvent = activeEvents.some(
      (e) => e.severity === "critical" || e.severity === "warning",
    );

    const isCoreAsset = (CORE_NEWS_ASSETS as readonly string[]).includes(asset);
    const useAsset =
      assetSent.newsCount >= 1 &&
      (assetSent.confidence >= 35 || assetSent.sentiment !== "neutral");
    let sentiment: "bullish" | "bearish" | "neutral" = assetSent.sentiment;
    let confidence = assetSent.confidence;
    if (!useAsset) {
      const hasAssetRelevantMacro =
        isCoreAsset &&
        this.newsCache.some((n) =>
          /\b(etf|fed|rates?|tariff|macro)\b/i.test(n.title),
        );
      if (hasAssetRelevantMacro) {
        sentiment = overall.sentiment;
        confidence = Math.round(overall.confidence * 0.7);
      } else {
        sentiment = "neutral";
        confidence = Math.min(30, overall.confidence);
      }
    }

    return { sentiment, confidence, hasHighRiskEvent };
  }

  /**
   * ETF flow direction from headlines (for feature store: news_etfFlowBtc, news_etfFlowEth).
   * Returns -1 (bearish), 0 (no data), or 1 (bullish) per asset. Most recent headline wins.
   */
  getEtfFlowNumeric(): { btc: number | null; eth: number | null } {
    let btc: number | null = null;
    let eth: number | null = null;
    for (const news of this.newsCache) {
      const normalized = this.normalizeForSentiment(news.title);
      const byAsset = this.extractEtfFlowByAsset(normalized);
      if (byAsset.BTC) btc = byAsset.BTC === "bullish" ? 1 : -1;
      if (byAsset.ETH) eth = byAsset.ETH === "bullish" ? 1 : -1;
    }
    return { btc, eth };
  }

  /**
   * Format news for display in GM briefing
   */
  formatForBriefing(limit: number = 5): string[] {
    const lines: string[] = [];
    const topNews = this.getTopHeadlines(limit);
    const sentiment = this.getOverallSentiment();
    const riskEvents = this.getCriticalRiskEvents();

    // Vibe check at top (1-2 line summary)
    if (this.hasData()) {
      lines.push(`📋 ${this.getVibeCheck()}`);
    }

    // Overall sentiment
    const sentimentEmoji =
      sentiment.sentiment === "bullish"
        ? "📈"
        : sentiment.sentiment === "bearish"
          ? "📉"
          : "➡️";
    lines.push(
      `Sentiment: ${sentimentEmoji} ${sentiment.sentiment} (${Math.round(sentiment.confidence)}% conf)`,
    );

    // Risk events warning
    if (riskEvents.length > 0) {
      lines.push(`⚠️ ${riskEvents.length} risk event(s) detected!`);
      for (const event of riskEvents.slice(0, 2)) {
        lines.push(`  • [${event.type}] ${event.description.slice(0, 60)}...`);
      }
    }

    // Top headlines
    if (topNews.length > 0) {
      lines.push("Headlines:");
      for (const news of topNews) {
        const emoji =
          news.sentiment === "bullish"
            ? "🟢"
            : news.sentiment === "bearish"
              ? "🔴"
              : "⚪";
        const title =
          news.title.length > 70 ? news.title.slice(0, 67) + "..." : news.title;
        lines.push(`  ${emoji} ${title}`);
      }
    }

    return lines;
  }

  /**
   * Check if MandoMinutes data is available
   */
  hasData(): boolean {
    return this.newsCache.length > 0;
  }

  /**
   * Freshness info for daily push gate.
   * Skip news push when we can't confirm Mando has updated (he doesn't update every day).
   * Set VINCE_NEWS_PUSH_REQUIRE_FRESH=false to push anyway when date can't be inferred.
   */
  getMandoFreshnessInfo(): {
    hasData: boolean;
    inferredPublishDate: string | null;
    isLikelyFresh: boolean;
  } {
    const requireFresh = process.env.VINCE_NEWS_PUSH_REQUIRE_FRESH !== "false";
    const hasData = this.newsCache.length > 0;
    const inferred = this.lastInferredMandoDate;

    if (!requireFresh) {
      return { hasData, inferredPublishDate: inferred, isLikelyFresh: hasData };
    }

    if (!hasData || !inferred) {
      return { hasData, inferredPublishDate: inferred, isLikelyFresh: false };
    }

    const pubDate = new Date(inferred);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const pubDay = new Date(
      pubDate.getFullYear(),
      pubDate.getMonth(),
      pubDate.getDate(),
    );
    const isTodayOrYesterday =
      pubDay.getTime() === today.getTime() ||
      pubDay.getTime() === yesterday.getTime();

    return {
      hasData,
      inferredPublishDate: inferred,
      isLikelyFresh: isTodayOrYesterday,
    };
  }

  /**
   * Get summary stats for debugging
   */
  getDebugStats(): {
    totalNews: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    riskEventCount: number;
    lastUpdate: string;
    hasData: boolean;
  } {
    return {
      totalNews: this.newsCache.length,
      bullishCount: this.newsCache.filter((n) => n.sentiment === "bullish")
        .length,
      bearishCount: this.newsCache.filter((n) => n.sentiment === "bearish")
        .length,
      neutralCount: this.newsCache.filter((n) => n.sentiment === "neutral")
        .length,
      riskEventCount: this.riskEvents.length,
      lastUpdate: this.lastUpdate
        ? new Date(this.lastUpdate).toISOString()
        : "never",
      hasData: this.hasData(),
    };
  }

  // ==========================================
  // Theme-Based Narrative Generation
  // ==========================================

  /**
   * Detect the primary theme of a news headline
   */
  private detectTheme(text: string): NewsTheme {
    const lower = text.toLowerCase();

    // Check each theme's keywords
    const themeScores: Record<NewsTheme, number> = {
      regulatory: 0,
      security: 0,
      price: 0,
      institutional: 0,
      macro: 0,
      defi: 0,
      meme: 0,
      other: 0,
    };

    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          themeScores[theme as NewsTheme]++;
        }
      }
    }

    // Find highest scoring theme
    let maxTheme: NewsTheme = "other";
    let maxScore = 0;
    for (const [theme, score] of Object.entries(themeScores)) {
      if (score > maxScore) {
        maxScore = score;
        maxTheme = theme as NewsTheme;
      }
    }

    return maxTheme;
  }

  /**
   * Group articles by theme for narrative generation
   */
  private groupByTheme(): ThemedNews[] {
    const groups: Map<NewsTheme, NewsItem[]> = new Map();

    for (const article of this.newsCache) {
      const theme = this.detectTheme(article.title);
      if (!groups.has(theme)) {
        groups.set(theme, []);
      }
      groups.get(theme)!.push(article);
    }

    // Convert to array and sort by article count
    const themed: ThemedNews[] = [];
    for (const [theme, articles] of groups) {
      if (articles.length > 0) {
        // Sort articles by impact
        articles.sort((a, b) => {
          const impactOrder = { high: 3, medium: 2, low: 1 };
          return impactOrder[b.impact] - impactOrder[a.impact];
        });

        themed.push({
          theme,
          articles,
          topHeadline: articles[0].title,
        });
      }
    }

    // Sort by number of articles (most coverage first)
    themed.sort((a, b) => b.articles.length - a.articles.length);

    return themed;
  }

  /**
   * Extract key entities/numbers from a headline for narrative use
   */
  private extractKeyDetails(title: string): string {
    // Extract percentages
    const pctMatch = title.match(/[+-]?\d+(?:\.\d+)?%/);
    // Extract dollar amounts
    const dollarMatch = title.match(/\$[\d,]+(?:\.\d+)?[BMK]?/i);
    // Extract specific numbers (like "100k")
    const numMatch = title.match(/\b\d+[kmb]\b/i);

    const details: string[] = [];
    if (pctMatch) details.push(pctMatch[0]);
    if (dollarMatch) details.push(dollarMatch[0]);
    if (numMatch) details.push(numMatch[0]);

    return details.join(", ");
  }

  /**
   * Generate a comprehensive human-style daily news digest
   * Uses ALL articles grouped by theme, writes detailed narrative
   */
  generateDailySummary(): string {
    if (this.newsCache.length === 0) {
      return "No news data available - run MANDO_MINUTES to fetch.";
    }

    const themed = this.groupByTheme();
    const paragraphs: string[] = [];
    const totalArticles = this.newsCache.length;

    // Process ALL themes with at least 1 article
    for (const { theme, articles } of themed) {
      if (articles.length === 0 || theme === "other") continue;

      const paragraph = this.writeThemeParagraph(theme, articles);
      if (paragraph) {
        paragraphs.push(paragraph);
      }
    }

    // Handle "other" category - miscellaneous news worth mentioning
    const otherNews = themed.find((t) => t.theme === "other");
    if (otherNews && otherNews.articles.length > 0) {
      const misc = this.writeMiscParagraph(otherNews.articles);
      if (misc) {
        paragraphs.push(misc);
      }
    }

    // Add article count context
    const header = `**${totalArticles} stories today** - here's what matters:\n`;

    return header + paragraphs.join("\n\n");
  }

  /**
   * Write a full paragraph for a theme - uses multiple headlines
   */
  private writeThemeParagraph(theme: NewsTheme, articles: NewsItem[]): string {
    const count = articles.length;
    const bullish = articles.filter((a) => a.sentiment === "bullish").length;
    const bearish = articles.filter((a) => a.sentiment === "bearish").length;

    // Get top headlines for this theme (up to 5)
    const topHeadlines = articles.slice(0, 5).map((a) => a.title);

    // Theme emoji and title
    const themeLabels: Record<NewsTheme, { emoji: string; title: string }> = {
      regulatory: { emoji: "⚖️", title: "Regulation" },
      security: { emoji: "🔒", title: "Security" },
      price: { emoji: "📊", title: "Markets" },
      institutional: { emoji: "🏛️", title: "Institutional" },
      macro: { emoji: "🌍", title: "Macro" },
      defi: { emoji: "🔗", title: "DeFi" },
      meme: { emoji: "🐸", title: "Meme Szn" },
      other: { emoji: "📰", title: "Other" },
    };

    const { emoji, title } = themeLabels[theme];
    const lines: string[] = [];

    // Header with count
    const sentimentNote =
      bullish > bearish
        ? "(leaning bullish)"
        : bearish > bullish
          ? "(leaning bearish)"
          : "";
    lines.push(`${emoji} **${title}** [${count} stories] ${sentimentNote}`);

    // Write narrative sentences using actual headlines
    switch (theme) {
      case "regulatory":
        lines.push(this.writeRegulatoryNarrative(topHeadlines, articles));
        break;
      case "security":
        lines.push(this.writeSecurityNarrative(topHeadlines, articles));
        break;
      case "price":
        lines.push(this.writePriceNarrative(topHeadlines, articles));
        break;
      case "institutional":
        lines.push(this.writeInstitutionalNarrative(topHeadlines, articles));
        break;
      case "macro":
        lines.push(this.writeMacroNarrative(topHeadlines, articles));
        break;
      case "defi":
        lines.push(this.writeDefiNarrative(topHeadlines, articles));
        break;
      case "meme":
        lines.push(this.writeMemeNarrative(topHeadlines, articles));
        break;
      default:
        break;
    }

    return lines.join("\n");
  }

  /**
   * Write narrative for regulatory news
   */
  private writeRegulatoryNarrative(
    headlines: string[],
    articles: NewsItem[],
  ): string {
    const lines: string[] = [];

    // Look for specific entities
    const entities = this.extractEntities(headlines, [
      "SEC",
      "CFTC",
      "DOJ",
      "Gensler",
      "Congress",
      "Senate",
      "EU",
      "MiCA",
      "Binance",
      "Coinbase",
      "Kraken",
      "Ripple",
      "XRP",
    ]);

    if (entities.length > 0) {
      lines.push(`Key players: ${entities.join(", ")}`);
    }

    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 80)}`);
    }

    return lines.join("\n");
  }

  /**
   * Write narrative for security news
   */
  private writeSecurityNarrative(
    headlines: string[],
    articles: NewsItem[],
  ): string {
    const lines: string[] = [];
    const hasCritical = articles.some((a) => a.impact === "high");

    // Look for affected protocols
    const protocols = this.extractEntities(headlines, [
      "ETH",
      "Ethereum",
      "Solana",
      "BSC",
      "Arbitrum",
      "Optimism",
      "Aave",
      "Curve",
      "Uniswap",
      "bridge",
    ]);

    if (protocols.length > 0) {
      lines.push(`Affected: ${protocols.join(", ")}`);
    }

    // Each headline on its own line
    for (const headline of headlines.slice(0, 3)) {
      const prefix =
        hasCritical && headline === headlines[0] ? "  ⚠️ " : "  → ";
      lines.push(`${prefix}${this.cleanHeadline(headline, 75)}`);
    }

    return lines.join("\n");
  }

  /**
   * Write narrative for price/market news
   */
  private writePriceNarrative(
    headlines: string[],
    articles: NewsItem[],
  ): string {
    const lines: string[] = [];
    const bullish = articles.filter((a) => a.sentiment === "bullish").length;
    const bearish = articles.filter((a) => a.sentiment === "bearish").length;

    // Extract assets mentioned
    const assets = this.extractEntities(headlines, [
      "BTC",
      "Bitcoin",
      "ETH",
      "Ethereum",
      "SOL",
      "Solana",
      "XRP",
      "ADA",
      "DOGE",
      "AVAX",
      "LINK",
      "DOT",
    ]);

    // Mood + assets on one line
    let mood = "Mixed action";
    if (bullish > bearish * 1.5) {
      mood = "🟢 Green across the board";
    } else if (bearish > bullish * 1.5) {
      mood = "🔴 Red dominating";
    }

    if (assets.length > 0) {
      lines.push(`${mood} - focus on ${assets.join(", ")}`);
    } else {
      lines.push(mood);
    }

    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      const sentiment = articles.find((a) => a.title === headline)?.sentiment;
      const dot =
        sentiment === "bullish" ? "🟢" : sentiment === "bearish" ? "🔴" : "⚪";
      lines.push(`  ${dot} ${this.cleanHeadline(headline, 75)}`);
    }

    return lines.join("\n");
  }

  /**
   * Write narrative for institutional news
   */
  private writeInstitutionalNarrative(
    headlines: string[],
    articles: NewsItem[],
  ): string {
    const lines: string[] = [];

    const players = this.extractEntities(headlines, [
      "BlackRock",
      "Fidelity",
      "Grayscale",
      "VanEck",
      "Ark",
      "21Shares",
      "JPMorgan",
      "Goldman",
      "Morgan Stanley",
      "Citadel",
      "ETF",
    ]);

    if (players.length > 0) {
      lines.push(`Big names: ${players.join(", ")}`);
    }

    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 75)}`);
    }

    return lines.join("\n");
  }

  /**
   * Write narrative for macro news
   */
  private writeMacroNarrative(
    headlines: string[],
    articles: NewsItem[],
  ): string {
    const lines: string[] = [];

    const factors = this.extractEntities(headlines, [
      "Fed",
      "Powell",
      "CPI",
      "inflation",
      "rates",
      "dollar",
      "DXY",
      "Treasury",
      "bonds",
      "yields",
      "GDP",
      "jobs",
      "unemployment",
    ]);

    if (factors.length > 0) {
      lines.push(`Key factors: ${factors.join(", ")}`);
    }

    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 75)}`);
    }

    return lines.join("\n");
  }

  /**
   * Write narrative for DeFi news
   */
  private writeDefiNarrative(
    headlines: string[],
    articles: NewsItem[],
  ): string {
    const lines: string[] = [];

    const protocols = this.extractEntities(headlines, [
      "Aave",
      "Uniswap",
      "Curve",
      "Pendle",
      "Lido",
      "Rocket Pool",
      "Compound",
      "MakerDAO",
      "Synthetix",
      "TVL",
      "yields",
      "APY",
    ]);

    if (protocols.length > 0) {
      lines.push(`Protocols: ${protocols.join(", ")}`);
    }

    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 75)}`);
    }

    return lines.join("\n");
  }

  /**
   * Write narrative for meme/degen news
   */
  private writeMemeNarrative(
    headlines: string[],
    articles: NewsItem[],
  ): string {
    const lines: string[] = [];

    const tokens = this.extractEntities(headlines, [
      "DOGE",
      "SHIB",
      "PEPE",
      "BONK",
      "WIF",
      "FLOKI",
      "TRUMP",
      "AI",
      "agent",
      "100x",
      "moon",
    ]);

    if (tokens.length > 0) {
      lines.push(`Tokens: ${tokens.join(", ")}`);
    }

    // Each headline on its own line
    for (const headline of headlines.slice(0, 3)) {
      lines.push(`  🐸 ${this.cleanHeadline(headline, 70)}`);
    }

    return lines.join("\n");
  }

  /**
   * Write paragraph for miscellaneous news
   */
  private writeMiscParagraph(articles: NewsItem[]): string {
    if (articles.length === 0) return "";

    const lines: string[] = [];
    lines.push(`📰 **Other Notable** [${articles.length} stories]`);

    // List top 5 headlines with proper indentation
    for (const article of articles.slice(0, 5)) {
      const emoji =
        article.sentiment === "bullish"
          ? "🟢"
          : article.sentiment === "bearish"
            ? "🔴"
            : "⚪";
      lines.push(`  ${emoji} ${this.cleanHeadline(article.title, 75)}`);
    }

    return lines.join("\n");
  }

  /**
   * Clean a headline for display - remove excess, truncate if needed
   */
  private cleanHeadline(headline: string, maxLen: number = 80): string {
    // Remove common prefixes
    let clean = headline
      .replace(/^BREAKING:\s*/i, "")
      .replace(/^JUST IN:\s*/i, "")
      .replace(/^UPDATE:\s*/i, "")
      .trim();

    // Truncate if needed
    if (clean.length > maxLen) {
      clean = clean.slice(0, maxLen - 3) + "...";
    }

    return clean;
  }

  /**
   * Extract specific entity names from headlines
   */
  private extractEntities(headlines: string[], lookFor: string[]): string[] {
    const found: string[] = [];
    const combined = headlines.join(" ");

    for (const entity of lookFor) {
      if (combined.toLowerCase().includes(entity.toLowerCase())) {
        found.push(entity);
      }
    }

    return [...new Set(found)].slice(0, 3); // Max 3 entities
  }

  /**
   * One- to two-line "vibe check" derived from headlines.
   * Display at top of news box for quick scan (e.g. "Risk-off: crypto selloff, gains erased. Themes: regulatory, Vitalik ETH.").
   */
  getVibeCheck(): string {
    if (this.newsCache.length === 0) return "No news data yet.";
    const sentiment = this.getOverallSentiment();
    const themed = this.groupByTheme();
    const topHeadlines = this.getTopHeadlines(8);
    const criticalRisks = this.getCriticalRiskEvents();
    const vibe =
      sentiment.sentiment === "bearish"
        ? "Risk-off"
        : sentiment.sentiment === "bullish"
          ? "Risk-on"
          : "Mixed";
    const phrases: string[] = [];
    for (const n of topHeadlines.slice(0, 5)) {
      const t = (n.title ?? "").toLowerCase();
      if (t.includes("selloff") || t.includes("sell-off"))
        phrases.push("crypto selloff");
      else if (t.includes("erases gains") || t.includes("gains erased"))
        phrases.push("gains erased");
      else if (t.includes("vitalik") && t.includes("eth"))
        phrases.push("Vitalik ETH");
      else if (t.includes("gold") && (t.includes("up") || t.includes("rally")))
        phrases.push("gold up");
      else if (t.includes("etf outflow")) phrases.push("ETF outflow");
      else if (t.includes("sec") || t.includes("regulation"))
        phrases.push("regulatory");
      else if (t.includes("hack") || t.includes("exploit"))
        phrases.push("security");
    }
    const uniquePhrases = [...new Set(phrases)].slice(0, 4);
    const themeNames = themed
      .filter((t) => t.articles.length >= 1)
      .sort((a, b) => b.articles.length - a.articles.length)
      .slice(0, 4)
      .map((t) => t.theme);
    const themeStr =
      themeNames.length > 0 ? `. Themes: ${themeNames.join(", ")}` : "";
    const phraseStr =
      uniquePhrases.length > 0 ? ` ${uniquePhrases.join(", ")}` : "";
    if (criticalRisks.length > 0) {
      return `${vibe} ⚠️ Risk event active${phraseStr}${themeStr}`.slice(
        0,
        120,
      );
    }
    const tail = phraseStr || themeStr ? `:${phraseStr}${themeStr}` : "";
    return (vibe + tail).slice(0, 120) || vibe;
  }

  /**
   * Generate actionable TLDR for dashboard display (max 55 chars)
   */
  getTLDR(): string {
    if (this.newsCache.length === 0) {
      return "NEWS: No data yet - run MANDO_MINUTES to fetch";
    }

    const sentiment = this.getOverallSentiment();
    const criticalRisks = this.getCriticalRiskEvents();
    const themed = this.groupByTheme();
    const bullishCount = this.newsCache.filter(
      (n) => n.sentiment === "bullish",
    ).length;
    const bearishCount = this.newsCache.filter(
      (n) => n.sentiment === "bearish",
    ).length;
    const directionalCount = bullishCount + bearishCount;
    const directionalBias =
      directionalCount > 0
        ? Math.abs(bullishCount - bearishCount) / directionalCount
        : 0;
    const hasStrongDirectionalSignal =
      sentiment.confidence >= 60 &&
      directionalCount >= 8 &&
      directionalBias >= 0.2;

    // Check for specific themes
    const hasRegulatory = themed.some(
      (t) => t.theme === "regulatory" && t.articles.length >= 2,
    );
    const hasSecurity = themed.some(
      (t) => t.theme === "security" && t.articles.length >= 1,
    );
    const hasInstitutional = themed.some(
      (t) => t.theme === "institutional" && t.articles.length >= 2,
    );

    // Priority 1: Critical security/hack events
    if (criticalRisks.length > 0) {
      return "RISK EVENT: Security incident - reduce exposure";
    }

    // Priority 2: Heavy regulatory day
    if (hasRegulatory && sentiment.sentiment !== "bullish") {
      return "REGULATORY NOISE: Choppy ahead - trade smaller";
    }

    // Priority 3: Bullish with institutional ONLY when directional signal is strong.
    if (
      sentiment.sentiment === "bullish" &&
      hasInstitutional &&
      hasStrongDirectionalSignal
    ) {
      return "BULLISH CATALYST: Institutional flow - lean long";
    }

    // If market is mixed/unclear, avoid over-confident directional TLDR.
    if (!hasStrongDirectionalSignal) {
      if (hasRegulatory || hasSecurity) {
        return "MIXED RISK TAPE: Event-driven chop - size down";
      }
      return "MIXED TAPE: Signals conflict - wait for confirmation";
    }

    // Priority 4: Pure sentiment
    if (sentiment.sentiment === "bullish") {
      return `BULLISH: ${sentiment.confidence.toFixed(0)}% confidence - favor longs`;
    }
    if (sentiment.sentiment === "bearish") {
      return hasSecurity
        ? "BEARISH + RISK: Protect capital, stay defensive"
        : `BEARISH: ${sentiment.confidence.toFixed(0)}% confidence - favor shorts`;
    }

    // Default: Neutral
    return "NEUTRAL: No strong catalyst - trade your plan";
  }

  /**
   * Generate a single-line conclusion that sets the day's trading mood
   */
  getDailyConclusion(): string {
    const sentiment = this.getOverallSentiment();
    const criticalRisks = this.getCriticalRiskEvents();
    const themed = this.groupByTheme();

    // Count themes
    const hasRegulatory = themed.some(
      (t) => t.theme === "regulatory" && t.articles.length >= 2,
    );
    const hasSecurity = themed.some(
      (t) => t.theme === "security" && t.articles.length >= 1,
    );
    const hasInstitutional = themed.some(
      (t) => t.theme === "institutional" && t.articles.length >= 2,
    );
    const hasPriceAction = themed.some(
      (t) => t.theme === "price" && t.articles.length >= 3,
    );

    // Critical security event overrides everything
    if (criticalRisks.length > 0) {
      return "🔴 Risk-off mode - security/hack news dominating, stay defensive and wait for clarity.";
    }

    // Heavy regulatory day
    if (hasRegulatory && sentiment.sentiment !== "bullish") {
      return "⚠️ Choppy day ahead - regulatory noise creating uncertainty, watch for dips but don't force it.";
    }

    // Bullish with institutional backing
    if (sentiment.sentiment === "bullish" && hasInstitutional) {
      return "🟢 Bullish undertone - institutional flow and positive sentiment, lean long on quality.";
    }

    // Bullish without institutional
    if (sentiment.sentiment === "bullish") {
      return "🟢 Positive bias today - sentiment tilting green, but size accordingly.";
    }

    // Bearish
    if (sentiment.sentiment === "bearish") {
      if (hasSecurity) {
        return "🔴 Defensive stance - bearish sentiment plus security concerns, protect capital.";
      }
      return "📉 Cautious mode - bearish lean in the news, wait for better entries.";
    }

    // Neutral with action
    if (hasPriceAction) {
      return "↔️ Mixed signals - headlines all over, trade the levels not the noise.";
    }

    // Default neutral
    return "➡️ Quiet day on the news front - no strong bias, stick to your plan.";
  }

  /**
   * Format news for display in GM briefing - NEW HUMAN STYLE
   * Returns summary + conclusion instead of raw headlines
   */
  formatHumanBriefing(): {
    summary: string;
    conclusion: string;
    riskAlert?: string;
  } {
    const summary = this.generateDailySummary();
    const conclusion = this.getDailyConclusion();

    // Only include risk alert if critical
    const criticalRisks = this.getCriticalRiskEvents();
    let riskAlert: string | undefined;
    if (criticalRisks.length > 0) {
      riskAlert = `⚠️ ALERT: ${criticalRisks[0].description.slice(0, 80)}`;
    }

    return { summary, conclusion, riskAlert };
  }
}
