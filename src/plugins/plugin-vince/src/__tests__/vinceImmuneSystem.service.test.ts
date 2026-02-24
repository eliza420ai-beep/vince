import { describe, expect, it } from "vitest";
import { VinceImmuneSystemService } from "../services/vinceImmuneSystem.service";
import { createMockRuntime } from "./test-utils";

describe("VinceImmuneSystemService", () => {
  it("matches crowded long liquidity sweep pattern", async () => {
    const runtime = createMockRuntime();
    const svc = await VinceImmuneSystemService.start(runtime);
    const result = svc.detectAttackPattern({
      longShortRatio: 1.9,
      fundingRate: 0.03,
      openInterestChangePct: 10,
      fearGreedValue: 82,
    });
    expect(result.matched).toBe(true);
    expect(result.patternId).toBe("crowded-long-liquidity-sweep");
    expect(result.block).toBe(true);
  });
});
