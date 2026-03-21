/**
 * Best-effort parsing of paste.trade GET /api/sources/:id snapshots for leaderboard + Paste trade UI.
 * API shape may evolve; keep fallbacks tolerant.
 */

import type { PasteTradeRunRecord } from "@/frontend/lib/pasteTradeApi";
import { latestThesesPreviewFromEvents } from "@/frontend/lib/pasteTradeThesesPreview";
import {
  localTradePnlPct,
  normalizePasteTradeTicker,
} from "@/shared/pasteTradeMarks";

export function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

export function tradesFromSnapshot(snap: unknown): Record<string, unknown>[] {
  const root = asRecord(snap);
  if (!root) return [];
  const direct = root.trades;
  if (Array.isArray(direct)) {
    return direct.filter((t) => t && typeof t === "object") as Record<
      string,
      unknown
    >[];
  }
  const src = asRecord(root.source);
  if (src && Array.isArray(src.trades)) {
    return src.trades.filter((t) => t && typeof t === "object") as Record<
      string,
      unknown
    >[];
  }
  return [];
}

/** Thesis objects often live on the board snapshot (shape varies by API version). */
export function thesesFromSnapshot(snap: unknown): Record<string, unknown>[] {
  const root = asRecord(snap);
  if (!root) return [];
  const take = (v: unknown): Record<string, unknown>[] => {
    if (!Array.isArray(v)) return [];
    return v.filter((t) => t && typeof t === "object") as Record<
      string,
      unknown
    >[];
  };
  const direct = take(root.theses);
  if (direct.length) return direct;
  const src = asRecord(root.source);
  if (src) {
    const fromSrc = take(src.theses);
    if (fromSrc.length) return fromSrc;
  }
  const board = asRecord(root.board);
  if (board) {
    const fromBoard = take(board.theses);
    if (fromBoard.length) return fromBoard;
  }
  return [];
}

