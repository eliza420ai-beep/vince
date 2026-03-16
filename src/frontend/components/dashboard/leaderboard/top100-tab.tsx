import DashboardCard from "@/frontend/components/dashboard/card";
import type {
  Top100Category,
  Top100StocksSection,
  Top100StockRow,
} from "@/frontend/lib/leaderboardsApi";
import { cn } from "@/frontend/lib/utils";
import { useMemo, useState } from "react";
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
                  key={r.id ?? r.ticker}
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

function TopList({ title, rows }: { title: string; rows: Top100StockRow[] }) {
  if (!rows.length) return null;
  return (
    <DashboardCard title={title}>
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.id ?? r.ticker}
            className="flex items-baseline justify-between text-xs"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                {r.rank ?? "—"}
              </span>
              <span className="font-semibold">{r.ticker}</span>
              {r.company && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                  {r.company}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-3">
              {r.upsidePct && (
                <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  {r.upsidePct}
                </span>
              )}
              <span
                className={cn("font-mono text-[11px]", scoreClass(r.composite))}
              >
                {r.composite != null ? r.composite.toFixed(1) : "—"}
              </span>
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

  const categoryOptions: (Top100Category | "ALL")[] = useMemo(() => {
    const cats = section?.meta?.byCategory?.map((c) => c.category) ?? [];
    return ["ALL", ...cats];
  }, [section?.meta?.byCategory]);

  const toolbarOptions = useMemo(() => {
    return computeTop100ToolbarOptions(section?.rows ?? []);
  }, [section?.rows]);

  const filteredRows = useMemo(() => {
    return filterAndSortTop100Rows({
      rows: section?.rows ?? [],
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

  const detailsQuery = useQuery({
    queryKey: ["top100-details", agentId, selectedRow?.ticker ?? ""],
    enabled: drawerOpen && !!selectedRow?.ticker,
    queryFn: async () => {
      if (!selectedRow?.ticker)
        return { data: null, error: "Missing ticker", status: null };
      return await fetchTop100DetailsWithError(agentId, selectedRow.ticker);
    },
    staleTime: 60_000,
  });

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
  const topScore = meta.topByComposite ?? [];

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

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <DashboardCard title="Composite rankings (command center)">
            <Top100Table
              rows={filteredRows}
              onRowClick={(r) => {
                setSelectedRow(r);
                setDrawerOpen(true);
              }}
            />
          </DashboardCard>
        </div>

        <div className="space-y-6">
          <TopList title="Top 10 by composite" rows={topScore} />
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
