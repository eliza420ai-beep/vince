/**
 * Plugin Inter-Agent — Lets agents ask other agents and report back.
 * Action: ASK_AGENT (ask Vince, Kelly, Solus, Sentinel, Eliza, Otaku and relay the answer).
 */

import type { Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { askAgentAction } from "./actions/askAgent.action";

export const interAgentPlugin: Plugin = {
  name: "plugin-inter-agent",
  description:
    "Lets agents ask other agents a question and report the answer back. Use ASK_AGENT when the user wants another agent's input.",

  actions: [askAgentAction],

  init: async (_config, runtime) => {
    const hasElizaOS = !!(runtime as { elizaOS?: unknown }).elizaOS;
    logger.info("[ONE_TEAM] elizaOS on runtime", {
      agent: runtime.character?.name,
      hasElizaOS,
    });
  },
};

export { askAgentAction } from "./actions/askAgent.action";
