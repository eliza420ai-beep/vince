/**
 * Vince Nansen Service
 *
 * Simplified Nansen integration for VINCE smart money tracking.
 * Focuses on: smart money tokens, DEX trades, who bought/sold.
 *
 * Data Source: Nansen API v1 (100 free credits)
 * Endpoint: https://api.nansen.ai/api/v1/*
 *
 * Credit Costs:
 * - Token Screener: 1 credit
 * - DEX Trades: 1 credit
 * - Who Bought/Sold: 1 credit
 * - Holders: 5 credits (use sparingly!)
 *
 * API Docs: https://docs.nansen.ai/api/token-god-mode/token-screener
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";

// Types
export type NansenChain =
  | "ethereum"
  | "solana"
  | "base"
  | "arbitrum"
  | "polygon"
  | "optimism";

export interface SmartMoneyToken {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  buyVolume: number;
  sellVolume: number;
  netFlow: number;
  smartMoneyBuyers: number;
  smartMoneySellers: number;
  priceChange24h: number;
}

export interface SmartMoneyTrade {
  wallet: string;
  walletLabels: string[];
  tokenAddress: string;
  tokenSymbol: string;
  side: "BUY" | "SELL";
  volumeUsd: number;
  timestamp: number;
}

export interface WhoBoughtSold {
  wallet: string;
  walletLabels: string[];
  boughtVolumeUsd: number;
  soldVolumeUsd: number;
  netVolumeUsd: number;
  txCount: number;
}

export interface NansenCreditUsage {
  used: number;
  remaining: number;
  total: number;
  warningLevel: "ok" | "low" | "critical" | "empty";
}

const NANSEN_API_BASE = "https://api.nansen.ai/api/v1";
const FREE_TIER_CREDITS = 100;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (save credits)
const TIMEOUT_MS = 20000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class VinceNansenService extends Service {
  static serviceType = "VINCE_NANSEN_SERVICE";
  capabilityDescription =
    "Provides Nansen smart money tracking (100 free credits)";

  private apiKey: string = "";
  private creditsUsed: number = 0;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(protected runtime: IAgentRuntime) {
    super();

    const fromRuntime = runtime.getSetting("NANSEN_API_KEY");
    const fromEnv = process.env.NANSEN_API_KEY;
    this.apiKey = (fromRuntime || fromEnv || "").toString().trim();

    if (!this.apiKey) {
      logger.debug(
        "[VinceNansenService] NANSEN_API_KEY not set - API calls will fail",
      );
    } else {
      logger.debug("[VinceNansenService] Initialized with API key");
    }
  }

  static async start(runtime: IAgentRuntime): Promise<VinceNansenService> {
    return new VinceNansenService(runtime);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async stop(): Promise<void> {
    this.cache.clear();
    logger.info(
      `[VinceNansenService] Stopped. Credits used: ${this.creditsUsed}/${FREE_TIER_CREDITS}`,
    );
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

  // Credit tracking
  private trackCredits(cost: number): void {
    this.creditsUsed += cost;
    const remaining = FREE_TIER_CREDITS - this.creditsUsed;

    logger.info(
      { cost, used: this.creditsUsed, remaining },
      "[VinceNansenService] Credit used",
    );

    if (remaining <= 5 && remaining > 0) {
      logger.warn(
        `[VinceNansenService] ⚠️ CRITICAL: Only ${remaining} credits remaining!`,
      );
    } else if (remaining <= 20) {
      logger.warn(
        `[VinceNansenService] ⚠️ Low credits: ${remaining} remaining`,
      );
    }
  }

  getCreditUsage(): NansenCreditUsage {
    const remaining = FREE_TIER_CREDITS - this.creditsUsed;
    let warningLevel: NansenCreditUsage["warningLevel"] = "ok";
    if (remaining <= 0) warningLevel = "empty";
    else if (remaining <= 5) warningLevel = "critical";
    else if (remaining <= 20) warningLevel = "low";

    return {
      used: this.creditsUsed,
      remaining,
      total: FREE_TIER_CREDITS,
      warningLevel,
    };
  }

  // HTTP helper
  private async fetchNansen<T>(
    endpoint: string,
    body: Record<string, unknown>,
    creditCost: number,
  ): Promise<T | null> {
    const cacheKey = `${endpoint}:${JSON.stringify(body)}`;
    const cached = this.getCached<T>(cacheKey);
    if (cached) return cached;

    if (!this.apiKey) {
      logger.error("[VinceNansenService] No API key configured");
      return null;
    }

    const remaining = FREE_TIER_CREDITS - this.creditsUsed;
    if (remaining < creditCost) {
      logger.error(
        { creditCost, remaining },
        "[VinceNansenService] Insufficient credits",
      );
      return null;
    }

    const url = `${NANSEN_API_BASE}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey: this.apiKey,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      this.trackCredits(creditCost);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logger.error(
            "[VinceNansenService] Authentication failed - check NANSEN_API_KEY",
          );
        } else if (response.status === 429) {
          logger.warn("[VinceNansenService] Rate limit hit");
        } else {
          logger.error(
            { status: response.status, endpoint },
            "[VinceNansenService] API error",
          );
        }
        return null;
      }

      const data = (await response.json()) as T;
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error({ error, endpoint }, "[VinceNansenService] Fetch failed");
      return null;
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get smart money tokens - the most valuable endpoint (1 credit)
   * Shows what tokens smart money is buying/selling
   *
   * Uses the Token Screener endpoint with smart money filter enabled
   * API: POST /api/v1/token-screener
   */
  async getSmartMoneyTokens(
    chains: NansenChain[] = ["ethereum", "solana", "base"],
    timeframe: "5m" | "10m" | "1h" | "6h" | "24h" | "7d" | "30d" = "24h",
  ): Promise<SmartMoneyToken[]> {
    const result = await this.fetchNansen<{ data: any[] }>(
      "/token-screener",
      {
        chains,
        timeframe,
        filters: { only_smart_money: true },
        order_by: [{ field: "buy_volume", direction: "DESC" }],
        pagination: { page: 1, per_page: 20 },
      },
      1,
    );

    if (!result?.data) return [];

    return result.data.map((t) => ({
      tokenAddress: t.token_address || "",
      tokenSymbol: t.token_symbol || "",
      tokenName: t.token_symbol || "", // API doesn't return name, use symbol
      chain: t.chain || "",
      buyVolume: t.buy_volume || 0,
      sellVolume: t.sell_volume || 0,
      netFlow: t.netflow || (t.buy_volume || 0) - (t.sell_volume || 0),
      smartMoneyBuyers: t.smart_money_buyers || 0,
      smartMoneySellers: t.smart_money_sellers || 0,
      priceChange24h: t.price_change || 0,
    }));
  }

  /**
   * Get DEX trades for a token (1 credit)
   * Can filter for smart money trades only
   *
   * API: POST /api/v1/token-god-mode/dex-trades
   */
  async getSmartMoneyTrades(
    chain: NansenChain,
    tokenAddress: string,
  ): Promise<SmartMoneyTrade[]> {
    const result = await this.fetchNansen<{ data: any[] }>(
      "/token-god-mode/dex-trades",
      {
        chain,
        token_address: tokenAddress,
        only_smart_money: true,
        timeframe: "24h",
        order_by: [{ field: "block_timestamp", direction: "DESC" }],
        pagination: { page: 1, per_page: 50 },
      },
      1,
    );

    if (!result?.data) return [];

    return result.data.map((t) => ({
      wallet: t.wallet_address || "",
      walletLabels: t.labels || [],
      tokenAddress: t.token_address || "",
      tokenSymbol: t.token_symbol || t.symbol || "",
      side: t.side || "BUY",
      volumeUsd: t.volume_usd || t.volume || 0,
      timestamp: t.block_timestamp || t.timestamp || 0,
    }));
  }

  /**
   * Get who bought/sold a token (1 credit)
   * Shows aggregate volumes by wallet
   *
   * API: POST /api/v1/token-god-mode/who-bought-sold
   */
  async getWhoBoughtSold(
    chain: NansenChain,
    tokenAddress: string,
    side: "BUY" | "SELL" = "BUY",
  ): Promise<WhoBoughtSold[]> {
    const result = await this.fetchNansen<{ data: any[] }>(
      "/token-god-mode/who-bought-sold",
      {
        chain,
        token_address: tokenAddress,
        buy_or_sell: side,
        timeframe: "7d",
        order_by: [
          {
            field: side === "BUY" ? "bought_volume_usd" : "sold_volume_usd",
            direction: "DESC",
          },
        ],
        pagination: { page: 1, per_page: 20 },
      },
      1,
    );

    if (!result?.data) return [];

    return result.data.map((w) => ({
      wallet: w.wallet_address || "",
      walletLabels: w.labels || [],
      boughtVolumeUsd: w.bought_volume_usd || w.buy_volume || 0,
      soldVolumeUsd: w.sold_volume_usd || w.sell_volume || 0,
      netVolumeUsd:
        (w.bought_volume_usd || w.buy_volume || 0) -
        (w.sold_volume_usd || w.sell_volume || 0),
      txCount: w.tx_count || 0,
    }));
  }

  /**
   * Check if smart money is accumulating a meme token
   * Useful for MEMETICS analysis
   */
  async isSmartMoneyAccumulating(
    chain: NansenChain,
    tokenAddress: string,
  ): Promise<{
    accumulating: boolean;
    netFlow: number;
    topBuyers: WhoBoughtSold[];
    confidence: "high" | "medium" | "low";
  }> {
    const buyers = await this.getWhoBoughtSold(chain, tokenAddress, "BUY");
    const sellers = await this.getWhoBoughtSold(chain, tokenAddress, "SELL");

    const totalBought = buyers.reduce((sum, b) => sum + b.boughtVolumeUsd, 0);
    const totalSold = sellers.reduce((sum, s) => sum + s.soldVolumeUsd, 0);
    const netFlow = totalBought - totalSold;

    // Check for smart money labels in top buyers
    const smartLabels = ["Smart Trader", "Fund", "30D Smart Trader", "Whale"];
    const smartBuyers = buyers.filter((b) =>
      b.walletLabels.some((l) => smartLabels.includes(l)),
    );

    let confidence: "high" | "medium" | "low" = "low";
    if (smartBuyers.length >= 3 && netFlow > 100000) confidence = "high";
    else if (smartBuyers.length >= 1 && netFlow > 10000) confidence = "medium";

    return {
      accumulating: netFlow > 0 && smartBuyers.length > 0,
      netFlow,
      topBuyers: smartBuyers.slice(0, 5),
      confidence,
    };
  }

  /**
   * Get hot smart money tokens on BASE and SOLANA
   * Specifically for meme tracking
   */
  async getHotMemeTokens(): Promise<SmartMoneyToken[]> {
    const tokens = await this.getSmartMoneyTokens(["base", "solana"], "24h");

    // Filter for meme-like characteristics (high volume, many traders)
    return tokens
      .filter(
        (t) => t.smartMoneyBuyers >= 2 && t.buyVolume > 50000 && t.netFlow > 0,
      )
      .slice(0, 10);
  }
}

export default VinceNansenService;
