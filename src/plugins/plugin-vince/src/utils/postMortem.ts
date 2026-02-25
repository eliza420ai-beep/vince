/**
 * Post-mortem writer: when a paper trade closes at a loss, ask Echo, Oracle, Solus
 * via direct useModel (bypass shouldRespond/IGNORE) and write a structured markdown
 * file under docs/standup/post-mortems/.
 * PRD: One Dream — Agent Synergy (§5.4, Phase 2).
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type { Position } from "../types/paperTrading";
import { getElizaOS } from "../../../plugin-inter-agent/src/types";

const TIMEOUT_MS = 60_000;
const QUALITY_THRESHOLD = 75;

type PostMortemCause =
  | "thesis_invalid"
  | "regime_conflict"
  | "sizing_too_aggressive"
  | "stop_too_tight_for_vol"
  | "agent_lane_mismatch"
  | "missing_pretrade_data"
  | "execution_or_slippage"
  | "unknown_insufficient_evidence";

type PtqgAssetClass = "crypto" | "equity" | "commodity" | "other";
type PtqgThesisClass =
  | "momentum"
  | "mean_reversion"
  | "event"
  | "regime"
  | "other";

interface PtqgMeta {
  assetClass: PtqgAssetClass;
  thesisClass: PtqgThesisClass;
  entryTimestampUtc: string;
  expectedHoldWindow: string;
  leverage: number;
  stopDistancePct: number;
  maxLossUsd: number;
  maxLossPct: number;
  catalystFlag: boolean;
  lowConfidenceMode: boolean;
  blocked: boolean;
}

interface EvidencePack {
  holdMinutes: number;
  adverseMovePct: number;
  pmevCompletenessPct: number;
  missingData: string[];
  sentimentSnapshotRef: string;
  regimeSnapshotRef: string;
  ptqgComplete: boolean;
  entryAtrPct?: number;
}

interface AgentFinding {
  agent: "Echo" | "Oracle" | "Solus";
  lane: string;
  reply: string;
  confidence: number;
  sourceStamp: string;
  missingData: string[];
}

interface CorrectiveAction {
  owner: "vince" | "sentinel" | "echo" | "oracle" | "solus" | "human";
  dueWindow: "next_trade" | "72h" | "7d";
  type: "immediate" | "policy" | "experiment";
  action: string;
  successMetric: string;
  rollbackCondition: string;
}

interface QualityBreakdown {
  completeness: number;
  evidenceQuality: number;
  diagnosisDepth: number;
  actionability: number;
  ownershipClarity: number;
  total: number;
  escalate: boolean;
}

interface StructuredPostMortem {
  ptqg: PtqgMeta;
  evidence: EvidencePack;
  findings: AgentFinding[];
  primaryCause: PostMortemCause;
  secondaryCauses: PostMortemCause[];
  actions: CorrectiveAction[];
  quality: QualityBreakdown;
  nextTradePolicyDelta: string[];
}

/**
 * Ask an agent for post-mortem feedback using direct useModel (same approach as
 * standup round-robin). Falls back to handleMessage if the agent runtime is
 * not available, but WITHOUT the .then() race condition.
 */
