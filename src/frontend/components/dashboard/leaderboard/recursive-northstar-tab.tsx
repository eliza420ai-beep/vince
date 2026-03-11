import { useMemo, useState } from "react";
import DashboardCard from "@/frontend/components/dashboard/card";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import type {
  RecursiveNorthStarOperatorStatus,
  RecursiveNorthStarResponse,
} from "@/frontend/lib/leaderboardsApi";

type RecursiveNorthStarTabProps = {
  loading: boolean;
  error: string | null;
  data: RecursiveNorthStarResponse | null;
  operatorError?: string | null;
  operatorData?: RecursiveNorthStarOperatorStatus | null;
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

const snapshotAgeClass = (ageDays: number): string =>
  ageDays < 3
    ? "text-green-600 dark:text-green-400"
    : ageDays < 7
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

const snapshotAgeLabel = (ageDays: number): "fresh" | "aging" | "stale" =>
  ageDays < 3 ? "fresh" : ageDays < 7 ? "aging" : "stale";

const priorityBadgeClass = (label: "P1" | "P2" | "P3"): string =>
  label === "P1"
    ? "text-red-700 bg-red-500/10 border-red-500/30 dark:text-red-300"
    : label === "P2"
      ? "text-amber-700 bg-amber-500/10 border-amber-500/30 dark:text-amber-300"
      : "text-blue-700 bg-blue-500/10 border-blue-500/30 dark:text-blue-300";

const BLOCKER_LABELS: Record<string, string> = {
  sample_count_below_20: "Need at least 20 closed outcomes in 30d",
  time_coverage_below_7d: "Need closes spread across 7 distinct days",
  regime_depth_below_5: "Need stronger regime depth balance",
  allocator_summary_unavailable: "Allocator summary is unavailable",
  allocator_still_in_observe_only: "Allocator is still in observe-only mode",
  no_models_loaded: "No ONNX models loaded",
  not_enough_complete_trades_30d: "Need more complete trades in 30d",
  weight_bandit_not_ready: "Weight bandit is not ready",
  swarm_not_beating_single_agent: "Swarm uplift is not beating ONNX baseline",
  causal_promotion_not_eligible: "Causal promotion gate is not eligible",
  no_causal_pairs: "No causal pairs available yet",
  causal_sample_depth_below_target: "Need deeper per-arm causal sample depth",
  causal_sample_depth_below_12: "Need deeper per-arm causal sample depth",
};

const SYNERGY_BLOCKER_ACTIONS: Record<string, string> = {
  swarm_not_beating_single_agent:
    "Improve treatment-stage edge so uplift stays positive.",
  causal_promotion_not_eligible:
    "Lift ciLower while preserving positive uplift.",
  no_causal_pairs: "Generate balanced stage outcomes to form causal pairs.",
  causal_sample_depth_below_target:
    "Add balanced closes until each arm reaches minimum depth.",
  causal_sample_depth_below_12:
    "Add balanced closes until each arm reaches minimum depth.",
};

const formatBlockerLabel = (code: string): string =>
  BLOCKER_LABELS[code] ?? code;

const formatSynergyBlocker = (code: string): string => {
  const label = formatBlockerLabel(code);
  const nextAction = SYNERGY_BLOCKER_ACTIONS[code];
  return nextAction ? `${label} - Next: ${nextAction}` : label;
};

const formatMinutesAgo = (ageMs?: number | null): string => {
  if (ageMs == null || !Number.isFinite(ageMs)) return "unknown age";
  const mins = Math.max(0, Math.round(ageMs / 60000));
  return `${mins}m ago`;
};

const formatDelta = (value?: number): string => {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  return Number.isInteger(safe) ? String(safe) : safe.toFixed(2);
};

const coverageDeltaClass = (value?: number): string => {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  if (safe <= 0) return "text-green-600 dark:text-green-400";
  if (safe <= 2) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

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
  blockerFormatter,
}: {
  title: string;
  score: number;
  status: "on_track" | "at_risk" | "blocked";
  highlights: string[];
  blockers: string[];
  blockerFormatter?: (blockerCode: string) => string;
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
                  {(blockerFormatter ?? formatBlockerLabel)(line)}
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
  operatorError,
  operatorData,
}: RecursiveNorthStarTabProps) {
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<
    "overall" | "recursion" | "ml" | "synergy"
  >("overall");
  const [copiedRunbook, setCopiedRunbook] = useState(false);
  const [copiedWeeklyRunbook, setCopiedWeeklyRunbook] = useState(false);
  const trendHistory = data?.trend?.history ?? [];
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
  const sparklinePath = buildSparklinePath(historyValues, 420, 72);
  const sparklinePoints = buildSparklinePoints(historyValues, 420, 72);
  const runbookCommand = `AGENT_ID="<your-agent-id>" && curl -s "http://localhost:3000/api/agents/$AGENT_ID/plugins/plugin-vince/vince/recursive-north-star/operator-status?agentId=$AGENT_ID" && echo "" && curl -s "http://localhost:3000/api/agents/$AGENT_ID/plugins/plugin-vince/vince/recursive-north-star?agentId=$AGENT_ID" && echo "" && curl -s "http://localhost:3000/api/agents/$AGENT_ID/plugins/plugin-vince/vince/paper?agentId=$AGENT_ID"`;
  const weeklyReviewCommand = `AGENT_ID="<your-agent-id>" && SNAP_DIR="./docs/standup/recursive-snapshots" && TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)" && mkdir -p "$SNAP_DIR" && OUT="$SNAP_DIR/$TS.json" && printf '{\\n' > "$OUT" && printf '  "capturedAt":"%s",\\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUT" && printf '  "operatorStatus":' >> "$OUT" && curl -s "http://localhost:3000/api/agents/$AGENT_ID/plugins/plugin-vince/vince/recursive-north-star/operator-status?agentId=$AGENT_ID" >> "$OUT" && printf ',\\n  "northStar":' >> "$OUT" && curl -s "http://localhost:3000/api/agents/$AGENT_ID/plugins/plugin-vince/vince/recursive-north-star?agentId=$AGENT_ID" >> "$OUT" && printf ',\\n  "paper":' >> "$OUT" && curl -s "http://localhost:3000/api/agents/$AGENT_ID/plugins/plugin-vince/vince/paper?agentId=$AGENT_ID" >> "$OUT" && printf '\\n}\\n' >> "$OUT" && echo "Wrote $OUT"`;
  const copyRunbookCommand = async () => {
    try {
      await navigator.clipboard.writeText(runbookCommand);
      setCopiedRunbook(true);
      setTimeout(() => setCopiedRunbook(false), 1500);
    } catch {
      window.prompt("Copy runbook command:", runbookCommand);
    }
  };
  const copyWeeklyReviewCommand = async () => {
    try {
      await navigator.clipboard.writeText(weeklyReviewCommand);
      setCopiedWeeklyRunbook(true);
      setTimeout(() => setCopiedWeeklyRunbook(false), 1500);
    } catch {
      window.prompt("Copy weekly review command:", weeklyReviewCommand);
    }
  };
  const runtimeContext =
    operatorData?.triage.ml.runtimeFingerprint ??
    data.metrics.ml.runtimeFingerprint ??
    null;
  const providerAttemptSummary = Object.entries(
    data.metrics.ml.providerAttemptsByModel ?? {},
  )
    .map(([model, attempts]) => {
      const summary = attempts
        .map((attempt) =>
          attempt.success
            ? `${attempt.strategy}:ok`
            : `${attempt.strategy}:fail`,
        )
        .join(", ");
      return `${model}[${summary}]`;
    })
    .join(" | ");
  const allocatorSource =
    data.metrics.recursion.allocatorSummarySource ?? "none";
  const allocatorIsStale =
    data.metrics.recursion.allocatorSummaryStale ?? false;
  const allocatorAgeText = formatMinutesAgo(
    data.metrics.recursion.allocatorSummaryAgeMs,
  );
  const nearPassDepthRatio = data.metrics.synergy.nearPassDepthRatio ?? 0;
  const nearPassEffectRatio = data.metrics.synergy.nearPassEffectRatio ?? 0;
  const nearPassBonus = data.metrics.synergy.nearPassBonus ?? 0;
  const recursionCoverage = data.metrics.recursion.coverageVelocity;
  const synergyCoverage = data.metrics.synergy.coverageVelocity;

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

      {(recursionCoverage || synergyCoverage) && (
        <DashboardCard title="Coverage Velocity">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                Recursion Delta
              </p>
              {recursionCoverage ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    closes{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        coverageDeltaClass(
                          recursionCoverage.missingClosedRowsTo20,
                        ),
                      )}
                    >
                      {formatDelta(recursionCoverage.missingClosedRowsTo20)}
                    </span>{" "}
                    · days{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        coverageDeltaClass(
                          recursionCoverage.missingDistinctDaysTo7,
                        ),
                      )}
                    >
                      {formatDelta(recursionCoverage.missingDistinctDaysTo7)}
                    </span>{" "}
                    · regime{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        coverageDeltaClass(
                          recursionCoverage.missingRegimeDepthTo5,
                        ),
                      )}
                    >
                      {formatDelta(recursionCoverage.missingRegimeDepthTo5)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pace ({formatDelta(recursionCoverage.daysRemaining)}d left):
                    closes {formatDelta(recursionCoverage.closesPerDayNeeded)}
                    /day · days{" "}
                    {formatDelta(recursionCoverage.distinctDaysPerDayNeeded)}
                    /day · regime{" "}
                    {formatDelta(recursionCoverage.regimeDepthPerDayNeeded)}/day
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No recursion coverage data.
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                Synergy Delta
              </p>
              {synergyCoverage ? (
                <div className="space-y-1">
                  <p className="text-muted-foreground">
                    stage{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        coverageDeltaClass(synergyCoverage.stageDeficitTotal),
                      )}
                    >
                      {formatDelta(synergyCoverage.stageDeficitTotal)}
                    </span>{" "}
                    · pair{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        coverageDeltaClass(synergyCoverage.pairDeficitTotal),
                      )}
                    >
                      {formatDelta(synergyCoverage.pairDeficitTotal)}
                    </span>{" "}
                    · min-arm{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        coverageDeltaClass(
                          synergyCoverage.minSamplesPerArmDeficit,
                        ),
                      )}
                    >
                      {formatDelta(synergyCoverage.minSamplesPerArmDeficit)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pace ({formatDelta(synergyCoverage.daysRemaining)}d left):
                    stage{" "}
                    {formatDelta(synergyCoverage.stageDeficitPerDayNeeded)}/day
                    · pair{" "}
                    {formatDelta(synergyCoverage.pairDeficitPerDayNeeded)}
                    /day · min-arm{" "}
                    {formatDelta(synergyCoverage.minArmPerDayNeeded)}/day
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No synergy coverage data.
                </p>
              )}
            </div>
          </div>
        </DashboardCard>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <PillarCard title="Recursion" {...data.pillars.recursion} />
        <PillarCard title="ML Loop" {...data.pillars.ml} />
        <PillarCard
          title="1+1=3 Synergy"
          {...data.pillars.synergy}
          blockerFormatter={formatSynergyBlocker}
        />
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
          <p className="text-xs text-muted-foreground">
            Allocator summary:{" "}
            <span
              className={cn(
                "font-medium",
                allocatorSource === "none"
                  ? "text-red-600 dark:text-red-400"
                  : allocatorIsStale
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-green-600 dark:text-green-400",
              )}
            >
              {allocatorSource === "none"
                ? "missing"
                : allocatorIsStale
                  ? "stale"
                  : "fresh"}
            </span>{" "}
            ({allocatorSource}, {allocatorAgeText})
          </p>
          {recursionCoverage && (
            <p className="text-xs text-muted-foreground">
              Coverage delta: closes {recursionCoverage.missingClosedRowsTo20} ·
              days {recursionCoverage.missingDistinctDaysTo7} · regime{" "}
              {recursionCoverage.missingRegimeDepthTo5}
            </p>
          )}
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
              <li key={idx}>{formatBlockerLabel(blocker)}</li>
            ))}
          </ul>
        )}
      </DashboardCard>

      {(operatorData || operatorError) && (
        <DashboardCard title="Operator Unblock Checklist">
          {operatorError && !operatorData ? (
            <p className="text-sm text-muted-foreground">{operatorError}</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  Use one command to snapshot blockers and paper status.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={copiedRunbook ? "default" : "outline"}
                    className="h-7 text-[11px]"
                    onClick={copyRunbookCommand}
                  >
                    {copiedRunbook ? "Copied" : "Copy runbook command"}
                  </Button>
                  <Button
                    size="sm"
                    variant={copiedWeeklyRunbook ? "default" : "outline"}
                    className="h-7 text-[11px]"
                    onClick={copyWeeklyReviewCommand}
                  >
                    {copiedWeeklyRunbook
                      ? "Copied weekly"
                      : "Copy weekly review command"}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                <span>Priority legend:</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                    priorityBadgeClass("P1"),
                  )}
                >
                  P1 critical
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                    priorityBadgeClass("P2"),
                  )}
                >
                  P2 important
                </span>
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                    priorityBadgeClass("P3"),
                  )}
                >
                  P3 nice-to-have
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Last weekly snapshot:{" "}
                <span
                  className="inline-block align-middle text-muted-foreground/80"
                  title="Snapshot freshness thresholds: fresh < 3d, aging < 7d, stale >= 7d."
                >
                  (i)
                </span>{" "}
                {operatorData?.weeklySnapshot?.available &&
                operatorData.weeklySnapshot.capturedAtMs ? (
                  <>
                    <span
                      className={cn(
                        "font-medium",
                        snapshotAgeClass(
                          (Date.now() -
                            operatorData.weeklySnapshot.capturedAtMs) /
                            (24 * 60 * 60 * 1000),
                        ),
                      )}
                    >
                      {snapshotAgeLabel(
                        (Date.now() -
                          operatorData.weeklySnapshot.capturedAtMs) /
                          (24 * 60 * 60 * 1000),
                      )}
                    </span>{" "}
                    -{" "}
                    {`${new Date(operatorData.weeklySnapshot.capturedAtMs).toLocaleString()} (${operatorData.weeklySnapshot.path})`}
                  </>
                ) : (
                  "none yet"
                )}
              </p>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  ML Next Actions
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {(operatorData?.triage.ml.prioritizedNextActions?.length ??
                    0) > 0
                    ? operatorData?.triage.ml.prioritizedNextActions?.map(
                        (row, idx) => (
                          <li key={`ml-action-${idx}`}>
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold mr-1",
                                priorityBadgeClass(row.label),
                              )}
                            >
                              {row.label}
                            </span>{" "}
                            {row.action}
                          </li>
                        ),
                      )
                    : (operatorData?.triage.ml.nextActions?.map((line, idx) => (
                        <li key={`ml-action-${idx}`}>{line}</li>
                      )) ?? <li>No ML action guidance yet.</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Recursion Next Actions
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {(operatorData?.triage.recursion.prioritizedNextActions
                    ?.length ?? 0) > 0
                    ? operatorData?.triage.recursion.prioritizedNextActions?.map(
                        (row, idx) => (
                          <li key={`recursion-action-${idx}`}>
                            <span
                              className={cn(
                                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold mr-1",
                                priorityBadgeClass(row.label),
                              )}
                            >
                              {row.label}
                            </span>{" "}
                            {row.action}
                          </li>
                        ),
                      )
                    : (operatorData?.triage.recursion.nextActions?.map(
                        (line, idx) => (
                          <li key={`recursion-action-${idx}`}>{line}</li>
                        ),
                      ) ?? <li>No recursion action guidance yet.</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Synergy Deficits
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {(operatorData?.triage.synergy.prioritizedNextActions
                    ?.length ?? 0) > 0 &&
                    operatorData?.triage.synergy.prioritizedNextActions?.map(
                      (row, idx) => (
                        <li key={`synergy-action-${idx}`}>
                          <span
                            className={cn(
                              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold mr-1",
                              priorityBadgeClass(row.label),
                            )}
                          >
                            {row.label}
                          </span>{" "}
                          {row.action}
                        </li>
                      ),
                    )}
                  {(operatorData?.triage.synergy.stageDeficits ?? []).length ===
                    0 &&
                  (operatorData?.triage.synergy.pairDeficits ?? []).length ===
                    0 ? (
                    <li>No current stage/pair deficits.</li>
                  ) : (
                    <>
                      {(operatorData?.triage.synergy.stageDeficits ?? []).map(
                        (row, idx) => (
                          <li key={`stage-deficit-${idx}`}>
                            stage {row.stage}: deficit {row.deficitToMin}
                          </li>
                        ),
                      )}
                      {(operatorData?.triage.synergy.pairDeficits ?? []).map(
                        (row, idx) => (
                          <li key={`pair-deficit-${idx}`}>
                            pair {row.label}: deficit {row.deficitToMin}
                          </li>
                        ),
                      )}
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </DashboardCard>
      )}

      <DashboardCard title="Milestone Gates">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Recursion 3d", data.milestones.recursion3d],
              ["ML 3d", data.milestones.ml3d],
              ["Synergy 7d", data.milestones.synergy7d],
            ] as const
          ).map(([label, milestone]) => (
            <div
              key={label}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  milestone.pass
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400",
                )}
              >
                {milestone.pass ? "pass" : "in_progress"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {milestone.observedPoints} points in window
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>

      {(data.metrics.ml.readinessReasons.length > 0 ||
        data.metrics.ml.missingModelFiles.length > 0 ||
        data.metrics.ml.lastLoadError ||
        data.metrics.ml.banditInitError) && (
        <DashboardCard title="ML Readiness Diagnostics">
          <div className="space-y-2 text-sm">
            {data.metrics.ml.readinessReasons.length > 0 && (
              <p className="text-muted-foreground">
                Reasons: {data.metrics.ml.readinessReasons.join(", ")}
              </p>
            )}
            {data.metrics.ml.missingModelFiles.length > 0 && (
              <p className="text-muted-foreground">
                Missing model files:{" "}
                {data.metrics.ml.missingModelFiles.join(", ")}
              </p>
            )}
            {data.metrics.ml.lastLoadError && (
              <p className="text-muted-foreground">
                Last model load error: {data.metrics.ml.lastLoadError}
              </p>
            )}
            {data.metrics.ml.banditInitError && (
              <p className="text-muted-foreground">
                Bandit init error: {data.metrics.ml.banditInitError}
              </p>
            )}
            {runtimeContext && (
              <p className="text-[11px] text-muted-foreground">
                Runtime context: {runtimeContext.releaseName}{" "}
                {runtimeContext.nodeVersion} (napi{" "}
                {runtimeContext.napiVersion ?? "unknown"}){" "}
                {runtimeContext.nativeAddonsDisabled
                  ? "native_addons_disabled"
                  : "native_addons_enabled"}
                {runtimeContext.nodeOptions
                  ? ` · NODE_OPTIONS=${runtimeContext.nodeOptions}`
                  : ""}
                {runtimeContext.onnxLoaderStrategy
                  ? ` · loader=${runtimeContext.onnxLoaderStrategy}`
                  : ""}
                {runtimeContext.onnxModulePath
                  ? ` · module=${runtimeContext.onnxModulePath}`
                  : ""}
                {runtimeContext.recoveryCooldownUntil &&
                runtimeContext.recoveryCooldownUntil > Date.now()
                  ? ` · cooldown until ${new Date(runtimeContext.recoveryCooldownUntil).toLocaleTimeString()}`
                  : ""}
              </p>
            )}
            {data.metrics.ml.runtimeProbe?.providerAttempts &&
              data.metrics.ml.runtimeProbe.providerAttempts.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Probe attempts:{" "}
                  {data.metrics.ml.runtimeProbe.providerAttempts
                    .map((attempt) =>
                      attempt.success
                        ? `${attempt.strategy}=ok`
                        : `${attempt.strategy}=fail`,
                    )
                    .join(", ")}
                </p>
              )}
            {providerAttemptSummary && (
              <p className="text-[11px] text-muted-foreground">
                Model load attempts: {providerAttemptSummary}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Models dir: {data.metrics.ml.modelsDir || "unset"}
            </p>
          </div>
        </DashboardCard>
      )}

      <DashboardCard title="Causal Pair Drilldown">
        <div className="space-y-2">
          <p className="text-[12px] text-muted-foreground">
            Near-pass: depth {(nearPassDepthRatio * 100).toFixed(0)}% · effect{" "}
            {(nearPassEffectRatio * 100).toFixed(0)}% · bonus +
            {nearPassBonus.toFixed(1)}
          </p>
          {synergyCoverage && (
            <p className="text-[12px] text-muted-foreground">
              Coverage velocity: stage deficit{" "}
              {synergyCoverage.stageDeficitTotal} · pair deficit{" "}
              {synergyCoverage.pairDeficitTotal} · min-arm gap{" "}
              {synergyCoverage.minSamplesPerArmDeficit}
            </p>
          )}
          {data.metrics.synergy.causalPairs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No causal pairs available yet.
            </p>
          ) : (
            data.metrics.synergy.causalPairs.map((pair) => (
              <div
                key={pair.label}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{pair.label}</p>
                  <span
                    className={cn(
                      "text-xs",
                      pair.passed
                        ? "text-green-600 dark:text-green-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {pair.passed ? "pass" : (pair.failureReason ?? "fail")}
                  </span>
                </div>
                <p className="text-muted-foreground text-[12px]">
                  {pair.controlStage} ({pair.controlCount}) {"->"}{" "}
                  {pair.treatmentStage} ({pair.treatmentCount})
                </p>
                <p className="text-muted-foreground text-[12px]">
                  uplift {pair.upliftDelta.toFixed(3)} · ciLower{" "}
                  {pair.ciLower.toFixed(3)} · ciUpper {pair.ciUpper.toFixed(3)}
                </p>
                {(pair.smoothedCiLower !== undefined ||
                  pair.smoothedUpliftDelta !== undefined) && (
                  <p className="text-muted-foreground text-[12px]">
                    smoothed uplift{" "}
                    {(pair.smoothedUpliftDelta ?? pair.upliftDelta).toFixed(3)}{" "}
                    · smoothed ciLower{" "}
                    {(pair.smoothedCiLower ?? pair.ciLower).toFixed(3)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
