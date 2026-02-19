/**
 * Plugin Otaku - COO Execution Layer
 *
 * High-level DeFi operations via BANKR/CDP with:
 * - Built-in confirmation flows
 * - Natural language parsing
 * - Risk checks and balance validation
 *
 * Actions (10):
 * - OTAKU_SWAP: Quick token swaps
 * - OTAKU_LIMIT_ORDER: Limit orders at target prices
 * - OTAKU_DCA: Dollar cost averaging schedules
 * - OTAKU_POSITIONS: View portfolio and orders
 * - OTAKU_BRIDGE: Cross-chain bridge via Relay
 * - OTAKU_BALANCE: Check wallet balances
 * - OTAKU_STOP_LOSS: Stop-loss and take-profit orders
 * - OTAKU_MORPHO: Supply/withdraw from Morpho vaults
 * - OTAKU_APPROVE: Token approval management
 * - OTAKU_NFT_MINT: Mint NFTs (Sentinel handoff for gen art)
 *
 * Providers:
 * - OTAKU_WALLET_STATUS: Wallet context for multi-agent queries
 *
 * Routes - Paid (x402 paywalled when enabled):
 * - GET /otaku/positions: Portfolio positions and active orders ($0.05)
 * - GET /otaku/quote: Swap quote without executing ($0.02)
 * - GET /otaku/yields: DeFi yield opportunities ($0.10)
 * - GET /otaku/history: Transaction history ($0.05)
 * - GET /otaku/portfolio: Full portfolio visualization ($0.25)
 *
 * Routes - Free:
 * - GET /otaku/health: Service health status
 * - GET /otaku/gas: Gas prices across chains
 */

import type { Plugin } from "@elizaos/core";
import { OtakuService } from "./services/otaku.service";
import { registerOtakuRebalanceTaskWorker } from "./tasks/rebalance.tasks";
import { registerPolymarketExecutePollTask } from "./tasks/polymarketExecutePoll.tasks";
import {
  otakuSwapAction,
  otakuLimitOrderAction,
  otakuDcaAction,
  otakuPositionsAction,
  otakuBridgeAction,
  otakuBalanceAction,
  otakuStopLossAction,
  otakuMorphoAction,
  otakuApproveAction,
  otakuNftMintAction,
  otakuYieldRecommendAction,
  otakuSetRebalanceAction,
  otakuExecuteVinceSignalAction,
  polymarketExecutePendingOrderAction,
} from "./actions";
import { walletStatusProvider, vinceSignalProvider } from "./providers";
import {
  positionsRoute,
  quoteRoute,
  yieldsRoute,
  historyRoute,
  portfolioRoute,
  healthRoute,
  gasRoute,
  configRoute,
  alertsRoute,
  notificationsRoute,
} from "./routes";
import { portfolioEvaluator } from "./evaluators";

export const otakuPlugin: Plugin = {
  name: "otaku",
  description:
    "Otaku COO execution layer - high-level DeFi operations via BANKR + x402 paid API",
  actions: [
    otakuSwapAction,
    otakuLimitOrderAction,
    otakuDcaAction,
    otakuPositionsAction,
    otakuBridgeAction,
    otakuBalanceAction,
    otakuStopLossAction,
    otakuMorphoAction,
    otakuApproveAction,
    otakuNftMintAction,
    otakuYieldRecommendAction,
    otakuSetRebalanceAction,
    otakuExecuteVinceSignalAction,
    polymarketExecutePendingOrderAction,
  ],
  services: [OtakuService],
  init: async (_config, runtime) => {
    registerOtakuRebalanceTaskWorker(runtime);
    registerPolymarketExecutePollTask(runtime);
  },
  providers: [walletStatusProvider, vinceSignalProvider],
  evaluators: [portfolioEvaluator],
  routes: [
    // Paid routes (x402)
    positionsRoute,
    quoteRoute,
    yieldsRoute,
    historyRoute,
    portfolioRoute,
    // Free routes
    healthRoute,
    gasRoute,
    configRoute,
    alertsRoute,
    notificationsRoute,
  ],
};

export default otakuPlugin;

// Re-export for convenience
export { OtakuService } from "./services";
export {
  otakuSwapAction,
  otakuLimitOrderAction,
  otakuDcaAction,
  otakuPositionsAction,
} from "./actions";
