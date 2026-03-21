/**
 * Build a user-copyable message for Otaku from paste.trade run data.
 * No execution — aligns with docs/TRADING_RUNTIME_CONTRACT.md (user must ask Otaku explicitly).
 */

import type { PasteTradeRunRecord } from "./runRegistry.ts";

export interface RoutedExpressionPick {
  platform?: string;
  ticker: string;
  direction?: string;
  instrument?: string;
  thesis?: string;
}

export interface OtakuHandoffPayload {
  eligible: boolean;
  reason?: string;
  /** Full message to paste into Otaku chat */
  message: string;
  expressions: RoutedExpressionPick[];
  sourceUrl?: string;
  runId: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Depth-first collect route_evidence.selected_expression objects from API snapshots or nested JSON.
 */
export function collectRoutedExpressions(
  root: unknown,
): RoutedExpressionPick[] {
  const out: RoutedExpressionPick[] = [];
  const seen = new Set<unknown>();

  function walk(val: unknown): void {
    if (val === null || val === undefined) return;
    if (typeof val !== "object") return;
    if (seen.has(val)) return;
    seen.add(val);

    if (Array.isArray(val)) {
      for (const item of val) walk(item);
      return;
    }

    const o = val as Record<string, unknown>;
    const re = o.route_evidence;
    if (isRecord(re)) {
      const se = re.selected_expression;
      if (isRecord(se)) {
        const ticker =
          typeof se.ticker === "string"
            ? se.ticker.trim()
            : typeof se.routed_ticker === "string"
              ? (se.routed_ticker as string).trim()
              : "";
        if (ticker) {
          out.push({
            thesis: typeof o.thesis === "string" ? o.thesis : undefined,
            platform: typeof se.platform === "string" ? se.platform : undefined,
            ticker,
            direction:
              typeof se.direction === "string" ? se.direction : undefined,
            instrument:
              typeof se.instrument === "string" ? se.instrument : undefined,
          });
        }
      }
    }

    for (const k of Object.keys(o)) {
      walk(o[k]);
    }
  }

  walk(root);
  return out;
}

function normalizePlatform(p?: string): string {
  return (p ?? "").toLowerCase().trim();
}

function otakuExecutablePlatform(platform?: string): boolean {
  const p = normalizePlatform(platform);
  return p === "hyperliquid" || p === "polymarket";
}

function buildMessage(
  expressions: RoutedExpressionPick[],
  sourceUrl: string | undefined,
  runId: string,
  opts?: { localOnly?: boolean },
): { eligible: boolean; reason?: string; message: string } {
  const hlPm = expressions.filter((e) => otakuExecutablePlatform(e.platform));
  const robinhood = expressions.filter(
    (e) => normalizePlatform(e.platform) === "robinhood",
  );
  const unknown = expressions.filter(
    (e) =>
      !otakuExecutablePlatform(e.platform) &&
      normalizePlatform(e.platform) !== "robinhood",
  );

  const lines: string[] = [
    "[paste.trade handoff — I am asking Otaku manually; do not execute without confirming size and risk with me.]",
  ];

  if (sourceUrl) {
    lines.push(`Source: ${sourceUrl}`);
  } else if (opts?.localOnly) {
    lines.push(
      "Local-only run — no paste.trade public page (extract + theses on this server only).",
    );
  }
  lines.push(`VINCE paste-trade runId: ${runId}`);

  if (hlPm.length > 0) {
    lines.push("");
    lines.push(
      "Routed expressions I want you to evaluate for execution (if you support the venue):",
    );
    for (const e of hlPm) {
      const bits = [
        e.platform ?? "unknown_platform",
        e.ticker,
        e.direction ? `direction ${e.direction}` : null,
        e.instrument ? `instrument ${e.instrument}` : null,
        e.thesis ? `thesis: ${e.thesis}` : null,
      ].filter(Boolean);
      lines.push(`- ${bits.join(" · ")}`);
    }
    lines.push("");
    lines.push(
      "Reply with what you can execute on-chain (Hyperliquid / Polymarket as applicable), required confirmations, and risks. I will confirm size explicitly before any order.",
    );
  }

  if (robinhood.length > 0 && hlPm.length === 0) {
    return {
      eligible: false,
      reason:
        "Robinhood-tagged routes are not executable via Otaku; use a broker or re-route on Hyperliquid/Polymarket in paste.trade.",
      message: [
        ...lines,
        "",
        "Note: paste.trade selected Robinhood-only expressions:",
        ...robinhood.map(
          (e) =>
            `- ${e.ticker}${e.direction ? ` (${e.direction})` : ""}${e.thesis ? ` — ${e.thesis}` : ""}`,
        ),
      ].join("\n"),
    };
  }

  if (expressions.length === 0) {
    const fallback = [
      ...lines,
      "",
      "No routed selected_expression found in the snapshot yet. If the paste.trade page shows a trade card, refresh this handoff after routing completes, or paste the instrument and direction you want Otaku to review.",
    ].join("\n");
    return {
      eligible: false,
      reason: "No route_evidence.selected_expression in run snapshot yet.",
      message: fallback,
    };
  }

  if (hlPm.length === 0 && unknown.length > 0) {
    return {
      eligible: false,
      reason:
        "Routed picks are not on Hyperliquid or Polymarket; Otaku may not be able to execute.",
      message: [
        ...lines,
        "",
        "Expressions found but platform is not Hyperliquid/Polymarket:",
        ...unknown.map(
          (e) =>
            `- ${e.platform ?? "?"} ${e.ticker}${e.direction ? ` ${e.direction}` : ""}`,
        ),
      ].join("\n"),
    };
  }

  if (robinhood.length > 0 && hlPm.length > 0) {
    lines.push("");
    lines.push(
      "(Also on paste.trade: Robinhood candidates — I understand those are out of band for Otaku.)",
    );
  }

  return { eligible: true, message: lines.join("\n") };
}

export function buildOtakuHandoffPayload(
  rec: PasteTradeRunRecord,
): OtakuHandoffPayload {
  const fromSnapshot = collectRoutedExpressions(rec.lastSnapshot);
  let expressions = fromSnapshot;

  if (expressions.length === 0) {
    for (const ev of rec.events) {
      if (ev.event_type === "snapshot" && ev.data?.snapshot !== undefined) {
        expressions = collectRoutedExpressions(ev.data.snapshot);
        if (expressions.length > 0) break;
      }
    }
  }

  const { eligible, reason, message } = buildMessage(
    expressions,
    rec.sourceUrl,
    rec.runId,
    { localOnly: rec.localOnly },
  );

  return {
    eligible,
    reason,
    message,
    expressions,
    sourceUrl: rec.sourceUrl,
    runId: rec.runId,
  };
}