export function numFromTrade(
  t: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const k of keys) {
    const v = t[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number.parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function bestPnlFromSnapshot(
  snap: unknown,
  liveByTicker?: Record<string, number> | null,
): number | null {
  const trades = tradesFromSnapshot(snap);
  let best: number | null = null;
  for (const t of trades) {
    let p =
      numFromTrade(t, [
        "pnl_pct",
        "author_pnl_pct",
        "posted_pnl_pct",
        "performance_pct",
        "return_pct",
      ]) ?? null;
    if (p == null && liveByTicker) {
      const sym =
        (typeof t.ticker === "string" && t.ticker) ||
        (typeof t.symbol === "string" && t.symbol) ||
        "";
      const nt = normalizePasteTradeTicker(sym);
      p = localTradePnlPct(t, nt ? liveByTicker[nt] : undefined);
    }
    if (p == null) continue;
    if (best == null || p > best) best = p;
  }
  return best;
}

export function formatTradeLine(
  t: Record<string, unknown>,
  liveByTicker?: Record<string, number> | null,
): string {
  const sym =
    (typeof t.ticker === "string" && t.ticker) ||
    (typeof t.symbol === "string" && t.symbol) ||
    "?";
  const dir = (typeof t.direction === "string" && t.direction) || "";
  let p =
    numFromTrade(t, [
      "pnl_pct",
      "author_pnl_pct",
      "posted_pnl_pct",
      "performance_pct",
    ]) ?? null;
  if (p == null && liveByTicker) {
    const nt = normalizePasteTradeTicker(sym === "?" ? "" : sym);
    p = localTradePnlPct(t, nt ? liveByTicker[nt] : undefined);
  }
  const pStr = p != null ? `${p >= 0 ? "+" : ""}${p.toFixed(1)}%` : "—";
  return `${sym} ${dir} ${pStr}`.trim();
}

function tradeStringField(t: Record<string, unknown>, k: string): string {
  const v = t[k];
  return typeof v === "string" ? v.trim() : "";
}

/** Parse `reference_captured_at` ISO or fall back to run time. */
export function extractInstantMsForTrade(
  t: Record<string, unknown>,
  fallbackMs?: number,
): number | null {
  const iso = tradeStringField(t, "reference_captured_at");
  if (iso) {
    const d = Date.parse(iso);
    if (!Number.isNaN(d)) return d;
  }
  if (fallbackMs != null && Number.isFinite(fallbackMs)) return fallbackMs;
  return null;
}

export function formatLocalExtractTimeLabel(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatPasteTradeRefUsd(n: number): string {
  return `$${n.toLocaleString(undefined, {
    maximumFractionDigits: n >= 1_000 ? 1 : 2,
    minimumFractionDigits: n >= 1_000 ? 0 : 2,
  })}`;
}

/**
 * Dense leg line: `BTC LONG at $70,690 since 3/21/26, 2:24 PM · +0.12%`
 * (time = reference capture or run fallback; % uses liveByTicker when needed).
 */
export function formatPasteTradeLegSummary(
  t: Record<string, unknown>,
  opts?: {
    liveByTicker?: Record<string, number> | null;
    fallbackExtractMs?: number;
  },
): string {
  const symRaw =
    (typeof t.ticker === "string" && t.ticker) ||
    (typeof t.symbol === "string" && t.symbol) ||
    "?";
  const sym = symRaw.trim().toUpperCase() || symRaw;
  const dirRaw = (typeof t.direction === "string" && t.direction) || "";
  const dirU = dirRaw.trim().toUpperCase() || dirRaw;
  const ref =
    numFromTrade(t, [
      "reference_price_usd",
      "entry_price",
      "author_entry_price",
      "posted_entry_price",
      "call_price",
    ]) ?? null;
  const tMs = extractInstantMsForTrade(t, opts?.fallbackExtractMs);
  const timeZ = tMs != null ? formatLocalExtractTimeLabel(tMs) : null;

  let p =
    numFromTrade(t, [
      "pnl_pct",
      "author_pnl_pct",
      "posted_pnl_pct",
      "performance_pct",
    ]) ?? null;
  if (p == null && opts?.liveByTicker) {
    const nt = normalizePasteTradeTicker(sym === "?" ? "" : sym);
    p = localTradePnlPct(t, nt ? opts.liveByTicker[nt] : undefined);
  }

  let core: string;
  if (ref != null && timeZ) {
    core =
      `${sym} ${dirU} at ${formatPasteTradeRefUsd(ref)} since ${timeZ}`.trim();
  } else if (ref != null) {
    core = `${sym} ${dirU} at ${formatPasteTradeRefUsd(ref)}`.trim();
  } else if (timeZ) {
    core = `${sym} ${dirU} since ${timeZ}`.trim();
  } else {
    core = `${sym} ${dirU}`.trim();
  }

  const pStr = p != null ? ` · ${p >= 0 ? "+" : ""}${p.toFixed(2)}%` : "";
  return `${core}${pStr}`.trim();
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 48 ? `${url.slice(0, 48)}…` : url;
  }
}

function strField(o: Record<string, unknown>, k: string): string {
  const v = o[k];
  return typeof v === "string" ? v.trim() : "";
}

/** Pull display strings for the first thesis on the snapshot, if any. */
export function firstThesisReadout(snap: unknown): {
  headline: string;
  thesis: string;
  whyLines: string[];
} | null {
  const list = thesesFromSnapshot(snap);
  const t = list[0];
  if (!t) return null;
  const headline =
    strField(t, "headline_quote") || strField(t, "headline") || "";
  const thesis = strField(t, "thesis") || "";
  if (!headline && !thesis) return null;
  const whyRaw = t.why;
  const whyLines: string[] = [];
  if (Array.isArray(whyRaw)) {
    for (const w of whyRaw) {
      if (typeof w === "string" && w.trim()) whyLines.push(w.trim());
      else if (w && typeof w === "object" && "text" in w) {
        const tx = (w as { text?: unknown }).text;
        if (typeof tx === "string" && tx.trim()) whyLines.push(tx.trim());
      }
    }
  }
  return {
    headline: headline || thesis.slice(0, 140),
    thesis: thesis || headline,
    whyLines,
  };
}

/** True when snapshot was synthesized for a local-only run (no paste.trade board). */
export function snapshotIsLocalOnly(snap: unknown): boolean {
  const r = asRecord(snap);
  return r?.local_only === true;
}

/**
 * Lines for leaderboard paste-trade rows: API trades first, else thesis preview from events.
 */
export function leaderboardTradeLinesForRun(
  rec: PasteTradeRunRecord,
  liveByTicker?: Record<string, number> | null,
): string[] {
  const trades = tradesFromSnapshot(rec.lastSnapshot);
  if (trades.length > 0) {
    return trades.slice(0, 4).map((t) =>
      formatPasteTradeLegSummary(t, {
        liveByTicker,
        fallbackExtractMs: rec.updatedAt,
      }),
    );
  }
  const prev = latestThesesPreviewFromEvents(rec);
  if (prev?.length) {
    const when = formatLocalExtractTimeLabel(rec.updatedAt);
    return prev.slice(0, 4).map((row) => {
      const w0 = row.who.find((w) => w.ticker.trim());
      if (w0?.ticker) {
        const sym = w0.ticker.trim().toUpperCase();
        const d = (w0.direction || "").trim().toUpperCase();
        return `${sym} ${d} since ${when} · ref $ pending (finish run for price + %)`;
      }
      const hook =
        row.headline_quote.trim() || row.thesis.trim().slice(0, 80) || "thesis";
      return `${hook.slice(0, 72)}… since ${when} · ref pending`;
    });
  }
  return [];
}
