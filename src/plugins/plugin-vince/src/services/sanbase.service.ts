/**
 * Vince Sanbase Service
 * 
 * Simplified Santiment integration for VINCE on-chain analytics.
 * Focuses on: network activity, dev activity, exchange flows, whale activity.
 * 
 * Data Source: Santiment GraphQL API
 * Free tier: 1,000 calls/month, 10 calls/minute, 30-day lag on restricted metrics
 * Env: SANTIMENT_API_KEY
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import { CORE_ASSETS, getSantimentSlug } from "../constants/targetAssets";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import { isVinceAgent } from "../utils/dashboard";

// Types
export interface TimeseriesData {
  datetime: string;
  value: number;
}

export interface NetworkActivity {
  activeAddresses: number | null;
  networkGrowth: number | null;
  transactionVolume: number | null;
  trend: "increasing" | "stable" | "decreasing";
}

export interface ExchangeFlows {
  inflow: number | null;
  outflow: number | null;
  netFlow: number | null;
  sentiment: "accumulation" | "neutral" | "distribution";
  isLagged: boolean;
}

export interface DevActivity {
  activity: number | null;
  contributors: number | null;
  trend: "active" | "moderate" | "quiet";
}

export interface WhaleActivity {
  volume: number | null;
  count: number | null;
  sentiment: "bullish" | "neutral" | "bearish";
  isLagged: boolean;
}

export interface OnChainContext {
  asset: string;
  networkActivity: NetworkActivity | null;
  exchangeFlows: ExchangeFlows | null;
  devActivity: DevActivity | null;
  whaleActivity: WhaleActivity | null;
  timestamp: number;
}

const SANBASE_URL = "https://api.santiment.net/graphql";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (save API calls)
const TIMEOUT_MS = 30000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class VinceSanbaseService extends Service {
  static serviceType = "VINCE_SANBASE_SERVICE";
  capabilityDescription = "Provides on-chain analytics from Santiment (network, dev, whale activity)";

  private apiKey: string = "";
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(protected runtime: IAgentRuntime) {
    super();
    
    const fromRuntime = runtime.getSetting("SANTIMENT_API_KEY");
    const fromEnv = process.env.SANTIMENT_API_KEY;
    this.apiKey = (fromRuntime || fromEnv || "").toString().trim();
    
    if (!this.apiKey) {
      logger.debug("[VinceSanbaseService] SANTIMENT_API_KEY not set - API calls will fail");
    } else {
      logger.debug("[VinceSanbaseService] Initialized with API key");
    }
  }

  static async start(runtime: IAgentRuntime): Promise<VinceSanbaseService> {
    const service = new VinceSanbaseService(runtime);
    if (isVinceAgent(runtime)) {
      service.printDashboard();
    }
    // Verify API with a test query
    if (service.isConfigured()) {
      try {
        const testData = await service.getNetworkActivity("BTC");
        if (testData?.activeAddresses) {
          logger.info(`[VinceSanbaseService] ✅ API verified - BTC active addresses: ${testData.activeAddresses.toLocaleString()}`);
        } else if (testData) {
          // Got response but no active addresses - might have other data
          logger.info(`[VinceSanbaseService] ✅ API connected - network trend: ${testData.trend}`);
        } else {
          // Try dev activity as fallback (no lag restrictions)
          const devData = await service.getDevActivity("BTC");
          if (devData?.activity) {
            logger.info(`[VinceSanbaseService] ✅ API verified via dev activity: ${devData.activity.toFixed(0)} commits`);
          } else {
            logger.warn("[VinceSanbaseService] API configured but no data returned - check API key or rate limits");
          }
        }
      } catch (err) {
        logger.warn(`[VinceSanbaseService] API verification failed: ${err}`);
      }
    } else {
      logger.debug("[VinceSanbaseService] No API key - Sanbase features disabled");
    }
    
    return service;
  }

  /**
   * Print dashboard (same box style as paper trade-opened banner).
   * Honest about rate limits and algo impact: when limits hit, Sanbase adds no insight.
   */
  private printDashboard(): void {
    startBox();
    logLine("🔗 SANTIMENT ON-CHAIN");
    logEmpty();
    if (!this.isConfigured()) {
      logLine("⚠️ SANTIMENT_API_KEY not set - on-chain features disabled");
      logLine("   Get free key: https://app.santiment.net/account");
    } else {
      logLine("✅ API key set (1000 calls/month free tier)");
      logEmpty();
      sep();
      logEmpty();
      logLine("ALGO IMPACT:");
      logLine("   • Used for: Exchange Flows (1.2x) → accumulation/distribution");
      logLine("   • Whale metrics disabled (30-day lag on free tier)");
      logEmpty();
      sep();
      logEmpty();
      logLine("⚠️ If you hit API limits: Sanbase adds no insight for that request.");
      logLine("   Algo continues with Binance, Deribit, CoinGlass, etc.");
    }
    endBox();
  }

  /**
   * Generate actionable TLDR from on-chain context
   */
  getTLDR(ctx: OnChainContext): string {
    // Priority 1: Exchange flows (accumulation/distribution)
    if (ctx.exchangeFlows) {
      if (ctx.exchangeFlows.sentiment === "accumulation") {
        const netFlow = ctx.exchangeFlows.netFlow || 0;
        if (netFlow < -10000000) { // $10M+ outflow
          return "ACCUMULATION: Heavy exchange outflows - bullish";
        }
        return "ACCUMULATION: Coins leaving exchanges - bullish bias";
      }
      if (ctx.exchangeFlows.sentiment === "distribution") {
        return "DISTRIBUTION: Coins moving to exchanges - bearish bias";
      }
    }
    
    // Priority 2: Whale activity
    if (ctx.whaleActivity) {
      if (ctx.whaleActivity.sentiment === "bullish") {
        return "WHALES ACTIVE: Large tx volume up - smart money moving";
      }
      if (ctx.whaleActivity.sentiment === "bearish") {
        return "WHALES DUMPING: Large sell transactions detected";
      }
    }
    
    // Priority 3: Network activity trend
    if (ctx.networkActivity) {
      if (ctx.networkActivity.trend === "increasing") {
        return "NETWORK GROWING: Active addresses rising - adoption";
      }
      if (ctx.networkActivity.trend === "decreasing") {
        return "NETWORK QUIET: Activity declining - low interest";
      }
    }
    
    // Priority 4: Dev activity
    if (ctx.devActivity) {
      if (ctx.devActivity.trend === "active") {
        return "DEVS ACTIVE: High development activity - long-term bullish";
      }
    }
    
    // Default
    return "ON-CHAIN: No extreme signals detected";
  }

  /**
   * Print live on-chain dashboard with data
   */
  async printLiveDashboard(asset: string = "BTC"): Promise<void> {
    const ctx = await this.getOnChainContext(asset);
    startBox();
    logLine(`🔗 ${asset} ON-CHAIN DASHBOARD`);
    logEmpty();
    sep();
    logEmpty();
    if (ctx.networkActivity) {
      const addrStr = ctx.networkActivity.activeAddresses?.toLocaleString() || "N/A";
      const trendEmoji = ctx.networkActivity.trend === "increasing" ? "📈" :
                         ctx.networkActivity.trend === "decreasing" ? "📉" : "➡️";
      logLine(`🌐 Network: ${addrStr} active addresses ${trendEmoji}`);
    }
    if (ctx.exchangeFlows) {
      const flowEmoji = ctx.exchangeFlows.sentiment === "accumulation" ? "🟢" :
                        ctx.exchangeFlows.sentiment === "distribution" ? "🔴" : "⚪";
      const netFlow = ctx.exchangeFlows.netFlow || 0;
      const flowDir = netFlow > 0 ? "inflow" : "outflow";
      logLine(`💱 Exchange: ${flowEmoji} ${ctx.exchangeFlows.sentiment.toUpperCase()} (net ${flowDir})`);
    }
    if (ctx.whaleActivity) {
      const whaleEmoji = ctx.whaleActivity.sentiment === "bullish" ? "🐋" :
                         ctx.whaleActivity.sentiment === "bearish" ? "🔴" : "⚪";
      logLine(`${whaleEmoji} Whales: ${ctx.whaleActivity.sentiment.toUpperCase()}`);
    }
    sep();
    logEmpty();
    const tldr = this.getTLDR(ctx);
    const tldrEmoji = tldr.includes("ACCUMULATION") || tldr.includes("bullish") ? "💡" :
                      tldr.includes("DISTRIBUTION") || tldr.includes("bearish") ? "⚠️" : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();
  }

  async stop(): Promise<void> {
    this.cache.clear();
    logger.info("[VinceSanbaseService] Stopped");
  }

  isConfigured(): boolean {
    return !!this.apiKey;
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

  // Date helpers
  private getDateRange(daysBack: number, lagged: boolean = false): { from: string; to: string } {
    // Use actual current date - Santiment keeps their data current
    const now = new Date();
    const to = new Date(now);
    const from = new Date(now);
    
    if (lagged) {
      to.setDate(to.getDate() - 30); // 30-day lag for restricted metrics on free tier
    }
    from.setDate(from.getDate() - daysBack - (lagged ? 30 : 0));
    
    return {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    };
  }

  // GraphQL execution
  private async executeGraphQL<T>(query: string): Promise<T | null> {
    if (!this.apiKey) {
      logger.error("[VinceSanbaseService] No API key configured");
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(SANBASE_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Apikey ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          logger.error("[VinceSanbaseService] Invalid API key");
        } else if (response.status === 429) {
          logger.warn("[VinceSanbaseService] Rate limit hit");
        } else {
          logger.warn({ status: response.status }, "[VinceSanbaseService] API error");
        }
        return null;
      }

      const data = await response.json();
      
      // Debug log for troubleshooting
      logger.debug(`[VinceSanbaseService] API response keys: ${Object.keys(data).join(', ')}`);
      
      if (data.errors?.length > 0) {
        // Check if errors are just about invalid date ranges (expected for future dates)
        const isDateError = data.errors.every((e: { message?: string }) => 
          e.message?.includes('invalid value') && (e.message?.includes('from') || e.message?.includes('to'))
        );
        if (!isDateError) {
          logger.warn(`[VinceSanbaseService] GraphQL errors: ${JSON.stringify(data.errors)}`);
        }
        // If there are errors but also data, still return the data
        if (!data.data) {
          return null;
        }
      }
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      logger.warn({ error }, "[VinceSanbaseService] Fetch failed");
      return null;
    }
  }

  // Get latest value from timeseries
  private getLatestValue(data: TimeseriesData[] | null): number | null {
    if (!data || data.length === 0) return null;
    return data[data.length - 1].value;
  }

  // Detect trend from timeseries
  private detectTrend(data: TimeseriesData[] | null): "increasing" | "stable" | "decreasing" {
    if (!data || data.length < 7) return "stable";
    
    const recent = data.slice(-7);
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    const change = (last - first) / first;
    
    if (change > 0.1) return "increasing";
    if (change < -0.1) return "decreasing";
    return "stable";
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get network activity for an asset
   */
  async getNetworkActivity(asset: string): Promise<NetworkActivity | null> {
    const slug = getSantimentSlug(asset);
    if (!slug) return null;

    const cacheKey = `network:${slug}`;
    const cached = this.getCached<NetworkActivity>(cacheKey);
    if (cached) return cached;

    const { from, to } = this.getDateRange(30);
    
    const query = `{
      activeAddresses: getMetric(metric: "active_addresses_24h") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
      networkGrowth: getMetric(metric: "network_growth") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
      transactionVolume: getMetric(metric: "transaction_volume") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
    }`;

    const result = await this.executeGraphQL<{
      data?: {
        activeAddresses?: { timeseriesData?: TimeseriesData[] };
        networkGrowth?: { timeseriesData?: TimeseriesData[] };
        transactionVolume?: { timeseriesData?: TimeseriesData[] };
      };
    }>(query);

    if (!result?.data) return null;

    const activeAddresses = result.data.activeAddresses?.timeseriesData || null;
    const networkGrowth = result.data.networkGrowth?.timeseriesData || null;
    const transactionVolume = result.data.transactionVolume?.timeseriesData || null;

    const activity: NetworkActivity = {
      activeAddresses: this.getLatestValue(activeAddresses),
      networkGrowth: this.getLatestValue(networkGrowth),
      transactionVolume: this.getLatestValue(transactionVolume),
      trend: this.detectTrend(activeAddresses),
    };

    this.setCache(cacheKey, activity);
    return activity;
  }

  /**
   * Get exchange flows for an asset (30-day lagged on free tier)
   */
  async getExchangeFlows(asset: string): Promise<ExchangeFlows | null> {
    const slug = getSantimentSlug(asset);
    if (!slug) return null;

    const cacheKey = `flows:${slug}`;
    const cached = this.getCached<ExchangeFlows>(cacheKey);
    if (cached) return cached;

    const { from, to } = this.getDateRange(30, true); // Lagged
    
    const query = `{
      inflow: getMetric(metric: "exchange_inflow") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
      outflow: getMetric(metric: "exchange_outflow") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
    }`;

    const result = await this.executeGraphQL<{
      data?: {
        inflow?: { timeseriesData?: TimeseriesData[] };
        outflow?: { timeseriesData?: TimeseriesData[] };
      };
    }>(query);

    if (!result?.data) return null;

    const inflowVal = this.getLatestValue(result.data.inflow?.timeseriesData || null);
    const outflowVal = this.getLatestValue(result.data.outflow?.timeseriesData || null);
    const netFlow = inflowVal && outflowVal ? outflowVal - inflowVal : null;

    let sentiment: "accumulation" | "neutral" | "distribution" = "neutral";
    if (netFlow && netFlow > 0) sentiment = "accumulation";
    else if (netFlow && netFlow < 0) sentiment = "distribution";

    const flows: ExchangeFlows = {
      inflow: inflowVal,
      outflow: outflowVal,
      netFlow,
      sentiment,
      isLagged: true,
    };

    this.setCache(cacheKey, flows);
    return flows;
  }

  /**
   * Get dev activity for an asset
   */
  async getDevActivity(asset: string): Promise<DevActivity | null> {
    const slug = getSantimentSlug(asset);
    if (!slug) return null;

    const cacheKey = `dev:${slug}`;
    const cached = this.getCached<DevActivity>(cacheKey);
    if (cached) return cached;

    const { from, to } = this.getDateRange(90);
    
    const query = `{
      devActivity: getMetric(metric: "dev_activity") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
      contributors: getMetric(metric: "dev_activity_contributors_count") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
    }`;

    const result = await this.executeGraphQL<{
      data?: {
        devActivity?: { timeseriesData?: TimeseriesData[] };
        contributors?: { timeseriesData?: TimeseriesData[] };
      };
    }>(query);

    if (!result?.data) return null;

    const activityVal = this.getLatestValue(result.data.devActivity?.timeseriesData || null);
    const contributorsVal = this.getLatestValue(result.data.contributors?.timeseriesData || null);

    let trend: "active" | "moderate" | "quiet" = "moderate";
    if (activityVal && activityVal > 100) trend = "active";
    else if (activityVal && activityVal < 20) trend = "quiet";

    const dev: DevActivity = {
      activity: activityVal,
      contributors: contributorsVal,
      trend,
    };

    this.setCache(cacheKey, dev);
    return dev;
  }

  /**
   * Get whale activity for an asset (30-day lagged on free tier)
   */
  async getWhaleActivity(asset: string): Promise<WhaleActivity | null> {
    const slug = getSantimentSlug(asset);
    if (!slug) return null;

    const cacheKey = `whale:${slug}`;
    const cached = this.getCached<WhaleActivity>(cacheKey);
    if (cached) return cached;

    const { from, to } = this.getDateRange(30, true); // Lagged
    
    const query = `{
      volume: getMetric(metric: "whale_transaction_volume_100k_usd_to_inf") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
      count: getMetric(metric: "whale_transaction_count_100k_usd_to_inf") {
        timeseriesData(slug: "${slug}", from: "${from}", to: "${to}", interval: "1d") {
          datetime
          value
        }
      }
    }`;

    const result = await this.executeGraphQL<{
      data?: {
        volume?: { timeseriesData?: TimeseriesData[] };
        count?: { timeseriesData?: TimeseriesData[] };
      };
    }>(query);

    if (!result?.data) return null;

    const volumeData = result.data.volume?.timeseriesData || null;
    const countVal = this.getLatestValue(result.data.count?.timeseriesData || null);

    let sentiment: "bullish" | "neutral" | "bearish" = "neutral";
    const trend = this.detectTrend(volumeData);
    if (trend === "increasing") sentiment = "bullish";
    else if (trend === "decreasing") sentiment = "bearish";

    const whale: WhaleActivity = {
      volume: this.getLatestValue(volumeData),
      count: countVal,
      sentiment,
      isLagged: true,
    };

    this.setCache(cacheKey, whale);
    return whale;
  }

  /**
   * Get comprehensive on-chain context for an asset
   */
  async getOnChainContext(asset: string): Promise<OnChainContext> {
    const [networkActivity, exchangeFlows, devActivity, whaleActivity] = await Promise.all([
      this.getNetworkActivity(asset),
      this.getExchangeFlows(asset),
      this.getDevActivity(asset),
      this.getWhaleActivity(asset),
    ]);

    return {
      asset: asset.toUpperCase(),
      networkActivity,
      exchangeFlows,
      devActivity,
      whaleActivity,
      timestamp: Date.now(),
    };
  }

  /**
   * Get on-chain context for all core assets (BTC, ETH, SOL, HYPE)
   */
  async getCoreAssetsContext(): Promise<Record<string, OnChainContext>> {
    const results: Record<string, OnChainContext> = {};
    
    for (const asset of CORE_ASSETS) {
      results[asset] = await this.getOnChainContext(asset);
    }
    
    return results;
  }
}

export default VinceSanbaseService;
