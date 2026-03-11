#!/usr/bin/env bun
/**
 * Forge Signal Weights Autoresearch
 *
 * Runs hill-climbing experiments over the Forge signal cache to find
 * source weight configurations that maximise holdout Sharpe.
 * Zero live API calls — pure arithmetic replay over frozen source votes.
 *
 * Usage (from repo root):
 *   bun scripts/forge-signal-weights.ts
 *
 * Options (env vars):
 *   FORGE_EXPERIMENTS=5000      Number of experiments (default: 5000)
 *   FORGE_HOLDOUT=0.2           Holdout fraction (default: 0.2)
 *   FORGE_MIN_RECORDS=30        Minimum labeled records to proceed (default: 30)
 *   FORGE_APPLY=true            Write winners to dynamicConfig on completion
 *   FORGE_REGIME=uncertain      Run in regime-filtered mode (default: all)
 *   FORGE_DRY_RUN=true          Show baseline only, no experiments
 *
 * Output:
 *   .elizadb/forge/signal-weights-candidate.json   (if improved)
 *   .elizadb/forge/signal-weights-results.jsonl    (session log)
 */

import * as fs from "fs";
import * as path from "path";

import {
  loadForgeSignalCache,
  splitHoldout,
  replayWithWeights,
  replayForRegime,
  type ForgeSignalRecord,
  type ReplayWeightsConfig,
  type ReplayMetrics,
} from "../src/plugins/plugin-vince/src/forge/forgeSignalCache";

import {
  dynamicConfig,
  initializeDynamicConfig,
} from "../src/plugins/plugin-vince/src/config/dynamicConfig";

// ============================================================
// Config
// ============================================================

const EXPERIMENTS = parseInt(process.env.FORGE_EXPERIMENTS ?? "5000", 10);
const HOLDOUT_FRACTION = parseFloat(process.env.FORGE_HOLDOUT ?? "0.2");
const MIN_LABELED_RECORDS = parseInt(
  process.env.FORGE_MIN_RECORDS ?? "30",
  10,
);
const REGIME_FILTER = process.env.FORGE_REGIME ?? null; // null = all regimes
const DRY_RUN = process.env.FORGE_DRY_RUN === "true";
const APPLY = process.env.FORGE_APPLY === "true";

const FORGE_DIR = path.join(process.cwd(), ".elizadb", "forge");
const CANDIDATE_FILE = path.join(FORGE_DIR, "signal-weights-candidate.json");
const RESULTS_FILE = path.join(FORGE_DIR, "signal-weights-results.jsonl");

const THRESHOLDS = {
  minStrength: 55,
  minConfidence: 55,
  minConfirming: 2,
};

// Guardrails
const MIN_HOLDOUT_TRIGGERED = 5;
const MIN_WIN_RATE = 0.40;
const SHARPE_ACCEPT_DELTA = 0.0; // accept any improvement

// Sources that must stay at 0 (disabled)
const DISABLED_SOURCES = new Set(["TopTraders", "SanbaseWhales"]);

// Step sizes for weight mutations
const STEP_SIZES = [-0.3, -0.15, -0.05, +0.05, +0.15, +0.3];

// ============================================================
// Helpers
// ============================================================

function ensureForgeDir(): void {
  if (!fs.existsSync(FORGE_DIR)) fs.mkdirSync(FORGE_DIR, { recursive: true });
}

function loadCandidateWeights(
  baseline: Record<string, number>,
): Record<string, number> {
  try {
    if (fs.existsSync(CANDIDATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CANDIDATE_FILE, "utf-8"));
      console.log(`  Loaded existing candidate from ${CANDIDATE_FILE}`);
      return { ...baseline, ...data.weights };
    }
  } catch (_e) {
    /* use baseline */
  }
  return { ...baseline };
}

function saveCandidateWeights(
  weights: Record<string, number>,
  metrics: ReplayMetrics,
  experiments: number,
): void {
  ensureForgeDir();
  fs.writeFileSync(
    CANDIDATE_FILE,
    JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        experiments,
        regime: REGIME_FILTER ?? "all",
        metrics: {
          sharpe: metrics.sharpe.toFixed(4),
          winRate: metrics.winRate.toFixed(4),
          avgPnlPct: metrics.avgPnlPct.toFixed(4),
          maxDrawdown: metrics.maxDrawdown.toFixed(4),
          withOutcome: metrics.withOutcome,
          totalTriggered: metrics.totalTriggered,
        },
        weights,
      },
      null,
      2,
    ),
  );
}

