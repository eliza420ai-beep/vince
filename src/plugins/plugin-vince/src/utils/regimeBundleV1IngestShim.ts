import fs from "node:fs";
import type { Direction, RegimeBundleV1 } from "../tasks/regimeBundleV1.tasks";
import { computeUniverseHash } from "../tasks/regimeBundleV1.tasks";

export interface RegimeBundleIngestSummary {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary?: {
    overall_direction: Direction;
    alerts_count: number;
    assets_count: number;
    sleeves_count: number;
  };
}

function isDirection(value: unknown): value is Direction {
  return value === "long" || value === "short" || value === "neutral";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isNumberOrNull(value: unknown): value is number | null {
  return (
    value === null || (typeof value === "number" && Number.isFinite(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateRegimeBundleV1(
  bundle: unknown,
): RegimeBundleIngestSummary {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(bundle)) {
    errors.push("bundle must be an object");
    return { ok: false, errors, warnings };
  }

  const b = bundle as Partial<RegimeBundleV1>;

  if (b.version !== "regime_bundle_v1") {
    errors.push(
      `version must be "regime_bundle_v1" (got ${String(b.version)})`,
    );
  }
  if (typeof b.generated_at !== "string" || !b.generated_at.trim()) {
    errors.push("generated_at must be a non-empty string");
  }
  if (
    typeof b.generated_at_ms !== "number" ||
    !Number.isFinite(b.generated_at_ms)
  ) {
    errors.push("generated_at_ms must be a finite number");
  }

  if (!b.universe || !isRecord(b.universe)) {
    errors.push("universe must be an object");
  } else {
    const u = b.universe as any;
    for (const key of [
      "hyperliquid",
      "tastytrade",
      "watchlist",
      "coreCrypto",
    ] as const) {
      if (!isStringArray(u[key]))
        errors.push(`universe.${key} must be an array of strings`);
    }
  }

  if (
    typeof b.universe_hash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(b.universe_hash)
  ) {
    errors.push("universe_hash must be a sha256 hex string");
  } else if (b.universe && isRecord(b.universe)) {
    const u = b.universe as RegimeBundleV1["universe"];
    const expected = computeUniverseHash(u);
    if (expected !== b.universe_hash) {
      errors.push("universe_hash does not match universe tickers");
    }
  }

  if (!b.assets || !isRecord(b.assets)) {
    errors.push("assets must be an object");
  } else {
    for (const [symbol, asset] of Object.entries(
      b.assets as Record<string, unknown>,
    )) {
      if (!/^[A-Z0-9\\.\\-]+$/.test(symbol)) {
        warnings.push(`asset key "${symbol}" is not clearly uppercase ticker`);
      }
      if (!isRecord(asset)) {
        errors.push(`assets.${symbol} must be an object`);
        continue;
      }
      const a = asset as any;
      if (!isDirection(a.direction))
        errors.push(`assets.${symbol}.direction invalid`);
      if (!isNumberOrNull(a.strength))
        errors.push(`assets.${symbol}.strength must be number|null`);
      if (!isNumberOrNull(a.confidence))
        errors.push(`assets.${symbol}.confidence must be number|null`);
      if (typeof a.funding_stress !== "boolean")
        errors.push(`assets.${symbol}.funding_stress must be boolean`);
      if (typeof a.oi_change_bucket !== "string" || !a.oi_change_bucket.trim())
        errors.push(
          `assets.${symbol}.oi_change_bucket must be non-empty string`,
        );
      if (typeof a.regime_label !== "string" || !a.regime_label.trim())
        errors.push(`assets.${symbol}.regime_label must be non-empty string`);
      if (!isStringArray(a.factors))
        errors.push(`assets.${symbol}.factors must be string[]`);
    }
  }

  if (!b.sleeves || !isRecord(b.sleeves)) {
    errors.push("sleeves must be an object");
  } else {
    for (const [sleeveName, sleeve] of Object.entries(
      b.sleeves as Record<string, unknown>,
    )) {
      if (!isRecord(sleeve)) {
        errors.push(`sleeves.${sleeveName} must be an object`);
        continue;
      }
      const s = sleeve as any;
      if (!isStringArray(s.assets))
        errors.push(`sleeves.${sleeveName}.assets must be string[]`);
      if (!isDirection(s.aggregate_direction))
        errors.push(`sleeves.${sleeveName}.aggregate_direction invalid`);
      if (typeof s.funding_stress !== "boolean")
        errors.push(`sleeves.${sleeveName}.funding_stress must be boolean`);
      if (typeof s.regime_label !== "string" || !s.regime_label.trim())
        errors.push(
          `sleeves.${sleeveName}.regime_label must be non-empty string`,
        );
    }
  }

  if (!b.summary || !isRecord(b.summary)) {
    errors.push("summary must be an object");
  } else {
    const s = b.summary as any;
    if (!isDirection(s.overall_direction))
      errors.push("summary.overall_direction invalid");
    if (!isStringArray(s.alerts))
      errors.push("summary.alerts must be string[]");
  }

  const ok = errors.length === 0;
  return {
    ok,
    errors,
    warnings,
    summary: ok
      ? {
          overall_direction: (b.summary as any).overall_direction as Direction,
          alerts_count: (b.summary as any).alerts.length,
          assets_count: Object.keys(b.assets as any).length,
          sleeves_count: Object.keys(b.sleeves as any).length,
        }
      : undefined,
  };
}

export function readRegimeBundleV1File(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

export function ingestRegimeBundleV1File(
  filePath: string,
): RegimeBundleIngestSummary {
  const bundle = readRegimeBundleV1File(filePath);
  return validateRegimeBundleV1(bundle);
}
