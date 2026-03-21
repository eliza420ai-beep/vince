"use client";

import { useMemo, useState } from "react";
import { Button } from "@/frontend/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/frontend/components/ui/collapsible";
import { cn } from "@/frontend/lib/utils";
import {
  buildOtakuExpressMessage,
  hoursSinceMs,
  latestThesesPreviewFromEvents,
  type ThesisPreviewRow,
} from "@/frontend/lib/pasteTradeThesesPreview";
import {
  bestPnlFromSnapshot,
  extractInstantMsForTrade,
  firstThesisReadout,
  formatLocalExtractTimeLabel,
  formatPasteTradeLegSummary,
  formatPasteTradeRefUsd,
  hostnameFromUrl,
  numFromTrade,
  snapshotIsLocalOnly,
  tradesFromSnapshot,
} from "@/frontend/lib/pasteTradeSnapshot";
import { usePasteTradeLiveMarksMap } from "@/frontend/lib/usePasteTradeLiveMarks";
import {
  localTradePnlPct,
  normalizePasteTradeTicker,
} from "@/shared/pasteTradeMarks";
import type {
  PasteTradeOtakuHandoff,
  PasteTradeRunRecord,
} from "@/frontend/lib/pasteTradeApi";

function tradeSymbol(t: Record<string, unknown>): string {
  return (
    (typeof t.ticker === "string" && t.ticker) ||
    (typeof t.symbol === "string" && t.symbol) ||
    "—"
  );
}

function tradeDirection(t: Record<string, unknown>): string {
  return (typeof t.direction === "string" && t.direction) || "";
}

function refTradeForPreviewRow(
  row: ThesisPreviewRow,
  tradeRows: Record<string, unknown>[],
): Record<string, unknown> | null {
  const w0 = row.who.find((w) => w.ticker.trim());
  if (!w0?.ticker?.trim()) return null;
  const nt = normalizePasteTradeTicker(w0.ticker);
  const hit = tradeRows.find(
    (t) => normalizePasteTradeTicker(tradeSymbol(t)) === nt,
  );
  return hit ?? null;
}

/**
 * Layout cues from paste.trade source pages (e.g. app.paste.trade/s/…):
 * source strip → summary row → thesis + collapsible reasoning.
 * We only show live P&amp;L / entry when the server snapshot includes trade rows.
 */
