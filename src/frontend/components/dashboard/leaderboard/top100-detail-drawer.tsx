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

function fmtUpdatedAt(s?: string) {
  if (!s) return "—";
  const t = new Date(s).getTime();
  if (!Number.isFinite(t)) return s;
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins <= 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
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
              <MiniMetric label="Market cap" value={fmtMcap(r.marketCap)} />
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
              <div className="mt-3 h-10 w-full rounded bg-muted/30" />
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
