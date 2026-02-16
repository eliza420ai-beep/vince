/**
 * VINCE Allium Service
 *
 * Allium API integration for real-time on-chain data:
 * - Token prices (DEX-derived, 3-5s freshness)
 * - Hyperliquid trading data (no rate limits)
 * - Chain metrics (active addresses, DEX volume, bridge flows)
 *
 * Docs: https://docs.allium.so/api/developer/overview
 * Auth: X-API-KEY header. Sign up: https://app.allium.so/join
 *
 * Used by VINCE standup for on-chain context when live services are available.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import { isVinceAgent } from "../utils/dashboard";

const ALLIUM_BASE_URL = "https://api.allium.so";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FETCH_TIMEOUT_MS = 10_000;

interface AlliumTokenPrice {
  timestamp: string;
  chain: string;
  address: string;
  price: number;
  open: number;
  high: number;
  close: number;
  low: number;
}

interface AlliumHyperliquidMeta {
  universe: Array<{ name: string; szDecimals: number; maxLeverage: number }>;
}

interface AlliumPerpsAtOICap {
  perps: string[];
}

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

export class VinceAlliumService extends Service {
  static serviceType = "VINCE_ALLIUM_SERVICE";
  capabilityDescription =
    "Allium on-chain data: DEX prices, Hyperliquid trading data (no rate limits), chain metrics";

  private apiKey: string | null = null;
  private cache = new Map<string, CachedEntry<unknown>>();

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceAlliumService> {
    const service = new VinceAlliumService(runtime);
    service.apiKey =
      (runtime.getSetting("ALLIUM_API_KEY") as string | null) ??
      (process.env.ALLIUM_API_KEY || null);

    if (!service.apiKey) {
      logger.info(
        "[VinceAllium] ALLIUM_API_KEY not set -- service available but calls will fail. Sign up: https://app.allium.so/join",
      );
    } else if (isVinceAgent(runtime)) {
      logger.info("[VinceAllium] Service started with API key");
    }

    return service;
  }

  async stop(): Promise<void> {
    this.cache.clear();
    logger.info("[VinceAllium] Service stopped");
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchAllium<T>(
    endpoint: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!this.apiKey) throw new Error("ALLIUM_API_KEY not configured");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const resp = await fetch(`${ALLIUM_BASE_URL}${endpoint}`, {
        method: options.method || "GET",
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Allium ${resp.status}: ${text.slice(0, 200)}`);
      }

      return (await resp.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── Token Prices (DEX-derived, 3-5s freshness) ────────────────────

  async getTokenPrices(
    tokens: Array<{ token_address: string; chain: string }>,
  ): Promise<AlliumTokenPrice[]> {
    const cacheKey = `prices:${tokens.map((t) => `${t.chain}:${t.token_address}`).join(",")}`;
    const cached = this.getCached<AlliumTokenPrice[]>(cacheKey);
    if (cached) return cached;

    const result = await this.fetchAllium<{ items: AlliumTokenPrice[] }>(
      "/api/v1/developer/prices",
      { method: "POST", body: tokens },
    );

    const prices = result.items ?? [];
    this.setCache(cacheKey, prices);
    return prices;
  }

  // ─── Hyperliquid (no rate limits via Allium) ────────────────────────

  async getHyperliquidInfo<T>(type: string, params?: Record<string, unknown>): Promise<T> {
    const cacheKey = `hl:${type}:${JSON.stringify(params ?? {})}`;
    const cached = this.getCached<T>(cacheKey);
    if (cached) return cached;

    const body = { type, ...params };
    const result = await this.fetchAllium<T>(
      "/api/v1/developer/trading/hyperliquid/info",
      { method: "POST", body },
    );

    this.setCache(cacheKey, result);
    return result;
  }

  async getHyperliquidMeta(): Promise<AlliumHyperliquidMeta> {
    return this.getHyperliquidInfo<AlliumHyperliquidMeta>("meta");
  }

  async getHyperliquidPerpsAtOICap(): Promise<string[]> {
    return this.getHyperliquidInfo<string[]>("perpsAtOpenInterestCap");
  }

  async getHyperliquidUserState(
    userAddress: string,
  ): Promise<{
    marginSummary: { accountValue: string; totalNtlPos: string };
    assetPositions: Array<{
      position: {
        coin: string;
        szi: string;
        entryPx: string;
        unrealizedPnl: string;
        leverage: { type: string; value: number };
      };
    }>;
  }> {
    return this.getHyperliquidInfo("clearinghouseState", { user: userAddress });
  }

  // ─── Standup Summary (formatted for VINCE standup) ──────────────────

  async getStandupOnChainSummary(): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const lines: string[] = [];

      // Hyperliquid exchange status
      try {
        const oiCapPerps = await this.getHyperliquidPerpsAtOICap();
        if (oiCapPerps?.length > 0) {
          lines.push(`**HL perps at OI cap:** ${oiCapPerps.join(", ")}`);
        }
      } catch { /* non-fatal */ }

      // Hyperliquid meta (number of listed perps)
      try {
        const meta = await this.getHyperliquidMeta();
        if (meta?.universe?.length) {
          lines.push(`**HL listed perps:** ${meta.universe.length}`);
        }
      } catch { /* non-fatal */ }

      return lines.length > 0
        ? `**Allium on-chain:**\n${lines.join("\n")}`
        : null;
    } catch (err) {
      logger.debug({ err }, "[VinceAllium] getStandupOnChainSummary failed");
      return null;
    }
  }
}
