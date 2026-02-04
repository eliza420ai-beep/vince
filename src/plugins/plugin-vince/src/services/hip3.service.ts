/**
 * VINCE HIP-3 Service
 *
 * Direct Hyperliquid API integration for HIP-3 asset prices.
 * Self-contained service - no dependency on plugin-hyperliquid.
 *
 * Features:
 * - Fetches prices from all HIP-3 DEXes (xyz, flx, vntl, km)
 * - Caching with 30-second TTL
 * - Symbol normalization (strips DEX prefix)
 * - Categorization (commodity, index, stock, ai_tech)
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";
import { isVinceAgent } from "../utils/dashboard";
import {
  HIP3_COMMODITIES,
  HIP3_INDICES,
  HIP3_STOCKS,
  HIP3_AI_TECH,
  HIP3_ASSETS,
  HIP3_DEX_MAPPING,
  normalizeHIP3Symbol,
  getHIP3Category,
  type HIP3Dex,
} from "../constants/targetAssets";

// ============================================================================
// TYPES
// ============================================================================

export interface HIP3AssetPrice {
  symbol: string;           // Normalized (e.g., "NVDA")
  apiSymbol: string;        // Original (e.g., "xyz:NVDA")
  dex: HIP3Dex | string;    // "xyz" | "flx" | "vntl" | "km"
  category: "commodity" | "index" | "stock" | "ai_tech";
  price: number;
  change24h: number;
  volume24h: number;
  openInterest: number;
  funding8h: number;
}

export interface SectorStats {
  avgChange: number;
  totalVolume: number;
  totalOI: number;
  assetCount: number;
}

export interface FundingExtreme {
  symbol: string;
  rate: number;
  interpretation: "longs_paying" | "shorts_paying" | "neutral";
}

export interface HIP3Pulse {
  timestamp: number;
  commodities: HIP3AssetPrice[];
  indices: HIP3AssetPrice[];
  stocks: HIP3AssetPrice[];
  aiPlays: HIP3AssetPrice[];
  summary: {
    topPerformer: { symbol: string; change: number } | null;
    worstPerformer: { symbol: string; change: number } | null;
    goldVsBtc: { goldChange: number; btcChange: number; winner: string };
    tradFiVsCrypto: "tradfi_outperforming" | "crypto_outperforming" | "neutral";
    overallBias: "bullish" | "bearish" | "mixed";
  };
  // Enhanced sector-level stats
  sectorStats: {
    commodities: SectorStats;
    indices: SectorStats;
    stocks: SectorStats;
    aiPlays: SectorStats;
    hottestSector: "commodities" | "indices" | "stocks" | "ai_tech";
  };
  // Funding extremes
  fundingExtremes: {
    highest: FundingExtreme | null;
    lowest: FundingExtreme | null;
    crowdedLongs: string[];   // Symbols with high positive funding
    crowdedShorts: string[];  // Symbols with high negative funding
  };
  // Volume and OI leaders
  leaders: {
    volumeLeaders: { symbol: string; volume: number }[];
    oiLeaders: { symbol: string; oi: number }[];
  };
}

// Hyperliquid API response types
interface HyperliquidMarket {
  name: string;
  maxLeverage?: number;
}

interface HyperliquidAssetCtx {
  funding: string;
  openInterest: string;
  markPx: string;
  midPx?: string;
  oraclePx?: string;
  prevDayPx: string;
  dayNtlVlm?: string;
  premium?: string;
}

interface HyperliquidMeta {
  universe: HyperliquidMarket[];
}

type HyperliquidMetaAndAssetCtxs = [HyperliquidMeta, HyperliquidAssetCtx[]];

// ============================================================================
// CONSTANTS
// ============================================================================

const HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz/info";
const CACHE_TTL_MS = 30_000; // 30 seconds
const REQUEST_TIMEOUT_MS = 15_000; // 15 seconds (increased)
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

// ============================================================================
// SERVICE
// ============================================================================

export class VinceHIP3Service extends Service {
  static serviceType = "VINCE_HIP3_SERVICE";
  capabilityDescription = "Direct Hyperliquid API integration for HIP-3 asset prices";

  private cache: {
    data: HIP3Pulse | null;
    timestamp: number;
  } = { data: null, timestamp: 0 };

  // Circuit breaker state
  private consecutiveErrors = 0;
  private circuitOpen = false;
  private circuitOpenedAt = 0;
  private readonly CIRCUIT_THRESHOLD = 5;
  private readonly CIRCUIT_RESET_MS = 60000;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceHIP3Service> {
    const service = new VinceHIP3Service(runtime);
    logger.info("[VinceHIP3] Service initialized");
    if (isVinceAgent(runtime)) {
      service.runStartupVerification().catch(() => {});
    }
    return service;
  }

  /**
   * Run startup verification to confirm API connectivity
   */
  private async runStartupVerification(): Promise<void> {
    try {
      const pulse = await this.getHIP3Pulse();
      if (pulse) {
        this.printHIP3Dashboard(pulse);
      } else {
        console.log(`  [VINCE] ⚠️  HIP-3 API: No data available`);
      }
    } catch (e) {
      console.log(`  [VINCE] ⚠️  HIP-3 API test failed: ${e}`);
    }
  }

  /**
   * Format number with K/M/B suffix
   */
  private formatVolume(num: number): string {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  }

  /**
   * Format change percentage with color indicator
   */
  private formatChange(change: number): string {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  }

  /**
   * Print sexy HIP-3 dashboard to terminal
   */
  private printHIP3Dashboard(pulse: HIP3Pulse): void {
    const totalAssets = pulse.commodities.length + pulse.indices.length + 
                        pulse.stocks.length + pulse.aiPlays.length;
    
    // Get key prices
    const gold = pulse.commodities.find(c => c.symbol === "GOLD");
    const silver = pulse.commodities.find(c => c.symbol === "SILVER");
    const spx = pulse.indices.find(i => i.symbol === "SPX" || i.symbol === "INFOTECH");
    const nvda = pulse.stocks.find(s => s.symbol === "NVDA");
    const tsla = pulse.stocks.find(s => s.symbol === "TSLA");
    const spacex = pulse.aiPlays.find(a => a.symbol === "SPACEX") || pulse.stocks.find(s => s.symbol === "SPACEX");

    // Find top movers
    const allAssets = [...pulse.commodities, ...pulse.indices, ...pulse.stocks, ...pulse.aiPlays];
    const sortedByChange = [...allAssets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    const topMovers = sortedByChange.slice(0, 3);

    // Find volume leaders
    const sortedByVolume = [...allAssets].sort((a, b) => b.volume24h - a.volume24h);
    const volumeLeaders = sortedByVolume.slice(0, 3);

    startBox();
    logLine("📈 HIP-3 TRADFI DASHBOARD");
    logEmpty();
    sep();
    logEmpty();
    logLine(`Commodities: ${pulse.commodities.length}  Indices: ${pulse.indices.length}  Stocks: ${pulse.stocks.length}  AI/Tech: ${pulse.aiPlays.length}`);
    logEmpty();
    sep();
    logEmpty();
    logLine("💰 ALL HIP-3 PRICES");
    
    // Commodities
    if (pulse.commodities.length > 0) {
      logLine("┈┈ COMMODITIES ┈┈");
      for (let i = 0; i < pulse.commodities.length; i += 2) {
        const c1 = pulse.commodities[i];
        const c2 = pulse.commodities[i + 1];
        const str1 = `${c1.symbol}: $${c1.price.toFixed(2)} (${this.formatChange(c1.change24h)})`.padEnd(32);
        const str2 = c2 ? `${c2.symbol}: $${c2.price.toFixed(2)} (${this.formatChange(c2.change24h)})` : "";
        logLine(`${str1}${str2.padEnd(32)}`);
      }
      sep();
      logEmpty();
    }
    // Indices
    if (pulse.indices.length > 0) {
      logLine("┈┈ INDICES ┈┈");
      for (let i = 0; i < pulse.indices.length; i += 2) {
        const idx1 = pulse.indices[i];
        const idx2 = pulse.indices[i + 1];
        const str1 = `${idx1.symbol}: $${idx1.price.toFixed(2)} (${this.formatChange(idx1.change24h)})`.padEnd(32);
        const str2 = idx2 ? `${idx2.symbol}: $${idx2.price.toFixed(2)} (${this.formatChange(idx2.change24h)})` : "";
        logLine(`${str1}${str2.padEnd(32)}`);
      }
      sep();
      logEmpty();
    }
    // Stocks
    if (pulse.stocks.length > 0) {
      logLine("┈┈ STOCKS ┈┈");
      for (let i = 0; i < pulse.stocks.length; i += 2) {
        const s1 = pulse.stocks[i];
        const s2 = pulse.stocks[i + 1];
        const str1 = `${s1.symbol}: $${s1.price.toFixed(2)} (${this.formatChange(s1.change24h)})`.padEnd(32);
        const str2 = s2 ? `${s2.symbol}: $${s2.price.toFixed(2)} (${this.formatChange(s2.change24h)})` : "";
        logLine(`${str1}${str2.padEnd(32)}`);
      }
      sep();
      logEmpty();
    }
    if (pulse.aiPlays.length > 0) {
      logLine("┈┈ AI/TECH ┈┈");
      for (let i = 0; i < pulse.aiPlays.length; i += 2) {
        const a1 = pulse.aiPlays[i];
        const a2 = pulse.aiPlays[i + 1];
        const str1 = `${a1.symbol}: $${a1.price.toFixed(2)} (${this.formatChange(a1.change24h)})`.padEnd(32);
        const str2 = a2 ? `${a2.symbol}: $${a2.price.toFixed(2)} (${this.formatChange(a2.change24h)})` : "";
        logLine(`${str1}${str2.padEnd(32)}`);
      }
    }
    sep();
    logEmpty();
    logLine("🔥 TOP MOVERS");
    for (const mover of topMovers) {
      const emoji = mover.change24h >= 0 ? "🟢" : "🔴";
      const symbol = mover.symbol.padEnd(10);
      const price = `$${mover.price.toFixed(2)}`.padEnd(12);
      const change = this.formatChange(mover.change24h).padEnd(10);
      const volume = `Vol: ${this.formatVolume(mover.volume24h)}`;
      logLine(`${emoji} ${symbol} ${price} ${change} ${volume}`);
    }
    sep();
    logEmpty();
    logLine("📊 VOLUME LEADERS");
    for (const leader of volumeLeaders) {
      const symbol = leader.symbol.padEnd(10);
      const volume = this.formatVolume(leader.volume24h).padEnd(12);
      const oi = `OI: ${this.formatVolume(leader.openInterest)}`.padEnd(18);
      const funding = `Fund: ${(leader.funding8h * 100).toFixed(4)}%`;
      logLine(`${symbol} ${volume} ${oi} ${funding}`);
    }
    sep();
    logEmpty();
    const { sectorStats } = pulse;
    const sectors = [
      { name: "Commodities", avg: sectorStats.commodities.avgChange },
      { name: "Indices", avg: sectorStats.indices.avgChange },
      { name: "Stocks", avg: sectorStats.stocks.avgChange },
      { name: "AI/Tech", avg: sectorStats.aiPlays.avgChange },
    ].sort((a, b) => b.avg - a.avg);
    
    const hottestEmoji = sectors[0].avg >= 0 ? "🔥" : "❄️";
    const hottestStr = `${hottestEmoji} HOTTEST: ${sectors[0].name} (${this.formatChange(sectors[0].avg)})`;
    const coldestEmoji = sectors[sectors.length - 1].avg >= 0 ? "📈" : "📉";
    const coldestStr = `${coldestEmoji} COLDEST: ${sectors[sectors.length - 1].name} (${this.formatChange(sectors[sectors.length - 1].avg)})`;
    logLine(`${hottestStr}  ${coldestStr}`);
    const biasEmoji = pulse.summary.overallBias === "bullish" ? "🟢" :
                      pulse.summary.overallBias === "bearish" ? "🔴" : "⚪";
    const tradfiVsCrypto = pulse.summary.tradFiVsCrypto === "tradfi_outperforming" ? "TradFi > Crypto" :
                           pulse.summary.tradFiVsCrypto === "crypto_outperforming" ? "Crypto > TradFi" : "Neutral";
    logLine(`${biasEmoji} Bias: ${pulse.summary.overallBias.toUpperCase()}  Rotation: ${tradfiVsCrypto}`);
    sep();
    logEmpty();
    const tldr = this.getTLDR(pulse);
    const tldrEmoji = tldr.includes("RISK-ON") || tldr.includes("rotate into") ? "💡" :
                      tldr.includes("RISK-OFF") || tldr.includes("reduce") ? "⚠️" : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();

    logger.info(`[VinceHIP3] ✅ Dashboard loaded: ${totalAssets} assets across 4 sectors`);
  }

  /**
   * Generate actionable TLDR summary from HIP3 pulse
   */
  private getTLDR(pulse: HIP3Pulse): string {
    const { summary, sectorStats } = pulse;
    
    // Get gold performance for risk sentiment
    const goldChange = summary.goldVsBtc.goldChange;
    const btcChange = summary.goldVsBtc.btcChange;
    
    // Get hottest sector
    const sectors = [
      { name: "Commodities", avg: sectorStats.commodities.avgChange },
      { name: "Indices", avg: sectorStats.indices.avgChange },
      { name: "Stocks", avg: sectorStats.stocks.avgChange },
      { name: "Tech", avg: sectorStats.aiPlays.avgChange },
    ].sort((a, b) => b.avg - a.avg);
    
    const hottestSector = sectors[0];
    const coldestSector = sectors[sectors.length - 1];
    
    // Priority 1: Clear risk-on/risk-off signal
    if (goldChange > 1.5 && btcChange < -1) {
      return "RISK-OFF: Gold up, crypto down - reduce risk exposure";
    }
    if (goldChange < -1 && btcChange > 1.5) {
      return "RISK-ON: Crypto leading, gold weak - favor risk assets";
    }
    
    // Priority 2: TradFi vs Crypto rotation
    if (summary.tradFiVsCrypto === "tradfi_outperforming") {
      return `ROTATION: TradFi leading today, ${hottestSector.name} +${hottestSector.avg.toFixed(1)}%`;
    }
    if (summary.tradFiVsCrypto === "crypto_outperforming") {
      return "ROTATION: Crypto outperforming TradFi today";
    }
    
    // Priority 3: Strong sector moves
    if (hottestSector.avg > 2) {
      return `${hottestSector.name.toUpperCase()} HOT +${hottestSector.avg.toFixed(1)}% - rotate into strength`;
    }
    if (coldestSector.avg < -2) {
      return `${coldestSector.name.toUpperCase()} WEAK ${coldestSector.avg.toFixed(1)}% - avoid or fade`;
    }
    
    // Priority 4: Top performer callout
    if (summary.topPerformer && summary.topPerformer.change > 3) {
      return `${summary.topPerformer.symbol} leading +${summary.topPerformer.change.toFixed(1)}% - momentum play`;
    }
    
    // Default: Overall bias
    if (summary.overallBias === "bullish") {
      return "BULLISH bias - broad strength across sectors";
    }
    if (summary.overallBias === "bearish") {
      return "BEARISH bias - weakness across sectors";
    }
    
    return "MIXED - no clear sector leadership, wait for direction";
  }

  /**
   * Test the HIP-3 API connection and return diagnostic info
   */
  async testConnection(): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      // Try to fetch data from HIP-3 DEXes
      const hip3Data = await this.fetchAllHIP3Dexes();
      
      if (!hip3Data || hip3Data.length === 0) {
        return { success: false, message: "No HIP-3 DEX data returned" };
      }

      // Build pulse to count assets
      const pulse = this.buildHIP3Pulse(hip3Data);
      const totalAssets = this.countHIP3Assets(pulse);

      if (totalAssets === 0) {
        return { success: false, message: "No HIP-3 assets found in API response" };
      }

      // Get sample prices from each category
      const samplePrices: { symbol: string; price: number; category: string }[] = [];
      
      if (pulse.commodities.length > 0) {
        const gold = pulse.commodities.find(c => c.symbol === "GOLD") || pulse.commodities[0];
        samplePrices.push({ symbol: gold.symbol, price: gold.price, category: "commodity" });
      }
      if (pulse.indices.length > 0) {
        const spx = pulse.indices.find(i => i.symbol === "SPX") || pulse.indices[0];
        samplePrices.push({ symbol: spx.symbol, price: spx.price, category: "index" });
      }
      if (pulse.stocks.length > 0) {
        const nvda = pulse.stocks.find(s => s.symbol === "NVDA") || pulse.stocks[0];
        samplePrices.push({ symbol: nvda.symbol, price: nvda.price, category: "stock" });
      }
      if (pulse.aiPlays.length > 0) {
        const first = pulse.aiPlays[0];
        samplePrices.push({ symbol: first.symbol, price: first.price, category: "ai_tech" });
      }

      logger.info(
        `[VinceHIP3] 🔗 API TEST SUCCESS | Assets: ${totalAssets} | ` +
        `Commodities: ${pulse.commodities.length} | Indices: ${pulse.indices.length} | ` +
        `Stocks: ${pulse.stocks.length} | AI: ${pulse.aiPlays.length}`
      );

      return {
        success: true,
        message: `Connected! ${totalAssets} HIP-3 assets available`,
        data: {
          assetCount: totalAssets,
          commodityCount: pulse.commodities.length,
          indexCount: pulse.indices.length,
          stockCount: pulse.stocks.length,
          aiCount: pulse.aiPlays.length,
          samplePrices,
          topPerformer: pulse.summary.topPerformer,
          worstPerformer: pulse.summary.worstPerformer,
        },
      };
    } catch (error) {
      logger.error(`[VinceHIP3] ❌ API TEST FAILED: ${error}`);
      return { success: false, message: `Connection failed: ${error}` };
    }
  }

  async stop(): Promise<void> {
    logger.info("[VinceHIP3] Service stopped");
  }

  /**
   * Check if circuit breaker should allow request
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    if (Date.now() - this.circuitOpenedAt > this.CIRCUIT_RESET_MS) {
      logger.info("[VinceHIP3] Circuit breaker half-open, attempting request");
      return false;
    }
    return true;
  }

  private recordSuccess(): void {
    if (this.circuitOpen) {
      logger.info("[VinceHIP3] Circuit breaker closed after successful request");
    }
    this.consecutiveErrors = 0;
    this.circuitOpen = false;
  }

  private recordFailure(): void {
    this.consecutiveErrors++;
    if (this.consecutiveErrors >= this.CIRCUIT_THRESHOLD && !this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitOpenedAt = Date.now();
      logger.warn("[VinceHIP3] Circuit breaker OPEN - too many consecutive errors");
    }
  }

  /**
   * Core fetch method with retry logic and circuit breaker
   */
  private async fetchInfo<T>(body: object): Promise<T | null> {
    if (this.isCircuitOpen()) {
      logger.debug("[VinceHIP3] Request blocked by circuit breaker");
      return null;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(HYPERLIQUID_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - exponential backoff with jitter
            const backoffMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
            logger.warn(`[VinceHIP3] Rate limited, backing off ${backoffMs}ms (attempt ${attempt + 1})`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          if (response.status >= 500) {
            // Server error - retry with backoff
            const backoffMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
            logger.warn(`[VinceHIP3] Server error ${response.status}, retrying in ${backoffMs}ms`);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          logger.warn(`[VinceHIP3] API error ${response.status}: ${response.statusText}`);
          this.recordFailure();
          return null;
        }

        const data = await response.json() as T;
        this.recordSuccess();
        return data;
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRIES - 1;
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (isLastAttempt) {
          logger.warn(`[VinceHIP3] All ${MAX_RETRIES} retry attempts exhausted: ${errorMsg}`);
          this.recordFailure();
          return null;
        }

        const backoffMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.debug(`[VinceHIP3] Transient error, retrying in ${backoffMs}ms: ${errorMsg}`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    return null;
  }

  /**
   * Fetch all perp metas from Hyperliquid API
   */
  private async fetchAllPerpMetas(): Promise<HyperliquidMetaAndAssetCtxs[] | null> {
    logger.debug("[VinceHIP3] Calling allPerpMetas endpoint...");
    const data = await this.fetchInfo<any[]>({ type: "allPerpMetas" });
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      logger.debug("[VinceHIP3] allPerpMetas returned no data or empty array");
      return null;
    }

    logger.debug(`[VinceHIP3] allPerpMetas returned ${data.length} items`);

    // Parse response - it's an array of [meta, assetCtxs] tuples
    const results: HyperliquidMetaAndAssetCtxs[] = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!Array.isArray(item) || item.length < 2) {
        logger.debug(`[VinceHIP3] Item ${i} is not a valid tuple`);
        continue;
      }

      const [meta, assetCtxs] = item;
      if (!meta?.universe || !Array.isArray(meta.universe)) {
        logger.debug(`[VinceHIP3] Item ${i} has invalid meta.universe`);
        continue;
      }
      if (!Array.isArray(assetCtxs)) {
        logger.debug(`[VinceHIP3] Item ${i} has invalid assetCtxs`);
        continue;
      }

      // Log sample symbols from each DEX
      const sampleSymbols = meta.universe.slice(0, 5).map((m: any) => m.name);
      const hasHip3Prefixes = meta.universe.some((m: any) => m.name?.includes(":"));
      logger.debug(`[VinceHIP3] DEX ${i}: ${meta.universe.length} assets, hasHIP3=${hasHip3Prefixes}, sample: ${sampleSymbols.join(", ")}`);

      results.push([meta, assetCtxs]);
    }

    logger.debug(`[VinceHIP3] Parsed ${results.length} valid DEX results from ${data.length} items`);
    return results.length > 0 ? results : null;
  }

  /**
   * Parse funding rate from API response
   */
  private parseFundingRate(funding: string): number {
    const parsed = parseFloat(funding);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Build HIP-3 pulse from raw API data
   */
  private buildHIP3Pulse(allData: HyperliquidMetaAndAssetCtxs[]): HIP3Pulse {
    const commodities: HIP3AssetPrice[] = [];
    const indices: HIP3AssetPrice[] = [];
    const stocks: HIP3AssetPrice[] = [];
    const aiPlays: HIP3AssetPrice[] = [];

    const seenSymbols = new Set<string>();
    let btcChange = 0;
    
    // Debug: track what we're seeing
    const allSymbols: string[] = [];
    const hip3Matches: string[] = [];

    for (const [meta, assetCtxs] of allData) {
      for (let i = 0; i < meta.universe.length && i < assetCtxs.length; i++) {
        const market = meta.universe[i];
        const ctx = assetCtxs[i];

        if (!market?.name || !ctx) continue;

        const rawName = market.name;
        const normalizedSymbol = normalizeHIP3Symbol(rawName);
        const upperSymbol = normalizedSymbol.toUpperCase();
        
        allSymbols.push(rawName);

        // Track BTC for comparison
        if (upperSymbol === "BTC") {
          const markPx = parseFloat(ctx.markPx) || 0;
          const prevDayPx = parseFloat(ctx.prevDayPx) || markPx;
          btcChange = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;
          continue;
        }

        // Skip if not a HIP-3 asset or already seen
        if (!(HIP3_ASSETS as readonly string[]).includes(upperSymbol)) continue;
        hip3Matches.push(rawName);
        if (seenSymbols.has(upperSymbol)) continue;
        seenSymbols.add(upperSymbol);

        const markPx = parseFloat(ctx.markPx) || 0;
        const prevDayPx = parseFloat(ctx.prevDayPx) || markPx;
        const change24h = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;
        const volume24h = parseFloat(ctx.dayNtlVlm || "0") || 0;
        const openInterest = parseFloat(ctx.openInterest || "0") || 0;
        const funding8h = this.parseFundingRate(ctx.funding);

        // Determine DEX from mapping or extract from API symbol
        let dex: HIP3Dex | string = HIP3_DEX_MAPPING[upperSymbol] || "unknown";
        const colonIndex = rawName.indexOf(":");
        if (colonIndex !== -1) {
          dex = rawName.substring(0, colonIndex).toLowerCase() as HIP3Dex;
        }

        const category = getHIP3Category(upperSymbol);
        if (!category) continue;

        const assetPrice: HIP3AssetPrice = {
          symbol: upperSymbol,
          apiSymbol: rawName,
          dex,
          category,
          price: markPx,
          change24h,
          volume24h,
          openInterest: openInterest * markPx, // Convert to USD
          funding8h,
        };

        // Categorize
        switch (category) {
          case "commodity":
            commodities.push(assetPrice);
            break;
          case "index":
            indices.push(assetPrice);
            break;
          case "stock":
            stocks.push(assetPrice);
            break;
          case "ai_tech":
            aiPlays.push(assetPrice);
            break;
        }
      }
    }

    // Sort each category by change24h descending
    const sortByChange = (a: HIP3AssetPrice, b: HIP3AssetPrice) => b.change24h - a.change24h;
    commodities.sort(sortByChange);
    indices.sort(sortByChange);
    stocks.sort(sortByChange);
    aiPlays.sort(sortByChange);

    // Calculate summary
    const allAssets = [...commodities, ...indices, ...stocks, ...aiPlays];
    
    let topPerformer: { symbol: string; change: number } | null = null;
    let worstPerformer: { symbol: string; change: number } | null = null;
    
    if (allAssets.length > 0) {
      const sorted = [...allAssets].sort((a, b) => b.change24h - a.change24h);
      topPerformer = { symbol: sorted[0].symbol, change: sorted[0].change24h };
      worstPerformer = { symbol: sorted[sorted.length - 1].symbol, change: sorted[sorted.length - 1].change24h };
    }

    // Gold vs BTC comparison
    const goldAsset = commodities.find(c => c.symbol === "GOLD");
    const goldChange = goldAsset?.change24h || 0;
    const goldVsBtc = {
      goldChange,
      btcChange,
      winner: Math.abs(goldChange - btcChange) < 0.5 ? "tie" : 
              goldChange > btcChange ? "gold" : "btc",
    };

    // TradFi vs Crypto rotation
    const hip3AvgChange = allAssets.length > 0 
      ? allAssets.reduce((sum, a) => sum + a.change24h, 0) / allAssets.length 
      : 0;
    
    let tradFiVsCrypto: "tradfi_outperforming" | "crypto_outperforming" | "neutral" = "neutral";
    if (hip3AvgChange > btcChange + 2) {
      tradFiVsCrypto = "tradfi_outperforming";
    } else if (btcChange > hip3AvgChange + 2) {
      tradFiVsCrypto = "crypto_outperforming";
    }

    // Overall bias
    let overallBias: "bullish" | "bearish" | "mixed" = "mixed";
    if (hip3AvgChange > 1) {
      overallBias = "bullish";
    } else if (hip3AvgChange < -1) {
      overallBias = "bearish";
    }

    // Calculate sector stats
    const calcSectorStats = (assets: HIP3AssetPrice[]): SectorStats => {
      if (assets.length === 0) {
        return { avgChange: 0, totalVolume: 0, totalOI: 0, assetCount: 0 };
      }
      return {
        avgChange: assets.reduce((sum, a) => sum + a.change24h, 0) / assets.length,
        totalVolume: assets.reduce((sum, a) => sum + a.volume24h, 0),
        totalOI: assets.reduce((sum, a) => sum + a.openInterest, 0),
        assetCount: assets.length,
      };
    };

    const sectorStatsData = {
      commodities: calcSectorStats(commodities),
      indices: calcSectorStats(indices),
      stocks: calcSectorStats(stocks),
      aiPlays: calcSectorStats(aiPlays),
    };

    // Determine hottest sector by average change
    const sectorAvgs: { sector: "commodities" | "indices" | "stocks" | "ai_tech"; avg: number }[] = [
      { sector: "commodities", avg: sectorStatsData.commodities.avgChange },
      { sector: "indices", avg: sectorStatsData.indices.avgChange },
      { sector: "stocks", avg: sectorStatsData.stocks.avgChange },
      { sector: "ai_tech", avg: sectorStatsData.aiPlays.avgChange },
    ];
    sectorAvgs.sort((a, b) => b.avg - a.avg);
    const hottestSector = sectorAvgs[0].sector;

    // Calculate funding extremes
    const FUNDING_THRESHOLD = 0.0001; // 0.01% - consider crowded
    const allWithFunding = allAssets.filter(a => a.funding8h !== 0);
    
    let highestFunding: FundingExtreme | null = null;
    let lowestFunding: FundingExtreme | null = null;
    const crowdedLongs: string[] = [];
    const crowdedShorts: string[] = [];

    if (allWithFunding.length > 0) {
      const sortedByFunding = [...allWithFunding].sort((a, b) => b.funding8h - a.funding8h);
      
      const highest = sortedByFunding[0];
      highestFunding = {
        symbol: highest.symbol,
        rate: highest.funding8h,
        interpretation: highest.funding8h > FUNDING_THRESHOLD ? "longs_paying" : 
                       highest.funding8h < -FUNDING_THRESHOLD ? "shorts_paying" : "neutral",
      };

      const lowest = sortedByFunding[sortedByFunding.length - 1];
      lowestFunding = {
        symbol: lowest.symbol,
        rate: lowest.funding8h,
        interpretation: lowest.funding8h > FUNDING_THRESHOLD ? "longs_paying" : 
                       lowest.funding8h < -FUNDING_THRESHOLD ? "shorts_paying" : "neutral",
      };

      // Find crowded positions
      for (const asset of allWithFunding) {
        if (asset.funding8h > FUNDING_THRESHOLD * 1.5) {
          crowdedLongs.push(asset.symbol);
        } else if (asset.funding8h < -FUNDING_THRESHOLD * 1.5) {
          crowdedShorts.push(asset.symbol);
        }
      }
    }

    // Calculate volume and OI leaders
    const sortedByVolume = [...allAssets].sort((a, b) => b.volume24h - a.volume24h);
    const volumeLeaders = sortedByVolume.slice(0, 5).map(a => ({
      symbol: a.symbol,
      volume: a.volume24h,
    }));

    const sortedByOI = [...allAssets].sort((a, b) => b.openInterest - a.openInterest);
    const oiLeaders = sortedByOI.slice(0, 5).map(a => ({
      symbol: a.symbol,
      oi: a.openInterest,
    }));

    // Debug logging
    if (allAssets.length === 0) {
      logger.debug(`[VinceHIP3] No HIP-3 assets found. Total symbols seen: ${allSymbols.length}`);
      // Log sample of symbols to help debug
      const sampleSymbols = allSymbols.slice(0, 20);
      logger.debug(`[VinceHIP3] Sample symbols: ${sampleSymbols.join(", ")}`);
      // Check if any HIP-3 prefixed symbols exist
      const hip3Prefixed = allSymbols.filter(s => s.includes(":"));
      if (hip3Prefixed.length > 0) {
        logger.debug(`[VinceHIP3] HIP-3 prefixed symbols found: ${hip3Prefixed.slice(0, 10).join(", ")}`);
      }
    } else {
      logger.debug(`[VinceHIP3] Matched ${hip3Matches.length} HIP-3 symbols: ${hip3Matches.slice(0, 10).join(", ")}`);
    }

    return {
      timestamp: Date.now(),
      commodities,
      indices,
      stocks,
      aiPlays,
      summary: {
        topPerformer,
        worstPerformer,
        goldVsBtc,
        tradFiVsCrypto,
        overallBias,
      },
      sectorStats: {
        ...sectorStatsData,
        hottestSector,
      },
      fundingExtremes: {
        highest: highestFunding,
        lowest: lowestFunding,
        crowdedLongs,
        crowdedShorts,
      },
      leaders: {
        volumeLeaders,
        oiLeaders,
      },
    };
  }

  // Known HIP-3 DEX names (fallback if API doesn't return them)
  private static readonly HIP3_DEX_NAMES = ["xyz", "flx", "vntl", "km"];

  /**
   * Fetch available perp DEX names from the API
   * Returns empty string for main crypto dex, plus HIP-3 dex names
   */
  private async getPerpDexs(): Promise<string[]> {
    try {
      const data = await this.fetchInfo<any[]>({ type: "perpDexs" });
      
      if (data && Array.isArray(data) && data.length > 0) {
        // Response format: [null, { name: "xyz" }, { name: "flx" }, ...]
        // First element is null (represents main crypto dex)
        const dexNames: string[] = [""];  // Empty string = main dex
        
        for (const item of data.slice(1)) {
          if (item?.name && typeof item.name === "string") {
            dexNames.push(item.name);
          }
        }
        
        logger.debug(`[VinceHIP3] Discovered DEXes from API: ${dexNames.join(", ") || "(main only)"}`);
        
        // Verify we got at least some HIP-3 DEXes
        const hasHip3Dexes = dexNames.some(d => VinceHIP3Service.HIP3_DEX_NAMES.includes(d));
        if (hasHip3Dexes) {
          return dexNames;
        }
        
        logger.debug("[VinceHIP3] API response missing HIP-3 DEXes, using fallback");
      }
    } catch (error) {
      logger.debug(`[VinceHIP3] Failed to fetch perpDexs: ${error}`);
    }
    
    // Fallback to hardcoded HIP-3 DEXes
    logger.debug("[VinceHIP3] Using hardcoded DEX list fallback");
    return ["", ...VinceHIP3Service.HIP3_DEX_NAMES];
  }

  /**
   * Validate metaAndAssetCtxs response structure
   */
  private validateMetaAndAssetCtxs(data: any): data is [HyperliquidMeta, HyperliquidAssetCtx[]] {
    if (!Array.isArray(data) || data.length < 2) return false;
    const [meta, assetCtxs] = data;
    if (!meta?.universe || !Array.isArray(meta.universe)) return false;
    if (!Array.isArray(assetCtxs)) return false;
    return true;
  }

  /**
   * Fetch metaAndAssetCtxs for a specific DEX
   */
  private async fetchDexData(dex?: string): Promise<HyperliquidMetaAndAssetCtxs | null> {
    // Build request body - only include dex if provided (empty string = main dex)
    const body: { type: string; dex?: string } = { type: "metaAndAssetCtxs" };
    if (dex) {
      body.dex = dex;
    }
    
    logger.debug(`[VinceHIP3] Fetching DEX data: ${JSON.stringify(body)}`);
    const data = await this.fetchInfo<[any, any]>(body);
    
    if (this.validateMetaAndAssetCtxs(data)) {
      const [meta, assetCtxs] = data;
      // Log sample symbols for debugging
      const sampleSymbols = meta.universe.slice(0, 5).map(m => m.name);
      logger.debug(`[VinceHIP3] DEX ${dex || 'main'}: ${meta.universe.length} assets, sample: ${sampleSymbols.join(", ")}`);
      
      // Validate array length alignment
      if (meta.universe.length !== assetCtxs.length) {
        logger.warn(`[VinceHIP3] Array length mismatch for DEX ${dex || 'main'}: universe=${meta.universe.length}, ctxs=${assetCtxs.length}`);
      }
      
      return [meta, assetCtxs];
    }
    
    logger.debug(`[VinceHIP3] Invalid response structure for DEX ${dex || 'main'}`);
    return null;
  }

  /**
   * Fetch from all HIP-3 DEXes individually
   * Uses getPerpDexs to discover DEXes dynamically with fallback
   */
  private async fetchAllHIP3Dexes(): Promise<HyperliquidMetaAndAssetCtxs[]> {
    const results: HyperliquidMetaAndAssetCtxs[] = [];
    
    // Get available DEXes dynamically (with fallback to hardcoded list)
    const allDexes = await this.getPerpDexs();
    
    // Filter to only HIP-3 DEXes (non-empty strings that aren't the main crypto dex)
    const hip3Dexes = allDexes.filter(d => d !== "" && VinceHIP3Service.HIP3_DEX_NAMES.includes(d));
    
    logger.debug(`[VinceHIP3] Fetching from ${hip3Dexes.length} HIP-3 DEXes: ${hip3Dexes.join(", ")}`);
    
    // Fetch from each DEX in parallel
    const dexPromises = hip3Dexes.map(async (dex) => {
      try {
        const data = await this.fetchDexData(dex);
        return data;
      } catch (error) {
        logger.debug(`[VinceHIP3] Failed to fetch DEX ${dex}: ${error}`);
        return null;
      }
    });
    
    const dexResults = await Promise.all(dexPromises);
    
    let totalAssets = 0;
    for (const result of dexResults) {
      if (result) {
        results.push(result);
        totalAssets += result[0].universe.length;
      }
    }
    
    logger.debug(`[VinceHIP3] Fetched ${results.length}/${hip3Dexes.length} HIP-3 DEXes with ${totalAssets} total assets`);
    return results;
  }

  /**
   * Fetch standard metaAndAssetCtxs (fallback method - main crypto dex)
   */
  private async fetchMetaAndAssetCtxs(): Promise<HyperliquidMetaAndAssetCtxs[] | null> {
    logger.debug("[VinceHIP3] Trying fallback: metaAndAssetCtxs endpoint...");
    
    const data = await this.fetchDexData(); // No dex = main crypto perps
    
    if (data) {
      const [meta] = data;
      logger.debug(`[VinceHIP3] Main DEX: ${meta.universe?.length || 0} assets`);
      return [data];
    }

    logger.warn("[VinceHIP3] Fallback: unexpected response format");
    return null;
  }

  /**
   * Count HIP-3 assets in a pulse
   */
  private countHIP3Assets(pulse: HIP3Pulse | null): number {
    if (!pulse) return 0;
    return pulse.commodities.length + pulse.indices.length + 
           pulse.stocks.length + pulse.aiPlays.length;
  }

  /**
   * Get HIP-3 pulse with caching
   */
  async getHIP3Pulse(): Promise<HIP3Pulse | null> {
    // Check cache
    const now = Date.now();
    if (this.cache.data && now - this.cache.timestamp < CACHE_TTL_MS) {
      logger.debug("[VinceHIP3] Returning cached pulse");
      return this.cache.data;
    }

    // Fetch fresh data
    logger.info("[VinceHIP3] Fetching fresh HIP-3 data from Hyperliquid...");
    
    // Strategy 1: Try allPerpMetas (should include all DEXes in one call)
    logger.debug("[VinceHIP3] Strategy 1: Trying allPerpMetas endpoint...");
    let allData = await this.fetchAllPerpMetas();
    let pulse = allData ? this.buildHIP3Pulse(allData) : null;
    let hip3Count = this.countHIP3Assets(pulse);
    
    logger.debug(`[VinceHIP3] Strategy 1 result: ${hip3Count} HIP-3 assets found`);
    
    // Strategy 2: If no HIP-3 assets, fetch from individual HIP-3 DEXes
    if (hip3Count === 0) {
      logger.debug("[VinceHIP3] Strategy 2: Fetching from individual DEXes...");
      
      // Get main dex for BTC comparison + all HIP-3 dexes
      const mainDexData = await this.fetchMetaAndAssetCtxs();
      const hip3DexData = await this.fetchAllHIP3Dexes();
      
      allData = [];
      if (mainDexData) {
        allData.push(...mainDexData);
        logger.debug(`[VinceHIP3] Main DEX added: ${mainDexData.length} result(s)`);
      }
      if (hip3DexData.length > 0) {
        allData.push(...hip3DexData);
        logger.debug(`[VinceHIP3] HIP-3 DEXes added: ${hip3DexData.length} result(s)`);
      }
      
      if (allData.length > 0) {
        pulse = this.buildHIP3Pulse(allData);
        hip3Count = this.countHIP3Assets(pulse);
        logger.debug(`[VinceHIP3] Strategy 2 result: ${hip3Count} HIP-3 assets found`);
      }
    }
    
    // Log diagnostics if still no HIP-3 assets
    if (hip3Count === 0) {
      logger.warn("[VinceHIP3] No HIP-3 assets found from any strategy");
      logger.debug(`[VinceHIP3] Expected HIP-3 symbols: ${HIP3_ASSETS.slice(0, 10).join(", ")}...`);
      
      if (this.cache.data) {
        logger.info("[VinceHIP3] Returning stale cached data");
        return this.cache.data;
      }
      
      // Return empty pulse rather than null to avoid action failures
      if (pulse) {
        this.cache = { data: pulse, timestamp: now };
        return pulse;
      }
      
      return null;
    }

    // Update cache
    this.cache = {
      data: pulse,
      timestamp: now,
    };

    // Build summary of key prices
    const goldPrice = pulse!.commodities.find(c => c.symbol === "GOLD");
    const spxPrice = pulse!.indices.find(i => i.symbol === "SPX");
    const nvdaPrice = pulse!.stocks.find(s => s.symbol === "NVDA");
    
    const pricesSummary = [
      goldPrice ? `GOLD: $${goldPrice.price.toFixed(2)}` : null,
      spxPrice ? `SPX: $${spxPrice.price.toFixed(2)}` : null,
      nvdaPrice ? `NVDA: $${nvdaPrice.price.toFixed(2)}` : null,
    ].filter(Boolean).join(" | ");

    logger.info(
      `[VinceHIP3] 📊 PULSE | ${hip3Count} assets | ` +
      `Commodities: ${pulse!.commodities.length} | Indices: ${pulse!.indices.length} | ` +
      `Stocks: ${pulse!.stocks.length} | AI: ${pulse!.aiPlays.length}` +
      (pricesSummary ? ` | ${pricesSummary}` : "")
    );

    return pulse;
  }

  /**
   * Get price for a specific HIP-3 asset
   */
  async getAssetPrice(symbol: string): Promise<HIP3AssetPrice | null> {
    const pulse = await this.getHIP3Pulse();
    if (!pulse) return null;

    const upper = symbol.toUpperCase();
    const allAssets = [
      ...pulse.commodities,
      ...pulse.indices,
      ...pulse.stocks,
      ...pulse.aiPlays,
    ];

    return allAssets.find(a => a.symbol === upper) || null;
  }

  /**
   * Get prices for multiple HIP-3 assets
   */
  async getAssetPrices(symbols: string[]): Promise<HIP3AssetPrice[]> {
    const pulse = await this.getHIP3Pulse();
    if (!pulse) return [];

    const upperSymbols = new Set(symbols.map(s => s.toUpperCase()));
    const allAssets = [
      ...pulse.commodities,
      ...pulse.indices,
      ...pulse.stocks,
      ...pulse.aiPlays,
    ];

    return allAssets.filter(a => upperSymbols.has(a.symbol));
  }

  /**
   * Get service status
   */
  getStatus(): { available: boolean; lastUpdate: number; assetCount: number } {
    return {
      available: this.cache.data !== null,
      lastUpdate: this.cache.timestamp,
      assetCount: this.cache.data 
        ? this.cache.data.commodities.length + this.cache.data.indices.length +
          this.cache.data.stocks.length + this.cache.data.aiPlays.length
        : 0,
    };
  }
}
