/**
 * Plugin Inter-Agent — Multi-agent coordination for VINCE.
 *
 * Actions:
 * - ASK_AGENT: Ask another agent (Vince, Kelly, Solus, Sentinel, Eliza, Otaku) and relay the answer.
 * - STANDUP_FACILITATE: Kelly kicks off / wraps up standup; round-robin reports; Day Report + action items.
 * - DAILY_REPORT: On-demand daily report (standup-style synthesis).
 *
 * Standup (STANDUP_ENABLED=true): Kelly coordinates; turn order VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel.
 * Day Report is generated from transcript (TL;DR, essential question, signals, WHAT/HOW/WHY/OWNER table).
 * Action items from the report are stored in standup-deliverables/action-items.json, prioritized by a planner,
 * and processed one-at-a-time by the Ralph loop (execute → verify → update status → append learnings).
 *
 * A2A Loop Guard: Symmetric agent-to-agent chat with loop prevention (A2A_LOOP_GUARD evaluator).
 * Set shouldIgnoreBotMessages: false on agents that should respond to other bots.
 */

import type { Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { askAgentAction } from "./actions/askAgent.action";
import { dailyReportAction } from "./actions/dailyReport.action";
import { standupFacilitatorAction } from "./actions/standupFacilitator.action";
import { a2aLoopGuardEvaluator } from "./evaluators";
import { a2aContextProvider } from "./providers";
import { isStandupCoordinator, registerStandupTask } from "./standup";

export const interAgentPlugin: Plugin = {
  name: "plugin-inter-agent",
  description:
    "Multi-agent coordination: ASK_AGENT (ask any agent, relay answer), Kelly-facilitated standups with Day Report, action item backlog, and Ralph loop (execute → verify → learn). One team, one dream.",

  actions: [askAgentAction, dailyReportAction, standupFacilitatorAction],
  evaluators: [a2aLoopGuardEvaluator],
  providers: [a2aContextProvider],

  init: async (_config, runtime) => {
    const hasElizaOS = !!(runtime as { elizaOS?: unknown }).elizaOS;
    logger.info(
      { agent: runtime.character?.name, hasElizaOS },
      "[ONE_TEAM] elizaOS on runtime",
    );
    if (isStandupCoordinator(runtime)) {
      // Defer so runtime.db is available (plugin-sql registers it during init; we run after other plugins).
      setImmediate(() => {
        registerStandupTask(runtime).catch((err) => {
          logger.error({ err, agent: runtime.character?.name }, "[ONE_TEAM] registerStandupTask failed");
        });
      });
    }
  },
};

export { askAgentAction } from "./actions/askAgent.action";
export { getElizaOS } from "./types";
export type { ElizaOSAgentInfo, IElizaOSRegistry } from "./types";
