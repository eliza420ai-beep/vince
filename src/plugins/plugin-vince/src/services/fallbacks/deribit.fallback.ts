/**
 * Deribit Fallback Service
 *
 * Provides direct Deribit API access when plugin-deribit is not available.
 * Implements the IDeribitService interface for seamless integration.
 *
 * API: https://www.deribit.com/api/v2 (public, no auth required)
 */

import { logger } from "@elizaos/core";
import type {
  IDeribitService,
  IDeribitVolatilityIndex,
  IDeribitComprehensiveData,
  IDeribitOptionsSummary,
} from "../../types/external-services";

const DERIBIT_BASE_URL = "https://www.deribit.com/api/v2";
const CACHE_TTL_MS = 30_000; // 30 seconds
const REQUEST_DELAY_MS = 450; // Rate limiting delay
const FETCH_TIMEOUT_MS = 15_000; // 15s timeout per request
const MAX_RETRIES = 1; // One retry on transient failure
const RETRY_DELAY_MS = 2_000; // 2s before retry

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface DeribitResponse<T> {
  jsonrpc: string;
  id: number;
  result: T;
  error?: {
    code: number;
    message: string;
  };
}

interface VolatilityCandle {
  // [timestamp, open, high, low, close]
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
}

interface VolatilityIndexData {
  data: VolatilityCandle[];
  continuation: boolean;
  index_name: string;
}

interface BookSummaryItem {
  instrument_name: string;
  open_interest: number;
  volume: number;
  bid_price: number;
  ask_price: number;
  mark_price: number;
  underlying_price: number;
}

export class DeribitFallbackService implements IDeribitService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private lastRequestTime = 0;

  constructor() {
    logger.debug("[DeribitFallback] Fallback service initialized");
  }

  /**
   * Rate-limited fetch with caching, timeout, and retry
   */
  private async fetchDeribit<T>(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<T | null> {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
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

    const queryString = new URLSearchParams(params).toString();
    const url = `${DERIBIT_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ""}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 429) {
            logger.warn("[DeribitFallback] Rate limited, backing off");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return null;
          }
          logger.error(`[DeribitFallback] HTTP error: ${response.status}`);
          return null;
        }

        const json = (await response.json()) as DeribitResponse<T>;

        if (json.error) {
          logger.error(`[DeribitFallback] API error: ${json.error.message}`);
          return null;
        }

        this.cache.set(cacheKey, {
          data: json.result,
          timestamp: Date.now(),
        });

        return json.result;
      } catch (error) {
        const isRetryable =
          error instanceof TypeError ||
          (error instanceof DOMException && error.name === "AbortError");

        if (isRetryable && attempt < MAX_RETRIES) {
          logger.debug(
            `[DeribitFallback] Attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }

        logger.warn(`[DeribitFallback] Fetch failed: ${error instanceof DOMException ? error.name : (error as Error).message}`);
        return null;
      }
    }

    return null;
  }

  /**
   * Get DVOL (Deribit Volatility Index) for BTC or ETH
   */
  async getVolatilityIndex(
    asset: "BTC" | "ETH",
  ): Promise<IDeribitVolatilityIndex | null> {
    try {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      const data = await this.fetchDeribit<VolatilityIndexData>(
        "/public/get_volatility_index_data",
        {
          currency: asset,
          start_timestamp: String(oneDayAgo),
          end_timestamp: String(now),
          resolution: "60", // 1-hour candles
        },
      );

      if (!data || !data.data || data.data.length === 0) {
        logger.debug(`[DeribitFallback] No DVOL data for ${asset}`);
        return null;
      }

      const candles = data.data;
      const lastCandle = candles[candles.length - 1];
      const firstCandle = candles[0];

      // Extract OHLC values: [timestamp, open, high, low, close]
      const current = lastCandle[4]; // Close price
      const open24h = firstCandle[1]; // Open from 24h ago

      // Calculate 24h change
      const change24h = open24h > 0 ? ((current - open24h) / open24h) * 100 : 0;

      // Find high and low over 24h
      let high24h = 0;
      let low24h = Infinity;
      for (const candle of candles) {
        if (candle[2] > high24h) high24h = candle[2];
        if (candle[3] < low24h) low24h = candle[3];
      }

      return {
        current,
        change24h,
        high24h,
        low24h: low24h === Infinity ? undefined : low24h,
      };
    } catch (error) {
      logger.error(`[DeribitFallback] getVolatilityIndex error: ${error}`);
      return null;
    }
  }

  /**
   * Get comprehensive options data including put/call ratio
   */
  async getComprehensiveData(
    currency: "BTC" | "ETH" | "SOL",
  ): Promise<IDeribitComprehensiveData | null> {
    try {
      // Note: SOL options are limited on Deribit, but we try anyway
      const bookSummary = await this.fetchDeribit<BookSummaryItem[]>(
        "/public/get_book_summary_by_currency",
        {
          currency: currency,
          kind: "option",
        },
      );

      if (!bookSummary || bookSummary.length === 0) {
        logger.debug(
          `[DeribitFallback] No options book summary for ${currency}`,
        );
        return null;
      }

      // Calculate put/call ratio from open interest
      let callOpenInterest = 0;
      let putOpenInterest = 0;

      for (const item of bookSummary) {
        // Instrument name format: BTC-31JAN25-100000-C or BTC-31JAN25-100000-P
        const parts = item.instrument_name.split("-");
        const optionType = parts[parts.length - 1];

        const oi = item.open_interest || 0;

        if (optionType === "C") {
          callOpenInterest += oi;
        } else if (optionType === "P") {
          putOpenInterest += oi;
        }
      }

      const totalOpenInterest = callOpenInterest + putOpenInterest;
      const putCallRatio =
        callOpenInterest > 0 ? putOpenInterest / callOpenInterest : 0;

      const optionsSummary: IDeribitOptionsSummary = {
        putCallRatio,
        totalOpenInterest,
        callOpenInterest,
        putOpenInterest,
      };

      logger.debug(
        `[DeribitFallback] ${currency} P/C Ratio: ${putCallRatio.toFixed(3)}, ` +
          `Calls: ${callOpenInterest.toFixed(2)}, Puts: ${putOpenInterest.toFixed(2)}`,
      );

      return {
        optionsSummary,
      };
    } catch (error) {
      logger.error(`[DeribitFallback] getComprehensiveData error: ${error}`);
      return null;
    }
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
