/**
 * KELLY_TRUST_DASHBOARD Action
 *
 * Aggregates trust signals from across the system and presents a unified
 * trust score and transparency report.
 *
 * PRD: One Dream Phase 12 — Task #78
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

const TRUST_TRIGGERS = [
  "trust dashboard",
  "system trust",
  "trust score",
  "governance dashboard",
  "autonomous health",
  "trust transparency",
];

function wantsTrustDashboard(text: string): boolean {
  const lower = text.toLowerCase();
  return TRUST_TRIGGERS.some((t) => lower.includes(t));
}

// ── Data reading helpers ─────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface RollbackEvent {
  triggerId: string;
  trigger: string;
  detectedAt: string;
  status: "pending" | "in-progress" | "completed" | "failed";
}

interface MemoryNode {
  weight: number;
}

interface AuditEntry {
  timestamp: string;
  policyId?: string;
  auditRef?: string;
  hardBlocked?: boolean;
  softWarned?: boolean;
}

interface ShadowSummary {
  id: string;
  fitness: number;
  vsCurrentGenome: number;
}

// ── Trust score computation ────────────────────────────────────────────────────

interface TrustInputs {
  activeRollbacks: number;
  rollbacksLast30Days: number;
  hardBlockRate: number; // 0–1
  challengerVsGenomeDelta: number | null; // null if no challengers
  activeMemoryNodes: number; // weight > 0.2
}

function computeTrustScore(inputs: TrustInputs): number {
  let score = 60;

  if (inputs.rollbacksLast30Days === 0) score += 10;
  if (inputs.hardBlockRate < 0.05) score += 10;
  if (
    inputs.challengerVsGenomeDelta !== null &&
    Math.abs(inputs.challengerVsGenomeDelta) <= 0.1
  ) {
    score += 10;
  }
  if (inputs.activeMemoryNodes > 20) score += 10;
  if (inputs.activeRollbacks > 0) score -= 20;
  if (inputs.hardBlockRate > 0.2) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function trustLabel(score: number): string {
  if (score >= 80) return "TRUSTED";
  if (score >= 60) return "PROVISIONAL";
  return "REVIEW REQUIRED";
}

function governanceHealth(score: number, activeRollbacks: number): string {
  if (activeRollbacks > 0)
    return "ACTION REQUIRED — Active rollback in progress";
  if (score >= 80) return "HEALTHY — All systems nominal";
  if (score >= 60) return "MONITORING — Some metrics below target";
  return "ACTION REQUIRED — Trust score below acceptable threshold";
}

// ── Dashboard builder ──────────────────────────────────────────────────────────

function buildTrustDashboard(dataDir: string): string {
  const now = new Date().toISOString().slice(0, 10);
  const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // ── Policy ──
  const auditEntries = readJsonl<AuditEntry>(
    path.join(dataDir, "execution-audit.jsonl"),
  );
  const recentAudit = auditEntries.filter(
    (e) => new Date(e.timestamp).getTime() >= cutoff7d,
  );
  const policyEvals = recentAudit.filter((e) => !!e.policyId);
  const hardBlocks = policyEvals.filter((e) => e.hardBlocked === true).length;
  const softWarns = policyEvals.filter((e) => e.softWarned === true).length;
  const hardBlockRate =
    policyEvals.length > 0 ? hardBlocks / policyEvals.length : 0;
  const lastEval =
    policyEvals.length > 0
      ? policyEvals[policyEvals.length - 1].timestamp
      : "none";
  const activePolicyId =
    policyEvals.length > 0
      ? (policyEvals[policyEvals.length - 1].policyId ?? "trading-v1")
      : "trading-v1";

  // Try to read policy file directly
  let policyFileId = "trading-v1";
  let policyVersion = "1.0";
  try {
    const policyPath = path.join(
      process.cwd(),
      "policies",
      "trading-policy.yaml",
    );
    if (fs.existsSync(policyPath)) {
      const raw = fs.readFileSync(policyPath, "utf-8");
      const idMatch = raw.match(/policyId:\s*["']?([^"'\n]+)["']?/);
      const verMatch = raw.match(/version:\s*["']?([^"'\n]+)["']?/);
      if (idMatch) policyFileId = idMatch[1].trim();
      if (verMatch) policyVersion = verMatch[1].trim();
    }
  } catch {
    // ignore
  }
  const displayPolicyId = activePolicyId || policyFileId;

  // ── Rollback ──
  const allRollbacks = readJsonl<RollbackEvent>(
    path.join(dataDir, "rollback-events.jsonl"),
  );
  const activeRollbacks = allRollbacks.filter(
    (r) => r.status === "pending" || r.status === "in-progress",
  );
  const last30dRollbacks = allRollbacks.filter(
    (r) => new Date(r.detectedAt).getTime() >= cutoff30d,
  );
  const lastRollback =
    allRollbacks.length > 0
      ? [...allRollbacks].reverse().find((r) => r.detectedAt)
      : null;

  // ── Shadow Challengers ──
  const challengers = readJsonl<ShadowSummary>(
    path.join(dataDir, "shadow-challengers.jsonl"),
  );
  const promotionCandidates = challengers.filter(
    (c) => (c as unknown as { promotionReady: boolean }).promotionReady,
  );
  const bestChallenger =
    challengers.length > 0
      ? challengers.reduce((best, c) =>
          (c.vsCurrentGenome ?? 0) > (best.vsCurrentGenome ?? 0) ? c : best,
        )
      : null;
  const bestDelta =
    bestChallenger !== null
      ? (bestChallenger.vsCurrentGenome >= 0 ? "+" : "") +
        (bestChallenger.vsCurrentGenome * 100).toFixed(1) +
        "%"
      : "-";

  // ── Memory ──
  const memoryNodes = readJsonl<MemoryNode>(
    path.join(dataDir, "memory-graph.jsonl"),
  );
  const activeMemoryNodes = memoryNodes.filter((n) => n.weight > 0.2).length;
  const avgWeight =
    memoryNodes.length > 0
      ? memoryNodes.reduce((s, n) => s + n.weight, 0) / memoryNodes.length
      : 0;

  // ── Trust Score ──
  const trustInputs: TrustInputs = {
    activeRollbacks: activeRollbacks.length,
    rollbacksLast30Days: last30dRollbacks.length,
    hardBlockRate,
    challengerVsGenomeDelta: bestChallenger?.vsCurrentGenome ?? null,
    activeMemoryNodes,
  };
  const trustScore = computeTrustScore(trustInputs);
  const label = trustLabel(trustScore);
  const health = governanceHealth(trustScore, activeRollbacks.length);

  // ── Build output ──
  const lines: string[] = [
    `## Trust Transparency Dashboard — ${now}`,
    "",
    `### Trust Score: ${trustScore} — ${label}`,
    "",
    "### Policy Compliance",
    `- Active policy: ${displayPolicyId} v${policyVersion}`,
    `- Last evaluation: ${lastEval}`,
    `- Hard blocks this week: ${hardBlocks}`,
    `- Soft warnings this week: ${softWarns}`,
    "",
    "### Rollback Status",
    `- Active rollbacks: ${activeRollbacks.length > 0 ? activeRollbacks.length : "None"}`,
    `- Last rollback: ${lastRollback ? `${lastRollback.detectedAt.slice(0, 10)} (${lastRollback.trigger})` : "None"}`,
    `- Rollback history (30 days): ${last30dRollbacks.length}`,
    "",
    "### Shadow Challenger",
    `- Active challengers: ${challengers.length}`,
    `- Promotion candidates: ${promotionCandidates.length}`,
    `- Best challenger vs genome: ${bestDelta}`,
    "",
    "### Memory Integrity",
    `- Memory nodes: ${memoryNodes.length}`,
    `- Avg node weight: ${avgWeight.toFixed(2)}`,
    `- Active nodes (weight > 0.2): ${activeMemoryNodes}`,
    "",
    "### Governance Health",
    health,
  ];

  return lines.join("\n");
}

// ── Action ─────────────────────────────────────────────────────────────────────

export const kellyTrustDashboardAction: Action = {
  name: "KELLY_TRUST_DASHBOARD",
  similes: [
    "TRUST_DASHBOARD",
    "SYSTEM_TRUST",
    "TRUST_SCORE",
    "GOVERNANCE_DASHBOARD",
    "AUTONOMOUS_HEALTH",
    "TRUST_TRANSPARENCY",
  ],
  description:
    "Aggregates trust signals from policy engine, rollback orchestrator, shadow challengers, and memory graph into a unified trust score and transparency report.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsTrustDashboard(text);
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[KELLY_TRUST_DASHBOARD] Action fired");

    try {
      const dataDir = path.join(process.cwd(), "data");
      const dashboard = buildTrustDashboard(dataDir);
      await callback({ text: dashboard });
      return { success: true };
    } catch (error) {
      logger.error("[KELLY_TRUST_DASHBOARD] Failed:", error);
      await callback({
        text: "Trust dashboard could not be generated. Ensure data/ directory exists with rollback-events.jsonl, shadow-challengers.jsonl, memory-graph.jsonl, and execution-audit.jsonl.",
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
        content: { text: "Show trust transparency dashboard" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "## Trust Transparency Dashboard — 2026-02-25\n\n### Trust Score: 80 — TRUSTED\n...",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "What's the system trust score?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "## Trust Transparency Dashboard — 2026-02-25\n\n### Trust Score: 70 — PROVISIONAL\n...",
        },
      },
    ],
  ],
};
