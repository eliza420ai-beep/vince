import { describe, expect, it } from "vitest";
import { VinceNarrativeRadarService } from "../services/vinceNarrativeRadar.service";
import { VinceTemporalCoherenceService } from "../services/vinceTemporalCoherence.service";
import { createMockRuntime } from "./test-utils";

describe("Narrative + Temporal services", () => {
  it("classifies peak narrative and blocks long", async () => {
    const runtime = createMockRuntime();
    const svc = await VinceNarrativeRadarService.start(runtime);
    const result = svc.classify({
      direction: "long",
      sentimentScore: 9,
      fearGreedValue: 88,
      fundingRate: 0.04,
      openInterestChangePct: 12,
    });
    expect(result.phase).toBe("peak");
    expect(result.block).toBe(true);
  });

  it("returns low alignment block in volatile weak setup", async () => {
    const runtime = createMockRuntime();
    const svc = await VinceTemporalCoherenceService.start(runtime);
    const result = svc.evaluate({
      direction: "long",
      strength: 30,
      confidence: 35,
      regime: "volatile",
    });
    expect(result.alignmentScore).toBe(0);
    expect(result.block).toBe(true);
  });
});