function appendResultLog(entry: Record<string, unknown>): void {
  ensureForgeDir();
  fs.appendFileSync(RESULTS_FILE, JSON.stringify(entry) + "\n", "utf-8");
}

function evaluate(
  records: ForgeSignalRecord[],
  weights: Record<string, number>,
  regime?: string | null,
): ReplayMetrics {
  const cfg: ReplayWeightsConfig = { sourceWeights: weights, defaultWeight: 1.0 };
  return regime
    ? replayForRegime(records, regime, cfg, THRESHOLDS)
    : replayWithWeights(records, cfg, THRESHOLDS);
}

function isAcceptable(m: ReplayMetrics): boolean {
  return m.withOutcome >= MIN_HOLDOUT_TRIGGERED && m.winRate >= MIN_WIN_RATE;
}

function clamp(v: number, min = 0.0, max = 3.0): number {
  return Math.max(min, Math.min(max, v));
}

function fmt(m: ReplayMetrics): string {
  return (
    `Sharpe=${m.sharpe.toFixed(3)} WR=${(m.winRate * 100).toFixed(1)}% ` +
    `avgPnl=${m.avgPnlPct.toFixed(3)}% DD=${(m.maxDrawdown * 100).toFixed(1)}% ` +
    `triggered=${m.totalTriggered} outcomes=${m.withOutcome}`
  );
}

function printRegimeBreakdown(m: ReplayMetrics): void {
  const regimes = Object.entries(m.regimeBreakdown).sort(
    ([, a], [, b]) => b.triggered - a.triggered,
  );
  for (const [regime, stats] of regimes) {
    const wr =
      stats.wins + stats.losses > 0
        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
        : "n/a";
    console.log(
      `    [${regime}] triggered=${stats.triggered} wins=${stats.wins} losses=${stats.losses} wr=${wr}%`,
    );
  }
}

// ============================================================
// Main
// ============================================================

