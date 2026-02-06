/**
 * VINCE Meteora Service
 *
 * LP pool discovery for DCA strategy:
 * - Find LP pools for meme tokens
 * - Check pool availability and bin widths
 * - Track APY and TVL
 *
 * Uses Meteora DLMM API (FREE)
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { MeteoraPool } from "../types/index";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import { isVinceAgent, isElizaAgent } from "../utils/dashboard";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class VinceMeteoraService extends Service {
  static serviceType = "VINCE_METEORA_SERVICE";
  capabilityDescription = "Meteora LP pools for DCA strategy";

  private poolCache: Map<string, MeteoraPool> = new Map();
  private topPools: MeteoraPool[] = [];
  private lastUpdate = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceMeteoraService> {
    const service = new VinceMeteoraService(runtime);
    if (!isElizaAgent(runtime)) {
      try {
        await service.initialize();
      } catch (error) {
        logger.warn(
          `[VinceMeteora] Initialization error (service still available): ${error}`,
        );
      }
    }
    if (isVinceAgent(runtime)) {
      service.printDashboard();
    }
    logger.info("[VinceMeteora] ✅ Service started");
    return service;
  }

  /**
   * Print dashboard (same box style as paper trade-opened banner).
   */
  private printDashboard(): void {
    const status = this.getStatus();
    startBox();
    logLine("🌊 METEORA LP DASHBOARD");
    logEmpty();
    sep();
    logEmpty();
    logLine(`📊 Pools Tracked: ${status.poolCount}`);
    logEmpty();
    sep();
    logEmpty();
    logLine("💰 TOP POOLS BY TVL:");
    const topPools = this.getTopPools(5);
    if (topPools.length > 0) {
      for (const pool of topPools) {
        const tvlStr = `$${(pool.tvl / 1e6).toFixed(1)}M`;
        const apyPct = (pool.apy * 100).toFixed(1);
        const binStr = pool.binWidth ? `${pool.binWidth}bp` : "";
        logLine(
          `   ${pool.tokenA}/${pool.tokenB} │ ${tvlStr} TVL │ ${apyPct}% APY ${binStr}`,
        );
      }
    } else {
      logLine("   Loading pools...");
    }
    logEmpty();
    sep();
    logEmpty();
    const tldr = this.getTLDR();
    const tldrEmoji =
      tldr.includes("HOT") || tldr.includes("OPPORTUNITY")
        ? "💡"
        : tldr.includes("CAUTION")
          ? "⚠️"
          : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();
  }

  /**
   * Generate actionable TLDR for dashboard
   */
  getTLDR(): string {
    const memeOpps = this.getMemePoolOpportunities();
    const topPools = this.getTopPools(5);

    // Priority 1: Meme pool opportunities (high activity)
    if (memeOpps.length > 0) {
      const best = memeOpps[0];
      return `HOT POOL: ${best.tokenA}/${best.tokenB} high volume - check for LP entry`;
    }

    // Priority 2: Top TVL pools activity
    if (topPools.length > 0) {
      const top = topPools[0];
      const totalTvl = topPools.reduce((sum, p) => sum + p.tvl, 0);
      if (totalTvl > 100e6) {
        // $100M+ total TVL across top pools
        return `DEEP LIQUIDITY: $${(totalTvl / 1e6).toFixed(0)}M in top pools - stable LPing`;
      }
      return `TOP POOL: ${top.tokenA}/${top.tokenB} $${(top.tvl / 1e6).toFixed(1)}M TVL`;
    }

    // Default
    return "LP QUIET: Low activity, monitor for opportunities";
  }

  async stop(): Promise<void> {
    logger.info("[VinceMeteora] Service stopped");
  }

  private async initialize(): Promise<void> {
    logger.debug("[VinceMeteora] Service initialized (FREE API)");
    await this.refreshData();
  }

  async refreshData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < CACHE_TTL_MS) {
      return;
    }

    try {
      await this.fetchTopPools();
      this.lastUpdate = now;
    } catch (error) {
      logger.debug(`[VinceMeteora] Refresh error: ${error}`);
    }
  }

  private async fetchTopPools(): Promise<void> {
    try {
      // Fetch DLMM pools
      const res = await fetch("https://dlmm-api.meteora.ag/pair/all");

      if (!res.ok) return;

      const data = await res.json();
      if (!Array.isArray(data)) return;

      // Process top pools by TVL (with volume and APY filters)
      const MIN_VOLUME_24H = 100000; // $100k minimum daily volume
      const MIN_APY = 0.05; // 5% minimum APY

      const sortedPools = data
        .filter((p: any) => p.liquidity > 10000) // Min $10k TVL
        .filter(
          (p: any) => parseFloat(p.trade_volume_24h || 0) > MIN_VOLUME_24H,
        ) // Min $100k volume
        .filter((p: any) => parseFloat(p.apr || 0) >= MIN_APY) // Min 5% APY
        .sort((a: any, b: any) => (b.liquidity || 0) - (a.liquidity || 0))
        .slice(0, 50);

      for (const poolData of sortedPools) {
        const pool: MeteoraPool = {
          address: poolData.address || poolData.pair_address,
          tokenA: poolData.name?.split("-")[0] || poolData.name_x || "UNKNOWN",
          tokenB: poolData.name?.split("-")[1] || poolData.name_y || "UNKNOWN",
          binWidth: parseFloat(poolData.bin_step) / 100 || 0.25, // Convert basis points
          tvl: parseFloat(poolData.liquidity) || 0,
          apy: parseFloat(poolData.apr) || 0,
          volume24h: parseFloat(poolData.trade_volume_24h) || 0,
          hasLp: true,
          timestamp: Date.now(),
        };

        this.poolCache.set(pool.address, pool);
      }

      // Update top pools list
      this.topPools = Array.from(this.poolCache.values())
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 20);
    } catch (error) {
      logger.debug(`[VinceMeteora] Pool fetch error: ${error}`);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): { poolCount: number; lastUpdate: number } {
    return {
      poolCount: this.poolCache.size,
      lastUpdate: this.lastUpdate,
    };
  }

  getTopPools(limit: number = 10): MeteoraPool[] {
    return this.topPools.slice(0, limit);
  }

  getPool(address: string): MeteoraPool | null {
    return this.poolCache.get(address) || null;
  }

  /**
   * Find LP pool for a specific token
   */
  async findPoolForToken(tokenMint: string): Promise<MeteoraPool | null> {
    try {
      const res = await fetch(
        `https://dlmm-api.meteora.ag/pair/all_by_groups?token_mints=${tokenMint}`,
      );

      if (!res.ok) return null;

      const data = await res.json();
      if (!data.groups?.[0]?.pairs?.[0]) return null;

      const poolData = data.groups[0].pairs[0];

      return {
        address: poolData.address,
        tokenA: poolData.name?.split("-")[0] || poolData.name_x || "UNKNOWN",
        tokenB: poolData.name?.split("-")[1] || poolData.name_y || "UNKNOWN",
        binWidth: parseFloat(poolData.bin_step) / 100 || 0.25,
        tvl: parseFloat(poolData.liquidity) || 0,
        apy: parseFloat(poolData.apr) || 0,
        volume24h: parseFloat(poolData.trade_volume_24h) || 0,
        hasLp: true,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.debug(`[VinceMeteora] Token pool search error: ${error}`);
      return null;
    }
  }

  /**
   * Check if a token has available LP
   */
  async hasLpPool(tokenMint: string): Promise<boolean> {
    const pool = await this.findPoolForToken(tokenMint);
    return pool !== null && pool.tvl > 5000; // Min $5k TVL
  }

  /**
   * Get pools with high APY
   */
  getHighApyPools(minApy: number = 50): MeteoraPool[] {
    return this.topPools.filter((p) => p.apy >= minApy);
  }

  /**
   * Get pools for memecoins (high volume relative to TVL)
   */
  getMemePoolOpportunities(): MeteoraPool[] {
    return this.topPools.filter((p) => {
      const volumeTvlRatio = p.volume24h / (p.tvl || 1);
      return volumeTvlRatio > 0.5; // High trading activity
    });
  }
}
