/**
 * Hyperliquid Fallback Service
 *
 * Provides direct Hyperliquid API access when plugin-hyperliquid is not available.
 * Implements the IHyperliquidService interface for seamless integration.
 *
 * Features (ported from plugin-hyperliquid):
 * - RequestSemaphore for proper concurrent request limiting
 * - In-flight request deduplication (prevents duplicate concurrent requests)
 * - Global backoff tracking (blocks ALL requests after 429s)
 * - Circuit breaker (stops requests after consecutive failures)
 * - Retry logic with exponential backoff
 * - Per-endpoint cache TTLs
 *
 * API: https://api.hyperliquid.xyz/info (public, no auth required)
 */

import { logger } from "@elizaos/core";
import type {
  IHyperliquidService,
  IHyperliquidOptionsPulse,
  IHyperliquidCrossVenueFunding,
  IHyperliquidAssetPulse,
  IHyperliquidCrossVenueAsset,
} from "../../types/external-services";

// ============================================================================
// CONFIGURATION
// ============================================================================

const HYPERLIQUID_BASE_URL = "https://api.hyperliquid.xyz/info";
const REQUEST_TIMEOUT_MS = 15000;

// Per-endpoint cache TTLs for optimal data freshness
const CACHE_TTLS = {
  metaAndAssetCtxs: 60 * 1000,    // 60s - funding data
  predictedFundings: 60 * 1000,   // 60s - cross-venue data
  optionsPulse: 2 * 60 * 1000,   // 2 min - aggregated pulse
  crossVenue: 2 * 60 * 1000,      // 2 min - aggregated cross-venue
  perpsAtOICap: 60 * 1000,       // 60s - OI cap list
  fundingHistory: 60 * 1000,     // 60s per asset - funding history for percentile
};

// Threshold for identifying arbitrage opportunities (0.01% = 0.0001)
const ARBITRAGE_THRESHOLD = 0.0001;

// ============================================================================
// REQUEST SEMAPHORE
// ============================================================================

/**
 * Simple semaphore to limit concurrent API requests
 * Prevents rate limiting by throttling parallel requests
 */
class RequestSemaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(maxConcurrent: number) {
    this.permits = maxConcurrent;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// API response types
interface HyperliquidAssetCtx {
  funding: string; // Current funding rate as string
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string;
  oraclePx: string;
  markPx: string;
  midPx: string;
  impactPxs: [string, string];
}

interface HyperliquidMeta {
  universe: {
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
  }[];
}

type MetaAndAssetCtxsResponse = [HyperliquidMeta, HyperliquidAssetCtx[]];

// Predicted funding structure: [coin, [[venue, {fundingRate, nextFundingTime}], ...]]
type VenueFunding = [string, { fundingRate: string; nextFundingTime: number }];
type CoinPredictedFunding = [string, VenueFunding[]];
type PredictedFundingsResponse = CoinPredictedFunding[];

// fundingHistory response: array of { coin, fundingRate, premium?, time }
interface FundingHistoryEntry {
  coin: string;
  fundingRate: string;
  premium?: string;
  time: number;
}
type FundingHistoryResponse = FundingHistoryEntry[];

// Funding regime from history (percentile of current rate vs recent history)
export interface HyperliquidFundingRegime {
  percentile: number;   // 0–100, where 100 = current is highest
  isExtremeLong: boolean;   // percentile >= 90 (longs crowded)
  isExtremeShort: boolean;  // percentile <= 10 (shorts crowded)
}

export class HyperliquidFallbackService implements IHyperliquidService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  // Circuit breaker state for resilience
  private consecutiveErrors = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;
  private readonly CIRCUIT_THRESHOLD = 5;
  private readonly CIRCUIT_RESET_MS = 60000; // 60s reset

  // Request throttling
  private readonly requestSemaphore = new RequestSemaphore(1); // Max 1 concurrent
  private readonly MIN_REQUEST_INTERVAL_MS = 500; // 500ms between requests
  private lastRequestTimestamp = 0;

  // In-flight request deduplication
  private inFlightRequests: Map<string, Promise<unknown>> = new Map();

