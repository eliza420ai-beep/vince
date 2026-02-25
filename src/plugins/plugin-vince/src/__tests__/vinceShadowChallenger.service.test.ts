/**
 * Tests for VinceShadowChallengerService.
 * PRD: One Dream Phase 12 — Task #75
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { VinceShadowChallengerService } from "../services/vinceShadowChallenger.service";

let tmpDir: string;
let service: VinceShadowChallengerService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "shadow-challenger-test-"),
  );
  service = new VinceShadowChallengerService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("createChallenger", () => {
  it("creates a challenger with correct defaults", () => {
    const challenger = service.createChallenger({ confidenceBoost: 5 });
    expect(challenger.id).toBeTruthy();
    expect(challenger.label).toContain("challenger-");
    expect(challenger.parameters).toEqual({ confidenceBoost: 5 });
    expect(challenger.trades).toHaveLength(0);
    expect(challenger.fitness).toBe(0);
    expect(challenger.vsCurrentGenome).toBe(0);
    expect(challenger.promotionReady).toBe(false);
  });

  it("persists challenger to JSONL file", () => {
    service.createChallenger({ sizeMultiplier: 1.2 });
    const filePath = path.join(tmpDir, "shadow-challengers.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it("creates multiple challengers independently", () => {
    service.createChallenger({ a: 1 });
    service.createChallenger({ b: 2 });
    const summary = service.getActiveChallengersSummary();
    expect(summary).toHaveLength(2);
  });
});

describe("recordTrade", () => {
  it("appends trade to the challenger", () => {
    const challenger = service.createChallenger({});
    service.recordTrade(challenger.id, {
      asset: "BTC",
      direction: "long",
      confidence: 70,
      outcome: "win",
      pnl: 50,
    });
    const summary = service.getActiveChallengersSummary();
    expect(summary.find((c) => c.id === challenger.id)?.tradeCount).toBe(1);
  });

  it("ignores recordTrade for unknown id", () => {
    service.recordTrade("nonexistent-id", {
      asset: "ETH",
      direction: "long",
      confidence: 60,
    });
    // No crash
  });
});

describe("updateFitness", () => {
  it("updates fitness from trade outcomes", () => {
    const challenger = service.createChallenger({});
    service.recordTrade(challenger.id, { asset: "BTC", direction: "long", confidence: 70, outcome: "win", pnl: 100 });
    service.recordTrade(challenger.id, { asset: "ETH", direction: "long", confidence: 60, outcome: "win", pnl: 50 });
    service.updateFitness(challenger.id, 0.5);
    const summary = service.getActiveChallengersSummary();
    const updated = summary.find((c) => c.id === challenger.id);
    expect(updated).toBeDefined();
    expect(typeof updated!.fitness).toBe("number");
    expect(updated!.vsCurrentGenome).toBe(updated!.fitness - 0.5);
  });

  it("increments consecutiveOutperformWeeks when challenger beats genome", () => {
    const challenger = service.createChallenger({});
    // Record enough wins to get positive Sharpe
    for (let i = 0; i < 5; i++) {
      service.recordTrade(challenger.id, { asset: "BTC", direction: "long", confidence: 80, outcome: "win", pnl: 50 });
    }
    // Call updateFitness with very low genome fitness so challenger wins
    for (let week = 0; week < 4; week++) {
      service.updateFitness(challenger.id, -10);
    }
    const candidates = service.getPromotionCandidates();
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].id).toBe(challenger.id);
  });
});

describe("getPromotionCandidates", () => {
  it("returns empty when no challengers are ready", () => {
    service.createChallenger({});
    expect(service.getPromotionCandidates()).toHaveLength(0);
  });
});

describe("pruneUnderperformers", () => {
  it("removes challengers with < minTrades and negative fitness", () => {
    const c1 = service.createChallenger({ a: 1 });
    const c2 = service.createChallenger({ b: 2 });

    // c1 gets wins → positive fitness
    service.recordTrade(c1.id, { asset: "BTC", direction: "long", confidence: 80, outcome: "win", pnl: 100 });
    service.recordTrade(c1.id, { asset: "ETH", direction: "long", confidence: 70, outcome: "win", pnl: 50 });
    service.updateFitness(c1.id, 0);

    // c2 gets 0 trades → fitness=0, default; below minTrades=1 and fitness=0 (not < 0)
    // Let's make it have negative fitness by giving it a loss
    service.recordTrade(c2.id, { asset: "BTC", direction: "long", confidence: 50, outcome: "loss", pnl: -100 });
    service.updateFitness(c2.id, 0);

    // c2 has 1 trade and negative fitness — prune with minTrades=2
    const removed = service.pruneUnderperformers(2);
    expect(removed).toBeGreaterThanOrEqual(1);
    const remaining = service.getActiveChallengersSummary();
    // c1 should still be there (2 trades, positive fitness)
    expect(remaining.some((c) => c.id === c1.id)).toBe(true);
  });

  it("returns 0 when nothing to prune", () => {
    const c1 = service.createChallenger({});
    service.recordTrade(c1.id, { asset: "BTC", direction: "long", confidence: 80, outcome: "win", pnl: 100 });
    service.recordTrade(c1.id, { asset: "ETH", direction: "long", confidence: 70, outcome: "win", pnl: 50 });
    service.updateFitness(c1.id, 0);
    const removed = service.pruneUnderperformers(1);
    expect(removed).toBe(0);
  });
});
