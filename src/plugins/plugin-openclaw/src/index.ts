import type { Plugin } from "@elizaos/core";
import { runResearchAction } from "./actions/runResearch.action";
import { watchlistAction } from "./actions/watchlist.action";
import { compareAction } from "./actions/compare.action";
import { historyAction } from "./actions/history.action";
import { schedulerAction } from "./actions/scheduler.action";
import { shouldOpenclawPluginBeInContext } from "../matcher";

export const openclawPlugin: Plugin = {
  name: "plugin-openclaw",
  description: `OpenClaw V2 - Multi-agent crypto research plugin for VINCE.

Features:
- 🔬 Multi-agent research (alpha, market, onchain, news)
- 🔄 Real-time streaming progress
- 💰 Cost tracking with budget alerts
- 💾 Smart caching (1-hour TTL)
- ⏱️ Rate limiting (5 req/min)
- 📋 Token watchlist with alerts
- ⚖️ Side-by-side comparison
- 📜 Research history & export
- ⏰ Scheduled automatic research

Commands:
- research <tokens> - Run multi-agent research
- alpha/market/onchain/news <tokens> - Specific agent
- watch/unwatch <token> - Manage watchlist
- compare <tokens> - Compare tokens
- history - View past research
- schedule <tokens> <frequency> - Auto-research`,
  actions: [
    runResearchAction,
    watchlistAction,
    compareAction,
    historyAction,
    schedulerAction,
  ],
  evaluators: [],
  providers: [],
};

export default openclawPlugin;

export {
  runResearchAction,
  watchlistAction,
  compareAction,
  historyAction,
  schedulerAction,
  shouldOpenclawPluginBeInContext,
};
