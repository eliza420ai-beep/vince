export type WttDirection = "long" | "short";

export type WttAlignment =
  | "direct"
  | "pure_play"
  | "exposed"
  | "partial"
  | "tangential";

export type WttEdge = "undiscovered" | "emerging" | "consensus" | "crowded";

export type WttPayoffShape =
  | "max_asymmetry"
  | "high"
  | "moderate"
  | "linear"
  | "capped";

export type WttTimingForgiveness =
  | "very_forgiving"
  | "forgiving"
  | "punishing"
  | "very_punishing";

export interface WttRubric {
  alignment: WttAlignment;
  edge: WttEdge;
  payoffShape: WttPayoffShape;
  timingForgiveness: WttTimingForgiveness;
}

export interface WttPick {
  date: string;
  thesis: string;
  primaryTicker: string;
  primaryDirection: WttDirection;
  primaryInstrument: string;
  primaryEntryPrice: number;
  primaryRiskUsd: number;
  invalidateCondition: string;
  killConditions: string[];
  rubric: WttRubric;
  altTicker?: string;
  altDirection?: WttDirection;
  altInstrument?: string;
  evThresholdPct?: number;
}

export interface WttValidationError {
  field: string;
  message: string;
}

export type WttValidationResult =
  | { ok: true; value: WttPick; migratedFromLegacy?: boolean }
  | { ok: false; errors: WttValidationError[] };

const ALIGNMENTS: readonly WttAlignment[] = [
  "direct",
  "pure_play",
  "exposed",
  "partial",
  "tangential",
];
const EDGES: readonly WttEdge[] = [
  "undiscovered",
  "emerging",
  "consensus",
  "crowded",
];
const PAYOFF_SHAPES: readonly WttPayoffShape[] = [
  "max_asymmetry",
  "high",
  "moderate",
  "linear",
  "capped",
];
const TIMING_FORGIVENESS: readonly WttTimingForgiveness[] = [
  "very_forgiving",
  "forgiving",
  "punishing",
  "very_punishing",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function pushError(
  errors: WttValidationError[],
  field: string,
  message: string,
): void {
  errors.push({ field, message });
}

function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return (
    typeof value === "string" && (allowed as readonly string[]).includes(value)
  );
}

/**
 * Contract validator for daily WTT sidecar payloads.
 * Returns typed value on success and machine-readable errors on failure.
 */
export function validateWttPick(input: unknown): WttValidationResult {
  const errors: WttValidationError[] = [];
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ field: "$", message: "WTT payload must be an object" }],
    };
  }

  const raw = input as Record<string, unknown>;

  if (!isNonEmptyString(raw.date)) {
    pushError(errors, "date", "date must be a non-empty string (YYYY-MM-DD)");
  }
  if (!isNonEmptyString(raw.thesis)) {
    pushError(errors, "thesis", "thesis must be a non-empty string");
  }
  if (!isNonEmptyString(raw.primaryTicker)) {
    pushError(
      errors,
      "primaryTicker",
      "primaryTicker must be a non-empty string",
    );
  }
  if (!validateEnum(raw.primaryDirection, ["long", "short"] as const)) {
    pushError(
      errors,
      "primaryDirection",
      "primaryDirection must be 'long' or 'short'",
    );
  }
  if (!isNonEmptyString(raw.primaryInstrument)) {
    pushError(
      errors,
      "primaryInstrument",
      "primaryInstrument must be a non-empty string",
    );
  }
  if (!isFiniteNumber(raw.primaryEntryPrice)) {
    pushError(
      errors,
      "primaryEntryPrice",
      "primaryEntryPrice must be a finite number",
    );
  }
  if (!isFiniteNumber(raw.primaryRiskUsd)) {
    pushError(
      errors,
      "primaryRiskUsd",
      "primaryRiskUsd must be a finite number",
    );
  }
  if (!isNonEmptyString(raw.invalidateCondition)) {
    pushError(
      errors,
      "invalidateCondition",
      "invalidateCondition must be a non-empty string",
    );
  }

  if (!Array.isArray(raw.killConditions)) {
    pushError(
      errors,
      "killConditions",
      "killConditions must be an array of strings",
    );
  } else if (
    raw.killConditions.some(
      (v) => typeof v !== "string" || v.trim().length === 0,
    )
  ) {
    pushError(
      errors,
      "killConditions",
      "killConditions must contain only non-empty strings",
    );
  }

  if (!isRecord(raw.rubric)) {
    pushError(errors, "rubric", "rubric must be an object");
  } else {
    if (!validateEnum(raw.rubric.alignment, ALIGNMENTS)) {
      pushError(
        errors,
        "rubric.alignment",
        "rubric.alignment must be one of direct|pure_play|exposed|partial|tangential",
      );
    }
    if (!validateEnum(raw.rubric.edge, EDGES)) {
      pushError(
        errors,
        "rubric.edge",
        "rubric.edge must be one of undiscovered|emerging|consensus|crowded",
      );
    }
    if (!validateEnum(raw.rubric.payoffShape, PAYOFF_SHAPES)) {
      pushError(
        errors,
        "rubric.payoffShape",
        "rubric.payoffShape must be one of max_asymmetry|high|moderate|linear|capped",
      );
    }
    if (!validateEnum(raw.rubric.timingForgiveness, TIMING_FORGIVENESS)) {
      pushError(
        errors,
        "rubric.timingForgiveness",
        "rubric.timingForgiveness must be one of very_forgiving|forgiving|punishing|very_punishing",
      );
    }
  }

  if (raw.altTicker != null && !isNonEmptyString(raw.altTicker)) {
    pushError(
      errors,
      "altTicker",
      "altTicker must be a non-empty string when present",
    );
  }
  if (
    raw.altDirection != null &&
    !validateEnum(raw.altDirection, ["long", "short"] as const)
  ) {
    pushError(
      errors,
      "altDirection",
      "altDirection must be 'long' or 'short' when present",
    );
  }
  if (raw.altInstrument != null && !isNonEmptyString(raw.altInstrument)) {
    pushError(
      errors,
      "altInstrument",
      "altInstrument must be a non-empty string when present",
    );
  }
  if (raw.evThresholdPct != null && !isFiniteNumber(raw.evThresholdPct)) {
    pushError(
      errors,
      "evThresholdPct",
      "evThresholdPct must be a finite number when present",
    );
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      date: raw.date as string,
      thesis: raw.thesis as string,
      primaryTicker: raw.primaryTicker as string,
      primaryDirection: raw.primaryDirection as WttDirection,
      primaryInstrument: raw.primaryInstrument as string,
      primaryEntryPrice: raw.primaryEntryPrice as number,
      primaryRiskUsd: raw.primaryRiskUsd as number,
      invalidateCondition: raw.invalidateCondition as string,
      killConditions: raw.killConditions as string[],
      rubric: {
        alignment: (raw.rubric as Record<string, unknown>)
          .alignment as WttAlignment,
        edge: (raw.rubric as Record<string, unknown>).edge as WttEdge,
        payoffShape: (raw.rubric as Record<string, unknown>)
          .payoffShape as WttPayoffShape,
        timingForgiveness: (raw.rubric as Record<string, unknown>)
          .timingForgiveness as WttTimingForgiveness,
      },
      altTicker: raw.altTicker as string | undefined,
      altDirection: raw.altDirection as WttDirection | undefined,
      altInstrument: raw.altInstrument as string | undefined,
      evThresholdPct: raw.evThresholdPct as number | undefined,
    },
  };
}

