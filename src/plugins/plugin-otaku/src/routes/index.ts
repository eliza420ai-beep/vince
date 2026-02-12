/**
 * Otaku Routes - REST API for DeFi operations
 *
 * Paid routes (x402 paywalled when enabled):
 * - GET /otaku/positions - Portfolio positions and active orders
 * - GET /otaku/quote - Swap quote without executing
 * - GET /otaku/yields - DeFi yield opportunities
 * - GET /otaku/history - Transaction history
 *
 * Free routes:
 * - GET /otaku/health - Service health status
 * - GET /otaku/gas - Gas prices across chains
 */

export { positionsRoute } from "./paidPositions";
export { quoteRoute } from "./paidQuote";
export { yieldsRoute } from "./paidYields";
export { historyRoute } from "./paidHistory";
export { healthRoute, gasRoute } from "./freeRoutes";
