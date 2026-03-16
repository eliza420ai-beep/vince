import DashboardCard from "@/frontend/components/dashboard/card";
import type {
  Top100Category,
  Top100StocksSection,
  Top100StockRow,
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

function scoreClass(score?: number) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 55) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function CategoryGrid({ section }: { section: Top100StocksSection }) {
  const { byCategory } = section.meta;
  if (!byCategory?.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {byCategory.map((cat) => {
        const leaders = section.rows
          .filter((r) => r.category === cat.category)
          .sort((a, b) => {
            const aScore = a.composite ?? 0;
            const bScore = b.composite ?? 0;
            return bScore - aScore;
          })
          .slice(0, 3);
        return (
          <DashboardCard
            key={cat.category}
            title={cat.category}
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
                  {group.rows.length}
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
  status,
  agentId,
}: {
  section: Top100StocksSection | null | undefined;
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
  const [sortMode, setSortMode] = useState<Top100SortMode>("rank");
  const [sortDir, setSortDir] = useState<Top100SortDir>("asc");
  const [selectedRow, setSelectedRow] = useState<Top100StockRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const filteredRows = useMemo(() => {
    const baseRows =
      focusedTickers?.length && section?.rows?.length
        ? section.rows.filter((row) =>
            focusedTickers.includes(row.ticker.toUpperCase()),
          )
        : (section?.rows ?? []);
    return filterAndSortTop100Rows({
      rows: baseRows,
      search,
      category: selectedCategory,
      sleeve: selectedSleeve,
      flag: selectedFlag,
      source: selectedSource,
      freshOnly,
      scoredOnly,
      liveOnly,
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
    sortMode,
    sortDir,
  ]);

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
          Check that TOP100.md exists and is parseable.
        </p>
      </div>
    );
  }

  if (!section) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[160px] flex flex-col justify-center">
        <p className="font-medium text-foreground">No Top100 data yet</p>
        <p className="text-sm text-muted-foreground">
          Populate TOP100.md with the annex + scorecard to see the full map
          here.
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent dark:from-primary/25 dark:via-primary/10 border border-border/60 px-4 py-4">
        <p className="text-sm font-semibold text-foreground/90">
          The Next Bull Market · VINCE Top100
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          100-stock AI infrastructure bench, ranked by composite score and
          upside, across chips, cloud, power, grid, defence, robotics, space,
          materials, digital finance, and digital health.
        </p>
        <p className="text-[11px] text-muted-foreground/80 mt-2">
          {meta.total} names ·{" "}
          {meta.byCategory.map((c) => `${c.category} (${c.count})`).join(" · ")}
        </p>
        {status === "stale" || meta.warnings?.length ? (
          <div className="mt-2 text-[11px] text-muted-foreground/90">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border/60 bg-muted/40 font-medium">
              Partial coverage
            </span>
            {meta.scoredCoveragePct != null ||
            meta.quoteCoveragePct != null ||
            meta.historyCoveragePct != null ||
            meta.marketCapCoveragePct != null ? (
              <span className="ml-2">
                {meta.scoredCoveragePct != null
                  ? `Score ${meta.scoredCoveragePct.toFixed(0)}%`
                  : null}
                {meta.quoteCoveragePct != null
                  ? ` · Quote ${meta.quoteCoveragePct.toFixed(0)}%`
                  : null}
                {meta.historyCoveragePct != null
                  ? ` · Hist ${meta.historyCoveragePct.toFixed(0)}%`
                  : null}
                {meta.marketCapCoveragePct != null
                  ? ` · MCap ${meta.marketCapCoveragePct.toFixed(0)}%`
                  : null}
              </span>
            ) : null}
            {meta.warnings?.length ? (
              <div className="mt-1">{meta.warnings.slice(0, 2).join(" ")}</div>
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
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
      />

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

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <TopList
          title="Entered top 10"
          subtitle="Fresh leaders"
          rows={top10Entrants}
          onActivate={() => activateFocusPreset("entered-top10", top10Entrants)}
          active={isFocusedKey("entered-top10")}
          onSelectRow={openRow}
          selectedRowId={selectedRow?.id ?? null}
        />
        <TopList
          title="Exited top 10"
          subtitle="Losing urgency"
          rows={top10Exits}
          onActivate={() => activateFocusPreset("exited-top10", top10Exits)}
          active={isFocusedKey("exited-top10")}
          onSelectRow={openRow}
          selectedRowId={selectedRow?.id ?? null}
        />
        <TopList
          title="Biggest climbers"
          subtitle="Live repricing"
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
          subtitle="Slipping"
          rows={biggestFallers}
          onActivate={() =>
            activateFocusPreset("biggest-fallers", biggestFallers)
          }
          active={isFocusedKey("biggest-fallers")}
          onSelectRow={openRow}
          selectedRowId={selectedRow?.id ?? null}
        />
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

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
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
            <Top100Table
              rows={filteredRows}
              selectedRowId={selectedRow?.id ?? null}
              onRowClick={(r) => {
                setSelectedRow(r);
                setDrawerOpen(true);
              }}
            />
          </DashboardCard>
        </div>

        <div className="space-y-6">
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
          ) : null}
          {meta.sleeveAverages && (
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
          )}
        </div>
      </div>

      <CategoryGrid section={section} />

      <Top100DetailDrawer
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setSelectedRow(null);
        }}
        row={selectedRow}
        loading={detailsQuery.isFetching}
        error={detailsQuery.data?.error ?? null}
        detail={detailsQuery.data?.data ?? null}
      />
    </div>
  );
}
