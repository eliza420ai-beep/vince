/**
 * Execution Quality Model — Tests
 *
 * PRD Phase 8, Task #44.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ExecutionQualityService } from "../services/executionQuality.service";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "exec-quality-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("ExecutionQualityService", () => {
  it("returns grade A and zero drag when no records", () => {
    const svc = new ExecutionQualityService(tmpDir);
    expect(svc.getExecutionGrade()).toBe("A");
    expect(svc.getWeeklyDrag()).toBe(0);
  });

  it("records an execution and persists to JSONL", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 100.1,
      slippagePct: 0.1,
    });
    const filePath = path.join(tmpDir, "execution-quality.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.tradeId).toBe("t1");
    expect(rec.recordedAt).toBeDefined();
    expect(rec.executionPenalty).toBe(0); // 0.1 <= 0.5
  });

  it("computes executionPenalty: 0 when |slippage| <= 0.5", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 100.5,
      slippagePct: 0.5,
    });
    const lines = fs
      .readFileSync(path.join(tmpDir, "execution-quality.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(JSON.parse(lines[0]).executionPenalty).toBe(0);
  });

  it("computes executionPenalty: |slippage| * 0.5 when > 0.5, capped at 20", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 102,
      slippagePct: 2.0,
    });
    const lines = fs
      .readFileSync(path.join(tmpDir, "execution-quality.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(JSON.parse(lines[0]).executionPenalty).toBe(1.0); // 2.0 * 0.5

    const svc2 = new ExecutionQualityService(tmpDir);
    svc2.recordExecution({
      tradeId: "t2",
      expectedEntry: 100,
      actualEntry: 200,
      slippagePct: 100, // would be 50, capped at 20
    });
    const lines2 = fs
      .readFileSync(path.join(tmpDir, "execution-quality.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    const last = JSON.parse(lines2[lines2.length - 1]);
    expect(last.executionPenalty).toBe(20);
  });

  it("getWeeklyDrag averages penalties in last 7 days", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 102,
      slippagePct: 2.0, // penalty = 1.0
    });
    svc.recordExecution({
      tradeId: "t2",
      expectedEntry: 100,
      actualEntry: 104,
      slippagePct: 4.0, // penalty = 2.0
    });
    expect(svc.getWeeklyDrag()).toBeCloseTo(1.5); // (1.0 + 2.0) / 2
  });

  it("getExecutionGrade returns A for avg |slippage| < 0.2", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 100.1,
      slippagePct: 0.1,
    });
    expect(svc.getExecutionGrade()).toBe("A");
  });

  it("getExecutionGrade returns B for avg |slippage| in [0.2, 0.5)", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 100.3,
      slippagePct: 0.3,
    });
    expect(svc.getExecutionGrade()).toBe("B");
  });

  it("getExecutionGrade returns C for avg |slippage| in [0.5, 1.0)", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 100.7,
      slippagePct: 0.7,
    });
    expect(svc.getExecutionGrade()).toBe("C");
  });

  it("getExecutionGrade returns D for avg |slippage| >= 1.0", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 102,
      slippagePct: 2.0,
    });
    expect(svc.getExecutionGrade()).toBe("D");
  });

  it("stores optional fields when provided", () => {
    const svc = new ExecutionQualityService(tmpDir);
    svc.recordExecution({
      tradeId: "t1",
      expectedEntry: 100,
      actualEntry: 100.2,
      slippagePct: 0.2,
      fillTimeMs: 150,
      routeUsed: "Relay",
      thesisScore: 8,
    });
    const lines = fs
      .readFileSync(path.join(tmpDir, "execution-quality.jsonl"), "utf-8")
      .split("\n")
      .filter(Boolean);
    const rec = JSON.parse(lines[0]);
    expect(rec.fillTimeMs).toBe(150);
    expect(rec.routeUsed).toBe("Relay");
    expect(rec.thesisScore).toBe(8);
  });
});
