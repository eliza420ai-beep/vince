import { describe, expect, it } from "vitest";
import { buildWttReportMarkdown } from "../tasks/whatsTheTradeDaily.tasks";

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
