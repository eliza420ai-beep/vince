import { describe, it, expect } from "vitest";
import {
  classifyTrendRegime,
  computeExecutionWindowScore,
  computeWeightedMarketQualityScore,
  marketQualityDecision,
} from "../utils/stockIndicators";

describe("YES/NO scoring utilities", () => {
  it("maps market quality score to decision thresholds", () => {
    expect(marketQualityDecision(80)).toBe("YES");
    expect(marketQualityDecision(79.99)).toBe("CAUTION");
    expect(marketQualityDecision(60)).toBe("CAUTION");
    expect(marketQualityDecision(59.99)).toBe("NO");
  });

  it("keeps weighted market quality score within 0..100", () => {
    const weights = {
      volatility: 25,
      momentum: 25,
      trend: 20,
      breadth: 20,
      macro: 10,
    };

    const all100 = computeWeightedMarketQualityScore({
      weights,
      categoryScores: {
        volatility: 100,
        momentum: 100,
        trend: 100,
        breadth: 100,
        macro: 100,
      },
    });
    expect(all100).toBe(100);

    const all0 = computeWeightedMarketQualityScore({
      weights,
      categoryScores: {
        volatility: 0,
        momentum: 0,
        trend: 0,
        breadth: 0,
        macro: 0,
      },
    });
    expect(all0).toBe(0);
  });

  it("classifies trend regime based on MA ordering", () => {
    expect(
      classifyTrendRegime({
        price: 110,
        sma20: 105,
        sma50: 100,
        sma200: 95,
      }),
    ).toBe("uptrend");

    expect(
      classifyTrendRegime({
        price: 90,
        sma20: 95,
        sma50: 100,
        sma200: 105,
      }),
    ).toBe("downtrend");

    // Mixed ordering -> chop.
    expect(
      classifyTrendRegime({
        price: 105,
        sma20: 100,
        sma50: 102,
        sma200: 104,
      }),
    ).toBe("chop");
  });

  it("keeps execution window score within 0..100 and respects day-mode penalty", () => {
    const swingMax = computeExecutionWindowScore({
      mode: "swing",
      breakoutsHolding: true,
      leadingFollowThrough: true,
      pullbacksBought: true,
    });
    expect(swingMax).toBe(100);

    const dayPenaltyCase = computeExecutionWindowScore({
      mode: "day",
      breakoutsHolding: false,
      leadingFollowThrough: true,
      pullbacksBought: true,
    });
    expect(dayPenaltyCase).toBe(65);
    expect(dayPenaltyCase).toBeGreaterThanOrEqual(0);
    expect(dayPenaltyCase).toBeLessThanOrEqual(100);
  });
});