async function askAgent(
  eliza: NonNullable<ReturnType<typeof getElizaOS>>,
  agentId: string,
  agentName: string,
  question: string,
): Promise<string> {
  // Direct path: useModel bypasses shouldRespond / IGNORE
  const getAgent = eliza.getAgent?.bind?.(eliza) ?? eliza.getAgent;
  const agentRuntime = getAgent?.(agentId);
  if (agentRuntime?.useModel) {
    try {
      const prompt = `You are ${agentName}. A teammate (Vince) is asking you for trade post-mortem feedback. Answer in 2–4 sentences from your domain expertise. Be specific and direct.\n\nQuestion: ${question}`;
      const resp = await agentRuntime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        maxTokens: 200,
        temperature: 0.7,
      });
      const text = String(resp ?? "").trim();
      if (text) return text;
    } catch (err) {
      logger.warn(
        { err, agentName },
        "[VincePostMortem] Direct useModel failed; falling back to handleMessage.",
      );
    }
  }

  // Fallback: handleMessage without .then() race condition
  const roomId = crypto.randomUUID();
  const entityId = crypto.randomUUID();
  const content = `[To ${agentName} — you are being asked for a trade post-mortem. Answer in 2–4 sentences.][From Vince]: ${question}`;
  const userMsg = {
    id: crypto.randomUUID(),
    entityId,
    roomId,
    content: { text: content, source: "vince_post_mortem" },
    createdAt: Date.now(),
  };

  return new Promise<string>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      logger.warn(
        `[VincePostMortem] ${agentName} timed out after ${TIMEOUT_MS}ms`,
      );
      resolve("");
    }, TIMEOUT_MS);

    const onResponse = (resp: unknown) => {
      if (settled) return;
      if (!resp || typeof resp !== "object") return;
      const c = resp as Record<string, unknown>;
      const text =
        typeof c.text === "string"
          ? c.text.trim()
          : typeof c.message === "string"
            ? (c.message as string).trim()
            : typeof c.thought === "string"
              ? (c.thought as string).trim()
              : "";
      if (text) {
        settled = true;
        clearTimeout(timeoutId);
        resolve(text);
      }
    };

    eliza
      .handleMessage(agentId, userMsg, {
        onResponse,
        onComplete: () => {
          // Only resolve if onResponse never fired
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            resolve("");
          }
        },
        onError: (err: Error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutId);
            logger.warn(
              `[VincePostMortem] ${agentName} handleMessage error: ${err.message}`,
            );
            resolve("");
          }
        },
      })
      .catch((err: unknown) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          logger.warn(
            `[VincePostMortem] ${agentName} handleMessage rejected: ${err}`,
          );
          resolve("");
        }
      });
  });
}

function toBool(value: unknown, fallback: boolean = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return fallback;
}

