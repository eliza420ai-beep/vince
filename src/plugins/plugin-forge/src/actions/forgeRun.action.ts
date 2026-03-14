/**
 * FORGE_RUN — Trigger a Forge experiment run on demand.
 *
 * Usage: "forge run", "run forge", "@Forge run now"
 * Runs a single experiment cycle (respects budget).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { ForgeExperimentService } from "../services/forgeExperiment.service.ts";

export const forgeRunAction: Action = {
  name: "FORGE_RUN",
  similes: [
    "RUN_FORGE",
    "FORGE_START",
    "START_FORGE",
    "TRIGGER_FORGE",
    "FORGE_EXPERIMENT",
    "RUN_EXPERIMENT",
  ],
  description:
    "Trigger a Forge autoresearch run: mutate policy thresholds, evaluate against paper-bot replay, commit winners.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();
    return (
      (text.includes("forge") || text.includes("experiment")) &&
      (text.includes("run") ||
        text.includes("start") ||
        text.includes("trigger") ||
        text.includes("go"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
  ) => {
    const enabled = process.env.FORGE_ENABLED !== "false";
    if (!enabled) {
      await callback?.({
        thought: "Forge is disabled via FORGE_ENABLED=false.",
        text: "Forge is disabled. Set FORGE_ENABLED=true to enable autoresearch.",
        actions: ["FORGE_RUN"],
      });
      return;
    }

    const budgetMinutes = parseInt(
      process.env.FORGE_BUDGET_MINUTES || "120",
      10,
    );
    const runtime_type = (
      process.env.FORGE_RUNTIME?.toLowerCase() === "python" ? "python" : "mlx"
    ) as "mlx" | "python";
    const maxExperiments = parseInt(
      process.env.FORGE_MAX_EXPERIMENTS || "10",
      10,
    );
    const targetMetric =
      process.env.FORGE_TARGET_METRIC ||
      "causal_uplift * sharpe * (1 - brier_score)";

    await callback?.({
      thought: "Starting a Forge experiment run on demand.",
      text: `Starting Forge run. Runtime: ${runtime_type}. Budget: ${budgetMinutes}min. Max experiments: ${maxExperiments}.\n\nThis will run in the background. Check back for results.`,
      actions: ["FORGE_RUN"],
    });

    // Run asynchronously
    setImmediate(async () => {
      let svc: ForgeExperimentService | null = null;
      try {
        svc = await ForgeExperimentService.start(runtime);
        const summary = await svc.runNightlyExperiments({
          budgetMinutes,
          runtime: runtime_type,
          maxExperiments,
          targetMetric,
        });

        const deltaStr =
          summary.bestCompositeDelta > 0
            ? `+${(summary.bestCompositeDelta * 100).toFixed(2)}%`
            : `${(summary.bestCompositeDelta * 100).toFixed(2)}%`;

        const rejectLine =
          summary.rejectReasonCounts &&
          Object.keys(summary.rejectReasonCounts).length > 0
            ? `Reject reasons: ${Object.entries(summary.rejectReasonCounts)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}`
            : "";
        const loserReasons =
          summary.losers.length > 0
            ? summary.losers
                .slice(0, 3)
                .map(
                  (l) =>
                    `• ${l.config.mutation.description}: ${(l.gateFailures ?? [l.result.safetyGateReason ?? "below threshold"]).join("; ")}`,
                )
                .join("\n")
            : "";
        const resultText = [
          `**Forge run complete — ${summary.date}**`,
          `${summary.experimentsRun} experiments: ${summary.winners.length} winners, ${summary.losers.length} losers`,
          summary.winners.length > 0
            ? `Best ΔComposite: ${deltaStr}\nWinners:\n${summary.winners.map((w) => `• ${w.config.mutation.description} → ${(w.compositeDelta * 100).toFixed(2)}%`).join("\n")}`
            : "No winners (all below +0.5% threshold or safety gate failed).",
          rejectLine,
          loserReasons ? `Loser reasons (sample):\n${loserReasons}` : "",
          summary.committedBranches.length
            ? `Committed to: ${summary.committedBranches.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        logger.info("[ForgeRun] On-demand run complete:\n" + resultText);
        const lastRunPath = path.join(
          process.cwd(),
          ".elizadb",
          "forge",
          "last-run.json",
        );
        try {
          fs.mkdirSync(path.dirname(lastRunPath), { recursive: true });
          fs.writeFileSync(
            lastRunPath,
            JSON.stringify({
              date: summary.date,
              rejectReasonCounts: summary.rejectReasonCounts,
              rejectReasonsSummary: rejectLine || undefined,
              writtenAt: new Date().toISOString(),
            }),
            "utf-8",
          );
        } catch {
          // non-fatal
        }
      } catch (err) {
        logger.error("[ForgeRun] On-demand run failed:", err);
      } finally {
        await svc?.stop();
      }
    });
  },

  examples: [
    [
      { name: "user", content: { text: "forge run" } },
      {
        name: "Forge",
        content: {
          text: "Starting Forge run. Runtime: mlx. Budget: 120min. Max experiments: 10.",
          actions: ["FORGE_RUN"],
        },
      },
    ],
    [
      { name: "user", content: { text: "trigger a forge experiment now" } },
      {
        name: "Forge",
        content: {
          text: "Starting Forge run. This will run in the background.",
          actions: ["FORGE_RUN"],
        },
      },
    ],
  ],
};
