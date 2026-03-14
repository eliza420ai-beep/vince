#!/usr/bin/env bun

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import {
  loadForgeSignalCache,
  replayWithWeights,
  splitHoldout,
  type ForgeSignalRecord,
} from "../src/plugins/plugin-vince/src/forge/forgeSignalCache";

const REPO_ROOT = process.cwd();
const POLICY_PATH = path.join(REPO_ROOT, "policies", "trading-policy.yaml");
const OUT_DIR = path.join(REPO_ROOT, "docs", "standup", "forge-daily");
const MIN_HOLDOUT_OUTCOMES = 30;
const MIN_TRIGGERED_FOR_GATE = 5;

function parseHoldoutFraction(): number {
  const raw = Number(process.env.FORGE_HOLDOUT_FRACTION ?? "0.2");
  if (!Number.isFinite(raw) || raw <= 0.05 || raw >= 0.5) return 0.2;
  return raw;
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function readPolicyRaw(): string {
  if (!fs.existsSync(POLICY_PATH)) return "";
  return fs.readFileSync(POLICY_PATH, "utf-8");
}

function policyHash(raw: string): string {
  if (!raw) return "missing";
  return createHash("sha256").update(raw, "utf-8").digest("hex").slice(0, 12);
}

function parseThresholdNumber(raw: string, key: string, fallback: number): number {
  const m = raw.match(new RegExp(`\\b${key}:\\s*([0-9.]+)`, "m"));
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function buildThresholds(raw: string): {
  minStrength: number;
  minConfidence: number;
  minConfirming: number;
} {
  return {
    minStrength: parseThresholdNumber(raw, "min_strength", 55),
    minConfidence: parseThresholdNumber(raw, "min_confidence", 55),
    minConfirming: parseThresholdNumber(raw, "min_confirming_signals", 2),
  };
}

function getBaselineWeights(records: ForgeSignalRecord[]): Record<string, number> {
  const latest = [...records]
    .reverse()
    .find((r) => r.weightsSnapshot && Object.keys(r.weightsSnapshot).length > 0);
  return latest?.weightsSnapshot ?? {};
}

function countByRegime(records: ForgeSignalRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    out[r.regime ?? "unknown"] = (out[r.regime ?? "unknown"] ?? 0) + 1;
  }
  return out;
}

function recentClosed(records: ForgeSignalRecord[], hours = 24): ForgeSignalRecord[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return records.filter(
    (r) =>
      r.evaluatedAt >= cutoff &&
      r.outcome !== undefined &&
      typeof r.pnlPct === "number",
  );
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function fmtSignedPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function runGit(args: string[]): string {
  const proc = Bun.spawnSync(["git", ...args], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "ignore",
  });
  if (proc.exitCode !== 0) return "";
  return new TextDecoder().decode(proc.stdout).trim();
}

function latestForgeBranch(): string {
  const list = runGit(["branch", "--list", "forge/experiment-*"]);
  if (!list) return "none";
  const branches = list
    .split("\n")
    .map((l) => l.trim().replace(/^\*\s*/, ""))
    .filter(Boolean)
    .sort();
  return branches.at(-1) ?? "none";
}

function currentBranch(): string {
  return runGit(["branch", "--show-current"]) || "unknown";
}

function makeReport(): { markdown: string; discord: string; outputPath: string } {
  const date = getDateStamp();
  const rawPolicy = readPolicyRaw();
  const thresholds = buildThresholds(rawPolicy);
  const hash = policyHash(rawPolicy);
  const holdoutFraction = parseHoldoutFraction();

  const all = loadForgeSignalCache().sort((a, b) => a.evaluatedAt - b.evaluatedAt);
  const labeled = all.filter(
    (r) => r.outcome !== undefined && typeof r.pnlPct === "number",
  );
  const { holdout } = splitHoldout(labeled, holdoutFraction);
  const baselineWeights = getBaselineWeights(all);
  const metrics = replayWithWeights(
    holdout,
    { sourceWeights: baselineWeights, defaultWeight: 1.0 },
    thresholds,
  );

  const holdoutReady = holdout.length >= MIN_HOLDOUT_OUTCOMES;
  const triggerReady = metrics.withOutcome >= MIN_TRIGGERED_FOR_GATE;
  const winRateReady = metrics.winRate >= 0.45;
  const safetyPass = holdoutReady && triggerReady && winRateReady;

  const byRegime = countByRegime(holdout);
  const regimeLine = Object.entries(byRegime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");

  const recent = recentClosed(labeled, 24);
  const recentWins = recent.filter((r) => r.outcome === "win").length;
  const recentLoss = recent.filter((r) => r.outcome === "loss").length;

  const branchNow = currentBranch();
  const branchLatest = latestForgeBranch();
  const reportPath = path.join(OUT_DIR, `${date}.md`);

  const markdown = [
    `# Forge Daily Report — ${date}`,
    "",
    "## Snapshot",
    `- Current branch: \`${branchNow}\``,
    `- Latest forge branch: \`${branchLatest}\``,
    `- Policy hash: \`${hash}\``,
    `- Holdout fraction: ${holdoutFraction}`,
    "",
    "## Replay Baseline",
    `- Cache records: ${all.length} total, ${labeled.length} labeled`,
    `- Holdout labeled: ${holdout.length} (gate: >= ${MIN_HOLDOUT_OUTCOMES})`,
    `- Triggered with outcomes: ${metrics.withOutcome} (gate: >= ${MIN_TRIGGERED_FOR_GATE})`,
    `- Win rate: ${fmtPct(metrics.winRate)} (gate: >= 45.00%)`,
    `- Sharpe: ${metrics.sharpe.toFixed(3)}`,
    `- Brier score: ${metrics.brierScore.toFixed(3)}`,
    `- Avg pnl: ${fmtSignedPct(metrics.avgPnlPct / 100)}`,
    `- Max drawdown: ${fmtPct(metrics.maxDrawdown)}`,
    "",
    "## Gate Status",
    `- Holdout data gate: ${holdoutReady ? "PASS" : "FAIL"}`,
    `- Trigger-count gate: ${triggerReady ? "PASS" : "FAIL"}`,
    `- Win-rate gate: ${winRateReady ? "PASS" : "FAIL"}`,
    `- Overall safety baseline: ${safetyPass ? "PASS" : "FAIL"}`,
    "",
    "## Regime Mix (Holdout)",
    `- ${regimeLine || "n/a"}`,
    "",
    "## Last 24h Labeled Outcomes",
    `- Closed outcomes: ${recent.length} (${recentWins}W / ${recentLoss}L)`,
    "",
    "## Thresholds Used",
    `- min_strength=${thresholds.minStrength}`,
    `- min_confidence=${thresholds.minConfidence}`,
    `- min_confirming_signals=${thresholds.minConfirming}`,
    "",
  ].join("\n");

  const discord = [
    `Forge daily ${date} | holdout ${holdout.length}/${MIN_HOLDOUT_OUTCOMES} ${holdoutReady ? "PASS" : "FAIL"}`,
    `trig ${metrics.withOutcome}/${MIN_TRIGGERED_FOR_GATE} ${triggerReady ? "PASS" : "FAIL"}`,
    `WR ${fmtPct(metrics.winRate)} ${winRateReady ? "PASS" : "FAIL"}`,
    `Sharpe ${metrics.sharpe.toFixed(2)} Brier ${metrics.brierScore.toFixed(3)}`,
    `policy ${hash} branch ${branchNow}`,
  ].join(" | ");

  return { markdown, discord, outputPath: reportPath };
}

function main(): void {
  const report = makeReport();
  ensureDir(path.dirname(report.outputPath));
  fs.writeFileSync(report.outputPath, report.markdown, "utf-8");
  console.log(`[forge-daily-report] wrote ${path.relative(REPO_ROOT, report.outputPath)}`);
  console.log(`[forge-daily-report] discord: ${report.discord}`);
}

main();