function toNum(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function inferAssetClass(asset: string): PtqgAssetClass {
  const upper = (asset || "").toUpperCase();
  const crypto = new Set([
    "BTC",
    "ETH",
    "SOL",
    "HYPE",
    "XRP",
    "DOGE",
    "ADA",
    "AVAX",
    "LINK",
  ]);
  const commodities = new Set(["GOLD", "SILVER", "OIL"]);
  if (crypto.has(upper)) return "crypto";
  if (commodities.has(upper)) return "commodity";
  if (/^[A-Z]{1,6}$/.test(upper)) return "equity";
  return "other";
}

function buildPtqgMeta(position: Position): PtqgMeta {
  const meta = (position.metadata ?? {}) as Record<string, unknown>;
  const ptqg = (meta.ptqgMeta ?? {}) as Record<string, unknown>;

  const stopDistancePctRaw =
    toNum(ptqg.stopDistancePct) ??
    Math.abs(
      ((position.stopLossPrice - position.entryPrice) / position.entryPrice) *
        100,
    );
  const maxLossUsdRaw =
    toNum(ptqg.maxLossUsd) ??
    toNum(meta.slLossUsd) ??
    position.sizeUsd * (stopDistancePctRaw / 100);
  const maxLossPctRaw =
    toNum(ptqg.maxLossPct) ??
    (position.marginUsd > 0 ? maxLossUsdRaw / position.marginUsd : 0) * 100;

  return {
    assetClass:
      (ptqg.assetClass as PtqgAssetClass | undefined) ??
      inferAssetClass(position.asset),
    thesisClass: (ptqg.thesisClass as PtqgThesisClass | undefined) ?? "other",
    entryTimestampUtc:
      (ptqg.entryTimestampUtc as string | undefined) ??
      new Date(position.openedAt).toISOString(),
    expectedHoldWindow:
      (ptqg.expectedHoldWindow as string | undefined) ?? "intraday",
    leverage: toNum(ptqg.leverage) ?? position.leverage ?? 1,
    stopDistancePct: Number(stopDistancePctRaw.toFixed(3)),
    maxLossUsd: Number(maxLossUsdRaw.toFixed(2)),
    maxLossPct: Number(maxLossPctRaw.toFixed(2)),
    catalystFlag: toBool(ptqg.catalystFlag, false),
    lowConfidenceMode: toBool(ptqg.lowConfidenceMode, false),
    blocked: toBool(ptqg.blocked, false),
  };
}

function buildEvidencePack(position: Position, ptqg: PtqgMeta): EvidencePack {
  const meta = (position.metadata ?? {}) as Record<string, unknown>;
  const missingData: string[] = [];
  const closedAt = position.closedAt ?? Date.now();
  const holdMinutes = Math.max(
    0,
    Math.round((closedAt - position.openedAt) / 60000),
  );

  const move =
    position.direction === "long"
      ? ((position.markPrice - position.entryPrice) / position.entryPrice) * 100
      : ((position.entryPrice - position.markPrice) / position.entryPrice) *
        100;
  const adverseMovePct = Number(Math.abs(move).toFixed(3));

  const requiredChecks: Array<[string, unknown]> = [
    ["assetClass", ptqg.assetClass],
    ["thesisClass", ptqg.thesisClass],
    ["entryTimestampUtc", ptqg.entryTimestampUtc],
    ["expectedHoldWindow", ptqg.expectedHoldWindow],
    ["maxLossUsd", ptqg.maxLossUsd],
    ["maxLossPct", ptqg.maxLossPct],
    ["leverage", ptqg.leverage],
    ["stopDistancePct", ptqg.stopDistancePct],
  ];

  for (const [key, value] of requiredChecks) {
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim().length === 0)
    ) {
      missingData.push(key);
    }
  }

  const sentimentScore = toNum(meta.sentimentScore);
  const regime = typeof meta.regime === "string" ? meta.regime : "";
  if (sentimentScore === undefined) missingData.push("sentimentScore");
  if (!regime) missingData.push("regime");
  const entryATRPct = toNum(meta.entryATRPct);
  if (entryATRPct === undefined) missingData.push("entryATRPct");

  const present = requiredChecks.length + 3 - missingData.length;
  const total = requiredChecks.length + 3;
  const pmevCompletenessPct = Number(
    Math.max(0, Math.min(100, (present / total) * 100)).toFixed(1),
  );

  return {
    holdMinutes,
    adverseMovePct,
    pmevCompletenessPct,
    missingData: [...new Set(missingData)],
    sentimentSnapshotRef:
      sentimentScore !== undefined
        ? `sentiment_score:${sentimentScore}`
        : "unavailable",
    regimeSnapshotRef: regime ? `regime:${regime}` : "unavailable",
    ptqgComplete: !requiredChecks.some(
      ([, value]) =>
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim().length === 0),
    ),
    ...(entryATRPct !== undefined ? { entryAtrPct: entryATRPct } : {}),
  };
}

function parseConfidence(text: string): number {
  const m = text.match(
    /confidence\s*[:=]\s*(0(?:\.\d+)?|1(?:\.0+)?|\d{1,2}(?:\.\d+)?)/i,
  );
  if (!m) return 0.6;
  const raw = Number(m[1]);
  if (!Number.isFinite(raw)) return 0.6;
  if (raw > 1) return Math.max(0, Math.min(1, raw / 100));
  return Math.max(0, Math.min(1, raw));
}

function collectMissingDataFlags(text: string): string[] {
  const flags: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("timestamp")) flags.push("timestamp");
  if (lower.includes("condition_id") || lower.includes("condition id"))
    flags.push("condition_id");
  if (lower.includes("market name")) flags.push("market_name");
  if (lower.includes("date/time") || lower.includes("date time"))
    flags.push("entry_datetime");
  if (lower.includes("outside my lane") || lower.includes("outside my core"))
    flags.push("lane_coverage_gap");
  return [...new Set(flags)];
}

