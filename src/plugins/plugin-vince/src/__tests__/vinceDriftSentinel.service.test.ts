/**
 * VinceDriftSentinel Service Tests (#58)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceDriftSentinelService } from "../services/vinceDriftSentinel.service";

let tmpDir: string;
let svc: VinceDriftSentinelService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "drift-sentinel-test-"));
  VinceDriftSentinelService.setInstance(
    null as unknown as VinceDriftSentinelService,
  );
  svc = new VinceDriftSentinelService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("VinceDriftSentinelService", () => {
  describe("recordDrift — action classification", () => {
    it("action=none when drift is below warn threshold (5%)", () => {
      const r = svc.recordDrift("BTC", 2.0, 4.0); // drift = 2%
      expect(r.driftPct).toBeCloseTo(2);
      expect(r.action).toBe("none");
      expect(r.driftBreached).toBe(false);
    });

    it("action=warn when drift > 5% and <= 15%", () => {
      const r = svc.recordDrift("BTC", 0, 8); // drift = 8%
      expect(r.driftPct).toBeCloseTo(8);
      expect(r.action).toBe("warn");
      expect(r.driftBreached).toBe(true);
    });

    it("action=halt when drift > 15%", () => {
      const r = svc.recordDrift("BTC", 0, 20); // drift = 20%
      expect(r.driftPct).toBeCloseTo(20);
      expect(r.action).toBe("halt");
      expect(r.driftBreached).toBe(true);
    });

    it("uses abs(live - paper) regardless of sign", () => {
      const r = svc.recordDrift("ETH", 10, -10); // drift = 20%
      expect(r.driftPct).toBeCloseTo(20);
      expect(r.action).toBe("halt");
    });

    it("persists reports to JSONL file", () => {
      svc.recordDrift("BTC", 0, 3);
      const filePath = path.join(tmpDir, "drift-reports.jsonl");
      expect(fs.existsSync(filePath)).toBe(true);
      const lines = fs
        .readFileSync(filePath, "utf-8")
        .split("\n")
        .filter(Boolean);
      expect(lines).toHaveLength(1);
      const record = JSON.parse(lines[0]);
      expect(record.asset).toBe("BTC");
    });
  });

  describe("shouldHalt", () => {
    it("returns false with no drift reports", () => {
      expect(svc.shouldHalt()).toBe(false);
    });

    it("returns false when only warn reports exist", () => {
      svc.recordDrift("BTC", 0, 8); // warn
      expect(svc.shouldHalt()).toBe(false);
    });

    it("returns true when halt report exists in last 24h", () => {
      svc.recordDrift("BTC", 0, 20); // halt
      expect(svc.shouldHalt()).toBe(true);
    });

    it("filters by asset when provided", () => {
      svc.recordDrift("BTC", 0, 20); // halt for BTC
      expect(svc.shouldHalt("ETH")).toBe(false);
      expect(svc.shouldHalt("BTC")).toBe(true);
    });
  });

  describe("getMaxDrift", () => {
    it("returns 0 when no reports", () => {
      expect(svc.getMaxDrift(24)).toBe(0);
    });

    it("returns max drift over window", () => {
      svc.recordDrift("BTC", 0, 3); // drift 3%
      svc.recordDrift("ETH", 0, 10); // drift 10%
      svc.recordDrift("SOL", 0, 7); // drift 7%
      expect(svc.getMaxDrift(24)).toBeCloseTo(10);
    });
  });

  describe("getWarnCount", () => {
    it("returns 0 with no reports", () => {
      expect(svc.getWarnCount(24)).toBe(0);
    });

    it("counts warn and halt events", () => {
      svc.recordDrift("BTC", 0, 3); // none
      svc.recordDrift("ETH", 0, 8); // warn
      svc.recordDrift("SOL", 0, 20); // halt
      expect(svc.getWarnCount(24)).toBe(2);
    });
  });

  describe("getRecentDrift", () => {
    it("returns all reports within the window", () => {
      svc.recordDrift("BTC", 1, 2);
      svc.recordDrift("ETH", 3, 4);
      const reports = svc.getRecentDrift(24);
      expect(reports).toHaveLength(2);
    });
  });
});
