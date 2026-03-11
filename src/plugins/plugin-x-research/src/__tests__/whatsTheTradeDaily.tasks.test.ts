import { describe, expect, it } from "vitest";
import {
  buildWttReportMarkdown,
  computeWttPickConfidence,
  buildPolymarketContextBlock,
  derivePolymarketQuery,
  extractPickFromNarrativeFallback,
} from "../tasks/whatsTheTradeDaily.tasks";
import { parseAndValidateWttPick } from "../../../../shared/wttContract";

describe("buildWttReportMarkdown", () => {
  it("renders structured pick fields from the canonical pick object", () => {
    const md = buildWttReportMarkdown({
      dateLabel: "Tuesday, Feb 24",
      thesis: "fallback thesis",
      narrative: "Narrative body.",
      pick: {
        date: "2026-02-24",
        thesis: "PLTR outperforms NVDA this week.",
        primaryTicker: "PLTR",
        primaryDirection: "long",
        primaryInstrument: "perp",
        primaryEntryPrice: 65,
        primaryRiskUsd: 650,
        invalidateCondition: "below $58",
        rubric: {
          alignment: "direct",
          edge: "emerging",
          payoffShape: "high",
          timingForgiveness: "forgiving",
        },
        killConditions: ["defense budget cuts"],
        evThresholdPct: 15,
      },
    });

    expect(md).toContain("PLTR outperforms NVDA this week.");
    expect(md).toContain("### Structured Pick");
    expect(md).toContain("PLTR · perp · LONG");
    expect(md).toContain("$65 · risk $650");
    expect(md).toContain("invalidates if: below $58");
    expect(md).toContain("+EV above 15%");
  });

  it("renders no-pick fallback text when structured pick is absent", () => {
    const md = buildWttReportMarkdown({
      dateLabel: "Tuesday, Feb 24",
      thesis: "fallback thesis",
      narrative: "Narrative body.",
      pick: null,
    });
    expect(md).toContain("No valid structured pick extracted today.");
    expect(md).toContain("fallback thesis");
  });
});

describe("computeWttPickConfidence", () => {
  const basePick = {
    date: "2026-03-04",
    thesis: "Test thesis",
    primaryTicker: "BTC",
    primaryDirection: "long" as const,
    primaryInstrument: "perp",
    primaryEntryPrice: 0,
    primaryRiskUsd: 0,
    invalidateCondition: "below support",
    rubric: {
      alignment: "direct" as const,
      edge: "emerging" as const,
      payoffShape: "high" as const,
      timingForgiveness: "forgiving" as const,
    },
    killConditions: ["thesis invalid"],
    evThresholdPct: 15,
  };

  it("scores high-quality picks above neutral baseline", () => {
    const score = computeWttPickConfidence(basePick);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(85);
  });

  it("applies repetition penalty for crowded recent ticker reuse", () => {
    const noPenalty = computeWttPickConfidence(basePick, 0);
    const withPenalty = computeWttPickConfidence(basePick, 4);
    expect(withPenalty).toBeLessThan(noPenalty);
    expect(withPenalty).toBeGreaterThanOrEqual(35);
  });
});

describe("derivePolymarketQuery", () => {
  it("prioritizes thesis ticker first", () => {
    const q = derivePolymarketQuery({
      thesis: "Long NVDA as AI capex surprises",
      newsContext: "SEC comments on crypto ETFs",
      xNarrative: "BTC crowded long",
    });
    expect(q).toBe("nvda");
  });

  it("falls back to news/x/default ordering", () => {
    expect(
      derivePolymarketQuery({
        newsContext: "OpenAI lands major enterprise deal",
      }),
    ).toBe("openai");

    expect(
      derivePolymarketQuery({
        xNarrative: "SOL momentum strengthens while majors stall",
      }),
    ).toBe("sol");

    expect(derivePolymarketQuery({})).toBe("crypto bitcoin");
  });

  it("skips generic stopwords and prioritizes better entities", () => {
    const q = derivePolymarketQuery({
      thesis:
        "This trade week thesis says market momentum rotates with fed cuts pricing",
    });
    expect(q).toBe("fed");
  });
});

describe("buildPolymarketContextBlock", () => {
  it("returns empty for low-information or malformed context", () => {
    expect(buildPolymarketContextBlock(null)).toBe("");
    expect(buildPolymarketContextBlock("")).toBe("");
    expect(buildPolymarketContextBlock("just text")).toBe("");
    expect(buildPolymarketContextBlock("Prediction markets:")).toBe("");
  });

  it("returns formatted block for valid context", () => {
    const block = buildPolymarketContextBlock(
      "Prediction markets: Will BTC hit 100k? — Yes 61%. Will ETH outperform BTC? — Yes 54%",
    );
    expect(block).toContain("Prediction markets:");
    expect(block).toContain("Use if relevant to your thesis");
  });
});

describe("WTT fallback safety", () => {
  it("fails closed when direction/evidence are weak", () => {
    const pick = extractPickFromNarrativeFallback(
      "Interesting setup, maybe range trading for now.",
      "Market sentiment is mixed.",
      "2026-03-04",
    );
    expect(pick).toBeNull();
  });

  it("accepts fallback when evidence is explicit and tradeable", () => {
    const pick = extractPickFromNarrativeFallback(
      "xyz: SOL-PERP perp LONG\n$150 entry, invalidates below $138",
      "SOL outperforms ETH on relative strength divergence.",
      "2026-03-04",
    );
    expect(pick).not.toBeNull();
    expect(pick?.primaryTicker).toBe("SOL");
    expect(pick?.primaryDirection).toBe("long");
  });
});

describe("WTT schema contract", () => {
  it("accepts valid schemaVersion payloads", () => {
    const parsed = parseAndValidateWttPick(
      JSON.stringify({
        schemaVersion: 2,
        date: "2026-03-04",
        thesis: "SOL outperforms ETH this week.",
        primaryTicker: "SOL",
        primaryDirection: "long",
        primaryInstrument: "perp",
        primaryEntryPrice: 150,
        primaryRiskUsd: 500,
        invalidateCondition: "below $138",
        killConditions: ["thesis invalidation"],
        rubric: {
          alignment: "direct",
          edge: "emerging",
          payoffShape: "high",
          timingForgiveness: "forgiving",
        },
      }),
    );
    expect(parsed.ok).toBe(true);
  });

  it("rejects invalid schemaVersion payloads", () => {
    const parsed = parseAndValidateWttPick(
      JSON.stringify({
        schemaVersion: 0,
        date: "2026-03-04",
        thesis: "SOL outperforms ETH this week.",
        primaryTicker: "SOL",
        primaryDirection: "long",
        primaryInstrument: "perp",
        primaryEntryPrice: 150,
        primaryRiskUsd: 500,
        invalidateCondition: "below $138",
        killConditions: ["thesis invalidation"],
        rubric: {
          alignment: "direct",
          edge: "emerging",
          payoffShape: "high",
          timingForgiveness: "forgiving",
        },
      }),
    );
    expect(parsed.ok).toBe(false);
  });
});
