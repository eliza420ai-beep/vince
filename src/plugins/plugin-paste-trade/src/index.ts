import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { pasteTradeAction } from "./actions/pasteTrade.action.ts";
import { getPasteTradeKey } from "./config.ts";
import { registerPasteTradeTaskWorkers } from "./registerWorkers.ts";
import {
  handleGetPasteTradeHandoff,
  handleGetPasteTradeRun,
  handleGetPasteTradeRunsList,
  handlePostPasteTradeRuns,
} from "./routes/pasteTradeRoutes.ts";

export const pasteTradePlugin: Plugin = {
  name: "plugin-paste-trade",
  description:
    "paste.trade integration: extract sources, create live pages, thesis batch-save; VINCE UI + chat entry points.",
  actions: [pasteTradeAction],
  init: async (_config, runtime: IAgentRuntime) => {
    registerPasteTradeTaskWorkers(runtime);
    if (!getPasteTradeKey(runtime)) {
      logger.info(
        "[plugin-paste-trade] No PASTE_TRADE_KEY — remote publish unavailable; local-only runs still work (set PASTE_TRADE_REMOTE_PUBLISH=false or pass remotePublish:false).",
      );
    } else {
      logger.info(
        "[plugin-paste-trade] Task worker PASTE_TRADE_PIPELINE registered",
      );
    }
  },
  routes: [
    {
      name: "paste-trade-runs-post",
      path: "/paste-trade/runs",
      type: "POST",
      handler: handlePostPasteTradeRuns,
    },
    {
      name: "paste-trade-runs-list-get",
      path: "/paste-trade/runs",
      type: "GET",
      handler: handleGetPasteTradeRunsList,
    },
    {
      name: "paste-trade-run-get",
      path: "/paste-trade/run",
      type: "GET",
      handler: handleGetPasteTradeRun,
    },
    {
      name: "paste-trade-handoff-get",
      path: "/paste-trade/handoff",
      type: "GET",
      handler: handleGetPasteTradeHandoff,
    },
  ],
};

export default pasteTradePlugin;
