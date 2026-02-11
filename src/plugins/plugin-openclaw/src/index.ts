import type { Plugin } from "@elizaos/core";
import { runResearchAction } from "./actions/runResearch.action";
import { watchlistAction } from "./actions/watchlist.action";
import { compareAction } from "./actions/compare.action";
import { historyAction } from "./actions/history.action";
import { schedulerAction } from "./actions/scheduler.action";
import { portfolioAction } from "./actions/portfolio.action";
import { alertsAction } from "./actions/alerts.action";
import { analyticsAction } from "./actions/analytics.action";
import { shouldOpenclawPluginBeInContext } from "../matcher";

export const openclawPlugin: Plugin = {
  name: "plugin-openclaw",
  description: `OpenClaw V2 - Enterprise-grade multi-agent crypto research plugin for VINCE.

🔬 **Research**
- Multi-agent: alpha, market, onchain, news
- Real-time streaming
- Cost tracking & budget alerts

📋 **Organization**
- Watchlist with alerts
- Portfolio tracking
- Research history & export
- Scheduled auto-research

📊 **Analytics**
- Token comparison
- Sentiment trends
- Risk analysis
- Usage stats dashboard
- Token leaderboard

🔔 **Alerts**
- Price alerts
- Sentiment alerts
- Whale activity alerts

Commands: research, watch, compare, history, schedule, portfolio, alerts, trend, risk, stats, leaderboard`,
  
  actions: [
    runResearchAction,
    watchlistAction,
    compareAction,
    historyAction,
    schedulerAction,
    portfolioAction,
    alertsAction,
    analyticsAction,
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
  shouldOpenclawPluginBeInContext,
};
