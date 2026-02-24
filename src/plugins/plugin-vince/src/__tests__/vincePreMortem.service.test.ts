import { describe, it, expect } from "vitest";
import { VincePreMortemService } from "../services/vincePreMortem.service";
import { createMockRuntime } from "./test-utils";

describe("VincePreMortemService", () => {
  it("blocks when survival is below threshold", async () => {
    const runtime = createMockRuntime({
      settings: { vince_pre_mortem_threshold: 40 },
    });
    const svc = await VincePreMortemService.start(runtime);
    const result = svc.evaluate({
      asset: "BTC",
      direction: "long",
      strength: 42,
      confidence: 38,
      sentimentScore: 2,
      sentimentRegime: "risk-off",
      fundingRate: 0.04,
      openInterestChangePct: 10,
      dvol: 82,
    });
    expect(result.blocked).toBe(true);
    expect(result.survivalProbability).toBeLessThan(result.threshold);
    expect(result.scenarios.length).toBeGreaterThanOrEqual(3);
  });

  it("passes when risk context is favorable", async () => {
    const runtime = createMockRuntime({
      settings: { vince_pre_mortem_threshold: 30 },
    });
    const svc = await VincePreMortemService.start(runtime);
    const result = svc.evaluate({
      asset: "BTC",
      direction: "long",
      strength: 80,
      confidence: 78,
      sentimentScore: 7,
      sentimentRegime: "risk-on",
      fundingRate: 0.0,
      openInterestChangePct: 1.2,
      dvol: 52,
    });
    expect(result.blocked).toBe(false);
    expect(result.survivalProbability).toBeGreaterThanOrEqual(result.threshold);
  });
});
