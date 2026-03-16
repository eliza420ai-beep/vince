import type { Top100StockRow } from "@/frontend/lib/leaderboardsApi";
import { cn } from "@/frontend/lib/utils";
import { getFdBadges } from "./top100-utils";

function scoreClass(score?: number) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 55) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function sourceLabel(src: Top100StockRow["quoteSource"]): string | null {
  if (!src) return null;
  if (src === "yahoo") return "YH";
  if (src === "fd_cache") return "FD";
  if (src === "hip3") return "H3";
  return null;
}

function SourcePill({
  src,
  stale,
}: {
  src: Top100StockRow["quoteSource"];
  stale?: boolean;
}) {
  const label = sourceLabel(src);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none",
        stale
          ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          : "border-border/60 text-muted-foreground bg-muted/30",
      )}
      title={
        stale ? "Quote is stale (cache older than threshold)" : "Quote source"
      }
    >
      {label}
    </span>
  );
}

function fmtPct(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const s = v.toFixed(1);
  return `${s}%`;
}

function fmtPrice(v?: number, fallback?: string) {
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(2);
  return fallback ?? "—";
}

function fmtMcap(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  return `${(v / 1e9).toFixed(1)}B`;
}

function historyCue(row: Top100StockRow): string | null {
  if (
    typeof row.prevLiveRank !== "number" ||
    typeof row.liveRank !== "number" ||
    typeof row.historyRankDrift !== "number"
  ) {
    return null;
  }
  if (row.historyRankDrift > 0) {
    return `Prev ${row.prevLiveRank} -> ${row.liveRank} | +${row.historyRankDrift}`;
  }
  if (row.historyRankDrift < 0) {
    return `Prev ${row.prevLiveRank} -> ${row.liveRank} | ${row.historyRankDrift}`;
  }
  return `Prev ${row.prevLiveRank} -> ${row.liveRank}`;
}

function historyDriftChip(row: Top100StockRow) {
  if (typeof row.historyRankDrift !== "number") return null;
  const improving = row.historyRankDrift > 0;
  const flat = row.historyRankDrift === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono",
        flat
          ? "border-border/60 bg-muted/30 text-muted-foreground"
          : improving
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      {improving ? "+" : ""}
      {row.historyRankDrift}
    </span>
  );
}

function Sparkline({ points }: { points?: Top100StockRow["sparkline7d"] }) {
  if (!points?.length || points.length < 2) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  const width = 84;
  const height = 20;
  const values = points.map((p) => p.close).filter(Number.isFinite);
  if (values.length < 2) {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.0001);
  const coords = points.map((p, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((p.close - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = points[points.length - 1].close >= points[0].close;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="ml-auto"
      aria-label="7 day price trend"
    >
      <polyline
        fill="none"
        stroke={up ? "currentColor" : "currentColor"}
        strokeWidth="1.75"
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

export function Top100Table({
  rows,
  onRowClick,
  selectedRowId,
}: {
  rows: Top100StockRow[];
  onRowClick?: (row: Top100StockRow) => void;
  selectedRowId?: string | null;
}) {
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left py-2 px-3 w-10">#</th>
            <th className="text-left py-2 px-3">Ticker</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">
              Company
            </th>
            <th className="text-left py-2 px-3 hidden md:table-cell">
              Category
            </th>
            <th className="text-right py-2 px-3 hidden sm:table-cell">Price</th>
            <th className="text-right py-2 px-3 hidden sm:table-cell">1D</th>
            <th className="text-right py-2 px-3 hidden lg:table-cell">7D</th>
            <th className="text-right py-2 px-3 hidden xl:table-cell">30D</th>
            <th className="text-right py-2 px-3 hidden lg:table-cell">
              Mkt Cap
            </th>
            <th className="text-right py-2 px-3">Composite</th>
            <th className="text-right py-2 px-3 hidden md:table-cell">
              Upside
            </th>
            <th className="text-right py-2 px-3 hidden xl:table-cell">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                "border-t border-border/40 hover:bg-muted/20",
                selectedRowId === r.id
                  ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                  : null,
                onRowClick ? "cursor-pointer" : null,
              )}
              onClick={() => onRowClick?.(r)}
            >
              <td className="py-1.5 px-3 text-muted-foreground font-mono">
                {r.rank ?? "—"}
              </td>
              <td className="py-1.5 px-3 font-semibold">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span>{r.ticker}</span>
                    {selectedRowId === r.id ? (
                      <span className="inline-flex items-center rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                        active
                      </span>
                    ) : null}
                    <SourcePill src={r.quoteSource} stale={r.quoteStale} />
                    {r.enteredTop10 ? (
                      <span className="inline-flex items-center rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        top10
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-normal text-muted-foreground">
                    {historyCue(r) ? <span>{historyCue(r)}</span> : null}
                    {historyDriftChip(r)}
                    {r.convictionTier ? (
                      <span className="inline-flex items-center rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono">
                        {r.convictionTier}
                      </span>
                    ) : null}
                    {getFdBadges(r).map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center rounded border border-border/50 bg-muted/20 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                        title={`FD: ${badge}`}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </td>
              <td className="py-1.5 px-3 text-xs text-muted-foreground hidden sm:table-cell">
                {r.company ?? "—"}
              </td>
              <td className="py-1.5 px-3 text-[11px] text-muted-foreground hidden md:table-cell">
                {r.category}
              </td>
              <td className="py-1.5 px-3 text-right font-mono text-[11px] hidden sm:table-cell">
                {fmtPrice(r.priceLive, r.price)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono text-[11px] hidden sm:table-cell">
                {fmtPct(r.change1dPct)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono text-[11px] hidden lg:table-cell">
                {fmtPct(r.change7dPct)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono text-[11px] hidden xl:table-cell">
                {fmtPct(r.change30dPct)}
              </td>
              <td className="py-1.5 px-3 text-right font-mono text-[11px] hidden lg:table-cell">
                {fmtMcap(r.marketCap)}
              </td>
              <td
                className={cn(
                  "py-1.5 px-3 text-right font-mono",
                  scoreClass(r.composite),
                )}
              >
                {r.composite != null ? r.composite.toFixed(1) : "—"}
              </td>
              <td className="py-1.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 hidden md:table-cell">
                {r.upsidePct ?? "—"}
              </td>
              <td className="py-1.5 px-3 hidden xl:table-cell">
                <Sparkline points={r.sparkline7d} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
