import { describe, expect, it } from "vitest";
import {
  getWttSizeMultiplierForBand,
  scoreWttPickQuality,
} from "../utils/wttQualityScore";
import type { WttPick } from "../utils/wttContract";

function makeBasePick(overrides: Partial<WttPick> = {}): WttPick {
  return {
    date: "2026-02-24",
    thesis:
      "PLTR outperforms NVDA this week as defense AI spend reprices faster than commercial AI margin compression.",
    primaryTicker: "PLTR",
    primaryDirection: "long",
    primaryInstrument: "perp",
    primaryEntryPrice: 65,
    primaryRiskUsd: 650,
    invalidateCondition: "PLTR < 58",
    killConditions: ["defense budget cuts", "PLTR < 58"],
    rubric: {
      alignment: "direct",
      edge: "emerging",
      payoffShape: "high",
      timingForgiveness: "forgiving",
    },
    altTicker: "NVDA",
    altDirection: "short",
    altInstrument: "perp",
    evThresholdPct: 15,
    ...overrides,
  };
}

describe("scoreWttPickQuality", () => {
  it("returns auto_eligible for a high-quality pick", () => {
    const out = scoreWttPickQuality(makeBasePick());
    expect(out.score).toBeGreaterThanOrEqual(80);
    expect(out.band).toBe("auto_eligible");
  });

  it("returns blocked for weak/missing risk and invalidation detail", () => {
    const out = scoreWttPickQuality(
      makeBasePick({
        thesis: "short idea",
        primaryEntryPrice: 0,
        primaryRiskUsd: 0,
        invalidateCondition: "dies if wrong",
        killConditions: [],
        altTicker: undefined,
        altDirection: undefined,
        evThresholdPct: undefined,
        rubric: {
          alignment: "tangential",
          edge: "crowded",
          payoffShape: "capped",
          timingForgiveness: "very_punishing",
        },
      }),
    );
    expect(out.score).toBeLessThan(65);
    expect(out.band).toBe("blocked");
    const codes = out.reasons.map((r) => r.code);
    expect(codes).toContain("WTT_Q_ENTRY_PRICE_MISSING");
    expect(codes).toContain("WTT_Q_INVALIDATE_NOT_SPECIFIC");
    expect(codes).toContain("WTT_Q_ALT_MISSING");
  });

  it("returns size_capped for middling quality", () => {
    const out = scoreWttPickQuality(
      makeBasePick({
        invalidateCondition: "below support",
        killConditions: [],
        evThresholdPct: undefined,
        rubric: {
          alignment: "exposed",
          edge: "consensus",
          payoffShape: "moderate",
          timingForgiveness: "punishing",
        },
        altDirection: "long",
      }),
    );
    expect(out.score).toBeGreaterThanOrEqual(65);
    expect(out.score).toBeLessThan(80);
    expect(out.band).toBe("size_capped");
  });
});

describe("getWttSizeMultiplierForBand", () => {
  it("returns 1 for auto_eligible and blocked, 0.5 for size_capped", () => {
    expect(getWttSizeMultiplierForBand("auto_eligible")).toBe(1);
    expect(getWttSizeMultiplierForBand("size_capped")).toBe(0.5);
    expect(getWttSizeMultiplierForBand("blocked")).toBe(1);
  });
});
