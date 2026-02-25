/**
 * Execution Audit Service Tests (#60)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ExecutionAuditService } from "../services/executionAudit.service";

let tmpDir: string;
let svc: ExecutionAuditService;

const SAMPLE_ENTRY = {
  tradeId: "trade-1",
  asset: "BTC",
  direction: "long" as const,
  sizeSizeUsd: 100,
  bucketId: "paper",
  executionType: "paper" as const,
  decisionSource: "signal-aggregator",
  preFlightChecks: {
    circuitBreakerClear: true,
    bucketEnabled: true,
    driftClear: true,
    premortemPassed: true,
    warRoomPassed: true,
  },
  outcome: "filled" as const,
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "exec-audit-test-"));
  ExecutionAuditService.setInstance(null as unknown as ExecutionAuditService);
  svc = new ExecutionAuditService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("ExecutionAuditService", () => {
  describe("log", () => {
    it("appends an entry with auditId and timestamp", () => {
      svc.log(SAMPLE_ENTRY);
      const filePath = path.join(tmpDir, "execution-audit.jsonl");
      expect(fs.existsSync(filePath)).toBe(true);
      const lines = fs
        .readFileSync(filePath, "utf-8")
        .split("\n")
        .filter(Boolean);
      expect(lines).toHaveLength(1);
      const entry = JSON.parse(lines[0]);
      expect(entry.auditId).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.tradeId).toBe("trade-1");
    });

    it("is append-only: multiple logs add multiple lines", () => {
      svc.log(SAMPLE_ENTRY);
      svc.log({ ...SAMPLE_ENTRY, tradeId: "trade-2" });
      const filePath = path.join(tmpDir, "execution-audit.jsonl");
      const lines = fs
        .readFileSync(filePath, "utf-8")
        .split("\n")
        .filter(Boolean);
      expect(lines).toHaveLength(2);
    });

    it("generates unique auditIds", () => {
      svc.log(SAMPLE_ENTRY);
      svc.log({ ...SAMPLE_ENTRY, tradeId: "trade-2" });
      const entries = svc.getAuditTrail();
      expect(entries[0].auditId).not.toBe(entries[1].auditId);
    });
  });

  describe("getAuditTrail", () => {
    it("returns all entries when no filter", () => {
      svc.log(SAMPLE_ENTRY);
      svc.log({ ...SAMPLE_ENTRY, tradeId: "trade-2" });
      expect(svc.getAuditTrail()).toHaveLength(2);
    });

    it("filters by tradeId", () => {
      svc.log(SAMPLE_ENTRY);
      svc.log({ ...SAMPLE_ENTRY, tradeId: "trade-2" });
      const filtered = svc.getAuditTrail("trade-1");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].tradeId).toBe("trade-1");
    });

    it("returns empty array when tradeId not found", () => {
      svc.log(SAMPLE_ENTRY);
      expect(svc.getAuditTrail("nonexistent")).toHaveLength(0);
    });
  });

  describe("getRecentAudit", () => {
    it("returns entries within the time window", () => {
      svc.log(SAMPLE_ENTRY);
      const recent = svc.getRecentAudit(24);
      expect(recent).toHaveLength(1);
    });
  });

  describe("getRejectionStats", () => {
    it("returns empty when no rejections", () => {
      svc.log(SAMPLE_ENTRY); // outcome: filled
      expect(svc.getRejectionStats()).toHaveLength(0);
    });

    it("aggregates rejection reasons", () => {
      svc.log({
        ...SAMPLE_ENTRY,
        tradeId: "t1",
        outcome: "rejected",
        rejectionReason: "circuit-breaker",
      });
      svc.log({
        ...SAMPLE_ENTRY,
        tradeId: "t2",
        outcome: "rejected",
        rejectionReason: "circuit-breaker",
      });
      svc.log({
        ...SAMPLE_ENTRY,
        tradeId: "t3",
        outcome: "rejected",
        rejectionReason: "drift-halt",
      });

      const stats = svc.getRejectionStats();
      expect(stats).toHaveLength(2);
      expect(stats[0].reason).toBe("circuit-breaker");
      expect(stats[0].count).toBe(2);
      expect(stats[1].reason).toBe("drift-halt");
      expect(stats[1].count).toBe(1);
    });

    it("counts unknown reason for entries without rejectionReason", () => {
      svc.log({ ...SAMPLE_ENTRY, tradeId: "t1", outcome: "rejected" });
      const stats = svc.getRejectionStats();
      expect(stats[0].reason).toBe("unknown");
      expect(stats[0].count).toBe(1);
    });
  });
});
