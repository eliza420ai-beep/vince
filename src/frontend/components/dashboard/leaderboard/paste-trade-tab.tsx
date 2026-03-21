import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardCard from "@/frontend/components/dashboard/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";
import { cn } from "@/frontend/lib/utils";
import {
  fetchPasteTradeRunsList,
  type PasteTradeRunRecord,
} from "@/frontend/lib/pasteTradeApi";

type SortMode = "recent" | "best_pnl";

function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

/** Pull trade-like rows from paste.trade GET /api/sources/:id snapshot (shape may evolve). */
function tradesFromSnapshot(snap: unknown): Record<string, unknown>[] {
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

function numFromTrade(
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

function bestPnlFromSnapshot(snap: unknown): number | null {
  const trades = tradesFromSnapshot(snap);
  let best: number | null = null;
  for (const t of trades) {
    const p =
      numFromTrade(t, [
        "pnl_pct",
        "author_pnl_pct",
        "posted_pnl_pct",
        "performance_pct",
        "return_pct",
      ]) ?? null;
    if (p == null) continue;
    if (best == null || p > best) best = p;
  }
  return best;
}

function formatTradeLine(t: Record<string, unknown>): string {
  const sym =
    (typeof t.ticker === "string" && t.ticker) ||
    (typeof t.symbol === "string" && t.symbol) ||
    "?";
  const dir = (typeof t.direction === "string" && t.direction) || "";
  const p =
    numFromTrade(t, [
      "pnl_pct",
      "author_pnl_pct",
      "posted_pnl_pct",
      "performance_pct",
    ]) ?? null;
  const pStr = p != null ? `${p >= 0 ? "+" : ""}${p.toFixed(1)}%` : "—";
  return `${sym} ${dir} ${pStr}`.trim();
}

function inputPreview(rec: PasteTradeRunRecord): string {
  const u = rec.inputUrl?.trim();
  const tx = rec.inputText?.trim();
  if (u) return u.length > 72 ? `${u.slice(0, 72)}…` : u;
  if (tx) return tx.length > 120 ? `${tx.slice(0, 120)}…` : tx;
  return "—";
}

const STALE_MS = 60_000;

export function PasteTradeTab({ agentId }: { agentId: string }) {
  const [sort, setSort] = useState<SortMode>("recent");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["paste-trade-runs", agentId],
    queryFn: async () => {
      const rows = await fetchPasteTradeRunsList(agentId, { limit: 60 });
      if (rows === null) throw new Error("paste-trade list unavailable");
      return rows;
    },
    staleTime: STALE_MS,
    enabled: !!agentId,
  });

  const sorted = useMemo(() => {
    const runs = data ?? [];
    if (sort === "recent") {
      return [...runs].sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return [...runs].sort((a, b) => {
      const pa = bestPnlFromSnapshot(a.lastSnapshot) ?? -Infinity;
      const pb = bestPnlFromSnapshot(b.lastSnapshot) ?? -Infinity;
      if (pb !== pa) return pb - pa;
      return b.updatedAt - a.updatedAt;
    });
  }, [data, sort]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-7rem)] pb-8 space-y-6">
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            paste.trade
          </span>
          <Badge variant="outline" className="font-mono text-[10px]">
            snapshot + P&amp;L
          </Badge>
        </div>
        <p className="text-sm text-foreground leading-relaxed font-sans">
          Like WTT, but each source becomes a live page: theses route to
          instruments, and paste.trade tracks <strong>author price</strong>{" "}
          (when the source said it) vs <strong>posted price</strong> (when it
          hit the board). This tab lists runs from this Vince instance so you
          can scan performance without opening chat.
        </p>
        <p className="text-muted-foreground font-sans text-[11px]">
          Trigger from chat: paste a link or thesis to VINCE (
          <code className="text-foreground/90">/trade</code>,{" "}
          <code className="text-foreground/90">what&apos;s the trade</code>
          ). Run{" "}
          <code className="text-foreground/90">
            bun run packages/paste-trade/scripts/onboard.ts
          </code>{" "}
          once if you have no key, then restart the server.
        </p>
      </div>

      <DashboardCard title="Paste trade runs" className="border-dashed">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground">
            Newest snapshots from local runs (persisted under{" "}
            <code className="text-xs">.elizadb/paste-trade-runs</code>).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="best_pnl">Best snapshot P&amp;L</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          </div>
        )}

        {!isLoading && isError && (
          <p className="text-sm text-muted-foreground">
            Could not load runs. The paste-trade plugin may be off: run{" "}
            <code className="text-xs">
              bun run packages/paste-trade/scripts/onboard.ts
            </code>{" "}
            (or set <code className="text-xs">PASTE_TRADE_KEY</code>), restart
            the server, and check API auth if you use{" "}
            <code className="text-xs">X-API-KEY</code>.
          </p>
        )}

        {!isLoading && !isError && sorted.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            No runs yet. Paste a URL or thesis to VINCE to create a source and
            trades.
          </p>
        )}

        {!isLoading && sorted.length > 0 && (
          <div className="space-y-3">
            {sorted.map((rec) => {
              const trades = tradesFromSnapshot(rec.lastSnapshot);
              const best = bestPnlFromSnapshot(rec.lastSnapshot);
              const lines = trades.slice(0, 4).map(formatTradeLine);
              return (
                <div
                  key={rec.runId}
                  className="rounded-lg border border-border bg-card/40 p-4 space-y-2 font-mono text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {rec.runId}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-mono capitalize"
                        >
                          {rec.status}
                        </Badge>
                        {best != null && (
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              best >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400",
                            )}
                          >
                            best {best >= 0 ? "+" : ""}
                            {best.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-foreground/90 break-all font-sans">
                        {inputPreview(rec)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {rec.sourceUrl ? (
                        <a
                          href={rec.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-primary hover:underline"
                        >
                          Open source
                        </a>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(rec.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {lines.length > 0 ? (
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 pl-3 list-disc font-mono">
                      {lines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : rec.lastSnapshot ? (
                    <p className="text-[10px] text-muted-foreground italic">
                      Snapshot loaded; no trade rows parsed yet (API shape may
                      differ).
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      No snapshot yet (run in progress or polling not captured).
                    </p>
                  )}
                  {rec.error ? (
                    <p className="text-[11px] text-destructive">{rec.error}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
