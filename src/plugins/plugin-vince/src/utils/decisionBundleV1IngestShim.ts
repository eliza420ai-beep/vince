import fs from "node:fs";
import type {
  DecisionBundleV1Base,
  DecisionDirection,
  DecisionBundleV1Status,
} from "./decisionBundleV1Writer";

export interface DecisionBundleIngestSummary {
  ok: boolean;
  errors: string[];
  warnings: string[];
  status?: DecisionBundleV1Status;
  asset?: string;
  direction?: DecisionDirection;
  stage?: string | null;
  reasonOrExit?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDirection(value: unknown): value is DecisionDirection {
  return value === "long" || value === "short" || value === "neutral";
}

function isStatus(value: unknown): value is DecisionBundleV1Status {
  return value === "OPENED" || value === "AVOIDED" || value === "CLOSED";
}

export function validateDecisionBundleV1(
  bundle: unknown,
): DecisionBundleIngestSummary {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(bundle)) {
    return { ok: false, errors: ["bundle must be an object"], warnings };
  }

  const b = bundle as Partial<DecisionBundleV1Base>;

  if (b.version !== "decision_bundle_v1") {
    errors.push(
      `version must be "decision_bundle_v1" (got ${String(b.version)})`,
    );
  }
  if (!isString(b.decisionId))
    errors.push("decisionId must be non-empty string");
  if (!isString(b.generated_at))
    errors.push("generated_at must be non-empty string");
  if (!isFiniteNumber(b.generated_at_ms))
    errors.push("generated_at_ms must be a finite number");
  if (!isString(b.asset)) errors.push("asset must be non-empty string");
  if (!isDirection(b.direction))
    errors.push("direction must be long|short|neutral");
  if (!isStatus(b.status)) errors.push("status must be OPENED|AVOIDED|CLOSED");

  if (b.status === "AVOIDED") {
    const reason = b.evaluate?.reason;
    if (!isString(reason ?? ""))
      errors.push("evaluate.reason must be non-empty for AVOIDED bundles");
  }
  if (b.status === "CLOSED") {
    if (b.track?.realizedPnl == null) {
      warnings.push("CLOSED bundle missing track.realizedPnl");
    }
  }

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings,
    status: b.status as DecisionBundleV1Status | undefined,
    asset: b.asset,
    direction: b.direction as DecisionDirection | undefined,
    stage: b.stage as string | null | undefined,
    reasonOrExit:
      (b.status === "AVOIDED"
        ? ((b.evaluate?.reason as string | null | undefined) ?? null)
        : ((b.track?.exitReason as string | null | undefined) ?? null)) ?? null,
  };
}

export function readDecisionBundleV1File(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

export function ingestDecisionBundleV1File(
  filePath: string,
): DecisionBundleIngestSummary {
  const bundle = readDecisionBundleV1File(filePath);
  return validateDecisionBundleV1(bundle);
}
