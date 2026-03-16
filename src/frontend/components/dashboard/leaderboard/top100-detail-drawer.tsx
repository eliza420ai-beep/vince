import type {
  Top100DetailsPayload,
  Top100StockRow,
} from "@/frontend/lib/leaderboardsApi";
import { cn } from "@/frontend/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/frontend/components/ui/sheet";

function fmtPct(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtMcap(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  return `${(v / 1e9).toFixed(1)}B`;
}

function fmtUpdatedAt(value?: string | number) {
  if (value == null) return "—";
  const t = typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(t)) return String(value);
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins <= 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function dailyRitualNotes(row: Top100StockRow): string[] {
  const notes: string[] = [];
  if (row.enteredTop10) notes.push("New live top-10 entrant.");
  if (row.enteredTop25) notes.push("Fresh live top-25 entrant.");
  if ((row.historyRankDrift ?? 0) >= 5) {
    notes.push(`Climbing fast vs prior snapshot (+${row.historyRankDrift}).`);
  }
  if (
    (row.change1dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
    (row.change7dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
    (row.change30dPct ?? Number.NEGATIVE_INFINITY) > 0
  ) {
    notes.push("Trend continuation across 1D, 7D, and 30D.");
  }
  if (
    (row.change1dPct ?? Number.POSITIVE_INFINITY) < 0 &&
    (row.change7dPct ?? Number.NEGATIVE_INFINITY) > 0 &&
    (row.change30dPct ?? Number.NEGATIVE_INFINITY) > 0
  ) {
    notes.push("Pullback in an uptrend.");
  }
  if ((row.flags?.length ?? 0) > 0 || row.riskSummary) {
    notes.push("Risk flag review required before pressing size.");
  }
  const upside =
    typeof row.upsidePct === "string"
      ? Number(row.upsidePct.replace(/[^0-9.-]/g, ""))
      : Number.NaN;
  if (Number.isFinite(upside) && upside >= 15 && (row.change30dPct ?? 0) > 0) {
    notes.push("Street upside still lines up with the tape.");
  }
  return notes.slice(0, 3);
}

function factorCards(
  row: Top100StockRow,
): Array<{ label: string; value?: number }> {
  return [
    { label: "Growth", value: row.growthScore },
    { label: "Valuation", value: row.valuationScore },
    { label: "Momentum", value: row.momentumScore },
    { label: "Profit", value: row.profitScore },
    { label: "Earnings", value: row.earningsScore },
    { label: "Balance sheet", value: row.balanceSheetScore },
    { label: "Insider", value: row.insiderScore },
  ].filter((item) => typeof item.value === "number");
}

function Sparkline({
  points,
  height = 44,
}: {
  points?: Array<{ date: string; close: number }>;
  height?: number;
}) {
  if (!points?.length || points.length < 2) {
    return <div className="h-11 w-full rounded bg-muted/20" />;
  }
  const width = 320;
  const values = points.map((p) => p.close).filter(Number.isFinite);
  if (values.length < 2) {
    return <div className="h-11 w-full rounded bg-muted/20" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.0001);
  const coords = points.map((p, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((p.close - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = points[points.length - 1].close >= points[0].close;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label="30 day cached price trend"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={coords.join(" ")}
        className={cn(
          up
            ? "text-emerald-500/90 dark:text-emerald-400/90"
            : "text-rose-500/90 dark:text-rose-400/90",
        )}
      />
    </svg>
  );
}

function historyDriftChip(row: Top100StockRow) {
  if (typeof row.historyRankDrift !== "number") return null;
  const improving = row.historyRankDrift > 0;
  const flat = row.historyRankDrift === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono",
        flat
          ? "border-border/60 bg-muted/30 text-muted-foreground"
          : improving
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      Drift {improving ? "+" : ""}
      {row.historyRankDrift}
    </span>
  );
}

function MiniMetric({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-sm font-mono", className)}>{value}</div>
    </div>
  );
}

export function Top100DetailDrawer(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: Top100StockRow | null;
  detail: Top100DetailsPayload | null;
  loading?: boolean;
  error?: string | null;
}) {
  const r = props.row;
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-auto">
        <SheetHeader>
          <SheetTitle>
            {r ? (
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{r.ticker}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.company ?? "—"} · {r.category}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {r.convictionTier ? (
                      <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                        Conviction {r.convictionTier}
                      </span>
                    ) : null}
                    {r.theme ? (
                      <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {r.theme}
                      </span>
                    ) : null}
                    {r.enteredTop10 ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        New top 10
                      </span>
                    ) : null}
                    {r.enteredTop25 ? (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">
                        New top 25
                      </span>
                    ) : null}
                    {historyDriftChip(r)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">
                    {typeof r.priceLive === "number"
                      ? r.priceLive.toFixed(2)
                      : (r.price ?? "—")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.quoteSource ? `${r.quoteSource}` : "no quote"} ·{" "}
                    {r.quoteUpdatedAt ? fmtUpdatedAt(r.quoteUpdatedAt) : "—"}
                    {r.quoteStale ? " · stale" : ""}
                  </div>
                </div>
              </div>
            ) : (
              "Top100 details"
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {props.loading ? (
            <div className="space-y-3">
              <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
              <div className="h-44 rounded-xl bg-muted/40 animate-pulse" />
            </div>
          ) : props.error ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-4 text-sm">
              {props.error}
            </div>
          ) : null}

          {r ? (
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="1D" value={fmtPct(r.change1dPct)} />
              <MiniMetric label="7D" value={fmtPct(r.change7dPct)} />
              <MiniMetric label="30D" value={fmtPct(r.change30dPct)} />
              <MiniMetric
                label={
                  r.marketCapSource === "profile_cache"
                    ? "Market cap (profile)"
                    : "Market cap"
                }
                value={fmtMcap(r.marketCap)}
              />
              <MiniMetric
                label="Prev live rank"
                value={
                  typeof r.prevLiveRank === "number"
                    ? String(r.prevLiveRank)
                    : "—"
                }
              />
              <MiniMetric
                label="History drift"
                value={
                  typeof r.historyRankDrift === "number"
                    ? `${r.historyRankDrift >= 0 ? "+" : ""}${r.historyRankDrift}`
                    : "—"
                }
              />
              <MiniMetric
                label="Composite"
                value={(r.composite ?? 0).toFixed(1)}
              />
              <MiniMetric
                label="Upside"
                value={r.upsidePct ?? "—"}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
          ) : null}

          {r && dailyRitualNotes(r).length ? (
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold">Daily ritual</div>
                {typeof r.historyRankDrift === "number" ? (
                  <div className="text-[11px] font-mono text-muted-foreground">
                    drift {r.historyRankDrift >= 0 ? "+" : ""}
                    {r.historyRankDrift}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {dailyRitualNotes(r).map((note) => (
                  <div key={note} className="rounded-md bg-muted/20 px-3 py-2">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {r && factorCards(r).length ? (
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold">Score breakdown</div>
                <div className="text-[11px] text-muted-foreground">
                  Parsed from scorecard
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {factorCards(r).map((item) => (
                  <MiniMetric
                    key={item.label}
                    label={item.label}
                    value={
                      typeof item.value === "number"
                        ? item.value.toFixed(1)
                        : "—"
                    }
                    className={cn(
                      typeof item.value === "number" && item.value >= 70
                        ? "text-emerald-600 dark:text-emerald-400"
                        : typeof item.value === "number" && item.value >= 55
                          ? "text-amber-600 dark:text-amber-400"
                          : undefined,
                    )}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {r &&
          (typeof r.revenueGrowthYoyPct === "number" ||
            typeof r.operatingMarginPct === "number" ||
            typeof r.grossMarginPct === "number" ||
            typeof r.daysSinceEarnings === "number" ||
            typeof r.earningsSurprisePct === "number" ||
            r.recent8k === true ||
            r.recent10q === true ||
            r.recent10k === true ||
            typeof r.insiderBuySellSkew === "number" ||
            typeof r.insiderBuyCount === "number" ||
            typeof r.insiderSellCount === "number" ||
            typeof r.volRealized20d === "number" ||
            typeof r.dollarVolumeAvg === "number" ||
            typeof r.drawdownPct === "number") ? (
            <div className="rounded-xl border border-border/60 p-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold">FD context</div>
                {typeof r.fdSnapshotAt === "number" ? (
                  <div className="text-[11px] text-muted-foreground">
                    Snapshot {fmtUpdatedAt(r.fdSnapshotAt)}
                  </div>
                ) : null}
              </div>

              {(typeof r.revenueGrowthYoyPct === "number" ||
                typeof r.operatingMarginPct === "number" ||
                typeof r.grossMarginPct === "number") && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Quality
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {typeof r.revenueGrowthYoyPct === "number" ? (
                      <MiniMetric
                        label="Rev growth YoY"
                        value={fmtPct(r.revenueGrowthYoyPct)}
                      />
                    ) : null}
                    {typeof r.operatingMarginPct === "number" ? (
                      <MiniMetric
                        label="Op margin"
                        value={fmtPct(r.operatingMarginPct)}
                      />
                    ) : null}
                    {typeof r.grossMarginPct === "number" ? (
                      <MiniMetric
                        label="Gross margin"
                        value={fmtPct(r.grossMarginPct)}
                      />
                    ) : null}
                  </div>
                </div>
              )}

              {(typeof r.daysSinceEarnings === "number" ||
                typeof r.earningsSurprisePct === "number" ||
                r.recent8k === true ||
                r.recent10q === true ||
                r.recent10k === true) && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Catalyst
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typeof r.daysSinceEarnings === "number" ? (
                      <MiniMetric
                        label="Days since earnings"
                        value={String(r.daysSinceEarnings)}
                      />
                    ) : null}
                    {typeof r.earningsSurprisePct === "number" ? (
                      <MiniMetric
                        label="Earnings surprise"
                        value={fmtPct(r.earningsSurprisePct)}
                      />
                    ) : null}
                    {r.recent8k === true ? (
                      <span className="inline-flex items-center rounded border border-border/60 bg-muted/20 px-2 py-1 text-[10px]">
                        Recent 8-K
                      </span>
                    ) : null}
                    {r.recent10q === true ? (
                      <span className="inline-flex items-center rounded border border-border/60 bg-muted/20 px-2 py-1 text-[10px]">
                        Recent 10-Q
                      </span>
                    ) : null}
                    {r.recent10k === true ? (
                      <span className="inline-flex items-center rounded border border-border/60 bg-muted/20 px-2 py-1 text-[10px]">
                        Recent 10-K
                      </span>
                    ) : null}
                  </div>
                </div>
              )}

              {(typeof r.insiderBuySellSkew === "number" ||
                typeof r.insiderBuyCount === "number" ||
                typeof r.insiderSellCount === "number") && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Insider
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typeof r.insiderBuySellSkew === "number" ? (
                      <MiniMetric
                        label="Buy/sell skew"
                        value={r.insiderBuySellSkew.toFixed(2)}
                      />
                    ) : null}
                    {typeof r.insiderBuyCount === "number" ? (
                      <MiniMetric
                        label="Buys"
                        value={String(r.insiderBuyCount)}
                      />
                    ) : null}
                    {typeof r.insiderSellCount === "number" ? (
                      <MiniMetric
                        label="Sells"
                        value={String(r.insiderSellCount)}
                      />
                    ) : null}
                  </div>
                </div>
              )}

              {(typeof r.volRealized20d === "number" ||
                typeof r.dollarVolumeAvg === "number" ||
                typeof r.drawdownPct === "number") && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    Risk / liquidity
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typeof r.volRealized20d === "number" ? (
                      <MiniMetric
                        label="Realized vol 20d"
                        value={fmtPct(r.volRealized20d * 100)}
                      />
                    ) : null}
                    {typeof r.dollarVolumeAvg === "number" ? (
                      <MiniMetric
                        label="Avg $ volume"
                        value={
                          r.dollarVolumeAvg >= 1e9
                            ? `${(r.dollarVolumeAvg / 1e9).toFixed(2)}B`
                            : r.dollarVolumeAvg >= 1e6
                              ? `${(r.dollarVolumeAvg / 1e6).toFixed(1)}M`
                              : r.dollarVolumeAvg >= 1e3
                                ? `${(r.dollarVolumeAvg / 1e3).toFixed(1)}K`
                                : String(r.dollarVolumeAvg)
                        }
                      />
                    ) : null}
                    {typeof r.drawdownPct === "number" ? (
                      <MiniMetric
                        label="Drawdown"
                        value={fmtPct(r.drawdownPct)}
                        className="text-rose-600 dark:text-rose-400"
                      />
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {r &&
          !(
            typeof r.revenueGrowthYoyPct === "number" ||
            typeof r.operatingMarginPct === "number" ||
            typeof r.grossMarginPct === "number" ||
            typeof r.daysSinceEarnings === "number" ||
            typeof r.earningsSurprisePct === "number" ||
            r.recent8k === true ||
            r.recent10q === true ||
            r.recent10k === true ||
            typeof r.insiderBuySellSkew === "number" ||
            typeof r.insiderBuyCount === "number" ||
            typeof r.insiderSellCount === "number" ||
            typeof r.volRealized20d === "number" ||
            typeof r.dollarVolumeAvg === "number" ||
            typeof r.drawdownPct === "number"
          ) ? (
            <div className="rounded-xl border border-border/60 border-dashed p-4 bg-muted/10">
              <div className="text-sm font-semibold text-muted-foreground">
                FD context
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Quality, catalyst, insider, and risk/liquidity metrics appear
                once FD snapshots exist for this ticker (from portfolio
                universe). Run the FD snapshot refresh task (fundamentals,
                earnings, filings, insiders, company facts) and ensure{" "}
                <code className="text-[10px] bg-muted/40 px-1 rounded">
                  VINCE_TOP100_FD_SNAPSHOT_REFRESH_ENABLED
                </code>{" "}
                is not disabled.
              </p>
            </div>
          ) : null}

          {(props.detail?.analystEstimatesSummary ||
            props.detail?.companyFactsSnapshot ||
            props.detail?.newsSummary) && (
            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <div className="text-sm font-semibold">FD wave2 (drawer)</div>
              {props.detail?.analystEstimatesSummary ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Analyst estimates
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {props.detail.analystEstimatesSummary}
                  </div>
                </div>
              ) : null}
              {props.detail?.companyFactsSnapshot ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Company facts
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {props.detail.companyFactsSnapshot}
                  </div>
                </div>
              ) : null}
              {props.detail?.newsSummary ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    News summary
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {props.detail.newsSummary}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {r?.whyNow ||
          r?.keyStrength ||
          r?.riskSummary ||
          r?.convictionTier ? (
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold">VINCE context</div>
                {r.convictionTier ? (
                  <div className="text-[11px] text-muted-foreground">
                    Conviction {r.convictionTier}
                  </div>
                ) : null}
              </div>
              <div className="mt-3 space-y-3 text-sm">
                {r.whyNow ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Why now
                    </div>
                    <div className="mt-0.5">{r.whyNow}</div>
                  </div>
                ) : null}
                {r.keyStrength ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Key strength
                    </div>
                    <div className="mt-0.5">{r.keyStrength}</div>
                  </div>
                ) : null}
                {r.riskSummary ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Risk
                    </div>
                    <div className="mt-0.5">{r.riskSummary}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {props.detail?.fdCache?.spark30d?.length ? (
            <div className="rounded-xl border border-border/60 p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold">Cached history</div>
                <div className="text-[11px] text-muted-foreground">
                  {props.detail.fdCache.fetchedAt
                    ? `FD cache · ${fmtUpdatedAt(props.detail.fdCache.fetchedAt)}`
                    : "FD cache"}
                </div>
              </div>
              <div className="mt-3">
                <Sparkline points={props.detail.fdCache.spark30d} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {props.detail.fdCache.startDate && props.detail.fdCache.endDate
                  ? `${props.detail.fdCache.startDate} → ${props.detail.fdCache.endDate}`
                  : "—"}
              </div>
            </div>
          ) : null}

          {props.detail?.peers?.length ? (
            <div className="rounded-xl border border-border/60 p-4">
              <div className="text-sm font-semibold">Peers (same category)</div>
              <div className="mt-2 space-y-1 text-xs">
                {props.detail.peers.slice(0, 8).map((p) => (
                  <div
                    key={p.id ?? p.ticker}
                    className="flex items-baseline justify-between"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{p.ticker}</span>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                        {p.company ?? "—"}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {typeof p.composite === "number"
                        ? p.composite.toFixed(1)
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
