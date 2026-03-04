import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecursiveNorthStarTab } from "./recursive-northstar-tab";

describe("RecursiveNorthStarTab", () => {
  it("renders loading skeleton", () => {
    const html = renderToStaticMarkup(
      <RecursiveNorthStarTab loading={true} error={null} data={null} />,
    );
    expect(html).toContain("animate-pulse");
  });

  it("renders error state", () => {
    const html = renderToStaticMarkup(
      <RecursiveNorthStarTab loading={false} error={"boom"} data={null} />,
    );
    expect(html).toContain("Could not load Recursive North Star");
    expect(html).toContain("boom");
  });

  it("renders scorecard data and blockers", () => {
    const html = renderToStaticMarkup(
      <RecursiveNorthStarTab
        loading={false}
        error={null}
        operatorError={null}
        operatorData={{
          blockers: {
            recursion: ["sample_count_below_20"],
            ml: ["no_models_loaded"],
            synergy: ["causal_sample_depth_below_12"],
          },
          triage: {
            ml: {
              readinessReasons: ["onnxruntime_unavailable"],
              lastLoadError: "backend not found",
              lastLoadErrorCode: "backend_unavailable",
              probe: null,
              nextActions: ["Restart VINCE runtime after onnxruntime rebuild."],
            },
            recursion: {
              sufficiencyTasks: ["sample_count_below_20"],
              nextActions: ["Increase closed outcomes to at least 20 rows."],
            },
            synergy: {
              promotionReasons: ["onnx_vs_swarm:insufficient_samples"],
              stageDeficits: [{ stage: "onnx_enabled", deficitToMin: 7 }],
              pairDeficits: [{ label: "onnx_vs_swarm", deficitToMin: 7 }],
              nextActions: [
                "Fill per-stage deficits to minimumSamplesPerArm=12.",
              ],
            },
          },
          weeklySnapshot: {
            available: true,
            path: "docs/standup/recursive-snapshots/2026-03-04T08-00-00Z.json",
            capturedAtMs: Date.now() - 5 * 60 * 1000,
          },
          generatedAt: Date.now(),
        }}
        data={{
          scorecard: { overallScore: 78, status: "on_track" },
          pillars: {
            recursion: {
              score: 80,
              status: "on_track",
              highlights: ["MEDIUM sufficiency (26 closed rows, 30d)"],
              blockers: [],
            },
            ml: {
              score: 72,
              status: "at_risk",
              highlights: ["3 ONNX models loaded"],
              blockers: ["weight_bandit_not_ready"],
            },
            synergy: {
              score: 74,
              status: "at_risk",
              highlights: ["Swarm uplift vs ONNX baseline: +3.00 avg PnL"],
              blockers: ["causal_sample_depth_below_12"],
            },
          },
          metrics: {
            recursion: {
              sufficiencyGrade: "MEDIUM",
              sufficiencySampleCount: 26,
              blockingTaskCount: 1,
              allocatorStage: "recommendation",
              allocatorMode: "recommendation",
            },
            ml: {
              modelsLoaded: ["signalQuality", "positionSizing", "tpOptimizer"],
              modelCount: 3,
              signalQualityThreshold: 0.58,
              completeTrades30d: 42,
              avoidedDecisions30d: 17,
              banditReady: false,
              banditTradesProcessed: 128,
              readinessReasons: ["missing_expected_model_files"],
              missingModelFiles: ["sl_optimizer.onnx"],
              modelsDir: ".elizadb/vince-paper-bot/models",
              onnxRuntimeAvailable: true,
              lastLoadError: null,
              banditInitError: null,
            },
            synergy: {
              upliftDelta: 3,
              causalPromotionEligible: true,
              causalConfidenceScore: 72,
              causalPairCount: 1,
              minSamplesPerArm: 10,
              promotionReasons: ["all_pairs_passed"],
              causalPairs: [
                {
                  label: "onnx_vs_swarm",
                  controlStage: "onnx_enabled",
                  treatmentStage: "onnx_plus_swarm",
                  controlCount: 18,
                  treatmentCount: 20,
                  upliftDelta: 0.03,
                  ciLower: 0.01,
                  ciUpper: 0.06,
                  confidenceScore: 72,
                  passed: true,
                },
              ],
            },
          },
          northStar: {
            fullRecursionReady: false,
            onePlusOneEqThreeReady: false,
            why: ["Recursive loop still has blockers before full autonomy."],
          },
          milestones: {
            recursion3d: {
              pass: false,
              observedPoints: 3,
              target: "No recursion blockers and recursion score >= 75 for 3d",
            },
            ml3d: {
              pass: false,
              observedPoints: 3,
              target: "No ML blockers and ML score >= 70 for 3d",
            },
            synergy7d: {
              pass: false,
              observedPoints: 4,
              target: "1+1=3 ready and synergy score >= 75 for 7d",
            },
          },
          trend: {
            windows: [
              {
                windowDays: 7,
                overallScore: 70,
                recursionScore: 68,
                mlScore: 73,
                synergyScore: 69,
              },
              {
                windowDays: 30,
                overallScore: 78,
                recursionScore: 80,
                mlScore: 72,
                synergyScore: 74,
              },
            ],
            deltaVs7d: 8,
            history: [
              {
                at: Date.now() - 3 * 24 * 60 * 60 * 1000,
                overallScore: 66,
                recursionScore: 64,
                mlScore: 70,
                synergyScore: 65,
              },
              {
                at: Date.now() - 2 * 24 * 60 * 60 * 1000,
                overallScore: 70,
                recursionScore: 68,
                mlScore: 71,
                synergyScore: 69,
              },
              {
                at: Date.now() - 24 * 60 * 60 * 1000,
                overallScore: 74,
                recursionScore: 73,
                mlScore: 72,
                synergyScore: 70,
              },
              {
                at: Date.now(),
                overallScore: 78,
                recursionScore: 80,
                mlScore: 72,
                synergyScore: 74,
              },
            ],
          },
          lastUpdated: Date.now(),
        }}
      />,
    );

    expect(html).toContain("Recursive North Star score: 78");
    expect(html).toContain("1+1=3 Synergy");
    expect(html).toContain("What is blocking proof");
    expect(html).toContain("Score Trend (7d vs 30d)");
    expect(html).toContain("Rolling overall history");
    expect(html).toContain("Overall");
    expect(html).toContain("Recursion");
    expect(html).toContain("↑8");
    expect(html).toContain("↓1");
    expect(html).toContain("improving");
    expect(html).toContain("weakening");
    expect(html).toContain("causal_sample_depth_below_12");
    expect(html).toContain("weight_bandit_not_ready");
    expect(html).toContain("Milestone Gates");
    expect(html).toContain("ML Readiness Diagnostics");
    expect(html).toContain("Causal Pair Drilldown");
    expect(html).toContain("Operator Unblock Checklist");
    expect(html).toContain("Copy runbook command");
    expect(html).toContain("Copy weekly review command");
    expect(html).toContain("Last weekly snapshot:");
    expect(html).toContain("Snapshot freshness thresholds:");
    expect(html).toContain("fresh");
    expect(html).toContain("stage onnx_enabled: deficit 7");
    expect(html).toContain("missing_expected_model_files");
    expect(html).toContain("onnx_vs_swarm");
  });
});
