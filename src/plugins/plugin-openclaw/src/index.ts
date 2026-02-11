import type { Plugin } from "@elizaos/core";
import { runResearchAction } from "./actions/runResearch.action";
import { watchlistAction } from "./actions/watchlist.action";
import { compareAction } from "./actions/compare.action";
import { historyAction } from "./actions/history.action";
import { schedulerAction } from "./actions/scheduler.action";
import { portfolioAction } from "./actions/portfolio.action";
import { alertsAction } from "./actions/alerts.action";
import { analyticsAction } from "./actions/analytics.action";
import { insightsAction } from "./actions/insights.action";
import { advancedAction } from "./actions/advanced.action";
import { shouldOpenclawPluginBeInContext } from "../matcher";

export const openclawPlugin: Plugin = {
  name: "plugin-openclaw",
  description: `OpenClaw V2 - Enterprise-grade multi-agent crypto research plugin for VINCE.

🔬 **Research** - Multi-agent, Streaming, Cost, Budget
📋 **Organization** - Watchlist, Portfolio, History, Scheduler
📊 **Analytics** - Comparison, Trends, Risk, Stats, Leaderboard
🔔 **Alerts** - Price, Sentiment, Whale, Volume
🧠 **Insights** - AI insights, Market, Screener, Whales, News, Fear & Greed
🏦 **Advanced** - DeFi, NFT, Gas, Social, Exchange Flows, Token Unlocks

28+ features • 10 actions • 8 services • 40+ commands`,
  
  actions: [
    runResearchAction,
    watchlistAction,
    compareAction,
    historyAction,
    schedulerAction,
    portfolioAction,
    alertsAction,
    analyticsAction,
    insightsAction,
    advancedAction,
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
  portfolioAction,
  alertsAction,
  analyticsAction,
  insightsAction,
  advancedAction,
  shouldOpenclawPluginBeInContext,
};
