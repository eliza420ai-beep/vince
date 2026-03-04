import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceXSourceAttributionService } from "../services/vinceXSourceAttribution.service";

function mkTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vince-proof-"));
}

function gateStackForStage(stage: string) {
  if (stage === "baseline_rule_based") {
    return {
      ruleBased: true,
      onnxEnabled: false,
      swarmEnabled: false,
      adversaryEnabled: false,
    };
  }
  if (stage === "onnx_enabled") {
    return {
      ruleBased: true,
      onnxEnabled: true,
      swarmEnabled: false,
      adversaryEnabled: false,
    };
  }
  if (stage === "onnx_plus_swarm") {
    return {
      ruleBased: true,
      onnxEnabled: true,
      swarmEnabled: true,
      adversaryEnabled: false,
    };
  }
  return {
    ruleBased: true,
    onnxEnabled: true,
    swarmEnabled: true,
    adversaryEnabled: true,
  };
}

function seedStageOutcomes(
  svc: VinceXSourceAttributionService,
  stage: string,
  count: number,
  wins: number,
  seed: string,
) {
  for (let idx = 0; idx < count; idx++) {
    const tradeId = `${seed}-${stage}-${idx}`;
    svc.recordOpen(tradeId, "BTC", "long", ["XSentiment"], 60, {
      regime: idx % 2 === 0 ? "trending" : "volatile",
      gateStack: gateStackForStage(stage),
      sourceLineage: ["x_research"],
    });
    const isWin = idx < wins;
    svc.recordClose(tradeId, isWin ? 100 : -100, isWin ? "win" : "loss", {
      pnlPct: isWin ? 1 : -1,
      decisionImpact: isWin ? "better" : "worse",
    });
  }
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

  it("marks all stage pairs as insufficient_samples when arm depth is below threshold", () => {
    const dir = mkTempDir();
    const svc = new VinceXSourceAttributionService(dir);
    const stages = [
      "baseline_rule_based",
      "onnx_enabled",
      "onnx_plus_swarm",
      "onnx_plus_swarm_plus_adversary",
    ];
    for (const stage of stages) {
      seedStageOutcomes(svc, stage, 4, 2, "insufficient");
    }

    const causal = svc.getCausalUpliftSnapshot({
      windowDays: 30,
      minimumEffect: 0.02,
      minimumSamplesPerArm: 12,
    });
    const labels = causal.pairs.map((pair) => pair.label).sort();
    expect(labels).toEqual(
      ["onnx_vs_swarm", "rule_vs_onnx", "swarm_vs_adversary"].sort(),
    );
    expect(causal.pairs.every((pair) => pair.passed === false)).toBe(true);
    expect(
      causal.pairs.every(
        (pair) => pair.failureReason === "insufficient_samples",
      ),
    ).toBe(true);
    expect(causal.promotionEligible).toBe(false);
  });

  it("marks all stage pairs as effect_below_threshold when depth is enough but uplift is weak", () => {
    const dir = mkTempDir();
    const svc = new VinceXSourceAttributionService(dir);
    const stages = [
      "baseline_rule_based",
      "onnx_enabled",
      "onnx_plus_swarm",
      "onnx_plus_swarm_plus_adversary",
    ];
    for (const stage of stages) {
      // Equal win profile per stage ensures weak causal delta despite adequate depth.
      seedStageOutcomes(svc, stage, 16, 8, "weak-effect");
    }

    const causal = svc.getCausalUpliftSnapshot({
      windowDays: 30,
      minimumEffect: 0.02,
      minimumSamplesPerArm: 12,
    });
    expect(causal.pairs.every((pair) => pair.controlCount >= 12)).toBe(true);
    expect(causal.pairs.every((pair) => pair.treatmentCount >= 12)).toBe(true);
    expect(causal.pairs.every((pair) => pair.passed === false)).toBe(true);
    expect(
      causal.pairs.every(
        (pair) => pair.failureReason === "effect_below_threshold",
      ),
    ).toBe(true);
    expect(causal.promotionEligible).toBe(false);
  });

  it("returns stage-depth deficits for causal unblocking", () => {
    const dir = mkTempDir();
    const svc = new VinceXSourceAttributionService(dir);
    seedStageOutcomes(svc, "baseline_rule_based", 13, 7, "depth");
    seedStageOutcomes(svc, "onnx_enabled", 9, 5, "depth");
    seedStageOutcomes(svc, "onnx_plus_swarm", 7, 4, "depth");
    seedStageOutcomes(svc, "onnx_plus_swarm_plus_adversary", 3, 2, "depth");

    const summary = svc.getCausalStageDepthSummary(30, 12);
    const baseline = summary.perStage.find(
      (row) => row.stage === "baseline_rule_based",
    );
    const adversary = summary.perStage.find(
      (row) => row.stage === "onnx_plus_swarm_plus_adversary",
    );
    const swarmVsAdversary = summary.pairDepth.find(
      (row) => row.label === "swarm_vs_adversary",
    );

    expect(summary.minimumSamplesPerArm).toBe(12);
    expect(summary.allStagesReady).toBe(false);
    expect(baseline?.deficitToMin).toBe(0);
    expect(adversary?.deficitToMin).toBe(9);
    expect(swarmVsAdversary?.deficitToMin).toBe(9);
  });
});
