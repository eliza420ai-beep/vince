import { describe, expect, it } from "vitest";
import type { Position } from "../types/paperTrading";
import {
  buildStructuredPostMortem,
  renderPostMortemMarkdown,
} from "../utils/postMortem";

const ALLOWED_CAUSES = new Set([
  "thesis_invalid",
  "regime_conflict",
  "sizing_too_aggressive",
  "stop_too_tight_for_vol",
  "agent_lane_mismatch",
  "missing_pretrade_data",
  "execution_or_slippage",
  "unknown_insufficient_evidence",
]);

function makePosition(
  overrides: Partial<Position> = {},
  metadata: Record<string, unknown> = {},
): Position {
  return {
    id: "pos-1",
    asset: "BTC",
    direction: "short",
    status: "closed",
    entryPrice: 100,
    sizeUsd: 1000,
    marginUsd: 100,
    leverage: 10,
    stopLossPrice: 101.5,
    takeProfitPrices: [98],
    liquidationPrice: 110,
    markPrice: 102,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    maxUnrealizedProfit: 0,
    maxUnrealizedLoss: 0,
    strategyName: "VinceSignalFollowing",
    triggerSignals: ["reason"],
    openedAt: Date.now() - 45 * 60 * 1000,
    closedAt: Date.now(),
    realizedPnl: -20,
    realizedPnlPct: -20,
    closeReason: "stop_loss",
    metadata,
    ...overrides,
  };
}

