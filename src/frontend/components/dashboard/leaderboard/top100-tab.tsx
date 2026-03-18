import DashboardCard from "@/frontend/components/dashboard/card";
import type {
  Top100Category,
  Top100StocksSection,
  Top100StockRow,
  Top100DraftCompareSection,
  AihfDraftId,
} from "@/frontend/lib/leaderboardsApi";
import { cn } from "@/frontend/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { Top100Table } from "./top100-table";
import { Top100Toolbar } from "./top100-toolbar";
import {
  computeTop100ToolbarOptions,
  filterAndSortTop100Rows,
  type Top100QuoteSource,
  type Top100SortDir,
  type Top100SortMode,
} from "./top100-utils";
import { Top100DetailDrawer } from "./top100-detail-drawer";
import { useQuery } from "@tanstack/react-query";
import { fetchTop100DetailsWithError } from "@/frontend/lib/leaderboardsApi";

function fmtAgeShort(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function fmtAgeMaybe(ms?: number | null): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  return `${fmtAgeShort(ms)} ago`;
}

function scoreClass(score?: number) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 55) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function CategoryGrid({ section }: { section: Top100StocksSection }) {
  const { byCategory } = section.meta;
  if (!byCategory?.length) return null;
  // Skip category breakdown when everything is "Unknown" (redundant with main table)
  const meaningful = byCategory.filter((c) => c.category !== "Unknown");
  const unknownOnly =
    meaningful.length === 0 &&
    byCategory.length === 1 &&
    byCategory[0].category === "Unknown";
  if (unknownOnly) return null;
  // Show named categories first, then "Other" for Unknown
  const ordered = [
    ...meaningful,
    ...byCategory.filter((c) => c.category === "Unknown"),
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {ordered.map((cat) => {
        const leaders = section.rows
          .filter((r) => r.category === cat.category)
          .sort((a, b) => {
            const aScore = a.composite ?? 0;
            const bScore = b.composite ?? 0;
            return bScore - aScore;
          })
          .slice(0, 3);
        const title = cat.category === "Unknown" ? "Other" : cat.category;
        return (
          <DashboardCard
            key={cat.category}
            title={title}
            subtitle={`${cat.count} names`}
          >
            <div className="space-y-1">
              {leaders.map((r) => (
                <div
                  key={r.id}
                  className="flex items-baseline justify-between text-xs"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {r.rank ?? "—"}
                    </span>
                    <span className="font-semibold">{r.ticker}</span>
                    {r.company && (
                      <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                        {r.company}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      scoreClass(r.composite),
                    )}
                  >
                    {r.composite != null ? r.composite.toFixed(1) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </DashboardCard>
        );
      })}
    </div>
  );
}

function TopList({
  title,
  rows,
  subtitle,
  onActivate,
  active,
  onSelectRow,
  selectedRowId,
}: {
  title: string;
  rows: Top100StockRow[];
  subtitle?: string;
  onActivate?: () => void;
  active?: boolean;
  onSelectRow?: (row: Top100StockRow) => void;
  selectedRowId?: string | null;
}) {
  if (!rows.length) return null;
  return (
    <DashboardCard
      className="border-border/50 bg-background/60 shadow-none"
      title={title}
      addon={
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
            {rows.length}
          </span>
          {onActivate ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onActivate();
              }}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-mono leading-none",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/35",
              )}
            >
              {active ? "Focused" : "Focus"}
            </button>
          ) : null}
        </div>
      }
    >
      {subtitle ? (
        <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
          {subtitle}
        </div>
      ) : null}
      <div className="mb-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60">
        <span>Rank · Ticker</span>
        <span className="text-right min-w-[94px]">Composite</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <button
            type="button"
            key={r.id}
            onClick={() => onSelectRow?.(r)}
            className={cn(
              "grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left text-xs transition hover:border-border/40 hover:bg-muted/20",
              selectedRowId === r.id
                ? "bg-primary/8 ring-1 ring-inset ring-primary/20"
                : null,
            )}
          >
            <div className="flex min-w-0 items-baseline gap-2">
              {typeof r.rank === "number" ? (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {r.rank}
                </span>
              ) : null}
              <span className="font-semibold">{r.ticker}</span>
              {selectedRowId === r.id ? (
                <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                  active
                </span>
              ) : null}
              {r.company && (
                <span className="truncate text-[11px] text-muted-foreground">
                  {r.company}
                </span>
              )}
            </div>
            <div className="flex min-w-[94px] items-baseline justify-end gap-3 text-right">
              {r.upsidePct && (
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  {r.upsidePct}
                </span>
              )}
              {hasCompositeScore(r) ? (
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    scoreClass(r.composite),
                  )}
                >
                  {r.composite!.toFixed(1)}
                </span>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                  unscored
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </DashboardCard>
  );
}

