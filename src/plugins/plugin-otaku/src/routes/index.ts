/**
 * Otaku Routes - REST API for DeFi operations
 *
 * Paid routes (x402 paywalled when enabled):
 * - GET /otaku/positions - Portfolio positions and active orders ($0.05)
 * - GET /otaku/quote - Swap quote without executing ($0.02)
 * - GET /otaku/yields - DeFi yield opportunities ($0.10)
 * - GET /otaku/history - Transaction history ($0.05)
 * - GET /otaku/portfolio - Full portfolio visualization ($0.25)
 *
 * Free routes:
 * - GET /otaku/health - Service health status
 * - GET /otaku/config - Runtime wallet mode (degen | normies) for frontend
 * - GET /otaku/alerts - Proactive alerts (Morpho, DCA, stop-loss) for notifications UI
 * - GET /otaku/notifications - Completion events (swap, DCA, bridge, etc.) for notifications UI
 * - GET /otaku/gas - Gas prices across chains
 */

export { positionsRoute } from "./paidPositions";
export { quoteRoute } from "./paidQuote";
export { yieldsRoute } from "./paidYields";
export { historyRoute } from "./paidHistory";
export { portfolioRoute } from "./paidPortfolio";
export { healthRoute, gasRoute, configRoute, alertsRoute, notificationsRoute } from "./freeRoutes";
