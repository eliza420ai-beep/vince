/**
 * Ensures LLM thesis objects satisfy packages/paste-trade/scripts/validate.ts
 * before stdin → batch-save.ts (quotes + headline_quote are often dropped by models).
 */

import {
  normalizeRouteStatus,
  validate,
} from "../../../../packages/paste-trade/scripts/validate.ts";

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** headline_quote must match or be a substring of one quotes[] entry (normalized). */
function headlineMatchesQuotes(headline: string, quotes: string[]): boolean {
  const nHead = norm(headline);
  if (!nHead) return false;
  return quotes.some((q) => {
    const nq = norm(q);
    return nHead === nq || nq.includes(nHead);
  });
}

export function normalizeThesisForBatchSave(
  raw: unknown,
  bodyText: string,
  sourceDate: string,
): Record<string, unknown> {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};

  const trimmedBody = bodyText.trim();
  const anchor =
    trimmedBody.length > 0 ? trimmedBody.slice(0, 500) : "No source text.";

  const thesis =
    typeof base.thesis === "string" && base.thesis.trim()
      ? base.thesis.trim()
      : "Review source — thesis not extracted cleanly.";

  let quotes: string[] = Array.isArray(base.quotes)
    ? (base.quotes as unknown[])
        .filter(
          (q): q is string => typeof q === "string" && q.trim().length > 0,
        )
        .map((q) => q.trim())
    : [];

  if (quotes.length === 0) {
    const q = anchor.slice(0, 280).trim() || thesis.slice(0, 280);
    quotes = [q.length > 0 ? q : "(excerpt unavailable)"];
  }

  const firstQuote = quotes[0]!;
  let headline =
    typeof base.headline_quote === "string" && base.headline_quote.trim()
      ? base.headline_quote.trim().slice(0, 180)
      : "";

  if (!headline) {
    headline = firstQuote.slice(0, Math.min(120, firstQuote.length));
  }

  if (!headlineMatchesQuotes(headline, quotes)) {
    headline = firstQuote.slice(0, Math.min(120, firstQuote.length));
  }

  if (!Array.isArray(base.why) || base.why.length === 0) {
    base.why = [thesis];
  }

  if (!normalizeRouteStatus(base)) {
    base.route_status = "unrouted";
  }

  if (normalizeRouteStatus(base) === "unrouted") {
    const ur = base.unrouted_reason;
    if (typeof ur !== "string" || !ur.trim()) {
      base.unrouted_reason = "llm_schema_gap";
    }
  }

  base.thesis = thesis;
  base.quotes = quotes;
  base.headline_quote = headline;
  if (typeof base.source_date !== "string" || !base.source_date.trim()) {
    base.source_date = sourceDate;
  }

  return base;
}

export function normalizeThesesForBatchSave(
  theses: unknown[],
  bodyText: string,
  sourceDate: string,
): Record<string, unknown>[] {
  return theses.map((t) =>
    normalizeThesisForBatchSave(t, bodyText, sourceDate),
  );
}

function batchThesesValidationErrors(
  theses: Record<string, unknown>[],
): string[] {
  for (let i = 0; i < theses.length; i++) {
    const { valid, errors } = validate(theses[i]);
    if (!valid) return [`index ${i}:`, ...errors];
  }
  return [];
}

/**
 * Normalize LLM output; if anything still fails validate() (e.g. bogus `routed` without
 * route_evidence), replace with a single unrouted row so batch-save does not hard-fail.
 */
export function ensureThesesPassBatchValidation(
  theses: unknown[],
  bodyText: string,
  sourceDate: string,
  logWarn: (msg: string) => void,
): Record<string, unknown>[] {
  const out = normalizeThesesForBatchSave(theses, bodyText, sourceDate);
  const errs = batchThesesValidationErrors(out);
  if (errs.length === 0) return out;

  logWarn(
    `[paste-trade] thesis batch failed validate after normalize (${errs.join("; ")}); using fallback row.`,
  );
  return [
    normalizeThesisForBatchSave(
      {
        thesis:
          "Extraction produced an invalid schema; review the source manually.",
        horizon: "unknown",
        route_status: "unrouted",
        unrouted_reason: "validation_fallback",
        who: [],
        why: [errs.slice(0, 5).join("; ")],
      },
      bodyText,
      sourceDate,
    ),
  ];
}
