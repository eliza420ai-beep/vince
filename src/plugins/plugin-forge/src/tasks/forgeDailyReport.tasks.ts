/**
 * Forge daily report push task.
 *
 * - Computes a deterministic replay snapshot from forge signal cache
 * - Writes markdown report to docs/standup/forge-daily/YYYY-MM-DD.md
 * - Pushes one-line summary to channels named "forge" or "ops"
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import {
  loadForgeSignalCache,
  replayWithWeights,
  splitHoldout,
  type ForgeSignalRecord,
} from "../../../plugin-vince/src/forge/forgeSignalCache.ts";
import { runLowDataRemediation } from "../utils/lowDataRemediation.ts";

const REPO_ROOT = process.cwd();
const POLICY_PATH = path.join(REPO_ROOT, "policies", "trading-policy.yaml");
const CANDIDATES_PATH = path.join(
  REPO_ROOT,
  "portfolio_watchlist_candidates.json",
);
const OUT_DIR = path.join(REPO_ROOT, "docs", "standup", "forge-daily");
const TASK_NAME = "FORGE_DAILY_REPORT_PUSH";
const TASK_INTERVAL_MS = 60 * 60 * 1000; // hourly check
const MIN_HOLDOUT_OUTCOMES = 30;
const MIN_TRIGGERED_FOR_GATE = 5;

function getReportHourUtc(): number {
  const raw = Number.parseInt(
    process.env.FORGE_DAILY_REPORT_HOUR_UTC ?? "7",
    10,
  );
  if (!Number.isFinite(raw) || raw < 0 || raw > 23) return 7;
  return raw;
}

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

function parseThresholdNumber(
  raw: string,
  key: string,
  fallback: number,
): number {
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

function getBaselineWeights(
  records: ForgeSignalRecord[],
): Record<string, number> {
  const latest = [...records]
    .reverse()
    .find(
      (r) => r.weightsSnapshot && Object.keys(r.weightsSnapshot).length > 0,
    );
  return latest?.weightsSnapshot ?? {};
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function fmtSignedPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

function currentBranch(): string {
  const proc = Bun.spawnSync(["git", "branch", "--show-current"], {
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "ignore",
  });
  if (proc.exitCode !== 0) return "unknown";
  return new TextDecoder().decode(proc.stdout).trim() || "unknown";
}

function latestForgeBranch(): string {
  const proc = Bun.spawnSync(
    ["git", "branch", "--list", "forge/experiment-*"],
    {
      cwd: REPO_ROOT,
      stdout: "pipe",
      stderr: "ignore",
    },
  );
  if (proc.exitCode !== 0) return "none";
  const list = new TextDecoder().decode(proc.stdout).trim();
  if (!list) return "none";
  const branches = list
    .split("\n")
    .map((l) => l.trim().replace(/^\*\s*/, ""))
    .filter(Boolean)
    .sort();
  return branches.at(-1) ?? "none";
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** Read FD discovery PromoteNow / ResearchNext from portfolio_watchlist_candidates.json (written by weekly discovery). */
function readFdPromotableTickers(): {
  promoteNow: string[];
  researchNext: string[];
} {
  if (!fs.existsSync(CANDIDATES_PATH))
    return { promoteNow: [], researchNext: [] };
  try {
    const raw = fs.readFileSync(CANDIDATES_PATH, "utf-8");
    const data = JSON.parse(raw) as {
      promoteNow?: { ticker?: string }[];
      researchNext?: { ticker?: string }[];
    };
    const promoteNow = (data.promoteNow ?? [])
      .map((e) => e.ticker)
      .filter((t): t is string => typeof t === "string");
    const researchNext = (data.researchNext ?? [])
      .map((e) => e.ticker)
      .filter((t): t is string => typeof t === "string");
    return { promoteNow, researchNext };
  } catch {
    return { promoteNow: [], researchNext: [] };
  }
}