function inferPrimaryCause(
  position: Position,
  evidence: EvidencePack,
  findings: AgentFinding[],
): PostMortemCause {
  const replies = findings.map((f) => f.reply.toLowerCase()).join(" ");
  const leverage = position.leverage ?? 1;
  const stopDist = Math.abs(
    ((position.stopLossPrice - position.entryPrice) / position.entryPrice) *
      100,
  );

  if (evidence.missingData.length >= 3) return "missing_pretrade_data";
  if (
    replies.includes("outside my lane") ||
    replies.includes("outside my core")
  )
    return "agent_lane_mismatch";
  if (leverage >= 10 && evidence.adverseMovePct <= 2.2)
    return "sizing_too_aggressive";
  if (stopDist <= 1.0) return "stop_too_tight_for_vol";
  if (
    replies.includes("risk-on") ||
    replies.includes("risk off") ||
    replies.includes("regime")
  ) {
    return "regime_conflict";
  }
  if (replies.includes("slippage")) return "execution_or_slippage";
  if (
    replies.includes("no direct market") ||
    replies.includes("need timestamp")
  ) {
    return "unknown_insufficient_evidence";
  }
  return "thesis_invalid";
}

function inferSecondaryCauses(
  primary: PostMortemCause,
  position: Position,
  evidence: EvidencePack,
  findings: AgentFinding[],
): PostMortemCause[] {
  const out: PostMortemCause[] = [];
  const replies = findings.map((f) => f.reply.toLowerCase()).join(" ");
  if (primary !== "sizing_too_aggressive" && (position.leverage ?? 1) >= 10) {
    out.push("sizing_too_aggressive");
  }
  if (primary !== "missing_pretrade_data" && evidence.missingData.length > 0) {
    out.push("missing_pretrade_data");
  }
  if (
    primary !== "agent_lane_mismatch" &&
    (replies.includes("outside my lane") || replies.includes("outside my core"))
  ) {
    out.push("agent_lane_mismatch");
  }
  if (
    primary !== "stop_too_tight_for_vol" &&
    Math.abs(
      ((position.stopLossPrice - position.entryPrice) / position.entryPrice) *
        100,
    ) <= 1.0
  ) {
    out.push("stop_too_tight_for_vol");
  }
  return [...new Set(out)].slice(0, 2);
}

function generateCorrectiveActions(
  primary: PostMortemCause,
  evidence: EvidencePack,
  ptqg: PtqgMeta,
): CorrectiveAction[] {
  const immediate: CorrectiveAction = {
    owner: "vince",
    dueWindow: "next_trade",
    type: "immediate",
    action:
      primary === "sizing_too_aggressive"
        ? "Cap leverage on this asset class and widen stop to volatility-adjusted range before next entry."
        : "Require PTQG completion and explicit max-loss check before next entry.",
    successMetric:
      "Next trade includes complete PTQG fields and no missing_data flags.",
    rollbackCondition:
      "If signal quality drops for 10+ trades, review cap thresholds.",
  };

  const policy: CorrectiveAction = {
    owner: "sentinel",
    dueWindow: "72h",
    type: "policy",
    action:
      evidence.missingData.length > 0
        ? "Enforce post-mortem schema validation; reject outputs missing evidence fields."
        : "Add weekly guardrail review for repeated root-cause tags by asset class.",
    successMetric:
      "Post-mortems with pmevCompletenessPct >= 90% over rolling 7 days.",
    rollbackCondition:
      "If operational overhead causes missed trades, reduce required manual fields.",
  };

  const experiment: CorrectiveAction = {
    owner: "solus",
    dueWindow: "7d",
    type: "experiment",
    action:
      ptqg.assetClass === "crypto"
        ? "A/B test perps sizing: baseline vs capped leverage with same signal cohort."
        : "A/B test defined-risk structure recommendation vs spot leverage entries.",
    successMetric:
      "Reduce losses tagged sizing_too_aggressive by >= 20% in test window.",
    rollbackCondition:
      "Abort if win rate drops by >8 points with no drawdown improvement.",
  };

  return [immediate, policy, experiment];
}

