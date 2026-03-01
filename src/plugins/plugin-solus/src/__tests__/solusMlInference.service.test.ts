/**
 * Unit tests for SolusMlInferenceService: no model → null; with mock session → returns probability.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import type { IAgentRuntime } from "@elizaos/core";
import { SolusMlInferenceService } from "../services/solusMlInference.service";

const mockSession = {
  run: vi.fn().mockResolvedValue({
    output: { data: [0.18, 0.82], dims: [1, 2] },
  }),
};

vi.mock("onnxruntime-node", () => ({
  InferenceSession: {
    create: vi.fn().mockResolvedValue(mockSession),
  },
  Tensor: class Tensor {
    constructor(
      public type: string,
      public data: Float32Array,
      public dims: number[],
    ) {}
  },
}));

describe("SolusMlInferenceService", () => {
  let tmpDir: string;
  const savedEnv = process.env.SOLUS_ML_MODELS_DIR;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `solus-ml-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (savedEnv !== undefined) process.env.SOLUS_ML_MODELS_DIR = savedEnv;
    else delete process.env.SOLUS_ML_MODELS_DIR;
    try {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("returns null when no model dir has no ONNX or metadata", async () => {
    process.env.SOLUS_ML_MODELS_DIR = tmpDir;
    const runtime = {
      getSetting: vi.fn(),
      getService: vi.fn(),
    } as unknown as IAgentRuntime;
    const service = await SolusMlInferenceService.start(runtime);
    expect(service.isModelLoaded()).toBe(false);
    const out = await service.predictAssignmentProbability({
      asset: "BTC",
      strike: 100_000,
      spot: 98_000,
      atmIv: 55,
      TYears: 0.02,
    });
    expect(out).toBeNull();
  });

  it("returns null when metadata exists but no ONNX file", async () => {
    process.env.SOLUS_ML_MODELS_DIR = tmpDir;
    fs.writeFileSync(
      path.join(tmpDir, "solus_training_metadata.json"),
      JSON.stringify({
        assignment_calibrator_feature_names: [
          "asset_BTC",
          "asset_ETH",
          "asset_SOL",
          "asset_HYPE",
          "strike_norm",
          "moneyness",
          "atm_iv",
          "T_years",
          "predicted_assign_prob",
        ],
        assignment_calibrator_input_dim: 9,
      }),
      "utf-8",
    );
    const runtime = {
      getSetting: vi.fn(),
      getService: vi.fn(),
    } as unknown as IAgentRuntime;
    const service = await SolusMlInferenceService.start(runtime);
    expect(service.isModelLoaded()).toBe(false);
    const out = await service.predictAssignmentProbability({
      asset: "BTC",
      strike: 100_000,
      spot: 98_000,
      atmIv: 55,
      TYears: 0.02,
    });
    expect(out).toBeNull();
  });

  it("loads model and returns probability when ONNX and metadata exist", async () => {
    process.env.SOLUS_ML_MODELS_DIR = tmpDir;
    fs.writeFileSync(
      path.join(tmpDir, "solus_training_metadata.json"),
      JSON.stringify({
        assignment_calibrator_feature_names: [
          "asset_BTC",
          "asset_ETH",
          "asset_SOL",
          "asset_HYPE",
          "strike_norm",
          "moneyness",
          "atm_iv",
          "T_years",
          "predicted_assign_prob",
        ],
        assignment_calibrator_input_dim: 9,
      }),
      "utf-8",
    );
    fs.writeFileSync(path.join(tmpDir, "assignment_calibrator.onnx"), "dummy");
    const runtime = {
      getSetting: vi.fn(),
      getService: vi.fn(),
    } as unknown as IAgentRuntime;
    const service = await SolusMlInferenceService.start(runtime);
    expect(service.isModelLoaded()).toBe(true);
    const out = await service.predictAssignmentProbability({
      asset: "ETH",
      strike: 3500,
      spot: 3400,
      atmIv: 60,
      TYears: 0.02,
      gbmProb: 0.25,
    });
    expect(out).toBe(0.82);
    expect(mockSession.run).toHaveBeenCalledTimes(1);
    const callArg = mockSession.run.mock.calls[0][0];
    expect(callArg?.input).toBeDefined();
    expect(callArg.input.data).toBeInstanceOf(Float32Array);
    expect((callArg.input.data as Float32Array).length).toBe(9);
  });
});
