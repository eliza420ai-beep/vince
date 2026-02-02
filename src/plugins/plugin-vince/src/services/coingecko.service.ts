/**
 * VINCE CoinGecko Service
 *
 * Free CoinGecko API for:
 * - Exchange health (trust score, volume)
 * - Ticker liquidity (spreads, depth)
 * - Volume change detection
 *
 * Rate limited: 10-50 calls/min depending on endpoint
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { ExchangeHealth } from "../types/index";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (conservative rate limit)

interface CachedData {
  exchanges: Map<string, ExchangeHealth>;
  prices: Map<string, { price: number; change24h: number }>;
  lastUpdate: number;
}

export class VinceCoinGeckoService extends Service {
  static serviceType = "VINCE_COINGECKO_SERVICE";
  capabilityDescription = "CoinGecko market data: exchange health, prices, liquidity";

  private cache: CachedData = {
    exchanges: new Map(),
    prices: new Map(),
    lastUpdate: 0,
  };

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceCoinGeckoService> {
    const service = new VinceCoinGeckoService(runtime);
    await service.initialize();
    
    // Print dashboard
    service.printDashboard();
    
    return service;
  }

  /**
   * Print sexy terminal dashboard
   */
  private printDashboard(): void {
    console.log("");
    console.log("  ┌─────────────────────────────────────────────────────────────────┐");
    console.log("  │  🦎 COINGECKO MARKET DASHBOARD                                  │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    
    // Prices section
    console.log("  │  💰 PRICES (24h):                                               │");
    const prices = this.getAllPrices();
    for (const [symbol, data] of prices) {
      const priceStr = `$${data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      const changeEmoji = data.change24h > 0 ? "📈" : data.change24h < 0 ? "📉" : "➡️";
      const changeStr = `${data.change24h > 0 ? "+" : ""}${data.change24h.toFixed(2)}%`;
      console.log(`  │     ${symbol.padEnd(6)} ${priceStr.padEnd(14)} ${changeEmoji} ${changeStr}`.padEnd(66) + "│");
    }
    
    // Exchanges section
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    console.log("  │  🏦 TOP EXCHANGES:                                              │");
    const exchanges = this.getTopExchanges(3);
    for (const ex of exchanges) {
      const volStr = `${(ex.volume24h / 1000).toFixed(1)}k BTC`;
      const trustStr = `Trust: ${ex.trustScore}/10`;
      console.log(`  │     ${ex.exchange.padEnd(15)} ${volStr.padEnd(14)} ${trustStr}`.padEnd(66) + "│");
    }
    
    // TLDR
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    const tldr = this.getTLDR();
    const tldrEmoji = tldr.includes("UP") || tldr.includes("GREEN") ? "💡" :
                      tldr.includes("DOWN") || tldr.includes("RED") ? "⚠️" : "📋";
    console.log(`  │  ${tldrEmoji} ${tldr.padEnd(62)}│`);
    
    console.log("  └─────────────────────────────────────────────────────────────────┘");
    console.log("");
    
    logger.info("[VinceCoinGecko] ✅ Dashboard loaded");
  }

  /**
   * Generate actionable TLDR from market data
   */
  getTLDR(): string {
    const prices = this.getAllPrices();
    const btc = prices.get("BTC");
    const eth = prices.get("ETH");
    
    if (!btc && !eth) {
      return "MARKET: No price data - waiting for CoinGecko API";
    }
    
    // Count market direction
    let up = 0;
    let down = 0;
    let totalChange = 0;
    
    for (const [, data] of prices) {
      if (data.change24h > 0) up++;
      else if (data.change24h < 0) down++;
      totalChange += data.change24h;
    }
    
    const avgChange = prices.size > 0 ? totalChange / prices.size : 0;
    
    // Priority 1: Strong directional move
    if (avgChange > 3) {
      return `MARKET GREEN: Avg +${avgChange.toFixed(1)}% - risk-on sentiment`;
    }
    if (avgChange < -3) {
      return `MARKET RED: Avg ${avgChange.toFixed(1)}% - risk-off sentiment`;
    }
    
    // Priority 2: BTC specific
    if (btc) {
      if (btc.change24h > 2) {
        return `BTC UP ${btc.change24h.toFixed(1)}% - majors leading`;
      }
      if (btc.change24h < -2) {
        return `BTC DOWN ${Math.abs(btc.change24h).toFixed(1)}% - caution advised`;
      }
    }
    
    // Priority 3: Mixed market
    if (up > down * 2) {
      return "MARKET: Mostly green, broad strength";
    }
    if (down > up * 2) {
      return "MARKET: Mostly red, broad weakness";
    }
    
    // Default
    return "MARKET: Mixed signals, choppy conditions";
  }

  async stop(): Promise<void> {
    logger.info("[VinceCoinGecko] Service stopped");
  }

  private async initialize(): Promise<void> {
    logger.debug("[VinceCoinGecko] Service initialized (FREE API)");
    await this.refreshData();
  }

  async refreshData(): Promise<void> {
    const now = Date.now();
    if (now - this.cache.lastUpdate < CACHE_TTL_MS) {
      return;
    }

    try {
      await Promise.all([
        this.fetchPrices(),
        this.fetchExchanges(),
      ]);
      this.cache.lastUpdate = now;
    } catch (error) {
      logger.debug(`[VinceCoinGecko] Refresh error: ${error}`);
    }
  }

  private async fetchPrices(): Promise<void> {
    try {
      const ids = "bitcoin,ethereum,solana,hyperliquid";
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );

      if (res.ok) {
        const data = await res.json();
        const mapping: Record<string, string> = {
          bitcoin: "BTC",
          ethereum: "ETH",
          solana: "SOL",
          hyperliquid: "HYPE",
        };

        for (const [cgId, symbol] of Object.entries(mapping)) {
          if (data[cgId]) {
            this.cache.prices.set(symbol, {
              price: data[cgId].usd || 0,
              change24h: data[cgId].usd_24h_change || 0,
            });
          }
        }
      }
    } catch (error) {
      logger.debug(`[VinceCoinGecko] Price fetch error: ${error}`);
    }
  }

  private async fetchExchanges(): Promise<void> {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/exchanges?per_page=10"
      );

      if (res.ok) {
        const data = await res.json();
        for (const ex of data) {
          this.cache.exchanges.set(ex.id, {
            exchange: ex.name,
            trustScore: ex.trust_score || 0,
            volume24h: ex.trade_volume_24h_btc || 0,
            timestamp: Date.now(),
          });
        }
      }
    } catch (error) {
      logger.debug(`[VinceCoinGecko] Exchange fetch error: ${error}`);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): { available: boolean; lastUpdate: number } {
    return {
      available: this.cache.lastUpdate > 0,
      lastUpdate: this.cache.lastUpdate,
    };
  }

  getPrice(symbol: string): { price: number; change24h: number } | null {
    return this.cache.prices.get(symbol) || null;
  }

  getAllPrices(): Map<string, { price: number; change24h: number }> {
    return this.cache.prices;
  }

  getExchange(id: string): ExchangeHealth | null {
    return this.cache.exchanges.get(id) || null;
  }

  getTopExchanges(limit: number = 5): ExchangeHealth[] {
    return Array.from(this.cache.exchanges.values())
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, limit);
  }
}
