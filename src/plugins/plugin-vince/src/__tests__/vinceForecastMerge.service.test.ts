/**
 * Tests for VinceForecastMergeService.
 * PRD: One Dream Phase 12 — Task #76
 */

import { describe, it, expect } from "vitest";
import {
  VinceForecastMergeService,
  type AvoidedTrade,
} from "../services/vinceForecastMerge.service";

const service = new VinceForecastMergeService();

// ─────────────────────────────────────────────────────────────────────────────

describe("computeCounterfactualSignal", () => {
  it("returns 0 for empty avoided trades", () => {
    const signal = service.computeCounterfactualSignal("BTC", []);
    expect(signal).toBe(0);
  });

  it("returns 0 for avoided trades for a different asset", () => {
    const trades: AvoidedTrade[] = [
      { asset: "ETH", direction: "long", priceDeltaPct: 10 },
    ];
    const signal = service.computeCounterfactualSignal("BTC", trades);
    expect(signal).toBe(0);
  });

  it("returns negative signal when we avoided a long and price went up (missed winner)", () => {
    const trades: AvoidedTrade[] = [
      { asset: "BTC", direction: "long", priceDeltaPct: 10 }, // price went up, we missed
    ];
    const signal = service.computeCounterfactualSignal("BTC", trades);
    expect(signal).toBeLessThan(0);
  });

  it("returns positive signal when we avoided a long and price went down (right to avoid)", () => {
    const trades: AvoidedTrade[] = [
      { asset: "BTC", direction: "long", priceDeltaPct: -8 }, // price went down, we were right
    ];
    const signal = service.computeCounterfactualSignal("BTC", trades);
    expect(signal).toBeGreaterThan(0);
  });

  it("returns a value clamped to [-1, 1]", () => {
    const trades: AvoidedTrade[] = [
      { asset: "BTC", direction: "long", priceDeltaPct: -100 },
      { asset: "BTC", direction: "long", priceDeltaPct: -100 },
    ];
    const signal = service.computeCounterfactualSignal("BTC", trades);
    expect(signal).toBeGreaterThanOrEqual(-1);
    expect(signal).toBeLessThanOrEqual(1);
  });
});

describe("computeForecastSignal", () => {
  it("returns +0.7 for inception + low transition risk", () => {
    const signal = service.computeForecastSignal("BTC", "inception", 0.3);
    expect(signal).toBe(0.7);
  });

  it("returns +0.9 for growth + low transition risk", () => {
    const signal = service.computeForecastSignal("BTC", "growth", 0.2);
    expect(signal).toBe(0.9);
  });

  it("returns -0.7 for peak + high transition risk", () => {
    const signal = service.computeForecastSignal("BTC", "peak", 0.8);
    expect(signal).toBe(-0.7);
  });

  it("returns -0.9 for decline regardless of transition risk", () => {
    expect(service.computeForecastSignal("BTC", "decline", 0.1)).toBe(-0.9);
    expect(service.computeForecastSignal("BTC", "decline", 0.9)).toBe(-0.9);
  });

  it("returns 0 for unknown phase", () => {
    const signal = service.computeForecastSignal("BTC", "unknown", 0.5);
    expect(signal).toBe(0);
  });

  it("returns 0 for growth with high transition risk (not low)", () => {
    const signal = service.computeForecastSignal("BTC", "growth", 0.7);
    // growth + high risk doesn't match any rule → 0
    expect(signal).toBe(0);
  });
});

describe("merge — strong-long", () => {
  it("produces strong-long conviction for growth phase + low risk", () => {
    const result = service.merge("BTC", [], "growth", 0.2);
    expect(result.conviction).toBe("strong-long");
    expect(result.mergedConviction).toBeGreaterThan(0.5);
    expect(result.forecastSignal).toBe(0.9);
    expect(result.counterfactualSignal).toBe(0);
    expect(result.asset).toBe("BTC");
    expect(result.rationale).toContain("merged=");
  });
});

describe("merge — neutral", () => {
  it("produces neutral conviction when no signal", () => {
    const result = service.merge("BTC", [], "unknown", 0.5);
    expect(result.conviction).toBe("neutral");
    expect(result.mergedConviction).toBe(0);
  });
});

describe("merge — strong-short", () => {
  it("produces strong-short conviction for decline phase", () => {
    const result = service.merge("ETH", [], "decline", 0.9);
    expect(result.conviction).toBe("strong-short");
    expect(result.mergedConviction).toBeLessThan(-0.5);
  });
});

describe("merge — lean-long", () => {
  it("produces lean-long for inception + low risk", () => {
    const result = service.merge("ETH", [], "inception", 0.3);
    // forecast=0.7*0.6=0.42 → lean-long
    expect(result.conviction).toBe("lean-long");
  });
});