export function buildForgeDailyReport(): {
  markdown: string;
  summary: string;
  reportPath: string;
  lowDataGates: {
    holdoutReady: boolean;
    triggerReady: boolean;
    holdoutCount: number;
    withOutcome: number;
  };
} {
  const date = getDateStamp();
  const rawPolicy = readPolicyRaw();
  const thresholds = buildThresholds(rawPolicy);
  const hash = policyHash(rawPolicy);
  const holdoutFraction = parseHoldoutFraction();

  const all = loadForgeSignalCache().sort(
    (a, b) => a.evaluatedAt - b.evaluatedAt,
  );
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

  const fd = readFdPromotableTickers();
  const promoteNowLine =
    fd.promoteNow.length > 0 ? fd.promoteNow.join(", ") : "(none)";
  const researchNextLine =
    fd.researchNext.length > 0 ? fd.researchNext.join(", ") : "(none)";

  const reportPath = path.join(OUT_DIR, `${date}.md`);
  const markdown = [
    `# Forge Daily Report — ${date}`,
    "",
    "## Snapshot",
    `- Current branch: \`${currentBranch()}\``,
    `- Latest forge branch: \`${latestForgeBranch()}\``,
    `- Policy hash: \`${hash}\``,
    `- Holdout fraction: ${holdoutFraction}`,
    "",
    "## FD Discovery (PromoteNow / ResearchNext)",
    `- PromoteNow: ${promoteNowLine}`,
    `- ResearchNext: ${researchNextLine}`,
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
    "",
  ].join("\n");

  const summary = [
    `Forge daily ${date}`,
    `holdout ${holdout.length}/${MIN_HOLDOUT_OUTCOMES} ${holdoutReady ? "PASS" : "FAIL"}`,
    `trig ${metrics.withOutcome}/${MIN_TRIGGERED_FOR_GATE} ${triggerReady ? "PASS" : "FAIL"}`,
    `WR ${fmtPct(metrics.winRate)} ${winRateReady ? "PASS" : "FAIL"}`,
    `Sharpe ${metrics.sharpe.toFixed(2)} Brier ${metrics.brierScore.toFixed(3)}`,
    fd.promoteNow.length > 0 ? `PN ${fd.promoteNow.join(",")}` : "",
    `policy ${hash} branch ${currentBranch()}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    markdown,
    summary,
    reportPath,
    lowDataGates: {
      holdoutReady,
      triggerReady,
      holdoutCount: holdout.length,
      withOutcome: metrics.withOutcome,
    },
  };
}

function shouldTargetRoom(name: string): boolean {
  const n = (name ?? "").toLowerCase();
  return n.includes("forge") || n.includes("ops");
}

export async function pushForgeDailySummaryToRooms(
  runtime: IAgentRuntime,
  summary: string,
): Promise<number> {
  let sent = 0;
  const worlds = await runtime.getAllWorlds();
  for (const world of worlds) {
    const rooms = await runtime.getRooms(world.id);
    for (const room of rooms) {
      const source = (room.source ?? "").toLowerCase();
      if (!["telegram", "discord", "slack"].includes(source)) continue;
      if (!shouldTargetRoom(room.name ?? "")) continue;
      try {
        await runtime.sendMessageToTarget(
          {
            source: source as "telegram" | "discord" | "slack",
            roomId: room.id,
          },
          { text: summary },
        );
        sent++;
      } catch {
        // Ignore per-room send failures.
      }
    }
  }
  return sent;
}

export function writeForgeDailyReportFile(report: {
  markdown: string;
  reportPath: string;
}): void {
  ensureDir(path.dirname(report.reportPath));
  fs.writeFileSync(report.reportPath, report.markdown, "utf-8");
}

export async function registerForgeDailyReportTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.FORGE_DAILY_REPORT_ENABLED !== "false" &&
    process.env.FORGE_DAILY_REPORT_ENABLED !== "0";
  if (!enabled) {
    logger.debug(
      "[ForgeDailyReport] Disabled (FORGE_DAILY_REPORT_ENABLED=false)",
    );
    return;
  }

  const reportHour = getReportHourUtc();

  runtime.registerTaskWorker({
    name: TASK_NAME,
    validate: async () => true,
    execute: async (rt) => {
      const now = new Date();
      const hour = now.getUTCHours();
      if (hour !== reportHour) return;

      const dedupeKey = `${now.toISOString().slice(0, 10)}-${reportHour}`;
      const cacheKey = "forge:daily-report:last";
      const last = await rt.getCache<string>(cacheKey);
      if (last === dedupeKey) return;

      const report = buildForgeDailyReport();
      writeForgeDailyReportFile(report);

      if (
        report.lowDataGates &&
        (!report.lowDataGates.holdoutReady || !report.lowDataGates.triggerReady)
      ) {
        await runLowDataRemediation(rt, {
          holdoutCount: report.lowDataGates.holdoutCount,
          withOutcome: report.lowDataGates.withOutcome,
          reason: "daily gate fail",
        });
      }

      const sent = await pushForgeDailySummaryToRooms(rt, report.summary);
      await rt.setCache(cacheKey, dedupeKey);

      logger.info(
        `[ForgeDailyReport] wrote ${path.relative(REPO_ROOT, report.reportPath)} | pushed to ${sent} room(s)`,
      );
      if (sent === 0) {
        logger.debug(
          "[ForgeDailyReport] No rooms matched (name includes forge/ops, source in telegram|discord|slack)",
        );
      }
    },
  });

  let existing: Awaited<ReturnType<IAgentRuntime["getTasksByName"]>> = [];
  try {
    existing = await runtime.getTasksByName(TASK_NAME);
  } catch (err) {
    logger.debug(
      "[ForgeDailyReport] DB not ready yet, skipping task creation",
      err instanceof Error ? err.message : err,
    );
    return;
  }
  if (existing.length > 0) {
    logger.debug("[ForgeDailyReport] Task already registered");
    return;
  }

  const taskWorldId = runtime.agentId as UUID;
  await runtime.createTask({
    name: TASK_NAME,
    description:
      "Generate/push Forge daily summary to forge/ops channels and write markdown report",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["forge", "daily-report", "repeat"],
    metadata: {
      updateInterval: TASK_INTERVAL_MS,
      updatedAt: Date.now(),
      reportHour,
    },
  });

  logger.info(
    `[ForgeDailyReport] Task registered — runs at ${reportHour}:00 UTC (hourly poll)`,
  );
}