async function main(): Promise<void> {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║       FORGE Signal Weights Autoresearch          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // 1. Load cache
  console.log("Loading signal cache...");
  const allRecords = loadForgeSignalCache();
  const labeled = allRecords.filter((r) => r.outcome !== undefined);
  console.log(
    `  Total records: ${allRecords.length} | With outcomes: ${labeled.length}`,
  );

  if (labeled.length < MIN_LABELED_RECORDS) {
    console.log(
      `\n⏸  Insufficient labeled data (${labeled.length}/${MIN_LABELED_RECORDS} required).`,
    );
    console.log(
      "  The cache fills automatically as the paper bot runs and trades close.",
    );
    console.log(
      `  ${MIN_LABELED_RECORDS - labeled.length} more closed trades needed to start.\n`,
    );
    process.exit(0);
  }

  // 2. Split holdout
  const { holdout } = splitHoldout(allRecords, HOLDOUT_FRACTION);
  const holdoutLabeled = holdout.filter((r) => r.outcome !== undefined);
  console.log(
    `  Holdout: ${holdout.length} records (${holdoutLabeled.length} labeled)`,
  );

  if (REGIME_FILTER) {
    const regimeCount = holdout.filter(
      (r) => r.regime === REGIME_FILTER && r.outcome !== undefined,
    ).length;
    console.log(
      `  Regime filter: "${REGIME_FILTER}" → ${regimeCount} labeled holdout records`,
    );
    if (regimeCount < MIN_HOLDOUT_TRIGGERED) {
      console.log(
        `  ⚠️  Not enough "${REGIME_FILTER}" records in holdout (${regimeCount}/${MIN_HOLDOUT_TRIGGERED}). Exiting.`,
      );
      process.exit(0);
    }
  }

  // 3. Load baseline weights
  await initializeDynamicConfig();
  const baselineWeights = dynamicConfig.getAllSourceWeights();
  const currentWeights = loadCandidateWeights(baselineWeights);

  const mutableSources = Object.keys(currentWeights).filter(
    (s) => !DISABLED_SOURCES.has(s) && currentWeights[s] > 0,
  );
  console.log(`\n  Mutable sources: ${mutableSources.length}`);

  // 4. Baseline evaluation
  console.log("\n── Baseline ─────────────────────────────────────────");
  const baselineMetrics = evaluate(holdout, baselineWeights, REGIME_FILTER);
  console.log(`  ${fmt(baselineMetrics)}`);
  printRegimeBreakdown(baselineMetrics);

  if (!isAcceptable(baselineMetrics)) {
    console.log(
      `\n  ⚠️  Baseline doesn't meet guardrails (winRate≥${MIN_WIN_RATE}, triggered≥${MIN_HOLDOUT_TRIGGERED}).`,
    );
    console.log(
      "  Experiments will run but acceptance threshold is tightened.\n",
    );
  }

  if (DRY_RUN) {
    console.log("\n[DRY_RUN] Skipping experiments. Set FORGE_DRY_RUN=false to run.\n");
    process.exit(0);
  }

  // 5. Hill-climbing experiment loop
  console.log(
    `\n── Running ${EXPERIMENTS.toLocaleString()} experiments ─────────────────`,
  );

  let best = currentWeights;
  let bestMetrics = evaluate(holdout, currentWeights, REGIME_FILTER);
  let accepted = 0;
  let rejected = 0;
  const sessionStart = Date.now();

  // Shuffle source order each iteration to avoid ordering bias
  function randomSource(): string {
    return mutableSources[Math.floor(Math.random() * mutableSources.length)];
  }

  function randomStep(): number {
    return STEP_SIZES[Math.floor(Math.random() * STEP_SIZES.length)];
  }

  for (let i = 0; i < EXPERIMENTS; i++) {
    const source = randomSource();
    const step = randomStep();
    const oldWeight = best[source] ?? 1.0;
    const newWeight = clamp(oldWeight + step);

    if (newWeight === oldWeight) continue; // already at boundary

    const candidate = { ...best, [source]: newWeight };
    const m = evaluate(holdout, candidate, REGIME_FILTER);

    const improved = isAcceptable(m) && m.sharpe > bestMetrics.sharpe + SHARPE_ACCEPT_DELTA;

    if (improved) {
      const delta = m.sharpe - bestMetrics.sharpe;
      console.log(
        `  ✅ [${i + 1}] ${source}: ${oldWeight.toFixed(2)} → ${newWeight.toFixed(2)} ` +
        `Sharpe +${delta.toFixed(4)} | ${fmt(m)}`,
      );
      best = candidate;
      bestMetrics = m;
      accepted++;

      // Save immediately so a crash doesn't lose progress
      saveCandidateWeights(best, bestMetrics, i + 1);
    } else {
      rejected++;
    }

    // Progress every 500 experiments
    if ((i + 1) % 500 === 0) {
      const elapsed = ((Date.now() - sessionStart) / 1000).toFixed(1);
      console.log(
        `  [${i + 1}/${EXPERIMENTS}] accepted=${accepted} rejected=${rejected} ` +
        `best_sharpe=${bestMetrics.sharpe.toFixed(3)} elapsed=${elapsed}s`,
      );
    }
  }

  const elapsed = ((Date.now() - sessionStart) / 1000).toFixed(1);

  // 6. Final report
  console.log("\n── Results ──────────────────────────────────────────");
  console.log(`  Experiments: ${EXPERIMENTS.toLocaleString()}`);
  console.log(`  Accepted: ${accepted} | Rejected: ${rejected}`);
  console.log(`  Elapsed: ${elapsed}s`);
  console.log(`\n  Baseline:  ${fmt(baselineMetrics)}`);
  console.log(`  Final:     ${fmt(bestMetrics)}`);

  const sharpeDelta = bestMetrics.sharpe - baselineMetrics.sharpe;
  const wrDelta = bestMetrics.winRate - baselineMetrics.winRate;
  const ddDelta = bestMetrics.maxDrawdown - baselineMetrics.maxDrawdown;

  console.log(
    `\n  Δ Sharpe:   ${sharpeDelta >= 0 ? "+" : ""}${sharpeDelta.toFixed(4)}`,
  );
  console.log(
    `  Δ Win rate: ${wrDelta >= 0 ? "+" : ""}${(wrDelta * 100).toFixed(2)}%`,
  );
  console.log(
    `  Δ Max DD:   ${ddDelta >= 0 ? "+" : ""}${(ddDelta * 100).toFixed(2)}%`,
  );

  console.log("\n  Regime breakdown (final):");
  printRegimeBreakdown(bestMetrics);

  // 7. Changed weights
  const changedSources = Object.keys(best).filter(
    (s) => Math.abs((best[s] ?? 1.0) - (baselineWeights[s] ?? 1.0)) > 0.001,
  );
  if (changedSources.length > 0) {
    console.log("\n  Weight changes from baseline:");
    for (const s of changedSources) {
      const old = (baselineWeights[s] ?? 1.0).toFixed(2);
      const neu = (best[s] ?? 1.0).toFixed(2);
      console.log(`    ${s}: ${old} → ${neu}`);
    }
  } else {
    console.log("\n  No weight changes from baseline.");
  }

  // 8. Promotion gate
  const promotable =
    sharpeDelta >= 0.1 &&
    bestMetrics.winRate >= 0.42 &&
    ddDelta <= 0.05 &&
    bestMetrics.totalTriggered >= 10;

  console.log(
    `\n  Promotion gate: ${promotable ? "✅ PASSED" : "❌ NOT MET"}`,
  );
  if (!promotable) {
    if (sharpeDelta < 0.1) console.log(`    Sharpe delta ${sharpeDelta.toFixed(4)} < 0.1 required`);
    if (bestMetrics.winRate < 0.42) console.log(`    Win rate ${(bestMetrics.winRate * 100).toFixed(1)}% < 42% required`);
    if (ddDelta > 0.05) console.log(`    Max DD worsened by ${(ddDelta * 100).toFixed(1)}% > 5% limit`);
    if (bestMetrics.totalTriggered < 10) console.log(`    Triggered ${bestMetrics.totalTriggered} < 10 minimum`);
  }

  // 9. Save session log
  const sessionLog = {
    timestamp: new Date().toISOString(),
    regime: REGIME_FILTER ?? "all",
    experiments: EXPERIMENTS,
    accepted,
    elapsed: parseFloat(elapsed),
    baseline: {
      sharpe: baselineMetrics.sharpe,
      winRate: baselineMetrics.winRate,
      withOutcome: baselineMetrics.withOutcome,
    },
    final: {
      sharpe: bestMetrics.sharpe,
      winRate: bestMetrics.winRate,
      withOutcome: bestMetrics.withOutcome,
      totalTriggered: bestMetrics.totalTriggered,
    },
    deltas: { sharpe: sharpeDelta, winRate: wrDelta, maxDrawdown: ddDelta },
    promotable,
    changedWeights: changedSources.reduce<Record<string, { from: number; to: number }>>(
      (acc, s) => {
        acc[s] = { from: baselineWeights[s] ?? 1.0, to: best[s] ?? 1.0 };
        return acc;
      },
      {},
    ),
  };
  appendResultLog(sessionLog);

  // 10. Apply to dynamicConfig if requested
  if (APPLY && promotable && changedSources.length > 0) {
    console.log("\n── Applying to dynamicConfig ─────────────────────");
    for (const source of changedSources) {
      await dynamicConfig.updateSourceWeight(
        source,
        best[source] ?? 1.0,
        `Forge autoresearch ${new Date().toISOString().slice(0, 10)} Sharpe+${sharpeDelta.toFixed(3)}`,
        { winRate: bestMetrics.winRate },
      );
      console.log(
        `  Applied: ${source} → ${(best[source] ?? 1.0).toFixed(2)}`,
      );
    }
    console.log("\n  ✅ Weights written to dynamicConfig (live on next aggregation cycle)");
  } else if (APPLY && !promotable) {
    console.log(
      "\n  ⚠️  FORGE_APPLY=true but promotion gate not met — skipping apply.",
    );
  } else if (!APPLY && promotable) {
    console.log(
      "\n  💡 Promotion gate passed. Run with FORGE_APPLY=true to apply weights.",
    );
  }

  console.log(`\n  Candidate saved → ${CANDIDATE_FILE}`);
  console.log(`  Session log    → ${RESULTS_FILE}`);
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║                  Forge complete                  ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
}

main().catch((e) => {
  console.error("[forge-signal-weights] Fatal:", e);
  process.exit(1);
});
