import { describe, it, expect } from "vitest";
import { runSwarmReplay } from "../bench/swarmReplay";
import type { FeatureRecord } from "../services/vinceFeatureStore.service";

function makeRecord(
  pnlPct: number,
  sentiment: "bullish" | "bearish" | "neutral" = "bullish",
): FeatureRecord {
  return {
    market: {
      asset: "BTC",
      exchange: "test",
      quoteCurrency: "USD",
    } as any,
    session: {} as any,
    signal: {
      asset: "BTC",
      direction: pnlPct >= 0 ? "long" : "short",
      strength: 80,
      confidence: 80,
      factors: [],
      sources: ["signal_aggregator"],
      confirmingCount: 2,
    } as any,
    regime: {} as any,
    news: {
      assetSentimentDirection: sentiment,
      sentimentDirection: sentiment,
      sentimentScore: sentiment === "neutral" ? 0 : 80,
      macroRiskEnvironment: "risk_on",
    } as any,
    outcome: {
      realizedPnlPct: pnlPct,
    } as any,
  };
}

describe("swarmReplay", () => {
  it("computes metrics for baseline, limited, and full modes", () => {
    const records: FeatureRecord[] = [
      makeRecord(1.0, "bullish"),
      makeRecord(-0.5, "bearish"),
      makeRecord(0.2, "neutral"),
    ];

    const result = runSwarmReplay(records, { consensusThreshold: 0.5 });

    expect(result.baseline.trades).toBeGreaterThan(0);
    expect(result.limited.trades).toBeGreaterThanOrEqual(0);
    expect(result.full.trades).toBeGreaterThanOrEqual(0);

    expect(result.baseline.winRate).toBeGreaterThanOrEqual(0);
    expect(result.baseline.maxDrawdownPct).toBeGreaterThanOrEqual(0);
  });

  it("respects consensus threshold when gating trades", () => {
    const records: FeatureRecord[] = [
      makeRecord(1.0, "bullish"),
      makeRecord(1.0, "bullish"),
    ];

    const loose = runSwarmReplay(records, { consensusThreshold: 0.3 });
    const strict = runSwarmReplay(records, { consensusThreshold: 0.9 });

    expect(loose.limited.trades).toBeGreaterThanOrEqual(strict.limited.trades);
  });
});
