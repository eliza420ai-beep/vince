import { describe, it, expect } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";
import { buildRecursiveNorthStarResponse } from "../routes/dashboardRecursiveNorthStar";

function expectExactKeys(obj: Record<string, unknown>, expectedKeys: string[]) {
  expect(Object.keys(obj).sort()).toEqual([...expectedKeys].sort());
}

describe("buildRecursiveNorthStarResponse", () => {
  it("returns stable contract keys", async () => {
    const runtime = {
      getService: (id: string) => {
        if (id === "VINCE_DATA_SUFFICIENCY_SERVICE") {
          return {
            getSnapshot: () => ({ grade: "MEDIUM", sampleCount: 26 }),
            getBlockingTasks: () => [{ blocker: "regime_depth_below_5" }],
          };
        }
        if (id === "VINCE_PROOF_CAPITAL_ALLOCATOR_SERVICE") {
          return {
            getLatestSummary: () => ({
              mode: "recommendation",
              rolloutStage: "recommendation",
              reason: "validated_uplift_increase_risk",
            }),
          };
        }
        if (id === "VINCE_UPLIFT_EVALUATOR_SERVICE") {
          return {
            getSnapshot: () => ({
              byStage: [
                { stage: "onnx_enabled", avgPnl: 5, count: 20 },
                { stage: "onnx_plus_swarm", avgPnl: 8, count: 22 },
              ],
            }),
            getCausalSnapshot: () => ({
              promotionEligible: true,
              pairs: [
                {
                  controlCount: 18,
                  treatmentCount: 20,
                  confidenceScore: 72,
                },
              ],
            }),
          };
        }
        if (id === "VINCE_ML_INFERENCE_SERVICE") {
          return {
            ensureModelsLoaded: async () => {},
            getMLStatus: () => ({
              modelsLoaded: ["signalQuality", "positionSizing", "tpOptimizer"],
              signalQualityThreshold: 0.58,
              tpLevelIndices: [0, 1, 2],
              tpLevelSkipped: null,
              suggestedMinStrength: 54,
              suggestedMinConfidence: 51,
            }),
          };
        }
        if (id === "VINCE_FEATURE_STORE_SERVICE") {
          return {
            getCompleteRecordCount: async () => 42,
            getAvoidedRecordCount: async () => 17,
          };
        }
        if (id === "VINCE_WEIGHT_BANDIT_SERVICE") {
          return {
            getBanditStatus: () => ({
              isReady: true,
              totalTradesProcessed: 128,
            }),
          };
        }
        return null;
      },
    } as unknown as IAgentRuntime;

    const payload = await buildRecursiveNorthStarResponse(runtime);

    expectExactKeys(payload as unknown as Record<string, unknown>, [
      "scorecard",
      "pillars",
      "metrics",
      "northStar",
      "trend",
      "lastUpdated",
    ]);
    expectExactKeys(payload.scorecard as unknown as Record<string, unknown>, [
      "overallScore",
      "status",
    ]);
    expectExactKeys(payload.pillars as unknown as Record<string, unknown>, [
      "recursion",
      "ml",
      "synergy",
    ]);
    expectExactKeys(payload.northStar as unknown as Record<string, unknown>, [
      "fullRecursionReady",
      "onePlusOneEqThreeReady",
      "why",
    ]);
    expect(payload.metrics.synergy.upliftDelta).toBe(3);
    expect(payload.metrics.ml.modelCount).toBe(3);
    expect(payload.trend?.windows?.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(payload.trend?.history)).toBe(true);
    expect(payload.scorecard.status).toMatch(/on_track|at_risk|blocked/);
  });

  it("surfaces blocker-first output when data is insufficient", async () => {
    const runtime = {
      getService: () => null,
    } as unknown as IAgentRuntime;

    const payload = await buildRecursiveNorthStarResponse(runtime);

    expect(payload.scorecard.status).toBe("blocked");
    expect(payload.pillars.ml.blockers).toContain("no_models_loaded");
    expect(payload.pillars.synergy.blockers).toContain(
      "swarm_not_beating_single_agent",
    );
    expect(payload.northStar.fullRecursionReady).toBe(false);
    expect(payload.northStar.onePlusOneEqThreeReady).toBe(false);
  });
});
