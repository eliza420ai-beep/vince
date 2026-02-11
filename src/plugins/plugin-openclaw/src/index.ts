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
import { backtestAction } from "./actions/backtest.action";
import { correlationAction } from "./actions/correlation.action";
import { reportingAction } from "./actions/reporting.action";
import { governanceAction } from "./actions/governance.action";
import { webhookAction } from "./actions/webhook.action";
import { shouldOpenclawPluginBeInContext } from "../matcher";

export const openclawPlugin: Plugin = {
  name: "plugin-openclaw",
  description: `OpenClaw V2 - Enterprise-grade multi-agent crypto research plugin for VINCE.

🔬 **Research** - Multi-agent, Streaming, Cost Tracking, Budget Management
📋 **Organization** - Watchlist, Portfolio, History, Scheduler
📊 **Analytics** - Comparison, Trends, Risk Analysis, Stats, Leaderboard
🔔 **Alerts** - Price, Sentiment, Whale Activity, Volume Triggers
🧠 **Insights** - AI Signals, Market Overview, Screener, Whales, News, Fear & Greed
🏦 **Advanced** - DeFi, NFT, Gas, Social Metrics, Exchange Flows, Token Unlocks
📈 **Backtest** - Strategy Backtesting, Signal Tracking, Agent Performance
📐 **Correlation** - Cross-Token Analysis, Beta, Sector Exposure, Divergences
📝 **Reports** - Professional Research Reports (Quick/Standard/Deep)
🏛️ **Governance** - DAO Proposals, Voting, Delegates, Protocol Stats
🔗 **Webhooks** - Discord, Slack, Telegram, HTTP Integrations

50+ features • 15 actions • 11 services • 100+ commands`,
  
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
    backtestAction,
    correlationAction,
    reportingAction,
    governanceAction,
    webhookAction,
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
  backtestAction,
  correlationAction,
  reportingAction,
  governanceAction,
  webhookAction,
  shouldOpenclawPluginBeInContext,
};
