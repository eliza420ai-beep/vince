/**
 * Plugin Inter-Agent — Lets agents ask other agents and report back.
 * Action: ASK_AGENT (ask Vince, Kelly, Solus, Sentinel, Eliza, Otaku and relay the answer).
 * Optional: 2x/day standup (STANDUP_ENABLED=true; STANDUP_COORDINATOR_AGENT defaults to Kelly).
 *
 * A2A Loop Guard: Enables symmetric agent-to-agent Discord chat with loop prevention.
 * Set shouldIgnoreBotMessages: false on agents that should respond to other bots.
 * The A2A_LOOP_GUARD evaluator prevents infinite ping-pong by:
 * - Limiting max exchanges per conversation (A2A_MAX_EXCHANGES, default 3)
 * - Detecting reply chains to own messages
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
    "Multi-agent standup system: Kelly facilitates, agents report, produces actionable Day Report. One team, one dream.",

  actions: [askAgentAction, dailyReportAction, standupFacilitatorAction],
  evaluators: [a2aLoopGuardEvaluator],
  providers: [a2aContextProvider],

  init: async (_config, runtime) => {
    const hasElizaOS = !!(runtime as { elizaOS?: unknown }).elizaOS;
    logger.info("[ONE_TEAM] elizaOS on runtime", {
      agent: runtime.character?.name,
      hasElizaOS,
    });
    if (isStandupCoordinator(runtime)) {
      await registerStandupTask(runtime);
    }
  },
};

export { askAgentAction } from "./actions/askAgent.action";
export { getElizaOS } from "./types";
export type { ElizaOSAgentInfo, IElizaOSRegistry } from "./types";
