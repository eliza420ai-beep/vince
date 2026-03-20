import fs from "node:fs";
import path from "node:path";
import { logger } from "@elizaos/core";

export type DecisionBundleV1Status = "OPENED" | "AVOIDED" | "CLOSED";
export type DecisionDirection = "long" | "short" | "neutral";

export interface DecisionBundleV1Base {
  version: "decision_bundle_v1";
  decisionId: string;
  generated_at: string;
  generated_at_ms: number;
  asset: string;
  direction: DecisionDirection;
  status: DecisionBundleV1Status;
  stage?: string | null;
  featureDecisionId?: string | null;
  positionId?: string | null;
  evaluate?: {
    signal?: {
      strength?: number | null;
      confidence?: number | null;
      sources?: string[];
      factors?: string[];
    };
    reason?: string | null;
  } | null;
  structure?: {
    slMode?: string | null;
    tpMode?: string | null;
    aggressive?: boolean | null;
    optionsOiAdjusted?: boolean | null;
    stopLossPrice?: number | null;
    takeProfitPrices?: number[] | null;
  } | null;
  kelly?: {
    sizeUsd?: number | null;
    leverage?: number | null;
  } | null;
  execute?: {
    entryPrice?: number | null;
    slippageBps?: number | null;
    usedPullbackEntry?: boolean | null;
  } | null;
  track?: {
    exitPrice?: number | null;
    realizedPnl?: number | null;
    realizedPnlPct?: number | null;
    exitReason?: string | null;
    holdingPeriodMinutes?: number | null;
  } | null;
}

export function inferDecisionStageFromReason(reason: string): string | null {
  const r = reason.toLowerCase();
  if (r.includes("entry gate")) return "entry_gate_veto";
  if (r.includes("primary signal gate") || r.includes("no primary signal")) {
    return "primary_signal_gate";
  }
  if (r.includes("temporal coherence")) return "temporal_coherence";
  if (r.includes("sentiment gate")) return "sentiment_gate";
  if (r.includes("swarm regime") || r.includes("swarm")) return "swarm_gate";
  if (r.includes("regime quota")) return "regime_quota_guard";
  if (r.includes("treatment quality") || r.includes("treatment_quality")) {
    return "treatment_quality_gate";
  }
  // Risk checks are "validation failed" gates. We separate manager vs check for audit grouping.
  if (r.includes("risk check")) return "risk_check_failed";
  if (r.includes("risk manager")) return "risk_manager_guard";
  if (r.includes("risk_check_failed")) return "risk_check_failed";
  if (r.includes("pre-mortem") || r.includes("pre mortem")) {
    return "pre_mortem";
  }
  if (r.includes("devil's advocate") || r.includes("devil")) {
    return "devils_advocate";
  }
  if (r.includes("immune system")) return "immune_system";
  if (r.includes("narrative radar")) return "narrative_radar";
  return null;
}

export function resolveDecisionBundlePathV1(args: {
  baseDir: string;
  asset: string;
  decisionId: string;
}): string {
  const { baseDir, asset, decisionId } = args;
  return path.join(
    baseDir,
    "decision-bundles",
    asset.toUpperCase(),
    `${decisionId}.json`,
  );
}

export function ensureDirForFile(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function writeDecisionBundleV1File(args: {
  baseDir: string;
  bundle: DecisionBundleV1Base;
}): string {
  const { baseDir, bundle } = args;
  const filePath = resolveDecisionBundlePathV1({
    baseDir,
    asset: bundle.asset,
    decisionId: bundle.decisionId,
  });
  ensureDirForFile(filePath);
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(bundle, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
  return filePath;
}

export function readDecisionBundleV1File(
  filePath: string,
): DecisionBundleV1Base | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as DecisionBundleV1Base;
  } catch (e) {
    logger.debug(
      `[DecisionBundleV1Writer] read failed: ${filePath} err=${String(e)}`,
    );
    return null;
  }
}

export function finalizeDecisionBundleV1Closed(args: {
  baseDir: string;
  asset: string;
  decisionId: string;
  track: NonNullable<DecisionBundleV1Base["track"]>;
  status?: "CLOSED";
}): string | null {
  const { baseDir, asset, decisionId, track } = args;
  const filePath = resolveDecisionBundlePathV1({
    baseDir,
    asset,
    decisionId,
  });
  const existing = readDecisionBundleV1File(filePath);
  if (!existing) return null;

  const updated: DecisionBundleV1Base = {
    ...existing,
    status: "CLOSED",
    track,
  };

  ensureDirForFile(filePath);
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(updated, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
  return filePath;
}

export function writeDecisionBundleV1Avoided(args: {
  baseDir: string;
  asset: string;
  direction: DecisionDirection;
  decisionId: string;
  reason: string;
  featureDecisionId?: string | null;
  strength?: number | null;
  confidence?: number | null;
  sources?: string[];
  factors?: string[];
}): string {
  const {
    baseDir,
    asset,
    direction,
    decisionId,
    reason,
    featureDecisionId,
    strength,
    confidence,
    sources,
    factors,
  } = args;
  const now = new Date();
  const evalSources = sources ?? [];
  const evalFactors = factors ?? [];
  const bundle: DecisionBundleV1Base = {
    version: "decision_bundle_v1",
    decisionId,
    generated_at: now.toISOString(),
    generated_at_ms: Date.now(),
    asset,
    direction,
    status: "AVOIDED",
    stage: inferDecisionStageFromReason(reason),
    featureDecisionId: featureDecisionId ?? null,
    evaluate: {
      reason,
      signal: {
        strength: typeof strength === "number" ? strength : null,
        confidence: typeof confidence === "number" ? confidence : null,
        sources: evalSources,
        factors: evalFactors,
      },
    },
    structure: null,
    kelly: null,
    execute: null,
    track: null,
  };
  return writeDecisionBundleV1File({ baseDir, bundle });
}

export function writeDecisionBundleV1OpenedPending(args: {
  baseDir: string;
  asset: string;
  direction: DecisionDirection;
  decisionId: string;
  featureDecisionId?: string | null;
  positionId?: string | null;
  evaluate: NonNullable<DecisionBundleV1Base["evaluate"]>;
  structure: NonNullable<DecisionBundleV1Base["structure"]>;
  kelly: NonNullable<DecisionBundleV1Base["kelly"]>;
  execute: NonNullable<DecisionBundleV1Base["execute"]>;
}): string {
  const {
    baseDir,
    asset,
    direction,
    decisionId,
    featureDecisionId,
    positionId,
    evaluate,
    structure,
    kelly,
    execute,
  } = args;

  const now = new Date();
  const bundle: DecisionBundleV1Base = {
    version: "decision_bundle_v1",
    decisionId,
    generated_at: now.toISOString(),
    generated_at_ms: Date.now(),
    asset,
    direction,
    status: "OPENED",
    stage: null,
    featureDecisionId: featureDecisionId ?? decisionId,
    positionId: positionId ?? null,
    evaluate,
    structure,
    kelly,
    execute,
    track: null,
  };

  return writeDecisionBundleV1File({ baseDir, bundle });
}
