// Core service
export {
  default as openclawService,
  initCache,
  getCachedResult,
  cacheResult,
  checkRateLimit,
  calculateCost,
  getDailyCost,
  checkBudget,
  formatCost,
  emitStreamUpdate,
  executeAgentWithStreaming,
  executeAllAgentsWithStreaming,
  clearCache,
  getCacheStats,
  streamEmitter,
} from "./openclaw.service";

// Watchlist, History, Comparison, Export
export {
  default as watchlistService,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
  formatWatchlist,
  getHistory,
  addToHistory,
  formatHistory,
  compareTokens,
  formatComparison,
  exportToMarkdown,
  exportToJSON,
} from "./watchlist.service";

// Scheduler
export {
  default as schedulerService,
  getSchedules,
  createSchedule,
  deleteSchedule,
  toggleSchedule,
  getDueSchedules,
  markScheduleRun,
  formatSchedules,
  getScheduleById,
} from "./scheduler.service";

// Portfolio
export {
  default as portfolioService,
  getPortfolio,
  addHolding,
  removeHolding,
  updateHolding,
  formatPortfolio,
  getPortfolioTokens,
} from "./portfolio.service";

// Alerts
export {
  default as alertsService,
  getAlerts,
  createAlert,
  deleteAlert,
  toggleAlert,
  checkAlerts,
  formatAlerts,
  formatTriggeredAlert,
  alertEmitter,
} from "./alerts.service";

// Analytics (Trends, Risk, Stats, Leaderboard)
export {
  default as analyticsService,
  getTrends,
  addTrendDataPoint,
  getTokenTrend,
  formatTrend,
  analyzeRisk,
  formatRiskAnalysis,
  getStats,
  recordQuery,
  formatStats,
  getLeaderboard,
  formatLeaderboard,
} from "./analytics.service";

// Insights (AI Insights, Market, Screener, Whales, News, Fear&Greed)
export {
  default as insightsService,
  generateInsights,
  formatInsights,
  getMarketOverview,
  formatMarketOverview,
  screenTokens,
  formatScreenerResults,
  getWhaleMovements,
  formatWhaleMovements,
  getNewsDigest,
  formatNewsDigest,
  getFearGreedIndex,
  formatFearGreed,
} from "./insights.service";
