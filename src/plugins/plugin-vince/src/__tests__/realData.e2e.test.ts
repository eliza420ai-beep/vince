/**
 * VINCE Real Data E2E Test
 *
 * This test pulls REAL live data from all configured services
 * and generates today's actual bull/bear case.
 *
 * Requirements:
 * - COINGLASS_API_KEY (Hobbyist tier)
 * - SANTIMENT_API_KEY (optional, free tier)
 * - NANSEN_API_KEY (optional, 100 free credits)
 *
 * Run with: bun test src/plugins/plugin-vince/src/__tests__/realData.e2e.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { BullBearAnalyzer } from "../analysis/bullBearAnalyzer.ts";
import type { AnalysisResult, MarketDataSnapshot } from "../types/analysis.ts";

// Import real services
import { VinceCoinGlassService } from "../services/coinglass.service.ts";
import { VinceCoinGeckoService } from "../services/coingecko.service.ts";
import { VinceDeribitService } from "../services/deribit.service.ts";
import { VinceSanbaseService } from "../services/sanbase.service.ts";
import { VinceNansenService } from "../services/nansen.service.ts";
import { VinceTopTradersService } from "../services/topTraders.service.ts";
import { VinceNewsSentimentService } from "../services/newsSentiment.service.ts";
import { VinceDexScreenerService } from "../services/dexscreener.service.ts";
import { VinceNFTFloorService } from "../services/nftFloor.service.ts";

import type { IAgentRuntime, UUID } from "@elizaos/core";

// ==========================================
// Create a minimal real runtime for testing
// ==========================================

function createRealRuntime(): IAgentRuntime {
  const services = new Map<string, any>();

  // Minimal runtime implementation for service initialization
  const runtime: Partial<IAgentRuntime> = {
    agentId: "vince-e2e-test" as UUID,
    character: {
      name: "VINCE",
      plugins: [],
    } as any,
    getSetting: (key: string) => {
      // Pull from environment variables
      const envMap: Record<string, string | undefined> = {
        COINGLASS_API_KEY: process.env.COINGLASS_API_KEY,
        SANTIMENT_API_KEY: process.env.SANTIMENT_API_KEY,
        NANSEN_API_KEY: process.env.NANSEN_API_KEY,
      };
      return envMap[key] || process.env[key] || null;
    },
    getService: (serviceName: string) => services.get(serviceName) || null,
    getCache: async () => undefined,
    setCache: async () => true,
    deleteCache: async () => true,
  };

  return runtime as IAgentRuntime;
}

// ==========================================
// Initialize Real Services
// ==========================================

async function initializeRealServices(
  runtime: IAgentRuntime,
): Promise<Map<string, any>> {
  const services = new Map<string, any>();

  console.log("\n📡 Initializing real services...\n");

  // CoinGlass (requires API key)
  try {
    const coinglassService = await VinceCoinGlassService.start(runtime);
    services.set("VINCE_COINGLASS_SERVICE", coinglassService);
    console.log("  ✅ CoinGlass service initialized");
  } catch (e) {
    console.log("  ⚠️  CoinGlass service failed:", (e as Error).message);
  }

  // CoinGecko (free)
  try {
    const coingeckoService = await VinceCoinGeckoService.start(runtime);
    services.set("VINCE_COINGECKO_SERVICE", coingeckoService);
    console.log("  ✅ CoinGecko service initialized");
  } catch (e) {
    console.log("  ⚠️  CoinGecko service failed:", (e as Error).message);
  }

  // Deribit (free, no auth)
  try {
    const deribitService = await VinceDeribitService.start(runtime);
    services.set("VINCE_DERIBIT_SERVICE", deribitService);
    console.log("  ✅ Deribit service initialized");
  } catch (e) {
    console.log("  ⚠️  Deribit service failed:", (e as Error).message);
  }

  // Sanbase (free tier with API key)
  try {
    const sanbaseService = await VinceSanbaseService.start(runtime);
    if (sanbaseService.isConfigured()) {
      services.set("VINCE_SANBASE_SERVICE", sanbaseService);
      console.log("  ✅ Sanbase service initialized");
    } else {
      console.log("  ⚠️  Sanbase service not configured (no API key)");
    }
  } catch (e) {
    console.log("  ⚠️  Sanbase service failed:", (e as Error).message);
  }

  // Nansen (limited free credits)
  try {
    const nansenService = await VinceNansenService.start(runtime);
    if (nansenService.isConfigured()) {
      services.set("VINCE_NANSEN_SERVICE", nansenService);
      console.log("  ✅ Nansen service initialized");
    } else {
      console.log("  ⚠️  Nansen service not configured (no API key)");
    }
  } catch (e) {
    console.log("  ⚠️  Nansen service failed:", (e as Error).message);
  }

  // TopTraders (free via Hyperliquid)
  try {
    const topTradersService = await VinceTopTradersService.start(runtime);
    services.set("VINCE_TOP_TRADERS_SERVICE", topTradersService);
    console.log("  ✅ TopTraders service initialized");
  } catch (e) {
    console.log("  ⚠️  TopTraders service failed:", (e as Error).message);
  }

  // News Sentiment
  try {
    const newsService = await VinceNewsSentimentService.start(runtime);
    services.set("VINCE_NEWS_SENTIMENT_SERVICE", newsService);
    console.log("  ✅ NewsSentiment service initialized");
  } catch (e) {
    console.log("  ⚠️  NewsSentiment service failed:", (e as Error).message);
  }

  // DexScreener (free)
  try {
    const dexService = await VinceDexScreenerService.start(runtime);
    services.set("VINCE_DEXSCREENER_SERVICE", dexService);
    console.log("  ✅ DexScreener service initialized");
  } catch (e) {
    console.log("  ⚠️  DexScreener service failed:", (e as Error).message);
  }

  // NFT Floor (OpenSea, rate limited)
  try {
    const nftService = await VinceNFTFloorService.start(runtime);
    services.set("VINCE_NFT_FLOOR_SERVICE", nftService);
    console.log("  ✅ NFTFloor service initialized");
  } catch (e) {
    console.log("  ⚠️  NFTFloor service failed:", (e as Error).message);
  }

  console.log(`\n📊 ${services.size} services ready\n`);

  return services;
}

// ==========================================
// Pretty Print Functions
// ==========================================

function printSnapshot(snapshot: MarketDataSnapshot) {
  console.log("\n" + "=".repeat(60));
  console.log(`📊 MARKET DATA SNAPSHOT - ${snapshot.asset}`);
  console.log(`   ${new Date(snapshot.timestamp).toISOString()}`);
  console.log("=".repeat(60));

  console.log("\n📈 COINGLASS DATA:");
  console.log(
    `   Funding Rate:      ${snapshot.fundingRate !== null ? (snapshot.fundingRate * 100).toFixed(4) + "%" : "N/A"}`,
  );
  console.log(
    `   Long/Short Ratio:  ${snapshot.longShortRatio?.toFixed(2) || "N/A"}`,
  );
  console.log(
    `   Fear & Greed:      ${snapshot.fearGreedValue || "N/A"} (${snapshot.fearGreedLabel || "N/A"})`,
  );
  console.log(
    `   OI Change 24h:     ${snapshot.openInterestChange !== null ? snapshot.openInterestChange.toFixed(2) + "%" : "N/A"}`,
  );

  console.log("\n📊 DERIBIT OPTIONS DATA:");
  console.log(
    `   Spot Price:        $${snapshot.spotPrice?.toLocaleString() || "N/A"}`,
  );
  console.log(`   DVOL:              ${snapshot.dvol?.toFixed(1) || "N/A"}`);
  console.log(
    `   IV Skew:           ${snapshot.ivSkew?.toFixed(2) || "N/A"}% (${snapshot.skewInterpretation || "N/A"})`,
  );

  console.log("\n🔗 SANBASE ON-CHAIN DATA:");
  console.log(
    `   Exchange Net Flow: ${snapshot.exchangeNetFlow !== null ? snapshot.exchangeNetFlow.toLocaleString() + " " + snapshot.asset : "N/A"}`,
  );
  console.log(`   Exchange Sentiment:${snapshot.exchangeSentiment || "N/A"}`);
  console.log(`   Network Trend:     ${snapshot.networkTrend || "N/A"}`);
  console.log(`   Whale Sentiment:   ${snapshot.whaleSentiment || "N/A"}`);

  console.log("\n💰 NANSEN SMART MONEY:");
  console.log(
    `   Net Flow:          ${snapshot.smartMoneyNetFlow !== null ? "$" + (snapshot.smartMoneyNetFlow / 1000000).toFixed(2) + "M" : "N/A"}`,
  );
  console.log(
    `   Accumulating:      ${snapshot.isSmartMoneyAccumulating !== null ? (snapshot.isSmartMoneyAccumulating ? "YES" : "NO") : "N/A"}`,
  );
  console.log(
    `   Confidence:        ${snapshot.smartMoneyConfidence || "N/A"}`,
  );

  console.log("\n🐋 TOP TRADERS (HYPERLIQUID):");
  console.log(`   Direction:         ${snapshot.whaleDirection || "N/A"}`);
  console.log(
    `   Strength:          ${snapshot.whaleStrength !== null ? snapshot.whaleStrength + "%" : "N/A"}`,
  );

  console.log("\n📰 NEWS SENTIMENT:");
  console.log(`   Sentiment:         ${snapshot.newsSentiment || "N/A"}`);
  console.log(
    `   Confidence:        ${snapshot.newsConfidence !== null ? snapshot.newsConfidence + "%" : "N/A"}`,
  );
  console.log(
    `   Risk Events:       ${snapshot.hasRiskEvents ? "⚠️ YES" : "None"}`,
  );

  console.log("\n💵 PRICE ACTION:");
  console.log(
    `   24h Change:        ${snapshot.priceChange24h !== null ? snapshot.priceChange24h.toFixed(2) + "%" : "N/A"}`,
  );
}

function printAnalysisResult(result: AnalysisResult) {
  const { conclusion } = result;

  console.log("\n" + "=".repeat(60));
  console.log(`🎯 TODAY'S ANALYSIS - ${conclusion.asset}`);
  console.log(`   Date: ${conclusion.date}`);
  console.log("=".repeat(60));

  // Direction with emoji
  const directionEmoji =
    conclusion.direction === "bullish"
      ? "🟢"
      : conclusion.direction === "bearish"
        ? "🔴"
        : "🟡";
  console.log(
    `\n${directionEmoji} DIRECTION: ${conclusion.direction.toUpperCase()}`,
  );
  console.log(`   Conviction: ${conclusion.conviction.toFixed(0)}%`);
  console.log(`   Recommendation: ${conclusion.recommendation.toUpperCase()}`);

  // Bull Case
  console.log("\n" + "-".repeat(40));
  console.log(
    `🐂 BULL CASE (Strength: ${conclusion.bullCase.strength.toFixed(0)}/100)`,
  );
  console.log(`   Factors: ${conclusion.bullCase.factorCount}`);
  if (conclusion.bullCase.keyFactors.length > 0) {
    console.log("   Key Factors:");
    conclusion.bullCase.keyFactors.forEach((f, i) => {
      console.log(`     ${i + 1}. [${f.source}] ${f.indicator}: ${f.value}`);
      console.log(`        ${f.explanation}`);
    });
  }
  console.log(`\n   Narrative: ${conclusion.bullCase.narrative}`);

  // Bear Case
  console.log("\n" + "-".repeat(40));
  console.log(
    `🐻 BEAR CASE (Strength: ${conclusion.bearCase.strength.toFixed(0)}/100)`,
  );
  console.log(`   Factors: ${conclusion.bearCase.factorCount}`);
  if (conclusion.bearCase.keyFactors.length > 0) {
    console.log("   Key Factors:");
    conclusion.bearCase.keyFactors.forEach((f, i) => {
      console.log(`     ${i + 1}. [${f.source}] ${f.indicator}: ${f.value}`);
      console.log(`        ${f.explanation}`);
    });
  }
  console.log(`\n   Narrative: ${conclusion.bearCase.narrative}`);

  // Final Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 SUMMARY");
  console.log("=".repeat(60));
  console.log(`\n${conclusion.summary}`);
  console.log(`\n💡 ${conclusion.recommendationText}`);

  // Data Quality
  console.log("\n" + "-".repeat(40));
  console.log("📊 DATA QUALITY");
  console.log(`   Score: ${result.dataQualityScore}%`);
  console.log(
    `   Services Available: ${result.availableServices.join(", ") || "None"}`,
  );
  if (result.failedServices.length > 0) {
    console.log(`   Services Failed: ${result.failedServices.join(", ")}`);
  }
  console.log(`   Generation Time: ${result.generationTimeMs}ms`);
}

// ==========================================
// Test Suite (skipped unless RUN_NETWORK_TESTS=1)
// ==========================================
const skipNetworkTests = process.env.RUN_NETWORK_TESTS !== "1";

describe.skipIf(skipNetworkTests)("VINCE Real Data E2E Test", () => {
  let runtime: IAgentRuntime;
  let services: Map<string, any>;
  let analyzer: BullBearAnalyzer;

  beforeAll(async () => {
    runtime = createRealRuntime();
    services = await initializeRealServices(runtime);

    // Update runtime's getService to use initialized services
    (runtime as any).getService = (name: string) => services.get(name) || null;

    analyzer = new BullBearAnalyzer();
  }, 60000); // 60s timeout for initialization

  it("should pull real data from CoinGlass", async () => {
    const coinglassService = services.get("VINCE_COINGLASS_SERVICE");

    if (!coinglassService) {
      console.log("⚠️  Skipping CoinGlass test - service not available");
      return;
    }

    // Refresh data first (this is async)
    await coinglassService.refreshData();

    // These are synchronous getters
    const funding = coinglassService.getFunding("BTC");
    const longShort = coinglassService.getLongShortRatio("BTC");
    const fearGreed = coinglassService.getFearGreed();

    console.log("\n📈 CoinGlass Live Data:");
    console.log(
      `   BTC Funding: ${funding ? (funding.rate * 100).toFixed(4) + "%" : "N/A"}`,
    );
    console.log(`   BTC L/S Ratio: ${longShort?.ratio?.toFixed(2) || "N/A"}`);
    console.log(
      `   Fear & Greed: ${fearGreed?.value || "N/A"} (${fearGreed?.classification || "N/A"})`,
    );

    // At least one should work
    expect(funding !== null || longShort !== null || fearGreed !== null).toBe(
      true,
    );
  }, 30000);

  it("should pull real data from Deribit", async () => {
    const deribitService = services.get("VINCE_DERIBIT_SERVICE");

    if (!deribitService) {
      console.log("⚠️  Skipping Deribit test - service not available");
      return;
    }

    const indexPrice = await deribitService.getIndexPrice("BTC");
    const dvol = await deribitService.getDVOL("BTC");
    const ivSurface = await deribitService.getIVSurface("BTC");

    console.log("\n📊 Deribit Live Data:");
    console.log(
      `   BTC Index Price: $${indexPrice?.toLocaleString() || "N/A"}`,
    );
    console.log(`   BTC DVOL: ${dvol?.toFixed(1) || "N/A"}`);
    console.log(
      `   IV Skew: ${ivSurface?.skew?.toFixed(2) || "N/A"}% (${ivSurface?.skewInterpretation || "N/A"})`,
    );

    expect(indexPrice).toBeGreaterThan(0);
  }, 30000);

  it("should pull real data from CoinGecko", async () => {
    const coingeckoService = services.get("VINCE_COINGECKO_SERVICE");

    if (!coingeckoService) {
      console.log("⚠️  Skipping CoinGecko test - service not available");
      return;
    }

    // Refresh data first (this is async)
    await coingeckoService.refreshData();

    // These are synchronous getters
    const btcPrice = coingeckoService.getPrice("BTC");
    const ethPrice = coingeckoService.getPrice("ETH");

    console.log("\n💰 CoinGecko Live Data:");
    console.log(
      `   BTC: $${btcPrice?.price?.toLocaleString() || "N/A"} (${btcPrice?.change24h?.toFixed(2) || "N/A"}%)`,
    );
    console.log(
      `   ETH: $${ethPrice?.price?.toLocaleString() || "N/A"} (${ethPrice?.change24h?.toFixed(2) || "N/A"}%)`,
    );

    expect(btcPrice?.price).toBeGreaterThan(0);
  }, 30000);

  it("should pull real data from DexScreener", async () => {
    const dexService = services.get("VINCE_DEXSCREENER_SERVICE");

    if (!dexService) {
      console.log("⚠️  Skipping DexScreener test - service not available");
      return;
    }

    // Refresh data first (this is async)
    await dexService.refreshData();

    // These are synchronous getters
    const trending = dexService.getTrendingTokens();
    const aiTokens = dexService.getAiTokens();

    console.log("\n🔥 DexScreener Live Data:");
    console.log(`   Trending Tokens: ${trending?.length || 0}`);
    console.log(`   AI Tokens: ${aiTokens?.length || 0}`);

    if (trending && trending.length > 0) {
      console.log("   Top 3 Trending:");
      trending.slice(0, 3).forEach((t: any, i: number) => {
        console.log(
          `     ${i + 1}. ${t.symbol}: $${t.price?.toFixed(6)} (${t.priceChange24h?.toFixed(1)}%)`,
        );
      });
    }

    expect(trending).toBeDefined();
  }, 30000);

  it("should generate today's BTC bull/bear case with REAL data", async () => {
    console.log("\n" + "🚀".repeat(30));
    console.log("\n   GENERATING TODAY'S REAL BTC ANALYSIS...\n");
    console.log("🚀".repeat(30));

    const result = await analyzer.analyze(runtime, "BTC");

    // Print the snapshot
    printSnapshot(result.snapshot);

    // Print the analysis
    printAnalysisResult(result);

    // Assertions
    expect(result).toBeDefined();
    expect(result.conclusion).toBeDefined();
    expect(result.conclusion.asset).toBe("BTC");
    expect(result.conclusion.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.conclusion.direction).toMatch(/bullish|bearish|neutral/);
    expect(result.conclusion.conviction).toBeGreaterThanOrEqual(0);
    expect(result.conclusion.conviction).toBeLessThanOrEqual(100);

    // At least some services should have provided data
    expect(result.availableServices.length).toBeGreaterThan(0);
    expect(result.dataQualityScore).toBeGreaterThan(0);
  }, 120000); // 2 minute timeout for full analysis

  it("should generate today's ETH bull/bear case with REAL data", async () => {
    console.log("\n" + "🚀".repeat(30));
    console.log("\n   GENERATING TODAY'S REAL ETH ANALYSIS...\n");
    console.log("🚀".repeat(30));

    const result = await analyzer.analyze(runtime, "ETH");

    // Print the snapshot
    printSnapshot(result.snapshot);

    // Print the analysis
    printAnalysisResult(result);

    // Assertions
    expect(result).toBeDefined();
    expect(result.conclusion.asset).toBe("ETH");
    expect(result.conclusion.direction).toMatch(/bullish|bearish|neutral/);
  }, 120000);

  it("should compare BTC vs ETH analysis", async () => {
    const btcResult = await analyzer.analyze(runtime, "BTC");
    const ethResult = await analyzer.analyze(runtime, "ETH");

    console.log("\n" + "=".repeat(60));
    console.log("📊 BTC vs ETH COMPARISON");
    console.log("=".repeat(60));

    console.log("\n           BTC          |         ETH");
    console.log("-".repeat(50));
    console.log(
      `Direction: ${btcResult.conclusion.direction.padEnd(12)} | ${ethResult.conclusion.direction}`,
    );
    console.log(
      `Conviction:${btcResult.conclusion.conviction.toFixed(0).padStart(4)}%        | ${ethResult.conclusion.conviction.toFixed(0)}%`,
    );
    console.log(
      `Bull Str:  ${btcResult.conclusion.bullCase.strength.toFixed(0).padStart(4)}         | ${ethResult.conclusion.bullCase.strength.toFixed(0)}`,
    );
    console.log(
      `Bear Str:  ${btcResult.conclusion.bearCase.strength.toFixed(0).padStart(4)}         | ${ethResult.conclusion.bearCase.strength.toFixed(0)}`,
    );
    console.log(
      `Action:    ${btcResult.conclusion.recommendation.padEnd(12)} | ${ethResult.conclusion.recommendation}`,
    );

    expect(btcResult.conclusion).toBeDefined();
    expect(ethResult.conclusion).toBeDefined();
  }, 180000);
});

// ==========================================
// Standalone Test Runner
// ==========================================

// Allow running directly with: bun run src/plugins/plugin-vince/src/__tests__/realData.e2e.test.ts
if (import.meta.main) {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 VINCE REAL DATA E2E TEST - STANDALONE MODE");
  console.log("=".repeat(60));
  console.log("\nThis will pull REAL data and generate today's analysis.\n");

  const runtime = createRealRuntime();

  initializeRealServices(runtime)
    .then(async (services) => {
      // Update runtime
      (runtime as any).getService = (name: string) =>
        services.get(name) || null;

      const analyzer = new BullBearAnalyzer();

      console.log("\n⏳ Analyzing BTC...\n");
      const btcResult = await analyzer.analyze(runtime, "BTC");
      printSnapshot(btcResult.snapshot);
      printAnalysisResult(btcResult);

      console.log("\n\n⏳ Analyzing ETH...\n");
      const ethResult = await analyzer.analyze(runtime, "ETH");
      printSnapshot(ethResult.snapshot);
      printAnalysisResult(ethResult);

      console.log("\n✅ Analysis complete!\n");
    })
    .catch(console.error);
}
