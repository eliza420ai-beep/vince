/**
 * VINCE Narrative-to-Price Lag Model — Tests
 *
 * PRD Phase 8, Task #42.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceNarrativeLagService } from "../services/vinceNarrativeLag.service";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lag-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("VinceNarrativeLagService", () => {
  it("starts empty", () => {
    const svc = new VinceNarrativeLagService(tmpDir);
    const stats = svc.computeLagStats("BTC", "inception");
    expect(stats.sampleSize).toBe(0);
    expect(stats.avgDelta24h).toBe(0);
    expect(stats.avgDelta48h).toBe(0);
  });

  it("records a transition and persists it", () => {
    const svc = new VinceNarrativeLagService(tmpDir);
    svc.recordTransition("BTC", "inception", 50000);
    const filePath = path.join(tmpDir, "narrative-lag.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.asset).toBe("BTC");
    expect(rec.narrativePhase).toBe("inception");
    expect(rec.priceAtTransition).toBe(50000);
  });

  it("updates outcome and computes deltas", () => {
    const svc = new VinceNarrativeLagService(tmpDir);
    svc.recordTransition("ETH", "growth", 2000);

    const filePath = path.join(tmpDir, "narrative-lag.jsonl");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    const rec = JSON.parse(lines[0]);
    const transitionAt = rec.transitionAt;

    svc.updateOutcome("ETH", transitionAt, 2200, 2400);

    const stats = svc.computeLagStats("ETH", "growth");
    expect(stats.sampleSize).toBe(1);
    expect(stats.avgDelta24h).toBeCloseTo(10); // +10%
    expect(stats.avgDelta48h).toBeCloseTo(20); // +20%
  });

  it("computeLagStats averages multiple records", () => {
    const svc = new VinceNarrativeLagService(tmpDir);

    // Record two transitions for SOL growth
    svc.recordTransition("SOL", "growth", 100);
    let lines = fs
      .readFileSync(path.join(tmpDir, "narrative-lag.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    const at1 = JSON.parse(lines[0]).transitionAt;

    // Tiny sleep to ensure different timestamp
    const start = Date.now();
    while (Date.now() - start < 2) {}

    svc.recordTransition("SOL", "growth", 120);
    lines = fs
      .readFileSync(path.join(tmpDir, "narrative-lag.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    const at2 = JSON.parse(lines[1]).transitionAt;

    svc.updateOutcome("SOL", at1, 110, 115); // +10%, +15%
    svc.updateOutcome("SOL", at2, 132, 144); // +10%, +20%

    const stats = svc.computeLagStats("SOL", "growth");
    expect(stats.sampleSize).toBe(2);
    expect(stats.avgDelta24h).toBeCloseTo(10);
    expect(stats.avgDelta48h).toBeCloseTo(17.5);
  });

  it("getLagAdjustedConfidence returns baseConf when no data", () => {
    const svc = new VinceNarrativeLagService(tmpDir);
    expect(svc.getLagAdjustedConfidence("BTC", "peak", 65)).toBe(65);
  });

  it("getLagAdjustedConfidence clamps to [base*0.5, base*1.5]", () => {
    const svc = new VinceNarrativeLagService(tmpDir);
    svc.recordTransition("BTC", "peak", 100);
    const lines = fs
      .readFileSync(path.join(tmpDir, "narrative-lag.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    const at = JSON.parse(lines[0]).transitionAt;
    // Massive positive delta: +200% → would boost to 1 + 20 = 21x base → clamp to 1.5x
    svc.updateOutcome("BTC", at, 300, 400);
    const conf = svc.getLagAdjustedConfidence("BTC", "peak", 60);
    expect(conf).toBeLessThanOrEqual(60 * 1.5);
    expect(conf).toBeGreaterThanOrEqual(60 * 0.5);
  });

  it("getLagAdjustedConfidence boosts confidence for positive delta", () => {
    const svc = new VinceNarrativeLagService(tmpDir);
    svc.recordTransition("BTC", "inception", 100);
    const lines = fs
      .readFileSync(path.join(tmpDir, "narrative-lag.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    const at = JSON.parse(lines[0]).transitionAt;
    svc.updateOutcome("BTC", at, 105, 108); // +5%
    const conf = svc.getLagAdjustedConfidence("BTC", "inception", 60);
    expect(conf).toBeGreaterThan(60); // positive move boosts
    expect(conf).toBeLessThanOrEqual(90); // capped at 1.5x
  });
});
