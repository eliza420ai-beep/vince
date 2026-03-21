import type { PasteTradeRunRecord } from "@/frontend/lib/pasteTradeApi";

export interface ThesisPreviewWho {
  ticker: string;
  direction: string;
}

export interface ThesisPreviewRow {
  thesis: string;
  headline_quote: string;
  route_status: string | null;
  unrouted_reason: string | null;
  who: ThesisPreviewWho[];
  why_preview: string[];
}

function asPreviewRow(x: unknown): ThesisPreviewRow | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const thesis = typeof o.thesis === "string" ? o.thesis : "";
  const headline_quote =
    typeof o.headline_quote === "string" ? o.headline_quote : "";
  const route_status =
    typeof o.route_status === "string" ? o.route_status : null;
  const unrouted_reason =
    typeof o.unrouted_reason === "string" ? o.unrouted_reason : null;
  const whoRaw = Array.isArray(o.who) ? o.who : [];
  const who: ThesisPreviewWho[] = [];
  for (const w of whoRaw) {
    if (!w || typeof w !== "object") continue;
    const r = w as Record<string, unknown>;
    const ticker = typeof r.ticker === "string" ? r.ticker : "";
    const direction = typeof r.direction === "string" ? r.direction : "";
    who.push({ ticker, direction });
  }
  const whyRaw = Array.isArray(o.why_preview) ? o.why_preview : [];
  const why_preview = whyRaw.filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  if (!thesis && !headline_quote && who.length === 0) return null;
  return {
    thesis,
    headline_quote,
    route_status,
    unrouted_reason,
    who,
    why_preview,
  };
}

/** Latest batch thesis preview from pipeline `theses_saved` (local + remote). */
export function latestThesesPreviewFromEvents(
  record: PasteTradeRunRecord,
): ThesisPreviewRow[] | null {
  for (let i = record.events.length - 1; i >= 0; i--) {
    const ev = record.events[i]!;
    if (ev.event_type !== "theses_saved") continue;
    const tp = ev.data?.theses_preview;
    if (!Array.isArray(tp) || tp.length === 0) continue;
    const rows = tp.map(asPreviewRow).filter(Boolean) as ThesisPreviewRow[];
    return rows.length ? rows : null;
  }
  return null;
}

export function hoursSinceMs(ts: number): string {
  const h = Math.floor((Date.now() - ts) / 3_600_000);
  if (h < 1) return "<1h";
  return `${h}h`;
}

/**
 * Paste-trading expression: what to say to Otaku so the view becomes an explicit trade request.
 */
export function buildOtakuExpressMessage(
  row: ThesisPreviewRow,
  runId: string,
): string {
  const w0 = row.who.find((w) => w.ticker.trim());
  const leg = w0?.ticker
    ? `${w0.ticker}${w0.direction ? ` ${w0.direction}` : ""}`.trim()
    : "";
  const hook =
    row.headline_quote.trim() ||
    row.thesis.slice(0, 200) ||
    "this extracted thesis";
  const lines = [
    `[VINCE paste-trade run ${runId}]`,
    `I want to express this view as a trade (you confirm venue, size, and risk before any order — TRADING_RUNTIME_CONTRACT).`,
    "",
    `Hook: ${hook}`,
    row.thesis.trim() ? `Thesis: ${row.thesis.trim()}` : "",
    leg
      ? `Primary leg from extraction: ${leg}`
      : "No ticker/direction in who[] — help me pick an instrument.",
    row.route_status === "unrouted" && row.unrouted_reason
      ? `Route status: unrouted (${row.unrouted_reason})`
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}
