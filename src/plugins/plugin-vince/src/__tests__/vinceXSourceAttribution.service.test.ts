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
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean);
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
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean);
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

  it("exposes smoothed causal metrics to reduce one-window noise", () => {
    const svc = new VinceXSourceAttributionService(tmpDir);
    const filePath = path.join(tmpDir, "trade-attribution.jsonl");
    const now = Date.now();
    const oldTs = now - 20 * 24 * 60 * 60 * 1000;
    const recentTs = now - 2 * 24 * 60 * 60 * 1000;

    const mk = (
      id: string,
      stage: "onnx_enabled" | "onnx_plus_swarm",
      outcome: "win" | "loss",
      ts: number,
    ) =>
      JSON.stringify({
        tradeId: id,
        asset: "BTC",
        direction: "long",
        openedAt: new Date(ts).toISOString(),
        openedAtMs: ts,
        sourceClusters: ["@x"],
        confidence: 70,
        gateStack: {
          ruleBased: true,
          onnxEnabled: true,
          swarmEnabled: stage === "onnx_plus_swarm",
          adversaryEnabled: false,
        },
        closedAt: new Date(ts + 60_000).toISOString(),
        closedAtMs: ts + 60_000,
        pnl: outcome === "win" ? 100 : -100,
        outcome,
      });

    const lines: string[] = [];
    for (let i = 0; i < 8; i++) {
      lines.push(mk(`old-c-win-${i}`, "onnx_enabled", "win", oldTs + i));
      lines.push(mk(`old-t-win-${i}`, "onnx_plus_swarm", "win", oldTs + i));
    }
    for (let i = 0; i < 2; i++) {
      lines.push(
        mk(`old-c-loss-${i}`, "onnx_enabled", "loss", oldTs + 100 + i),
      );
      lines.push(
        mk(`old-t-loss-${i}`, "onnx_plus_swarm", "loss", oldTs + 100 + i),
      );
    }
    for (let i = 0; i < 3; i++) {
      lines.push(
        mk(`recent-c-loss-${i}`, "onnx_enabled", "loss", recentTs + i),
      );
    }
    lines.push(mk("recent-c-win", "onnx_enabled", "win", recentTs + 10));
    for (let i = 0; i < 4; i++) {
      lines.push(
        mk(`recent-t-win-${i}`, "onnx_plus_swarm", "win", recentTs + 20 + i),
      );
    }

    fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf-8");
    const causal = svc.getCausalUpliftSnapshot({
      windowDays: 30,
      minimumEffect: 0.01,
      minimumSamplesPerArm: 5,
    });
    const pair = causal.pairs.find((p) => p.label === "onnx_vs_swarm");
    expect(pair).toBeDefined();
    expect(pair?.smoothedUpliftDelta).toBeGreaterThan(pair?.upliftDelta ?? 0);
    expect(pair?.smoothedCiLower).toBeDefined();
    expect(pair?.smoothedConfidenceScore).toBeDefined();
  });
});
