import { describe, expect, it } from "vitest";
import { parseAndValidateWttPick, validateWttPick } from "../utils/wttContract";

const VALID_WTT = {
  date: "2026-02-24",
  thesis:
    "PLTR outperforms NVDA this week as defense AI spending reprices faster than commercial AI margin compression.",
  primaryTicker: "PLTR",
  primaryDirection: "long",
  primaryInstrument: "perp",
  primaryEntryPrice: 65,
  primaryRiskUsd: 650,
  invalidateCondition: "below $58",
  killConditions: ["defense budget cuts", "PLTR < $58"],
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
} as const;

describe("wttContract.validateWttPick", () => {
  it("accepts a valid WTT payload", () => {
    const out = validateWttPick(VALID_WTT);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.primaryTicker).toBe("PLTR");
      expect(out.value.rubric.edge).toBe("emerging");
    }
  });

  it("returns machine-readable errors for invalid fields", () => {
    const out = validateWttPick({
      ...VALID_WTT,
      primaryDirection: "up_only",
      rubric: { ...VALID_WTT.rubric, edge: "alpha" },
      killConditions: ["", "still_valid"],
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      const fields = out.errors.map((e) => e.field);
      expect(fields).toContain("primaryDirection");
      expect(fields).toContain("rubric.edge");
      expect(fields).toContain("killConditions");
    }
  });
});

describe("wttContract.parseAndValidateWttPick", () => {
  it("rejects malformed JSON", () => {
    const out = parseAndValidateWttPick("{ this is not json");
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errors[0]?.field).toBe("$");
    }
  });

  it("parses and validates JSON strings", () => {
    const out = parseAndValidateWttPick(JSON.stringify(VALID_WTT));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.value.evThresholdPct).toBe(15);
    }
  });

  it("loads legacy payloads via fallback and marks migration", () => {
    const legacy = {
      primaryTicker: "BTC",
      primaryDirection: "long",
      primaryInstrument: "perp",
      primaryEntryPrice: 0,
      primaryRiskUsd: 0,
      invalidateCondition: "",
      rubric: {
        alignment: "direct",
        edge: "emerging",
        payoffShape: "high",
        timingForgiveness: "forgiving",
      },
      killConditions: [],
    };
    const out = parseAndValidateWttPick(JSON.stringify(legacy));
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.migratedFromLegacy).toBe(true);
      expect(out.value.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(out.value.thesis).toBe("Legacy WTT thesis unavailable");
      expect(out.value.invalidateCondition).toBe("n/a");
    }
  });
});
