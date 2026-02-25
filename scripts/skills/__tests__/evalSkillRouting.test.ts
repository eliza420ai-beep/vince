/**
 * Tests for eval-skill-routing.ts
 * Verifies that skill routing accuracy meets the 75% threshold for the standard test cases.
 */

import { describe, it, expect } from "vitest";
import { getSkillRoutingHint } from "../../../src/plugins/plugin-inter-agent/src/skillRouting";
import { TEST_CASES, runEval, hintMatchesExpected } from "../eval-skill-routing";

describe("hintMatchesExpected", () => {
  it("returns true when hint is null and expected is null", () => {
    expect(hintMatchesExpected(null, null)).toBe(true);
  });

  it("returns false when hint is null but expected is a skill", () => {
    expect(hintMatchesExpected(null, "x-research")).toBe(false);
  });

  it("returns false when hint is set but expected is null", () => {
    expect(hintMatchesExpected("Route to Echo", null)).toBe(false);
  });

  it("returns true when hint contains the expected skill keyword", () => {
    expect(hintMatchesExpected("Route to Echo (x-research skill)", "x-research")).toBe(true);
    expect(hintMatchesExpected("Route to Otaku (trading-agent)", "trading-agent")).toBe(true);
    expect(hintMatchesExpected("Sentinel has the skill registry.json", "registry")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(hintMatchesExpected("X-RESEARCH skill route", "x-research")).toBe(true);
  });
});

describe("runEval — standard test cases", () => {
  it("achieves at least 75% accuracy on the standard test cases", () => {
    const results = runEval(TEST_CASES);
    const total = results.length;
    const correct = results.filter((r) => r.correct).length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    // Report failures for easier debugging
    const failed = results.filter((r) => !r.correct);
    if (failed.length > 0) {
      console.warn(
        "Failed cases:",
        failed.map((r) => ({
          message: r.message,
          expected: r.expectedSkill,
          got: r.hint,
        })),
      );
    }

    expect(accuracy).toBeGreaterThanOrEqual(75);
  });

  it("correctly routes x-research messages to Echo", () => {
    const xResearchCases = TEST_CASES.filter(
      (tc) => tc.expectedSkill === "x-research",
    );
    for (const tc of xResearchCases) {
      const hint = getSkillRoutingHint(tc.message);
      expect(hint, `Message: "${tc.message}"`).not.toBeNull();
      expect(hint!.toLowerCase()).toContain("x-research");
    }
  });

  it("correctly routes trading-agent messages to Otaku", () => {
    const tradingCases = TEST_CASES.filter(
      (tc) => tc.expectedSkill === "trading-agent",
    );
    for (const tc of tradingCases) {
      const hint = getSkillRoutingHint(tc.message);
      expect(hint, `Message: "${tc.message}"`).not.toBeNull();
      expect(hint!.toLowerCase()).toContain("trading-agent");
    }
  });

  it("correctly routes registry messages to Sentinel", () => {
    const registryCases = TEST_CASES.filter(
      (tc) => tc.expectedSkill === "registry",
    );
    for (const tc of registryCases) {
      const hint = getSkillRoutingHint(tc.message);
      expect(hint, `Message: "${tc.message}"`).not.toBeNull();
      expect(hint!.toLowerCase()).toContain("registry");
    }
  });

  it("returns null for unrelated messages", () => {
    const nullCases = TEST_CASES.filter((tc) => tc.expectedSkill === null);
    for (const tc of nullCases) {
      const hint = getSkillRoutingHint(tc.message);
      expect(hint, `Message: "${tc.message}" should return null`).toBeNull();
    }
  });
});

describe("individual routing cases", () => {
  it("routes 'search x for BTC bullish accounts' → x-research", () => {
    const hint = getSkillRoutingHint("search x for BTC bullish accounts");
    expect(hint).not.toBeNull();
    expect(hint!.toLowerCase()).toContain("x-research");
  });

  it("routes 'run x research on SOL narrative' → x-research", () => {
    const hint = getSkillRoutingHint("run x research on SOL narrative");
    expect(hint).not.toBeNull();
    expect(hint!.toLowerCase()).toContain("x-research");
  });

  it("routes 'what's the trading agent EVClaw setup' → trading-agent", () => {
    const hint = getSkillRoutingHint("what's the trading agent EVClaw setup");
    expect(hint).not.toBeNull();
    expect(hint!.toLowerCase()).toContain("trading-agent");
  });

  it("routes 'hyperliquid live perps execution guide' → trading-agent", () => {
    const hint = getSkillRoutingHint("hyperliquid live perps execution guide");
    expect(hint).not.toBeNull();
    expect(hint!.toLowerCase()).toContain("trading-agent");
  });

  it("routes 'what skills are available' → registry", () => {
    const hint = getSkillRoutingHint("what skills are available");
    expect(hint).not.toBeNull();
    expect(hint!.toLowerCase()).toContain("registry");
  });

  it("routes 'show me available skills' → registry", () => {
    const hint = getSkillRoutingHint("show me available skills");
    expect(hint).not.toBeNull();
    expect(hint!.toLowerCase()).toContain("registry");
  });

  it("returns null for 'what's the weather'", () => {
    expect(getSkillRoutingHint("what's the weather")).toBeNull();
  });

  it("returns null for 'summarize this article'", () => {
    expect(getSkillRoutingHint("summarize this article")).toBeNull();
  });
});
