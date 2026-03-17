/**
 * Forge nightly task — overnight self-optimization run.
 *
 * Triggers at FORGE_NIGHTLY_HOUR_UTC (default 02:00 UTC) via a 1-hour polling interval.
 * After each run, pushes a Telegram summary using prompts/forge-summary.md as template.
 *
 * The task:
 * 1. Reads SOUL.md for investment thesis context
 * 2. Runs ForgeExperimentService.runNightlyExperiments()
 * 3. Formats summary using prompts/forge-summary.md template
 * 4. Pushes summary to Telegram rooms named "forge" or "ops" (FORGE_TELEGRAM_PUSH=true)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  type IAgentRuntime,
  type TargetInfo,
  type UUID,
  logger,
} from "@elizaos/core";
import { ForgeExperimentService } from "../services/forgeExperiment.service.ts";
import type { ForgeRunSummary, ForgeRuntime } from "../types/index.ts";

const REPO_ROOT = process.cwd();
const SOUL_PATH = path.join(REPO_ROOT, "knowledge", "teammate", "SOUL.md");
const SUMMARY_TEMPLATE_PATH = path.join(
  REPO_ROOT,
  "prompts",
  "forge-summary.md",
);
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;

const NIGHTLY_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

function getForgeNightlyHour(): number {
  const h = parseInt(process.env.FORGE_NIGHTLY_HOUR_UTC || "2", 10);
  return isNaN(h) || h < 0 || h > 23 ? 2 : h;
}

function isForgeTelegramPushEnabled(): boolean {
  return process.env.FORGE_TELEGRAM_PUSH !== "false";
}

function getForgeRuntime(): ForgeRuntime {
  const rt = process.env.FORGE_RUNTIME?.toLowerCase();
  return rt === "python" ? "python" : "mlx";
}

function getForgeBudgetMinutes(): number {
  const v = parseInt(process.env.FORGE_BUDGET_MINUTES || "120", 10);
  return isNaN(v) || v < 10 ? 120 : v;
}

function getForgeMaxExperiments(): number {
  const v = parseInt(process.env.FORGE_MAX_EXPERIMENTS || "10", 10);
  return isNaN(v) || v < 1 ? 10 : v;
}

function getForgeTargetMetric(): string {
  return (
    process.env.FORGE_TARGET_METRIC ||
    "causal_uplift * sharpe * (1 - brier_score)"
  );
}

/** Read SOUL.md thesis — first 500 chars for prompt context. */
function readSoulThesis(): string {
  if (!fs.existsSync(SOUL_PATH)) return "(SOUL.md not found — please update)";
  try {
    return fs.readFileSync(SOUL_PATH, "utf-8").slice(0, 500);
  } catch {
    return "(Could not read SOUL.md)";
  }
}

