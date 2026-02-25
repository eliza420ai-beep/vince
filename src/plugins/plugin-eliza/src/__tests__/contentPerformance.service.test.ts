/**
 * Content Performance Feedback Loop — Tests
 *
 * PRD Phase 8, Task #46.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ContentPerformanceService } from "../services/contentPerformance.service";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-perf-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("ContentPerformanceService", () => {
  it("starts empty", () => {
    const svc = new ContentPerformanceService(tmpDir);
    const weekly = svc.getWeeklyOutput();
    expect(weekly.substacks).toBe(0);
    expect(weekly.tweets).toBe(0);
    expect(weekly.publishRate).toBe(0);
    expect(svc.getTopSourceInputs()).toHaveLength(0);
  });

  it("recordDraft creates a record and returns a contentId", () => {
    const svc = new ContentPerformanceService(tmpDir);
    const id = svc.recordDraft("substack", "Bitcoin Thesis", ["tradingPerformance"]);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    const filePath = path.join(tmpDir, "content-performance.jsonl");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.type).toBe("substack");
    expect(rec.title).toBe("Bitcoin Thesis");
    expect(rec.published).toBe(false);
    expect(rec.contentId).toBe(id);
  });

  it("markPublished updates the record", () => {
    const svc = new ContentPerformanceService(tmpDir);
    const id = svc.recordDraft("tweet", "SOL Alpha", ["xResearch"]);
    svc.markPublished(id);
    const filePath = path.join(tmpDir, "content-performance.jsonl");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    expect(JSON.parse(lines[0]).published).toBe(true);
  });

  it("getTopSourceInputs returns most frequent sources first", () => {
    const svc = new ContentPerformanceService(tmpDir);
    svc.recordDraft("substack", "A", ["tradingPerformance", "eliza"]);
    svc.recordDraft("tweet", "B", ["tradingPerformance"]);
    svc.recordDraft("tweet", "C", ["xResearch"]);
    const top = svc.getTopSourceInputs();
    // "tradingPerformance" appears 2x, others 1x
    expect(top[0]).toBe("tradingPerformance");
  });

  it("getWeeklyOutput counts substacks and tweets in last 7 days", () => {
    const svc = new ContentPerformanceService(tmpDir);
    svc.recordDraft("substack", "A", []);
    svc.recordDraft("substack", "B", []);
    svc.recordDraft("tweet", "T1", []);
    const weekly = svc.getWeeklyOutput();
    expect(weekly.substacks).toBe(2);
    expect(weekly.tweets).toBe(1);
  });

  it("getWeeklyOutput computes publishRate correctly", () => {
    const svc = new ContentPerformanceService(tmpDir);
    const id1 = svc.recordDraft("substack", "A", []);
    svc.recordDraft("tweet", "T1", []);
    svc.markPublished(id1);
    const weekly = svc.getWeeklyOutput();
    expect(weekly.publishRate).toBeCloseTo(0.5); // 1 of 2
  });

  it("generateContentId creates unique IDs", () => {
    const svc = new ContentPerformanceService(tmpDir);
    const id1 = svc.recordDraft("tweet", "T1", []);
    const id2 = svc.recordDraft("tweet", "T2", []);
    expect(id1).not.toBe(id2);
  });

  it("markPublished does not throw for unknown contentId", () => {
    const svc = new ContentPerformanceService(tmpDir);
    expect(() => svc.markPublished("nonexistent")).not.toThrow();
  });
});
