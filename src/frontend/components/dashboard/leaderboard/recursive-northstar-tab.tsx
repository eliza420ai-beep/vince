import { useMemo, useState } from "react";
import DashboardCard from "@/frontend/components/dashboard/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import type { RecursiveNorthStarResponse } from "@/frontend/lib/leaderboardsApi";

type RecursiveNorthStarTabProps = {
  loading: boolean;
  error: string | null;
  data: RecursiveNorthStarResponse | null;
};

const statusClass = (status: "on_track" | "at_risk" | "blocked"): string =>
  status === "on_track"
    ? "text-green-700 bg-green-500/10 border-green-500/30 dark:text-green-400"
    : status === "at_risk"
      ? "text-amber-700 bg-amber-500/10 border-amber-500/30 dark:text-amber-300"
      : "text-red-700 bg-red-500/10 border-red-500/30 dark:text-red-300";

const scoreClass = (score: number): string =>
  score >= 75
    ? "text-green-600 dark:text-green-400"
    : score >= 50
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, idx) => {
      const x = idx * stepX;
      const y = height - ((value - min) / range) * height;
      return `${idx === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildSparklinePoints(
  values: number[],
  width: number,
  height: number,
): Array<{ x: number; y: number; value: number }> {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, idx) => {
    const x = idx * stepX;
    const y = height - ((value - min) / range) * height;
    return { x, y, value };
  });
}

function PillarCard({
  title,
  score,
  status,
  highlights,
  blockers,
}: {
  title: string;
  score: number;
  status: "on_track" | "at_risk" | "blocked";
  highlights: string[];
  blockers: string[];
}) {
  return (
    <DashboardCard title={title}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm">
            Score:{" "}
            <span className={cn("font-semibold", scoreClass(score))}>
              {score}
            </span>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[11px]", statusClass(status))}
          >
            {status.replace("_", " ")}
          </Badge>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Highlights
          </p>
          <ul className="space-y-1 text-sm text-foreground/90">
            {highlights.length > 0 ? (
              highlights.map((line, idx) => <li key={idx}>{line}</li>)
            ) : (
              <li className="text-muted-foreground">No highlights yet.</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Blockers
          </p>
          <ul className="space-y-1 text-sm">
            {blockers.length > 0 ? (
              blockers.map((line, idx) => (
                <li key={idx} className="text-muted-foreground">
                  {line}
                </li>
              ))
            ) : (
              <li className="text-green-700 dark:text-green-400">
                No blockers.
              </li>
            )}
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}

export function RecursiveNorthStarTab({
  loading,
  error,
  data,
}: RecursiveNorthStarTabProps) {
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<
    "overall" | "recursion" | "ml" | "synergy"
  >("overall");
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-48 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-48 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3">
        <p className="font-medium text-foreground">
          Could not load Recursive North Star
        </p>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3">
        <p className="font-medium text-foreground">No recursive metrics yet</p>
        <p className="text-sm text-muted-foreground">
          The system needs closed trades and proof snapshots before this tab can
          score progress.
        </p>
      </div>
    );
  }

  const topBlockers = Array.from(
    new Set([
      ...data.pillars.recursion.blockers,
      ...data.pillars.ml.blockers,
      ...data.pillars.synergy.blockers,
    ]),
  ).slice(0, 8);
  const trendWindows = data.trend?.windows ?? [];
  const deltaVs7d = data.trend?.deltaVs7d ?? 0;
  const trend7 = trendWindows.find((w) => w.windowDays === 7);
  const trend30 = trendWindows.find((w) => w.windowDays === 30);
  const pillarDelta = {
    overall:
      trend7 && trend30
        ? Math.round(trend30.overallScore - trend7.overallScore)
        : 0,
    recursion:
      trend7 && trend30
        ? Math.round(trend30.recursionScore - trend7.recursionScore)
        : 0,
    ml: trend7 && trend30 ? Math.round(trend30.mlScore - trend7.mlScore) : 0,
    synergy:
      trend7 && trend30
        ? Math.round(trend30.synergyScore - trend7.synergyScore)
        : 0,
  } as const;
  const trendHistory = data.trend?.history ?? [];
  const historyValues = useMemo(() => {
    if (selectedTrendMetric === "recursion") {
      return trendHistory.map((point) => point.recursionScore);
    }
    if (selectedTrendMetric === "ml") {
      return trendHistory.map((point) => point.mlScore);
    }
    if (selectedTrendMetric === "synergy") {
      return trendHistory.map((point) => point.synergyScore);
    }
    return trendHistory.map((point) => point.overallScore);
  }, [selectedTrendMetric, trendHistory]);
  const sparklinePath = buildSparklinePath(historyValues, 420, 72);
  const sparklinePoints = buildSparklinePoints(historyValues, 420, 72);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground/90">
            Recursive North Star score: {data.scorecard.overallScore}
          </p>
          <Badge
            variant="outline"
            className={cn("text-[11px]", statusClass(data.scorecard.status))}
          >
            {data.scorecard.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Track whether we are truly self-improving and whether multi-agent
          coordination is beating single-agent baseline.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PillarCard title="Recursion" {...data.pillars.recursion} />
        <PillarCard title="ML Loop" {...data.pillars.ml} />
        <PillarCard title="1+1=3 Synergy" {...data.pillars.synergy} />
      </div>

      {trendWindows.length > 0 && (
        <DashboardCard title="Score Trend (7d vs 30d)">
          <div className="space-y-3">
            {trendHistory.length > 1 && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ["overall", "Overall"],
                        ["recursion", "Recursion"],
                        ["ml", "ML"],
                        ["synergy", "Synergy"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        variant={
                          selectedTrendMetric === value ? "default" : "outline"
                        }
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setSelectedTrendMetric(value)}
                      >
                        <span>{label}</span>
                        <span
                          className={cn(
                            "font-mono text-[10px]",
                            pillarDelta[value] >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                        >
                          {pillarDelta[value] >= 0 ? "↑" : "↓"}
                          {Math.abs(pillarDelta[value])}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      improving
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      weakening
                    </span>
                  </div>
                </div>
                <svg
                  width="100%"
                  height="84"
                  viewBox="0 0 420 84"
                  role="img"
                  aria-label="Recursive north star score sparkline"
                >
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    className="text-muted-foreground/40"
                  />
                  {sparklinePoints.slice(0, -1).map((p, idx) => {
                    const next = sparklinePoints[idx + 1];
                    const rising = next.value >= p.value;
                    return (
                      <line
                        key={`segment-${idx}`}
                        x1={p.x}
                        y1={p.y}
                        x2={next.x}
                        y2={next.y}
                        strokeWidth="2"
                        className={
                          rising
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                        stroke="currentColor"
                      />
                    );
                  })}
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary"
                  />
                  {sparklinePoints.map((p, idx) => (
                    <circle
                      key={`point-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r="2.25"
                      fill="currentColor"
                      className="text-primary"
                    >
                      <title>
                        {`${new Date(trendHistory[idx]?.at ?? Date.now()).toLocaleString()} — ${selectedTrendMetric} ${p.value}`}
                      </title>
                    </circle>
                  ))}
                </svg>
                <p className="text-[11px] text-muted-foreground px-1">
                  Rolling {selectedTrendMetric} history ({trendHistory.length}{" "}
                  points)
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {trendWindows.map((point) => (
                <div
                  key={point.windowDays}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <p className="text-xs text-muted-foreground">
                    {point.windowDays}d window
                  </p>
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      scoreClass(point.overallScore),
                    )}
                  >
                    {point.overallScore}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    R {point.recursionScore} · ML {point.mlScore} · S{" "}
                    {point.synergyScore}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              30d vs 7d movement:{" "}
              <span
                className={cn(
                  "font-medium",
                  deltaVs7d >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400",
                )}
              >
                {deltaVs7d >= 0 ? "+" : ""}
                {deltaVs7d}
              </span>
            </p>
          </div>
        </DashboardCard>
      )}

      <DashboardCard title="North Star Verdict">
        <div className="space-y-2 text-sm">
          <p>
            Full recursion:{" "}
            <span
              className={
                data.northStar.fullRecursionReady
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : "text-amber-600 dark:text-amber-400 font-medium"
              }
            >
              {data.northStar.fullRecursionReady ? "Ready" : "Not yet"}
            </span>
          </p>
          <p>
            1+1=3 proof:{" "}
            <span
              className={
                data.northStar.onePlusOneEqThreeReady
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : "text-amber-600 dark:text-amber-400 font-medium"
              }
            >
              {data.northStar.onePlusOneEqThreeReady ? "Ready" : "Not yet"}
            </span>
          </p>
          <ul className="text-muted-foreground space-y-1">
            {data.northStar.why.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
      </DashboardCard>

      <DashboardCard title="What is blocking proof">
        {topBlockers.length === 0 ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            No blockers. The system is eligible for promotion checks.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {topBlockers.map((blocker, idx) => (
              <li key={idx}>{blocker}</li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
