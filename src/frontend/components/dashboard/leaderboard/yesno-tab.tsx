import type { UUID } from "@elizaos/core";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardCard from "@/frontend/components/dashboard/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import { fetchYesNoWithError } from "@/frontend/lib/yesnoApi";

type YesNoMode = "swing" | "day";
type Decision = "YES" | "CAUTION" | "NO";

type YesNoCategoryKey =
  | "volatility"
  | "momentum"
  | "trend"
  | "breadth"
  | "macro";

type CategoryScores = Record<YesNoCategoryKey, number>;

type SectorRow = {
  symbol: string;
  name?: string;
  valueText?: string;
  relStrengthScore?: number;
};

type YesNoResponse = {
  updatedAt: number;
  mode: YesNoMode;
  decision: Decision;
  marketQualityScore: number;
  executionWindowScore: number;
  summary: string;
  terminalAnalysis?: string;
  dataQuality?: {
    isFresh?: boolean;
    isComplete?: boolean;
    missingInputs?: string[];
    sectorCoverageCount?: number;
    sectorCoverageRequired?: number;
    servedFromCache?: boolean;
    fetchedAt?: number;
    fetchDiagnostics?: {
      provider?: string;
      quoteChecks?: Array<{ key: string; ok: boolean }>;
      historyChecks?: Array<{
        key: string;
        ok: boolean;
        points?: number | null;
      }>;
      sectorHistoryMissing?: string[];
    };
  };
  regime?: "uptrend" | "downtrend" | "chop";
  categoryWeights: Record<YesNoCategoryKey, number>;
  categoryScores: CategoryScores;
  executionWindow?: {
    score: number;
    breakoutsHolding?: boolean | null;
    leadingFollowThrough?: boolean | null;
    pullbacksBought?: boolean | null;
  };
  volatility?: {
    vixLevel?: number | null;
    vixPercentile1y?: number | null;
    vixSlope5d?: number | null;
  };
  trend?: {
    spyPrice?: number | null;
    spyMa20?: number | null;
    spyMa50?: number | null;
    spyMa200?: number | null;
    qqqMa50?: number | null;
    spyRsi14?: number | null;
  };
  breadth?: {
    proxyUsed?: boolean;
    scoreNote?: string | null;
    proxyType?: string | null;
    positiveSectorCount?: number | null;
    totalSectors?: number | null;
    breadthLookbackDays?: number | null;
    breadthStage?: 1 | 2 | 3;
  };
  momentum?: {
    leaders?: SectorRow[];
    laggards?: SectorRow[];
    topBottomSpread?: number | null;
  };
  macro?: {
    tnx10y?: number | null;
    dxy?: number | null;
    fedStance?: "hawkish" | "neutral" | "dovish" | null;
  };
  sectorHeatmap?: {
    sectors: SectorRow[];
  };
  alert?: {
    title: string;
    message: string;
    etaSeconds?: number | null;
  } | null;
  tickers?: Array<{ label: string; valueText?: string }>;
  // Debug for UI panels. Optional: show direction via "up|down|flat".
  directions?: Partial<
    Record<
      "volatility" | "trend" | "breadth" | "momentum" | "macro",
      "up" | "down" | "flat"
    >
  >;
};

function fmtAge(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function decisionVariant(decision: Decision): "default" | "secondary" {
  if (decision === "YES") return "default";
  return "secondary";
}

function decisionColor(decision: Decision): string {
  if (decision === "YES") return "text-green-700 dark:text-green-400";
  if (decision === "CAUTION") return "text-amber-700 dark:text-amber-300";
  return "text-red-700 dark:text-red-400";
}

function ScoreRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const radius = 42;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (v / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          className="text-muted-foreground/20"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          className="text-primary"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transform: "rotate(-90deg)",
            transformOrigin: `${radius}px ${radius}px`,
          }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-semibold tabular-nums">
          {v.toFixed(0)}%
        </div>
        <div className="text-[11px] text-muted-foreground">Quality</div>
      </div>
    </div>
  );
}

function directionGlyph(dir?: "up" | "down" | "flat"): string {
  if (dir === "up") return "↑";
  if (dir === "down") return "↓";
  return "→";
}

