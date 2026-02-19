/**
 * Polymarket Discovery Service
 *
 * Provides market discovery and pricing data via:
 * - Gamma API: Market metadata, categories, search
 * - CLOB API: Real-time orderbook and pricing
 *
 * Features:
 * - In-memory caching with TTL
 * - Retry with exponential backoff
 * - AbortController for timeouts
 * - No authentication required (read-only)
 */

import {
  type IAgentRuntime,
  Service,
  ServiceType,
  logger,
} from "@elizaos/core";
import { getProxyWalletAddress } from "@polymarket/sdk";
import type {
  PolymarketMarket,
  MarketsResponse,
  MarketPrices,
  OrderBook,
  MarketSearchParams,
  MarketCategory,
  CachedMarket,
  CachedPrice,
  PolymarketServiceConfig,
  PriceHistoryResponse,
  MarketPriceHistory,
  Position,
  Balance,
  Trade,
  EventFilters,
  PolymarketEvent,
  PolymarketEventDetail,
  OpenInterestData,
  VolumeData,
  SpreadData,
  OrderbookSummary,
  ClosedPosition,
  UserActivity,
  TopHolder,
  GammaPublicSearchResponse,
  GammaSearchEvent,
  GammaSearchMarket,
  PolymarketActivityType,
  PolymarketActivityEntry,
} from "../types";
import {
  DEFAULT_GAMMA_API_URL,
  GAMMA_PUBLIC_SEARCH_PATH,
  GAMMA_TAGS_PATH,
  GAMMA_EVENTS_PATH,
  GAMMA_MARKETS_PATH,
  DEFAULT_CLOB_API_URL,
  DEFAULT_DATA_API_URL,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  ACTIVITY_HISTORY_MAX_ITEMS,
  VINCE_POLYMARKET_PREFERRED_TAG_SLUGS,
} from "../constants";

/**
 * Maps API response from camelCase to snake_case for our interface
 * The Gamma API returns conditionId but our interface uses condition_id
 * Also constructs tokens array from clobTokenIds and outcomes if tokens field is missing
 */
function mapApiMarketToInterface(apiMarket: any): PolymarketMarket {
  // Parse outcomes and clobTokenIds (they come as JSON strings)
  let outcomes: string[] = [];
  let tokenIds: string[] = [];
  let prices: string[] = [];

  try {
    outcomes =
      typeof apiMarket.outcomes === "string"
        ? JSON.parse(apiMarket.outcomes)
        : apiMarket.outcomes || [];
    tokenIds =
      typeof apiMarket.clobTokenIds === "string"
        ? JSON.parse(apiMarket.clobTokenIds)
        : apiMarket.clobTokenIds || [];
    prices =
      typeof apiMarket.outcomePrices === "string"
        ? JSON.parse(apiMarket.outcomePrices)
        : apiMarket.outcomePrices || [];
  } catch {
    // If parsing fails, leave as empty arrays
  }

  // Construct tokens array if not present but we have the data
  let tokens = apiMarket.tokens;
  if (
    (!tokens || tokens.length === 0) &&
    outcomes.length > 0 &&
    tokenIds.length > 0
  ) {
    tokens = outcomes.map((outcome: string, index: number) => ({
      token_id: tokenIds[index],
      outcome: outcome,
      price: prices[index] ? parseFloat(prices[index]) : undefined,
    }));
  }

  return {
    ...apiMarket,
    condition_id: apiMarket.conditionId || apiMarket.condition_id,
    end_date_iso: apiMarket.endDate || apiMarket.end_date_iso,
    market_slug: apiMarket.slug || apiMarket.market_slug,
    game_start_time: apiMarket.startDate || apiMarket.game_start_time,
    tokens,
  };
}

export class PolymarketService extends Service {
  static serviceType = "POLYMARKET_DISCOVERY_SERVICE" as const;
  capabilityDescription =
    "Discover and fetch real-time pricing data for Polymarket prediction markets.";

  // API endpoints (overridden in initialize from settings)
  private gammaApiUrl: string = DEFAULT_GAMMA_API_URL;
  private clobApiUrl: string = DEFAULT_CLOB_API_URL;
  private dataApiUrl: string = DEFAULT_DATA_API_URL;

  // Proxy wallet constants
  private readonly GNOSIS_PROXY_FACTORY =
    "0xaB45c5A4B0c941a2F231C04C3f49182e1A254052";
  private readonly POLYGON_CHAIN_ID = 137;

  // Cache configuration
  private marketCacheTtl: number = 60000; // 1 minute
  private priceCacheTtl: number = 15000; // 15 seconds
  private priceHistoryCacheTtl: number = 300000; // 5 minutes (historical data changes less frequently)
  private positionsCacheTtl: number = 60000; // 1 minute
  private tradesCacheTtl: number = 30000; // 30 seconds
  private maxRetries: number = 3;
  private requestTimeout: number = 10000; // 10 seconds
  private maxMarketCacheSize: number = 100; // Max markets in cache
  private maxPriceCacheSize: number = 200; // Max prices in cache
  private maxPriceHistoryCacheSize: number = 50; // Max price histories in cache

  // In-memory LRU caches
  private marketCache: Map<string, CachedMarket> = new Map();
  private marketCacheOrder: string[] = []; // Track access order for LRU
  private priceCache: Map<string, CachedPrice> = new Map();
  private priceCacheOrder: string[] = []; // Track access order for LRU
  private priceHistoryCache: Map<
    string,
    { data: MarketPriceHistory; timestamp: number }
  > = new Map();
  private priceHistoryCacheOrder: string[] = []; // Track access order for LRU
  private positionsCache: Map<string, { data: Position[]; timestamp: number }> =
    new Map();
  private positionsCacheOrder: string[] = []; // Track access order for LRU
  private tradesCache: Map<string, { data: Trade[]; timestamp: number }> =
    new Map();
  private tradesCacheOrder: string[] = []; // Track access order for LRU
  private marketsListCache: {
    data: PolymarketMarket[];
    timestamp: number;
  } | null = null;

  // Phase 4: Events cache
  private eventsListCache: { data: any[]; timestamp: number } | null = null;
  private eventsCache: Map<string, { data: any; timestamp: number }> =
    new Map();
  private eventsCacheOrder: string[] = [];
  private eventCacheTtl: number = 60000; // 1 minute
  private maxEventCacheSize: number = 50;

  // Phase 3B: Analytics caches
  private openInterestCache: { data: any; timestamp: number } | null = null;
  private liveVolumeCache: { data: any; timestamp: number } | null = null;
  private spreadsCache: { data: any[]; timestamp: number } | null = null;
  private analyticsCacheTtl: number = 30000; // 30 seconds

  // Phase 5A: Extended portfolio caches
  private closedPositionsCache: Map<
    string,
    { data: any[]; timestamp: number }
  > = new Map();
  private closedPositionsCacheOrder: string[] = [];
  private closedPositionsCacheTtl: number = 60000; // 1 minute
  private userActivityCache: Map<string, { data: any[]; timestamp: number }> =
    new Map();
  private userActivityCacheOrder: string[] = [];
  private userActivityCacheTtl: number = 60000; // 1 minute
  private topHoldersCache: Map<string, { data: any[]; timestamp: number }> =
    new Map();
  private topHoldersCacheOrder: string[] = [];
  private topHoldersCacheTtl: number = 60000; // 1 minute

  /** Lightweight activity log per room for provider context (last N entries) */
  private activityLog: Map<string, PolymarketActivityEntry[]> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Static start method required by ElizaOS runtime for service registration
   * This is the factory method that creates and initializes the service instance
   */
  static async start(runtime: IAgentRuntime): Promise<PolymarketService> {
    const instance = new PolymarketService(runtime);
    await instance.initialize(runtime);
    return instance;
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    // Load configuration with defaults and type guards
    this.gammaApiUrl =
      (runtime.getSetting("POLYMARKET_GAMMA_API_URL") as string) ||
      DEFAULT_GAMMA_API_URL;
    this.clobApiUrl =
      (runtime.getSetting("POLYMARKET_CLOB_API_URL") as string) ||
      DEFAULT_CLOB_API_URL;
    this.dataApiUrl =
      (runtime.getSetting("POLYMARKET_DATA_API_URL") as string) ||
      DEFAULT_DATA_API_URL;

    // Safe parsing with validation
    const marketCacheTtlSetting = runtime.getSetting(
      "POLYMARKET_MARKET_CACHE_TTL",
    ) as string;
    this.marketCacheTtl = marketCacheTtlSetting
      ? Number(marketCacheTtlSetting)
      : 60000;
    if (isNaN(this.marketCacheTtl) || this.marketCacheTtl <= 0) {
      this.marketCacheTtl = 60000; // Default 1 minute
    }

    const priceCacheTtlSetting = runtime.getSetting(
      "POLYMARKET_PRICE_CACHE_TTL",
    ) as string;
    this.priceCacheTtl = priceCacheTtlSetting
      ? Number(priceCacheTtlSetting)
      : 15000;
    if (isNaN(this.priceCacheTtl) || this.priceCacheTtl <= 0) {
      this.priceCacheTtl = 15000; // Default 15 seconds
    }

    const maxRetriesSetting = runtime.getSetting(
      "POLYMARKET_MAX_RETRIES",
    ) as string;
    this.maxRetries = maxRetriesSetting ? Number(maxRetriesSetting) : 3;
    if (isNaN(this.maxRetries) || this.maxRetries < 0) {
      this.maxRetries = 3; // Default 3 retries
    }

    const requestTimeoutSetting = runtime.getSetting(
      "POLYMARKET_REQUEST_TIMEOUT",
    ) as string;
    this.requestTimeout = requestTimeoutSetting
      ? Number(requestTimeoutSetting)
      : 10000;
    if (isNaN(this.requestTimeout) || this.requestTimeout <= 0) {
      this.requestTimeout = 10000; // Default 10 seconds
    }

    logger.info(
      `[PolymarketService] Initialized with Gamma API: ${this.gammaApiUrl}, CLOB API: ${this.clobApiUrl}, Data API: ${this.dataApiUrl}`,
    );
  }

