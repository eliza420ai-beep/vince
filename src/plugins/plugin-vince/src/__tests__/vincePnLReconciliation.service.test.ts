/**
 * VincePnLReconciliation Service Tests (#62)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VincePnLReconciliationService } from "../services/vincePnLReconciliation.service";

let tmpDir: string;
let svc: VincePnLReconciliationService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pnl-recon-test-"));
  VincePnLReconciliationService.setInstance(
    null as unknown as VincePnLReconciliationService,
  );
  svc = new VincePnLReconciliationService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("VincePnLReconciliationService", () => {
  describe("recordPaper", () => {
    it("stores paper P&L as unreconciled", () => {
      svc.recordPaper("trade-1", "BTC", 50);
      const unreconciled = svc.getUnreconciled();
      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].tradeId).toBe("trade-1");
      expect(unreconciled[0].paperPnlUsd).toBe(50);
      expect(unreconciled[0].reconciled).toBe(false);
    });

    it("persists to JSONL file", () => {
      svc.recordPaper("trade-1", "BTC", 50);
      const filePath = path.join(tmpDir, "pnl-reconciliation.jsonl");
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe("recordLive — reconciliation", () => {
    it("reconciles a paper trade with live P&L", () => {
      svc.recordPaper("trade-1", "BTC", 100);
      svc.recordLive("trade-1", 95);

      const unreconciled = svc.getUnreconciled();
      expect(unreconciled).toHaveLength(0);

      const discrepancies = svc.getDiscrepancies(0);
      expect(discrepancies).toHaveLength(1);
      expect(discrepancies[0].reconciled).toBe(true);
      expect(discrepancies[0].livePnlUsd).toBe(95);
      expect(discrepancies[0].discrepancyUsd).toBeCloseTo(-5);
    });

    it("computes discrepancyPct correctly", () => {
      svc.recordPaper("trade-2", "ETH", 200);
      svc.recordLive("trade-2", 180);

      const recs = svc.getDiscrepancies(0);
      const rec = recs.find((r) => r.tradeId === "trade-2")!;
      expect(rec.discrepancyPct).toBeCloseTo(-10); // -20 / 200 * 100
    });

    it("does nothing if tradeId not found", () => {
      svc.recordPaper("trade-1", "BTC", 50);
      svc.recordLive("unknown-trade", 40);
      // No crash, trade-1 remains unreconciled
      expect(svc.getUnreconciled()).toHaveLength(1);
    });
  });

  describe("getUnreconciled", () => {
    it("returns empty when no records", () => {
      expect(svc.getUnreconciled()).toHaveLength(0);
    });

    it("returns only unreconciled records", () => {
      svc.recordPaper("t1", "BTC", 10);
      svc.recordPaper("t2", "ETH", 20);
      svc.recordLive("t1", 9);

      const unreconciled = svc.getUnreconciled();
      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].tradeId).toBe("t2");
    });
  });

  describe("getDiscrepancies", () => {
    it("returns records where |discrepancyUsd| exceeds threshold", () => {
      svc.recordPaper("t1", "BTC", 100);
      svc.recordLive("t1", 85); // discrepancy = -15

      svc.recordPaper("t2", "ETH", 100);
      svc.recordLive("t2", 98); // discrepancy = -2

      const large = svc.getDiscrepancies(10);
      expect(large).toHaveLength(1);
      expect(large[0].tradeId).toBe("t1");

      const small = svc.getDiscrepancies(1);
      expect(small).toHaveLength(2);
    });
  });

  describe("reconcileAll", () => {
    it("bulk reconciles from a map", () => {
      svc.recordPaper("t1", "BTC", 100);
      svc.recordPaper("t2", "ETH", 200);
      svc.recordPaper("t3", "SOL", 50);

      svc.reconcileAll({
        "t1": 95,
        "t2": 210,
      });

      const unreconciled = svc.getUnreconciled();
      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].tradeId).toBe("t3");

      const all = svc.getDiscrepancies(0);
      const t1 = all.find((r) => r.tradeId === "t1")!;
      expect(t1.livePnlUsd).toBe(95);
      expect(t1.discrepancyUsd).toBeCloseTo(-5);
    });
  });
});
