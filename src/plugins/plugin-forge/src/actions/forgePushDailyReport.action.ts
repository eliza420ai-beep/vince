/**
 * FORGE_PUSH_DAILY_REPORT — generate and push Forge daily summary now.
 *
 * Usage:
 * - "forge push daily"
 * - "forge push daily report now"
 * - "push forge report now"
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  buildForgeDailyReport,
  pushForgeDailySummaryToRooms,
  writeForgeDailyReportFile,
} from "../tasks/forgeDailyReport.tasks.ts";

export const forgePushDailyReportAction: Action = {
  name: "FORGE_PUSH_DAILY_REPORT",
  similes: [
    "FORGE_PUSH_NOW",
    "FORGE_DAILY_PUSH",
    "FORGE_PUSH_DAILY",
    "FORGE_REPORT_PUSH_NOW",
  ],
  description:
    "Generate Forge daily report and push summary immediately to forge/ops channels.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();
    const mentionsForge = text.includes("forge");
    const asksPush = text.includes("push") || text.includes("send");
    const asksDaily = text.includes("daily") || text.includes("report");
    const asksNow = text.includes("now") || text.includes("immediately");
    return mentionsForge && asksPush && asksDaily && asksNow;
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
        text: "Forge is disabled. Set FORGE_ENABLED=true to enable pushes.",
        actions: ["FORGE_PUSH_DAILY_REPORT"],
      });
      return;
    }

    try {
      const report = buildForgeDailyReport();
      writeForgeDailyReportFile(report);
      const sent = await pushForgeDailySummaryToRooms(runtime, report.summary);
      const text = [
        `Forge daily report generated: ${report.reportPath.replace(`${process.cwd()}/`, "")}`,
        `Summary pushed to ${sent} room(s).`,
        `Preview: ${report.summary}`,
      ].join("\n");

      logger.info(
        `[ForgePushDaily] pushed now | rooms=${sent} path=${report.reportPath}`,
      );

      await callback?.({
        thought: "Generate and push daily Forge summary immediately.",
        text,
        actions: ["FORGE_PUSH_DAILY_REPORT"],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[ForgePushDaily] failed: ${msg}`);
      await callback?.({
        thought: "Forge daily push failed.",
        text: `Forge daily push failed: ${msg}`,
        actions: ["FORGE_PUSH_DAILY_REPORT"],
      });
    }
  },

  examples: [
    [
      { name: "user", content: { text: "forge push daily report now" } },
      {
        name: "Forge",
        content: {
          text: "Forge daily report generated ... Summary pushed to N room(s).",
          actions: ["FORGE_PUSH_DAILY_REPORT"],
        },
      },
    ],
  ],
};
