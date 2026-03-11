/**
 * VinceCapitalBuckets Service Tests (#57)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  VinceCapitalBucketsService,
  setDriftSentinel,
} from "../services/vinceCapitalBuckets.service";

let tmpDir: string;
let svc: VinceCapitalBucketsService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "capital-buckets-test-"));
  // Reset singleton so each test gets a fresh instance
  VinceCapitalBucketsService.setInstance(
    null as unknown as VinceCapitalBucketsService,
  );
  svc = new VinceCapitalBucketsService(tmpDir);
  // Clear drift sentinel wiring
  setDriftSentinel({ shouldHalt: () => false });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("VinceCapitalBucketsService", () => {
  describe("getBucket", () => {
    it("returns paper bucket with defaults", () => {
      const b = svc.getBucket("paper");
      expect(b.id).toBe("paper");
      expect(b.enabled).toBe(true);
      expect(b.liveExecutionAllowed).toBe(false);
      expect(b.allocatedUsd).toBe(100000);
    });

    it("returns pilot bucket disabled by default", () => {
      const b = svc.getBucket("pilot");
      expect(b.enabled).toBe(false);
      expect(b.liveExecutionAllowed).toBe(false);
      expect(b.requiresConfirmation).toBe(true);
    });

    it("returns main bucket disabled by default", () => {
      const b = svc.getBucket("main");
      expect(b.enabled).toBe(false);
      expect(b.liveExecutionAllowed).toBe(false);
    });

    it("throws on unknown bucket id", () => {
      expect(() => svc.getBucket("unknown" as "paper")).toThrow();
    });
  });

  describe("getBuckets", () => {
    it("returns all 3 buckets", () => {
      const buckets = svc.getBuckets();
      expect(buckets).toHaveLength(3);
      expect(buckets.map((b) => b.id)).toContain("paper");
      expect(buckets.map((b) => b.id)).toContain("pilot");
      expect(buckets.map((b) => b.id)).toContain("main");
    });
  });

  describe("canExecute — blocked cases", () => {
    it("blocks paper bucket because liveExecutionAllowed=false", () => {
      const result = svc.canExecute("paper", 100);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("live-execution-not-allowed");
    });

    it("blocks pilot bucket because not enabled", () => {
      const result = svc.canExecute("pilot", 50);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("bucket-disabled");
    });

    it("blocks if trade size exceeds maxSingleTradeUsd", () => {
      // Enable pilot and allow live to test trade size check
      svc.updateBucketConfig("pilot", {
        enabled: true,
        liveExecutionAllowed: true,
      });
      const result = svc.canExecute("pilot", 200); // pilot max is 100
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("trade-size-exceeds-max");
    });

    it("blocks on drawdown breach", () => {
      svc.updateBucketConfig("pilot", {
        enabled: true,
        liveExecutionAllowed: true,
        allocatedUsd: 1000,
        maxDrawdownPct: 20,
      });
      // Simulate 30% drawdown
      svc.updateBucketValue("pilot", 700);
      const result = svc.canExecute("pilot", 50);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("drawdown-breached");
    });

    it("blocks when drift sentinel signals halt", () => {
      setDriftSentinel({ shouldHalt: () => true });
      // Even if bucket is fine, drift-halt takes precedence
      svc.updateBucketConfig("paper", {
        enabled: true,
        liveExecutionAllowed: true,
      });
      const result = svc.canExecute("paper", 100);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("drift-halt");
    });
  });

  describe("canExecute — allowed case", () => {
    it("allows when all gates pass", () => {
      svc.updateBucketConfig("pilot", {
        enabled: true,
        liveExecutionAllowed: true,
        allocatedUsd: 1000,
        currentUsd: 1000,
        maxSingleTradeUsd: 100,
        maxDrawdownPct: 20,
      });
      const result = svc.canExecute("pilot", 50);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("ok");
    });
  });

  describe("isDrawdownBreached", () => {
    it("returns false when no drawdown", () => {
      expect(svc.isDrawdownBreached("paper")).toBe(false);
    });

    it("returns true when drawdown exceeds threshold", () => {
      svc.updateBucketConfig("pilot", {
        allocatedUsd: 1000,
        maxDrawdownPct: 20,
      });
      svc.updateBucketValue("pilot", 750); // 25% drawdown
      expect(svc.isDrawdownBreached("pilot")).toBe(true);
    });

    it("returns false when drawdown is within threshold", () => {
      svc.updateBucketConfig("pilot", {
        allocatedUsd: 1000,
        maxDrawdownPct: 20,
      });
      svc.updateBucketValue("pilot", 850); // 15% drawdown
      expect(svc.isDrawdownBreached("pilot")).toBe(false);
    });
  });

  describe("updateBucketValue", () => {
    it("updates currentUsd", () => {
      svc.updateBucketValue("paper", 95000);
      expect(svc.getBucket("paper").currentUsd).toBe(95000);
    });

    it("persists to file", () => {
      svc.updateBucketValue("paper", 99000);
      // Create new instance from same dir — should read the persisted value
      const svc2 = new VinceCapitalBucketsService(tmpDir);
      expect(svc2.getBucket("paper").currentUsd).toBe(99000);
    });
  });

  describe("persistence", () => {
    it("loads saved state on construction", () => {
      svc.updateBucketConfig("pilot", {
        enabled: true,
        liveExecutionAllowed: false,
      });
      const svc2 = new VinceCapitalBucketsService(tmpDir);
      expect(svc2.getBucket("pilot").enabled).toBe(true);
    });
  });
});