  async stop(): Promise<void> {
    this.clearCache();
  }

  /**
   * LRU cache helper: Update access order for a key
   */
  private updateCacheOrder(key: string, order: string[]): void {
    const index = order.indexOf(key);
    if (index > -1) {
      order.splice(index, 1);
    }
    order.push(key); // Most recently used at the end
  }

  /**
   * LRU cache helper: Evict oldest entry if cache exceeds max size
   */
  private evictIfNeeded(
    cache: Map<string, any>,
    order: string[],
    maxSize: number,
  ): void {
    while (cache.size >= maxSize && order.length > 0) {
      const oldestKey = order.shift(); // Remove least recently used (first in array)
      if (oldestKey) {
        cache.delete(oldestKey);
        logger.debug(`[PolymarketService] Evicted cache entry: ${oldestKey}`);
      }
    }
  }

  /**
   * LRU cache helper: Get from cache and update access order
   */
  private getCached<T>(
    key: string,
    cache: Map<string, T>,
    order: string[],
    ttl: number,
  ): T | null {
    const cached = cache.get(key);
    if (!cached) {
      return null;
    }

    // Check TTL
    const cachedItem = cached as any;
    const age = Date.now() - cachedItem.timestamp;
    if (age >= ttl) {
      cache.delete(key);
      const index = order.indexOf(key);
      if (index > -1) {
        order.splice(index, 1);
      }
      return null;
    }

    // Update access order
    this.updateCacheOrder(key, order);
    return cached;
  }

  /**
   * LRU cache helper: Set in cache with LRU eviction
   */
  private setCached<T>(
    key: string,
    value: T,
    cache: Map<string, T>,
    order: string[],
    maxSize: number,
  ): void {
    this.evictIfNeeded(cache, order, maxSize);
    cache.set(key, value);
    this.updateCacheOrder(key, order);
  }