function scorePostMortem(
  evidence: EvidencePack,
  findings: AgentFinding[],
  actions: CorrectiveAction[],
  primary: PostMortemCause,
  secondary: PostMortemCause[],
): QualityBreakdown {
  const baseCompleteness = evidence.ptqgComplete ? 30 : 18;
  const completenessPenalty = Math.min(12, evidence.missingData.length * 4);
  const completeness = Math.max(0, baseCompleteness - completenessPenalty);
  const baseEvidenceQuality = Math.round(
    (evidence.pmevCompletenessPct / 100) * 25,
  );
  const evidenceQuality =
    evidence.missingData.length > 0
      ? Math.min(15, baseEvidenceQuality)
      : baseEvidenceQuality;
  const diagnosisDepth = primary
    ? Math.min(
        20,
        10 + secondary.length * 5 + (primary !== "thesis_invalid" ? 5 : 0),
      )
    : 8;
  const actionability = actions.length >= 3 ? 15 : actions.length * 4;
  const ownershipClarity = actions.every((a) => a.owner && a.dueWindow)
    ? 10
    : 4;
  const avgConfidence =
    findings.length > 0
      ? findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length
      : 0;
  const findingMissingFlags = findings.reduce(
    (sum, f) => sum + f.missingData.length,
    0,
  );
  const dataGapPenalty = Math.min(
    35,
    evidence.missingData.length * 8 + findingMissingFlags * 2,
  );
  const confidencePenalty = avgConfidence < 0.45 ? 10 : 0;
  const total = Math.max(
    0,
    Math.min(
      100,
      completeness +
        evidenceQuality +
        diagnosisDepth +
        actionability +
        ownershipClarity -
        dataGapPenalty -
        confidencePenalty,
    ),
  );
  return {
    completeness,
    evidenceQuality,
    diagnosisDepth,
    actionability,
    ownershipClarity,
    total,
    escalate: total < QUALITY_THRESHOLD || evidence.missingData.length >= 3,
  };
}

export function buildStructuredPostMortem(
  position: Position,
  findings: AgentFinding[],
): StructuredPostMortem {
  const ptqg = buildPtqgMeta(position);
  const evidence = buildEvidencePack(position, ptqg);
  const primaryCause = inferPrimaryCause(position, evidence, findings);
  const secondaryCauses = inferSecondaryCauses(
    primaryCause,
    position,
    evidence,
    findings,
  );
  const actions = generateCorrectiveActions(primaryCause, evidence, ptqg);
  const quality = scorePostMortem(
    evidence,
    findings,
    actions,
    primaryCause,
    secondaryCauses,
  );
  const nextTradePolicyDelta = [
    evidence.ptqgComplete
      ? "Keep PTQG required fields hard-enforced."
      : "Block or size-cap trades with incomplete PTQG fields.",
    quality.total >= QUALITY_THRESHOLD
      ? "Current post-mortem quality is acceptable; continue weekly monitoring."
      : "Escalate this loss to Sentinel weekly governance review.",
    primaryCause === "sizing_too_aggressive"
      ? "Apply temporary leverage cap for this asset class in next 7 days."
      : "No temporary leverage override required.",
  ];

  return {
    ptqg,
    evidence,
    findings,
    primaryCause,
    secondaryCauses,
    actions,
    quality,
    nextTradePolicyDelta,
  };
}

