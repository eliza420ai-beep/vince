/**
 * SENTINEL_OPERATOR_DASHBOARD (#63)
 *
 * Aggregates live system health from all Phase 10 services and returns
 * a structured operator dashboard.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

// ==========================================
// Trigger detection
// ==========================================

const DASHBOARD_TRIGGERS = [
  "operator dashboard",
  "live status",
  "capital status",
  "circuit breaker status",
  "trading health",
  "system health",
  "show operator dashboard",
  "phase 10 status",
  "bucket status",
  "drift status",
];

function wantsDashboard(text: string): boolean {
  const lower = text.toLowerCase();
  return DASHBOARD_TRIGGERS.some((t) => lower.includes(t));
}

// ==========================================
// Data reading helpers (file-based fallback)
// ==========================================

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function readJsonl<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as T);
  } catch {
    return [];
  }
}

// ==========================================
// Types (inline — no hard dep on services)
// ==========================================

interface BreakerEntry {
  name: string;
  tripped: boolean;
  trippedAt?: string;
  reason?: string;
  autoReset: boolean;
}

interface BucketEntry {
  id: string;
  label: string;
  allocatedUsd: number;
  currentUsd: number;
  maxDrawdownPct: number;
  enabled: boolean;
  liveExecutionAllowed: boolean;
}

interface DriftEntry {
  timestamp: string;
  asset: string;
  driftPct: number;
  action: "none" | "warn" | "halt";
}

interface AuditEntry {
  timestamp: string;
  executionType: "paper" | "live";
  outcome?: "filled" | "rejected" | "error";
  rejectionReason?: string;
}

interface ReconEntry {
  reconciled: boolean;
  discrepancyUsd?: number;
}

// ==========================================
// Dashboard builder
// ==========================================

function buildDashboard(dataDir: string): string {
  const now = new Date().toISOString();

  // Circuit Breakers
  const breakers = readJson<BreakerEntry[]>(
    path.join(dataDir, "circuit-breakers.json"),
    [],
  );
  const anyTripped = breakers.some((b) => b.tripped);

  // Capital Buckets
  const buckets = readJson<BucketEntry[]>(
    path.join(dataDir, "capital-buckets.json"),
    [],
  );

  // Drift reports (last 24h)
  const allDrift = readJsonl<DriftEntry>(
    path.join(dataDir, "drift-reports.jsonl"),
  );
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;
  const recentDrift = allDrift.filter(
    (d) => new Date(d.timestamp).getTime() >= cutoff24h,
  );
  const maxDrift =
    recentDrift.length > 0 ? Math.max(...recentDrift.map((d) => d.driftPct)) : 0;
  const warnCount = recentDrift.filter(
    (d) => d.action === "warn" || d.action === "halt",
  ).length;
  const haltCount = recentDrift.filter((d) => d.action === "halt").length;
  const driftHalted = haltCount > 0;

  // Execution Audit (last 24h)
  const allAudit = readJsonl<AuditEntry>(
    path.join(dataDir, "execution-audit.jsonl"),
  );
  const recentAudit = allAudit.filter(
    (e) => new Date(e.timestamp).getTime() >= cutoff24h,
  );
  const paperCount = recentAudit.filter((e) => e.executionType === "paper").length;
  const liveCount = recentAudit.filter((e) => e.executionType === "live").length;
  const rejectedCount = recentAudit.filter((e) => e.outcome === "rejected").length;
  const rejectionRate =
    recentAudit.length > 0
      ? ((rejectedCount / recentAudit.length) * 100).toFixed(1)
      : "0.0";

  // Top rejection reason
  const reasonCounts = new Map<string, number>();
  for (const e of recentAudit) {
    if (e.outcome === "rejected" && e.rejectionReason) {
      reasonCounts.set(
        e.rejectionReason,
        (reasonCounts.get(e.rejectionReason) ?? 0) + 1,
      );
    }
  }
  const topRejection =
    reasonCounts.size > 0
      ? [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : "n/a";

  // P&L Reconciliation
  const allRecon = readJsonl<ReconEntry>(
    path.join(dataDir, "pnl-reconciliation.jsonl"),
  );
  const unreconciledCount = allRecon.filter((r) => !r.reconciled).length;
  const bigDiscrepancies = allRecon.filter(
    (r) =>
      r.reconciled &&
      r.discrepancyUsd !== undefined &&
      Math.abs(r.discrepancyUsd) > 10,
  ).length;

  // System Status
  let systemStatus: string;
  if (anyTripped || driftHalted) {
    systemStatus = "🔴 HALTED";
  } else if (warnCount > 0) {
    systemStatus = "🟡 DEGRADED";
  } else {
    systemStatus = "🟢 HEALTHY";
  }

  // Build output
  const lines: string[] = [];

  lines.push(`## Operator Dashboard — ${now}`);
  lines.push("");

  lines.push("### Circuit Breakers");
  if (breakers.length === 0) {
    lines.push("No data (circuit-breakers.json not found)");
  } else {
    for (const b of breakers) {
      const status = b.tripped ? "🔴 TRIPPED" : "🟢 CLEAR";
      const at = b.trippedAt ? ` | tripped: ${b.trippedAt}` : "";
      const reason = b.reason ? ` | reason: ${b.reason}` : "";
      lines.push(`- ${b.name} | ${status}${at}${reason}`);
    }
  }
  lines.push("");

  lines.push("### Capital Buckets");
  if (buckets.length === 0) {
    lines.push("No data (capital-buckets.json not found)");
  } else {
    for (const b of buckets) {
      const dd =
        b.allocatedUsd > 0
          ? (((b.allocatedUsd - b.currentUsd) / b.allocatedUsd) * 100).toFixed(
              1,
            )
          : "0.0";
      lines.push(
        `- ${b.id} | ${b.label} | $${b.currentUsd.toFixed(0)} / $${b.allocatedUsd.toFixed(0)} | dd: ${dd}% | enabled: ${b.enabled} | live: ${b.liveExecutionAllowed}`,
      );
    }
  }
  lines.push("");

  lines.push("### Drift Monitor (last 24h)");
  lines.push(
    `Max drift: ${maxDrift.toFixed(2)}% | Warns: ${warnCount} | Halts: ${haltCount}`,
  );
  lines.push("");

  lines.push("### Execution Audit (Last 24h)");
  lines.push(
    `Total: ${recentAudit.length} | Paper: ${paperCount} | Live: ${liveCount} | Rejection rate: ${rejectionRate}% | Top rejection: ${topRejection}`,
  );
  lines.push("");

  lines.push("### P&L Reconciliation");
  lines.push(
    `Unreconciled: ${unreconciledCount} | Discrepancies > $10: ${bigDiscrepancies}`,
  );
  lines.push("");

  lines.push("### System Status");
  lines.push(systemStatus);

  return lines.join("\n");
}

// ==========================================
// Action
// ==========================================

export const sentinelOperatorDashboardAction: Action = {
  name: "SENTINEL_OPERATOR_DASHBOARD",
  similes: [
    "OPERATOR_DASHBOARD",
    "LIVE_STATUS",
    "CAPITAL_STATUS",
    "CIRCUIT_BREAKER_STATUS",
    "TRADING_HEALTH",
    "SYSTEM_HEALTH",
  ],
  description:
    "Aggregates live system health: circuit breakers, capital buckets, drift monitor, execution audit, P&L reconciliation. Returns structured operator dashboard.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsDashboard(text);
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_OPERATOR_DASHBOARD] Action fired");
    try {
      const dataDir = path.join(process.cwd(), "data");
      const dashboard = buildDashboard(dataDir);
      await callback({ text: dashboard });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_OPERATOR_DASHBOARD] Failed:", error);
      await callback({
        text: "Dashboard could not be generated. Check data/ directory for circuit-breakers.json, capital-buckets.json, drift-reports.jsonl, execution-audit.jsonl, pnl-reconciliation.jsonl.",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Show operator dashboard" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "## Operator Dashboard — 2026-02-25T18:00:00.000Z\n\n### Circuit Breakers\n- daily-loss-limit | 🟢 CLEAR\n...\n### System Status\n🟢 HEALTHY",
        },
      },
    ],
  ],
};
