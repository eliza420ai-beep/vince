/**
 * VinceOpportunityCostService Tests (#67)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { VinceOpportunityCostService } from "../services/vinceOpportunityCost.service";

let svc: VinceOpportunityCostService;

beforeEach(() => {
  // Clear env override
  delete process.env.OPPORTUNITY_COST_THRESHOLD;
  svc = new VinceOpportunityCostService();
});

afterEach(() => {
  delete process.env.OPPORTUNITY_COST_THRESHOLD;
});

describe("VinceOpportunityCostService", () => {
  describe("getReallocationThreshold", () => {
    it("returns 15 by default", () => {
      expect(svc.getReallocationThreshold()).toBe(15);
    });

    it("reads OPPORTUNITY_COST_THRESHOLD from env", () => {
      process.env.OPPORTUNITY_COST_THRESHOLD = "25";
      expect(svc.getReallocationThreshold()).toBe(25);
    });

    it("falls back to 15 for invalid env value", () => {
      process.env.OPPORTUNITY_COST_THRESHOLD = "not-a-number";
      expect(svc.getReallocationThreshold()).toBe(15);
    });
  });

  describe("assess - no open positions", () => {
    it("returns shouldReallocate=false with no positions", () => {
      const result = svc.assess(
        { asset: "BTC", confidence: 80, strength: 90 },
        [],
      );
      expect(result.shouldReallocate).toBe(false);
      expect(result.weakestPosition).toBeNull();
      expect(result.newTradeExpectedValue).toBeCloseTo((80 * 90) / 100);
    });
  });

  describe("assess - reallocation recommended", () => {
    it("recommends reallocation when new trade EV > weakest by >15%", () => {
      const openPositions = [
        {
          tradeId: "trade-1",
          asset: "LINK",
          confidence: 30,
          strength: 20,
          unrealizedPnl: -50,
        }, // EV = 6
        {
          tradeId: "trade-2",
          asset: "DOGE",
          confidence: 50,
          strength: 40,
          unrealizedPnl: 10,
        }, // EV = 20
      ];

      const newTrade = { asset: "BTC", confidence: 80, strength: 90 }; // EV = 72
      // weakest is LINK with EV=6
      // newEV (72) > weakestEV (6) * 1.15 = 6.9 → should reallocate
      const result = svc.assess(newTrade, openPositions);

      expect(result.shouldReallocate).toBe(true);
      expect(result.weakestPosition).not.toBeNull();
      expect(result.weakestPosition!.asset).toBe("LINK");
      expect(result.weakestPosition!.expectedValue).toBeCloseTo(6);
      expect(result.newTradeExpectedValue).toBeCloseTo(72);
      expect(result.reallocationNote).toContain("LINK");
      expect(result.reallocationNote).toContain("BTC");
    });
  });

  describe("assess - reallocation not needed", () => {
    it("does not recommend reallocation when EVs are close", () => {
      const openPositions = [
        {
          tradeId: "trade-1",
          asset: "ETH",
          confidence: 70,
          strength: 80,
          unrealizedPnl: 100,
        }, // EV = 56
      ];

      const newTrade = { asset: "BTC", confidence: 72, strength: 82 }; // EV = 59.04
      // newEV (59.04) vs weakestEV (56) * 1.15 = 64.4 → new trade is NOT > 15% better
      const result = svc.assess(newTrade, openPositions);

      expect(result.shouldReallocate).toBe(false);
      expect(result.reallocationNote).toContain("No reallocation");
    });
  });

  describe("assess - multiple positions, finds weakest", () => {
    it("identifies the position with lowest EV as weakest", () => {
      const openPositions = [
        { tradeId: "t1", asset: "A", confidence: 90, strength: 90, unrealizedPnl: 100 }, // EV=81
        { tradeId: "t2", asset: "B", confidence: 20, strength: 15, unrealizedPnl: -30 }, // EV=3
        { tradeId: "t3", asset: "C", confidence: 60, strength: 50, unrealizedPnl: 0 }, // EV=30
      ];

      const newTrade = { asset: "NEW", confidence: 85, strength: 85 }; // EV=72.25
      const result = svc.assess(newTrade, openPositions);

      expect(result.weakestPosition!.asset).toBe("B");
      expect(result.weakestPosition!.expectedValue).toBeCloseTo(3);
    });
  });

  describe("EV computation", () => {
    it("computes EV as confidence * strength / 100", () => {
      const result = svc.assess(
        { asset: "SOL", confidence: 50, strength: 60 },
        [
          { tradeId: "t1", asset: "ETH", confidence: 40, strength: 50, unrealizedPnl: 0 },
        ],
      );
      expect(result.newTradeExpectedValue).toBeCloseTo(30); // 50*60/100
    });
  });
});