export function TradeReadoutPanel({
  record,
  handoff,
}: {
  record: PasteTradeRunRecord;
  handoff: PasteTradeOtakuHandoff | null;
}) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [expressCopiedIdx, setExpressCopiedIdx] = useState<number | null>(null);
  const snap = record.lastSnapshot;
  const trades = tradesFromSnapshot(snap);
  const firstTrade = trades[0] ?? null;
  const thesisReadout = firstThesisReadout(snap);
  const expr0 = handoff?.expressions?.[0];

  const thesesPreview = latestThesesPreviewFromEvents(record);

  const tickersForMarks = useMemo(() => {
    const s = new Set<string>();
    if (thesesPreview) {
      for (const row of thesesPreview) {
        for (const w of row.who) {
          const x = normalizePasteTradeTicker(w.ticker);
          if (x) s.add(x);
        }
      }
    }
    if (firstTrade) {
      const x = normalizePasteTradeTicker(tradeSymbol(firstTrade));
      if (x) s.add(x);
    }
    return [...s];
  }, [thesesPreview, firstTrade]);

  const pollMarks =
    !!record.localOnly ||
    snapshotIsLocalOnly(snap) ||
    (trades.length > 0 && snapshotIsLocalOnly(snap));
  const liveByTicker = usePasteTradeLiveMarksMap(
    pollMarks && tickersForMarks.length > 0,
    tickersForMarks,
  );

  const bestPnl = bestPnlFromSnapshot(snap, liveByTicker);

  const summarySymbol = firstTrade
    ? tradeSymbol(firstTrade)
    : (expr0?.ticker ?? "—");
  const summaryDir = (
    firstTrade ? tradeDirection(firstTrade) : (expr0?.direction ?? "")
  ).toUpperCase();
  const summaryPlatform = (
    firstTrade
      ? (typeof firstTrade.platform === "string" && firstTrade.platform) || ""
      : (expr0?.platform ?? "")
  ).toLowerCase();

  const refPx = firstTrade
    ? numFromTrade(firstTrade, [
        "reference_price_usd",
        "entry_price",
        "author_entry_price",
        "posted_entry_price",
        "call_price",
      ])
    : null;
  const markPxStored = firstTrade
    ? numFromTrade(firstTrade, [
        "mark_price",
        "current_price",
        "last_price",
        "spot",
      ])
    : null;
  const summaryNt = normalizePasteTradeTicker(
    firstTrade ? tradeSymbol(firstTrade) : "",
  );
  const markPxLive =
    summaryNt && liveByTicker?.[summaryNt] != null
      ? liveByTicker[summaryNt]!
      : null;
  const markPx = markPxLive ?? markPxStored;

  const rowPnlFromSnap = firstTrade
    ? numFromTrade(firstTrade, [
        "pnl_pct",
        "author_pnl_pct",
        "posted_pnl_pct",
        "performance_pct",
      ])
    : null;
  const rowPnlLive =
    firstTrade && rowPnlFromSnap == null
      ? localTradePnlPct(
          firstTrade,
          summaryNt ? liveByTicker?.[summaryNt] : undefined,
        )
      : null;
  const rowPnl = rowPnlFromSnap ?? rowPnlLive ?? bestPnl;

  const sourceLabel = record.inputUrl?.trim()
    ? hostnameFromUrl(record.inputUrl.trim())
    : "Typed thesis";
  const when = new Date(record.createdAt).toLocaleString();

  const copyExpress = async (row: ThesisPreviewRow, idx: number) => {
    const text = buildOtakuExpressMessage(row, record.runId);
    try {
      await navigator.clipboard.writeText(text);
      setExpressCopiedIdx(idx);
      setTimeout(() => setExpressCopiedIdx(null), 2500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-border bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      <div className="px-4 py-3 border-b border-border/80 bg-muted/25">
        <h2 className="text-lg font-display">Trade readout</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
          Same information architecture as{" "}
          <a
            href="https://app.paste.trade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            paste.trade
          </a>
          : source → strip → thesis. Remote board % comes from paste.trade
          snapshots; <strong className="text-foreground/90">local-only</strong>{" "}
          uses Hyperliquid mids + CoinGecko fallback, refreshed ~45s, vs a
          reference captured at extract. Below,{" "}
          <strong className="text-foreground/90">Extracted trade view</strong>{" "}
          mirrors a paste.trade thesis card (headline, leg, reasoning) so you
          can express the view in chat — even without a live board snapshot.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Source card */}
        <div className="rounded-lg border border-border/80 bg-card/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-medium text-foreground">{sourceLabel}</span>
            <span className="text-muted-foreground tabular-nums">{when}</span>
          </div>
          {record.localOnly ? (
            <p className="text-[10px] uppercase tracking-wide text-amber-600/90 dark:text-amber-400/90">
              Local-only — marks from Hyperliquid / CoinGecko (not the
              paste.trade board). % is vs price at pipeline extract (tweet-time
              proxy).
            </p>
          ) : null}
          {record.inputText?.trim() ? (
            <div className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-foreground/95 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {record.inputText.trim().slice(0, 2_000)}
              {record.inputText.trim().length > 2_000 ? "…" : ""}
            </div>
          ) : null}
          {record.inputUrl?.trim() ? (
            <a
              href={record.inputUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary font-mono break-all hover:underline"
            >
              Open original →
            </a>
          ) : null}
        </div>

        {/* Paste.trade-style card from pipeline theses (works for local-only) */}
        {thesesPreview && thesesPreview.length > 0 ? (
          <div className="space-y-4">
            {thesesPreview.map((row, idx) => {
              const w0 = row.who.find((w) => w.ticker.trim());
              const sym = w0?.ticker?.trim() || "—";
              const refT = refTradeForPreviewRow(row, trades);
              const nt = w0?.ticker ? normalizePasteTradeTicker(w0.ticker) : "";
              const liveU =
                nt && liveByTicker?.[nt] != null ? liveByTicker[nt]! : null;
              const refEntry = refT
                ? numFromTrade(refT, [
                    "reference_price_usd",
                    "entry_price",
                    "author_entry_price",
                    "posted_entry_price",
                    "call_price",
                  ])
                : null;
              const pnlRow =
                refT && liveU != null ? localTradePnlPct(refT, liveU) : null;
              const sinceMs = refT
                ? (extractInstantMsForTrade(refT, record.updatedAt) ??
                  record.updatedAt)
                : record.updatedAt;
              const sinceLabel = formatLocalExtractTimeLabel(sinceMs);
              const dirRaw = (w0?.direction ?? "").trim();
              const dirU = dirRaw.toUpperCase();
              const isLong =
                dirU === "LONG" ||
                dirU === "YES" ||
                dirU === "BUY" ||
                dirU === "BULL";
              const isShort =
                dirU === "SHORT" ||
                dirU === "NO" ||
                dirU === "SELL" ||
                dirU === "BEAR";
              const headline =
                row.headline_quote.trim() ||
                row.thesis.trim().slice(0, 160) ||
                "Extracted thesis";
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-border/90 bg-card/60 overflow-hidden shadow-sm"
                >
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Extracted trade view
                      {thesesPreview.length > 1
                        ? ` (${idx + 1}/${thesesPreview.length})`
                        : ""}
                    </span>
                    {row.route_status ? (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {String(row.route_status)}
                      </span>
                    ) : null}
                  </div>
                  <div className="px-4 pb-2">
                    <blockquote className="text-lg font-semibold leading-snug">
                      “{headline}”
                    </blockquote>
                    {row.thesis.trim() && row.thesis.trim() !== headline ? (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {row.thesis.trim()}
                      </p>
                    ) : null}
                  </div>

                  <div className="mx-4 mb-3 rounded-lg border border-border/70 bg-background/80 px-3 py-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/25 text-xs font-bold text-amber-800 dark:text-amber-200">
                        {sym.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-mono font-semibold leading-snug">
                          <span className="text-foreground">{sym}</span>{" "}
                          {dirU ? (
                            <span
                              className={cn(
                                isLong &&
                                  "text-emerald-600 dark:text-emerald-400",
                                isShort && "text-red-600 dark:text-red-400",
                                !isLong && !isShort && "text-muted-foreground",
                              )}
                            >
                              {dirU}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs font-normal">
                              no direction
                            </span>
                          )}{" "}
                          <span className="text-muted-foreground font-normal font-mono text-xs sm:text-sm">
                            {refEntry != null
                              ? `at ${formatPasteTradeRefUsd(refEntry)} since ${sinceLabel}`
                              : `since ${sinceLabel}`}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {pollMarks
                            ? "Live mark polls HL / CoinGecko; % vs reference at extract. Publish to paste.trade for their author vs posted board math."
                            : "Publish to paste.trade for board-level author vs posted pricing."}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs shrink-0 space-y-0.5">
                      <p className="font-mono text-muted-foreground">
                        {liveU != null
                          ? `live $${liveU.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : refEntry != null
                            ? `ref $${refEntry.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : "—"}
                      </p>
                      <p
                        className={cn(
                          pnlRow != null
                            ? pnlRow >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                            : "text-emerald-600/70 dark:text-emerald-400/70",
                        )}
                      >
                        {pnlRow != null
                          ? `${pnlRow >= 0 ? "+" : ""}${pnlRow.toFixed(2)}%`
                          : liveU != null
                            ? "…"
                            : "% TBD"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        updated {hoursSinceMs(record.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {row.why_preview.length > 0 ? (
                    <div className="px-4 pb-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                        Reasoning
                      </p>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                        {row.why_preview.map((line, i) => (
                          <li key={i} className="leading-snug">
                            {line}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void copyExpress(row, idx)}
                    >
                      {expressCopiedIdx === idx
                        ? "Copied"
                        : "Copy message for Otaku"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground self-center max-w-md">
                      Pastes a structured ask so Otaku can map this to a venue
                      and size — same intent as “trade SP500 on hyperliquid →”
                      on paste.trade, but in your execution flow.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Summary strip (paste.trade–style pill row) */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
            "bg-muted/40 border-border/80",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-300">
              {summarySymbol.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{summarySymbol}</p>
              {firstTrade ? (
                <p className="text-[11px] font-mono text-foreground/90 mt-1 leading-snug break-words">
                  {formatPasteTradeLegSummary(firstTrade, {
                    liveByTicker,
                    fallbackExtractMs: record.updatedAt,
                  })}
                </p>
              ) : null}
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                {summaryPlatform ||
                  (record.localOnly ? "local run" : "venue unknown")}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {summaryDir ? (
              <p className="text-sm font-mono font-semibold">
                {summaryDir}
                {rowPnl != null ? (
                  <span
                    className={cn(
                      "ml-2",
                      rowPnl >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {rowPnl >= 0 ? "+" : ""}
                    {rowPnl.toFixed(2)}%
                  </span>
                ) : pollMarks && summaryNt ? (
                  <span className="ml-2 text-muted-foreground text-xs font-normal">
                    fetching mark…
                  </span>
                ) : (
                  <span className="ml-2 text-muted-foreground text-xs font-normal">
                    no % in snapshot
                  </span>
                )}
              </p>
            ) : record.localOnly ? (
              <p className="text-xs text-muted-foreground text-right max-w-[220px] ml-auto leading-snug">
                No paste.trade public board — HL/CG marks still update here. Use{" "}
                <span className="text-foreground/90">Otaku handoff</span> for
                execution, or publish for paste.trade board P&amp;L.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Awaiting route / snapshot from paste.trade…
              </p>
            )}
          </div>
        </div>

        {/* Ref at extract / live mark */}
        {firstTrade && (refPx != null || markPx != null) ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs font-mono space-y-1">
            {refPx != null ? (
              <p>
                <span className="text-muted-foreground">Ref (at extract)</span>{" "}
                {summarySymbol} @ $
                {refPx.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            ) : null}
            {markPx != null ? (
              <p>
                <span className="text-muted-foreground">
                  Mark{markPxLive != null ? " (live)" : ""}
                </span>{" "}
                $
                {markPx.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Thesis card */}
        {thesisReadout ? (
          <div className="rounded-lg border border-border/80 bg-card/40 p-4 space-y-3">
            <blockquote className="text-base font-medium leading-snug border-l-2 border-primary/60 pl-3">
              “{thesisReadout.headline}”
            </blockquote>
            {thesisReadout.thesis !== thesisReadout.headline ? (
              <p className="text-sm text-muted-foreground">
                {thesisReadout.thesis}
              </p>
            ) : null}
            {thesisReadout.whyLines.length > 0 ? (
              <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen}>
                <CollapsibleTrigger className="text-xs text-primary hover:underline font-medium">
                  {reasoningOpen ? "▼ hide reasoning" : "▸ show reasoning"}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal pl-4">
                    {thesisReadout.whyLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ol>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        ) : handoff && handoff.expressions.length > 0 ? (
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-3 text-xs text-muted-foreground">
            No thesis block in snapshot yet. Use{" "}
            <span className="font-medium text-foreground">Otaku handoff</span>{" "}
            below for routed picks, or open the paste.trade page when published.
          </div>
        ) : null}

        {record.sourceUrl?.trim() ? (
          <p className="text-center">
            <a
              href={record.sourceUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Full board on paste.trade →
            </a>
          </p>
        ) : null}

        {summaryPlatform === "hyperliquid" && expr0?.ticker ? (
          <p className="text-center">
            <a
              href="https://app.hyperliquid.xyz/trade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Open Hyperliquid (find {expr0.ticker}) →
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
