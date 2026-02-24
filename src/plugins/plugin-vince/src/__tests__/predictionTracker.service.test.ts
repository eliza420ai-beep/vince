import { describe, it, expect } from "vitest";
import { PredictionTrackerService } from "../services/predictionTracker.service";
import { createMockRuntime } from "./test-utils";

describe("PredictionTrackerService", () => {
  it("registers and manually resolves prediction with brier score", async () => {
    const runtime = createMockRuntime();
    const svc = await PredictionTrackerService.start(runtime);
    const id = await svc.registerPrediction({
      agent: "VINCE",
      kind: "trade",
      direction: "long",
      confidenceProb: 0.8,
      horizonHours: 24,
      asset: "BTC",
      metadata: { entryPrice: 100000 },
    });
    const ok = await svc.resolvePrediction(id, 1, "test");
    expect(ok).toBe(true);
    const byAgent = svc.getBrierByAgent(30);
    expect(byAgent.length).toBeGreaterThan(0);
    expect(byAgent[0].agent).toBe("VINCE");
    expect(byAgent[0].meanBrier).toBeGreaterThanOrEqual(0);
  });

  it("resolves due trade prediction from market context", async () => {
    const runtime = createMockRuntime({
      services: {
        VINCE_MARKET_DATA_SERVICE: {
          getEnrichedContext: async () => ({ currentPrice: 110000 }),
        },
      },
    });
    const svc = await PredictionTrackerService.start(runtime);
    const before = svc.getOpenPredictions().length;
    await svc.registerPrediction({
      agent: "VINCE",
      kind: "trade",
      direction: "long",
      confidenceProb: 0.65,
      horizonHours: 1,
      asset: "BTC",
      metadata: { entryPrice: 100000 },
    });

    // Force due now by mutating internal record in test only.
    const open = svc.getOpenPredictions();
    expect(open.length).toBeGreaterThan(before);
    (open[open.length - 1] as any).dueAt = Date.now() - 1000;
    const summary = await svc.resolveDuePredictions();
    expect(summary.resolved).toBeGreaterThanOrEqual(1);
    expect(summary.correct + summary.incorrect).toBe(summary.resolved);
  });
});
