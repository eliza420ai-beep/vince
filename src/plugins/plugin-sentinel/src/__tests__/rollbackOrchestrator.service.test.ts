/**
 * Tests for RollbackOrchestratorService.
 * PRD: One Dream Phase 12 — Task #74
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { RollbackOrchestratorService } from "../services/rollbackOrchestrator.service";

let tmpDir: string;
let service: RollbackOrchestratorService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "rollback-orchestrator-test-"),
  );
  service = new RollbackOrchestratorService(tmpDir);
  // Clear env vars
  delete process.env.ROLLBACK_WIN_RATE_FLOOR;
  delete process.env.ROLLBACK_DRAWDOWN_CEILING;
  delete process.env.ROLLBACK_GENOME_DEGRADATION;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.ROLLBACK_WIN_RATE_FLOOR;
  delete process.env.ROLLBACK_DRAWDOWN_CEILING;
  delete process.env.ROLLBACK_GENOME_DEGRADATION;
});

// ─────────────────────────────────────────────────────────────────────────────

describe("checkTriggers — no trigger", () => {
  it("returns null when all metrics are healthy", () => {
    const trigger = service.checkTriggers({
      winRate: 0.6,
      drawdownPct: 0.1,
      genomeFitnessDelta: 0.05,
    });
    expect(trigger).toBeNull();
  });
});

describe("checkTriggers — win rate regression", () => {
  it("returns win-rate-regression when winRate < 0.45", () => {
    const trigger = service.checkTriggers({
      winRate: 0.4,
      drawdownPct: 0.1,
      genomeFitnessDelta: 0.0,
    });
    expect(trigger).toBe("win-rate-regression");
  });

  it("respects ROLLBACK_WIN_RATE_FLOOR env var", () => {
    process.env.ROLLBACK_WIN_RATE_FLOOR = "0.50";
    const svc = new RollbackOrchestratorService(tmpDir);
    const trigger = svc.checkTriggers({
      winRate: 0.48,
      drawdownPct: 0.05,
      genomeFitnessDelta: 0.0,
    });
    expect(trigger).toBe("win-rate-regression");
  });
});

describe("checkTriggers — drawdown threshold", () => {
  it("returns drawdown-threshold when drawdownPct > 0.20", () => {
    const trigger = service.checkTriggers({
      winRate: 0.55,
      drawdownPct: 0.25,
      genomeFitnessDelta: 0.0,
    });
    expect(trigger).toBe("drawdown-threshold");
  });
});

describe("checkTriggers — genome degradation", () => {
  it("returns genome-degradation when genomeFitnessDelta < -0.1", () => {
    const trigger = service.checkTriggers({
      winRate: 0.55,
      drawdownPct: 0.1,
      genomeFitnessDelta: -0.15,
    });
    expect(trigger).toBe("genome-degradation");
  });
});

describe("initiateRollback", () => {
  it("creates a rollback event with status pending", () => {
    const event = service.initiateRollback(
      "win-rate-regression",
      "genome-v3",
      "genome-v2",
    );
    expect(event.triggerId).toBeTruthy();
    expect(event.trigger).toBe("win-rate-regression");
    expect(event.status).toBe("pending");
    expect(event.fromState).toBe("genome-v3");
    expect(event.toState).toBe("genome-v2");
    expect(event.detectedAt).toBeTruthy();
  });

  it("persists rollback event to JSONL", () => {
    service.initiateRollback("drawdown-threshold", "from", "to");
    const filePath = path.join(tmpDir, "rollback-events.jsonl");
    expect(fs.existsSync(filePath)).toBe(true);
    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(lines).toHaveLength(1);
  });
});

describe("completeRollback", () => {
  it("marks rollback as completed on success", () => {
    const event = service.initiateRollback("manual", "current", "previous");
    service.completeRollback(event.triggerId, true, "Rolled back successfully");
    const history = service.getRollbackHistory();
    const updated = history.find((e) => e.triggerId === event.triggerId);
    expect(updated?.status).toBe("completed");
    expect(updated?.completedAt).toBeTruthy();
    expect(updated?.notes).toBe("Rolled back successfully");
  });

  it("marks rollback as failed on failure", () => {
    const event = service.initiateRollback("manual", "current", "previous");
    service.completeRollback(event.triggerId, false);
    const history = service.getRollbackHistory();
    const updated = history.find((e) => e.triggerId === event.triggerId);
    expect(updated?.status).toBe("failed");
  });
});

describe("hasPendingRollback", () => {
  it("returns false when no rollbacks exist", () => {
    expect(service.hasPendingRollback()).toBe(false);
  });

  it("returns true when a pending rollback exists", () => {
    service.initiateRollback("manual", "a", "b");
    expect(service.hasPendingRollback()).toBe(true);
  });

  it("returns false after rollback is completed", () => {
    const event = service.initiateRollback("manual", "a", "b");
    service.completeRollback(event.triggerId, true);
    expect(service.hasPendingRollback()).toBe(false);
  });
});

describe("getActiveRollbacks", () => {
  it("returns only pending and in-progress events", () => {
    const e1 = service.initiateRollback("manual", "a", "b");
    const e2 = service.initiateRollback("manual", "c", "d");
    service.completeRollback(e1.triggerId, true);

    const active = service.getActiveRollbacks();
    expect(active.map((e) => e.triggerId)).not.toContain(e1.triggerId);
    expect(active.map((e) => e.triggerId)).toContain(e2.triggerId);
  });
});
