import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceXSourceAttributionService } from "../services/vinceXSourceAttribution.service";

function mkTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vince-proof-"));
}

describe("VinceXSourceAttributionService phase14 snapshots", () => {
  it("builds uplift, sufficiency, and source quality snapshots", () => {
    const dir = mkTempDir();
    const svc = new VinceXSourceAttributionService(dir);

    svc.recordOpen("t1", "BTC", "long", ["BinanceTopTraders"], 72, {
      regime: "trending",
      gateStack: {
        ruleBased: true,
        onnxEnabled: false,
        swarmEnabled: false,
        adversaryEnabled: false,
      },
      sourceLineage: ["x_research"],
    });
    svc.recordClose("t1", 120, "win", {
      pnlPct: 1.2,
      decisionImpact: "better",
    });

    svc.recordOpen("t2", "ETH", "short", ["PolymarketSentiment"], 68, {
      regime: "volatile",
      gateStack: {
        ruleBased: true,
        onnxEnabled: true,
        swarmEnabled: true,
        adversaryEnabled: true,
      },
      sourceLineage: ["polymarket"],
    });
    svc.recordClose("t2", -90, "loss", {
      pnlPct: -0.9,
      decisionImpact: "worse",
    });

    const uplift = svc.getUpliftSnapshot(30);
    expect(uplift.totalClosed).toBe(2);
    expect(uplift.byStage.some((s) => s.stage === "baseline_rule_based")).toBe(
      true,
    );
    expect(
      uplift.byStage.some((s) => s.stage === "onnx_plus_swarm_plus_adversary"),
    ).toBe(true);

    const sufficiency = svc.getSufficiencySnapshot(30);
    expect(sufficiency.grade).toBe("LOW");
    expect(sufficiency.sampleCount).toBe(2);

    const sourceQuality = svc.getSourceQualitySnapshot(30);
    expect(sourceQuality.sources.length).toBeGreaterThan(0);
    expect(sourceQuality.sources[0]).toHaveProperty("lagPenalty");

    const causal = svc.getCausalUpliftSnapshot({
      windowDays: 30,
      minimumEffect: 0.01,
      minimumSamplesPerArm: 1,
    });
    expect(causal.pairs.length).toBeGreaterThan(0);

    const tasks = svc.getSufficiencyTasks(30);
    expect(Array.isArray(tasks)).toBe(true);
  });
});
