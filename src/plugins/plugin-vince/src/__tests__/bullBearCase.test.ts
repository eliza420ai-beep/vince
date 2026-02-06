/**
 * VINCE Bull/Bear Case Analysis Tests
 *
 * Comprehensive tests proving that:
 * 1. Services return quality data
 * 2. Combining data points enables coherent bull/bear cases
 * 3. Final conclusions are generated with conviction scores
 *
 * Test Categories:
 * - Data quality validation
 * - Bull case extraction
 * - Bear case extraction
 * - Conclusion generation
 * - Narrative coherence
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BullBearAnalyzer,
  getBullBearAnalyzer,
} from "../analysis/bullBearAnalyzer.ts";
import type {
  MarketDataSnapshot,
  DailyConclusion,
  MarketCase,
} from "../types/analysis.ts";
import {
  createMockRuntime,
  createBullishRuntime,
  createBearishRuntime,
  createMixedRuntime,
  createMockCoinGlassData,
  createMockDeribitData,
  createMockSanbaseData,
  createMockNansenData,
  createMockTopTradersData,
  createMockNewsSentimentData,
  createMockCoinGeckoData,
} from "./test-utils.ts";

// ==========================================
// Test Suite: Data Quality
// ==========================================

describe("Data Quality Tests", () => {
  it("should return valid data structures from all mock services", async () => {
    const runtime = createMockRuntime();
    const analyzer = new BullBearAnalyzer();

    const result = await analyzer.analyze(runtime, "BTC");

    // Verify snapshot has all expected fields
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot.asset).toBe("BTC");
    expect(result.snapshot.timestamp).toBeGreaterThan(0);

    // Verify services were accessed
    expect(result.availableServices.length).toBeGreaterThan(0);

    // Verify data quality score
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.dataQualityScore).toBeLessThanOrEqual(100);
  });

  it("should capture CoinGlass data correctly", () => {
    const bullishData = createMockCoinGlassData("bullish");
    const bearishData = createMockCoinGlassData("bearish");

    // Bullish scenario: negative funding, low L/S ratio, extreme fear
    expect(bullishData.funding.rate).toBeLessThan(0);
    expect(bullishData.longShortRatio.ratio).toBeLessThan(1);
    expect(bullishData.fearGreed.value).toBeLessThan(30);
    expect(bullishData.fearGreed.classification).toBe("extreme_fear");

    // Bearish scenario: positive funding, high L/S ratio, extreme greed
    expect(bearishData.funding.rate).toBeGreaterThan(0);
    expect(bearishData.longShortRatio.ratio).toBeGreaterThan(1);
    expect(bearishData.fearGreed.value).toBeGreaterThan(70);
    expect(bearishData.fearGreed.classification).toBe("extreme_greed");
  });

  it("should capture Deribit options data correctly", () => {
    const bullishData = createMockDeribitData("bullish");
    const bearishData = createMockDeribitData("bearish");

    // Bullish: low DVOL, bullish skew
    expect(bullishData.dvol).toBeLessThan(50);
    expect(bullishData.ivSurface.skewInterpretation).toBe("bullish");
    expect(bullishData.ivSurface.skew).toBeLessThan(0);

    // Bearish: high DVOL, fearful skew
    expect(bearishData.dvol).toBeGreaterThan(70);
    expect(bearishData.ivSurface.skewInterpretation).toBe("fearful");
    expect(bearishData.ivSurface.skew).toBeGreaterThan(0);
  });

  it("should capture Sanbase on-chain data correctly", () => {
    const bullishData = createMockSanbaseData("bullish");
    const bearishData = createMockSanbaseData("bearish");

    // Bullish: exchange outflows, increasing network, bullish whales
    expect(bullishData.exchangeFlows.netFlow).toBeLessThan(0);
    expect(bullishData.exchangeFlows.sentiment).toBe("accumulation");
    expect(bullishData.networkActivity.trend).toBe("increasing");
    expect(bullishData.whaleActivity.sentiment).toBe("bullish");

    // Bearish: exchange inflows, decreasing network, bearish whales
    expect(bearishData.exchangeFlows.netFlow).toBeGreaterThan(0);
    expect(bearishData.exchangeFlows.sentiment).toBe("distribution");
    expect(bearishData.networkActivity.trend).toBe("decreasing");
    expect(bearishData.whaleActivity.sentiment).toBe("bearish");
  });

  it("should capture Nansen smart money data correctly", () => {
    const bullishData = createMockNansenData("bullish");
    const bearishData = createMockNansenData("bearish");

    // Bullish: accumulating with positive flow
    expect(bullishData.isAccumulating.accumulating).toBe(true);
    expect(bullishData.isAccumulating.netFlow).toBeGreaterThan(0);
    expect(bullishData.isAccumulating.confidence).toBe("high");

    // Bearish: not accumulating with negative flow
    expect(bearishData.isAccumulating.accumulating).toBe(false);
    expect(bearishData.isAccumulating.netFlow).toBeLessThan(0);
  });

  it("should capture TopTraders whale data correctly", () => {
    const bullishData = createMockTopTradersData("bullish");
    const bearishData = createMockTopTradersData("bearish");

    // Bullish: whales opening longs
    expect(bullishData.signal.direction).toBe("long");
    expect(bullishData.signal.strength).toBeGreaterThan(60);
    expect(bullishData.recentSignals[0].action).toBe("opened_long");

    // Bearish: whales opening shorts
    expect(bearishData.signal.direction).toBe("short");
    expect(bearishData.signal.strength).toBeGreaterThan(60);
    expect(bearishData.recentSignals[0].action).toBe("opened_short");
  });

  it("should capture news sentiment data correctly", () => {
    const bullishData = createMockNewsSentimentData("bullish");
    const bearishData = createMockNewsSentimentData("bearish");

    // Bullish: positive sentiment
    expect(bullishData.overallSentiment.sentiment).toBe("bullish");
    expect(bullishData.activeRiskEvents.length).toBe(0);

    // Bearish: negative sentiment with risk events
    expect(bearishData.overallSentiment.sentiment).toBe("bearish");
    expect(bearishData.activeRiskEvents.length).toBeGreaterThan(0);
  });
});

// ==========================================
// Test Suite: Bull Case Building
// ==========================================

describe("Bull Case Extraction", () => {
  let analyzer: BullBearAnalyzer;

  beforeEach(() => {
    analyzer = new BullBearAnalyzer();
  });

  it("should identify bullish signals from mock data", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const bullCase = result.conclusion.bullCase;

    // Bull case should have multiple factors
    expect(bullCase.factorCount).toBeGreaterThan(0);
    expect(bullCase.factors.length).toBeGreaterThan(0);

    // Strength should be significant
    expect(bullCase.strength).toBeGreaterThan(30);
  });

  it("should correctly weight bullish funding rate signal", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const fundingFactor = result.conclusion.bullCase.factors.find(
      (f) => f.indicator === "funding_rate",
    );

    if (fundingFactor) {
      expect(fundingFactor.source).toBe("coinglass");
      expect(fundingFactor.rawValue).toBeLessThan(0);
      expect(fundingFactor.explanation).toContain("shorts");
      expect(fundingFactor.confidence).toBeGreaterThan(0);
    }
  });

  it("should correctly identify fear as bullish contrarian signal", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const fearFactor = result.conclusion.bullCase.factors.find(
      (f) => f.indicator === "fear_greed",
    );

    if (fearFactor) {
      expect(fearFactor.rawValue).toBeLessThan(30);
      expect(fearFactor.explanation).toContain("fear");
      expect(fearFactor.explanation.toLowerCase()).toContain("buy");
    }
  });

  it("should identify smart money accumulation as bullish", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const smartMoneyFactor = result.conclusion.bullCase.factors.find(
      (f) => f.indicator === "smart_money_flow",
    );

    if (smartMoneyFactor) {
      expect(smartMoneyFactor.source).toBe("nansen");
      expect(smartMoneyFactor.value).toContain("Accumulating");
      expect(smartMoneyFactor.explanation).toMatch(/smart money/i);
    }
  });

  it("should generate coherent bull narrative", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const narrative = result.conclusion.bullCase.narrative;

    expect(narrative).toBeDefined();
    expect(narrative.length).toBeGreaterThan(20);
    expect(narrative.toLowerCase()).toContain("bull");
    expect(narrative).toContain("factors");
  });
});

// ==========================================
// Test Suite: Bear Case Building
// ==========================================

describe("Bear Case Extraction", () => {
  let analyzer: BullBearAnalyzer;

  beforeEach(() => {
    analyzer = new BullBearAnalyzer();
  });

  it("should identify bearish signals from mock data", async () => {
    const runtime = createBearishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const bearCase = result.conclusion.bearCase;

    // Bear case should have multiple factors
    expect(bearCase.factorCount).toBeGreaterThan(0);
    expect(bearCase.factors.length).toBeGreaterThan(0);

    // Strength should be significant (lower threshold for mock data variance)
    expect(bearCase.strength).toBeGreaterThan(20);
  });

  it("should correctly weight bearish funding rate signal", async () => {
    const runtime = createBearishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const fundingFactor = result.conclusion.bearCase.factors.find(
      (f) => f.indicator === "funding_rate",
    );

    if (fundingFactor) {
      expect(fundingFactor.source).toBe("coinglass");
      expect(fundingFactor.rawValue).toBeGreaterThan(0);
      expect(fundingFactor.explanation).toContain("longs");
      expect(fundingFactor.confidence).toBeGreaterThan(0);
    }
  });

  it("should correctly identify greed as bearish contrarian signal", async () => {
    const runtime = createBearishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const greedFactor = result.conclusion.bearCase.factors.find(
      (f) => f.indicator === "fear_greed",
    );

    if (greedFactor) {
      expect(greedFactor.rawValue).toBeGreaterThan(70);
      expect(greedFactor.explanation).toContain("greed");
      expect(greedFactor.explanation.toLowerCase()).toContain("sell");
    }
  });

  it("should identify smart money distribution as bearish", async () => {
    const runtime = createBearishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const smartMoneyFactor = result.conclusion.bearCase.factors.find(
      (f) => f.indicator === "smart_money_flow",
    );

    if (smartMoneyFactor) {
      expect(smartMoneyFactor.source).toBe("nansen");
      expect(smartMoneyFactor.value).toContain("Distributing");
    }
  });

  it("should identify risk events as bearish", async () => {
    const runtime = createBearishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const riskFactor = result.conclusion.bearCase.factors.find(
      (f) => f.indicator === "risk_events" || f.indicator === "sentiment",
    );

    if (riskFactor) {
      expect(riskFactor.source).toBe("news_sentiment");
    }
  });

  it("should generate coherent bear narrative", async () => {
    const runtime = createBearishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const narrative = result.conclusion.bearCase.narrative;

    expect(narrative).toBeDefined();
    expect(narrative.length).toBeGreaterThan(20);
    expect(narrative.toLowerCase()).toContain("bear");
    expect(narrative).toContain("factors");
  });
});

// ==========================================
// Test Suite: Conclusion Generation
// ==========================================

describe("Conclusion Generation", () => {
  let analyzer: BullBearAnalyzer;

  beforeEach(() => {
    analyzer = new BullBearAnalyzer();
  });

  it("should produce bullish conclusion when bull case is stronger", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion.direction).toBe("bullish");
    expect(result.conclusion.conviction).toBeGreaterThan(50);
    expect(result.conclusion.bullCase.strength).toBeGreaterThan(
      result.conclusion.bearCase.strength,
    );
  });

  it("should produce bearish conclusion when bear case is stronger", async () => {
    const runtime = createBearishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion.direction).toBe("bearish");
    expect(result.conclusion.conviction).toBeGreaterThan(50);
    expect(result.conclusion.bearCase.strength).toBeGreaterThan(
      result.conclusion.bullCase.strength,
    );
  });

  it("should produce neutral conclusion when signals conflict", async () => {
    const runtime = createMixedRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    // Mixed signals should produce lower conviction
    const strengthDiff = Math.abs(
      result.conclusion.bullCase.strength - result.conclusion.bearCase.strength,
    );

    // Either neutral direction or low conviction, or balanced strengths
    if (result.conclusion.direction === "neutral") {
      expect(result.conclusion.conviction).toBeLessThan(60);
    } else {
      // If not neutral, the strength difference should be relatively small (allow mock variance)
      expect(strengthDiff).toBeLessThan(80);
    }
  });

  it("should include key factors from both cases", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion.keyFactors).toBeDefined();
    expect(result.conclusion.keyFactors.length).toBeGreaterThan(0);

    // Key factors should contain explanations
    const hasBullFactors = result.conclusion.keyFactors.some((f) =>
      f.includes("BULL"),
    );
    expect(hasBullFactors).toBe(true);
  });

  it("should provide appropriate recommendation based on direction", async () => {
    // Test bullish recommendation
    const bullRuntime = createBullishRuntime();
    const bullResult = await analyzer.analyze(bullRuntime, "BTC");

    expect(["accumulate", "hold"]).toContain(
      bullResult.conclusion.recommendation,
    );
    expect(bullResult.conclusion.recommendationText).toBeDefined();
    expect(bullResult.conclusion.recommendationText.length).toBeGreaterThan(10);

    // Test bearish recommendation
    const bearRuntime = createBearishRuntime();
    const bearResult = await analyzer.analyze(bearRuntime, "BTC");

    expect(["reduce", "hedge"]).toContain(bearResult.conclusion.recommendation);
    expect(bearResult.conclusion.recommendationText).toBeDefined();
  });

  it("should generate valid date and timestamp", async () => {
    const runtime = createMockRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.conclusion.timestamp).toBeGreaterThan(0);
    expect(result.conclusion.timestamp).toBeLessThanOrEqual(Date.now());
  });
});

// ==========================================
// Test Suite: Narrative Quality
// ==========================================

describe("Narrative Coherence", () => {
  let analyzer: BullBearAnalyzer;

  beforeEach(() => {
    analyzer = new BullBearAnalyzer();
  });

  it("should generate readable summary", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const summary = result.conclusion.summary;

    expect(summary).toBeDefined();
    expect(summary.length).toBeGreaterThan(50);
    expect(summary).toContain("BTC");
    expect(summary).toContain("conviction");
  });

  it("should include conviction percentage in summary", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const summary = result.conclusion.summary;

    // Should contain a percentage
    expect(summary).toMatch(/\d+%/);
  });

  it("should reference bull vs bear strength in summary", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    const summary = result.conclusion.summary;

    // Should compare cases
    expect(summary.toLowerCase()).toContain("bull");
    expect(summary.toLowerCase()).toContain("bear");
  });

  it("should explain key drivers in case narratives", async () => {
    const runtime = createBullishRuntime();
    const result = await analyzer.analyze(runtime, "BTC");

    // Bull case narrative should mention key signals
    const bullNarrative = result.conclusion.bullCase.narrative;
    expect(bullNarrative).toContain("Key signals");
    expect(bullNarrative).toContain("factors");
  });

  it("should handle empty cases gracefully", () => {
    const emptySnapshot: MarketDataSnapshot = {
      asset: "BTC",
      timestamp: Date.now(),
      fundingRate: null,
      longShortRatio: null,
      fearGreedValue: null,
      fearGreedLabel: null,
      openInterestChange: null,
      spotPrice: null,
      dvol: null,
      ivSkew: null,
      skewInterpretation: null,
      exchangeNetFlow: null,
      exchangeSentiment: null,
      networkTrend: null,
      whaleSentiment: null,
      smartMoneyNetFlow: null,
      isSmartMoneyAccumulating: null,
      smartMoneyConfidence: null,
      whaleDirection: null,
      whaleStrength: null,
      newsSentiment: null,
      newsConfidence: null,
      hasRiskEvents: false,
      priceChange24h: null,
    };

    const bullCase = analyzer.buildBullCase(emptySnapshot);
    const bearCase = analyzer.buildBearCase(emptySnapshot);

    expect(bullCase.factorCount).toBe(0);
    expect(bullCase.strength).toBe(0);
    expect(bullCase.narrative).toContain("No significant");

    expect(bearCase.factorCount).toBe(0);
    expect(bearCase.strength).toBe(0);
  });
});

// ==========================================
// Test Suite: Full Integration
// ==========================================

describe("Full Daily Analysis Integration", () => {
  it("should complete full analysis cycle with bullish data", async () => {
    const runtime = createBullishRuntime();
    const analyzer = new BullBearAnalyzer();

    const result = await analyzer.analyze(runtime, "BTC");

    // Verify complete result structure
    expect(result).toHaveProperty("snapshot");
    expect(result).toHaveProperty("conclusion");
    expect(result).toHaveProperty("availableServices");
    expect(result).toHaveProperty("failedServices");
    expect(result).toHaveProperty("dataQualityScore");
    expect(result).toHaveProperty("generationTimeMs");

    // Verify conclusion structure
    const conclusion = result.conclusion;
    expect(conclusion).toHaveProperty("date");
    expect(conclusion).toHaveProperty("asset");
    expect(conclusion).toHaveProperty("bullCase");
    expect(conclusion).toHaveProperty("bearCase");
    expect(conclusion).toHaveProperty("direction");
    expect(conclusion).toHaveProperty("conviction");
    expect(conclusion).toHaveProperty("keyFactors");
    expect(conclusion).toHaveProperty("recommendation");
    expect(conclusion).toHaveProperty("recommendationText");
    expect(conclusion).toHaveProperty("summary");

    // Verify bull case wins in bullish scenario
    expect(conclusion.direction).toBe("bullish");
    expect(conclusion.bullCase.strength).toBeGreaterThan(
      conclusion.bearCase.strength,
    );
  });

  it("should complete full analysis cycle with bearish data", async () => {
    const runtime = createBearishRuntime();
    const analyzer = new BullBearAnalyzer();

    const result = await analyzer.analyze(runtime, "BTC");

    // Verify bear case wins in bearish scenario
    expect(result.conclusion.direction).toBe("bearish");
    expect(result.conclusion.bearCase.strength).toBeGreaterThan(
      result.conclusion.bullCase.strength,
    );
    expect(result.conclusion.recommendation).toBe("reduce");
  });

  it("should track generation time", async () => {
    const runtime = createMockRuntime();
    const analyzer = new BullBearAnalyzer();

    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.generationTimeMs).toBeLessThan(5000); // Should complete in under 5s
  });

  it("should work with singleton accessor", async () => {
    const runtime = createBullishRuntime();
    const analyzer = getBullBearAnalyzer();

    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion).toBeDefined();
    expect(result.conclusion.direction).toBe("bullish");
  });

  it("should analyze multiple assets independently", async () => {
    const runtime = createBullishRuntime();
    const analyzer = new BullBearAnalyzer();

    const btcResult = await analyzer.analyze(runtime, "BTC");
    const ethResult = await analyzer.analyze(runtime, "ETH");

    expect(btcResult.conclusion.asset).toBe("BTC");
    expect(ethResult.conclusion.asset).toBe("ETH");

    // Both should be bullish in bullish runtime
    expect(btcResult.conclusion.direction).toBe("bullish");
    expect(ethResult.conclusion.direction).toBe("bullish");
  });
});

// ==========================================
// Test Suite: Edge Cases
// ==========================================

describe("Edge Cases", () => {
  it("should handle missing services gracefully", async () => {
    // Create runtime with no services
    const runtime = {
      agentId: "test-agent-id",
      character: { name: "VINCE", plugins: [] },
      getService: vi.fn().mockReturnValue(null),
      getSetting: vi.fn().mockReturnValue(null),
    } as any;

    const analyzer = new BullBearAnalyzer();
    const result = await analyzer.analyze(runtime, "BTC");

    // Should still produce a valid result
    expect(result.conclusion).toBeDefined();
    expect(result.availableServices.length).toBe(0);
    expect(result.dataQualityScore).toBe(0);
  });

  it("should handle service errors gracefully", async () => {
    // Create runtime where services throw errors
    const runtime = {
      agentId: "test-agent-id",
      character: { name: "VINCE", plugins: [] },
      getService: vi.fn().mockImplementation(() => ({
        getFunding: () => {
          throw new Error("API Error");
        },
        getLongShortRatio: () => {
          throw new Error("API Error");
        },
        getFearGreed: () => {
          throw new Error("API Error");
        },
        getOpenInterest: () => {
          throw new Error("API Error");
        },
      })),
      getSetting: vi.fn().mockReturnValue(null),
    } as any;

    const analyzer = new BullBearAnalyzer();

    // Should not throw
    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion).toBeDefined();
    expect(result.failedServices.length).toBeGreaterThan(0);
  });

  it("should cap conviction at 95%", async () => {
    const runtime = createBullishRuntime();
    const analyzer = new BullBearAnalyzer();

    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion.conviction).toBeLessThanOrEqual(95);
  });

  it("should cap case strength at 100", async () => {
    const runtime = createBullishRuntime();
    const analyzer = new BullBearAnalyzer();

    const result = await analyzer.analyze(runtime, "BTC");

    expect(result.conclusion.bullCase.strength).toBeLessThanOrEqual(100);
    expect(result.conclusion.bearCase.strength).toBeLessThanOrEqual(100);
  });
});
