import { describe, it, expect } from "vitest";
import type { AihfSecondOpinionPayload } from "../utils/aihfSecondOpinionGate";
import { getAihfSecondOpinionGateDecision } from "../utils/aihfSecondOpinionGate";

describe("aihfSecondOpinionGate", () => {
  const asset = "AMZN";

  it("caps confidence on contradiction (VINCE long, AIHF disagrees bearish)", () => {
    const payload: AihfSecondOpinionPayload = {
      agree_buckets: {},
      disagree_buckets: { bearish: [asset] },
    };

    const res = getAihfSecondOpinionGateDecision(payload, asset, "long");
    expect(res.apply).toBe(true);
    expect(res.confidenceCap).toBe(50);
    expect(res.factorText).toContain("disagreement");
  });

  it("boosts strength on agreement (VINCE long, AIHF agrees bullish)", () => {
    const payload: AihfSecondOpinionPayload = {
      agree_buckets: { bullish: [asset] },
      disagree_buckets: {},
    };

    const res = getAihfSecondOpinionGateDecision(payload, asset, "long");
    expect(res.apply).toBe(true);
    expect(res.strengthMultiplier).toBeGreaterThan(1);
    expect(res.factorText).toContain("agreement");
  });

  it("no-ops when payload missing", () => {
    const res = getAihfSecondOpinionGateDecision(null, asset, "long");
    expect(res.apply).toBe(false);
    expect(res.factorText).toBeNull();
    expect(res.confidenceCap).toBeUndefined();
    expect(res.strengthMultiplier).toBeUndefined();
  });
});
