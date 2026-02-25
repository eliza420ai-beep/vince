/**
 * VinceNarrativeDecayService Tests (#68)
 */

import { describe, it, expect } from "vitest";
import { VinceNarrativeDecayService } from "../services/vinceNarrativeDecay.service";

const svc = new VinceNarrativeDecayService();

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

describe("VinceNarrativeDecayService", () => {
  describe("getDecayMultiplier", () => {
    it("returns ~1.0 for a brand-new inception narrative (0 hours elapsed)", () => {
      const multiplier = svc.getDecayMultiplier("inception", new Date().toISOString());
      expect(multiplier).toBeGreaterThan(0.99);
    });

    it("returns ~0.5 at half-life for inception (72 hours)", () => {
      const multiplier = svc.getDecayMultiplier("inception", hoursAgo(72));
      expect(multiplier).toBeCloseTo(0.5, 1);
    });

    it("returns ~0.5 at half-life for peak (24 hours)", () => {
      const multiplier = svc.getDecayMultiplier("peak", hoursAgo(24));
      expect(multiplier).toBeCloseTo(0.5, 1);
    });

    it("returns ~0.5 at half-life for growth (168 hours)", () => {
      const multiplier = svc.getDecayMultiplier("growth", hoursAgo(168));
      expect(multiplier).toBeCloseTo(0.5, 1);
    });

    it("returns < 0.2 for stale inception narrative (>240 hours)", () => {
      const multiplier = svc.getDecayMultiplier("inception", hoursAgo(300));
      expect(multiplier).toBeLessThan(0.2);
    });

    it("peak narrative decays faster than growth", () => {
      const peakMultiplier = svc.getDecayMultiplier("peak", hoursAgo(48));
      const growthMultiplier = svc.getDecayMultiplier("growth", hoursAgo(48));
      // peak half-life = 24h, growth half-life = 168h
      // at 48h: peak = 0.25, growth ≈ 0.82
      expect(peakMultiplier).toBeLessThan(growthMultiplier);
    });

    it("returns 1.0 for future dates (negative elapsed time)", () => {
      const future = new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();
      const multiplier = svc.getDecayMultiplier("inception", future);
      expect(multiplier).toBe(1);
    });

    it("returns 1.0 for invalid date string", () => {
      const multiplier = svc.getDecayMultiplier("inception", "not-a-date");
      expect(multiplier).toBe(1);
    });
  });

  describe("applyDecayToConfidence", () => {
    it("returns confidence * decay, not below 10% floor", () => {
      const confidence = 80;
      // At 72h for inception, decay ≈ 0.5 → 80 * 0.5 = 40
      const result = svc.applyDecayToConfidence(confidence, "inception", hoursAgo(72));
      expect(result).toBeCloseTo(40, 0);
    });

    it("floors at confidence * 0.1 for very stale narrative", () => {
      const confidence = 80;
      const floor = confidence * 0.1; // 8
      // 1000 hours ago → multiplier ≈ 0
      const result = svc.applyDecayToConfidence(confidence, "inception", hoursAgo(1000));
      expect(result).toBeGreaterThanOrEqual(floor);
      // Should be very close to floor
      expect(result).toBeLessThan(floor * 1.5);
    });

    it("returns close to full confidence for fresh narrative", () => {
      const confidence = 75;
      const result = svc.applyDecayToConfidence(confidence, "inception", new Date().toISOString());
      expect(result).toBeGreaterThan(confidence * 0.95);
    });
  });

  describe("isNarrativeStale", () => {
    it("returns false for fresh narrative", () => {
      expect(svc.isNarrativeStale("inception", new Date().toISOString())).toBe(false);
    });

    it("returns true for stale inception (>240 hours)", () => {
      // At 250 hours, decay = exp(-ln2 * 250 / 72) ≈ very small
      expect(svc.isNarrativeStale("inception", hoursAgo(250))).toBe(true);
    });

    it("returns true for stale peak (>80 hours)", () => {
      // peak half-life=24; at 80h, decay=exp(-ln2*80/24)≈0.1 < 0.2
      expect(svc.isNarrativeStale("peak", hoursAgo(80))).toBe(true);
    });

    it("returns false for growth narrative at 100 hours", () => {
      // growth half-life=168; at 100h, decay=exp(-ln2*100/168)≈0.66 > 0.2
      expect(svc.isNarrativeStale("growth", hoursAgo(100))).toBe(false);
    });

    it("uses custom stale threshold multiplier", () => {
      // At 100h for inception (half-life=72h):
      //   decay = exp(-ln2 * 100/72) ≈ 0.382
      //   0.382 < 0.6 → stale with threshold 0.6
      //   0.382 < 0.4 → stale with threshold 0.4
      //   0.382 > 0.3 → NOT stale with threshold 0.3
      expect(
        svc.isNarrativeStale("inception", hoursAgo(100), 0.6),
      ).toBe(true);
      expect(
        svc.isNarrativeStale("inception", hoursAgo(100), 0.3),
      ).toBe(false);
    });
  });
});