export function renderPostMortemMarkdown(
  position: Position,
  structured: StructuredPostMortem,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const pnl = position.realizedPnl ?? 0;
  const closeReason = position.closeReason ?? "manual";
  const tradeSummary = `${position.asset} ${position.direction} closed ${closeReason}: entry $${position.entryPrice.toFixed(2)} -> exit $${position.markPrice.toFixed(2)}, P&L $${pnl.toFixed(2)} (${position.sizeUsd} USD, ${position.leverage ?? 1}x).`;
  const machineJson = JSON.stringify(
    {
      qualityScore: structured.quality.total,
      qualityEscalate: structured.quality.escalate,
      primaryCause: structured.primaryCause,
      secondaryCauses: structured.secondaryCauses,
      ptqgComplete: structured.evidence.ptqgComplete,
      pmevCompletenessPct: structured.evidence.pmevCompletenessPct,
      missingData: structured.evidence.missingData,
      holdMinutes: structured.evidence.holdMinutes,
      adverseMovePct: structured.evidence.adverseMovePct,
    },
    null,
    2,
  );

  return [
    `# Post-mortem: ${position.asset} ${position.direction} (${closeReason})`,
    "",
    `**Date:** ${date}`,
    "",
    "## Trade Snapshot",
    "",
    `- ${tradeSummary}`,
    `- Entry time (UTC): ${structured.ptqg.entryTimestampUtc}`,
    `- Hold window target: ${structured.ptqg.expectedHoldWindow}`,
    `- Max loss budget: $${structured.ptqg.maxLossUsd.toFixed(2)} (${structured.ptqg.maxLossPct.toFixed(2)}%)`,
    "",
    "## Evidence Pack",
    "",
    `- PTQG complete: ${structured.evidence.ptqgComplete}`,
    `- PMEP completeness: ${structured.evidence.pmevCompletenessPct}%`,
    `- Hold duration: ${structured.evidence.holdMinutes} minutes`,
    `- Adverse move: ${structured.evidence.adverseMovePct}%`,
    `- Sentiment snapshot: ${structured.evidence.sentimentSnapshotRef}`,
    `- Regime snapshot: ${structured.evidence.regimeSnapshotRef}`,
    `- Missing data: ${structured.evidence.missingData.length > 0 ? structured.evidence.missingData.join(", ") : "none"}`,
    "",
    "## Agent Findings (structured)",
    "",
    ...structured.findings.flatMap((f) => [
      `### ${f.agent}`,
      "",
      `- Lane: ${f.lane}`,
      `- Confidence: ${(f.confidence * 100).toFixed(0)}%`,
      `- Source stamp: ${f.sourceStamp}`,
      `- Missing data flags: ${f.missingData.length > 0 ? f.missingData.join(", ") : "none"}`,
      "",
      f.reply,
      "",
    ]),
    "## Root-Cause Tags",
    "",
    `- Primary: ${structured.primaryCause}`,
    `- Secondary: ${structured.secondaryCauses.length > 0 ? structured.secondaryCauses.join(", ") : "none"}`,
    "",
    "## Corrective Actions",
    "",
    ...structured.actions.map(
      (a, i) =>
        `${i + 1}. [${a.type}] owner=${a.owner} due=${a.dueWindow}\n   - action: ${a.action}\n   - success_metric: ${a.successMetric}\n   - rollback: ${a.rollbackCondition}`,
    ),
    "",
    "## Confidence and Data Gaps",
    "",
    `- Quality score: ${structured.quality.total}/100`,
    `- Escalate to Sentinel: ${structured.quality.escalate}`,
    `- Score breakdown: completeness=${structured.quality.completeness}, evidence=${structured.quality.evidenceQuality}, diagnosis=${structured.quality.diagnosisDepth}, actionability=${structured.quality.actionability}, ownership=${structured.quality.ownershipClarity}`,
    "",
    "## What changes on next trade?",
    "",
    ...structured.nextTradePolicyDelta.map((line) => `- ${line}`),
    "",
    "## Machine-Readable Summary",
    "",
    `- PM_QUALITY_SCORE: ${structured.quality.total}`,
    `- PM_QUALITY_ESCALATE: ${structured.quality.escalate}`,
    `- PM_PRIMARY_CAUSE: ${structured.primaryCause}`,
    `- PM_SECONDARY_CAUSES: ${structured.secondaryCauses.length > 0 ? structured.secondaryCauses.join(",") : "none"}`,
    `- PM_PTQG_COMPLETE: ${structured.evidence.ptqgComplete}`,
    `- PM_PMEP_COMPLETENESS_PCT: ${structured.evidence.pmevCompletenessPct}`,
    `- PM_MISSING_DATA_COUNT: ${structured.evidence.missingData.length}`,
    "",
    "```json",
    machineJson,
    "```",
    "",
  ].join("\n");
}

/**
 * Run post-mortem for a closed losing position: ask Echo, Oracle, Solus and write markdown.
 * Fire-and-forget safe; logs errors.
 */