  // Global rate limit tracking
  private globalBackoffUntil = 0;
  private consecutiveRateLimits = 0;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY_MS = 1000;
  private readonly MAX_GLOBAL_BACKOFF_MS = 60000;

  constructor() {
    logger.info("[HyperliquidFallback] ✅ Fallback service initialized (API: https://api.hyperliquid.xyz/info)");
  }

  /**
   * Test the Hyperliquid API connection and return diagnostic info
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      const data = await this.postHyperliquid<MetaAndAssetCtxsResponse>(
        { type: "metaAndAssetCtxs" },
        5000 // Short cache for test
      );

      if (!data || !Array.isArray(data) || data.length < 2) {
        return { success: false, message: "API returned invalid data structure" };
      }

      const [meta, assetCtxs] = data;
      const btcIdx = meta.universe.findIndex((u) => u.name.toUpperCase() === "BTC");
      const ethIdx = meta.universe.findIndex((u) => u.name.toUpperCase() === "ETH");

      const btcFunding = btcIdx >= 0 ? parseFloat(assetCtxs[btcIdx]?.funding || "0") : null;
      const ethFunding = ethIdx >= 0 ? parseFloat(assetCtxs[ethIdx]?.funding || "0") : null;

      logger.info(
        `[HyperliquidFallback] 🔗 API TEST SUCCESS | ` +
        `Assets: ${meta.universe.length} | ` +
        `BTC funding: ${btcFunding !== null ? (btcFunding * 100).toFixed(4) + "%" : "N/A"} | ` +
        `ETH funding: ${ethFunding !== null ? (ethFunding * 100).toFixed(4) + "%" : "N/A"}`
      );

      return {
        success: true,
        message: `Connected! ${meta.universe.length} assets available`,
        data: {
          assetCount: meta.universe.length,
          btcFunding8h: btcFunding,
          ethFunding8h: ethFunding,
          sampleAssets: meta.universe.slice(0, 5).map((u) => u.name),
        },
      };
    } catch (error) {
      logger.error(`[HyperliquidFallback] ❌ API TEST FAILED: ${error}`);
      return { success: false, message: `Connection failed: ${error}` };
    }
  }

  // ============================================================================
  // CIRCUIT BREAKER
  // ============================================================================

  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    if (Date.now() - this.circuitOpenedAt > this.CIRCUIT_RESET_MS) {
      logger.info("[HyperliquidFallback] Circuit breaker half-open, attempting request");
      return false;
    }
    return true;
  }

  private recordSuccess(): void {
    if (this.circuitOpen) {
      logger.info("[HyperliquidFallback] Circuit breaker closed after successful request");
    }
    this.consecutiveErrors = 0;
    this.circuitOpen = false;
    this.consecutiveRateLimits = 0;
  }

  private recordFailure(): void {
    this.consecutiveErrors++;
    if (this.consecutiveErrors >= this.CIRCUIT_THRESHOLD && !this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      logger.warn("[HyperliquidFallback] Circuit breaker OPEN - too many consecutive errors");
    }
  }

  // ============================================================================
  // RATE-LIMITED API REQUEST
  // ============================================================================

  /**
   * Rate-limited POST request to Hyperliquid API with robust resilience:
   * - Circuit breaker prevents requests when service is unhealthy
   * - Global backoff blocks ALL requests after 429s
   * - In-flight request deduplication prevents duplicate concurrent requests
   * - Semaphore limits to 1 concurrent request
   * - Retry logic with exponential backoff (3 attempts)
   */
  private async postHyperliquid<T>(
    body: Record<string, unknown>,
    cacheTtl?: number
  ): Promise<T | null> {
    const cacheKey = JSON.stringify(body);

    // Check cache first
    const cached = this.cache.get(cacheKey) as CacheEntry<T> | undefined;
    const ttl = cacheTtl || CACHE_TTLS.metaAndAssetCtxs;
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // Circuit breaker check
    if (this.isCircuitOpen()) {
      logger.debug("[HyperliquidFallback] Request blocked by circuit breaker");
      return null;
    }

    // Global backoff check
    const now = Date.now();
    if (now < this.globalBackoffUntil) {
      const waitMs = this.globalBackoffUntil - now;
      logger.debug(`[HyperliquidFallback] In global backoff, waiting ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    // In-flight request deduplication
    const existingRequest = this.inFlightRequests.get(cacheKey);
    if (existingRequest) {
      logger.debug("[HyperliquidFallback] Reusing in-flight request");
      return existingRequest as Promise<T | null>;
    }

    // Create and track the request
    const requestPromise = this.executeRequest<T>(body, cacheKey, ttl);
    this.inFlightRequests.set(cacheKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      this.inFlightRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(
    body: Record<string, unknown>,
    cacheKey: string,
    cacheTtl: number
  ): Promise<T | null> {
    await this.requestSemaphore.acquire();

    try {
      // Ensure minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTimestamp;
      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest)
        );
      }
      this.lastRequestTimestamp = Date.now();

      // Retry loop with exponential backoff
      for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(HYPERLIQUID_BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });

          if (!response.ok) {
            if (response.status === 429) {
              // Rate limited - escalate global backoff
              this.consecutiveRateLimits++;
              const baseBackoff = this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
              const escalation = Math.min(this.consecutiveRateLimits, 5);
              const backoffMs = baseBackoff * escalation + Math.floor(Math.random() * 500);

              // Set global backoff to prevent other requests
              this.globalBackoffUntil = Math.max(
                this.globalBackoffUntil,
                Date.now() + Math.min(backoffMs, this.MAX_GLOBAL_BACKOFF_MS)
              );

              logger.warn(
                `[HyperliquidFallback] Rate limited, backing off ${backoffMs}ms ` +
                `(attempt=${attempt + 1}, consecutive=${this.consecutiveRateLimits})`
              );
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
              continue; // Retry
            }

            if (response.status >= 500) {
              // Server error - retry with backoff
              const backoffMs = this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
              logger.warn(`[HyperliquidFallback] Server error ${response.status}, retrying`);
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
              continue;
            }

            // Client error (4xx except 429) - don't retry
            logger.warn(`[HyperliquidFallback] HTTP error ${response.status} (no retry)`);
            this.recordFailure();
            return null;
          }

          // Success - reset rate limit tracking
          this.recordSuccess();
          const data = (await response.json()) as T;
          this.cache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        } catch (error) {
          const isLastAttempt = attempt === this.MAX_RETRIES - 1;
          if (isLastAttempt) {
            logger.warn(`[HyperliquidFallback] All ${this.MAX_RETRIES} retry attempts exhausted`);
            this.recordFailure();
            return null;
          }

          // Transient error - retry with backoff
          const backoffMs = this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.debug(`[HyperliquidFallback] Transient error, retrying in ${backoffMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }

      return null;
    } finally {
      this.requestSemaphore.release();
    }
  }

  // ============================================================================
  // PUBLIC RATE LIMIT STATUS
  // ============================================================================

  /**
   * Check if we're in a rate-limited state
   */
  isRateLimited(): boolean {
    return this.consecutiveRateLimits > 0 ||
           Date.now() < this.globalBackoffUntil ||
           this.circuitOpen;
  }

  /**
   * Get detailed rate limit status
   */
  getRateLimitStatus(): { isLimited: boolean; backoffUntil: number; circuitOpen: boolean } {
    return {
      isLimited: this.isRateLimited(),
      backoffUntil: this.globalBackoffUntil,
      circuitOpen: this.circuitOpen,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Determine crowding level from funding rate
   * Funding > 0 means longs pay shorts (crowded longs)
   * Funding < 0 means shorts pay longs (crowded shorts)
   */
  private determineCrowdingLevel(fundingRate: number): IHyperliquidAssetPulse["crowdingLevel"] {
    const annualized = fundingRate * 3 * 365 * 100; // 8h funding * 3 * 365 = annualized %

    if (annualized > 50) return "extreme_long";
    if (annualized > 20) return "long";
    if (annualized < -50) return "extreme_short";
    if (annualized < -20) return "short";
    return "neutral";
  }

  /**
   * Determine squeeze risk based on crowding and funding
   */
  private determineSqueezeRisk(crowdingLevel: IHyperliquidAssetPulse["crowdingLevel"]): IHyperliquidAssetPulse["squeezeRisk"] {
    if (crowdingLevel === "extreme_long" || crowdingLevel === "extreme_short") {
      return "high";
    }
    if (crowdingLevel === "long" || crowdingLevel === "short") {
      return "medium";
    }
    return "low";
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Get mark price for an asset (BTC, ETH, SOL, HYPE). Used when HL is primary or as fallback.
   */
  async getMarkPrice(symbol: string): Promise<number | null> {
    const result = await this.getMarkPriceAndChange(symbol);
    return result?.price ?? null;
  }

  /**
   * Get mark price and 24h change for an asset (uses prevDayPx for change). Preferred for core assets.
   */
  async getMarkPriceAndChange(symbol: string): Promise<{ price: number; change24h: number } | null> {
    try {
      const data = await this.postHyperliquid<MetaAndAssetCtxsResponse>(
        { type: "metaAndAssetCtxs" },
        CACHE_TTLS.metaAndAssetCtxs
      );
      if (!data || !Array.isArray(data) || data.length < 2) return null;
      const [meta, assetCtxs] = data;
      const upper = symbol.toUpperCase();
      const idx = meta.universe.findIndex((u) => u.name.toUpperCase() === upper);
      if (idx < 0 || idx >= assetCtxs.length) return null;
      const ctx = assetCtxs[idx];
      const markPx = ctx?.markPx ?? ctx?.midPx;
      if (markPx == null || markPx === "") return null;
      const price = parseFloat(String(markPx));
      if (!Number.isFinite(price) || price <= 0) return null;
      const prevDayPx = parseFloat(String(ctx?.prevDayPx ?? "0"));
      const change24h =
        prevDayPx > 0 ? ((price - prevDayPx) / prevDayPx) * 100 : 0;
      return { price, change24h };
    } catch {
      return null;
    }
  }

  /**
   * Get overall options pulse with per-asset crowding and funding
   */
  async getOptionsPulse(): Promise<IHyperliquidOptionsPulse | null> {
    try {
      const data = await this.postHyperliquid<MetaAndAssetCtxsResponse>(
        { type: "metaAndAssetCtxs" },
        CACHE_TTLS.optionsPulse
      );

      if (!data || !Array.isArray(data) || data.length < 2) {
        logger.debug("[HyperliquidFallback] No metaAndAssetCtxs data");
        return null;
      }

      const [meta, assetCtxs] = data;

      // Map asset names to their funding data
      const assetMap = new Map<string, HyperliquidAssetCtx>();
      for (let i = 0; i < meta.universe.length && i < assetCtxs.length; i++) {
        const name = meta.universe[i].name.toUpperCase();
        assetMap.set(name, assetCtxs[i]);
      }

      // Build asset pulses for BTC, ETH, SOL, HYPE
      const buildAssetPulse = (symbol: string): IHyperliquidAssetPulse | undefined => {
        const ctx = assetMap.get(symbol);
        if (!ctx) return undefined;

        const funding8h = parseFloat(ctx.funding) || 0;
        const fundingAnnualized = funding8h * 3 * 365 * 100; // Convert to annualized %
        const crowdingLevel = this.determineCrowdingLevel(funding8h);
        const squeezeRisk = this.determineSqueezeRisk(crowdingLevel);

        return {
          funding8h,
          fundingAnnualized,
          crowdingLevel,
          squeezeRisk,
        };
      };

      const assets = {
        btc: buildAssetPulse("BTC"),
        eth: buildAssetPulse("ETH"),
        sol: buildAssetPulse("SOL"),
        hype: buildAssetPulse("HYPE"),
      };

      // Determine overall bias from aggregate funding
      let totalFunding = 0;
      let count = 0;
      for (const asset of [assets.btc, assets.eth, assets.sol]) {
        if (asset?.funding8h !== undefined) {
          totalFunding += asset.funding8h;
          count++;
        }
      }

      let overallBias: IHyperliquidOptionsPulse["overallBias"] = "neutral";
      if (count > 0) {
        const avgFunding = totalFunding / count;
        if (avgFunding > 0.0001) overallBias = "bullish"; // Longs paying = bullish sentiment
        else if (avgFunding < -0.0001) overallBias = "bearish";
      }

      // Full detail only at debug to avoid terminal noise
      logger.debug(
        `[HyperliquidFallback] 📊 OPTIONS PULSE | Bias: ${overallBias} | ` +
        `BTC: ${assets.btc?.fundingAnnualized?.toFixed(2) || "N/A"}% (${assets.btc?.crowdingLevel || "N/A"}) | ` +
        `ETH: ${assets.eth?.fundingAnnualized?.toFixed(2) || "N/A"}% (${assets.eth?.crowdingLevel || "N/A"}) | ` +
        `SOL: ${assets.sol?.fundingAnnualized?.toFixed(2) || "N/A"}% | ` +
        `HYPE: ${assets.hype?.fundingAnnualized?.toFixed(2) || "N/A"}%`
      );
      // Dashboard-style line at debug to reduce Eliza Cloud INFO noise (set LOG_LEVEL=debug to see)
      if (overallBias !== "neutral") {
        const sym = overallBias === "bullish" ? "🟢" : "🔴";
        const btc = assets.btc?.fundingAnnualized != null ? `${assets.btc.fundingAnnualized.toFixed(2)}%` : "—";
        const eth = assets.eth?.fundingAnnualized != null ? `${assets.eth.fundingAnnualized.toFixed(2)}%` : "—";
        const sol = assets.sol?.fundingAnnualized != null ? `${assets.sol.fundingAnnualized.toFixed(2)}%` : "—";
        logger.debug(
          `[HyperliquidFallback] 📊 OPTIONS PULSE | ${sym} ${overallBias.toUpperCase()} | BTC ${btc} | ETH ${eth} | SOL ${sol}`
        );
      }

      return {
        overallBias,
        assets,
      };
    } catch (error) {
      logger.error(`[HyperliquidFallback] getOptionsPulse error: ${error}`);
      return null;
    }
  }

  /**
   * Get cross-venue funding comparison (Hyperliquid vs CEX)
   */
  async getCrossVenueFunding(): Promise<IHyperliquidCrossVenueFunding | null> {
    try {
      const data = await this.postHyperliquid<PredictedFundingsResponse>(
        { type: "predictedFundings" },
        CACHE_TTLS.crossVenue
      );

      if (!data || !Array.isArray(data)) {
        logger.debug("[HyperliquidFallback] No predictedFundings data");
        return null;
      }

      const assets: IHyperliquidCrossVenueAsset[] = [];
      const arbitrageOpportunities: string[] = [];

      for (const [coin, venues] of data) {
        let hlFunding: number | undefined;
        let binanceFunding: number | undefined;
        let bybitFunding: number | undefined;

        for (const [venue, fundingInfo] of venues) {
          // Skip if fundingInfo is null or undefined
          if (!fundingInfo || fundingInfo.fundingRate === undefined) {
            continue;
          }
          
          const rate = parseFloat(fundingInfo.fundingRate) || 0;

          if (venue === "HlPerp") {
            hlFunding = rate;
          } else if (venue === "BinPerp") {
            binanceFunding = rate;
          } else if (venue === "BybitPerp") {
            bybitFunding = rate;
          }
        }

        // Calculate best CEX funding (take the one with highest absolute difference from HL)
        let cexFunding: number | undefined;
        if (binanceFunding !== undefined && bybitFunding !== undefined) {
          // Use the one furthest from HL for arb comparison
          const binDiff = hlFunding !== undefined ? Math.abs(hlFunding - binanceFunding) : 0;
          const bybitDiff = hlFunding !== undefined ? Math.abs(hlFunding - bybitFunding) : 0;
          cexFunding = binDiff > bybitDiff ? binanceFunding : bybitFunding;
        } else {
          cexFunding = binanceFunding ?? bybitFunding;
        }

        // Determine if there's an arbitrage opportunity
        let isArbitrageOpportunity = false;
        let arbitrageDirection: IHyperliquidCrossVenueAsset["arbitrageDirection"] = null;

        if (hlFunding !== undefined && cexFunding !== undefined) {
          const diff = hlFunding - cexFunding;

          if (Math.abs(diff) > ARBITRAGE_THRESHOLD) {
            isArbitrageOpportunity = true;
            // If HL funding > CEX funding, go long HL (receive funding) and short CEX
            arbitrageDirection = diff > 0 ? "long_hl" : "short_hl";
            arbitrageOpportunities.push(coin);
          }
        }

        assets.push({
          coin,
          hlFunding,
          cexFunding,
          isArbitrageOpportunity,
          arbitrageDirection,
        });
      }

      // Never dump 70+ tickers. Full list only at debug.
      const arbCount = arbitrageOpportunities.length;
      logger.debug(
        `[HyperliquidFallback] 💱 CROSS-VENUE | ${assets.length} assets | Arb: ${arbCount > 0 ? arbitrageOpportunities.join(", ") : "none"}`
      );
      // INFO only when there are arb opportunities (actionable for operators)
      if (arbCount > 0) {
        const arbSummary =
          arbCount <= 10
            ? arbitrageOpportunities.join(", ")
            : `${arbCount} assets`;
        logger.info(
          `[HyperliquidFallback] 💱 CROSS-VENUE ARB | ${assets.length} assets | ${arbSummary}`
        );
      }

      return {
        arbitrageOpportunities,
        assets,
      };
    } catch (error) {
      logger.error(`[HyperliquidFallback] getCrossVenueFunding error: ${error}`);
      return null;
    }
  }

  /**
   * Get list of perp symbols currently at open-interest cap (max crowding).
   * Used for contrarian signal: at cap = crowded, consider fading or reducing size.
   */
  async getPerpsAtOpenInterestCap(): Promise<string[] | null> {
    try {
      const data = await this.postHyperliquid<string[]>(
        { type: "perpsAtOpenInterestCap" },
        CACHE_TTLS.perpsAtOICap
      );
      if (!data || !Array.isArray(data)) return null;
      return data.filter((s): s is string => typeof s === "string");
    } catch (error) {
      logger.debug(`[HyperliquidFallback] getPerpsAtOpenInterestCap error: ${error}`);
      return null;
    }
  }

  /**
   * Fetch funding history for a coin (8h funding intervals).
   * startTime/endTime in ms; endTime defaults to now.
   */
  async getFundingHistory(
    coin: string,
    startTime: number,
    endTime?: number
  ): Promise<FundingHistoryEntry[] | null> {
    const body: { type: string; coin: string; startTime: number; endTime?: number } = {
      type: "fundingHistory",
      coin,
      startTime,
    };
    if (endTime != null) body.endTime = endTime;
    try {
      const data = await this.postHyperliquid<FundingHistoryResponse>(body, CACHE_TTLS.fundingHistory);
      if (!data || !Array.isArray(data)) return null;
      return data;
    } catch (error) {
      logger.debug(`[HyperliquidFallback] getFundingHistory(${coin}) error: ${error}`);
      return null;
    }
  }

  /**
   * Compute funding regime for a coin: percentile of current 8h funding vs recent history.
   * Returns percentile (0–100), and flags for extreme long (≥90) / extreme short (≤10).
   * Used for mean-reversion / HyperliquidFundingExtreme signal.
   */
  async getFundingRegime(
    coin: string,
    currentFunding8h: number,
    lookbackSamples: number = 30
  ): Promise<HyperliquidFundingRegime | null> {
    const now = Date.now();
    // HL funding every 8h; lookbackSamples * 8h in ms. Omit endTime so cache key is stable (API defaults to now).
    const startTime = now - lookbackSamples * 8 * 60 * 60 * 1000;
    const history = await this.getFundingHistory(coin, startTime);
    if (!history || history.length === 0) {
      return null;
    }
    const rates = history
      .map((e) => parseFloat(e.fundingRate))
      .filter((r) => Number.isFinite(r));
    if (rates.length === 0) return null;
    // Percentile = share of (history + current) that are strictly below current (0–100)
    const all = [...rates, currentFunding8h];
    const countBelow = all.filter((r) => r < currentFunding8h).length;
    const percentile = (countBelow / all.length) * 100;
    return {
      percentile,
      isExtremeLong: percentile >= 90,
      isExtremeShort: percentile <= 10,
    };
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
