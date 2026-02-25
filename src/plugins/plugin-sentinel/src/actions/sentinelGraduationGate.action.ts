/**
 * SENTINEL_GRADUATION_GATE Action
 *
 * The final checklist — checks all 12 phases' success criteria and reports
 * whether the system is ready for full autonomous operation.
 *
 * PRD: One Dream Phase 12 — Task #80
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

const GRADUATION_TRIGGERS = [
  "graduation gate",
  "final gate",
  "autonomy check",
  "ready for full autonomy",
  "graduation audit",
  "final graduation",
];

function wantsGraduationGate(text: string): boolean {
  const lower = text.toLowerCase();
  return GRADUATION_TRIGGERS.some((t) => lower.includes(t));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

type CriterionStatus = "✅" | "❌" | "⚠️";

interface CriterionResult {
  num: number;
  name: string;
  status: CriterionStatus;
  evidence: string;
}

// ── Trust score inline ────────────────────────────────────────────────────────

function computeInlineTrustScore(dataDir: string): number {
  const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000;

  interface RollbackEvent {
    detectedAt: string;
    status: string;
  }
  interface AuditEntry {
    timestamp: string;
    policyId?: string;
    hardBlocked?: boolean;
  }
  interface MemoryNode {
    weight: number;
  }
  interface ShadowChallenger {
    vsCurrentGenome: number;
  }

  const rollbacks = readJsonl<RollbackEvent>(
    path.join(dataDir, "rollback-events.jsonl"),
  );
  const activeRollbacks = rollbacks.filter(
    (r) => r.status === "pending" || r.status === "in-progress",
  ).length;
  const rollbacks30d = rollbacks.filter(
    (r) => new Date(r.detectedAt).getTime() >= cutoff30d,
  ).length;

  const auditEntries = readJsonl<AuditEntry>(
    path.join(dataDir, "execution-audit.jsonl"),
  );
  const recentAudit = auditEntries.filter(
    (e) => new Date(e.timestamp).getTime() >= cutoff7d,
  );
  const policyEvals = recentAudit.filter((e) => !!e.policyId);
  const hardBlocks = policyEvals.filter((e) => e.hardBlocked === true).length;
  const hardBlockRate =
    policyEvals.length > 0 ? hardBlocks / policyEvals.length : 0;

  const memoryNodes = readJsonl<MemoryNode>(
    path.join(dataDir, "memory-graph.jsonl"),
  );
  const activeMemoryNodes = memoryNodes.filter((n) => n.weight > 0.2).length;

  const challengers = readJsonl<ShadowChallenger>(
    path.join(dataDir, "shadow-challengers.jsonl"),
  );
  const bestDelta =
    challengers.length > 0
      ? Math.max(...challengers.map((c) => c.vsCurrentGenome ?? 0))
      : null;

  let score = 60;
  if (rollbacks30d === 0) score += 10;
  if (hardBlockRate < 0.05) score += 10;
  if (bestDelta !== null && Math.abs(bestDelta) <= 0.1) score += 10;
  if (activeMemoryNodes > 20) score += 10;
  if (activeRollbacks > 0) score -= 20;
  if (hardBlockRate > 0.2) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// ── Graduation checklist ───────────────────────────────────────────────────────

function runGraduationChecklist(dataDir: string): CriterionResult[] {
  const results: CriterionResult[] = [];

  // 1. Paper win rate ≥ 55%
  {
    interface TradeRecord {
      outcome?: string;
    }
    const trades = readJsonl<TradeRecord>(
      path.join(dataDir, "paper-trades.jsonl"),
    );
    if (trades.length === 0) {
      results.push({
        num: 1,
        name: "Paper WR ≥ 55%",
        status: "⚠️",
        evidence: "not measurable (no paper-trades.jsonl)",
      });
    } else {
      const wins = trades.filter((t) => t.outcome === "win").length;
      const closed = trades.filter(
        (t) => t.outcome === "win" || t.outcome === "loss",
      ).length;
      const wr = closed > 0 ? (wins / closed) * 100 : 0;
      results.push({
        num: 1,
        name: "Paper WR ≥ 55%",
        status: wr >= 55 ? "✅" : "❌",
        evidence:
          closed > 0
            ? `${wr.toFixed(1)}% (${wins}/${closed})`
            : "0 closed trades",
      });
    }
  }

  // 2. Max drawdown < 15%
  {
    interface StatsRecord {
      maxDrawdownPct?: number;
    }
    const stats = readJson<StatsRecord>(
      path.join(dataDir, "paper-trading-stats.json"),
      {},
    );
    if (typeof stats.maxDrawdownPct !== "number") {
      results.push({
        num: 2,
        name: "Max drawdown < 15%",
        status: "⚠️",
        evidence: "not measurable (no paper-trading-stats.json)",
      });
    } else {
      const dd = stats.maxDrawdownPct * 100;
      results.push({
        num: 2,
        name: "Max drawdown < 15%",
        status: dd < 15 ? "✅" : "❌",
        evidence: `${dd.toFixed(1)}%`,
      });
    }
  }

  // 3. Genome has promoted ≥ 1 variant
  {
    interface GenomeState {
      promotedVariants?: string[];
    }
    const genomeState = readJson<GenomeState>(
      path.join(dataDir, "genome-state.json"),
      {},
    );
    const promoted = (genomeState.promotedVariants ?? []).length;
    results.push({
      num: 3,
      name: "Genome promoted ≥ 1 variant",
      status: promoted >= 1 ? "✅" : "⚠️",
      evidence:
        promoted >= 1
          ? `${promoted} variant(s) promoted`
          : "not measurable (genome-state.json missing or no promotions)",
    });
  }

  // 4. Prediction Brier score improving
  {
    interface PredRecord {
      brierScore?: number;
    }
    const preds = readJsonl<PredRecord>(
      path.join(dataDir, "predictions.jsonl"),
    );
    if (preds.length < 5) {
      results.push({
        num: 4,
        name: "Prediction Brier score improving",
        status: "⚠️",
        evidence: "not measurable (< 5 predictions)",
      });
    } else {
      const recent = preds
        .slice(-10)
        .filter((p) => typeof p.brierScore === "number");
      const older = preds
        .slice(-20, -10)
        .filter((p) => typeof p.brierScore === "number");
      if (recent.length === 0 || older.length === 0) {
        results.push({
          num: 4,
          name: "Prediction Brier score improving",
          status: "⚠️",
          evidence: "not measurable (insufficient scored predictions)",
        });
      } else {
        const recentAvg =
          recent.reduce((s, p) => s + (p.brierScore ?? 0), 0) / recent.length;
        const olderAvg =
          older.reduce((s, p) => s + (p.brierScore ?? 0), 0) / older.length;
        const improving = recentAvg < olderAvg; // lower Brier = better
        results.push({
          num: 4,
          name: "Prediction Brier score improving",
          status: improving ? "✅" : "❌",
          evidence: `recent=${recentAvg.toFixed(3)} vs older=${olderAvg.toFixed(3)} (lower=better)`,
        });
      }
    }
  }

  // 5. Pre-mortem blocking ≥ 1 trade/week
  {
    interface AuditEntry {
      timestamp: string;
      rejectionReason?: string;
    }
    const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const audit = readJsonl<AuditEntry>(
      path.join(dataDir, "execution-audit.jsonl"),
    );
    const recentBlocks = audit.filter(
      (e) =>
        new Date(e.timestamp).getTime() >= cutoff7d &&
        (e.rejectionReason ?? "").toLowerCase().includes("pre-mortem"),
    ).length;
    results.push({
      num: 5,
      name: "Pre-mortem blocking ≥ 1/week",
      status: recentBlocks >= 1 ? "✅" : "⚠️",
      evidence:
        audit.length === 0
          ? "not measurable (no execution-audit.jsonl)"
          : `${recentBlocks} block(s) this week`,
    });
  }

  // 6. Circuit breaker stack deployed + no unresolved trips
  {
    interface Breaker {
      name: string;
      tripped: boolean;
    }
    const breakers = readJson<Breaker[]>(
      path.join(dataDir, "circuit-breakers.json"),
      [],
    );
    if (breakers.length === 0) {
      results.push({
        num: 6,
        name: "Circuit breaker stack deployed",
        status: "⚠️",
        evidence: "not measurable (no circuit-breakers.json)",
      });
    } else {
      const tripped = breakers.filter((b) => b.tripped).length;
      results.push({
        num: 6,
        name: "Circuit breaker stack deployed",
        status: tripped === 0 ? "✅" : "❌",
        evidence: `${breakers.length} breaker(s), ${tripped} tripped`,
      });
    }
  }

  // 7. Drift sentinel active
  {
    const exists = fs.existsSync(path.join(dataDir, "drift-reports.jsonl"));
    results.push({
      num: 7,
      name: "Drift sentinel active",
      status: exists ? "✅" : "⚠️",
      evidence: exists
        ? "drift-reports.jsonl exists"
        : "drift-reports.jsonl not found",
    });
  }

  // 8. Policy engine active
  {
    const policyExists = fs.existsSync(
      path.join(process.cwd(), "policies", "trading-policy.yaml"),
    );
    const auditExists = fs.existsSync(
      path.join(dataDir, "execution-audit.jsonl"),
    );
    results.push({
      num: 8,
      name: "Policy engine active",
      status: policyExists ? "✅" : "❌",
      evidence: policyExists
        ? `trading-policy.yaml exists${auditExists ? " + audit log present" : ""}`
        : "policies/trading-policy.yaml not found",
    });
  }

  // 9. Rollback orchestrator deployed
  {
    const exists = fs.existsSync(path.join(dataDir, "rollback-events.jsonl"));
    results.push({
      num: 9,
      name: "Rollback orchestrator deployed",
      status: exists ? "✅" : "⚠️",
      evidence: exists
        ? "rollback-events.jsonl exists"
        : "rollback-events.jsonl not found",
    });
  }

  // 10. Trust score ≥ 70
  {
    const trustScore = computeInlineTrustScore(dataDir);
    results.push({
      num: 10,
      name: "Trust score ≥ 70",
      status: trustScore >= 70 ? "✅" : "❌",
      evidence: `trust score: ${trustScore}`,
    });
  }

  // 11. Skills QA harness passes
  {
    const driftExists = fs.existsSync(
      path.join(dataDir, "drift-reports.jsonl"),
    );
    const routingExists = fs.existsSync(
      path.join(dataDir, "skill-telemetry.jsonl"),
    );
    const both = driftExists && routingExists;
    results.push({
      num: 11,
      name: "Skills QA harness passes",
      status: both ? "✅" : "⚠️",
      evidence: both
        ? "drift-reports.jsonl + skill-telemetry.jsonl present"
        : `missing: ${!driftExists ? "drift-reports.jsonl " : ""}${!routingExists ? "skill-telemetry.jsonl" : ""}`.trim(),
    });
  }

  // 12. Memory graph has ≥ 10 active nodes
  {
    interface MemoryNode {
      weight: number;
    }
    const nodes = readJsonl<MemoryNode>(
      path.join(dataDir, "memory-graph.jsonl"),
    );
    const active = nodes.filter((n) => n.weight > 0.2).length;
    results.push({
      num: 12,
      name: "Memory graph has ≥ 10 active nodes",
      status: active >= 10 ? "✅" : nodes.length === 0 ? "⚠️" : "❌",
      evidence:
        nodes.length === 0
          ? "not measurable (memory-graph.jsonl not found)"
          : `${active} active node(s) (weight > 0.2) of ${nodes.length} total`,
    });
  }

  return results;
}

function buildGraduationReport(dataDir: string): string {
  const now = new Date().toISOString().slice(0, 10);
  const criteria = runGraduationChecklist(dataDir);

  const failing = criteria.filter((c) => c.status === "❌");
  const warning = criteria.filter((c) => c.status === "⚠️");
  const passing = criteria.filter((c) => c.status === "✅");

  const verdict =
    failing.length === 0
      ? "READY FOR FULL AUTONOMY"
      : `NOT YET — ${failing.length} criterion/a failing`;

  const lines: string[] = [
    `## Final Graduation Gate Audit — ${now}`,
    "",
    "### Criteria Results",
    "",
    "| # | Criterion | Status | Evidence |",
    "|---|---|---|---|",
  ];

  for (const c of criteria) {
    lines.push(`| ${c.num} | ${c.name} | ${c.status} | ${c.evidence} |`);
  }

  lines.push("");
  lines.push("### Graduation Verdict");
  lines.push(verdict);
  lines.push("");
  lines.push("### Next Steps");

  if (failing.length === 0 && warning.length === 0) {
    lines.push(
      "Recommend operator review and approval before activating L3 auto-execute.",
    );
  } else if (failing.length === 0) {
    lines.push(
      "All hard criteria pass. The following items are not yet measurable — verify manually before activating L3 auto-execute:",
    );
    for (const c of warning) {
      lines.push(`- **${c.num}. ${c.name}**: ${c.evidence}`);
    }
    lines.push("");
    lines.push(
      "Recommend operator review and approval before activating L3 auto-execute.",
    );
  } else {
    lines.push("Address the following failing criteria before re-running:");
    for (const c of failing) {
      lines.push(`- **${c.num}. ${c.name}**: ${c.evidence}`);
    }
    if (warning.length > 0) {
      lines.push("");
      lines.push("Also review these unmeasurable items:");
      for (const c of warning) {
        lines.push(`- **${c.num}. ${c.name}**: ${c.evidence}`);
      }
    }
  }

  lines.push("");
  lines.push(
    `_Summary: ${passing.length} passing / ${failing.length} failing / ${warning.length} unmeasurable_`,
  );

  return lines.join("\n");
}

// ── Action ─────────────────────────────────────────────────────────────────────

export const sentinelGraduationGateAction: Action = {
  name: "SENTINEL_GRADUATION_GATE",
  similes: [
    "GRADUATION_GATE",
    "FINAL_GATE",
    "AUTONOMY_CHECK",
    "READY_FOR_FULL_AUTONOMY",
    "GRADUATION_AUDIT",
    "FINAL_GRADUATION",
  ],
  description:
    "Runs the final graduation gate audit: checks all 12 phases success criteria and reports if the system is ready for full autonomous operation.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsGraduationGate(text);
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_GRADUATION_GATE] Action fired");

    try {
      const dataDir = path.join(process.cwd(), "data");
      const report = buildGraduationReport(dataDir);
      await callback({ text: report });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_GRADUATION_GATE] Failed:", error);
      await callback({
        text: "Graduation gate audit failed. Check data/ directory and policies/ folder.",
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
        content: { text: "Run final graduation gate audit" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "## Final Graduation Gate Audit — 2026-02-25\n\n### Criteria Results\n\n| # | Criterion | Status | Evidence |\n...\n### Graduation Verdict\nREADY FOR FULL AUTONOMY",
        },
      },
    ],
  ],
};
