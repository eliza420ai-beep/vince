import type { Top100Category } from "@/frontend/lib/leaderboardsApi";
import { cn } from "@/frontend/lib/utils";
import type {
  Top100QuoteSource,
  Top100SortDir,
  Top100SortMode,
} from "./top100-utils";

export function Top100Toolbar(props: {
  search: string;
  onSearchChange: (v: string) => void;

  category: Top100Category | "ALL";
  categories: Top100Category[];
  onCategoryChange: (v: Top100Category | "ALL") => void;

  sleeve: string | "ALL";
  sleeves: string[];
  onSleeveChange: (v: string | "ALL") => void;

  flag: string | "ALL";
  flags: string[];
  onFlagChange: (v: string | "ALL") => void;

  source: Top100QuoteSource | "ALL";
  sources: Top100QuoteSource[];
  onSourceChange: (v: Top100QuoteSource | "ALL") => void;

  freshOnly: boolean;
  onFreshOnlyChange: (v: boolean) => void;

  scoredOnly: boolean;
  onScoredOnlyChange: (v: boolean) => void;

  liveOnly: boolean;
  onLiveOnlyChange: (v: boolean) => void;

  fdRecent8k: boolean;
  onFdRecent8kChange: (v: boolean) => void;
  fdInsiderBuy: boolean;
  onFdInsiderBuyChange: (v: boolean) => void;

  sortMode: Top100SortMode;
  onSortModeChange: (v: Top100SortMode) => void;
  sortDir: Top100SortDir;
  onSortDirChange: (v: Top100SortDir) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/10 p-3 sm:p-4 space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_auto] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 sm:min-w-[54px]">
              Filter
            </div>
            <input
              value={props.search}
              onChange={(e) => props.onSearchChange(e.target.value)}
              placeholder="Search ticker or company"
              className="h-9 w-full rounded-lg border border-border/50 bg-background/80 px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <select
              className="h-9 rounded-lg border border-border/50 bg-background/80 px-2.5 text-sm"
              value={props.category}
              onChange={(e) =>
                props.onCategoryChange(e.target.value as Top100Category | "ALL")
              }
            >
              <option value="ALL">All categories</option>
              {props.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-lg border border-border/50 bg-background/80 px-2.5 text-sm"
              value={props.sleeve}
              onChange={(e) => props.onSleeveChange(e.target.value as any)}
            >
              <option value="ALL">All sleeves</option>
              {props.sleeves.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-lg border border-border/50 bg-background/80 px-2.5 text-sm"
              value={props.source}
              onChange={(e) => props.onSourceChange(e.target.value as any)}
            >
              <option value="ALL">All sources</option>
              {props.sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-lg border border-border/50 bg-background/80 px-2.5 text-sm"
              value={props.flag}
              onChange={(e) => props.onFlagChange(e.target.value as any)}
              disabled={!props.flags.length}
              title={!props.flags.length ? "No tags available yet" : undefined}
            >
              <option value="ALL">All tags</option>
              {props.flags.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <label className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={props.freshOnly}
                onChange={(e) => props.onFreshOnlyChange(e.target.checked)}
              />
              Fresh quotes
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={props.scoredOnly}
                onChange={(e) => props.onScoredOnlyChange(e.target.checked)}
              />
              Scored only
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={props.liveOnly}
                onChange={(e) => props.onLiveOnlyChange(e.target.checked)}
              />
              Live overlay
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={props.fdRecent8k}
                onChange={(e) => props.onFdRecent8kChange(e.target.checked)}
              />
              Recent 8-K
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={props.fdInsiderBuy}
                onChange={(e) => props.onFdInsiderBuyChange(e.target.checked)}
              />
              Insider buy
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Sort</span>
              <select
                className="h-8 rounded-lg border border-border/50 bg-background/80 px-2 text-xs"
                value={props.sortMode}
                onChange={(e) => props.onSortModeChange(e.target.value as any)}
              >
                <option value="rank">Rank</option>
                <option value="composite">Composite</option>
                <option value="change1d">1D</option>
                <option value="change7d">7D</option>
                <option value="change30d">30D</option>
                <option value="marketCap">Market cap</option>
                <option value="upside">Upside</option>
                <option value="offAth">Off ATH</option>
                <option value="rankDrift">Rank drift</option>
                <option value="historyDrift">History drift</option>
                <option value="earningsSurprise">Earnings surprise</option>
                <option value="insiderSkew">Insider skew</option>
              </select>

              <div className="inline-flex rounded-lg border border-border/50 overflow-hidden">
                <button
                  type="button"
                  className={cn(
                    "h-8 px-2.5 text-xs",
                    props.sortDir === "desc"
                      ? "bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground hover:bg-muted/30",
                  )}
                  onClick={() => props.onSortDirChange("desc")}
                >
                  Desc
                </button>
                <button
                  type="button"
                  className={cn(
                    "h-8 px-2.5 text-xs border-l border-border/50",
                    props.sortDir === "asc"
                      ? "bg-primary/10 text-primary"
                      : "bg-background text-muted-foreground hover:bg-muted/30",
                  )}
                  onClick={() => props.onSortDirChange("asc")}
                >
                  Asc
                </button>
              </div>
            </div>

            <button
              type="button"
              className="h-8 px-3 rounded-lg border border-border/50 bg-background/70 text-xs text-muted-foreground hover:bg-muted/30 self-start sm:self-auto"
              onClick={() => {
                props.onSearchChange("");
                props.onCategoryChange("ALL");
                props.onSleeveChange("ALL");
                props.onFlagChange("ALL");
                props.onSourceChange("ALL");
                props.onFreshOnlyChange(false);
                props.onScoredOnlyChange(false);
                props.onLiveOnlyChange(false);
                props.onFdRecent8kChange(false);
                props.onFdInsiderBuyChange(false);
                props.onSortModeChange("rank");
                props.onSortDirChange("asc");
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
