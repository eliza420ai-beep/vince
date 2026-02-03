/**
 * VINCE CoinGlass Service
 *
 * Simplified CoinGlass integration for VINCE agent.
 * Uses Hobbyist tier API ($350/year) for:
 * - Long/Short ratio
 * - Funding rates
 * - Open Interest
 * - Fear & Greed index
 *
 * Gracefully falls back to free alternatives when API key not available.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { FundingData, LongShortRatio, OpenInterestData, FearGreedData, MarketSignal } from "../types/index";
import { startBox, endBox, logLine, logEmpty, sep } from "../utils/boxLogger";

// Cache TTL
const CACHE_TTL_MS = 60 * 1000; // 1 minute
/** Timeout for each HTTP request so slow/hanging APIs don't block indefinitely */
const FETCH_TIMEOUT_MS = 10_000;

interface CachedData {
  funding: Map<string, FundingData>;
  longShort: Map<string, LongShortRatio>;
  openInterest: Map<string, OpenInterestData>;
  fearGreed: FearGreedData | null;
  lastUpdate: number;
}

export class VinceCoinGlassService extends Service {
  static serviceType = "VINCE_COINGLASS_SERVICE";
  capabilityDescription = "CoinGlass market data: L/S ratio, funding, OI, fear/greed";

  private apiKey: string | null = null;
  private cache: CachedData = {
    funding: new Map(),
    longShort: new Map(),
    openInterest: new Map(),
    fearGreed: null,
    lastUpdate: 0,
  };
  private isAvailable = false;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceCoinGlassService> {
    const service = new VinceCoinGlassService(runtime);
    try {
      await service.initialize();
    } catch (error) {
      logger.warn(`[VinceCoinGlass] Initialization error (service still available): ${error}`);
    }
    logger.info("[VinceCoinGlass] ✅ Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceCoinGlass] Service stopped");
  }

  private async initialize(): Promise<void> {
    this.apiKey = this.runtime.getSetting("COINGLASS_API_KEY") as string | null;
    
    if (!this.apiKey) {
      logger.warn("[VinceCoinGlass] COINGLASS_API_KEY not configured - using free Binance APIs");
      this.isAvailable = false;
    } else {
      // Log key format for debugging (show first 8 and last 4 chars)
      const keyPreview = this.apiKey.length > 12 
        ? `${this.apiKey.slice(0, 8)}...${this.apiKey.slice(-4)}` 
        : "[key too short]";
      logger.info(`[VinceCoinGlass] Found API key: ${keyPreview}, testing connection...`);
      
      // Test connection (returns boolean, doesn't throw)
      this.isAvailable = await this.testConnection();
      
      if (this.isAvailable) {
        logger.info("[VinceCoinGlass] ✅ Using CoinGlass API (Hobbyist tier V2)");
      } else {
        logger.warn("[VinceCoinGlass] ⚠️ CoinGlass API test failed - falling back to Binance free APIs");
      }
    }

    // Initial data fetch
    await this.refreshData();
    
    // Print dashboard
    this.printCoinGlassDashboard();
  }