function rowsByTickers(
  rows: Top100StockRow[],
  tickers?: string[],
): Top100StockRow[] {
  if (!tickers?.length) return [];
  const byTicker = new Map(rows.map((row) => [row.ticker.toUpperCase(), row]));
  return tickers
    .map((ticker) => byTicker.get(ticker.toUpperCase()))
    .filter(Boolean) as Top100StockRow[];
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function hasCompositeScore(row: Top100StockRow): boolean {
  return typeof row.composite === "number" && Number.isFinite(row.composite);
}

function RitualCard(props: {
  title: string;
  subtitle?: string;
  selectedRowId?: string | null;
  groups: Array<{
    label: string;
    rows: Top100StockRow[];
    onActivate?: () => void;
    active?: boolean;
    onSelectRow?: (row: Top100StockRow) => void;
  }>;
}) {
  const groups = props.groups.filter((group) => group.rows.length);
  if (!groups.length) return null;
  return (
    <DashboardCard
      className="border-border/50 bg-background/60 shadow-none"
      title={props.title}
      addon={
        <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
          {groups.reduce((sum, group) => sum + group.rows.length, 0)}
        </span>
      }
    >
      {props.subtitle ? (
        <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
          {props.subtitle}
        </div>
      ) : null}
      <div
        className={cn(
          "grid gap-2.5",
          groups.length > 1 ? "xl:grid-cols-2" : "grid-cols-1",
        )}
      >
        {groups.map((group) => (
          <div
            key={group.label}
            className="rounded-xl border border-border/30 bg-muted/[0.06] p-2.5"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
                <span className="ml-1.5 font-mono text-muted-foreground/70">
                  {Math.min(4, group.rows.length)}
                </span>
              </div>
              {group.onActivate ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    group.onActivate?.();
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-mono leading-none",
                    group.active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/35",
                  )}
                >
                  {group.active ? "Focused" : "Focus"}
                </button>
              ) : null}
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
                <span>Ticker</span>
                <span className="text-right w-[58px]">Composite</span>
              </div>
              {group.rows.slice(0, 4).map((row) => (
                <button
                  type="button"
                  key={row.id}
                  onClick={() => group.onSelectRow?.(row)}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left text-xs transition hover:border-border/40 hover:bg-muted/20",
                    props.selectedRowId === row.id
                      ? "bg-primary/8 ring-1 ring-inset ring-primary/20"
                      : null,
                  )}
                >
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="font-semibold">{row.ticker}</span>
                    {props.selectedRowId === row.id ? (
                      <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary">
                        active
                      </span>
                    ) : null}
                    <span className="truncate text-[11px] text-muted-foreground">
                      {row.company ?? "—"}
                    </span>
                  </div>
                  {hasCompositeScore(row) ? (
                    <span className="w-[58px] text-right font-mono text-[11px] text-muted-foreground">
                      {row.composite!.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                      unscored
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

export function Top100Tab({
  section,
  draftCompare,
  status,
  agentId,
}: {
  section: Top100StocksSection | null | undefined;
  draftCompare: Top100DraftCompareSection | null | undefined;
  status: "loading" | "ok" | "stale" | "error" | undefined;
  agentId: string;
}) {
  const [focusedTickers, setFocusedTickers] = useState<string[] | null>(null);
  const [activeFocusKey, setActiveFocusKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    Top100Category | "ALL"
  >("ALL");
  const [search, setSearch] = useState("");
  const [selectedSleeve, setSelectedSleeve] = useState<string | "ALL">("ALL");
  const [selectedFlag, setSelectedFlag] = useState<string | "ALL">("ALL");
  const [selectedSource, setSelectedSource] = useState<
    Top100QuoteSource | "ALL"
  >("ALL");
  const [freshOnly, setFreshOnly] = useState(false);
  const [scoredOnly, setScoredOnly] = useState(false);
  const [liveOnly, setLiveOnly] = useState(false);
  const [fdRecent8k, setFdRecent8k] = useState(false);
  const [fdInsiderBuy, setFdInsiderBuy] = useState(false);
  const [sortMode, setSortMode] = useState<Top100SortMode>("rank");
  const [sortDir, setSortDir] = useState<Top100SortDir>("asc");
  const [selectedRow, setSelectedRow] = useState<Top100StockRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareMode, setCompareMode] = useState<
    "all" | "overlap" | "draftOnly" | "canonicalOnly"
  >("all");
  const [compareDraftFilter, setCompareDraftFilter] = useState<
    AihfDraftId | "ALL"
  >("ALL");

  const sectionRows = section?.rows ?? [];
  const topScore = section?.meta.topByComposite ?? [];
  const biggestClimbers = [...sectionRows]
    .filter(
      (row) =>
        typeof row.historyRankDrift === "number" && row.historyRankDrift > 0,
    )
    .sort((a, b) => (b.historyRankDrift ?? 0) - (a.historyRankDrift ?? 0))
    .slice(0, 5);
  const biggestFallers = [...sectionRows]
    .filter(
      (row) =>
        typeof row.historyRankDrift === "number" && row.historyRankDrift < 0,
    )
    .sort((a, b) => (a.historyRankDrift ?? 0) - (b.historyRankDrift ?? 0))
    .slice(0, 5);
  const top10Entrants = rowsByTickers(
    sectionRows,
    section?.meta.liveTop10Entrants,
  );
  const top10Exits = rowsByTickers(sectionRows, section?.meta.liveTop10Exits);
  const rituals = section?.meta.rituals;
  const focusPresets = [
    { key: "entered-top10", label: "Entered top 10", rows: top10Entrants },
    { key: "exited-top10", label: "Exited top 10", rows: top10Exits },
    {
      key: "biggest-climbers",
      label: "Biggest climbers",
      rows: biggestClimbers,
    },
    { key: "biggest-fallers", label: "Biggest fallers", rows: biggestFallers },
    {
      key: "history-climbers",
      label: "History drift: Climbers",
      rows: rowsByTickers(sectionRows, rituals?.historyDrift?.biggestClimbers),
    },
    {
      key: "history-mismatches",
      label: "History drift: Mismatches",
      rows: rowsByTickers(
        sectionRows,
        rituals?.historyDrift?.biggestMismatches,
      ),
    },
    {
      key: "momentum-continuation",
      label: "Momentum: Continuation",
      rows: rowsByTickers(sectionRows, rituals?.momentum?.continuation),
    },
    {
      key: "momentum-pullbacks",
      label: "Momentum: Pullbacks",
      rows: rowsByTickers(sectionRows, rituals?.momentum?.pullbacks),
    },
    {
      key: "risk-flagged",
      label: "Risk: Flagged",
      rows: rowsByTickers(sectionRows, rituals?.risk?.flagged),
    },
    {
      key: "risk-clean",
      label: "Risk: Clean",
      rows: rowsByTickers(sectionRows, rituals?.risk?.clean),
    },
    {
      key: "upside-confirmed",
      label: "Upside vs tape: Confirmed",
      rows: rowsByTickers(sectionRows, rituals?.upsideVsTape?.confirmed),
    },
    {
      key: "upside-breaking-down",
      label: "Upside vs tape: Breaking down",
      rows: rowsByTickers(sectionRows, rituals?.upsideVsTape?.breakingDown),
    },
  ].filter((preset) => preset.rows.length);

  const toolbarOptions = useMemo(() => {
    return computeTop100ToolbarOptions(section?.rows ?? []);
  }, [section?.rows]);

  const compareDrafts = draftCompare?.drafts ?? [];
  const comparePresence = draftCompare?.presenceByTicker ?? {};
  const compareFilteredPresence = useMemo(() => {
    if (compareDraftFilter === "ALL") return comparePresence;
    const out: typeof comparePresence = {};
    for (const [ticker, byDraft] of Object.entries(comparePresence)) {
      if (byDraft && byDraft[compareDraftFilter] != null) out[ticker] = byDraft;
    }
    return out;
  }, [comparePresence, compareDraftFilter]);

  const compareSets = useMemo(() => {
    const canonical = new Set(
      sectionRows.map((r) => r.ticker.toUpperCase().trim()),
    );
    const draft = new Set(Object.keys(compareFilteredPresence));
    const overlap: string[] = [];
    const draftOnly: string[] = [];
    const canonicalOnly: string[] = [];
    for (const t of draft) (canonical.has(t) ? overlap : draftOnly).push(t);
    for (const t of canonical) if (!draft.has(t)) canonicalOnly.push(t);
    return { canonical, draft, overlap, draftOnly, canonicalOnly };
  }, [sectionRows, compareFilteredPresence]);

  const filteredRows = useMemo(() => {
    const baseRows =
      focusedTickers?.length && section?.rows?.length
        ? section.rows.filter((row) =>
            focusedTickers.includes(row.ticker.toUpperCase()),
          )
        : (section?.rows ?? []);
    const compareFiltered =
      compareMode === "all"
        ? baseRows
        : compareMode === "overlap"
          ? baseRows.filter((r) =>
              compareSets.draft.has(r.ticker.toUpperCase().trim()),
            )
          : compareMode === "draftOnly"
            ? []
            : baseRows.filter(
                (r) => !compareSets.draft.has(r.ticker.toUpperCase().trim()),
              );
    return filterAndSortTop100Rows({
      rows: compareFiltered,
      search,
      category: selectedCategory,
      sleeve: selectedSleeve,
      flag: selectedFlag,
      source: selectedSource,
      freshOnly,
      scoredOnly,
      liveOnly,
      fdRecent8k,
      fdInsiderBuy,
      sortMode,
      sortDir,
    });
  }, [
    section?.rows,
    focusedTickers,
    search,
    selectedCategory,
    selectedSleeve,
    selectedFlag,
    selectedSource,
    freshOnly,
    scoredOnly,
    liveOnly,
    fdRecent8k,
    fdInsiderBuy,
    sortMode,
    sortDir,
    compareMode,
    compareSets.draft,
  ]);

  function clearFocus() {
    setFocusedTickers(null);
    setActiveFocusKey(null);
  }

  function clearAllFiltersAndFocus() {
    setSearch("");
    setSelectedCategory("ALL");
    setSelectedSleeve("ALL");
    setSelectedFlag("ALL");
    setSelectedSource("ALL");
    setFreshOnly(false);
    setScoredOnly(false);
    setLiveOnly(false);
    setFdRecent8k(false);
    setFdInsiderBuy(false);
    setSortMode("rank");
    setSortDir("asc");
    clearFocus();
    setSelectedRow(null);
  }

  function openRow(row: Top100StockRow) {
    setSelectedRow(row);
    setDrawerOpen(true);
  }

  function activateFocusPreset(
    key: string,
    rows: Top100StockRow[],
    options?: {
      syncSelection?: boolean;
      allowToggle?: boolean;
    },
  ) {
    const tickers = rows.map((row) => row.ticker.toUpperCase());
    if (!tickers.length) return;
    const next = JSON.stringify(tickers);
    const prev = JSON.stringify(focusedTickers ?? []);

    if (
      options?.allowToggle !== false &&
      activeFocusKey === key &&
      next === prev
    ) {
      setFocusedTickers(null);
      setActiveFocusKey(null);
      return;
    }

    setFocusedTickers(tickers);
    setActiveFocusKey(key);

    if (options?.syncSelection) {
      const current =
        selectedRow && rows.find((row) => row.id === selectedRow.id)
          ? rows.find((row) => row.id === selectedRow.id)
          : rows[0];
      if (current) openRow(current);
    }
  }

  function isFocusedKey(key: string) {
    return !!focusedTickers?.length && activeFocusKey === key;
  }

  const detailsQuery = useQuery({
    queryKey: ["top100-details", agentId, selectedRow?.id ?? ""],
    enabled: drawerOpen && !!selectedRow?.id,
    queryFn: async () => {
      if (!selectedRow?.id || !selectedRow?.ticker) {
        return { data: null, error: "Missing row identity", status: null };
      }
      return await fetchTop100DetailsWithError(agentId, {
        id: selectedRow.id,
        ticker: selectedRow.ticker,
      });
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!focusedTickers?.length || !filteredRows.length) return;

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight"
      ) {
        return;
      }
      if (isTypingTarget(event.target)) return;

      event.preventDefault();

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (!focusPresets.length || !activeFocusKey) return;
        const currentPresetIndex = focusPresets.findIndex(
          (preset) => preset.key === activeFocusKey,
        );
        if (currentPresetIndex === -1) return;
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const nextPresetIndex =
          (currentPresetIndex + delta + focusPresets.length) %
          focusPresets.length;
        const nextPreset = focusPresets[nextPresetIndex];
        activateFocusPreset(nextPreset.key, nextPreset.rows, {
          syncSelection: true,
          allowToggle: false,
        });
        return;
      }

      const currentIndex = selectedRow
        ? filteredRows.findIndex((row) => row.id === selectedRow.id)
        : -1;
      const fallbackIndex =
        event.key === "ArrowDown" ? 0 : filteredRows.length - 1;
      const nextIndex =
        currentIndex === -1
          ? fallbackIndex
          : event.key === "ArrowDown"
            ? Math.min(currentIndex + 1, filteredRows.length - 1)
            : Math.max(currentIndex - 1, 0);
      const nextRow = filteredRows[nextIndex];
      if (nextRow) {
        openRow(nextRow);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeFocusKey, filteredRows, focusPresets, focusedTickers, selectedRow]);

  if (status === "loading" && !section) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[160px] flex flex-col justify-center">
        <p className="font-medium text-foreground">
          Could not load Top100 stocks
        </p>
        <p className="text-sm text-muted-foreground">
          Ensure portfolio_hyperliquid.json, portfolio_tastytrade.json, and
          portfolio_watchlist.json exist at repo root.
        </p>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[160px] flex flex-col justify-center">
        <p className="font-medium text-foreground">No Top100 data yet</p>
        <p className="text-sm text-muted-foreground">
          Data is sourced from portfolio JSONs; run FD prewarm and snapshot
          refresh tasks to fill prices and fundamentals.
        </p>
      </div>
    );
  }

  const { meta } = section;
  const focusedLabel =
    focusedTickers?.length && focusedTickers.length <= 6
      ? focusedTickers.join(", ")
      : focusedTickers?.length
        ? `${focusedTickers.length} tickers`
        : null;
  const activeFocusLabel =
    focusPresets.find((preset) => preset.key === activeFocusKey)?.label ?? null;
  const focusedSelectionIndex = selectedRow
    ? filteredRows.findIndex((row) => row.id === selectedRow.id)
    : -1;
  const dexterGeneratedAtMs = meta.dexterScorecardGeneratedAt ?? null;
  const dexterAgeText =
    dexterGeneratedAtMs != null
      ? `${fmtAgeShort(Date.now() - dexterGeneratedAtMs)} ago`
      : null;
  const dexterCovered =
    typeof meta.dexterScorecardCoveredCount === "number"
      ? meta.dexterScorecardCoveredCount
      : null;
  const dexterTickerCount =
    typeof meta.dexterScorecardTickerCount === "number"
      ? meta.dexterScorecardTickerCount
      : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent dark:from-primary/25 dark:via-primary/10 border border-border/60 px-4 py-4">
        <p className="text-sm font-semibold text-foreground/90">
          The Next Bull Market · VINCE Top100
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Portfolio universe (hyperliquid, tastytrade, watchlist), ranked by
          composite score and upside.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          <span className="font-medium text-muted-foreground/90">
            Universe:
          </span>{" "}
          Dex portfolio sleeves ·{" "}
          <span className="font-medium text-muted-foreground/90">Ranking:</span>{" "}
          composite + upside overlays ·{" "}
          <span className="font-medium text-muted-foreground/90">Signals:</span>{" "}
          filings, earnings, insiders (when available)
        </p>
        <p className="text-[11px] text-muted-foreground/80 mt-1">
          {meta.total} names ·{" "}
          {meta.byCategory.map((c) => `${c.category} (${c.count})`).join(" · ")}
        </p>
        {(dexterAgeText || dexterCovered != null) && (
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            <span className="font-medium text-muted-foreground/90">
              Dexter:
            </span>{" "}
            {dexterCovered != null
              ? `${dexterCovered}/${meta.total} scored`
              : null}
            {dexterTickerCount != null ? ` · ${dexterTickerCount} total` : null}
            {dexterAgeText ? ` · updated ${dexterAgeText}` : null}
          </p>
        )}
        {status === "stale" ||
        meta.warnings?.length ||
        meta.fdSnapshotCoveragePct != null ||
        meta.fdEarningsCoveragePct != null ? (
          <div className="mt-2 text-[11px] text-muted-foreground/90">
            {(status === "stale" || meta.warnings?.length) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 font-medium text-amber-700 dark:text-amber-300">
                Coverage limited
              </span>
            )}
            {meta.scoredCoveragePct != null ||
            meta.quoteCoveragePct != null ||
            meta.historyCoveragePct != null ||
            meta.marketCapCoveragePct != null ? (
              <span className="ml-2">
                {meta.scoredCoveragePct != null
                  ? `Score ${meta.scoredCoveragePct.toFixed(0)}%`
                  : null}
                {meta.quoteCoveragePct != null
                  ? ` · Quotes ${meta.quoteCoveragePct.toFixed(0)}%`
                  : null}
                {meta.historyCoveragePct != null
                  ? ` · History ${meta.historyCoveragePct.toFixed(0)}%`
                  : null}
                {meta.marketCapCoveragePct != null
                  ? ` · MCap ${meta.marketCapCoveragePct.toFixed(0)}%`
                  : null}
              </span>
            ) : null}
            {meta.fdSnapshotCoveragePct != null ||
            meta.fdEarningsCoveragePct != null ||
            meta.fdInsiderCoveragePct != null ||
            meta.fdFilingCoveragePct != null ? (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full border border-border/50 bg-muted/20">
                FD{" "}
                {meta.fdSnapshotCoveragePct != null
                  ? `snap ${meta.fdSnapshotCoveragePct.toFixed(0)}%`
                  : null}
                {meta.fdEarningsCoveragePct != null
                  ? ` · earn ${meta.fdEarningsCoveragePct.toFixed(0)}%`
                  : null}
                {meta.fdInsiderCoveragePct != null
                  ? ` · ins ${meta.fdInsiderCoveragePct.toFixed(0)}%`
                  : null}
                {meta.fdFilingCoveragePct != null
                  ? ` · filing ${meta.fdFilingCoveragePct.toFixed(0)}%`
                  : null}
              </span>
            ) : null}

            {meta.warnings?.length ? (
              <details className="mt-2 rounded-xl border border-border/50 bg-muted/10 px-3 py-2">
                <summary className="cursor-pointer select-none text-[11px] font-medium text-foreground/80">
                  Data quality details
                </summary>
                <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  {meta.warnings.map((w) => (
                    <div key={w}>- {w}</div>
                  ))}
                  {props.fdCache?.perDomain ? (
                    <div className="pt-2 border-t border-border/40">
                      <div className="font-medium text-foreground/80">
                        FD cache freshness
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(props.fdCache.perDomain).map(
                          ([domain, v]) => (
                            <div key={domain}>
                              <span className="font-medium">{domain}</span>
                              {` · ${v.fileCount} files`}
                              {fmtAgeMaybe(v.ageMs)
                                ? ` · ${fmtAgeMaybe(v.ageMs)}`
                                : ""}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      <Top100Toolbar
        search={search}
        onSearchChange={setSearch}
        category={selectedCategory}
        categories={toolbarOptions.categories}
        onCategoryChange={setSelectedCategory}
        sleeve={selectedSleeve}
        sleeves={toolbarOptions.sleeves}
        onSleeveChange={setSelectedSleeve}
        flag={selectedFlag}
        flags={toolbarOptions.flags}
        onFlagChange={setSelectedFlag}
        source={selectedSource}
        sources={toolbarOptions.sources}
        onSourceChange={setSelectedSource}
        freshOnly={freshOnly}
        onFreshOnlyChange={setFreshOnly}
        scoredOnly={scoredOnly}
        onScoredOnlyChange={setScoredOnly}
        liveOnly={liveOnly}
        onLiveOnlyChange={setLiveOnly}
        fdRecent8k={fdRecent8k}
        onFdRecent8kChange={setFdRecent8k}
        fdInsiderBuy={fdInsiderBuy}
        onFdInsiderBuyChange={setFdInsiderBuy}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        onReset={() => {
          clearFocus();
          setSelectedRow(null);
        }}
      />

      {(search.trim() ||
        selectedCategory !== "ALL" ||
        selectedSleeve !== "ALL" ||
        selectedFlag !== "ALL" ||
        selectedSource !== "ALL" ||
        freshOnly ||
        scoredOnly ||
        liveOnly ||
        fdRecent8k ||
        fdInsiderBuy ||
        focusedTickers?.length) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
            Active filters
          </span>

          {focusedTickers?.length ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] text-primary hover:bg-primary/15"
              onClick={() => clearFocus()}
              title="Clear focus"
            >
              Focused
              <span className="font-mono text-[10px] text-primary/80">
                {activeFocusLabel ?? `${focusedTickers.length} tickers`}
              </span>
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {search.trim() ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setSearch("")}
              title="Clear search"
            >
              Search
              <span className="font-mono text-[10px] text-foreground/70">
                {search.trim().slice(0, 24)}
                {search.trim().length > 24 ? "…" : ""}
              </span>
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {selectedCategory !== "ALL" ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setSelectedCategory("ALL")}
            >
              Category{" "}
              <span className="text-foreground/70">{selectedCategory}</span>
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {selectedSleeve !== "ALL" ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setSelectedSleeve("ALL")}
            >
              Sleeve{" "}
              <span className="text-foreground/70">{selectedSleeve}</span>
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {selectedSource !== "ALL" ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setSelectedSource("ALL")}
            >
              Source{" "}
              <span className="text-foreground/70">{selectedSource}</span>
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {selectedFlag !== "ALL" ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setSelectedFlag("ALL")}
            >
              Tag <span className="text-foreground/70">{selectedFlag}</span>
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {freshOnly ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setFreshOnly(false)}
            >
              Fresh quotes{" "}
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {scoredOnly ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setScoredOnly(false)}
            >
              Scored only{" "}
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {liveOnly ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setLiveOnly(false)}
            >
              Live overlay{" "}
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {fdRecent8k ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setFdRecent8k(false)}
            >
              Recent 8-K{" "}
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          {fdInsiderBuy ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/20"
              onClick={() => setFdInsiderBuy(false)}
            >
              Insider buy{" "}
              <span className="font-mono text-[11px] leading-none">×</span>
            </button>
          ) : null}

          <button
            type="button"
            className="ml-1 h-8 rounded-lg border border-border/60 bg-background/70 px-3 text-xs text-muted-foreground hover:bg-muted/30"
            onClick={() => clearAllFiltersAndFocus()}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="space-y-6">
        <DashboardCard
          title="Composite rankings (command center)"
          subtitle={`${filteredRows.length} names in current view`}
          addon={
            <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              {sortMode} {sortDir}
            </span>
          }
        >
          {filteredRows.length ? (
            <Top100Table
              rows={filteredRows}
              draftPresence={draftCompare?.presenceByTicker ?? null}
              selectedRowId={selectedRow?.id ?? null}
              onRowClick={(r) => {
                setSelectedRow(r);
                setDrawerOpen(true);
              }}
            />
          ) : (
            <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-6 text-sm">
              <div className="font-medium text-foreground/85">
                No matches in the current view
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Clear filters or turn off focus to see the full list.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="h-8 rounded-lg border border-border/60 bg-background/80 px-3 text-xs text-muted-foreground hover:bg-muted/30"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("ALL");
                    setSelectedSleeve("ALL");
                    setSelectedFlag("ALL");
                    setSelectedSource("ALL");
                    setFreshOnly(false);
                    setScoredOnly(false);
                    setLiveOnly(false);
                    setFdRecent8k(false);
                    setFdInsiderBuy(false);
                    setSortMode("rank");
                    setSortDir("asc");
                    setSelectedRow(null);
                  }}
                >
                  Clear filters
                </button>
                {focusedTickers?.length ? (
                  <button
                    type="button"
                    className="h-8 rounded-lg border border-border/60 bg-background/80 px-3 text-xs text-muted-foreground hover:bg-muted/30"
                    onClick={() => clearFocus()}
                  >
                    Clear focus
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </DashboardCard>

        {compareDrafts.length ? (
          <DashboardCard
            title="AIHF drafts (compare layer)"
            subtitle="Staging inputs for research. Does not change canonical membership, ranks, or scores."
            addon={
              <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                {compareDrafts.length} drafts
              </span>
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-border/50 bg-background/60 p-1">
                {(
                  [
                    ["all", "All"],
                    ["overlap", "Only overlap"],
                    ["canonicalOnly", "Only canonical"],
                    ["draftOnly", "Only in draft"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCompareMode(key)}
                    className={cn(
                      "h-8 rounded-lg px-3 text-xs",
                      compareMode === key
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/30",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                  Draft
                </span>
                <select
                  value={compareDraftFilter}
                  onChange={(e) =>
                    setCompareDraftFilter(e.target.value as AihfDraftId | "ALL")
                  }
                  className="h-8 rounded-lg border border-border/60 bg-background/70 px-2 text-xs text-muted-foreground"
                >
                  <option value="ALL">All drafts</option>
                  {compareDrafts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {compareMode === "draftOnly" ? (
              <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 px-4 py-5 text-sm">
                <div className="font-medium text-foreground/85">
                  Draft-only names are not shown in the canonical table
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Draft-only count:{" "}
                  <span className="font-mono">
                    {compareSets.draftOnly.length}
                  </span>
                  . Use this as a “what should we track next?” staging list.
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {compareDrafts.map((d) => (
                <DashboardCard
                  key={d.id}
                  className="border-border/50 bg-background/60 shadow-none"
                  title={d.label}
                  subtitle={`${d.overlapCount}/${d.canonicalOnlyCount + d.overlapCount} overlap · ${d.draftOnlyCount} only in draft`}
                  addon={
                    <span className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {d.assetCount} assets
                    </span>
                  }
                >
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                        Total weight
                      </div>
                      <div className="mt-0.5 font-mono text-[12px] text-foreground/85">
                        {d.totalTargetWeightPct.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                        Model
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {d.modelProvider ? `${d.modelProvider} · ` : ""}
                        {d.modelName ?? "—"}
                      </div>
                    </div>
                  </div>

                  {d.topWeights.length ? (
                    <div className="mt-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                        Top weights
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {d.topWeights.map((w) => (
                          <span
                            key={w.symbol}
                            className="rounded-full border border-border/60 bg-muted/20 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                          >
                            {w.symbol} {w.targetWeightPct.toFixed(1)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </DashboardCard>
              ))}
            </div>

            {draftCompare?.errors?.length ? (
              <div className="mt-4 rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
                <div className="font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                  Draft load warnings
                </div>
                <div className="mt-1 space-y-1">
                  {draftCompare.errors.slice(0, 3).map((e) => (
                    <div key={`${e.id}-${e.path}`} className="font-mono">
                      {e.id}: {e.error}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </DashboardCard>
        ) : null}

        <div className="rounded-2xl border border-border/50 bg-muted/10 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground/85">
                Leaders
              </div>
              <div className="text-[11px] text-muted-foreground">
                Quick scans from the same dataset as the table
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <TopList
              title="Top 10 by composite"
              rows={topScore}
              onSelectRow={openRow}
              selectedRowId={selectedRow?.id ?? null}
            />
            {meta.highestUpside?.length ? (
              <DashboardCard title="Highest upside (Street PT)">
                <div className="space-y-1 text-xs">
                  {meta.highestUpside.slice(0, 10).map((h) => (
                    <div
                      key={h.ticker}
                      className="flex items-baseline justify-between"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{h.ticker}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {h.sector}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                        {h.upside}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            ) : (
              <DashboardCard title="Highest upside (Street PT)">
                <div className="text-xs text-muted-foreground">
                  Not enough price target coverage yet.
                </div>
              </DashboardCard>
            )}
            {meta.sleeveAverages ? (
              <DashboardCard title="Sleeve averages">
                <div className="space-y-1 text-xs">
                  {Object.entries(meta.sleeveAverages).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-baseline justify-between"
                    >
                      <span className="capitalize text-muted-foreground">
                        {key}
                      </span>
                      <span className={cn("font-mono", scoreClass(val ?? 0))}>
                        {(val ?? 0).toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            ) : (
              <DashboardCard title="Sleeve averages">
                <div className="text-xs text-muted-foreground">
                  Not enough score coverage yet.
                </div>
              </DashboardCard>
            )}
          </div>
        </div>
      </div>

      {focusedLabel ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/15 bg-primary/[0.04] px-3.5 py-3 text-xs md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
              Focus
            </span>
            <span className="font-medium text-foreground">{focusedLabel}</span>
            {activeFocusLabel ? (
              <span className="rounded-full border border-primary/20 bg-background/70 px-2 py-0.5 text-[11px] font-mono text-primary">
                {activeFocusLabel}
              </span>
            ) : null}
            <span className="text-[11px] text-muted-foreground/80">
              Use ←/→ cohorts · ↑/↓ names
              {focusedSelectionIndex >= 0
                ? ` · ${focusedSelectionIndex + 1}/${filteredRows.length}`
                : null}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFocusedTickers(null);
              setActiveFocusKey(null);
            }}
            className="self-start rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] font-mono text-muted-foreground hover:bg-muted/30 md:self-auto"
          >
            Clear focus
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
          Cohorts · Rank and composite from FD + synthetic scorecard; lists from
          snapshot signals (history drift, momentum, risk, upside)
        </p>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
          <TopList
            title="Entered top 10"
            subtitle="Fresh leaders · Rank · Composite"
            rows={top10Entrants}
            onActivate={() =>
              activateFocusPreset("entered-top10", top10Entrants)
            }
            active={isFocusedKey("entered-top10")}
            onSelectRow={openRow}
            selectedRowId={selectedRow?.id ?? null}
          />
          <TopList
            title="Exited top 10"
            subtitle="Losing urgency · Rank · Composite"
            rows={top10Exits}
            onActivate={() => activateFocusPreset("exited-top10", top10Exits)}
            active={isFocusedKey("exited-top10")}
            onSelectRow={openRow}
            selectedRowId={selectedRow?.id ?? null}
          />
          <TopList
            title="Biggest climbers"
            subtitle="Live repricing · Rank · Composite"
            rows={biggestClimbers}
            onActivate={() =>
              activateFocusPreset("biggest-climbers", biggestClimbers)
            }
            active={isFocusedKey("biggest-climbers")}
            onSelectRow={openRow}
            selectedRowId={selectedRow?.id ?? null}
          />
          <TopList
            title="Biggest fallers"
            subtitle="Slipping · Rank · Composite"
            rows={biggestFallers}
            onActivate={() =>
              activateFocusPreset("biggest-fallers", biggestFallers)
            }
            active={isFocusedKey("biggest-fallers")}
            onSelectRow={openRow}
            selectedRowId={selectedRow?.id ?? null}
          />
        </div>
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <RitualCard
          title="History drift"
          subtitle="Repricing"
          selectedRowId={selectedRow?.id ?? null}
          groups={[
            {
              label: "Climbers",
              rows: rowsByTickers(
                section.rows,
                rituals?.historyDrift?.biggestClimbers,
              ),
              onActivate: () =>
                activateFocusPreset(
                  "history-climbers",
                  rowsByTickers(
                    section.rows,
                    rituals?.historyDrift?.biggestClimbers,
                  ),
                ),
              active: isFocusedKey("history-climbers"),
              onSelectRow: openRow,
            },
            {
              label: "Mismatches",
              rows: rowsByTickers(
                section.rows,
                rituals?.historyDrift?.biggestMismatches,
              ),
              onActivate: () =>
                activateFocusPreset(
                  "history-mismatches",
                  rowsByTickers(
                    section.rows,
                    rituals?.historyDrift?.biggestMismatches,
                  ),
                ),
              active: isFocusedKey("history-mismatches"),
              onSelectRow: openRow,
            },
          ]}
        />
        <RitualCard
          title="Momentum ritual"
          subtitle="Trend / pullback"
          selectedRowId={selectedRow?.id ?? null}
          groups={[
            {
              label: "Continuation",
              rows: rowsByTickers(
                section.rows,
                rituals?.momentum?.continuation,
              ),
              onActivate: () =>
                activateFocusPreset(
                  "momentum-continuation",
                  rowsByTickers(section.rows, rituals?.momentum?.continuation),
                ),
              active: isFocusedKey("momentum-continuation"),
              onSelectRow: openRow,
            },
            {
              label: "Pullbacks",
              rows: rowsByTickers(section.rows, rituals?.momentum?.pullbacks),
              onActivate: () =>
                activateFocusPreset(
                  "momentum-pullbacks",
                  rowsByTickers(section.rows, rituals?.momentum?.pullbacks),
                ),
              active: isFocusedKey("momentum-pullbacks"),
              onSelectRow: openRow,
            },
          ]}
        />
        <RitualCard
          title="Risk ritual"
          subtitle="Crowded vs clean"
          selectedRowId={selectedRow?.id ?? null}
          groups={[
            {
              label: "Flagged",
              rows: rowsByTickers(section.rows, rituals?.risk?.flagged),
              onActivate: () =>
                activateFocusPreset(
                  "risk-flagged",
                  rowsByTickers(section.rows, rituals?.risk?.flagged),
                ),
              active: isFocusedKey("risk-flagged"),
              onSelectRow: openRow,
            },
            {
              label: "Clean",
              rows: rowsByTickers(section.rows, rituals?.risk?.clean),
              onActivate: () =>
                activateFocusPreset(
                  "risk-clean",
                  rowsByTickers(section.rows, rituals?.risk?.clean),
                ),
              active: isFocusedKey("risk-clean"),
              onSelectRow: openRow,
            },
          ]}
        />
        <RitualCard
          title="Upside confirmed"
          subtitle="Target vs tape"
          selectedRowId={selectedRow?.id ?? null}
          groups={[
            {
              label: "Confirmed",
              rows: rowsByTickers(
                section.rows,
                rituals?.upsideVsTape?.confirmed,
              ),
              onActivate: () =>
                activateFocusPreset(
                  "upside-confirmed",
                  rowsByTickers(section.rows, rituals?.upsideVsTape?.confirmed),
                ),
              active: isFocusedKey("upside-confirmed"),
              onSelectRow: openRow,
            },
          ]}
        />
        <RitualCard
          title="Upside breaking down"
          subtitle="Target vs tape"
          selectedRowId={selectedRow?.id ?? null}
          groups={[
            {
              label: "Breaking down",
              rows: rowsByTickers(
                section.rows,
                rituals?.upsideVsTape?.breakingDown,
              ),
              onActivate: () =>
                activateFocusPreset(
                  "upside-breaking-down",
                  rowsByTickers(
                    section.rows,
                    rituals?.upsideVsTape?.breakingDown,
                  ),
                ),
              active: isFocusedKey("upside-breaking-down"),
              onSelectRow: openRow,
            },
          ]}
        />
      </div>

      <CategoryGrid section={section} />

      <Top100DetailDrawer
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setSelectedRow(null);
        }}
        row={selectedRow}
        draftWeights={
          selectedRow
            ? (draftCompare?.presenceByTicker?.[selectedRow.ticker] ?? null)
            : null
        }
        loading={detailsQuery.isFetching}
        error={detailsQuery.data?.error ?? null}
        detail={detailsQuery.data?.data ?? null}
      />
    </div>
  );
}