function MetricPanel({
  title,
  valueText,
  direction,
  interpretation,
}: {
  title: string;
  valueText: string;
  direction?: "up" | "down" | "flat";
  interpretation: string;
}) {
  return (
    <DashboardCard
      title={title}
      subtitle={interpretation}
      className="shadow-none"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-2xl font-semibold tabular-nums">
          {valueText}
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-mono",
            direction === "up"
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              : direction === "down"
                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-border/60 bg-muted/20 text-muted-foreground",
          )}
          aria-label={`Direction ${directionGlyph(direction)}`}
        >
          {directionGlyph(direction)}{" "}
          <span className="ml-1 text-muted-foreground/80">
            {direction ?? "flat"}
          </span>
        </div>
      </div>
    </DashboardCard>
  );
}

export function YesNoTab({ agentId }: { agentId: UUID | string }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<YesNoMode>("swing");

  const query = useQuery<{
    data: YesNoResponse | null;
    error: string | null;
  }>({
    queryKey: ["yesno", agentId, mode],
    enabled: !!agentId,
    queryFn: () => fetchYesNoWithError(String(agentId), mode),
    staleTime: 30_000,
    refetchInterval: 45_000,
    retry: 1,
  });

  const data = query.data?.data ?? null;
  const error = query.data?.error ?? null;
  const isLoading = query.isLoading || query.isFetching;

  const updatedAge = useMemo(() => {
    if (!data?.updatedAt) return null;
    return fmtAge(Date.now() - data.updatedAt);
  }, [data?.updatedAt]);

  const marketQualityScore = data?.marketQualityScore ?? 0;
  const executionWindowScore =
    data?.executionWindowScore ?? data?.executionWindow?.score ?? 0;
  const dataQuality = data?.dataQuality;
  const failedHistoryChecks = useMemo(
    () =>
      (dataQuality?.fetchDiagnostics?.historyChecks ?? []).filter((c) => !c.ok),
    [dataQuality?.fetchDiagnostics?.historyChecks],
  );
  const failedQuoteChecks = useMemo(
    () =>
      (dataQuality?.fetchDiagnostics?.quoteChecks ?? []).filter((c) => !c.ok),
    [dataQuality?.fetchDiagnostics?.quoteChecks],
  );

  const top3 = useMemo(() => {
    const sectors = data?.sectorHeatmap?.sectors ?? [];
    return [...sectors]
      .filter((s) => typeof s.relStrengthScore === "number")
      .sort((a, b) => (b.relStrengthScore ?? 0) - (a.relStrengthScore ?? 0))
      .slice(0, 3)
      .map((s) => s.symbol);
  }, [data?.sectorHeatmap?.sectors]);

  const bottom3 = useMemo(() => {
    const sectors = data?.sectorHeatmap?.sectors ?? [];
    return [...sectors]
      .filter((s) => typeof s.relStrengthScore === "number")
      .sort((a, b) => (a.relStrengthScore ?? 0) - (b.relStrengthScore ?? 0))
      .slice(0, 3)
      .map((s) => s.symbol);
  }, [data?.sectorHeatmap?.sectors]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["yesno", agentId, mode] });
  }

  const decision = data?.decision ?? (error ? "NO" : "CAUTION");

  const tickerItems: Array<{ label: string; valueText?: string }> =
    data?.tickers?.length && data.tickers
      ? data.tickers
      : [
          { label: "SPY" },
          { label: "QQQ" },
          { label: "VIX" },
          { label: "DXY" },
          { label: "TNX" },
          { label: "XLK", valueText: "" },
          { label: "XLF", valueText: "" },
          { label: "XLE", valueText: "" },
          { label: "XLV", valueText: "" },
          { label: "XLI", valueText: "" },
          { label: "XLY", valueText: "" },
          { label: "XLP", valueText: "" },
          { label: "XLU", valueText: "" },
          { label: "XLB", valueText: "" },
          { label: "XLRE", valueText: "" },
          { label: "XLC", valueText: "" },
        ];

  const tickerText = useMemo(() => {
    return tickerItems
      .map((t) => {
        const val = t.valueText ? ` ${t.valueText}` : "";
        return `${t.label}${val}`;
      })
      .join("  •  ");
  }, [tickerItems]);

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @keyframes vinceYesNoMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Top ticker bar */}
      <DashboardCard
        title="Market Ticker"
        subtitle={
          data?.updatedAt ? `Updated ${updatedAge ?? "—"} ago` : "Fetching…"
        }
        className="shadow-none"
        addon={
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-mono",
              isLoading
                ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                : "border-green-500/30 bg-green-500/10 text-green-800 dark:text-green-200",
            )}
          >
            {isLoading ? "UPDATING" : "LIVE"}
          </span>
        }
      >
        <div className="relative w-full overflow-hidden">
          <div className="whitespace-nowrap text-[11px] font-mono text-muted-foreground">
            <div
              className="inline-flex"
              style={{
                animation: "vinceYesNoMarquee 25s linear infinite",
              }}
            >
              <span className="pr-10">{tickerText}</span>
              <span className="pr-10">{tickerText}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </DashboardCard>

      {/* Hero panel */}
      {error ? (
        <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
          <div className="text-sm font-medium">Could not load YES/NO</div>
          <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
            {error}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard
          title="Should I Trade?"
          subtitle="Swing/day risk gate for discretionary decisions"
          intent={decision === "YES" ? "success" : "default"}
          className="shadow-none"
          addon={
            <Badge
              variant={decision === "YES" ? "default" : "secondary"}
              className={cn(
                "px-3 py-1 text-sm font-mono",
                decisionColor(decision),
              )}
            >
              {decision}
            </Badge>
          }
        >
          {isLoading && !data ? (
            <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                    Market Quality Score
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Weighted blend of volatility, momentum, trend, breadth,
                    macro.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                    Execution Window Score
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      executionWindowScore >= 70
                        ? "text-green-700 dark:text-green-400"
                        : executionWindowScore >= 55
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-red-700 dark:text-red-400",
                    )}
                  >
                    {executionWindowScore.toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {data?.terminalAnalysis ?? data?.summary ?? "—"}
                </p>
                {dataQuality ? (
                  <div className="mt-3 rounded-lg border border-border/60 bg-muted/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                        Data Quality
                      </div>
                      <Badge
                        variant={
                          dataQuality.isComplete ? "default" : "secondary"
                        }
                        className={cn(
                          "px-3 py-1 text-sm font-mono",
                          dataQuality.isComplete
                            ? "text-green-700 dark:text-green-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {dataQuality.isComplete ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                    {!dataQuality.isComplete ? (
                      <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                        Missing:{" "}
                        {dataQuality.missingInputs?.slice(0, 6).join(", ") ||
                          "—"}
                        {typeof dataQuality.sectorCoverageCount === "number" &&
                        typeof dataQuality.sectorCoverageRequired ===
                          "number" ? (
                          <>
                            {" "}
                            | Sector: {dataQuality.sectorCoverageCount}/
                            {dataQuality.sectorCoverageRequired}
                          </>
                        ) : null}
                      </div>
                    ) : typeof dataQuality.sectorCoverageCount === "number" &&
                      typeof dataQuality.sectorCoverageRequired === "number" ? (
                      <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                        Sector coverage: {dataQuality.sectorCoverageCount}/
                        {dataQuality.sectorCoverageRequired}
                      </div>
                    ) : null}
                    {typeof data?.breadth?.positiveSectorCount === "number" &&
                    typeof data?.breadth?.totalSectors === "number" &&
                    typeof data?.breadth?.breadthLookbackDays === "number" ? (
                      <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                        Breadth proxy: {data.breadth.positiveSectorCount}/
                        {data.breadth.totalSectors} positive over{" "}
                        {data.breadth.breadthLookbackDays}d
                      </div>
                    ) : null}
                    {dataQuality?.fetchDiagnostics ? (
                      <div className="mt-2 rounded-md border border-border/60 bg-background/40 p-2">
                        <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                          Fetch Diagnostics
                        </div>
                        <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                          Provider:{" "}
                          {dataQuality.fetchDiagnostics.provider ?? "unknown"}
                          {typeof dataQuality.servedFromCache === "boolean" ? (
                            <>
                              {" "}
                              | Cache:{" "}
                              {dataQuality.servedFromCache ? "served" : "fresh"}
                            </>
                          ) : null}
                        </div>
                        {failedQuoteChecks.length > 0 ? (
                          <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                            Quote fail:{" "}
                            {failedQuoteChecks.map((c) => c.key).join(", ")}
                          </div>
                        ) : null}
                        {failedHistoryChecks.length > 0 ? (
                          <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                            History fail:{" "}
                            {failedHistoryChecks
                              .map((c) =>
                                typeof c.points === "number"
                                  ? `${c.key}(${c.points})`
                                  : c.key,
                              )
                              .join(", ")}
                          </div>
                        ) : null}
                        {(
                          dataQuality.fetchDiagnostics.sectorHistoryMissing ??
                          []
                        ).length > 0 ? (
                          <div className="mt-1 text-[11px] font-mono text-muted-foreground">
                            Sector misses:{" "}
                            {(
                              dataQuality.fetchDiagnostics
                                .sectorHistoryMissing ?? []
                            )
                              .slice(0, 6)
                              .join(", ")}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {data?.regime ? (
                  <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                    Regime: {data.regime}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DashboardCard>

        <DashboardCard
          title="Scores"
          subtitle={data?.mode ? `${data.mode.toUpperCase()} Mode` : "—"}
          className="shadow-none"
        >
          {isLoading && !data ? (
            <div className="h-80 bg-muted/50 rounded-xl animate-pulse" />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center">
                <div className="text-primary">
                  <ScoreRing value={marketQualityScore} />
                </div>
              </div>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Decision</span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      decisionColor(decision),
                    )}
                  >
                    {decision}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="font-mono font-semibold">
                    {marketQualityScore.toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Execution</span>
                  <span className="font-mono font-semibold">
                    {executionWindowScore.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                <div className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground/70">
                  Mode Toggle
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant={mode === "swing" ? "default" : "outline"}
                    onClick={() => setMode("swing")}
                  >
                    Swing Trading
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "day" ? "default" : "outline"}
                    onClick={() => setMode("day")}
                  >
                    Day Trading
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Alert banner */}
      {data?.alert ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 shadow-none",
            data.alert.title.toLowerCase().includes("cpi") ||
              data.alert.title.toLowerCase().includes("fed") ||
              data.alert.title.toLowerCase().includes("fomc")
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border/60 bg-muted/10",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{data.alert.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.alert.message}
              </div>
            </div>
            {typeof data.alert.etaSeconds === "number" ? (
              <div className="text-[11px] font-mono text-muted-foreground">
                ETA ~{Math.max(0, Math.floor(data.alert.etaSeconds / 60))}m
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Core metric panels */}
      {isLoading && !data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-36 bg-muted/50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricPanel
            title="Volatility"
            valueText={`${(data?.categoryScores.volatility ?? 0).toFixed(0)}%`}
            direction={data?.directions?.volatility}
            interpretation={
              (data?.categoryScores.volatility ?? 0) >= 70
                ? "Healthy: volatility is controlled."
                : (data?.categoryScores.volatility ?? 0) >= 55
                  ? "Moderate: workable, but keep sizing disciplined."
                  : "Risk-off: volatility is elevated or rising."
            }
          />
          <MetricPanel
            title="Trend"
            valueText={`${(data?.categoryScores.trend ?? 0).toFixed(0)}%`}
            direction={data?.directions?.trend}
            interpretation={
              (data?.categoryScores.trend ?? 0) >= 70
                ? "Aligned: averages support trend continuation."
                : (data?.categoryScores.trend ?? 0) >= 55
                  ? "Mixed: trend has support but needs confirmation."
                  : "Weak: chop or downtrend conditions."
            }
          />
          <MetricPanel
            title="Breadth"
            valueText={`${(data?.categoryScores.breadth ?? 0).toFixed(0)}%`}
            direction={data?.directions?.breadth}
            interpretation={
              (data?.categoryScores.breadth ?? 0) >= 70
                ? "Expanding participation: more names working."
                : (data?.categoryScores.breadth ?? 0) >= 55
                  ? "Okay: participation is partial."
                  : "Narrow: fewer stocks are carrying the move."
            }
          />
          <MetricPanel
            title="Momentum"
            valueText={`${(data?.categoryScores.momentum ?? 0).toFixed(0)}%`}
            direction={data?.directions?.momentum}
            interpretation={
              (data?.categoryScores.momentum ?? 0) >= 70
                ? "Leaders are strong and participation follows."
                : (data?.categoryScores.momentum ?? 0) >= 55
                  ? "Moderate: momentum is present but selective."
                  : "Soft: leadership is fading."
            }
          />
          <MetricPanel
            title="Macro / Liquidity"
            valueText={`${(data?.categoryScores.macro ?? 0).toFixed(0)}%`}
            direction={data?.directions?.macro}
            interpretation={
              (data?.categoryScores.macro ?? 0) >= 70
                ? "Supportive: yields and USD direction favor risk."
                : (data?.categoryScores.macro ?? 0) >= 55
                  ? "Neutral: macro is not clearly risk-on."
                  : "Headwind: rates/USD suggest risk-off."
            }
          />
        </div>
      )}

      {/* Sector heatmap */}
      <DashboardCard
        title="Sector Heatmap"
        subtitle="Leaders vs laggards (relative strength proxy)"
        className="shadow-none"
      >
        {isLoading && !data ? (
          <div className="h-40 bg-muted/50 rounded-xl animate-pulse" />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 font-mono text-green-700 dark:text-green-300">
                Leaders: {top3.length ? top3.join(", ") : "—"}
              </span>
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-red-700 dark:text-red-300">
                Laggards: {bottom3.length ? bottom3.join(", ") : "—"}
              </span>
            </div>
            <div className="space-y-2">
              {(
                (data?.sectorHeatmap?.sectors ?? []) as Array<{
                  symbol: string;
                  relStrengthScore?: number;
                  name?: string;
                  valueText?: string;
                }>
              ).length ? (
                (data?.sectorHeatmap?.sectors ?? []).map(
                  (s: { symbol: string; relStrengthScore?: number }) => {
                    const strength = s.relStrengthScore ?? 0;
                    const normalized = Math.max(0, Math.min(100, strength));
                    const isLeader = top3.includes(s.symbol);
                    const isLaggard = bottom3.includes(s.symbol);
                    return (
                      <div key={s.symbol} className="flex items-center gap-3">
                        <div className="w-16 font-mono text-xs text-muted-foreground">
                          {s.symbol}
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              isLeader
                                ? "bg-green-500/80"
                                : isLaggard
                                  ? "bg-red-500/80"
                                  : "bg-primary/60",
                            )}
                            style={{ width: `${normalized}%` }}
                          />
                        </div>
                        <div className="w-14 text-right font-mono text-xs text-muted-foreground">
                          {strength ? `${strength.toFixed(0)}` : "—"}
                        </div>
                      </div>
                    );
                  },
                )
              ) : (
                <div className="text-xs text-muted-foreground">
                  No sector data available.
                </div>
              )}
            </div>
          </div>
        )}
      </DashboardCard>

      {/* Scoring breakdown */}
      <DashboardCard
        title="Scoring Breakdown"
        subtitle="Weights and category contributions"
        className="shadow-none"
      >
        {isLoading && !data ? (
          <div className="h-72 bg-muted/50 rounded-xl animate-pulse" />
        ) : (
          <div className="space-y-3">
            {(
              [
                ["volatility", "Volatility"],
                ["momentum", "Momentum"],
                ["trend", "Trend"],
                ["breadth", "Breadth"],
                ["macro", "Macro / Liquidity"],
              ] as Array<[YesNoCategoryKey, string]>
            ).map(([key, label]) => {
              const weight = data?.categoryWeights[key] ?? 0;
              const score = data?.categoryScores[key] ?? 0;
              const contribution = (weight / 100) * score; // 0..100 (scaled)
              const pct = Math.max(0, Math.min(100, contribution));
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="font-mono text-muted-foreground">
                      {label} · w={weight.toFixed(0)}%
                    </div>
                    <div className="font-mono text-muted-foreground">
                      score={score.toFixed(0)}% · contrib=
                      {contribution.toFixed(1)}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Total market quality
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {marketQualityScore.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardCard>

      {/* Execution window details */}
      <DashboardCard
        title="Execution Window"
        subtitle="Whether setups are actually working (separate from market quality)"
        className="shadow-none"
      >
        {isLoading && !data ? (
          <div className="h-36 bg-muted/50 rounded-xl animate-pulse" />
        ) : (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Score</span>
              <span className="font-mono font-semibold">
                {executionWindowScore.toFixed(0)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="secondary" className="font-mono">
                Breakouts holding:{" "}
                {data?.executionWindow?.breakoutsHolding == null
                  ? "—"
                  : data.executionWindow.breakoutsHolding
                    ? "YES"
                    : "NO"}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Leading follow-through:{" "}
                {data?.executionWindow?.leadingFollowThrough == null
                  ? "—"
                  : data.executionWindow.leadingFollowThrough
                    ? "YES"
                    : "NO"}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Pullbacks bought quickly:{" "}
                {data?.executionWindow?.pullbacksBought == null
                  ? "—"
                  : data.executionWindow.pullbacksBought
                    ? "YES"
                    : "NO"}
              </Badge>
            </div>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}
