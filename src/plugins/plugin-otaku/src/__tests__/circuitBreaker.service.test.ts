/**
 * Circuit Breaker Service Tests (#59)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { CircuitBreakerService } from "../services/circuitBreaker.service";

let tmpDir: string;
let svc: CircuitBreakerService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "circuit-breaker-test-"));
  CircuitBreakerService.setInstance(null as unknown as CircuitBreakerService);
  svc = new CircuitBreakerService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("CircuitBreakerService", () => {
  describe("isHalted — all clear", () => {
    it("returns false when no breakers tripped", () => {
      expect(svc.isHalted()).toBe(false);
    });

    it("getState returns 5 default breakers all clear", () => {
      const state = svc.getState();
      expect(state).toHaveLength(5);
      expect(state.every((b) => !b.tripped)).toBe(true);
    });
  });

  describe("trip + isHalted", () => {
    it("isHalted returns true after any breaker is tripped", () => {
      svc.trip("manual", "operator test");
      expect(svc.isHalted()).toBe(true);
    });

    it("records trippedAt and reason", () => {
      svc.trip("daily-loss-limit", "loss $250");
      const state = svc.getState();
      const b = state.find((s) => s.name === "daily-loss-limit")!;
      expect(b.tripped).toBe(true);
      expect(b.trippedAt).toBeDefined();
      expect(b.reason).toBe("loss $250");
    });

    it("persists to file", () => {
      svc.trip("manual", "test trip");
      const filePath = path.join(tmpDir, "circuit-breakers.json");
      expect(fs.existsSync(filePath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const manual = data.find((b: { name: string }) => b.name === "manual");
      expect(manual.tripped).toBe(true);
    });
  });

  describe("reset", () => {
    it("clears a tripped breaker", () => {
      svc.trip("manual", "test");
      expect(svc.isHalted()).toBe(true);
      svc.reset("manual");
      expect(svc.isHalted()).toBe(false);
    });

    it("clears trippedAt and reason on reset", () => {
      svc.trip("max-drawdown", "drawdown 20%");
      svc.reset("max-drawdown");
      const state = svc.getState();
      const b = state.find((s) => s.name === "max-drawdown")!;
      expect(b.tripped).toBe(false);
      expect(b.trippedAt).toBeUndefined();
      expect(b.reason).toBeUndefined();
    });
  });

  describe("resetAutoBreakers", () => {
    it("resets only autoReset=true breakers", () => {
      svc.trip("daily-loss-limit", "auto");  // autoReset=true
      svc.trip("max-drawdown", "manual");    // autoReset=false
      svc.resetAutoBreakers();

      const state = svc.getState();
      const daily = state.find((s) => s.name === "daily-loss-limit")!;
      const drawdown = state.find((s) => s.name === "max-drawdown")!;
      expect(daily.tripped).toBe(false);
      expect(drawdown.tripped).toBe(true); // not auto-reset
    });
  });

  describe("checkDailyLoss", () => {
    it("trips daily-loss-limit when loss exceeds threshold (default 200)", () => {
      svc.checkDailyLoss(150); // under limit
      expect(svc.isHalted()).toBe(false);

      svc.checkDailyLoss(250); // over limit
      expect(svc.isHalted()).toBe(true);
      const state = svc.getState();
      const b = state.find((s) => s.name === "daily-loss-limit")!;
      expect(b.tripped).toBe(true);
    });

    it("does not trip when loss equals threshold exactly", () => {
      svc.checkDailyLoss(200); // not strictly greater
      expect(svc.isHalted()).toBe(false);
    });
  });

  describe("checkConsecutiveLosses", () => {
    it("trips consecutive-losses after 5 consecutive losses (default)", () => {
      svc.checkConsecutiveLosses(["win", "loss", "loss", "loss", "loss", "loss"]);
      expect(svc.isHalted()).toBe(true);
      const state = svc.getState();
      const b = state.find((s) => s.name === "consecutive-losses")!;
      expect(b.tripped).toBe(true);
    });

    it("does not trip when there is a win in the last 5", () => {
      svc.checkConsecutiveLosses(["loss", "win", "loss", "loss", "loss"]);
      expect(svc.isHalted()).toBe(false);
    });

    it("does not trip with fewer outcomes than threshold", () => {
      svc.checkConsecutiveLosses(["loss", "loss"]);
      expect(svc.isHalted()).toBe(false);
    });

    it("trips on exactly N consecutive losses at end of array", () => {
      svc.checkConsecutiveLosses(["win", "win", "loss", "loss", "loss", "loss", "loss"]);
      expect(svc.isHalted()).toBe(true);
    });
  });

  describe("persistence", () => {
    it("restores tripped state after reload", () => {
      svc.trip("manual", "persisted trip");
      const svc2 = new CircuitBreakerService(tmpDir);
      expect(svc2.isHalted()).toBe(true);
    });
  });
});
