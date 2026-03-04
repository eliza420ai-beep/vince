import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceProofCapitalAllocatorService } from "../services/vinceProofCapitalAllocator.service";
import {
  VinceCapitalBucketsService,
  type CapitalBucket,
} from "../services/vinceCapitalBuckets.service";

function mkTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vince-allocator-"));
}

function mockRuntime(mode: string, grade: "LOW" | "MEDIUM" | "HIGH") {
  return {
    getSetting: (key: string) => {
      if (key === "VINCE_PROOF_ALLOCATOR_MODE") return mode;
      if (key === "VINCE_PROOF_MIN_SUFFICIENCY_GRADE") return "MEDIUM";
      return undefined;
    },
    getService: (id: string) => {
      if (id === "VINCE_UPLIFT_EVALUATOR_SERVICE") {
        return {
          getSnapshot: () => ({
            byStage: [
              { stage: "onnx_enabled", avgPnl: 10 },
              { stage: "onnx_plus_swarm", avgPnl: 30 },
            ],
          }),
          getCausalSnapshot: () => ({
            promotionEligible: true,
            pairs: [
              { confidenceScore: 80, passed: true, ciLower: 0.03, label: "a" },
            ],
          }),
        };
      }
      if (id === "VINCE_DATA_SUFFICIENCY_SERVICE") {
        return { getSnapshot: () => ({ grade }), getBlockingTasks: () => [] };
      }
      if (id === "VINCE_SOURCE_QUALITY_SERVICE") {
        return {
          getSnapshot: () => ({
            sources: [{ qualityScore: 80 }, { qualityScore: 75 }],
          }),
          applyRecommendations: async () => ({
            applied: 0,
            mode: "auto_apply",
          }),
        };
      }
      return null;
    },
  };
}

describe("VinceProofCapitalAllocatorService", () => {
  it("does not auto-apply in observe_only mode", async () => {
    const dataDir = mkTempDir();
    VinceCapitalBucketsService.setInstance(
      new VinceCapitalBucketsService(dataDir),
    );
    const svc = new VinceProofCapitalAllocatorService(
      mockRuntime("observe_only", "HIGH") as any,
    );
    const before = VinceCapitalBucketsService.getInstance().getBucket("paper");
    const summary = await svc.reconcile();
    const after = VinceCapitalBucketsService.getInstance().getBucket("paper");
    expect(summary.mode).toBe("observe_only");
    expect(summary.applied).toBe(false);
    expect(after.maxSingleTradeUsd).toBe(before.maxSingleTradeUsd);
  });

  it("applies cap increase in auto_apply mode when sufficiency is adequate", async () => {
    const dataDir = mkTempDir();
    VinceCapitalBucketsService.setInstance(
      new VinceCapitalBucketsService(dataDir),
    );
    const svc = new VinceProofCapitalAllocatorService(
      mockRuntime("auto_apply", "HIGH") as any,
    );
    const before = VinceCapitalBucketsService.getInstance().getBucket("paper");
    const summary = await svc.reconcile();
    const after = VinceCapitalBucketsService.getInstance().getBucket("paper");
    expect(summary.mode).toBe("auto_apply");
    expect(summary.applied).toBe(true);
    expect(after.maxSingleTradeUsd).toBeGreaterThan(before.maxSingleTradeUsd);
  });

  it("blocks risk increase in auto_apply mode when sufficiency is low", async () => {
    const dataDir = mkTempDir();
    VinceCapitalBucketsService.setInstance(
      new VinceCapitalBucketsService(dataDir),
    );
    const svc = new VinceProofCapitalAllocatorService(
      mockRuntime("auto_apply", "LOW") as any,
    );
    const before = VinceCapitalBucketsService.getInstance().getBucket("paper");
    const summary = await svc.reconcile();
    const after = VinceCapitalBucketsService.getInstance().getBucket("paper");
    expect(summary.mode).toBe("auto_apply");
    expect(summary.reason).toContain("low_sufficiency");
    expect(after.maxSingleTradeUsd).toBeLessThanOrEqual(
      before.maxSingleTradeUsd,
    );
  });

  it("prevents false promotion when causal confidence fails", async () => {
    const dataDir = mkTempDir();
    VinceCapitalBucketsService.setInstance(
      new VinceCapitalBucketsService(dataDir),
    );
    const runtime = {
      ...mockRuntime("auto_apply", "HIGH"),
      getService: (id: string) => {
        if (id === "VINCE_UPLIFT_EVALUATOR_SERVICE") {
          return {
            getSnapshot: () => ({
              byStage: [
                { stage: "onnx_enabled", avgPnl: 10 },
                { stage: "onnx_plus_swarm", avgPnl: 35 },
              ],
            }),
            getCausalSnapshot: () => ({
              promotionEligible: false,
              pairs: [
                {
                  confidenceScore: 42,
                  passed: false,
                  ciLower: -0.01,
                  label: "a",
                },
              ],
            }),
          };
        }
        return (mockRuntime("auto_apply", "HIGH") as any).getService(id);
      },
    };
    const svc = new VinceProofCapitalAllocatorService(runtime as any);
    const before = VinceCapitalBucketsService.getInstance().getBucket("paper");
    const summary = await svc.reconcile();
    const after = VinceCapitalBucketsService.getInstance().getBucket("paper");
    expect(summary.causalPromotionEligible).toBe(false);
    expect(summary.reason).toContain("causal");
    expect(after.maxSingleTradeUsd).toBeLessThanOrEqual(
      before.maxSingleTradeUsd,
    );
  });
});
