/**
 * OpenSea Fallback Service
 *
 * Provides direct OpenSea API access when plugin-nft-collections is not available.
 * Implements the IOpenSeaService interface for seamless integration.
 *
 * API: https://api.opensea.io/api/v2 (optional API key for higher rate limits)
 */

import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import type {
  IOpenSeaService,
  IOpenSeaFloorAnalysis,
  IOpenSeaFloorThickness,
  IOpenSeaVolumeMetrics,
  IOpenSeaRecentSales,
} from "../../types/external-services";

const OPENSEA_BASE_URL = "https://api.opensea.io/api/v2";
const CACHE_TTL_MS = 60_000; // 60 seconds
const REQUEST_DELAY_MS = 250; // 4 req/s without API key

// ETH price fallback (will try to get real price)
const DEFAULT_ETH_PRICE_USD = 3000;

/** Log 401 (missing/invalid API key) once to avoid spamming every collection */
let hasLogged401 = false;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// API response types
interface CollectionStats {
  total: {
    volume: number;
    sales: number;
    average_price: number;
    num_owners: number;
    market_cap: number;
    floor_price: number;
    floor_price_symbol: string;
  };
  intervals: Array<{
    interval: string;
    volume: number;
    volume_diff: number;
    volume_change: number;
    sales: number;
    sales_diff: number;
    average_price: number;
  }>;
}

interface Listing {
  order_hash: string;
  chain: string;
  price: {
    current: {
      currency: string;
      decimals: number;
      value: string;
    };
  };
  protocol_data?: {
    parameters?: {
      offer?: Array<{
        identifierOrCriteria?: string;
        identifier_or_criteria?: string;
      }>;
    };
  };
  maker?: string;
  /** Token identifier: contract:tokenId */
  token_id?: string;
  nft_id?: string;
}

interface ListingsResponse {
  listings: Listing[];
  next?: string;
}

/** OpenSea v2 events response (sale events) */
interface SaleEvent {
  event_type?: string;
  price?: string | number;
  amount?: string | number;
  total_price?: string | number;
  protocol_data?: {
    parameters?: {
      consideration?: Array<{ startAmount?: string; amount?: string }>;
    };
  };
  [key: string]: unknown;
}

interface EventsResponse {
  next?: string;
  asset_events?: SaleEvent[];
  events?: SaleEvent[];
}