/** Load and fill forge-summary.md template with run data. */
function formatSummary(summary: ForgeRunSummary, soulThesis: string): string {
  let template = "";
  if (fs.existsSync(SUMMARY_TEMPLATE_PATH)) {
    try {
      // Strip the header/comments (lines starting with #) from the template
      template = fs
        .readFileSync(SUMMARY_TEMPLATE_PATH, "utf-8")
        .split("\n")
        .filter((l) => !l.startsWith("#") && !l.startsWith("# "))
        .join("\n")
        .trim();
    } catch {
      template = "";
    }
  }

  const bestWinner = summary.winners.sort(
    (a, b) => b.compositeDelta - a.compositeDelta,
  )[0];
  const worstLoser = summary.losers.sort(
    (a, b) => a.compositeDelta - b.compositeDelta,
  )[0];

  const bestExp = bestWinner
    ? `${bestWinner.config.mutation.description} (+${(bestWinner.compositeDelta * 100).toFixed(2)}%)`
    : "none";
  const worstExp = worstLoser
    ? `${worstLoser.config.mutation.description} — ${(worstLoser.gateFailures ?? [worstLoser.result.safetyGateReason ?? "below threshold"]).join("; ")}`
    : "none";

  const rejectReasonsLine =
    summary.rejectReasonCounts &&
    Object.keys(summary.rejectReasonCounts).length > 0
      ? `Reject reasons: ${Object.entries(summary.rejectReasonCounts)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")}`
      : "";

  const winnerLines = summary.winners
    .map(
      (w) =>
        `• ${w.config.mutation.description} → +${(w.compositeDelta * 100).toFixed(2)}%`,
    )
    .join("\n");

  const safetyStatus =
    summary.winners.length > 0
      ? "✓ Safety gate passed for all winners"
      : summary.safetyGateStatus === "not_reached"
        ? "⚠ Safety gate not reached (insufficient data)"
        : "✗ No winners survived safety gate";

  const deltaStr =
    summary.bestCompositeDelta > 0
      ? `+${(summary.bestCompositeDelta * 100).toFixed(2)}%`
      : `${(summary.bestCompositeDelta * 100).toFixed(2)}%`;

  // Simple token replacement
  const filled = template
    .replace("{{date}}", summary.date)
    .replace("{{experiments_run}}", String(summary.experimentsRun))
    .replace("{{winners}}", String(summary.winners.length))
    .replace("{{losers}}", String(summary.losers.length))
    .replace("{{delta_metric}}", deltaStr)
    .replace("{{best_experiment}}", bestExp)
    .replace("{{worst_experiment}}", worstExp)
    .replace("{{safety_gate_status}}", safetyStatus)
    .replace("{{reject_reasons}}", rejectReasonsLine)
    .replace("{{branch}}", summary.committedBranches.join(", ") || "none")
    .replace("{{soul_thesis}}", soulThesis.slice(0, 200));

  if (filled && filled !== template) return filled;

  // Fallback plain summary
  const lines = [
    `**Forge nightly — ${summary.date}**`,
    `${summary.experimentsRun} experiments: ${summary.winners.length} winners, ${summary.losers.length} losers`,
    deltaStr !== "+0.00%"
      ? `Best ΔComposite: ${deltaStr}`
      : "No metric improvement.",
    winnerLines ? `Winners:\n${winnerLines}` : "",
    safetyStatus,
    rejectReasonsLine,
    summary.committedBranches.length
      ? `Branches: ${summary.committedBranches.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  return lines;
}

/** Push summary to Telegram rooms named "forge" or "ops". */
async function pushSummaryToTelegram(
  runtime: IAgentRuntime,
  message: string,
): Promise<number> {
  if (!isForgeTelegramPushEnabled()) return 0;
  const isForgeChannel = (name: string) => {
    const n = (name ?? "").toLowerCase();
    return n.includes("forge") || n.includes("ops");
  };

  let sent = 0;
  try {
    const worlds = await runtime.getAllWorlds();
    for (const world of worlds) {
      const rooms = await runtime.getRooms(world.id);
      for (const room of rooms) {
        if (room.source?.toLowerCase() !== "telegram") continue;
        if (!isForgeChannel(room.name ?? "")) continue;
        try {
          await runtime.sendMessageToTarget(
            { source: "telegram", roomId: room.id } as unknown as TargetInfo,
            { text: message },
          );
          sent++;
        } catch {
          // ignore send errors
        }
      }
    }
  } catch (err) {
    logger.debug("[ForgeNightly] Could not enumerate worlds:", err);
  }
  return sent;
}

/** Register the nightly Forge task with the runtime. */
export async function registerForgeNightlyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.FORGE_ENABLED !== "false";
  if (!enabled) {
    logger.debug("[ForgeNightly] Disabled via FORGE_ENABLED=false");
    return;
  }

  const nightlyHour = getForgeNightlyHour();
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "FORGE_NIGHTLY_RUN",
    validate: async () => true,
    execute: async (rt: IAgentRuntime) => {
      if (process.env.FORGE_ENABLED === "false") return;

      logger.info("[ForgeNightly] Starting nightly experiment run...");
      const soulThesis = readSoulThesis();

      let experimentSvc: ForgeExperimentService | null = null;
      let summary: ForgeRunSummary | null = null;

      try {
        experimentSvc = await ForgeExperimentService.start(rt);
        summary = await experimentSvc.runNightlyExperiments({
          budgetMinutes: getForgeBudgetMinutes(),
          runtime: getForgeRuntime(),
          maxExperiments: getForgeMaxExperiments(),
          targetMetric: getForgeTargetMetric(),
        });
      } catch (err) {
        logger.error("[ForgeNightly] Experiment run failed:", err);
        // Push error summary to Telegram
        const errorMsg = `**Forge nightly — ${new Date().toISOString().slice(0, 10)}**\n⚠ Run failed: ${String(err).slice(0, 200)}`;
        await pushSummaryToTelegram(rt, errorMsg);
        return;
      } finally {
        await experimentSvc?.stop();
      }

      // Format and push summary
      const summaryText = formatSummary(summary, soulThesis);
      logger.info("[ForgeNightly] Run complete:\n" + summaryText);

      const pushed = await pushSummaryToTelegram(rt, summaryText);
      if (pushed > 0) {
        logger.info(
          `[ForgeNightly] Summary pushed to ${pushed} Telegram channel(s)`,
        );
      }
    },
  });

  // Check for existing task (DB may not be ready during plugin init)
  let existing: Awaited<ReturnType<IAgentRuntime["getTasksByName"]>> = [];
  try {
    existing = await runtime.getTasksByName("FORGE_NIGHTLY_RUN");
  } catch (err) {
    logger.debug(
      "[ForgeNightly] DB not ready yet, skipping task creation",
      err instanceof Error ? err.message : err,
    );
    return;
  }
  if (existing.length > 0) {
    logger.debug("[ForgeNightly] Task already registered");
    return;
  }

  await runtime.createTask({
    name: "FORGE_NIGHTLY_RUN",
    description: `Forge nightly experiment run at ${nightlyHour}:00 UTC`,
    roomId: ZERO_UUID,
    worldId: taskWorldId,
    tags: ["forge", "repeat", "nightly"],
    metadata: {
      updateInterval: NIGHTLY_INTERVAL_MS,
      updatedAt: Date.now() - NIGHTLY_INTERVAL_MS, // Trigger on first eligible hour
      nightlyHour,
    },
  });

  logger.info(
    `[ForgeNightly] Task registered — runs at ${nightlyHour}:00 UTC (FORGE_BUDGET_MINUTES=${getForgeBudgetMinutes()}, runtime=${getForgeRuntime()})`,
  );
}
