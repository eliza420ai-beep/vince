import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceWeightBanditService } from "../services/weightBandit.service";
import { dynamicConfig } from "../config/dynamicConfig";

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bandit-test-"));
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function averageSampledWeight(
  svc: VinceWeightBanditService,
  source: string,
  samples = 200,
): number {
  let total = 0;
  for (let i = 0; i < samples; i++) total += svc.getSampledWeight(source);
  return total / samples;
}

describe("VinceWeightBanditService", () => {
  it("downweights persistently negative contributors", async () => {
    const runtime = {
      getService: () => null,
    } as any;
    const svc = await VinceWeightBanditService.start(runtime);
    const source = "BinanceTopTraders";
    const before = averageSampledWeight(svc, source);

    await svc.recordOutcome({
      sources: [source],
      profitable: false,
      pnlPct: -1.8,
    });
    await svc.recordOutcome({
      sources: [source],
      profitable: false,
      pnlPct: -2.1,
    });

    const after = averageSampledWeight(svc, source);
    expect(after).toBeLessThan(before);
    await svc.stop();
  });

  it("keeps sampled weight within base floor and ceiling", async () => {
    const runtime = {
      getService: () => null,
    } as any;
    const svc = await VinceWeightBanditService.start(runtime);
    const source = "MarketRegime";
    const base = dynamicConfig.getSourceWeight(source);

    for (let i = 0; i < 8; i++) {
      await svc.recordOutcome({
        sources: [source],
        profitable: false,
        pnlPct: -3.0,
      });
    }

    let minSeen = Infinity;
    let maxSeen = -Infinity;
    for (let i = 0; i < 200; i++) {
      const w = svc.getSampledWeight(source);
      minSeen = Math.min(minSeen, w);
      maxSeen = Math.max(maxSeen, w);
    }

    expect(minSeen).toBeGreaterThanOrEqual(base * 0.3);
    expect(maxSeen).toBeLessThanOrEqual(base * 2.0);
    await svc.stop();
  });

  it("applies uplift guardrail penalty to uplift-sensitive sources", async () => {
    const runtimeNegative = {
      getService: (id: string) => {
        if (id === "VINCE_UPLIFT_EVALUATOR_SERVICE") {
          return {
            getSnapshot: () => ({
              byStage: [
                { stage: "onnx_enabled", avgPnl: 2 },
                { stage: "onnx_plus_swarm", avgPnl: -1 },
              ],
            }),
          };
        }
        return null;
      },
    } as any;
    const runtimePositive = {
      getService: (id: string) => {
        if (id === "VINCE_UPLIFT_EVALUATOR_SERVICE") {
          return {
            getSnapshot: () => ({
              byStage: [
                { stage: "onnx_enabled", avgPnl: 2 },
                { stage: "onnx_plus_swarm", avgPnl: 4 },
              ],
            }),
          };
        }
        return null;
      },
    } as any;
    const svcNegative = await VinceWeightBanditService.start(runtimeNegative);
    const svcPositive = await VinceWeightBanditService.start(runtimePositive);
    const sensitive = "XSentiment";
    const avgNegative = averageSampledWeight(svcNegative, sensitive, 250);
    const avgPositive = averageSampledWeight(svcPositive, sensitive, 250);
    expect(avgNegative).toBeLessThan(avgPositive);
    await svcNegative.stop();
    await svcPositive.stop();
  });
});