  // ==========================================
  // Dashboard Formatting
  // ==========================================

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
   * Build a visual bar for Fear & Greed index
   */
  private buildFearGreedBar(value: number): string {
    const filled = Math.floor(value / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  /**
   * Print CoinGlass dashboard (same box style as paper trade-opened banner).
   */
  private printCoinGlassDashboard(): void {
    const source = this.isAvailable ? "CoinGlass API (Hobbyist)" : "Free APIs (Binance)";
    const assets = ["BTC", "ETH", "SOL"];

    startBox();
    logLine("🔮 COINGLASS MARKET INTELLIGENCE");
    logEmpty();
    sep();
    logEmpty();

    const sourceEmoji = this.isAvailable ? "✅" : "🔄";
    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    logLine(`${sourceEmoji} ${source} ${timeStr}`);

    sep();
    logEmpty();

    const fg = this.cache.fearGreed;
    if (fg) {
      const emoji = fg.value <= 20 ? "😱" : fg.value <= 35 ? "😰" : fg.value <= 50 ? "😐" : fg.value <= 65 ? "😊" : fg.value <= 80 ? "🤑" : "🚀";
      const bar = this.buildFearGreedBar(fg.value);
      const signal = fg.value <= 25 ? "← BUY ZONE" : fg.value >= 75 ? "← SELL ZONE" : "";
      const labelMap: Record<string, string> = {
        extreme_fear: "EXTREME FEAR",
        fear: "FEAR",
        neutral: "NEUTRAL",
        greed: "GREED",
        extreme_greed: "EXTREME GREED",
      };
      const label = labelMap[fg.classification] || fg.classification.toUpperCase();
      logLine(`${emoji} FEAR & GREED: ${fg.value}/100  ${bar}  ${label} ${signal}`);
    } else {
      logLine("😱 FEAR & GREED: Loading...");
    }

    // ─────────────────────────────────────────────────────────────────
    // FUNDING RATES - Leverage indicator
    // ─────────────────────────────────────────────────────────────────
    sep();
    logEmpty();
    logLine("💰 FUNDING RATES (8h)   Longs Pay → │ ← Shorts Pay");

    let highFundingAssets: string[] = [];
    let negFundingAssets: string[] = [];
    
    for (const asset of assets) {
      const funding = this.cache.funding.get(asset);
      if (funding) {
        const rate = funding.rate * 100;
        const rateStr = rate >= 0 ? `+${rate.toFixed(4)}%` : `${rate.toFixed(4)}%`;
        const bar = this.buildFundingBar(rate);
        const signal = rate > 0.05 ? "🔥 HIGH" : rate < -0.02 ? "❄️ NEG" : "";
        logLine(`   ${asset} ${rateStr.padStart(10)}  ${bar}  ${signal}`);
        if (rate > 0.05) highFundingAssets.push(asset);
        if (rate < -0.02) negFundingAssets.push(asset);
      }
    }
    
    if (this.cache.funding.size === 0) logLine("   (loading funding data...)");
    if (highFundingAssets.length > 0) {
      logLine(`⚠️  ${highFundingAssets.join(", ")}: Longs crowded, expensive to hold long`);
    } else if (negFundingAssets.length > 0) {
      logLine(`💡 ${negFundingAssets.join(", ")}: Shorts paying longs - bullish bias`);
    } else {
      logLine("✅ Funding neutral - no extreme leverage detected");
    }

    sep();
    logEmpty();
    logLine("⚖️  LONG/SHORT RATIOS   Longs │ Shorts");

    for (const asset of assets) {
      const ls = this.cache.longShort.get(asset);
      if (ls) {
        const bar = this.buildLongShortBar(ls.longPercent);
        const crowdSignal = ls.longPercent > 60 ? "🔴 FADE" : ls.longPercent < 40 ? "🟢 FADE" : "";
        logLine(`   ${asset} L:${ls.longPercent.toFixed(0).padStart(2)}% S:${ls.shortPercent.toFixed(0).padStart(2)}%  ${bar}  ${crowdSignal}`);
      }
    }
    if (this.cache.longShort.size === 0) logLine("   (loading L/S data...)");

    sep();
    logEmpty();
    logLine("📊 OPEN INTEREST   Value    24h Change");

    for (const asset of assets) {
      const oi = this.cache.openInterest.get(asset);
      if (oi) {
        const valueStr = this.formatVolume(oi.value);
        const change = oi.change24h;
        const hasChange = change !== null;
        const changeEmoji = !hasChange ? "➡️" : change! > 3 ? "📈" : change! < -3 ? "📉" : "➡️";
        const changeStr = hasChange ? `${change! > 0 ? "+" : ""}${change!.toFixed(1)}%` : "N/A";
        logLine(`   ${asset} ${valueStr.padEnd(10)} ${changeEmoji} ${changeStr}`);
      }
    }
    if (this.cache.openInterest.size === 0) logLine("   (loading OI data...)");

    sep();
    logEmpty();
    logLine("🎯 CONTRARIAN SIGNALS");

    const contrarianSignals = this.getContrarianSignals();
    if (contrarianSignals.length > 0) {
      for (const signal of contrarianSignals.slice(0, 3)) logLine(`   ${signal}`);
    } else {
      logLine("   ⚪ No extreme signals detected - market balanced");
    }

    sep();
    logEmpty();
    const bias = this.calculateOverallBias();
    const biasEmoji = bias.direction === "bullish" ? "🟢" : bias.direction === "bearish" ? "🔴" : "⚪";
    const biasBar = this.buildBiasBar(bias.score);
    logLine(`${biasEmoji} OVERALL BIAS: ${bias.direction.toUpperCase()} ${biasBar}  Score: ${bias.score > 0 ? "+" : ""}${bias.score.toFixed(0)}`);

    sep();
    logEmpty();
    const tldr = this.getTLDR();
    const tldrEmoji = tldr.includes("BUY") || tldr.includes("BULLISH") || tldr.includes("squeeze UP") ? "💡" :
                      tldr.includes("SELL") || tldr.includes("BEARISH") || tldr.includes("squeeze DOWN") ? "⚠️" : "📋";
    logLine(`${tldrEmoji} ${tldr}`);
    endBox();

    const dataCount = this.cache.funding.size + this.cache.longShort.size + this.cache.openInterest.size;
    logger.debug(`[VinceCoinGlass] ✅ Dashboard: ${dataCount} data points | Bias: ${bias.direction} (${bias.score > 0 ? "+" : ""}${bias.score.toFixed(0)})`);
  }

  /**
   * Build a visual bar for funding rate
   */
  private buildFundingBar(rate: number): string {
    // Rate typically between -0.1% and +0.1%
    // Normalize to -5 to +5 scale
    const normalized = Math.max(-5, Math.min(5, rate * 50));
    const center = 5;
    
    if (normalized >= 0) {
      const filled = Math.floor(normalized);
      return "░".repeat(center) + "│" + "█".repeat(filled) + "░".repeat(5 - filled);
    } else {
      const filled = Math.floor(-normalized);
      return "░".repeat(center - filled) + "█".repeat(filled) + "│" + "░".repeat(5);
    }
  }

  /**
   * Build a visual bar for long/short ratio
   */
  private buildLongShortBar(longPct: number): string {
    // Long percent 0-100
    const longBlocks = Math.floor(longPct / 10);
    const shortBlocks = 10 - longBlocks;
    return "🟢".repeat(Math.min(5, longBlocks)) + "🔴".repeat(Math.min(5, shortBlocks));
  }

  /**
   * Build a visual bar for overall bias
   */
  private buildBiasBar(score: number): string {
    // Score -100 to +100
    const normalized = Math.max(-5, Math.min(5, score / 20));
    const center = 5;
    
    if (normalized >= 0) {
      const filled = Math.floor(normalized);
      return "░".repeat(center) + "│" + "█".repeat(filled) + "░".repeat(5 - filled);
    } else {
      const filled = Math.floor(-normalized);
      return "░".repeat(center - filled) + "█".repeat(filled) + "│" + "░".repeat(5);
    }
  }

  /**
   * Get contrarian trading signals based on extreme readings
   */
  private getContrarianSignals(): string[] {
    const signals: string[] = [];
    const fg = this.cache.fearGreed;

    // Fear & Greed extremes
    if (fg) {
      if (fg.value <= 20) {
        signals.push(`🟢 EXTREME FEAR (${fg.value}) → Contrarian BUY opportunity`);
      } else if (fg.value >= 80) {
        signals.push(`🔴 EXTREME GREED (${fg.value}) → Contrarian SELL opportunity`);
      }
    }

    // Funding rate extremes
    for (const [asset, funding] of this.cache.funding) {
      const rate = funding.rate * 100;
      if (rate > 0.05) {
        signals.push(`🔴 ${asset} Funding HIGH (${rate.toFixed(3)}%) → Longs overleveraged`);
      } else if (rate < -0.02) {
        signals.push(`🟢 ${asset} Funding NEG (${rate.toFixed(3)}%) → Shorts overleveraged`);
      }
    }

    // L/S ratio extremes
    for (const [asset, ls] of this.cache.longShort) {
      if (ls.longPercent > 65) {
        signals.push(`🔴 ${asset} Crowd LONG (${ls.longPercent.toFixed(0)}%) → Fade the crowd`);
      } else if (ls.longPercent < 35) {
        signals.push(`🟢 ${asset} Crowd SHORT (${ls.longPercent.toFixed(0)}%) → Fade the crowd`);
      }
    }

    return signals;
  }

  /**
   * Calculate overall market bias from all indicators
   */
  private calculateOverallBias(): { direction: "bullish" | "bearish" | "neutral"; score: number } {
    let score = 0;
    let factors = 0;

    // Fear & Greed contribution (-50 to +50)
    const fg = this.cache.fearGreed;
    if (fg) {
      // Low fear = bullish, high greed = bearish (contrarian)
      score += (50 - fg.value);
      factors++;
    }

    // Funding rate contribution
    for (const [, funding] of this.cache.funding) {
      // Negative funding = bullish (shorts paying), positive = bearish (longs paying)
      score -= funding.rate * 10000; // Scale: 0.01% = 1 point
      factors++;
    }

    // L/S ratio contribution (contrarian)
    for (const [, ls] of this.cache.longShort) {
      // More longs = bearish (contrarian), more shorts = bullish
      score += (50 - ls.longPercent);
      factors++;
    }

    // Normalize to -100 to +100
    const normalizedScore = factors > 0 ? (score / factors) * 2 : 0;
    
    const direction = normalizedScore > 15 ? "bullish" : normalizedScore < -15 ? "bearish" : "neutral";
    
    return { direction, score: normalizedScore };
  }

  /**
   * Generate actionable TLDR summary from all market signals
   */
  private getTLDR(): string {
    const fg = this.cache.fearGreed;
    const signals = this.getContrarianSignals();
    const bias = this.calculateOverallBias();
    
    // Priority 1: Extreme Fear/Greed (strongest signal)
    if (fg) {
      if (fg.value <= 20) {
        const crowdedLongs = Array.from(this.cache.longShort.values()).some(ls => ls.longPercent > 65);
        if (crowdedLongs) {
          return "EXTREME FEAR + longs crowded - fade longs or wait";
        }
        return "EXTREME FEAR - contrarian BUY zone active";
      }
      if (fg.value >= 80) {
        const crowdedShorts = Array.from(this.cache.longShort.values()).some(ls => ls.longPercent < 35);
        if (crowdedShorts) {
          return "EXTREME GREED + shorts crowded - fade shorts or wait";
        }
        return "EXTREME GREED - contrarian SELL zone active";
      }
    }
    
    // Priority 2: Funding rate extremes (squeeze potential)
    for (const [asset, funding] of this.cache.funding) {
      const rate = funding.rate * 100;
      if (rate < -0.03) {
        return `${asset} shorts paying ${Math.abs(rate).toFixed(3)}% - squeeze UP potential`;
      }
      if (rate > 0.05) {
        return `${asset} longs paying ${rate.toFixed(3)}% - squeeze DOWN potential`;
      }
    }
    
    // Priority 3: Crowd positioning (fade signals)
    for (const [asset, ls] of this.cache.longShort) {
      if (ls.longPercent > 70) {
        return `${asset} crowd 70%+ LONG - fade or wait for flush`;
      }
      if (ls.longPercent < 30) {
        return `${asset} crowd 70%+ SHORT - fade or wait for squeeze`;
      }
    }
    
    // Priority 4: Overall bias summary
    if (bias.direction === "bullish" && bias.score > 30) {
      return "BULLISH setup - multiple signals aligned long";
    }
    if (bias.direction === "bearish" && bias.score < -30) {
      return "BEARISH setup - multiple signals aligned short";
    }
    
    // Default: No clear edge
    return "NEUTRAL - no extreme signals, wait for edge";
  }

  private async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      logger.warn("[VinceCoinGlass] No COINGLASS_API_KEY found in settings");
      return false;
    }
    
    try {
      // Use OI endpoint for testing - this works with Hobbyist tier ($350/yr V2 API)
      const response = await fetch(
        "https://open-api.coinglass.com/public/v2/open_interest?symbol=BTC",
        {
          headers: { Accept: "application/json", coinglassSecret: this.apiKey! },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }
      );
      
      // Get response as text first for debugging
      const responseText = await response.text();
      logger.debug(`[VinceCoinGlass] Raw API response: ${responseText.slice(0, 500)}`);
      
      if (!response.ok) {
        logger.error(`[VinceCoinGlass] HTTP ${response.status} ${response.statusText}: ${responseText.slice(0, 200)}`);
        return false;
      }
      
      // Parse the response
      const data = JSON.parse(responseText);
      
      // V2 API: code can be string "0" or number 0
      const isSuccess = data.code === "0" || data.code === 0;
      if (!isSuccess) {
        logger.error(`[VinceCoinGlass] API error: code=${data.code}, msg=${data.msg || "Unknown"}`);
        return false;
      }
      
      // Verify we got actual data
      if (!data.data || (Array.isArray(data.data) && data.data.length === 0)) {
        logger.error("[VinceCoinGlass] API returned empty data array");
        return false;
      }
      
      // Log success with sample data
      const sampleOI = Array.isArray(data.data) && data.data[0]?.openInterest 
        ? `$${(data.data[0].openInterest / 1e9).toFixed(1)}B` 
        : "N/A";
      logger.info(`[VinceCoinGlass] ✅ API verified - BTC OI: ${sampleOI}`);
      return true;
      
    } catch (error) {
      logger.error(`[VinceCoinGlass] Connection test exception: ${error}`);
      return false;
    }
  }

