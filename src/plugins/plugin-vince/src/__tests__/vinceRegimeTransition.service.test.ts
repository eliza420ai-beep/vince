/**
 * VINCE Regime Transition Forecaster — Tests
 *
 * PRD Phase 8, Task #45.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceRegimeTransitionService } from "../services/vinceRegimeTransition.service";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "regime-test-"));
  // Reset singleton between tests
  (VinceRegimeTransitionService as any)._instance = undefined;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  (VinceRegimeTransitionService as any)._instance = undefined;
});

describe("VinceRegimeTransitionService", () => {
  it("starts with no data, risk = 0", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    expect(svc.getTransitionRisk("trending")).toBe(0);
    expect(svc.getTransitionProbability("trending")).toEqual({});
  });

  it("records a transition and persists", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    svc.recordTransition("trending", "volatile", 3600000);
    const filePath = path.join(tmpDir, "regime-history.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.from).toBe("trending");
    expect(rec.to).toBe("volatile");
    expect(rec.durationMs).toBe(3600000);
  });

  it("getTransitionProbability computes fractions from 'from' regime", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    // trending → volatile (2x), trending → neutral (1x)
    svc.recordTransition("trending", "volatile");
    svc.recordTransition("trending", "volatile");
    svc.recordTransition("trending", "neutral");
    const probs = svc.getTransitionProbability("trending");
    expect(probs.volatile).toBeCloseTo(2 / 3);
    expect(probs.neutral).toBeCloseTo(1 / 3);
  });

  it("getTransitionRisk = 1 - max(prob)", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    // 2/3 to volatile → risk = 1 - 2/3 = 1/3 ≈ 0.333
    svc.recordTransition("trending", "volatile");
    svc.recordTransition("trending", "volatile");
    svc.recordTransition("trending", "neutral");
    expect(svc.getTransitionRisk("trending")).toBeCloseTo(1 / 3);
  });

  it("shouldReduceHeat returns true when risk > 0.6", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    // All equally likely → max prob = 1/3 → risk = 2/3 > 0.6
    svc.recordTransition("sideways", "trending");
    svc.recordTransition("sideways", "volatile");
    svc.recordTransition("sideways", "neutral");
    expect(svc.shouldReduceHeat("sideways")).toBe(true);
  });

  it("shouldReduceHeat returns false when risk <= 0.6", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    // 3/3 to volatile → risk = 0 <= 0.6
    svc.recordTransition("trending", "volatile");
    svc.recordTransition("trending", "volatile");
    svc.recordTransition("trending", "volatile");
    expect(svc.shouldReduceHeat("trending")).toBe(false);
  });

  it("static getInstance returns undefined before setInstance", () => {
    expect(VinceRegimeTransitionService.getInstance()).toBeUndefined();
  });

  it("static setInstance and getInstance work correctly", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    VinceRegimeTransitionService.setInstance(svc);
    expect(VinceRegimeTransitionService.getInstance()).toBe(svc);
  });

  it("defaults durationMs to 0 when not provided", () => {
    const svc = new VinceRegimeTransitionService(tmpDir);
    svc.recordTransition("a", "b");
    const lines = fs
      .readFileSync(path.join(tmpDir, "regime-history.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(JSON.parse(lines[0]).durationMs).toBe(0);
  });
});