export function parseAndValidateWttPick(rawJson: string): WttValidationResult {
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    const direct = validateWttPick(parsed);
    if (direct.ok) return direct;

    const legacy = coerceLegacyWttPick(parsed);
    if (!legacy) return direct;

    const normalized = validateWttPick(legacy);
    if (normalized.ok) {
      return { ok: true, value: normalized.value, migratedFromLegacy: true };
    }
    return direct;
  } catch {
    return {
      ok: false,
      errors: [{ field: "$", message: "Invalid JSON payload" }],
    };
  }
}

function coerceLegacyWttPick(input: unknown): Record<string, unknown> | null {
  if (!isRecord(input)) return null;
  const raw = { ...input } as Record<string, unknown>;

  if (!isNonEmptyString(raw.date)) {
    raw.date = new Date().toISOString().slice(0, 10);
  }
  if (!isNonEmptyString(raw.thesis)) {
    raw.thesis = "Legacy WTT thesis unavailable";
  }
  if (!isNonEmptyString(raw.primaryTicker)) return null;
  if (!validateEnum(raw.primaryDirection, ["long", "short"] as const)) {
    raw.primaryDirection = "long";
  }
  if (!isNonEmptyString(raw.primaryInstrument)) raw.primaryInstrument = "perp";
  if (!isFiniteNumber(raw.primaryEntryPrice)) raw.primaryEntryPrice = 0;
  if (!isFiniteNumber(raw.primaryRiskUsd)) raw.primaryRiskUsd = 0;
  if (!isNonEmptyString(raw.invalidateCondition))
    raw.invalidateCondition = "n/a";
  if (!Array.isArray(raw.killConditions)) raw.killConditions = [];

  const rubric = isRecord(raw.rubric) ? { ...raw.rubric } : {};
  const legacyRubric = rubric as Record<string, unknown>;
  if (!validateEnum(legacyRubric.alignment, ALIGNMENTS)) {
    legacyRubric.alignment = "partial";
  }
  if (!validateEnum(legacyRubric.edge, EDGES)) {
    legacyRubric.edge = "consensus";
  }
  if (!validateEnum(legacyRubric.payoffShape, PAYOFF_SHAPES)) {
    legacyRubric.payoffShape = "moderate";
  }
  if (!validateEnum(legacyRubric.timingForgiveness, TIMING_FORGIVENESS)) {
    legacyRubric.timingForgiveness = "punishing";
  }
  raw.rubric = legacyRubric;

  if (raw.altTicker != null && !isNonEmptyString(raw.altTicker)) {
    delete raw.altTicker;
  }
  if (
    raw.altDirection != null &&
    !validateEnum(raw.altDirection, ["long", "short"] as const)
  ) {
    delete raw.altDirection;
  }
  if (raw.altInstrument != null && !isNonEmptyString(raw.altInstrument)) {
    delete raw.altInstrument;
  }
  if (raw.evThresholdPct != null && !isFiniteNumber(raw.evThresholdPct)) {
    delete raw.evThresholdPct;
  }

  return raw;
}
