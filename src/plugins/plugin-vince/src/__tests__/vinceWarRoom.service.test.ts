import { describe, it, expect } from "vitest";
import { VinceWarRoomService } from "../services/vinceWarRoom.service";
import { createMockRuntime } from "./test-utils";

describe("VinceWarRoomService", () => {
  it("computes tail metrics from eligible returns", async () => {
    const runtime = createMockRuntime();
    const svc = await VinceWarRoomService.start(runtime);
    const history = [
      { strength: 70, confidence: 70, sourceCount: 3, pnlPct: 2.0 },
      { strength: 72, confidence: 68, sourceCount: 3, pnlPct: -1.5 },
      { strength: 75, confidence: 74, sourceCount: 4, pnlPct: 1.2 },
      { strength: 80, confidence: 79, sourceCount: 4, pnlPct: -0.8 },
    ];
    const tail = svc.simulateTail(
      { minStrength: 60, minConfidence: 60, minConfirmingSources: 3 },
      history,
      200,
    );
    expect(tail.sampleSize).toBe(4);
    expect(tail.runs).toBe(200);
    expect(tail.p01).toBeLessThanOrEqual(tail.p05);
    expect(tail.p05).toBeLessThanOrEqual(tail.median);
  });

  it("fails comparison when candidate has worse p05", async () => {
    const runtime = createMockRuntime();
    const svc = await VinceWarRoomService.start(runtime);
    const history = [
      { strength: 80, confidence: 78, sourceCount: 4, pnlPct: 1.5 },
      { strength: 78, confidence: 76, sourceCount: 4, pnlPct: 1.2 },
      { strength: 74, confidence: 72, sourceCount: 3, pnlPct: -3.5 },
      { strength: 70, confidence: 69, sourceCount: 3, pnlPct: -2.8 },
      { strength: 65, confidence: 62, sourceCount: 2, pnlPct: -1.1 },
    ];
    const comparison = svc.compareIncumbentVsCandidate(
      { minStrength: 78, minConfidence: 75, minConfirmingSources: 3 },
      { minStrength: 60, minConfidence: 60, minConfirmingSources: 2 },
      history,
      300,
    );
    expect(comparison.pass).toBe(false);
    expect(comparison.candidateP05).toBeLessThan(comparison.incumbentP05);
  });
});
