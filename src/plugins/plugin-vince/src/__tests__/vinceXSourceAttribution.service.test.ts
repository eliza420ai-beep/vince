/**
 * VINCE Research-to-Trade Attribution — Tests
 *
 * PRD Phase 8, Task #43.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceXSourceAttributionService } from "../services/vinceXSourceAttribution.service";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "attr-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("VinceXSourceAttributionService", () => {
  it("starts empty", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    expect(svc.getAttributionStats()).toHaveLength(0);
  });

  it("records an open trade", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    svc.recordOpen("trade-1", "BTC", "long", ["@alpha", "@beta"], 75);
    const filePath = path.join(tmpDir, "trade-attribution.jsonl");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.tradeId).toBe("trade-1");
    expect(rec.asset).toBe("BTC");
    expect(rec.direction).toBe("long");
    expect(rec.sourceClusters).toEqual(["@alpha", "@beta"]);
  });

  it("records a close and updates the record", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    svc.recordOpen("trade-1", "BTC", "long", ["@alpha"], 75);
    svc.recordClose("trade-1", 120, "win");

    const filePath = path.join(tmpDir, "trade-attribution.jsonl");
    const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
    expect(lines).toHaveLength(1);
    const rec = JSON.parse(lines[0]);
    expect(rec.pnl).toBe(120);
    expect(rec.outcome).toBe("win");
    expect(rec.closedAt).toBeDefined();
  });

  it("getAttributionStats returns stats sorted by winRate desc", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    // @alpha: 2 wins, 1 loss → 67% winRate
    svc.recordOpen("t1", "BTC", "long", ["@alpha"], 70);
    svc.recordOpen("t2", "BTC", "long", ["@alpha"], 70);
    svc.recordOpen("t3", "BTC", "long", ["@alpha"], 70);
    svc.recordClose("t1", 100, "win");
    svc.recordClose("t2", 80, "win");
    svc.recordClose("t3", -50, "loss");

    // @beta: 1 win → 100% winRate
    svc.recordOpen("t4", "ETH", "long", ["@beta"], 65);
    svc.recordClose("t4", 200, "win");

    const stats = svc.getAttributionStats();
    expect(stats[0].source).toBe("@beta");
    expect(stats[0].winRate).toBe(1.0);
    expect(stats[1].source).toBe("@alpha");
    expect(stats[1].winRate).toBeCloseTo(2 / 3);
  });

  it("handles missing tradeId gracefully in recordClose", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    svc.recordOpen("t1", "BTC", "long", ["@alpha"], 70);
    // Closing a non-existent trade should not throw
    expect(() => svc.recordClose("nonexistent", 0, "scratch")).not.toThrow();
  });

  it("computes avgPnl correctly", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    svc.recordOpen("t1", "BTC", "long", ["@src"], 70);
    svc.recordOpen("t2", "BTC", "long", ["@src"], 70);
    svc.recordClose("t1", 100, "win");
    svc.recordClose("t2", -40, "loss");

    const stats = svc.getAttributionStats();
    expect(stats[0].source).toBe("@src");
    expect(stats[0].avgPnl).toBeCloseTo(30); // (100 + -40) / 2
    expect(stats[0].tradeCount).toBe(2);
  });

  it("ignores open (unclosed) trades in attribution stats", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    svc.recordOpen("t1", "BTC", "long", ["@open"], 70);
    // No close recorded
    const stats = svc.getAttributionStats();
    expect(stats).toHaveLength(0);
  });
});