describe("postMortem utils", () => {
  it("produces a valid taxonomy classification", () => {
    const position = makePosition(
      {},
      {
        sentimentScore: 3,
        regime: "risk-on",
        entryATRPct: 2.1,
        ptqgMeta: {
          assetClass: "crypto",
          thesisClass: "momentum",
          entryTimestampUtc: new Date().toISOString(),
          expectedHoldWindow: "intraday",
          leverage: 10,
          stopDistancePct: 1.5,
          maxLossUsd: 15,
          maxLossPct: 15,
          catalystFlag: false,
          lowConfidenceMode: false,
          blocked: false,
        },
      },
    );
    const findings = [
      {
        agent: "Echo",
        lane: "CT sentiment + macro risk pulse",
        reply: "CT was crowded long. Confidence: 0.72",
        confidence: 0.72,
        sourceStamp: "x_sentiment_snapshot",
        missingData: [],
      },
      {
        agent: "Oracle",
        lane: "prediction market regime",
        reply: "Regime was risk-on. Confidence: 0.68",
        confidence: 0.68,
        sourceStamp: "polymarket_regime_snapshot",
        missingData: [],
      },
      {
        agent: "Solus",
        lane: "options mechanics and sizing",
        reply: "Sizing likely too aggressive for the setup. Confidence: 0.74",
        confidence: 0.74,
        sourceStamp: "options_mechanics_snapshot",
        missingData: [],
      },
    ] as any;

    const out = buildStructuredPostMortem(position, findings);
    expect(ALLOWED_CAUSES.has(out.primaryCause)).toBe(true);
    for (const c of out.secondaryCauses) {
      expect(ALLOWED_CAUSES.has(c)).toBe(true);
    }
  });

  it("escalates quality when evidence is incomplete", () => {
    const position = makePosition({}, {});
    const findings = [
      {
        agent: "Echo",
        lane: "CT sentiment + macro risk pulse",
        reply: "Need timestamp and context to evaluate.",
        confidence: 0.3,
        sourceStamp: "x_sentiment_snapshot",
        missingData: ["timestamp"],
      },
      {
        agent: "Oracle",
        lane: "prediction market regime",
        reply: "Need condition_id and market name.",
        confidence: 0.3,
        sourceStamp: "polymarket_regime_snapshot",
        missingData: ["condition_id", "market_name"],
      },
      {
        agent: "Solus",
        lane: "options mechanics and sizing",
        reply: "Outside my lane for this specific setup.",
        confidence: 0.25,
        sourceStamp: "options_mechanics_snapshot",
        missingData: ["lane_coverage_gap"],
      },
    ] as any;

    const out = buildStructuredPostMortem(position, findings);
    expect(out.quality.total).toBeGreaterThanOrEqual(0);
    expect(out.quality.total).toBeLessThanOrEqual(100);
    expect(out.quality.escalate).toBe(out.quality.total < 75);
    expect(out.evidence.missingData.length).toBeGreaterThan(0);
  });

  it("marks adaptation eligible for deterministic sizing + budget breach even with moderate confidence", () => {
    const position = makePosition(
      { realizedPnl: -120, realizedPnlPct: -15 },
      {
        sentimentScore: 5,
        regime: "uncertain",
        entryATRPct: 3,
        ptqgMeta: {
          assetClass: "equity",
          thesisClass: "momentum",
          entryTimestampUtc: new Date().toISOString(),
          expectedHoldWindow: "intraday",
          leverage: 10,
          stopDistancePct: 1.5,
          maxLossUsd: 114.26,
          maxLossPct: 15,
          catalystFlag: false,
          lowConfidenceMode: false,
          blocked: false,
        },
      },
    );
    const findings = [
      {
        agent: "Echo",
        lane: "CT sentiment + macro risk pulse",
        reply: "Crowded long into your short. Confidence: 0.4",
        confidence: 0.4,
        sourceStamp: "x_sentiment_snapshot",
        missingData: [],
      },
      {
        agent: "Oracle",
        lane: "prediction market regime",
        reply: "Odds were flat; no clear regime miss. Confidence: 0.4",
        confidence: 0.4,
        sourceStamp: "polymarket_regime_snapshot",
        missingData: [],
      },
      {
        agent: "Solus",
        lane: "options mechanics and sizing",
        reply: "10x with a 1.5% stop is sizing too aggressive. Confidence: 0.5",
        confidence: 0.5,
        sourceStamp: "options_mechanics_snapshot",
        missingData: [],
      },
    ] as any;

    const structured = buildStructuredPostMortem(position, findings);
    expect(structured.primaryCause).toBe("sizing_too_aggressive");
    expect(structured.riskBudget.budgetBreach).toBe(true);
    expect(structured.adaptationEligible).toBe(true);
    expect(structured.proposedPolicyDelta).toBeDefined();
  });

  it("renders required sections and machine-readable markers", () => {
    const position = makePosition({}, {});
    const findings = [
      {
        agent: "Echo",
        lane: "CT sentiment + macro risk pulse",
        reply: "Insufficient context. Confidence: 0.4",
        confidence: 0.4,
        sourceStamp: "x_sentiment_snapshot",
        missingData: ["timestamp"],
      },
      {
        agent: "Oracle",
        lane: "prediction market regime",
        reply: "No direct market context. Confidence: 0.35",
        confidence: 0.35,
        sourceStamp: "polymarket_regime_snapshot",
        missingData: ["condition_id"],
      },
      {
        agent: "Solus",
        lane: "options mechanics and sizing",
        reply: "Sizing likely over-aggressive. Confidence: 0.6",
        confidence: 0.6,
        sourceStamp: "options_mechanics_snapshot",
        missingData: [],
      },
    ] as any;
    const structured = buildStructuredPostMortem(position, findings);
    const md = renderPostMortemMarkdown(position, structured);

    expect(md).toContain("## Trade Snapshot");
    expect(md).toContain("## Evidence Pack");
    expect(md).toContain("## Agent Findings (structured)");
    expect(md).toContain("## Root-Cause Tags");
    expect(md).toContain("## Corrective Actions");
    expect(md).toContain("## Confidence and Data Gaps");
    expect(md).toContain("## What changes on next trade?");
    expect(md).toContain("## Recursive Policy Delta");
    expect(md).toContain("## Machine-Readable Summary");
    expect(md).toContain("PM_QUALITY_SCORE:");
    expect(md).toContain("PM_PRIMARY_CAUSE:");
    expect(md).toContain("PM_MISSING_DATA_COUNT:");
    expect(md).toContain("PM_BUDGET_BREACH:");
    expect(md).toContain("PM_ADAPTATION_ELIGIBLE:");
  });
});
