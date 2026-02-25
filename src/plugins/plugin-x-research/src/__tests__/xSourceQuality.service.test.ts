/**
 * X Source Quality Engine — Tests
 *
 * PRD Phase 8, Task #41.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { XSourceQualityService } from "../services/xSourceQuality.service";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xsq-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("XSourceQualityService", () => {
  it("starts with no records", () => {
    const svc = new XSourceQualityService(tmpDir);
    expect(svc.getTopSources(5)).toHaveLength(0);
  });

  it("records a prediction and computes precision", () => {
    const svc = new XSourceQualityService(tmpDir);
    svc.recordPrediction("@alpha", "long", 70, true);
    const top = svc.getTopSources(1);
    expect(top).toHaveLength(1);
    expect(top[0].handle).toBe("@alpha");
    expect(top[0].totalPredictions).toBe(1);
    expect(top[0].correctPredictions).toBe(1);
    expect(top[0].precision).toBe(1);
  });

  it("accumulates multiple predictions", () => {
    const svc = new XSourceQualityService(tmpDir);
    svc.recordPrediction("@beta", "long", 60, true);
    svc.recordPrediction("@beta", "short", 55, false);
    svc.recordPrediction("@beta", "long", 65, true);
    const rec = svc.getTopSources(5).find((r) => r.handle === "@beta");
    expect(rec).toBeDefined();
    expect(rec!.totalPredictions).toBe(3);
    expect(rec!.correctPredictions).toBe(2);
    expect(rec!.precision).toBeCloseTo(2 / 3);
  });

  it("getTopSources returns highest precision first", () => {
    const svc = new XSourceQualityService(tmpDir);
    svc.recordPrediction("@low", "long", 50, false);
    svc.recordPrediction("@high", "long", 80, true);
    const top = svc.getTopSources(2);
    expect(top[0].handle).toBe("@high");
    expect(top[1].handle).toBe("@low");
  });

  it("getUnderperformingSources returns lowest precision first", () => {
    const svc = new XSourceQualityService(tmpDir);
    svc.recordPrediction("@low", "long", 50, false);
    svc.recordPrediction("@high", "long", 80, true);
    const bottom = svc.getUnderperformingSources(2);
    expect(bottom[0].handle).toBe("@low");
  });

  it("getQualityMultiplier returns 1.0 for unknown handle", () => {
    const svc = new XSourceQualityService(tmpDir);
    expect(svc.getQualityMultiplier("@nobody")).toBe(1.0);
  });

  it("getQualityMultiplier returns 0.5 for precision < 0.4", () => {
    const svc = new XSourceQualityService(tmpDir);
    // 1 of 3 = 0.333 < 0.4
    svc.recordPrediction("@bad", "long", 50, true);
    svc.recordPrediction("@bad", "long", 50, false);
    svc.recordPrediction("@bad", "long", 50, false);
    expect(svc.getQualityMultiplier("@bad")).toBe(0.5);
  });

  it("getQualityMultiplier returns 1.5 for precision > 0.6", () => {
    const svc = new XSourceQualityService(tmpDir);
    // 3 of 4 = 0.75 > 0.6
    svc.recordPrediction("@good", "long", 70, true);
    svc.recordPrediction("@good", "long", 70, true);
    svc.recordPrediction("@good", "long", 70, true);
    svc.recordPrediction("@good", "long", 70, false);
    expect(svc.getQualityMultiplier("@good")).toBe(1.5);
  });

  it("getQualityMultiplier returns 1.0 for precision in [0.4, 0.6]", () => {
    const svc = new XSourceQualityService(tmpDir);
    // 1 of 2 = 0.5
    svc.recordPrediction("@mid", "long", 50, true);
    svc.recordPrediction("@mid", "long", 50, false);
    expect(svc.getQualityMultiplier("@mid")).toBe(1.0);
  });

  it("persists across instances", () => {
    const svc1 = new XSourceQualityService(tmpDir);
    svc1.recordPrediction("@persist", "long", 70, true);

    const svc2 = new XSourceQualityService(tmpDir);
    const top = svc2.getTopSources(1);
    expect(top[0].handle).toBe("@persist");
    expect(top[0].totalPredictions).toBe(1);
  });
});
