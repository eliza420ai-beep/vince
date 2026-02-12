/**
 * Plugin Otaku - COO Execution Layer
 *
 * High-level DeFi operations via BANKR with:
 * - Built-in confirmation flows
 * - Natural language parsing
 * - Risk checks and balance validation
 *
 * Actions:
 * - OTAKU_SWAP: Quick token swaps
 * - OTAKU_LIMIT_ORDER: Limit orders at target prices
 * - OTAKU_DCA: Dollar cost averaging schedules
 * - OTAKU_POSITIONS: View portfolio and orders
 * - OTAKU_BRIDGE: Cross-chain bridge via Relay
 *
 * Providers:
 * - OTAKU_WALLET_STATUS: Wallet context for multi-agent queries
 *
 * Routes (x402 paywalled when enabled):
 * - GET /otaku/positions: Portfolio positions and active orders ($0.05)
 * - GET /otaku/quote: Swap quote without executing ($0.02)
 * - GET /otaku/yields: DeFi yield opportunities ($0.10)
 *
 * Free routes:
 * - GET /otaku/health: Service health status
 * - GET /otaku/gas: Gas prices across chains
 */

import type { Plugin } from "@elizaos/core";
import { OtakuService } from "./services/otaku.service";
import {
  otakuSwapAction,
  otakuLimitOrderAction,
  otakuDcaAction,
  otakuPositionsAction,
  otakuBridgeAction,
} from "./actions";
import { walletStatusProvider } from "./providers";
import {
  positionsRoute,
  quoteRoute,
  yieldsRoute,
  healthRoute,
  gasRoute,
} from "./routes";

export const otakuPlugin: Plugin = {
  name: "otaku",
  description: "Otaku COO execution layer - high-level DeFi operations via BANKR + x402 paid API",
  actions: [
    otakuSwapAction,
    otakuLimitOrderAction,
    otakuDcaAction,
    otakuPositionsAction,
    otakuBridgeAction,
  ],
  services: [OtakuService],
  providers: [walletStatusProvider],
  evaluators: [],
  routes: [
    // Paid routes (x402)
    positionsRoute,
    quoteRoute,
    yieldsRoute,
    // Free routes
    healthRoute,
    gasRoute,
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