  /**
   * Fetch with timeout using AbortController
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        throw new Error(
          `Request timeout after ${this.requestTimeout}ms: ${url}`,
        );
      }
      throw error;
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryFetch<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === retries - 1;
        const isMarketNotFound =
          lastError.message?.includes("Market not found");

        if (isLastAttempt || isMarketNotFound) {
          if (isMarketNotFound) throw lastError;
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt) * 1000;
        logger.warn(
          `[PolymarketService] Attempt ${attempt + 1}/${retries} failed: ${lastError.message}. Retrying in ${backoffMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError || new Error("Retry failed with unknown error");
  }

  /**
   * Parse clobTokenIds JSON string into tokens array
   *
   * Transforms API response from:
   *   { clobTokenIds: "[\"123\", \"456\"]", outcomes: "[\"Yes\", \"No\"]", outcomePrices: "[\"0.5\", \"0.5\"]" }
   * Into:
   *   { tokens: [{ token_id: "123", outcome: "Yes", price: 0.5 }, { token_id: "456", outcome: "No", price: 0.5 }] }
   */
  private parseTokens(market: any): any {
    if (!market.clobTokenIds) return market;
    try {
      const tokenIds = JSON.parse(market.clobTokenIds);
      const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
      const prices = market.outcomePrices
        ? JSON.parse(market.outcomePrices)
        : [];

      market.tokens = tokenIds.map((id: string, i: number) => ({
        token_id: id,
        outcome: outcomes[i],
        price: prices[i] ? parseFloat(prices[i]) : undefined,
      }));
    } catch (e) {
      logger.warn(
        `[PolymarketService] Failed to parse tokens for market ${market.conditionId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    return market;
  }

  /**
   * Get active/trending markets from Gamma API
   */
  async getActiveMarkets(limit: number = 20): Promise<PolymarketMarket[]> {
    logger.info(`[PolymarketService] Fetching ${limit} active markets`);

    // Check cache
    if (this.marketsListCache) {
      const age = Date.now() - this.marketsListCache.timestamp;
      if (age < this.marketCacheTtl) {
        logger.debug(
          `[PolymarketService] Returning cached markets list (age: ${age}ms)`,
        );
        return this.marketsListCache.data.slice(0, limit);
      }
    }

    return this.retryFetch(async () => {
      const url = `${this.gammaApiUrl}${GAMMA_MARKETS_PATH}?limit=${limit}&active=true&closed=false`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Gamma API error: ${response.status} ${response.statusText}`,
        );
      }

      const rawData = (await response.json()) as any[];
      const data = rawData.map(mapApiMarketToInterface);

      // Parse tokens from JSON strings
      const marketsWithTokens = data.map((market) => this.parseTokens(market));

      // Update cache
      this.marketsListCache = {
        data: marketsWithTokens,
        timestamp: Date.now(),
      };

      logger.info(
        `[PolymarketService] Fetched ${marketsWithTokens.length} active markets`,
      );
      return marketsWithTokens;
    });
  }

  /**
   * Gamma public-search: server-side keyword search. Returns markets from events.
   */
  async searchMarketsViaGammaSearch(
    query: string,
    limit: number = DEFAULT_PAGE_LIMIT,
  ): Promise<PolymarketMarket[]> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
    const url = `${this.gammaApiUrl}${GAMMA_PUBLIC_SEARCH_PATH}?q=${encodeURIComponent(query)}&limit_per_type=${safeLimit}&events_status=active`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(
        `Gamma public-search error: ${response.status} ${response.statusText}`,
      );
    }
    const body = (await response.json()) as GammaPublicSearchResponse;
    const events = body.events ?? [];
    const markets: PolymarketMarket[] = [];
    for (const ev of events) {
      const eventMarkets = ev.markets ?? [];
      for (const m of eventMarkets) {
        const apiMarket = { ...m, conditionId: m.conditionId ?? m.id };
        markets.push(mapApiMarketToInterface(apiMarket));
        if (markets.length >= safeLimit) break;
      }
      if (markets.length >= safeLimit) break;
    }
    const withTokens = markets.map((m) => this.parseTokens(m));
    logger.info(
      `[PolymarketService] Gamma public-search "${query}" returned ${withTokens.length} markets`,
    );
    return withTokens;
  }

  /**
   * Normalized keys for a tag (slug/label + hyphen/underscore/space variants) so preferred slugs like "fed-rates" match Gamma tags with slug "fed_rates" or label "Fed Rates".
   */
  private static tagKeys(slug: string, label?: string): string[] {
    const keys = new Set<string>();
    const add = (s: string) => {
      if (!s || !s.trim()) return;
      keys.add(s);
      keys.add(s.toLowerCase());
      keys.add(s.replace(/-/g, "_"));
      keys.add(s.replace(/_/g, "-"));
      keys.add(s.replace(/\s+/g, "-").trim());
      keys.add(s.replace(/\s+/g, "_").trim());
      keys.add(s.replace(/-/g, " ").trim());
      keys.add(s.replace(/_/g, " ").trim());
    };
    if (slug?.trim()) add(slug.trim());
    if (label?.trim()) add(label.trim());
    return [...keys];
  }

  /**
   * Resolve preferred slug to Gamma tag id using map built with tagKeys. Tries slug and normalized variants.
   */
  private static resolveSlugToTagId(
    slug: string,
    slugToTagId: Map<string, string>,
  ): string | undefined {
    const candidates = [
      slug,
      slug.toLowerCase(),
      slug.replace(/-/g, "_"),
      slug.replace(/_/g, "-"),
      slug.replace(/-/g, " "),
    ];
    for (const key of candidates) {
      const id = slugToTagId.get(key);
      if (id) return id;
    }
    return undefined;
  }

  /**
   * Fetch all tags from Gamma (for category/tag browse).
   */
  async getTags(): Promise<{ id: string; label: string; slug: string }[]> {
    const url = `${this.gammaApiUrl}${GAMMA_TAGS_PATH}`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(
        `Gamma tags error: ${response.status} ${response.statusText}`,
      );
    }
    const list = (await response.json()) as {
      id: string;
      label: string;
      slug: string;
    }[];
    return list;
  }

  /**
   * Resolve a single tag by slug via GET /tags/slug/{slug}. Returns null on 404 or non-ok (no throw).
   */
  async getTagBySlug(
    slug: string,
  ): Promise<{ id: string; label: string; slug: string } | null> {
    const url = `${this.gammaApiUrl}${GAMMA_TAGS_PATH}/slug/${encodeURIComponent(slug.trim())}`;
    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) return null;
      const tag = (await response.json()) as {
        id: string;
        label?: string;
        slug?: string;
      };
      if (!tag?.id) return null;
      return {
        id: String(tag.id),
        label: tag.label ?? "",
        slug: tag.slug ?? slug,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get events by tag (id or slug). Resolve slug to id via getTags() if needed. Uses normalized slug/label variants (hyphen/underscore/space) so "fed-rates" matches Gamma slug "fed_rates".
   */
  async getEventsByTag(
    tagIdOrSlug: string,
    limit: number = DEFAULT_PAGE_LIMIT,
  ): Promise<PolymarketMarket[]> {
    let tagId = tagIdOrSlug;
    if (!tagIdOrSlug.match(/^\d+$/)) {
      const tags = await this.getTags();
      const slugToTagId = new Map<string, string>();
      for (const t of tags) {
        if (t.id && /^\d+$/.test(String(t.id))) {
          for (const key of PolymarketService.tagKeys(t.slug ?? "", t.label)) {
            if (key) slugToTagId.set(key, t.id);
          }
        }
      }
      const resolved = PolymarketService.resolveSlugToTagId(
        tagIdOrSlug,
        slugToTagId,
      );
      if (resolved) {
        tagId = resolved;
      } else {
        const fallback = await this.getTagBySlug(tagIdOrSlug);
        const tag =
          fallback ??
          (tagIdOrSlug.includes("-")
            ? await this.getTagBySlug(tagIdOrSlug.replace(/-/g, "_"))
            : null);
        if (tag?.id && /^\d+$/.test(String(tag.id))) tagId = tag.id;
      }
    }
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
    const url = `${this.gammaApiUrl}${GAMMA_EVENTS_PATH}?tag_id=${encodeURIComponent(tagId)}&closed=false&active=true&limit=${safeLimit}&order=volume&ascending=false`;
    const response = await this.fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(
        `Gamma events-by-tag error: ${response.status} ${response.statusText}`,
      );
    }
    const events = (await response.json()) as GammaSearchEvent[];
    const markets: PolymarketMarket[] = [];
    for (const ev of events) {
      const eventMarkets = ev.markets ?? [];
      const evSlug = ev.slug ?? (ev as any).slug;
      const evId =
        ev.id != null
          ? String(ev.id)
          : (ev as any).id != null
            ? String((ev as any).id)
            : undefined;
      for (const m of eventMarkets) {
        const apiMarket = { ...m, conditionId: m.conditionId ?? (m as any).id };
        const mapped = mapApiMarketToInterface(apiMarket);
        markets.push({
          ...mapped,
          eventSlug: evSlug,
          eventId: evId,
        });
        if (markets.length >= safeLimit) break;
      }
      if (markets.length >= safeLimit) break;
    }
    const withTokens = markets.map((m) => this.parseTokens(m));
    logger.info(
      `[PolymarketService] getEventsByTag(${tagIdOrSlug}) returned ${withTokens.length} markets`,
    );
    return withTokens;
  }

  /**
   * Fetch markets from multiple tags (e.g. VINCE preferred topics). Merges, dedupes by conditionId, sorts by volume, returns up to totalLimit.
   * Resolves slugs to Gamma tag IDs once; only requests /events for tags that exist in Gamma (avoids 422 for unknown slugs).
   */
  async getMarketsByPreferredTags(options?: {
    tagSlugs?: string[];
    limitPerTag?: number;
    totalLimit?: number;
  }): Promise<PolymarketMarket[]> {
    const tagSlugs = options?.tagSlugs ?? VINCE_POLYMARKET_PREFERRED_TAG_SLUGS;
    const limitPerTag = Math.min(Math.max(1, options?.limitPerTag ?? 10), 50);
    const totalLimit = Math.min(
      Math.max(1, options?.totalLimit ?? 20),
      MAX_PAGE_LIMIT,
    );

    const slugToTagId = new Map<string, string>();
    try {
      const tags = await this.getTags();
      for (const t of tags) {
        if (t.id && /^\d+$/.test(String(t.id))) {
          for (const key of PolymarketService.tagKeys(t.slug ?? "", t.label)) {
            if (key) slugToTagId.set(key, t.id);
          }
        }
      }
    } catch (err) {
      logger.warn(
        `[PolymarketService] getMarketsByPreferredTags getTags failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const seen = new Set<string>();
    const merged: PolymarketMarket[] = [];
    const resolvedSlugs: string[] = [];
    const unresolvedSlugs: string[] = [];

    for (const slug of tagSlugs) {
      let tagId = PolymarketService.resolveSlugToTagId(slug, slugToTagId);
      if (!tagId) {
        const tag = await this.getTagBySlug(slug);
        const fallbackTag =
          tag ??
          (slug.includes("-")
            ? await this.getTagBySlug(slug.replace(/-/g, "_"))
            : null);
        if (fallbackTag && /^\d+$/.test(String(fallbackTag.id))) {
          tagId = fallbackTag.id;
          slugToTagId.set(slug, tagId);
          slugToTagId.set(slug.toLowerCase(), tagId);
          logger.info(
            `[PolymarketService] getMarketsByPreferredTags resolved slug "${slug}" via GET /tags/slug (id ${tagId})`,
          );
        }
      }
      if (!tagId) {
        unresolvedSlugs.push(slug);
        logger.debug(
          `[PolymarketService] getMarketsByPreferredTags skip slug "${slug}" (no matching Gamma tag)`,
        );
        continue;
      }
      resolvedSlugs.push(slug);
      try {
        const markets = await this.getEventsByTag(tagId, limitPerTag);
        for (const m of markets) {
          const id = m.conditionId ?? (m as any).condition_id;
          if (id && !seen.has(id)) {
            seen.add(id);
            merged.push(m);
          }
        }
      } catch (err) {
        logger.warn(
          `[PolymarketService] getMarketsByPreferredTags skip tag "${slug}" (id ${tagId}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    logger.info(
      `[PolymarketService] getMarketsByPreferredTags: resolved ${resolvedSlugs.length}/${tagSlugs.length}: ${resolvedSlugs.join(", ") || "none"}` +
        (unresolvedSlugs.length > 0
          ? `; unresolved: ${unresolvedSlugs.join(", ")}`
          : "") +
        `; ${merged.length} unique → ${Math.min(merged.length, totalLimit)} returned`,
    );

    const byVolume = (a: PolymarketMarket, b: PolymarketMarket) => {
      const va = Number(a.volume ?? a.liquidity ?? 0);
      const vb = Number(b.volume ?? b.liquidity ?? 0);
      return vb - va;
    };
    merged.sort(byVolume);
    const out = merged.slice(0, totalLimit);
    return out;
  }

  /**
   * Weekly Crypto markets for leaderboard vibe check (Hypersurface weekly options).
   * Tries: (A) GET /events with tag_id=crypto + recurrence=weekly, (B) tag_id=crypto then filter by series.recurrence, (C) public-search "weekly crypto".
   */
  async getWeeklyCryptoMarkets(
    limit: number = 15,
  ): Promise<PolymarketMarket[]> {
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
    let cryptoTagId: string | null = null;
    try {
      const tags = await this.getTags();
      const crypto = tags.find(
        (t) =>
          t.slug?.toLowerCase() === "crypto" ||
          t.label?.toLowerCase() === "crypto",
      );
      if (crypto?.id && /^\d+$/.test(String(crypto.id)))
        cryptoTagId = crypto.id;
    } catch (err) {
      logger.warn(
        `[PolymarketService] getWeeklyCryptoMarkets getTags failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const flattenEventsToMarkets = (
      events: GammaSearchEvent[],
    ): PolymarketMarket[] => {
      const markets: PolymarketMarket[] = [];
      for (const ev of events) {
        const eventMarkets = ev.markets ?? [];
        const evSlug = ev.slug ?? (ev as any).slug;
        const evId =
          ev.id != null
            ? String(ev.id)
            : (ev as any).id != null
              ? String((ev as any).id)
              : undefined;
        for (const m of eventMarkets) {
          const apiMarket = {
            ...m,
            conditionId: m.conditionId ?? (m as any).id,
          };
          const mapped = mapApiMarketToInterface(apiMarket);
          markets.push({
            ...mapped,
            eventSlug: evSlug,
            eventId: evId,
          });
        }
      }
      return markets.map((m) => this.parseTokens(m));
    };

    const byVolume = (a: PolymarketMarket, b: PolymarketMarket) => {
      const va = Number(a.volume ?? a.liquidity ?? 0);
      const vb = Number(b.volume ?? b.liquidity ?? 0);
      return vb - va;
    };

    const isMarketOpen = (m: PolymarketMarket): boolean => {
      const end = m.endDateIso ?? (m as any).end_date_iso;
      if (!end) return true;
      return new Date(end).getTime() > Date.now();
    };
    const filterOpenMarkets = (list: PolymarketMarket[]): PolymarketMarket[] =>
      list.filter(isMarketOpen);

    if (cryptoTagId) {
      try {
        const url = `${this.gammaApiUrl}${GAMMA_EVENTS_PATH}?tag_id=${encodeURIComponent(cryptoTagId)}&recurrence=weekly&closed=false&active=true&limit=50&order=volume&ascending=false`;
        const response = await this.fetchWithTimeout(url);
        if (response.ok) {
          const events = (await response.json()) as GammaSearchEvent[];
          if (events.length > 0) {
            const markets = flattenEventsToMarkets(events);
            const seen = new Set<string>();
            const deduped: PolymarketMarket[] = [];
            for (const m of markets) {
              const id = m.conditionId ?? (m as any).condition_id;
              if (id && !seen.has(id)) {
                seen.add(id);
                deduped.push(m);
              }
            }
            deduped.sort(byVolume);
            const out = filterOpenMarkets(deduped).slice(0, safeLimit);
            logger.info(
              `[PolymarketService] getWeeklyCryptoMarkets (recurrence=weekly): ${out.length} markets`,
            );
            return out;
          }
        }
      } catch (err) {
        logger.debug(
          `[PolymarketService] getWeeklyCryptoMarkets recurrence path failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      try {
        const url = `${this.gammaApiUrl}${GAMMA_EVENTS_PATH}?tag_id=${encodeURIComponent(cryptoTagId)}&closed=false&active=true&limit=100&order=volume&ascending=false`;
        const response = await this.fetchWithTimeout(url);
        if (response.ok) {
          const events = (await response.json()) as GammaSearchEvent[];
          const weeklyEvents = events.filter((ev) => {
            const series = (ev as any).series;
            const recurrence = series?.recurrence?.toLowerCase?.();
            const slug = (ev.slug ?? "").toLowerCase();
            const title = (ev.title ?? "").toLowerCase();
            return (
              recurrence === "weekly" ||
              slug.includes("weekly") ||
              title.includes("weekly")
            );
          });
          if (weeklyEvents.length > 0) {
            const markets = flattenEventsToMarkets(weeklyEvents);
            const seen = new Set<string>();
            const deduped: PolymarketMarket[] = [];
            for (const m of markets) {
              const id = m.conditionId ?? (m as any).condition_id;
              if (id && !seen.has(id)) {
                seen.add(id);
                deduped.push(m);
              }
            }
            deduped.sort(byVolume);
            const out = filterOpenMarkets(deduped).slice(0, safeLimit);
            logger.info(
              `[PolymarketService] getWeeklyCryptoMarkets (tag+filter): ${out.length} markets`,
            );
            return out;
          }
        }
      } catch (err) {
        logger.debug(
          `[PolymarketService] getWeeklyCryptoMarkets tag+filter path failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    try {
      const markets = await this.searchMarketsViaGammaSearch(
        "weekly crypto",
        safeLimit,
      );
      if (markets.length > 0) {
        const out = filterOpenMarkets(markets).slice(0, safeLimit);
        if (out.length > 0) {
          logger.info(
            `[PolymarketService] getWeeklyCryptoMarkets (search fallback): ${out.length} markets`,
          );
          return out;
        }
      }
    } catch (err) {
      logger.debug(
        `[PolymarketService] getWeeklyCryptoMarkets search fallback failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    logger.info(`[PolymarketService] getWeeklyCryptoMarkets: no markets found`);
    return [];
  }

  /**
   * Record activity for provider context (in-memory, per room).
   */
  recordActivity(
    roomId: string,
    type: PolymarketActivityType,
    data: Record<string, unknown>,
  ): void {
    let list = this.activityLog.get(roomId);
    if (!list) {
      list = [];
      this.activityLog.set(roomId, list);
    }
    list.push({ type, data, timestamp: Date.now() });
    if (list.length > ACTIVITY_HISTORY_MAX_ITEMS) {
      list.splice(0, list.length - ACTIVITY_HISTORY_MAX_ITEMS);
    }
  }

  /**
   * Get recent activity context for a room (for provider text).
   */
  getCachedActivityContext(roomId?: string): string {
    if (!roomId) return "";
    const list = this.activityLog.get(roomId);
    if (!list || list.length === 0) return "";
    const lines = list.slice(-5).map((e, i) => {
      const n = list.length - 5 + i + 1;
      if (e.type === "search") return `${n}. Search: "${e.data.query ?? "?"}"`;
      if (e.type === "markets_list")
        return `${n}. Viewed markets list (${e.data.count ?? "?"} markets)`;
      if (e.type === "market_detail")
        return `${n}. Viewed market detail: ${e.data.conditionId ?? "?"}`;
      if (e.type === "price_history")
        return `${n}. Viewed price history: ${e.data.conditionId ?? "?"}`;
      if (e.type === "orderbook") return `${n}. Viewed orderbook`;
      if (e.type === "events_list") return `${n}. Viewed events list`;
      if (e.type === "event_detail") return `${n}. Viewed event detail`;
      return `${n}. ${e.type}`;
    });
    return `Recent activity: ${lines.join("; ")}`;
  }

  /**
   * Search markets by keyword or category
   *
   * LIMITATION: Gamma API does not provide a server-side search endpoint.
   * This method fetches markets based on pagination params and filters client-side.
   * For better performance with large result sets, consider:
   * - Using smaller limit values to reduce payload size
   * - Caching results when searching the same criteria repeatedly
   * - Using specific category filters to narrow results server-side
   *
   * @param params - Search parameters including query, category, active status, and pagination
   * @returns Filtered array of markets matching search criteria
   */
  async searchMarkets(params: MarketSearchParams): Promise<PolymarketMarket[]> {
    const {
      query,
      category,
      active = true,
      closed = false,
      limit = 20,
      offset = 0,
    } = params;
    logger.info(
      `[PolymarketService] Searching markets: query="${query}", category="${category}", limit=${limit}, closed=${closed}`,
    );

    return this.retryFetch(async () => {
      // Build query parameters
      const queryParams = new URLSearchParams();

      // IMPORTANT: Since Gamma API doesn't support server-side search, we need to fetch
      // a larger batch of markets to filter client-side. We fetch more markets than the
      // requested limit to ensure we can return enough results after filtering.
      // Use 5x the requested limit (min 100) for keyword searches, or use limit as-is for category filters
      const fetchLimit = query ? Math.max(limit * 5, 100) : limit;
      queryParams.set("limit", fetchLimit.toString());
      queryParams.set("offset", offset.toString());

      if (active !== undefined) {
        queryParams.set("active", active.toString());
      }

      // IMPORTANT: Filter out closed/resolved markets to avoid returning old historical data
      // "active=true" alone is not sufficient - markets can be active but closed (resolved)
      queryParams.set("closed", closed.toString());

      // NOTE: Gamma API doesn't provide server-side text search or category filtering.
      // We fetch based on pagination params and filter client-side.
      // This is a limitation of the Gamma API, not our implementation.
      const url = `${this.gammaApiUrl}${GAMMA_MARKETS_PATH}?${queryParams.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Gamma API error: ${response.status} ${response.statusText}`,
        );
      }

      const rawMarkets = (await response.json()) as any[];
      let markets = rawMarkets.map(mapApiMarketToInterface);

      // Parse tokens from JSON strings
      markets = markets.map((market) => this.parseTokens(market));

      // Client-side filtering by query text
      if (query) {
        const lowerQuery = query.toLowerCase();
        markets = markets.filter(
          (m) =>
            m.question?.toLowerCase().includes(lowerQuery) ||
            m.description?.toLowerCase().includes(lowerQuery) ||
            m.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
        );
      }

      // Client-side filtering by category
      if (category) {
        const lowerCategory = category.toLowerCase();
        markets = markets.filter(
          (m) => m.category?.toLowerCase() === lowerCategory,
        );
      }

      // Return only the requested number of results
      const results = markets.slice(0, limit);
      logger.info(
        `[PolymarketService] Found ${results.length} markets matching search criteria (out of ${markets.length} matches)`,
      );
      return results;
    });
  }

  /**
   * Get detailed market information by condition ID
   *
   * LIMITATION: Gamma API does not provide a single-market endpoint by condition_id.
   * This method fetches up to 500 active markets and filters client-side to find the requested market.
   * If the target market is not in the first 500 returned by Gamma (e.g. low volume or newer),
   * it will not be found. Results are cached using LRU eviction to minimize repeated full-list fetches.
   *
   * OPTIMIZATION: Individual markets are cached by conditionId, so subsequent requests
   * for the same market will hit the cache instead of fetching the entire markets list.
   *
   * @param conditionId - The unique condition ID for the market
   * @returns Market details
   * @throws Error if market is not found
   */
  async getMarketDetail(conditionId: string): Promise<PolymarketMarket> {
    logger.info(`[PolymarketService] Fetching market detail: ${conditionId}`);

    // Check LRU cache
    const cached = this.getCached(
      conditionId,
      this.marketCache,
      this.marketCacheOrder,
      this.marketCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached market (conditionId: ${conditionId})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      // NOTE: Gamma API does not provide a /markets/:conditionId endpoint.
      // We must fetch active markets and filter client-side.
      // Use closed=false to get current active markets, not historical closed ones.
      const url = `${this.gammaApiUrl}/markets?limit=500&active=true&closed=false`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Gamma API error: ${response.status} ${response.statusText}`,
        );
      }

      const rawMarkets = (await response.json()) as any[];
      const markets = rawMarkets.map(mapApiMarketToInterface);

      const market = markets.find(
        (m) => (m.condition_id ?? m.conditionId) === conditionId,
      );

      if (!market) {
        throw new Error(`Market not found: ${conditionId}`);
      }

      // Parse tokens from JSON strings
      const marketWithTokens = this.parseTokens(market);

      // Update LRU cache
      this.setCached(
        conditionId,
        {
          data: marketWithTokens,
          timestamp: Date.now(),
          ttl: this.marketCacheTtl,
        },
        this.marketCache,
        this.marketCacheOrder,
        this.maxMarketCacheSize,
      );

      logger.info(
        `[PolymarketService] Fetched market: ${marketWithTokens.question}`,
      );
      return marketWithTokens;
    });
  }

  /**
   * Derive MarketPrices from a market payload that already has outcomePrices or tokens (e.g. from Gamma search/events).
   * Avoids getMarketDetail/getMarketPrices for search results whose conditionId is not in GET /markets list.
   *
   * @returns MarketPrices shape or null when payload has no usable prices
   */
  getPricesFromMarketPayload(market: PolymarketMarket): MarketPrices | null {
    const conditionId =
      market.conditionId ?? (market as any).condition_id ?? "";
    if (!conditionId) return null;

    let yesPriceNum: number | undefined;
    let noPriceNum: number | undefined;

    if (market.tokens && market.tokens.length >= 2) {
      const yesToken = market.tokens.find(
        (t: any) => t.outcome?.toLowerCase() === "yes",
      );
      const noToken = market.tokens.find(
        (t: any) => t.outcome?.toLowerCase() === "no",
      );
      const yesP =
        yesToken && typeof (yesToken as any).price === "number"
          ? (yesToken as any).price
          : undefined;
      const noP =
        noToken && typeof (noToken as any).price === "number"
          ? (noToken as any).price
          : undefined;
      if (yesP != null && noP != null) {
        yesPriceNum = yesP;
        noPriceNum = noP;
      }
    }

    if (yesPriceNum == null || noPriceNum == null) {
      let prices: number[] = [];
      try {
        const raw = market.outcomePrices;
        if (Array.isArray(raw))
          prices = raw
            .map((p: any) => parseFloat(String(p)))
            .filter((n) => !Number.isNaN(n));
        else if (typeof raw === "string")
          prices = JSON.parse(raw)
            .map((p: any) => parseFloat(String(p)))
            .filter((n: number) => !Number.isNaN(n));
      } catch {
        // ignore
      }
      if (prices.length >= 2) {
        yesPriceNum = prices[0];
        noPriceNum = prices[1];
      } else if (prices.length === 1) {
        yesPriceNum = prices[0];
        noPriceNum = 1 - yesPriceNum;
      }
    }

    if (yesPriceNum == null || noPriceNum == null) return null;

    const yesPrice = String(yesPriceNum);
    const noPrice = String(noPriceNum);
    const spread = Math.abs(yesPriceNum - noPriceNum).toFixed(4);
    return {
      condition_id: conditionId,
      yes_price: yesPrice,
      no_price: noPrice,
      yes_price_formatted: `${(yesPriceNum * 100).toFixed(1)}%`,
      no_price_formatted: `${(noPriceNum * 100).toFixed(1)}%`,
      spread,
      last_updated: Date.now(),
    };
  }

  /**
   * Get real-time market prices from CLOB API
   *
   * Fetches orderbook data for both YES and NO tokens and extracts best ask prices.
   * Results are cached with shorter TTL than market metadata for near-real-time updates.
   *
   * @param conditionId - The unique condition ID for the market
   * @returns Current market prices with spread calculation
   */
  async getMarketPrices(conditionId: string): Promise<MarketPrices> {
    logger.info(
      `[PolymarketService] Fetching prices for market: ${conditionId}`,
    );

    // Check LRU cache
    const cached = this.getCached(
      conditionId,
      this.priceCache,
      this.priceCacheOrder,
      this.priceCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached prices (conditionId: ${conditionId})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      // First get market to find token IDs
      const market = await this.getMarketDetail(conditionId);

      if (!market.tokens || market.tokens.length < 2) {
        throw new Error(`Market ${conditionId} has invalid token structure`);
      }

      const yesToken = market.tokens.find(
        (t) => t.outcome.toLowerCase() === "yes",
      );
      const noToken = market.tokens.find(
        (t) => t.outcome.toLowerCase() === "no",
      );

      if (!yesToken || !noToken) {
        throw new Error(
          `Market ${conditionId} missing Yes/No tokens. Available outcomes: ${market.tokens.map((t) => t.outcome).join(", ")}`,
        );
      }

      // Fetch orderbooks for both tokens in parallel
      const [yesBook, noBook] = await Promise.all([
        this.getOrderBook(yesToken.token_id),
        this.getOrderBook(noToken.token_id),
      ]);

      // Extract best bid/ask prices
      // FALLBACK: If orderbook is empty (no liquidity), default to 50/50 (0.50)
      // This represents maximum uncertainty when no market makers are providing quotes
      const yesPrice = yesBook.asks[0]?.price || "0.50";
      const noPrice = noBook.asks[0]?.price || "0.50";

      // Log warning if using fallback prices (indicates low/no liquidity)
      if (!yesBook.asks[0]?.price || !noBook.asks[0]?.price) {
        logger.warn(
          `[PolymarketService] Empty orderbook for market ${conditionId}, ` +
            `using fallback 50/50 prices (YES: ${yesBook.asks[0]?.price ? "has price" : "NO LIQUIDITY"}, ` +
            `NO: ${noBook.asks[0]?.price ? "has price" : "NO LIQUIDITY"})`,
        );
      }

      // Calculate spread (difference between yes and no prices)
      const yesPriceNum = parseFloat(yesPrice);
      const noPriceNum = parseFloat(noPrice);
      const spread = Math.abs(yesPriceNum - noPriceNum).toFixed(4);

      const prices: MarketPrices = {
        condition_id: conditionId,
        yes_price: yesPrice,
        no_price: noPrice,
        yes_price_formatted: `${(yesPriceNum * 100).toFixed(1)}%`,
        no_price_formatted: `${(noPriceNum * 100).toFixed(1)}%`,
        spread,
        last_updated: Date.now(),
      };

      // Update LRU cache
      this.setCached(
        conditionId,
        {
          data: prices,
          timestamp: Date.now(),
          ttl: this.priceCacheTtl,
        },
        this.priceCache,
        this.priceCacheOrder,
        this.maxPriceCacheSize,
      );

      logger.info(
        `[PolymarketService] Fetched prices - YES: ${prices.yes_price_formatted}, NO: ${prices.no_price_formatted}`,
      );
      return prices;
    });
  }

  /**
   * Get orderbook for a specific token
   */
  async getOrderBook(tokenId: string): Promise<OrderBook> {
    logger.debug(
      `[PolymarketService] Fetching orderbook for token: ${tokenId}`,
    );

    return this.retryFetch(async () => {
      const url = `${this.clobApiUrl}/book?token_id=${tokenId}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `CLOB API error: ${response.status} ${response.statusText}`,
        );
      }

      const orderBook = (await response.json()) as OrderBook;
      return orderBook;
    });
  }

  /**
   * Get available market categories
   *
   * NOTE: Categories are available on the /events endpoint, not /markets.
   * We fetch active events and aggregate their category field.
   */
  async getMarketCategories(): Promise<MarketCategory[]> {
    logger.info("[PolymarketService] Fetching market categories from events");

    return this.retryFetch(async () => {
      // Fetch events which have the category field (markets don't have it)
      const url = `${this.gammaApiUrl}/events?limit=500&active=true`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Gamma API error: ${response.status} ${response.statusText}`,
        );
      }

      const events = (await response.json()) as Array<{
        category?: string;
        title?: string;
        active?: boolean;
      }>;

      const categoryMap = new Map<string, number>();

      for (const event of events) {
        if (event.category && event.category !== "null") {
          const count = categoryMap.get(event.category) || 0;
          categoryMap.set(event.category, count + 1);
        }
      }

      const categories: MarketCategory[] = Array.from(categoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      logger.info(
        `[PolymarketService] Found ${categories.length} categories from ${events.length} events`,
      );
      return categories;
    });
  }

  /**
   * Get historical price data for a market
   *
   * Fetches price history from CLOB API for charting and trend analysis.
   * Supports different time intervals and outcomes (YES/NO).
   *
   * @param conditionId - The unique condition ID for the market
   * @param outcome - Which outcome to fetch prices for ("YES" or "NO", defaults to "YES")
   * @param interval - Time interval: "1m", "1h", "6h", "1d", "1w", "max" (defaults to "1d")
   * @param fidelity - Data resolution in minutes (optional)
   * @returns Historical price data formatted for charting
   */
  async getMarketPriceHistory(
    conditionId: string,
    outcome: "YES" | "NO" = "YES",
    interval: string = "1d",
    fidelity?: number,
  ): Promise<MarketPriceHistory> {
    logger.info(
      `[PolymarketService] Fetching price history: ${conditionId}, outcome: ${outcome}, interval: ${interval}`,
    );

    // Create cache key
    const cacheKey = `${conditionId}-${outcome}-${interval}-${fidelity || "default"}`;

    // Check LRU cache
    const cached = this.getCached(
      cacheKey,
      this.priceHistoryCache,
      this.priceHistoryCacheOrder,
      this.priceHistoryCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached price history (${cacheKey})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      // Get market to find token IDs
      const market = await this.getMarketDetail(conditionId);

      if (!market.tokens || market.tokens.length < 2) {
        throw new Error(`Market ${conditionId} has invalid token structure`);
      }

      // Find the token for the requested outcome (case-insensitive)
      const token = market.tokens.find(
        (t) => t.outcome.toLowerCase() === outcome.toLowerCase(),
      );

      if (!token) {
        throw new Error(
          `Market ${conditionId} missing ${outcome} token. Available outcomes: ${market.tokens.map((t) => t.outcome).join(", ")}`,
        );
      }

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.set("market", token.token_id);
      queryParams.set("interval", interval);

      // Auto-set fidelity for longer intervals to get full history
      // Without fidelity, 'max' only returns ~30 days of minute-by-minute data
      // With fidelity=1440 (daily), we get the complete market history
      let effectiveFidelity = fidelity;
      if (!effectiveFidelity) {
        if (interval === "max") {
          effectiveFidelity = 1440; // Daily data for full history
        } else if (interval === "1w") {
          effectiveFidelity = 360; // 6-hourly for 1 week (reasonable granularity)
        }
      }

      if (effectiveFidelity) {
        queryParams.set("fidelity", effectiveFidelity.toString());
      }

      // Fetch price history from CLOB API
      const url = `${this.clobApiUrl}/prices-history?${queryParams.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `CLOB API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as PriceHistoryResponse;

      // Format data for charting (convert to numbers and timestamps to ms)
      const dataPoints = data.history.map((point) => {
        const timestamp = point.t * 1000; // Convert seconds to milliseconds
        const date = new Date(timestamp);
        return {
          timestamp,
          price: parseFloat(point.p),
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }), // Format: "Jan 15"
        };
      });

      // Calculate current price (last data point)
      const currentPrice =
        dataPoints.length > 0
          ? dataPoints[dataPoints.length - 1].price
          : undefined;

      const priceHistory: MarketPriceHistory = {
        condition_id: conditionId,
        outcome,
        token_id: token.token_id,
        interval,
        data_points: dataPoints,
        current_price: currentPrice,
        market_question: market.question,
      };

      // Update LRU cache
      this.setCached(
        cacheKey,
        {
          data: priceHistory,
          timestamp: Date.now(),
        },
        this.priceHistoryCache,
        this.priceHistoryCacheOrder,
        this.maxPriceHistoryCacheSize,
      );

      logger.info(
        `[PolymarketService] Fetched price history: ${dataPoints.length} data points, current price: ${currentPrice?.toFixed(4) || "N/A"}`,
      );
      return priceHistory;
    });
  }

  /**
   * Phase 2: Portfolio Tracking Methods
   */

  /**
   * Derive proxy wallet address from EOA address
   *
   * Uses @polymarket/sdk's getProxyWalletAddress to compute the deterministic
   * proxy address for a user's EOA. Polymarket uses Gnosis Safe proxy wallets
   * for trading to enable gasless orders via meta-transactions.
   *
   * @param eoaAddress - User's externally owned account address
   * @returns Proxy wallet address (checksum format)
   */
  deriveProxyAddress(eoaAddress: string): string {
    logger.debug(
      `[PolymarketService] Deriving proxy address for EOA: ${eoaAddress}`,
    );

    // Use @polymarket/sdk to derive proxy wallet address
    // getProxyWalletAddress(factory, user) computes the deterministic CREATE2 address
    const proxyAddress = getProxyWalletAddress(
      this.GNOSIS_PROXY_FACTORY,
      eoaAddress,
    );
    logger.info(
      `[PolymarketService] Derived proxy: ${proxyAddress} for EOA: ${eoaAddress}`,
    );
    return proxyAddress;
  }

  /**
   * Get user positions across all markets
   *
   * Fetches active positions from Data API with automatic proxy address derivation.
   * Results are cached for 60s to reduce API load.
   *
   * @param walletAddress - User's EOA or proxy wallet address
   * @returns Array of positions with current values and P&L
   */
  async getUserPositions(walletAddress: string): Promise<Position[]> {
    logger.info(
      `[PolymarketService] Fetching positions for wallet: ${walletAddress}`,
    );

    // Derive proxy address if this is an EOA
    const proxyAddress = this.deriveProxyAddress(walletAddress);

    // Check LRU cache
    const cached = this.getCached(
      proxyAddress,
      this.positionsCache,
      this.positionsCacheOrder,
      this.positionsCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached positions (wallet: ${proxyAddress})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      const url = `${this.dataApiUrl}/positions?user=${proxyAddress}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Data API error: ${response.status} ${response.statusText}`,
        );
      }

      const positions = (await response.json()) as Position[];

      // Update LRU cache
      this.setCached(
        proxyAddress,
        {
          data: positions,
          timestamp: Date.now(),
        },
        this.positionsCache,
        this.positionsCacheOrder,
        100, // Max 100 wallets cached
      );

      logger.info(
        `[PolymarketService] Fetched ${positions.length} positions for wallet: ${proxyAddress}`,
      );
      return positions;
    });
  }

  /**
   * Get user balance and portfolio summary
   *
   * Fetches total portfolio value from /value endpoint and positions from /positions endpoint.
   * Computes derived metrics like positions value and P&L from the positions data.
   *
   * @param walletAddress - User's EOA or proxy wallet address
   * @returns Balance summary with total value and P&L
   */
  async getUserBalance(walletAddress: string): Promise<Balance> {
    logger.info(
      `[PolymarketService] Fetching balance for wallet: ${walletAddress}`,
    );

    // Derive proxy address if this is an EOA
    const proxyAddress = this.deriveProxyAddress(walletAddress);

    return this.retryFetch(async () => {
      // Fetch total value from /value endpoint
      const valueUrl = `${this.dataApiUrl}/value?user=${proxyAddress}`;
      const valueResponse = await this.fetchWithTimeout(valueUrl);

      if (!valueResponse.ok) {
        throw new Error(
          `Data API error: ${valueResponse.status} ${valueResponse.statusText}`,
        );
      }

      // API returns array: [{"user":"0x...", "value":123.45}]
      const valueData = (await valueResponse.json()) as Array<{
        user: string;
        value: number;
      }>;
      const totalValue = valueData.length > 0 ? valueData[0].value : 0;

      // Fetch positions to calculate positions value and P&L
      const positions = await this.getUserPositions(walletAddress);

      // Compute derived metrics from positions
      let positionsValue = 0;
      let unrealizedPnl = 0;
      let realizedPnl = 0;

      for (const position of positions) {
        positionsValue += position.currentValue || 0;
        unrealizedPnl += position.cashPnl || 0;
        realizedPnl += position.realizedPnl || 0;
      }

      // Available balance = total value - positions value
      const availableBalance = Math.max(0, totalValue - positionsValue);

      const balance: Balance = {
        total_value: String(totalValue),
        available_balance: String(availableBalance),
        positions_value: String(positionsValue),
        realized_pnl: String(realizedPnl),
        unrealized_pnl: String(unrealizedPnl),
        timestamp: Date.now(),
      };

      logger.info(
        `[PolymarketService] Fetched balance - Total: ${balance.total_value}, Positions: ${balance.positions_value}, Available: ${balance.available_balance}`,
      );
      return balance;
    });
  }

  /**
   * Get user trade history
   *
   * Fetches recent trades from Data API with automatic proxy address derivation.
   * Results are cached for 30s to balance freshness with API load.
   *
   * @param walletAddress - User's EOA or proxy wallet address
   * @param limit - Maximum number of trades to return (default: 100)
   * @returns Array of trade history entries
   */
  async getUserTrades(
    walletAddress: string,
    limit: number = 100,
  ): Promise<Trade[]> {
    logger.info(
      `[PolymarketService] Fetching trades for wallet: ${walletAddress}, limit: ${limit}`,
    );

    // Derive proxy address if this is an EOA
    const proxyAddress = this.deriveProxyAddress(walletAddress);

    // Create cache key with limit
    const cacheKey = `${proxyAddress}-${limit}`;

    // Check LRU cache
    const cached = this.getCached(
      cacheKey,
      this.tradesCache,
      this.tradesCacheOrder,
      this.tradesCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached trades (wallet: ${proxyAddress})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      const url = `${this.dataApiUrl}/trades?user=${proxyAddress}&limit=${limit}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Data API error: ${response.status} ${response.statusText}`,
        );
      }

      const trades = (await response.json()) as Trade[];

      // Update LRU cache
      this.setCached(
        cacheKey,
        {
          data: trades,
          timestamp: Date.now(),
        },
        this.tradesCache,
        this.tradesCacheOrder,
        100, // Max 100 wallet-limit combinations cached
      );

      logger.info(
        `[PolymarketService] Fetched ${trades.length} trades for wallet: ${proxyAddress}`,
      );
      return trades;
    });
  }

  /**
   * Phase 4: Events API Methods
   */

  /**
   * Get events from Gamma API
   *
   * Fetches higher-level event groupings that contain multiple markets.
   * Results are cached for 60s as event data is relatively stable.
   *
   * @param filters - Optional filters for active status, tags, pagination
   * @returns Array of events with metadata
   */
  async getEvents(filters?: EventFilters): Promise<PolymarketEvent[]> {
    const { active, closed, tag, limit = 20, offset = 0 } = filters || {};
    logger.info(
      `[PolymarketService] Fetching events with filters: active=${active}, tag=${tag}, limit=${limit}`,
    );

    // Check cache (only cache if no filters, since filtered results vary)
    if (!filters || (active === undefined && !closed && !tag && offset === 0)) {
      if (this.eventsListCache) {
        const age = Date.now() - this.eventsListCache.timestamp;
        if (age < this.eventCacheTtl) {
          logger.debug(
            `[PolymarketService] Returning cached events list (age: ${age}ms)`,
          );
          return this.eventsListCache.data.slice(0, limit);
        }
      }
    }

    return this.retryFetch(async () => {
      // Build query parameters (per Gamma docs: use closed=false unless historical data needed)
      const queryParams = new URLSearchParams();
      queryParams.set("limit", limit.toString());
      queryParams.set("offset", offset.toString());
      if (active !== undefined) {
        queryParams.set("active", active.toString());
      } else {
        queryParams.set("active", "true");
      }
      if (closed !== undefined) {
        queryParams.set("closed", closed.toString());
      } else {
        queryParams.set("closed", "false");
      }
      if (tag) {
        queryParams.set("tag_id", tag);
      }

      const url = `${this.gammaApiUrl}/events?${queryParams.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Gamma API error: ${response.status} ${response.statusText}`,
        );
      }

      const events = (await response.json()) as PolymarketEvent[];

      // Update cache only if no filters
      if (
        !filters ||
        (active === undefined && !closed && !tag && offset === 0)
      ) {
        this.eventsListCache = {
          data: events,
          timestamp: Date.now(),
        };
      }

      logger.info(`[PolymarketService] Fetched ${events.length} events`);
      return events;
    });
  }

  /**
   * Get event detail by ID or slug
   *
   * Fetches complete event data including all associated markets.
   * Results are cached with LRU eviction.
   *
   * @param eventIdOrSlug - Event ID or URL slug
   * @returns Event detail with associated markets
   */
  async getEventDetail(eventIdOrSlug: string): Promise<PolymarketEventDetail> {
    logger.info(`[PolymarketService] Fetching event detail: ${eventIdOrSlug}`);

    // Check LRU cache
    const cached = this.getCached(
      eventIdOrSlug,
      this.eventsCache,
      this.eventsCacheOrder,
      this.eventCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached event (${eventIdOrSlug})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      // Gamma API: GET /events/{id} for numeric id, GET /events/slug/{slug} for slug (per fetch guide)
      const isNumericId = /^\d+$/.test(eventIdOrSlug.trim());
      const path = isNumericId
        ? `events/${eventIdOrSlug}`
        : `events/slug/${encodeURIComponent(eventIdOrSlug.trim())}`;
      const url = `${this.gammaApiUrl}/${path}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Gamma API error: ${response.status} ${response.statusText}`,
        );
      }

      const event = (await response.json()) as PolymarketEventDetail;

      // Update LRU cache
      this.setCached(
        eventIdOrSlug,
        {
          data: event,
          timestamp: Date.now(),
        },
        this.eventsCache,
        this.eventsCacheOrder,
        this.maxEventCacheSize,
      );

      logger.info(
        `[PolymarketService] Fetched event: ${event.title} (${event.markets?.length || 0} markets)`,
      );
      return event;
    });
  }

  /**
   * Phase 3B: Market Analytics Methods
   */

  /**
   * Get market-wide open interest (total value locked)
   *
   * Fetches total value locked across all Polymarket markets.
   * Results are cached for 30s as analytics change less frequently.
   *
   * @returns Open interest data with total value and market count
   */
  async getOpenInterest(): Promise<OpenInterestData> {
    logger.info("[PolymarketService] Fetching open interest");

    // Check cache
    if (this.openInterestCache) {
      const age = Date.now() - this.openInterestCache.timestamp;
      if (age < this.analyticsCacheTtl) {
        logger.debug(
          `[PolymarketService] Returning cached open interest (age: ${age}ms)`,
        );
        return this.openInterestCache.data;
      }
    }

    return this.retryFetch(async () => {
      const url = `${this.dataApiUrl}/oi`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Data API error: ${response.status} ${response.statusText}`,
        );
      }

      // API returns array format: [{"market": "GLOBAL", "value": 344230134.862965}]
      const responseData = (await response.json()) as Array<{
        market: string;
        value: number;
      }>;
      const rawData = responseData[0] || { market: "GLOBAL", value: 0 };

      // Transform to expected format
      const data: OpenInterestData = {
        total_value: rawData.value.toString(),
        timestamp: Date.now(),
      };

      // Update cache
      this.openInterestCache = {
        data,
        timestamp: Date.now(),
      };

      logger.info(
        `[PolymarketService] Fetched open interest: ${data.total_value}`,
      );
      return data;
    });
  }

  /**
   * Get live trading volume (24h rolling)
   *
   * Fetches 24h trading volume by aggregating from Gamma API markets endpoint.
   * The data-api /live-volume endpoint is unreliable, so we calculate from
   * individual market volume24hr fields.
   * Results are cached for 30s as analytics change less frequently.
   *
   * @returns Volume data with 24h total and per-market breakdown
   */
  async getLiveVolume(): Promise<VolumeData> {
    logger.info("[PolymarketService] Fetching live volume");

    // Check cache
    if (this.liveVolumeCache) {
      const age = Date.now() - this.liveVolumeCache.timestamp;
      if (age < this.analyticsCacheTtl) {
        logger.debug(
          `[PolymarketService] Returning cached live volume (age: ${age}ms)`,
        );
        return this.liveVolumeCache.data;
      }
    }

    return this.retryFetch(async () => {
      // Fetch top markets by 24h volume from Gamma API
      // The data-api /live-volume endpoint returns zero, so we aggregate from markets
      const url = `${this.gammaApiUrl}/markets?active=true&closed=false&limit=500&order=volume24hr&ascending=false`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Gamma API error: ${response.status} ${response.statusText}`,
        );
      }

      const markets = (await response.json()) as Array<{
        conditionId: string;
        question: string;
        volume24hr: number;
        volumeNum?: number;
      }>;

      // Aggregate total 24h volume from all fetched markets
      const totalVolume = markets.reduce(
        (sum, m) => sum + (m.volume24hr || 0),
        0,
      );

      // Transform to expected format with top markets
      const data: VolumeData = {
        total_volume_24h: totalVolume.toFixed(2),
        markets: markets.slice(0, 20).map((m) => ({
          condition_id: m.conditionId,
          volume: (m.volume24hr || 0).toFixed(2),
          question: m.question,
        })),
        timestamp: Date.now(),
      };

      // Update cache
      this.liveVolumeCache = {
        data,
        timestamp: Date.now(),
      };

      logger.info(
        `[PolymarketService] Fetched live volume: $${(totalVolume / 1_000_000).toFixed(2)}M from ${markets.length} markets`,
      );
      return data;
    });
  }

  /**
   * Get bid-ask spreads for markets
   *
   * Fetches spread analysis for assessing liquidity quality.
   * Results are cached for 30s as analytics change less frequently.
   *
   * @returns Array of spread data for markets
   */
  async getSpreads(limit: number = 20): Promise<SpreadData[]> {
    logger.info(
      `[PolymarketService] Fetching spreads for top ${limit} markets`,
    );

    // Check cache
    if (this.spreadsCache) {
      const age = Date.now() - this.spreadsCache.timestamp;
      if (age < this.analyticsCacheTtl) {
        logger.debug(
          `[PolymarketService] Returning cached spreads (age: ${age}ms)`,
        );
        return this.spreadsCache.data.slice(0, limit);
      }
    }

    return this.retryFetch(async () => {
      // Fetch active markets with high volume
      const markets = await this.getActiveMarkets(limit);

      if (markets.length === 0) {
        logger.warn(
          "[PolymarketService] No active markets found for spread calculation",
        );
        return [];
      }

      // Fetch spreads for each market in parallel using the CLOB API
      const spreadPromises = markets.map(async (market) => {
        try {
          // Parse clobTokenIds if available
          let tokenIds: string[] = [];
          if (market.clobTokenIds) {
            try {
              tokenIds = JSON.parse(market.clobTokenIds as any);
            } catch (e) {
              logger.debug(
                `[PolymarketService] Failed to parse clobTokenIds for ${market.conditionId}`,
              );
              return null;
            }
          }

          if (tokenIds.length === 0) {
            logger.debug(
              `[PolymarketService] No token IDs for ${market.conditionId}`,
            );
            return null;
          }

          // Use the first token ID (YES token) to get spread
          const tokenId = tokenIds[0];
          const spreadUrl = `${this.clobApiUrl}/spread?token_id=${tokenId}`;

          const response = await this.fetchWithTimeout(spreadUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            logger.debug(
              `[PolymarketService] Failed to fetch spread for ${market.question}: ${response.status}`,
            );
            return null;
          }

          const spreadResponse = (await response.json()) as { spread: string };
          const spread = parseFloat(spreadResponse.spread);

          // Fetch orderbook to get best bid/ask prices for additional context
          const orderbook = await this.getOrderBook(tokenId);
          const bestBid = orderbook.bids[0]?.price
            ? parseFloat(orderbook.bids[0].price)
            : 0;
          const bestAsk = orderbook.asks[0]?.price
            ? parseFloat(orderbook.asks[0].price)
            : 0;

          // Skip if no liquidity
          if (bestBid === 0 || bestAsk === 0) {
            logger.debug(
              `[PolymarketService] No liquidity for ${market.question}`,
            );
            return null;
          }

          const spreadPercentage = ((spread / bestAsk) * 100).toFixed(2);

          // Calculate liquidity score based on spread
          let liquidityScore = 0;
          if (spread < 0.01)
            liquidityScore = 90 + (1 - spread / 0.01) * 10; // 90-100 for <1% spread
          else if (spread < 0.05)
            liquidityScore = 70 + (1 - spread / 0.05) * 20; // 70-90 for 1-5%
          else if (spread < 0.1)
            liquidityScore = 50 + (1 - spread / 0.1) * 20; // 50-70 for 5-10%
          else liquidityScore = Math.max(0, 50 - spread * 100); // <50 for >10%

          const spreadData: SpreadData = {
            condition_id: market.conditionId,
            spread: spread.toFixed(4),
            spread_percentage: spreadPercentage,
            best_bid: bestBid.toFixed(4),
            best_ask: bestAsk.toFixed(4),
            question: market.question,
            liquidity_score: Math.round(liquidityScore),
          };

          return spreadData;
        } catch (error) {
          logger.debug(
            `[PolymarketService] Failed to fetch spread for ${market.question}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return null;
        }
      });

      const results = await Promise.all(spreadPromises);
      const spreads = results.filter((s): s is SpreadData => s !== null);

      // Update cache
      this.spreadsCache = {
        data: spreads,
        timestamp: Date.now(),
      };

      logger.info(
        `[PolymarketService] Fetched spreads for ${spreads.length}/${markets.length} markets`,
      );
      return spreads;
    });
  }

  /**
   * Phase 3A: Orderbook Methods
   */

  /**
   * Get orderbook for a single token with summary metrics
   *
   * Fetches orderbook from CLOB API and calculates best bid/ask, spread, and mid price.
   * Results are cached for 10-15s (orderbooks change frequently).
   *
   * @param tokenId - ERC1155 conditional token ID
   * @param side - Optional filter to BUY or SELL side
   * @returns Orderbook summary with bids, asks, and calculated metrics
   */
  async getOrderbook(
    tokenId: string,
    side?: "BUY" | "SELL",
  ): Promise<OrderbookSummary> {
    logger.info(
      `[PolymarketService] Fetching orderbook for token: ${tokenId}${side ? ` (${side} side)` : ""}`,
    );

    return this.retryFetch(async () => {
      const queryParams = new URLSearchParams();
      queryParams.set("token_id", tokenId);
      if (side) {
        queryParams.set("side", side);
      }

      const url = `${this.clobApiUrl}/book?${queryParams.toString()}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `CLOB API error: ${response.status} ${response.statusText}`,
        );
      }

      const orderbook = (await response.json()) as OrderBook;

      // Calculate summary metrics
      const bestBid =
        orderbook.bids.length > 0 ? orderbook.bids[0].price : undefined;
      const bestAsk =
        orderbook.asks.length > 0 ? orderbook.asks[0].price : undefined;

      let spread: string | undefined;
      let midPrice: string | undefined;

      if (bestBid && bestAsk) {
        const bidNum = parseFloat(bestBid);
        const askNum = parseFloat(bestAsk);
        spread = (askNum - bidNum).toFixed(4);
        midPrice = ((bidNum + askNum) / 2).toFixed(4);
      }

      const summary: OrderbookSummary = {
        token_id: tokenId,
        market: orderbook.market,
        asset_id: orderbook.asset_id,
        timestamp: orderbook.timestamp,
        hash: (orderbook as any).hash,
        bids: orderbook.bids,
        asks: orderbook.asks,
        best_bid: bestBid,
        best_ask: bestAsk,
        spread,
        mid_price: midPrice,
      };

      logger.info(
        `[PolymarketService] Fetched orderbook - ${orderbook.bids.length} bids, ${orderbook.asks.length} asks, ` +
          `best: ${bestBid || "N/A"}/${bestAsk || "N/A"}`,
      );

      return summary;
    });
  }

  /**
   * Get orderbooks for multiple tokens
   *
   * Fetches orderbooks for up to 100 tokens. First attempts batch request,
   * falls back to parallel individual requests if batch API fails.
   * Results are cached for 10-15s (orderbooks change frequently).
   *
   * @param tokenIds - Array of ERC1155 conditional token IDs (max 100)
   * @returns Array of orderbook summaries
   */
  async getOrderbooks(tokenIds: string[]): Promise<OrderbookSummary[]> {
    logger.info(
      `[PolymarketService] Fetching orderbooks for ${tokenIds.length} tokens`,
    );

    if (tokenIds.length === 0) {
      return [];
    }

    if (tokenIds.length > 100) {
      logger.warn(
        `[PolymarketService] Token IDs exceeds max of 100, truncating to first 100`,
      );
      tokenIds = tokenIds.slice(0, 100);
    }

    // Try batch endpoint first, fall back to parallel individual requests
    try {
      const url = `${this.clobApiUrl}/books`;
      const response = await this.fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_ids: tokenIds }),
      });

      if (response.ok) {
        const orderbooks = (await response.json()) as OrderBook[];

        // Convert to summaries with calculated metrics
        const summaries: OrderbookSummary[] = orderbooks.map((orderbook) => {
          const tokenId = orderbook.asset_id;
          const bestBid =
            orderbook.bids.length > 0 ? orderbook.bids[0].price : undefined;
          const bestAsk =
            orderbook.asks.length > 0 ? orderbook.asks[0].price : undefined;

          let spread: string | undefined;
          let midPrice: string | undefined;

          if (bestBid && bestAsk) {
            const bidNum = parseFloat(bestBid);
            const askNum = parseFloat(bestAsk);
            spread = (askNum - bidNum).toFixed(4);
            midPrice = ((bidNum + askNum) / 2).toFixed(4);
          }

          return {
            token_id: tokenId,
            market: orderbook.market,
            asset_id: orderbook.asset_id,
            timestamp: orderbook.timestamp,
            hash: (orderbook as any).hash,
            bids: orderbook.bids,
            asks: orderbook.asks,
            best_bid: bestBid,
            best_ask: bestAsk,
            spread,
            mid_price: midPrice,
          };
        });

        logger.info(
          `[PolymarketService] Fetched ${summaries.length} orderbooks via batch`,
        );
        return summaries;
      }

      // Batch failed, log and fall through to individual requests
      logger.warn(
        `[PolymarketService] Batch orderbooks API failed (${response.status}), falling back to individual requests`,
      );
    } catch (error) {
      logger.warn(
        `[PolymarketService] Batch orderbooks failed: ${error instanceof Error ? error.message : String(error)}, falling back to individual requests`,
      );
    }

    // Fallback: fetch orderbooks individually in parallel
    logger.info(
      `[PolymarketService] Fetching ${tokenIds.length} orderbooks individually (fallback)`,
    );

    const orderbookPromises = tokenIds.map(async (tokenId) => {
      try {
        return await this.getOrderbook(tokenId);
      } catch (error) {
        logger.warn(
          `[PolymarketService] Failed to fetch orderbook for ${tokenId.slice(0, 10)}...: ${error instanceof Error ? error.message : String(error)}`,
        );
        return null;
      }
    });

    const results = await Promise.all(orderbookPromises);
    const summaries = results.filter((r): r is OrderbookSummary => r !== null);

    logger.info(
      `[PolymarketService] Fetched ${summaries.length}/${tokenIds.length} orderbooks individually`,
    );
    return summaries;
  }

  /**
   * Phase 5A: Extended Portfolio Methods
   */

  /**
   * Get or derive proxy address
   * Helper method to handle both EOA and proxy addresses
   */
  private async getOrDeriveProxyAddress(
    walletAddress: string,
  ): Promise<string> {
    // Simple heuristic: if address looks like a proxy (starts with certain patterns),
    // use as-is, otherwise derive it
    // For now, always derive to ensure consistency
    return this.deriveProxyAddress(walletAddress);
  }

  /**
   * Get closed positions (historical resolved markets)
   *
   * Fetches resolved positions with final outcomes and payouts.
   * Results are cached for 60s as historical data is stable.
   *
   * @param walletAddress - User's EOA or proxy wallet address
   * @returns Array of closed positions with win/loss info
   */
  async getClosedPositions(walletAddress: string): Promise<any[]> {
    logger.info(
      `[PolymarketService] Fetching closed positions for wallet: ${walletAddress}`,
    );

    // Get proxy address (derive if EOA, pass through if already proxy)
    const proxyAddress = await this.getOrDeriveProxyAddress(walletAddress);

    // Check LRU cache
    const cached = this.getCached(
      proxyAddress,
      this.closedPositionsCache,
      this.closedPositionsCacheOrder,
      this.closedPositionsCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached closed positions (wallet: ${proxyAddress})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      const url = `${this.dataApiUrl}/closed-positions?user=${proxyAddress}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Data API error: ${response.status} ${response.statusText}`,
        );
      }

      // Transform API response to ClosedPosition interface
      // API returns camelCase fields, interface expects snake_case
      const rawPositions = (await response.json()) as Array<any>;
      const closedPositions: ClosedPosition[] = rawPositions.map((raw) => {
        // Calculate pnl_percentage: (realizedPnl / invested) * 100
        const invested = raw.totalBought * raw.avgPrice;
        const pnlPercentage =
          invested > 0
            ? ((raw.realizedPnl / invested) * 100).toFixed(2)
            : "0.00";

        // Calculate payout: totalBought * settlement price
        const payout = (raw.totalBought * raw.curPrice).toString();

        return {
          market: raw.title,
          condition_id: raw.conditionId,
          asset_id: raw.asset,
          outcome: raw.outcome.toUpperCase() as "YES" | "NO",
          size: raw.totalBought.toString(),
          avg_price: raw.avgPrice.toString(),
          settlement_price: raw.curPrice.toString(),
          pnl: raw.realizedPnl.toString(),
          pnl_percentage: pnlPercentage,
          closed_at: raw.timestamp,
          payout,
          won: raw.curPrice === 1,
        };
      });

      // Update LRU cache
      this.setCached(
        proxyAddress,
        {
          data: closedPositions,
          timestamp: Date.now(),
        },
        this.closedPositionsCache,
        this.closedPositionsCacheOrder,
        100, // Max 100 wallets cached
      );

      logger.info(
        `[PolymarketService] Fetched ${closedPositions.length} closed positions for wallet: ${proxyAddress}`,
      );
      return closedPositions;
    });
  }

  /**
   * Get user activity log (deposits, withdrawals, trades, redemptions)
   *
   * Fetches on-chain activity history for a wallet.
   * Results are cached for 60s as historical data is stable.
   *
   * @param walletAddress - User's EOA or proxy wallet address
   * @returns Array of user activity entries
   */
  async getUserActivity(walletAddress: string): Promise<UserActivity[]> {
    logger.info(
      `[PolymarketService] Fetching user activity for wallet: ${walletAddress}`,
    );

    // Get proxy address (derive if EOA, pass through if already proxy)
    const proxyAddress = await this.getOrDeriveProxyAddress(walletAddress);

    // Check LRU cache
    const cached = this.getCached(
      proxyAddress,
      this.userActivityCache,
      this.userActivityCacheOrder,
      this.userActivityCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached user activity (wallet: ${proxyAddress})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      const url = `${this.dataApiUrl}/activity?user=${proxyAddress}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Data API error: ${response.status} ${response.statusText}`,
        );
      }

      // Transform API response to UserActivity interface
      // API returns camelCase fields, interface expects snake_case
      const rawActivity = (await response.json()) as Array<any>;
      const activity: UserActivity[] = rawActivity.map((raw, index) => ({
        id: raw.transactionHash || `activity_${index}`,
        type: raw.type as "DEPOSIT" | "WITHDRAWAL" | "TRADE" | "REDEMPTION",
        amount: raw.usdcSize.toString(),
        timestamp: raw.timestamp,
        transaction_hash: raw.transactionHash,
        market: raw.title,
        outcome: raw.outcome?.toUpperCase() as "YES" | "NO" | undefined,
        status: "CONFIRMED" as const,
      }));

      // Update LRU cache
      this.setCached(
        proxyAddress,
        {
          data: activity,
          timestamp: Date.now(),
        },
        this.userActivityCache,
        this.userActivityCacheOrder,
        100, // Max 100 wallets cached
      );

      logger.info(
        `[PolymarketService] Fetched ${activity.length} activity entries for wallet: ${proxyAddress}`,
      );
      return activity;
    });
  }

  /**
   * Get top holders in a market
   *
   * Fetches major participants by position size.
   * Results are cached for 60s as holder data changes gradually.
   *
   * IMPORTANT: This endpoint requires the condition ID (hex string starting with 0x),
   * NOT the numeric market ID. Use the market's conditionId field.
   *
   * @param conditionId - Market condition ID (hex string, e.g., "0xfa48...")
   * @returns Array of top holders with position sizes
   */
  async getTopHolders(conditionId: string): Promise<TopHolder[]> {
    logger.info(
      `[PolymarketService] Fetching top holders for market: ${conditionId}`,
    );

    // Check LRU cache
    const cached = this.getCached(
      conditionId,
      this.topHoldersCache,
      this.topHoldersCacheOrder,
      this.topHoldersCacheTtl,
    );

    if (cached) {
      logger.debug(
        `[PolymarketService] Returning cached top holders (market: ${conditionId})`,
      );
      return cached.data;
    }

    return this.retryFetch(async () => {
      const url = `${this.dataApiUrl}/holders?market=${conditionId}`;
      const response = await this.fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(
          `Data API error: ${response.status} ${response.statusText}`,
        );
      }

      // API returns: [{token: string, holders: [{proxyWallet, amount, outcomeIndex, displayUsernamePublic, ...}]}]
      // Need to flatten to TopHolder[]
      const data = (await response.json()) as Array<{
        token: string;
        holders: Array<any>;
      }>;

      const holders: TopHolder[] = data.flatMap((group) =>
        group.holders.map((h) => ({
          address: h.proxyWallet,
          outcome: h.outcomeIndex === 0 ? "YES" : "NO",
          size: h.amount.toString(),
          value: "0", // Not provided by API
          percentage: "0", // Calculate if needed
          is_public: h.displayUsernamePublic,
        })),
      );

      // Update LRU cache
      this.setCached(
        conditionId,
        {
          data: holders,
          timestamp: Date.now(),
        },
        this.topHoldersCache,
        this.topHoldersCacheOrder,
        100, // Max 100 markets cached
      );

      logger.info(
        `[PolymarketService] Fetched ${holders.length} top holders for market: ${conditionId}`,
      );
      return holders;
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.marketCache.clear();
    this.marketCacheOrder = [];
    this.priceCache.clear();
    this.priceCacheOrder = [];
    this.priceHistoryCache.clear();
    this.priceHistoryCacheOrder = [];
    this.positionsCache.clear();
    this.positionsCacheOrder = [];
    this.tradesCache.clear();
    this.tradesCacheOrder = [];
    this.marketsListCache = null;
    this.eventsListCache = null;
    this.eventsCache.clear();
    this.eventsCacheOrder = [];
    this.openInterestCache = null;
    this.liveVolumeCache = null;
    this.spreadsCache = null;
    this.closedPositionsCache.clear();
    this.closedPositionsCacheOrder = [];
    this.userActivityCache.clear();
    this.userActivityCacheOrder = [];
    this.topHoldersCache.clear();
    this.topHoldersCacheOrder = [];
    logger.info("[PolymarketService] Cache cleared");
  }
}

export default PolymarketService;
