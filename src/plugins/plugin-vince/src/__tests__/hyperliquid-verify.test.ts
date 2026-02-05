/**
 * Hyperliquid API Verification Test
 * 
 * Run this to verify the Hyperliquid API is returning data correctly:
 * 
 *   cd src/plugins/plugin-vince
 *   bun test src/__tests__/hyperliquid-verify.test.ts
 */

import { describe, it, expect } from "bun:test";
import { HyperliquidFallbackService } from "../services/fallbacks/hyperliquid.fallback";

const TIMEOUT = 30000; // 30 seconds for API calls

describe("Hyperliquid API Verification", () => {
  const service = new HyperliquidFallbackService();

  it("should connect to Hyperliquid API and fetch asset data", async () => {
    console.log("\n🔍 Testing Hyperliquid API connection...\n");
    
    // Test the connection
    const testResult = await (service as any).testConnection();
    
    console.log("Test Result:", JSON.stringify(testResult, null, 2));
    
    expect(testResult.success).toBe(true);
    expect(testResult.data).toBeDefined();
    expect(testResult.data.assetCount).toBeGreaterThan(0);
    
    console.log(`\n✅ Connected! Found ${testResult.data.assetCount} assets`);
    console.log(`   BTC 8h Funding: ${testResult.data.btcFunding8h !== null ? (testResult.data.btcFunding8h * 100).toFixed(4) + "%" : "N/A"}`);
    console.log(`   ETH 8h Funding: ${testResult.data.ethFunding8h !== null ? (testResult.data.ethFunding8h * 100).toFixed(4) + "%" : "N/A"}`);
    console.log(`   Sample assets: ${testResult.data.sampleAssets.join(", ")}\n`);
  }, TIMEOUT);

  it("should fetch options pulse with funding rates", async () => {
    console.log("\n📊 Fetching Options Pulse...\n");
    
    const optionsPulse = await service.getOptionsPulse();
    
    expect(optionsPulse).not.toBeNull();
    expect(optionsPulse?.overallBias).toBeDefined();
    expect(optionsPulse?.assets).toBeDefined();
    
    console.log("Options Pulse Result:");
    console.log(`   Overall Bias: ${optionsPulse?.overallBias}`);
    
    if (optionsPulse?.assets) {
      const { btc, eth, sol, hype } = optionsPulse.assets;
      
      const fmtOi = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v));
      const fmtVol = (v: number) => (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(1)}k`);
      if (btc) {
        const oi = btc.openInterest != null ? ` OI: ${fmtOi(btc.openInterest)} contracts` : "";
        const vol = btc.volume24h != null ? ` Vol24h: ${fmtVol(btc.volume24h)}` : "";
        console.log(`   BTC: ${btc.fundingAnnualized?.toFixed(2)}% annualized, ${btc.crowdingLevel} crowding, ${btc.squeezeRisk} squeeze risk${oi}${vol}`);
      }
      if (eth) {
        const oi = eth.openInterest != null ? ` OI: ${fmtOi(eth.openInterest)} contracts` : "";
        const vol = eth.volume24h != null ? ` Vol24h: ${fmtVol(eth.volume24h)}` : "";
        console.log(`   ETH: ${eth.fundingAnnualized?.toFixed(2)}% annualized, ${eth.crowdingLevel} crowding, ${eth.squeezeRisk} squeeze risk${oi}${vol}`);
      }
      if (sol) {
        const oi = sol.openInterest != null ? ` OI: ${fmtOi(sol.openInterest)} contracts` : "";
        const vol = sol.volume24h != null ? ` Vol24h: ${fmtVol(sol.volume24h)}` : "";
        console.log(`   SOL: ${sol.fundingAnnualized?.toFixed(2)}% annualized, ${sol.crowdingLevel} crowding${oi}${vol}`);
      }
      if (hype) {
        const oi = hype.openInterest != null ? ` OI: ${fmtOi(hype.openInterest)} contracts` : "";
        const vol = hype.volume24h != null ? ` Vol24h: ${fmtVol(hype.volume24h)}` : "";
        console.log(`   HYPE: ${hype.fundingAnnualized?.toFixed(2)}% annualized, ${hype.crowdingLevel} crowding${oi}${vol}`);
      }
    }
    
    console.log("\n✅ Options Pulse data retrieved successfully\n");
  }, TIMEOUT);

  it("should fetch cross-venue funding data", async () => {
    console.log("\n💱 Fetching Cross-Venue Funding...\n");
    
    const crossVenue = await service.getCrossVenueFunding();
    
    // Note: This endpoint may return null if there are temporary issues
    if (crossVenue === null) {
      console.log("⚠️  Cross-venue data returned null (this can happen due to API limits)");
      return;
    }
    
    expect(crossVenue.assets).toBeDefined();
    expect(Array.isArray(crossVenue.assets)).toBe(true);
    
    console.log(`Cross-Venue Result: ${crossVenue.assets.length} assets`);
    
    // Show top 5 assets with funding differences
    const topAssets = crossVenue.assets
      .filter(a => a.hlFunding !== undefined && a.cexFunding !== undefined)
      .slice(0, 5);
    
    for (const asset of topAssets) {
      const hlRate = (asset.hlFunding! * 100).toFixed(4);
      const cexRate = (asset.cexFunding! * 100).toFixed(4);
      const arbIndicator = asset.isArbitrageOpportunity ? " 🎯 ARB" : "";
      console.log(`   ${asset.coin}: HL=${hlRate}%, CEX=${cexRate}%${arbIndicator}`);
    }
    
    if (crossVenue.arbitrageOpportunities.length > 0) {
      console.log(`\n🎯 Arbitrage Opportunities: ${crossVenue.arbitrageOpportunities.join(", ")}`);
    }
    
    console.log("\n✅ Cross-venue data retrieved successfully\n");
  }, TIMEOUT);

  it("should report rate limit status", () => {
    console.log("\n⏱️  Rate Limit Status...\n");
    
    const status = service.getRateLimitStatus();
    
    console.log(`   Is Limited: ${status.isLimited}`);
    console.log(`   Circuit Open: ${status.circuitOpen}`);
    console.log(`   Backoff Until: ${status.backoffUntil > 0 ? new Date(status.backoffUntil).toISOString() : "N/A"}`);
    
    expect(status).toBeDefined();
    expect(typeof status.isLimited).toBe("boolean");
    
    console.log("\n✅ Rate limit status check complete\n");
  });
});