export class OpenSeaFallbackService implements IOpenSeaService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private lastRequestTime = 0;
  private apiKey: string | null = null;
  private ethPriceUsd = DEFAULT_ETH_PRICE_USD;

  constructor(runtime?: IAgentRuntime) {
    // Runtime getSetting() only reads character.settings/secrets, not process.env.
    // So we check runtime first, then process.env so .env works without duplicating in character.
    const fromRuntime = runtime?.getSetting("OPENSEA_API_KEY") as
      | string
      | null
      | undefined;
    const fromEnv =
      typeof process !== "undefined" && process.env?.OPENSEA_API_KEY;
    const key =
      (fromRuntime && String(fromRuntime).trim()) ||
      (fromEnv && String(fromEnv).trim()) ||
      null;
    this.apiKey = key || null;
    logger.debug(
      `[OpenSeaFallback] Fallback service initialized (API key: ${this.apiKey ? "yes" : "no"})`,
    );
  }

  /**
   * Convert wei string to ETH
   */
  private weiToEth(weiString: string, decimals = 18): number {
    try {
      const wei = BigInt(weiString);
      const divisor = BigInt(10 ** decimals);
      // Convert to float by doing integer division and handling remainder
      const whole = Number(wei / divisor);
      const remainder = Number(wei % divisor) / Number(divisor);
      return whole + remainder;
    } catch {
      return 0;
    }
  }

  /**
   * Rate-limited GET request to OpenSea API
   */
  private async fetchOpenSea<T>(endpoint: string): Promise<T | null> {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest),
      );
    }
    this.lastRequestTime = Date.now();

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (this.apiKey) {
        headers["x-api-key"] = this.apiKey;
      }

      const url = `${OPENSEA_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        if (response.status === 429) {
          logger.warn("[OpenSeaFallback] Rate limited, backing off");
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return null;
        }
        if (response.status === 404) {
          logger.debug(`[OpenSeaFallback] Collection not found: ${endpoint}`);
          return null;
        }
        if (response.status === 401) {
          if (!hasLogged401) {
            hasLogged401 = true;
            logger.info(
              "[OpenSeaFallback] OpenSea API key missing or invalid (401) - NFT floor data unavailable. Set OPENSEA_API_KEY for full data.",
            );
          }
          return null;
        }
        logger.error(`[OpenSeaFallback] HTTP error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as T;

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      logger.error(`[OpenSeaFallback] Fetch error: ${error}`);
      return null;
    }
  }

  /** Extract price in ETH from a listing (handles v1/v2 API variations) */
  private extractPriceEth(l: Listing): number {
    try {
      const p = l?.price?.current;
      if (!p) return 0;
      const value = typeof p.value === "string" ? p.value : String(p.value ?? "0");
      const decimals = typeof p.decimals === "number" ? p.decimals : 18;
      return this.weiToEth(value, decimals);
    } catch {
      return 0;
    }
  }

  /** Extract unique token identifier for deduplication (one price per token) */
  private getTokenKey(l: Listing): string {
    const offer = l.protocol_data?.parameters?.offer?.[0];
    const id =
      l.token_id ??
      l.nft_id ??
      offer?.identifierOrCriteria ??
      (offer as { identifier_or_criteria?: string })?.identifier_or_criteria ??
      l.order_hash;
    return String(id ?? l.order_hash);
  }

  /**
   * Calculate floor thickness from listings.
   * Deduplicates by token (keeps cheapest listing per unique NFT) so gaps match OpenSea UI.
   */
  private calculateFloorThickness(
    floorPrice: number,
    listings: Listing[],
  ): IOpenSeaFloorThickness {
    // Deduplicate by token: keep cheapest listing per unique NFT (matches OpenSea UI)
    const byToken = new Map<string, number>();
    for (const l of listings) {
      const price = this.extractPriceEth(l);
      if (price <= 0) continue;
      const key = this.getTokenKey(l);
      const existing = byToken.get(key);
      if (existing === undefined || price < existing) {
        byToken.set(key, price);
      }
    }

    const sortedListings = Array.from(byToken.values()).sort((a, b) => a - b);

    if (sortedListings.length === 0) {
      return {
        score: 50,
        description: "Unknown",
        gaps: { to2nd: 0, to3rd: 0, to4th: 0, to5th: 0, to6th: 0, to10th: 0 },
        nftsNearFloor: 0,
      };
    }

    const floor = sortedListings[0] || floorPrice;

    // Gaps = ETH from floor to Nth cheapest unique token (exact, no hallucination)
    const gaps = {
      to2nd: sortedListings[1] != null ? sortedListings[1] - floor : 0,
      to3rd: sortedListings[2] != null ? sortedListings[2] - floor : 0,
      to4th: sortedListings[3] != null ? sortedListings[3] - floor : 0,
      to5th: sortedListings[4] != null ? sortedListings[4] - floor : 0,
      to6th: sortedListings[5] != null ? sortedListings[5] - floor : 0,
      to10th: sortedListings[9] != null ? sortedListings[9] - floor : 0,
    };

    // Count NFTs within 5% of floor
    const threshold = floor * 1.05;
    const nftsNearFloor = sortedListings.filter((p) => p <= threshold).length;

    // Calculate score (0-100, lower = thinner = more opportunity)
    // Based on: how big are the gaps? how many NFTs near floor?
    let score = 50;

    // Gap scoring (bigger gaps = lower score = thinner floor)
    const avgGapPercent = floor > 0 ? (gaps.to5th / floor) * 100 : 0;
    if (avgGapPercent > 20) score -= 30;
    else if (avgGapPercent > 10) score -= 20;
    else if (avgGapPercent > 5) score -= 10;
    else score += 10;

    // Near-floor count scoring (fewer = lower score = thinner floor)
    if (nftsNearFloor <= 2) score -= 20;
    else if (nftsNearFloor <= 5) score -= 10;
    else if (nftsNearFloor >= 15) score += 15;
    else if (nftsNearFloor >= 10) score += 10;

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine description
    let description: string;
    if (score <= 20) description = "Very Thin";
    else if (score <= 40) description = "Thin";
    else if (score <= 60) description = "Medium";
    else if (score <= 80) description = "Thick";
    else description = "Very Thick";

    return {
      score,
      description,
      gaps,
      nftsNearFloor,
    };
  }

  /**
   * Fetch recent sale prices (ETH). Max pain: if all below floor, floor may not hold.
   */
  private async fetchRecentSales(
    slug: string,
    floorPrice: number,
  ): Promise<IOpenSeaRecentSales | undefined> {
    try {
      const resp = await this.fetchOpenSea<EventsResponse>(
        `/events/collection/${slug}?event_type=sale&limit=10`,
      );
      const events = resp?.asset_events ?? resp?.events ?? [];
      const prices: number[] = [];
      for (const e of events) {
        const eth = this.extractSalePriceEth(e);
        if (eth > 0) prices.push(eth);
      }
      if (prices.length === 0) return undefined;
      const maxSaleEth = Math.max(...prices);
      const allBelowFloor = floorPrice > 0 && maxSaleEth < floorPrice;
      return {
        prices,
        allBelowFloor,
        maxSaleEth,
      };
    } catch {
      return undefined;
    }
  }

  private extractSalePriceEth(e: SaleEvent): number {
    try {
      const v = e.price ?? e.amount ?? e.total_price;
      if (v != null) {
        const str = typeof v === "string" ? v : String(v);
        return this.weiToEth(str, 18);
      }
      const consideration = e.protocol_data?.parameters?.consideration;
      if (consideration?.length) {
        let total = 0n;
        for (const c of consideration) {
          const amt = c.startAmount ?? c.amount ?? "0";
          total += BigInt(amt);
        }
        return this.weiToEth(total.toString(), 18);
      }
    } catch {
      /* ignore */
    }
    return 0;
  }

  /**
   * Analyze floor opportunities for a collection
   */
  async analyzeFloorOpportunities(
    slug: string,
    options?: { maxListings?: number },
  ): Promise<IOpenSeaFloorAnalysis> {
    const maxListings = options?.maxListings ?? 50;

    const emptyResult = (): IOpenSeaFloorAnalysis => ({
      collectionSlug: slug,
      collectionName: slug,
      floorPrice: 0,
      floorPriceUsd: 0,
      floorThickness: {
        score: 50,
        description: "Unknown",
        gaps: { to2nd: 0, to3rd: 0, to4th: 0, to5th: 0, to6th: 0, to10th: 0 },
        nftsNearFloor: 0,
      },
      volumeMetrics: {
        salesPerDay: 0,
        volume24h: 0,
        volume7d: 0,
      },
    });

    try {
      // Fetch collection stats (returns null on 401 / no API key)
      const stats = await this.fetchOpenSea<CollectionStats>(
        `/collections/${slug}/stats`,
      );

      if (!stats || !stats.total) {
        return emptyResult();
      }

      const floorPrice = stats.total.floor_price || 0;

      // Fetch listings for floor thickness (enough unique tokens for gap calc)
      const listingsResponse = await this.fetchOpenSea<ListingsResponse>(
        `/listings/collection/${slug}/all?limit=${maxListings}`,
      );
      const listings = listingsResponse?.listings ?? [];

      // CryptoPunks: OpenSea's listings API returns empty for the legacy contract.
      // Using wrapped-cryptopunks would mix floor (29.89) with different-market gaps
      // (wrapped floor ~13 ETH) → nonsensical numbers. We show no gaps instead.

      // Calculate floor thickness
      const floorThickness = this.calculateFloorThickness(floorPrice, listings);

      // Extract volume metrics
      const interval24h = stats.intervals?.find(
        (i) => i.interval === "one_day",
      );
      const interval7d = stats.intervals?.find(
        (i) => i.interval === "seven_day",
      );

      const volumeMetrics: IOpenSeaVolumeMetrics = {
        salesPerDay: interval24h?.sales || 0,
        volume24h: interval24h?.volume || 0,
        volume7d: interval7d?.volume || 0,
      };

      const recentSales = await this.fetchRecentSales(slug, floorPrice);

      const result: IOpenSeaFloorAnalysis = {
        collectionSlug: slug,
        collectionName: slug, // OpenSea stats don't include name, use slug
        floorPrice,
        floorPriceUsd: floorPrice * this.ethPriceUsd,
        floorThickness,
        volumeMetrics,
        recentSales,
      };

      logger.debug(
        `[OpenSeaFallback] ${slug} - Floor: ${floorPrice.toFixed(4)} ETH, ` +
          `Thickness: ${floorThickness.description} (${floorThickness.score}), ` +
          `Near floor: ${floorThickness.nftsNearFloor}`,
      );

      return result;
    } catch (error) {
      logger.debug(
        `[OpenSeaFallback] analyzeFloorOpportunities ${slug}: ${error}`,
      );
      return emptyResult();
    }
  }

  /**
   * Update ETH price (can be called periodically)
   */
  setEthPrice(priceUsd: number): void {
    this.ethPriceUsd = priceUsd;
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
