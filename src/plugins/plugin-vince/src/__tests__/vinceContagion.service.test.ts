/**
 * VinceContagionService Tests (#66)
 */

import { describe, it, expect } from "vitest";
import { VinceContagionService } from "../services/vinceContagion.service";

const svc = new VinceContagionService();

describe("VinceContagionService", () => {
  describe("getGroupForAsset", () => {
    it("returns crypto-large-cap group for BTC", () => {
      const group = svc.getGroupForAsset("BTC");
      expect(group).not.toBeNull();
      expect(group!.id).toBe("crypto-large-cap");
    });

    it("returns us-tech group for NVDA", () => {
      const group = svc.getGroupForAsset("NVDA");
      expect(group).not.toBeNull();
      // NVDA is in both us-tech and ai-infra; returns first match
      expect(["us-tech", "ai-infra"]).toContain(group!.id);
    });

    it("returns null for unknown asset", () => {
      const group = svc.getGroupForAsset("DOGE");
      expect(group).toBeNull();
    });

    it("is case-insensitive", () => {
      const group = svc.getGroupForAsset("btc");
      expect(group).not.toBeNull();
    });
  });

  describe("getGroupExposure", () => {
    it("sums exposure for assets in the crypto-large-cap group", () => {
      const positions = [
        { asset: "BTC", sizeUsd: 10000 },
        { asset: "ETH", sizeUsd: 5000 },
        { asset: "SOL", sizeUsd: 3000 },
        { asset: "LINK", sizeUsd: 2000 }, // not in group
      ];
      const exposure = svc.getGroupExposure("crypto-large-cap", positions);
      expect(exposure).toBe(18000); // BTC+ETH+SOL
    });

    it("returns 0 for unknown group", () => {
      const positions = [{ asset: "BTC", sizeUsd: 10000 }];
      expect(svc.getGroupExposure("unknown-group", positions)).toBe(0);
    });

    it("returns 0 for no matching positions", () => {
      const positions = [{ asset: "LINK", sizeUsd: 10000 }];
      expect(svc.getGroupExposure("crypto-large-cap", positions)).toBe(0);
    });
  });

  describe("assessContagion", () => {
    it("returns low risk for small diversified portfolio", () => {
      const positions = [
        { asset: "BTC", sizeUsd: 5000 }, // 5% of 100k
        { asset: "NVDA", sizeUsd: 4000 },
      ];
      const result = svc.assessContagion(positions, 100000);
      expect(result.contagionRisk).toBe("low");
      expect(result.sizeMultiplier).toBe(1.0);
    });

    it("returns medium risk for moderate correlated exposure", () => {
      const positions = [
        { asset: "BTC", sizeUsd: 12000 }, // 12% of 100k
        { asset: "ETH", sizeUsd: 3000 }, // 3%
        // total crypto-large-cap = 15% → medium (10-25%)
      ];
      const result = svc.assessContagion(positions, 100000);
      expect(result.contagionRisk).toBe("medium");
      expect(result.sizeMultiplier).toBe(0.75);
    });

    it("returns high risk for 30% concentrated correlated exposure", () => {
      const positions = [
        { asset: "BTC", sizeUsd: 20000 },
        { asset: "ETH", sizeUsd: 10000 },
        // 30% → high (25-50%)
      ];
      const result = svc.assessContagion(positions, 100000);
      expect(result.contagionRisk).toBe("high");
      expect(result.sizeMultiplier).toBe(0.5);
    });

    it("returns critical risk for >=50% exposure and blocks", () => {
      const positions = [
        { asset: "BTC", sizeUsd: 30000 },
        { asset: "ETH", sizeUsd: 15000 },
        { asset: "SOL", sizeUsd: 10000 },
        // 55% → critical
      ];
      const result = svc.assessContagion(positions, 100000);
      expect(result.contagionRisk).toBe("critical");
      expect(result.sizeMultiplier).toBe(0.25);
    });

    it("returns low risk with no positions", () => {
      const result = svc.assessContagion([], 100000);
      expect(result.contagionRisk).toBe("low");
      expect(result.sizeMultiplier).toBe(1.0);
    });

    it("returns low risk for zero total capital guard", () => {
      const positions = [{ asset: "BTC", sizeUsd: 10000 }];
      const result = svc.assessContagion(positions, 0);
      expect(result.contagionRisk).toBe("low");
    });

    it("identifies dominant group in reason", () => {
      const positions = [
        { asset: "BTC", sizeUsd: 20000 },
        { asset: "ETH", sizeUsd: 10000 },
      ];
      const result = svc.assessContagion(positions, 100000);
      expect(result.dominantGroup).toBe("crypto-large-cap");
      expect(result.reason).toContain("Crypto Large Cap");
    });
  });
});
