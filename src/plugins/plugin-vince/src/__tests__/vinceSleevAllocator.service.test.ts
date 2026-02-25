/**
 * VinceSleeveAllocatorService Tests (#65)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceSleeveAllocatorService } from "../services/vinceSleevAllocator.service";

let tmpDir: string;
let svc: VinceSleeveAllocatorService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sleeve-test-"));
  VinceSleeveAllocatorService.setInstance(
    null as unknown as VinceSleeveAllocatorService,
  );
  svc = new VinceSleeveAllocatorService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("VinceSleeveAllocatorService", () => {
  describe("getSleeves / getSleeve", () => {
    it("returns all 4 default sleeves", () => {
      const sleeves = svc.getSleeves();
      expect(sleeves).toHaveLength(4);
      const ids = sleeves.map((s) => s.id);
      expect(ids).toContain("momentum");
      expect(ids).toContain("mean-reversion");
      expect(ids).toContain("options-premium");
      expect(ids).toContain("cash");
    });

    it("getSleeve returns the correct sleeve by id", () => {
      const momentum = svc.getSleeve("momentum");
      expect(momentum.id).toBe("momentum");
      expect(momentum.targetPct).toBe(40);
      expect(momentum.minPct).toBe(20);
      expect(momentum.maxPct).toBe(60);
    });

    it("getSleeve throws for unknown id", () => {
      expect(() => svc.getSleeve("unknown" as any)).toThrow();
    });
  });

  describe("getActiveSleevesForRegime", () => {
    it("returns momentum for TRENDING_BULL", () => {
      const active = svc.getActiveSleevesForRegime("TRENDING_BULL");
      expect(active).toContain("momentum");
      expect(active).toContain("options-premium");
    });

    it("returns cash for CAPITULATION", () => {
      const active = svc.getActiveSleevesForRegime("CAPITULATION");
      expect(active).toContain("cash");
      expect(active).toContain("options-premium");
    });

    it("returns empty array for unknown regime", () => {
      const active = svc.getActiveSleevesForRegime("UNKNOWN");
      expect(active).toHaveLength(0);
    });
  });

  describe("canAddPosition", () => {
    it("allows position when within maxPct", () => {
      // momentum: currentPct=40, maxPct=60; add 5% of 100000 = 5000
      const result = svc.canAddPosition("momentum", 5000, 100000);
      expect(result.allowed).toBe(true);
    });

    it("blocks position when exceeds maxPct ceiling", () => {
      // momentum: currentPct=40, maxPct=60
      // Adding 25000 to 100000 capital = +25% → would be 65% > 60% max
      const result = svc.canAddPosition("momentum", 25000, 100000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("max");
    });

    it("blocks for unknown sleeve", () => {
      const result = svc.canAddPosition("ghost" as any, 1000, 100000);
      expect(result.allowed).toBe(false);
    });

    it("blocks for zero capital", () => {
      const result = svc.canAddPosition("momentum", 1000, 0);
      expect(result.allowed).toBe(false);
    });

    it("allows position exactly at maxPct boundary", () => {
      // momentum: currentPct=40, maxPct=60; adding exactly 20%
      const result = svc.canAddPosition("momentum", 20000, 100000);
      // 40 + 20 = 60 = maxPct, should be allowed (≤ max)
      expect(result.allowed).toBe(true);
    });
  });

  describe("recordTrade", () => {
    it("increments activeTrades on open", () => {
      svc.recordTrade("momentum", 0, true);
      const sleeve = svc.getSleeve("momentum");
      expect(sleeve.activeTrades).toBe(1);
    });

    it("decrements activeTrades and records pnl on close", () => {
      svc.recordTrade("momentum", 0, true);
      svc.recordTrade("momentum", 150, false);
      const sleeve = svc.getSleeve("momentum");
      expect(sleeve.activeTrades).toBe(0);
      expect(sleeve.cumulativePnl).toBe(150);
    });

    it("does not go below 0 activeTrades", () => {
      svc.recordTrade("cash", -50, false);
      const sleeve = svc.getSleeve("cash");
      expect(sleeve.activeTrades).toBe(0);
    });
  });

  describe("getRebalanceActions", () => {
    it("returns empty array when all sleeves are within bounds", () => {
      // default state: all sleeves at target (within min/max)
      const actions = svc.getRebalanceActions(100000);
      expect(actions).toHaveLength(0);
    });

    it("returns decrease action when sleeve is above maxPct", () => {
      svc.updateCurrentPct("momentum", 65); // maxPct=60
      const actions = svc.getRebalanceActions(100000);
      const momentumAction = actions.find((a) => a.sleeve === "momentum");
      expect(momentumAction).toBeDefined();
      expect(momentumAction!.action).toBe("decrease");
      // delta = (65-60)/100 * 100000 = 5000
      expect(momentumAction!.deltaUsd).toBeCloseTo(5000);
    });

    it("returns increase action when sleeve is below minPct", () => {
      svc.updateCurrentPct("mean-reversion", 5); // minPct=10
      const actions = svc.getRebalanceActions(100000);
      const action = actions.find((a) => a.sleeve === "mean-reversion");
      expect(action).toBeDefined();
      expect(action!.action).toBe("increase");
      // delta = (10-5)/100 * 100000 = 5000
      expect(action!.deltaUsd).toBeCloseTo(5000);
    });

    it("returns empty for zero capital", () => {
      const actions = svc.getRebalanceActions(0);
      expect(actions).toHaveLength(0);
    });
  });

  describe("persistence", () => {
    it("persists state to disk and reloads correctly", () => {
      svc.recordTrade("cash", 200, true);
      // Create a new instance pointing at the same dir
      const svc2 = new VinceSleeveAllocatorService(tmpDir);
      const sleeve = svc2.getSleeve("cash");
      expect(sleeve.activeTrades).toBe(1);
    });
  });

  describe("getInstance / setInstance", () => {
    it("setInstance and getInstance round-trip", () => {
      VinceSleeveAllocatorService.setInstance(svc);
      const inst = VinceSleeveAllocatorService.getInstance();
      expect(inst).toBe(svc);
    });
  });
});
