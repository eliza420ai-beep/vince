/**
 * Tests for assignment predictions store: append, resolve, Brier.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  getStorePath,
  loadRecords,
  appendRecord,
  getOpenPredictions,
  getResolvedCount,
  resolveLatestForAssetStrike,
  computeBrier,
} from "../utils/assignmentPredictionsStore";

describe("assignmentPredictionsStore", () => {
  let tmpFile: string;
  const savedEnv = process.env.SOLUS_ASSIGNMENT_PREDICTIONS_PATH;

  beforeEach(() => {
    tmpFile = path.join(
      os.tmpdir(),
      `solus-assignment-test-${Date.now()}.jsonl`,
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

  it("append and load records", () => {
    expect(loadRecords()).toHaveLength(0);
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.24,
    });
    const rows = loadRecords();
    expect(rows).toHaveLength(1);
    expect(rows[0].asset).toBe("BTC");
    expect(rows[0].strike).toBe(106_000);
    expect(rows[0].predictedAssignProb).toBe(0.24);
    expect(rows[0].createdAt).toBeDefined();
    expect(rows[0].resolvedAt).toBeUndefined();
    expect(rows[0].outcome).toBeUndefined();
  });

  it("resolve latest for asset sets outcome and resolvedAt", () => {
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.24,
    });
    const ok = resolveLatestForAssetStrike("BTC", 1);
    expect(ok).toBe(true);
    const rows = loadRecords();
    expect(rows[0].outcome).toBe(1);
    expect(rows[0].resolvedAt).toBeDefined();
  });

  it("resolve returns false when no open prediction", () => {
    const ok = resolveLatestForAssetStrike("ETH", 0);
    expect(ok).toBe(false);
  });

  it("computeBrier returns 0 when no resolved", () => {
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.24,
    });
    const report = computeBrier(30);
    expect(report.count).toBe(0);
    expect(report.meanBrier).toBe(0);
  });

  it("computeBrier returns mean of (p - outcome)^2 for resolved", () => {
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.2,
    });
    resolveLatestForAssetStrike("BTC", 1);
    const report = computeBrier(30);
    expect(report.count).toBe(1);
    expect(report.meanBrier).toBeCloseTo((0.2 - 1) ** 2, 5);
  });

  it("getOpenPredictions returns only unresolved, newest first", () => {
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.24,
    });
    appendRecord({
      asset: "ETH",
      strike: 3_500,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.18,
    });
    let open = getOpenPredictions();
    expect(open).toHaveLength(2);
    expect(open.map((r) => r.asset).sort()).toEqual(["BTC", "ETH"]);
    resolveLatestForAssetStrike("ETH", 0);
    open = getOpenPredictions();
    expect(open).toHaveLength(1);
    expect(open[0].asset).toBe("BTC");
  });

  it("getResolvedCount returns count of resolved predictions (outcome 0 or 1)", () => {
    expect(getResolvedCount()).toBe(0);
    appendRecord({
      asset: "BTC",
      strike: 106_000,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.24,
    });
    appendRecord({
      asset: "ETH",
      strike: 3_500,
      expiryUtc: "2026-03-06T08:00:00.000Z",
      predictedAssignProb: 0.18,
    });
    expect(getResolvedCount()).toBe(0);
    resolveLatestForAssetStrike("BTC", 1);
    expect(getResolvedCount()).toBe(1);
    resolveLatestForAssetStrike("ETH", 0);
    expect(getResolvedCount()).toBe(2);
  });
});
