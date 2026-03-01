/**
 * Unit tests for SOLUS_CALIBRATION_CONTEXT provider: Brier + recent outcomes format.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { solusCalibrationContextProvider } from "../providers/solusCalibrationContext.provider";
import {
  appendRecord,
  resolveLatestForAssetStrike,
} from "../utils/assignmentPredictionsStore";

describe("SOLUS_CALIBRATION_CONTEXT provider", () => {
  let tmpFile: string;
  const savedEnv = process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;

  beforeEach(() => {
    tmpFile = path.join(
      os.tmpdir(),
      `solus-calibration-test-${Date.now()}.jsonl`,
    );
    process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH = tmpFile;
  });

  afterEach(() => {
    if (savedEnv !== undefined)
      process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH = savedEnv;
    else delete process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  });

  it("returns no-resolved message when store is empty", async () => {
    const result = await solusCalibrationContextProvider.get(
      {} as IAgentRuntime,
      {} as Memory,
      {} as State,
    );
    expect(result.text).toContain("Solus calibration");
    expect(result.text).toContain("No resolved predictions yet");
    expect(result.text).toContain("record assignment prediction");
    expect(result.text).toContain("we got assigned");
  });

  it("returns Brier and recent lines when resolved rows exist", async () => {
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.24,
    });
    resolveLatestForAssetStrike("BTC", 1);
    appendRecord({
      asset: "ETH",
      strike: 3_500,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.18,
    });
    resolveLatestForAssetStrike("ETH", 0);

    const result = await solusCalibrationContextProvider.get(
      {} as IAgentRuntime,
      {} as Memory,
      {} as State,
    );
    expect(result.text).toContain("Solus calibration");
    expect(result.text).toContain("Brier");
    expect(result.text).toMatch(/n = 2/);
    expect(result.text).toContain("Lower is better");
    expect(result.text).toContain("Recent");
    expect(result.text).toContain("BTC");
    expect(result.text).toContain("106,000");
    expect(result.text).toContain("24%");
    expect(result.text).toContain("assigned");
    expect(result.text).toContain("ETH");
    expect(result.text).toContain("3,500");
    expect(result.text).toContain("18%");
    expect(result.text).toContain("not assigned");
  });

  it("values include brierMean and brierCount when resolved", async () => {
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.24,
    });
    resolveLatestForAssetStrike("BTC", 1);

    const result = await solusCalibrationContextProvider.get(
      {} as IAgentRuntime,
      {} as Memory,
      {} as State,
    );
    expect(result.values).toBeDefined();
    expect((result.values as { brierCount?: number }).brierCount).toBe(1);
    expect(typeof (result.values as { brierMean?: number }).brierMean).toBe(
      "number",
    );
  });
});
