/**
 * HIP-3 API Verification Test
 * 
 * Run this to verify the HIP-3 (Hyperliquid) API is returning asset prices correctly:
 * 
 *   cd src/plugins/plugin-vince
 *   bun test src/__tests__/hip3-verify.test.ts
 */

import { describe, it, expect } from "bun:test";
import { VinceHIP3Service } from "../services/hip3.service";

const TIMEOUT = 60000; // 60 seconds for multiple API calls

// Mock runtime for standalone testing
const mockRuntime = {
  getSetting: () => null,
  getService: () => null,
} as any;

describe("HIP-3 API Verification", () => {
  const service = new VinceHIP3Service(mockRuntime);

  it("should connect to HIP-3 API and fetch asset data", async () => {
    console.log("\n🔍 Testing HIP-3 API connection...\n");
    
    const testResult = await service.testConnection();
    
    console.log("Test Result:", JSON.stringify(testResult, null, 2));
    
    expect(testResult.success).toBe(true);
    expect(testResult.data).toBeDefined();
    
    if (testResult.data) {
      const data = testResult.data as any;
      console.log(`\n✅ Connected! Found ${data.assetCount} HIP-3 assets`);
      console.log(`   Commodities: ${data.commodityCount} (GOLD, SILVER, OIL...)`);
      console.log(`   Indices: ${data.indexCount} (SPX, NDX, DJI...)`);
      console.log(`   Stocks: ${data.stockCount} (NVDA, AAPL, TSLA...)`);
      console.log(`   AI/Tech: ${data.aiCount}`);
      
      if (data.samplePrices?.length > 0) {
        console.log("\n   Sample Prices:");
        for (const p of data.samplePrices) {
          console.log(`     ${p.symbol}: $${p.price.toFixed(2)} (${p.category})`);
        }
      }
      
      if (data.topPerformer) {
        console.log(`\n   🟢 Top Performer: ${data.topPerformer.symbol} (+${data.topPerformer.change.toFixed(2)}%)`);
      }
      if (data.worstPerformer) {
        console.log(`   🔴 Worst Performer: ${data.worstPerformer.symbol} (${data.worstPerformer.change.toFixed(2)}%)`);
      }
    }
    
    console.log("\n");
  }, TIMEOUT);

  it("should fetch full HIP-3 pulse with sector stats", async () => {
    console.log("\n📊 Fetching HIP-3 Pulse...\n");
    
    const pulse = await service.getHIP3Pulse();
    
    expect(pulse).not.toBeNull();
    expect(pulse?.commodities).toBeDefined();
    expect(pulse?.indices).toBeDefined();
    expect(pulse?.stocks).toBeDefined();
    
    if (pulse) {
      console.log("HIP-3 Pulse Summary:");
      console.log(`   Overall Bias: ${pulse.summary.overallBias}`);
      console.log(`   TradFi vs Crypto: ${pulse.summary.tradFiVsCrypto}`);
      console.log(`   Gold vs BTC: ${pulse.summary.goldVsBtc.winner} wins`);
      console.log(`     Gold: ${pulse.summary.goldVsBtc.goldChange.toFixed(2)}%`);
      console.log(`     BTC: ${pulse.summary.goldVsBtc.btcChange.toFixed(2)}%`);
      
      console.log("\n   Sector Stats:");
      console.log(`     Hottest Sector: ${pulse.sectorStats.hottestSector}`);
      console.log(`     Commodities: avg ${pulse.sectorStats.commodities.avgChange.toFixed(2)}% (${pulse.sectorStats.commodities.assetCount} assets)`);
      console.log(`     Indices: avg ${pulse.sectorStats.indices.avgChange.toFixed(2)}% (${pulse.sectorStats.indices.assetCount} assets)`);
      console.log(`     Stocks: avg ${pulse.sectorStats.stocks.avgChange.toFixed(2)}% (${pulse.sectorStats.stocks.assetCount} assets)`);
      console.log(`     AI/Tech: avg ${pulse.sectorStats.aiPlays.avgChange.toFixed(2)}% (${pulse.sectorStats.aiPlays.assetCount} assets)`);
      
      if (pulse.leaders.volumeLeaders.length > 0) {
        console.log("\n   Volume Leaders:");
        for (const leader of pulse.leaders.volumeLeaders.slice(0, 3)) {
          console.log(`     ${leader.symbol}: $${(leader.volume / 1e6).toFixed(2)}M`);
        }
      }
      
      console.log("\n✅ HIP-3 Pulse data retrieved successfully\n");
    }
  }, TIMEOUT);

  it("should fetch individual asset prices", async () => {
    console.log("\n💰 Fetching Individual Asset Prices...\n");
    
    const testAssets = ["GOLD", "SPX", "NVDA", "OIL", "TSLA"];
    
    for (const symbol of testAssets) {
      const price = await service.getAssetPrice(symbol);
      
      if (price) {
        const changeIndicator = price.change24h >= 0 ? "🟢" : "🔴";
        console.log(
          `   ${changeIndicator} ${price.symbol.padEnd(6)} $${price.price.toFixed(2).padStart(10)} ` +
          `(${price.change24h >= 0 ? "+" : ""}${price.change24h.toFixed(2)}%) ` +
          `[${price.category}] via ${price.dex}`
        );
      } else {
        console.log(`   ⚪ ${symbol.padEnd(6)} not available`);
      }
    }
    
    console.log("\n✅ Individual price lookup complete\n");
  }, TIMEOUT);

  it("should report service status", () => {
    console.log("\n📈 Service Status...\n");
    
    const status = service.getStatus();
    
    console.log(`   Available: ${status.available}`);
    console.log(`   Asset Count: ${status.assetCount}`);
    console.log(`   Last Update: ${status.lastUpdate > 0 ? new Date(status.lastUpdate).toISOString() : "Never"}`);
    
    expect(status).toBeDefined();
    
    console.log("\n✅ Status check complete\n");
  });
});