export async function runPostMortem(
  runtime: IAgentRuntime,
  closedPosition: Position,
): Promise<void> {
  const eliza = getElizaOS(runtime);
  if (!eliza) {
    logger.debug(
      "[VincePostMortem] elizaOS not available; skipping post-mortem.",
    );
    return;
  }

  const pnl = closedPosition.realizedPnl ?? 0;
  if (pnl >= 0) return;

  const asset = closedPosition.asset;
  const direction = closedPosition.direction;
  const closeReason = closedPosition.closeReason ?? "manual";
  const entryPrice = closedPosition.entryPrice;
  const exitPrice = closedPosition.markPrice;
  const sizeUsd = closedPosition.sizeUsd;
  const leverage = closedPosition.leverage ?? 1;

  const tradeSummary = `${asset} ${direction} closed ${closeReason}: entry $${entryPrice.toFixed(2)} → exit $${exitPrice.toFixed(2)}, P&L $${pnl.toFixed(2)} (${sizeUsd} USD, ${leverage}x).`;

  const queries: Array<{
    name: AgentFinding["agent"];
    lane: string;
    sourceStamp: string;
    question: string;
  }> = [
    {
      name: "Echo",
      lane: "CT sentiment + macro risk pulse",
      sourceStamp: "x_sentiment_snapshot",
      question:
        `You are Echo (sentiment lane only). We just closed a losing paper trade.\n` +
        `${tradeSummary}\n` +
        `Reply in 2-4 sentences focused only on sentiment/macro pulse.\n` +
        `If key context is missing, say exactly what is missing.\n` +
        `End with "Confidence: <0-1>".`,
    },
    {
      name: "Oracle",
      lane: "prediction market regime",
      sourceStamp: "polymarket_regime_snapshot",
      question:
        `You are Oracle (prediction-market lane only). We just closed a losing paper trade.\n` +
        `${tradeSummary}\n` +
        `Reply in 2-4 sentences focused on regime and market-pricing context.\n` +
        `If key context is missing, state missing fields explicitly.\n` +
        `End with "Confidence: <0-1>".`,
    },
    {
      name: "Solus",
      lane: "options mechanics and sizing",
      sourceStamp: "options_mechanics_snapshot",
      question:
        `You are Solus (mechanics lane only). We just closed a losing paper trade.\n` +
        `${tradeSummary}\n` +
        `Reply in 2-4 sentences focused on structure/sizing/mechanics, not sentiment.\n` +
        `If key context is missing, state missing fields explicitly.\n` +
        `End with "Confidence: <0-1>".`,
    },
  ];

  const findings: AgentFinding[] = [];
  for (const q of queries) {
    const target = eliza.getAgentByName?.(q.name);
    const agentId = target?.agentId ?? (target as { id?: string })?.id;
    if (!agentId) {
      findings.push({
        agent: q.name,
        lane: q.lane,
        reply: "(agent not available)",
        confidence: 0,
        sourceStamp: q.sourceStamp,
        missingData: ["agent_not_available"],
      });
      continue;
    }
    const reply = await askAgent(eliza, agentId, q.name, q.question);
    const finalReply = reply || "(no reply)";
    findings.push({
      agent: q.name,
      lane: q.lane,
      reply: finalReply,
      confidence: parseConfidence(finalReply),
      sourceStamp: q.sourceStamp,
      missingData: collectMissingDataFlags(finalReply),
    });
  }

  const structured = buildStructuredPostMortem(closedPosition, findings);
  const date = new Date().toISOString().slice(0, 10);
  const safeAsset = asset.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${date}-${safeAsset}-post-mortem.md`;
  const dir = path.join(process.cwd(), "docs", "standup", "post-mortems");
  const filepath = path.join(dir, filename);
  const md = renderPostMortemMarkdown(closedPosition, structured);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filepath, md, "utf-8");
    logger.info(`[VincePostMortem] Wrote ${filepath}`);
  } catch (err) {
    logger.warn(`[VincePostMortem] Failed to write ${filepath}: ${err}`);
  }
}
