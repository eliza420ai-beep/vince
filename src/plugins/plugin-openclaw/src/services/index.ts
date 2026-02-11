// Core service - Caching, Streaming, Cost Tracking, Budget Management
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

// Advanced (DeFi, NFT, Gas, Social, Flows, Unlocks)
export {
  default as advancedService,
  getDeFiOverview,
  formatDeFiOverview,
  getNFTOverview,
  formatNFTOverview,
  getGasPrices,
  formatGasPrices,
  getSocialMetrics,
  formatSocialMetrics,
  getExchangeFlows,
  formatExchangeFlows,
  getTokenUnlocks,
  formatTokenUnlocks,
} from "./advanced.service";

// Backtest & Signal Tracking
export {
  default as backtestService,
  recordSignal,
  closeSignal,
  getOpenSignals,
  getAllSignals,
  getAgentPerformance,
  formatAgentPerformance,
  runBacktest,
  formatBacktestResult,
  getBacktestHistory,
  formatBacktestHistory,
} from "./backtest.service";

// Correlation & Cross-Token Analysis
export {
  default as correlationService,
  calculateCorrelationMatrix,
  formatCorrelationMatrix,
  calculateBeta,
  formatBetaAnalysis,
  getSectorExposure,
  formatSectorExposure,
  detectDivergences,
  formatDivergences,
  analyzePair,
  formatPairAnalysis,
} from "./correlation.service";

// Professional Report Generation
export {
  default as reportingService,
  generateReport,
  formatReport,
  getReportHistory,
  loadReport,
  formatReportHistory,
} from "./reporting.service";

// DAO Governance Tracking
export {
  default as governanceService,
  getActiveProposals,
  getProposalHistory,
  formatProposal,
  formatActiveProposals,
  getWatchedProtocols,
  watchProtocol,
  unwatchProtocol,
  formatWatchedProtocols,
  getTopDelegates,
  formatDelegates,
  getGovernanceStats,
  formatGovernanceStats,
  checkGovernanceAlerts,
  formatGovernanceAlerts,
} from "./governance.service";

// Webhook Integrations
export {
  default as webhookService,
  createWebhook,
  getWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  deliverWebhook,
  broadcastEvent,
  getDeliveryHistory,
  formatWebhookList,
  formatWebhookDetails,
  formatDeliveryHistory,
  testWebhook,
} from "./webhook.service";