  async refreshData(): Promise<void> {
    const now = Date.now();
    if (now - this.cache.lastUpdate < CACHE_TTL_MS) {
      return; // Cache still valid
    }

    const assets = ["BTC", "ETH", "SOL"];

    try {
      // Fetch all assets and fear/greed in parallel
      await Promise.all([
        ...assets.map((asset) => this.fetchAssetData(asset)),
        this.fetchFearGreed(),
      ]);

      this.cache.lastUpdate = now;
    } catch (error) {
      logger.debug(`[VinceCoinGlass] Refresh error: ${error}`);
    }
  }

  private async fetchAssetData(asset: string): Promise<void> {
    if (this.isAvailable && this.apiKey) {
      await this.fetchCoinGlassData(asset);
    } else {
      await this.fetchFreeData(asset);
    }
  }

  private async fetchCoinGlassData(asset: string): Promise<void> {
    const baseUrl = "https://open-api.coinglass.com";
    const headers = {
      Accept: "application/json",
      coinglassSecret: this.apiKey!,
    };
    const signal = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);

    try {
      // Run OI, optional funding, and Binance L/S in parallel
      const [oiRes, fundingRes, _ls] = await Promise.all([
        fetch(`${baseUrl}/public/v2/open_interest?symbol=${asset}`, { headers, signal: signal() }),
        this.cache.funding.has(asset)
          ? Promise.resolve(null as Response | null)
          : fetch(`${baseUrl}/public/v2/funding?symbol=${asset}`, { headers, signal: signal() }),
        this.fetchBinanceLongShort(asset),
      ]);

      if (oiRes.ok) {
        const data = await oiRes.json();
        if ((data.code === "0" || data.success) && data.data) {
          const assetData = Array.isArray(data.data)
            ? data.data.find((d: { symbol: string }) => d.symbol === asset)
            : data.data;

          if (assetData) {
            const rawChange =
              assetData.oichangePercent ??
              assetData.oiChangePercent ??
              assetData.h24OIChangePercent ??
              assetData.oiChangePercent24h ??
              assetData.change24h;
            let change24h: number | null = null;
            if (rawChange !== undefined && rawChange !== null) {
              const parsed = typeof rawChange === "number" ? rawChange : parseFloat(String(rawChange));
              if (!isNaN(parsed)) change24h = parsed;
            }
            if (change24h === null) {
              logger.debug(`[VinceCoinGlass] ${asset} OI: No change24h. Fields: ${Object.keys(assetData).join(", ")}`);
            }
            const oiValue = parseFloat(assetData.openInterest) || 0;
            this.cache.openInterest.set(asset, {
              asset,
              value: oiValue,
              change24h,
              timestamp: Date.now(),
            });
            if (change24h !== null) {
              logger.debug(`[VinceCoinGlass] ${asset} OI: $${(oiValue / 1e9).toFixed(2)}B, change: ${change24h > 0 ? "+" : ""}${change24h.toFixed(1)}%`);
            }
            if (assetData.avgFundingRateBySymbol !== undefined) {
              this.cache.funding.set(asset, {
                asset,
                rate: parseFloat(assetData.avgFundingRateBySymbol) || 0,
                timestamp: Date.now(),
              });
            }
          }
        }
      }

      if (fundingRes?.ok) {
        const data = await fundingRes.json();
        if ((data.code === "0" || data.success) && data.data) {
          const assetData = Array.isArray(data.data)
            ? data.data.find((d: { symbol: string }) => d.symbol === asset)
            : data.data;
          if (assetData?.uMarginList) {
            const rates = assetData.uMarginList
              .map((e: { rate: number }) => e.rate)
              .filter((r: number) => !isNaN(r));
            const avgRate = rates.length > 0 ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length : 0;
            this.cache.funding.set(asset, { asset, rate: avgRate, timestamp: Date.now() });
          }
        }
      }
    } catch (error) {
      logger.debug(`[VinceCoinGlass] Error fetching ${asset}: ${error}`);
    }
  }

  /**
   * Fetch Long/Short ratio from Binance (free, reliable)
   * CoinGlass V2 API doesn't have this endpoint
   */
  private async fetchBinanceLongShort(asset: string): Promise<void> {
    try {
      const symbol = `${asset}USDT`;
      const lsRes = await fetch(
        `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
      );
      if (lsRes.ok) {
        const data = await lsRes.json();
        if (data[0]) {
          const ratio = parseFloat(data[0].longShortRatio) || 1;
          const longPct = (ratio / (ratio + 1)) * 100;
          this.cache.longShort.set(asset, {
            asset,
            ratio,
            longPercent: longPct,
            shortPercent: 100 - longPct,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.debug(`[VinceCoinGlass] Binance L/S error for ${asset}: ${error}`);
    }
  }

  private async fetchFreeData(asset: string): Promise<void> {
    const symbol = `${asset}USDT`;
    const opts = { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) };
    try {
      const [priceRes, fundingRes, lsRes, oiHistRes] = await Promise.all([
        fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, opts),
        fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`, opts),
        fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`, opts),
        fetch(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=24`, opts),
      ]);

      let price = 0;
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        price = parseFloat(priceData.price) || 0;
      }

      if (fundingRes.ok) {
        const data = await fundingRes.json();
        this.cache.funding.set(asset, {
          asset,
          rate: parseFloat(data.lastFundingRate) || 0,
          timestamp: Date.now(),
        });
      }
      if (lsRes.ok) {
        const data = await lsRes.json();
        if (data[0]) {
          const ratio = parseFloat(data[0].longShortRatio) || 1;
          const longPct = (ratio / (ratio + 1)) * 100;
          this.cache.longShort.set(asset, {
            asset,
            ratio,
            longPercent: longPct,
            shortPercent: 100 - longPct,
            timestamp: Date.now(),
          });
        }
      }

      if (oiHistRes.ok) {
        const histData = await oiHistRes.json() as Array<{ sumOpenInterestValue: string; timestamp: number }>;
        if (Array.isArray(histData) && histData.length > 0) {
          // Parse and sort by timestamp (newest first)
          const history = histData.map((item) => ({
            value: parseFloat(item.sumOpenInterestValue || "0"),
            timestamp: item.timestamp || Date.now(),
          }));
          history.sort((a, b) => b.timestamp - a.timestamp);

          const current = history[0]?.value || 0;
          const oldest = history[history.length - 1]?.value || current;
          const changePercent = oldest > 0 ? ((current - oldest) / oldest) * 100 : 0;

          this.cache.openInterest.set(asset, {
            asset,
            value: current,
            change24h: changePercent, // Now properly calculated from historical data!
            timestamp: Date.now(),
          });
          
          logger.debug(`[VinceCoinGlass] ${asset} OI from Binance: $${(current / 1e9).toFixed(2)}B, change: ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`);
        }
      }

      if (!this.cache.openInterest.has(asset)) {
        const oiRes = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`, opts);
        if (oiRes.ok) {
          const data = await oiRes.json();
          const oiQty = parseFloat(data.openInterest) || 0;
          const oiUsd = price > 0 ? oiQty * price : oiQty;
          this.cache.openInterest.set(asset, {
            asset,
            value: oiUsd,
            change24h: null,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.debug(`[VinceCoinGlass] Free API error for ${asset}: ${error}`);
    }
  }

  private async fetchFearGreed(): Promise<void> {
    try {
      const res = await fetch("https://api.alternative.me/fng/?limit=1", {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.[0]) {
          const value = parseInt(data.data[0].value, 10);
          let classification: FearGreedData["classification"] = "neutral";
          if (value <= 20) classification = "extreme_fear";
          else if (value <= 40) classification = "fear";
          else if (value <= 60) classification = "neutral";
          else if (value <= 80) classification = "greed";
          else classification = "extreme_greed";

          this.cache.fearGreed = {
            value,
            classification,
            timestamp: Date.now(),
          };
        }
      }
    } catch (error) {
      logger.debug(`[VinceCoinGlass] Fear/Greed fetch error: ${error}`);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): { available: boolean; source: string; lastUpdate: number } {
    return {
      available: this.cache.lastUpdate > 0,
      source: this.isAvailable ? "CoinGlass (Hobbyist)" : "Free APIs (Binance, Alternative.me)",
      lastUpdate: this.cache.lastUpdate,
    };
  }

  getFunding(asset: string): FundingData | null {
    return this.cache.funding.get(asset) || null;
  }

  getAllFunding(): FundingData[] {
    return Array.from(this.cache.funding.values());
  }

  getLongShortRatio(asset: string): LongShortRatio | null {
    return this.cache.longShort.get(asset) || null;
  }

  getAllLongShortRatios(): LongShortRatio[] {
    return Array.from(this.cache.longShort.values());
  }

  getOpenInterest(asset: string): OpenInterestData | null {
    return this.cache.openInterest.get(asset) || null;
  }

  getFearGreed(): FearGreedData | null {
    return this.cache.fearGreed;
  }

  /**
   * Generate a market signal based on current data.
   * Emits multiple factors (not just 3) so "WHY THIS TRADE" and ML feature store get rich context.
   */
  generateSignal(asset: string): MarketSignal | null {
    const funding = this.cache.funding.get(asset);
    const ls = this.cache.longShort.get(asset);
    const oi = this.cache.openInterest.get(asset);
    const fg = this.cache.fearGreed;

    if (!funding || !ls) return null;

    let direction: MarketSignal["direction"] = "neutral";
    let strength = 50;
    const factors: string[] = [];

    // --- Funding (always add one factor for context) ---
    if (funding.rate > 0.0001) {
      factors.push(`Funding elevated (${(funding.rate * 100).toFixed(4)}%)`);
      direction = "short";
      strength += 10;
    } else if (funding.rate < -0.0001) {
      factors.push(`Funding negative (${(funding.rate * 100).toFixed(4)}%)`);
      direction = "long";
      strength += 10;
    } else {
      factors.push(`Funding neutral (${(funding.rate * 100).toFixed(4)}%)`);
    }

    // --- L/S ratio (always add one factor) ---
    if (ls.ratio > 1.2) {
      factors.push(`Long-biased L/S (${ls.ratio.toFixed(2)})`);
      if (direction === "neutral") direction = "short";
      strength += 5;
    } else if (ls.ratio < 0.8) {
      factors.push(`Short-biased L/S (${ls.ratio.toFixed(2)})`);
      if (direction === "neutral") direction = "long";
      strength += 5;
    } else {
      factors.push(`L/S balanced (${ls.ratio.toFixed(2)})`);
    }

    // --- Open Interest (level + 24h change when available) ---
    if (oi) {
      const oiStr = this.formatVolume(oi.value).replace(/^\$/, "");
      factors.push(`OI ${oiStr}`);
      if (oi.change24h !== null && oi.change24h !== undefined) {
        if (oi.change24h > 2) {
          factors.push(`OI +${oi.change24h.toFixed(1)}% (position buildup)`);
        } else if (oi.change24h < -2) {
          factors.push(`OI ${oi.change24h.toFixed(1)}% (position flush)`);
        } else {
          factors.push(`OI 24h ${oi.change24h >= 0 ? "+" : ""}${oi.change24h.toFixed(1)}%`);
        }
      }
    }

    // --- Fear/Greed (always add one factor when available) ---
    if (fg) {
      if (fg.value <= 25) {
        factors.push(`Extreme fear (${fg.value})`);
        if (direction === "neutral") direction = "long";
        strength += 10;
      } else if (fg.value >= 75) {
        factors.push(`Extreme greed (${fg.value})`);
        if (direction === "neutral") direction = "short";
        strength += 10;
      } else if (fg.value <= 45) {
        factors.push(`Fear/Greed ${fg.value} (fear)`);
      } else if (fg.value >= 55) {
        factors.push(`Fear/Greed ${fg.value} (greed)`);
      } else {
        factors.push(`Fear/Greed neutral (${fg.value})`);
      }
    }

    return {
      asset,
      direction,
      strength: Math.min(100, strength),
      confidence: Math.min(100, factors.length * 20),
      source: "VinceCoinGlass",
      factors,
      timestamp: Date.now(),
    };
  }
}
