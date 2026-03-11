import { describe, expect, it } from "vitest";
import { computeStockScorecard } from "../utils/stockScoring";
import type { SolusOffchainStock } from "../constants/solusStockWatchlist";

const powerStock: SolusOffchainStock = {
  ticker: "POWR",
  sector: "AI Energy",
  theme: "ai_power",
  thesisRole: "supplier",
  keyCatalysts: ["earnings", "utility contract", "interconnect approval"],
};

const riskStock: SolusOffchainStock = {
  ticker: "RISK",
  sector: "Semiconductors",
  theme: "outsourcing_disruption",
  thesisRole: "at_risk_incumbent",
  keyCatalysts: ["guidance"],
};

describe("computeStockScorecard", () => {
  it("maps strong setup to accumulate", () => {
    const score = computeStockScorecard({
      stock: powerStock,
      quoteChangePct: 3.2,
      newsCount: 4,
      peRatio: 24,
      revenueGrowth: 0.55,
      profitMargin: 0.22,
      debtToEquity: 0.6,
      returnOnEquity: 0.24,
      beta: 1.2,
      hasUpcomingEarnings: true,
    });
    expect(score.netEdgeScore).toBeGreaterThanOrEqual(70);
    expect(score.recommendation).toBe("accumulate");
  });

  it("maps weak/high-risk setup to avoid", () => {
    const score = computeStockScorecard({
      stock: riskStock,
      quoteChangePct: -6.5,
      newsCount: 1,
      peRatio: 78,
      revenueGrowth: -0.15,
      profitMargin: 0.01,
      debtToEquity: 2.8,
      returnOnEquity: -0.02,
      beta: 2.1,
      hasUpcomingEarnings: false,
    });
    expect(score.netEdgeScore).toBeLessThan(45);
    expect(score.recommendation).toBe("avoid");
  });
});
