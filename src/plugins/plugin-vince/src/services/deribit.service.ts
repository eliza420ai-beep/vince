/**
 * Vince Deribit Service
 *
 * Simplified Deribit integration for VINCE OPTIONS analysis.
 * Focuses on: index prices, options chains, IV surface, strike selection.
 *
 * Data Source: Deribit Public API (FREE, no auth required)
 * Endpoint: https://www.deribit.com/api/v2/public/*
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import { isVinceAgent } from "../utils/dashboard";

// Types
export interface DeribitStrike {
  instrumentName: string;
  strike: number;
  type: "call" | "put";
  expiry: string;
  daysToExpiry: number;
  spotPrice: number;
  bidPrice: number;
  askPrice: number;
  markPrice: number;
  markPriceUsd: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  oi: number;
  volume: number;
}

export interface PremiumYield {
  strike: number;
  type: "call" | "put";
  delta: number;
  premium: number;
  spotPrice: number;
  yield7Day: number;
  yieldAnnualized: number;
  capitalRequired: number;
  weeklyIncomePerContract: number;
  instrumentName: string;
  daysToExpiry: number;
  iv: number;
}

export interface IVSurface {
  currency: string;
  spotPrice: number;
  atmIV: number;
  put25DeltaIV: number;
  call25DeltaIV: number;
  skew: number;
  skewInterpretation: "fearful" | "neutral" | "bullish";
  timestamp: number;
}

export interface OptionsContext {
  currency: string;
  spotPrice: number | null;
  dvol: number | null;
  historicalVolatility: number | null;
  ivSurface: IVSurface | null;
  bestCoveredCalls: PremiumYield[];
  bestCashSecuredPuts: PremiumYield[];
  fundingRate: number | null;
  timestamp: number;
}

type DeribitCurrency = "BTC" | "ETH" | "SOL";

const BASE_URL = "https://www.deribit.com/api/v2/public";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_MS = 15000;
const MIN_REQUEST_INTERVAL = 200; // Min 200ms between requests
const RATE_LIMIT_BACKOFF_BASE = 2000; // 2 second base backoff on 429

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class VinceDeribitService extends Service {
  static serviceType = "VINCE_DERIBIT_SERVICE";
  capabilityDescription =
    "Provides Deribit options data for strike selection and premium analysis";

  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private lastRequestTime = 0;
  private backoffUntil = 0;
  private consecutiveRateLimits = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
    logger.debug("[VinceDeribitService] Initialized (public API)");
  }

  // Rate limit helper - ensures minimum interval between requests
  private async throttle(): Promise<void> {
    const now = Date.now();

    // Check if we're in backoff period
    if (now < this.backoffUntil) {
      const waitTime = this.backoffUntil - now;
      await new Promise((r) => setTimeout(r, waitTime));
    }

    // Ensure minimum interval between requests
    const elapsed = now - this.lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
    }

    this.lastRequestTime = Date.now();
  }

  // Handle rate limit response
  private handleRateLimit(): void {
    this.consecutiveRateLimits++;
    // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
    const backoff = Math.min(
      RATE_LIMIT_BACKOFF_BASE * Math.pow(2, this.consecutiveRateLimits - 1),
      30000,
    );
    this.backoffUntil = Date.now() + backoff;
  }

  // Reset rate limit tracking on successful request
  private handleSuccess(): void {
    this.consecutiveRateLimits = 0;
  }

  static async start(runtime: IAgentRuntime): Promise<VinceDeribitService> {
    const service = new VinceDeribitService(runtime);

    // Fetch BTC context and print dashboard with live data (only for VINCE agent to avoid duplicate)
    if (isVinceAgent(runtime)) {
      service
        .getOptionsContext("BTC")
        .then((ctx) => {
          service.printDashboardWithData(ctx);
        })
        .catch((err) => {
          logger.warn(`[VinceDeribit] Failed to load options data: ${err}`);
        });
    }
    return service;
  }

  /**
   * Print dashboard (same box style as paper trade-opened banner).
   */
  private printDashboardWithData(ctx: OptionsContext): void {
    const spotStr = ctx.spotPrice
      ? `$${ctx.spotPrice.toLocaleString()}`
      : "N/A";
    const dvolStr = ctx.dvol ? `${ctx.dvol.toFixed(1)}%` : "N/A";
    const hvStr = ctx.historicalVolatility
      ? `${ctx.historicalVolatility.toFixed(1)}%`
      : "N/A";

    startBox();
    logLine("📊 DERIBIT OPTIONS DASHBOARD");
    logEmpty();
    sep();
    logEmpty();
    logLine(`${ctx.currency} SPOT: ${spotStr}  DVOL: ${dvolStr}  HV: ${hvStr}`);
    if (ctx.ivSurface) {
      const atmStr = `ATM: ${ctx.ivSurface.atmIV.toFixed(1)}%`;
      const skewStr = `Skew: ${ctx.ivSurface.skew > 0 ? "+" : ""}${ctx.ivSurface.skew.toFixed(1)}%`;
      const skewEmoji =
        ctx.ivSurface.skewInterpretation === "fearful"
          ? "⚠️"
          : ctx.ivSurface.skewInterpretation === "bullish"
            ? "🟢"
            : "⚪";
      logLine(`IV Surface: ${atmStr}  ${skewStr}  ${skewEmoji}`);
    }
    logEmpty();
    sep();
    logEmpty();
    if (ctx.bestCoveredCalls.length > 0) {
      const cc = ctx.bestCoveredCalls[0];
      logLine(
        `📈 Best Covered Call: ${cc.delta.toFixed(0)}D @ ${cc.strike}, ${cc.yield7Day.toFixed(2)}%/wk`,
      );
    }
    if (ctx.bestCashSecuredPuts.length > 0) {
      const csp = ctx.bestCashSecuredPuts[0];
      logLine(
        `📉 Best Cash-Secured Put: ${csp.delta.toFixed(0)}D @ ${csp.strike}, ${csp.yield7Day.toFixed(2)}%/wk`,
      );
    }
    logEmpty();
    sep();
    logEmpty();
    const tldr = this.getTLDR(ctx);
    logLine(`💡 ${tldr}`);
    endBox();
    logger.info(`[VinceDeribit] ✅ Dashboard loaded - ${tldr}`);
  }

  /**
   * Generate actionable TLDR from options context
   */
  getTLDR(ctx: OptionsContext): string {
    // Priority 1: IV vs HV comparison (cheap/expensive options)
    if (ctx.dvol !== null && ctx.historicalVolatility !== null) {
      const ivHvRatio = ctx.dvol / ctx.historicalVolatility;
      if (ivHvRatio < 0.8) {
        return `IV CHEAP: DVOL ${ctx.dvol.toFixed(0)} < HV ${ctx.historicalVolatility.toFixed(0)} - buy options`;
      }
      if (ivHvRatio > 1.3) {
        return `IV RICH: DVOL ${ctx.dvol.toFixed(0)} > HV ${ctx.historicalVolatility.toFixed(0)} - sell premium`;
      }
    }

    // Priority 2: Skew analysis
    if (ctx.ivSurface) {
      if (
        ctx.ivSurface.skewInterpretation === "fearful" &&
        ctx.ivSurface.skew > 5
      ) {
        return `SKEW FEARFUL: Puts +${ctx.ivSurface.skew.toFixed(1)}% - hedge with puts`;
      }
      if (
        ctx.ivSurface.skewInterpretation === "bullish" &&
        ctx.ivSurface.skew < -5
      ) {
        return `SKEW BULLISH: Calls bid up - upside protection cheap`;
      }
    }

    // Priority 3: Premium yields
    if (ctx.bestCoveredCalls.length > 0) {
      const bestCC = ctx.bestCoveredCalls[0];
      if (bestCC.yield7Day > 1.5) {
        return `YIELD: ${bestCC.delta.toFixed(0)}D CCs paying ${bestCC.yield7Day.toFixed(1)}%/wk`;
      }
    }

    // Priority 4: DVOL level
    if (ctx.dvol !== null) {
      if (ctx.dvol > 80) {
        return `DVOL HIGH: ${ctx.dvol.toFixed(0)}% - reduce size, buy options`;
      }
      if (ctx.dvol < 30) {
        return `DVOL LOW: ${ctx.dvol.toFixed(0)}% - sell premium, expect breakout`;
      }
    }

    // Default
    return "OPTIONS: Normal IV, no extreme signals";
  }

  /**
   * Print full options dashboard with live data
   */
  async printLiveDashboard(currency: DeribitCurrency = "BTC"): Promise<void> {
    const ctx = await this.getOptionsContext(currency);
    const spotStr = ctx.spotPrice
      ? `$${ctx.spotPrice.toLocaleString()}`
      : "N/A";
    const dvolStr = ctx.dvol ? `${ctx.dvol.toFixed(1)}%` : "N/A";
    const hvStr = ctx.historicalVolatility
      ? `${ctx.historicalVolatility.toFixed(1)}%`
      : "N/A";

    startBox();
    logLine(`📊 DERIBIT ${currency} OPTIONS DASHBOARD`);
    logEmpty();
    sep();
    logEmpty();
    logLine(`💰 SPOT: ${spotStr}  DVOL: ${dvolStr}  HV: ${hvStr}`);
    if (ctx.ivSurface) {
      const atmStr = `ATM: ${ctx.ivSurface.atmIV.toFixed(1)}%`;
      const skewEmoji =
        ctx.ivSurface.skewInterpretation === "fearful"
          ? "📉"
          : ctx.ivSurface.skewInterpretation === "bullish"
            ? "📈"
            : "➡️";
      logLine(
        `📊 IV: ${atmStr}  ${skewEmoji} Skew: ${ctx.ivSurface.skew > 0 ? "+" : ""}${ctx.ivSurface.skew.toFixed(1)}%`,
      );
    }
    logEmpty();
    sep();
    logEmpty();
    logLine("🔵 BEST COVERED CALLS:");
    if (ctx.bestCoveredCalls.length > 0) {
      for (const cc of ctx.bestCoveredCalls.slice(0, 2)) {
        logLine(
          `   ${cc.delta.toFixed(0)}D $${cc.strike.toLocaleString()} → ${cc.yield7Day.toFixed(2)}%/wk`,
        );
      }
    } else {
      logLine("   No data available");
    }
    logLine("🟠 BEST CASH-SECURED PUTS:");
    if (ctx.bestCashSecuredPuts.length > 0) {
      for (const csp of ctx.bestCashSecuredPuts.slice(0, 2)) {
        logLine(
          `   ${Math.abs(csp.delta).toFixed(0)}D $${csp.strike.toLocaleString()} → ${csp.yield7Day.toFixed(2)}%/wk`,
        );
      }
    } else {
      logLine("   No data available");
    }
    logEmpty();
    sep();
    logEmpty();
    const tldr = this.getTLDR(ctx);
    const tldrEmoji =
      tldr.includes("CHEAP") || tldr.includes("YIELD")
        ? "💡"
        : tldr.includes("RICH") || tldr.includes("HIGH")
          ? "⚠️"
          : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();
  }

  async stop(): Promise<void> {
    this.cache.clear();
    logger.info("[VinceDeribitService] Stopped");
  }

  // Cache helpers
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  }

  // HTTP helper with rate limiting and backoff
  private async fetchDeribit<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<T | null> {
    const cacheKey = `${endpoint}:${JSON.stringify(params || {})}`;
    const cached = this.getCached<T>(cacheKey);
    if (cached) return cached;

    // Apply rate limiting
    await this.throttle();

    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - apply backoff silently (expected under load)
          this.handleRateLimit();
          return null;
        }
        // Only log non-429 errors
        logger.debug(
          { status: response.status, endpoint },
          "[VinceDeribitService] API error",
        );
        return null;
      }

      this.handleSuccess();
      const json = await response.json();
      const result = json.result as T;
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      // Silently handle network errors - service will use cached data or fallbacks
      return null;
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get spot (index) price for a currency
   */
  async getIndexPrice(currency: DeribitCurrency): Promise<number | null> {
    const result = await this.fetchDeribit<{ index_price: number }>(
      "/get_index_price",
      { index_name: `${currency.toLowerCase()}_usd` },
    );
    return result?.index_price || null;
  }

  /**
   * Get DVOL (Deribit Volatility Index) - only BTC and ETH
   */
  async getDVOL(currency: "BTC" | "ETH"): Promise<number | null> {
    const now = Date.now();
    const result = await this.fetchDeribit<{ data: number[][] }>(
      "/get_volatility_index_data",
      {
        currency,
        start_timestamp: String(now - 24 * 60 * 60 * 1000),
        end_timestamp: String(now),
        resolution: "60",
      },
    );
    const len = result?.data?.length;
    if (len != null && len > 0 && result?.data) {
      return result.data[len - 1][4]; // Close price
    }
    return null;
  }

  /**
   * Get historical volatility for a currency
   */
  async getHistoricalVolatility(
    currency: DeribitCurrency,
  ): Promise<number | null> {
    const result = await this.fetchDeribit<{ hv: number }[]>(
      "/get_historical_volatility",
      { currency },
    );
    const len = result?.length;
    if (len != null && len > 0 && result) {
      return result[len - 1]?.hv ?? null;
    }
    return null;
  }

  /**
   * Get funding rate for perpetual
   */
  async getFundingRate(currency: DeribitCurrency): Promise<number | null> {
    if (currency === "SOL") return null; // SOL-PERPETUAL not active on Deribit

    const instrumentName = `${currency}-PERPETUAL`;
    const result = await this.fetchDeribit<{
      current_funding?: number;
      funding_8h?: number;
    }>("/ticker", { instrument_name: instrumentName });
    return result?.current_funding || result?.funding_8h || null;
  }

  /**
   * Get all active options for a currency
   */
  private async getOptions(currency: DeribitCurrency): Promise<any[]> {
    const result = await this.fetchDeribit<any[]>("/get_instruments", {
      currency,
      kind: "option",
      expired: "false",
    });
    return result || [];
  }

  /**
   * Get ticker for an instrument
   */
  private async getTicker(instrumentName: string): Promise<any | null> {
    return this.fetchDeribit("/ticker", { instrument_name: instrumentName });
  }

  /**
   * Get strikes by delta range (for covered calls / CSPs)
   */
  async getStrikesByDelta(
    currency: DeribitCurrency,
    targetDeltaMin: number,
    targetDeltaMax: number,
    type: "call" | "put",
    daysToExpiry: { min: number; max: number } = { min: 4, max: 10 },
  ): Promise<DeribitStrike[]> {
    try {
      const spotPrice = await this.getIndexPrice(currency);
      if (!spotPrice) return [];

      const instruments = await this.getOptions(currency);
      const now = Date.now();

      // Filter by expiry and type
      const filtered = instruments.filter((inst) => {
        if (inst.option_type !== type) return false;
        const days = (inst.expiration_timestamp - now) / (24 * 60 * 60 * 1000);
        return days >= daysToExpiry.min && days <= daysToExpiry.max;
      });

      if (filtered.length === 0) return [];

      // Fetch ticker data for each (limited to 15 to avoid rate limits)
      const results: DeribitStrike[] = [];
      const toFetch = filtered.slice(0, 15); // Reduced from 30

      // Process in smaller batches of 3 with longer delays
      for (let i = 0; i < toFetch.length; i += 3) {
        const batch = toFetch.slice(i, i + 3);

        // Sequential fetching within batch to respect rate limits
        const tickers: (any | null)[] = [];
        for (const inst of batch) {
          const ticker = await this.getTicker(inst.instrument_name);
          tickers.push(ticker);
        }

        for (let j = 0; j < batch.length; j++) {
          const inst = batch[j];
          const ticker = tickers[j];
          if (!ticker?.greeks?.delta) continue;

          const delta = Math.abs(ticker.greeks.delta);
          if (delta < targetDeltaMin || delta > targetDeltaMax) continue;

          const days =
            (inst.expiration_timestamp - now) / (24 * 60 * 60 * 1000);
          const markPriceUsd = ticker.mark_price * spotPrice;

          results.push({
            instrumentName: inst.instrument_name,
            strike: inst.strike || 0,
            type: inst.option_type,
            expiry: new Date(inst.expiration_timestamp)
              .toISOString()
              .split("T")[0],
            daysToExpiry: Math.round(days * 10) / 10,
            spotPrice,
            bidPrice: ticker.best_bid_price || 0,
            askPrice: ticker.best_ask_price || 0,
            markPrice: ticker.mark_price || 0,
            markPriceUsd,
            delta: ticker.greeks.delta,
            gamma: ticker.greeks.gamma || 0,
            theta: ticker.greeks.theta || 0,
            vega: ticker.greeks.vega || 0,
            iv: (ticker.mark_iv || 0) * 100,
            oi: ticker.open_interest || 0,
            volume: ticker.stats?.volume || 0,
          });
        }

        if (i + 3 < toFetch.length) {
          await new Promise((r) => setTimeout(r, 500)); // Increased from 300ms
        }
      }

      // Sort by delta (closest to target midpoint)
      const targetMid = (targetDeltaMin + targetDeltaMax) / 2;
      results.sort(
        (a, b) =>
          Math.abs(Math.abs(a.delta) - targetMid) -
          Math.abs(Math.abs(b.delta) - targetMid),
      );

      return results;
    } catch (error) {
      logger.error(
        { error, currency },
        "[VinceDeribitService] Failed getStrikesByDelta",
      );
      return [];
    }
  }

  /**
   * Calculate premium yield for a strike
   */
  calculatePremiumYield(strike: DeribitStrike): PremiumYield {
    const { spotPrice, markPriceUsd, daysToExpiry, type } = strike;
    const capitalRequired = type === "call" ? spotPrice : strike.strike;
    const yield7Day = (markPriceUsd / capitalRequired) * 100;
    const yieldAnnualized = yield7Day * (365 / daysToExpiry);

    return {
      strike: strike.strike,
      type,
      delta: strike.delta,
      premium: markPriceUsd,
      spotPrice,
      yield7Day: Math.round(yield7Day * 100) / 100,
      yieldAnnualized: Math.round(yieldAnnualized * 10) / 10,
      capitalRequired,
      weeklyIncomePerContract: markPriceUsd,
      instrumentName: strike.instrumentName,
      daysToExpiry,
      iv: strike.iv,
    };
  }

  /**
   * Get best covered call strikes (20-30 delta)
   */
  async getBestCoveredCalls(
    currency: DeribitCurrency,
  ): Promise<PremiumYield[]> {
    const strikes = await this.getStrikesByDelta(currency, 0.2, 0.3, "call");
    if (strikes.length === 0) return [];

    const yields = strikes.map((s) => this.calculatePremiumYield(s));
    yields.sort((a, b) => b.yield7Day - a.yield7Day);
    return yields.slice(0, 3);
  }

  /**
   * Get best cash-secured put strikes (20-30 delta)
   */
  async getBestCashSecuredPuts(
    currency: DeribitCurrency,
  ): Promise<PremiumYield[]> {
    const strikes = await this.getStrikesByDelta(currency, 0.2, 0.3, "put");
    if (strikes.length === 0) return [];

    const yields = strikes.map((s) => this.calculatePremiumYield(s));
    yields.sort((a, b) => b.yield7Day - a.yield7Day);
    return yields.slice(0, 3);
  }

  /**
   * Get IV surface for skew analysis
   */
  async getIVSurface(currency: DeribitCurrency): Promise<IVSurface | null> {
    try {
      const spotPrice = await this.getIndexPrice(currency);
      if (!spotPrice) return null;

      // Get 25-delta calls and puts
      const [calls, puts] = await Promise.all([
        this.getStrikesByDelta(currency, 0.2, 0.3, "call"),
        this.getStrikesByDelta(currency, 0.2, 0.3, "put"),
      ]);

      // Find closest to 25 delta
      const call25 = calls.find(
        (c) => Math.abs(Math.abs(c.delta) - 0.25) < 0.1,
      );
      const put25 = puts.find((p) => Math.abs(Math.abs(p.delta) - 0.25) < 0.1);

      const call25IV = call25?.iv || 50;
      const put25IV = put25?.iv || 50;
      const atmIV = (call25IV + put25IV) / 2;
      const skew = put25IV - call25IV;

      let skewInterpretation: "fearful" | "neutral" | "bullish" = "neutral";
      if (skew > 5) skewInterpretation = "fearful";
      else if (skew < -5) skewInterpretation = "bullish";

      return {
        currency,
        spotPrice,
        atmIV,
        put25DeltaIV: put25IV,
        call25DeltaIV: call25IV,
        skew,
        skewInterpretation,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(
        { error, currency },
        "[VinceDeribitService] Failed getIVSurface",
      );
      return null;
    }
  }

  /**
   * Get complete options context for a currency
   */
  async getOptionsContext(currency: DeribitCurrency): Promise<OptionsContext> {
    try {
      const [
        spotPrice,
        dvol,
        hv,
        fundingRate,
        ivSurface,
        coveredCalls,
        cashSecuredPuts,
      ] = await Promise.all([
        this.getIndexPrice(currency),
        currency !== "SOL"
          ? this.getDVOL(currency as "BTC" | "ETH")
          : Promise.resolve(null),
        this.getHistoricalVolatility(currency),
        this.getFundingRate(currency),
        this.getIVSurface(currency),
        this.getBestCoveredCalls(currency),
        this.getBestCashSecuredPuts(currency),
      ]);

      return {
        currency,
        spotPrice,
        dvol,
        historicalVolatility: hv,
        ivSurface,
        bestCoveredCalls: coveredCalls,
        bestCashSecuredPuts: cashSecuredPuts,
        fundingRate,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(
        { error, currency },
        "[VinceDeribitService] Failed getOptionsContext",
      );
      return {
        currency,
        spotPrice: null,
        dvol: null,
        historicalVolatility: null,
        ivSurface: null,
        bestCoveredCalls: [],
        bestCashSecuredPuts: [],
        fundingRate: null,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get options context for all supported currencies
   */
  async getAllOptionsContext(): Promise<{
    btc: OptionsContext;
    eth: OptionsContext;
    sol: OptionsContext;
  }> {
    const [btc, eth, sol] = await Promise.all([
      this.getOptionsContext("BTC"),
      this.getOptionsContext("ETH"),
      this.getOptionsContext("SOL"),
    ]);
    return { btc, eth, sol };
  }
}

export default VinceDeribitService;
