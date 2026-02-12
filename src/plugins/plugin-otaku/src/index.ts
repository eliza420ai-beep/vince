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
 *
 * Routes (x402 paywalled when enabled):
 * - GET /otaku/positions: Portfolio positions and active orders
 */

import type { Plugin } from "@elizaos/core";
import { OtakuService } from "./services/otaku.service";
import {
  otakuSwapAction,
  otakuLimitOrderAction,
  otakuDcaAction,
  otakuPositionsAction,
} from "./actions";
import { positionsRoute } from "./routes/paidPositions";

export const otakuPlugin: Plugin = {
  name: "otaku",
  description: "Otaku COO execution layer - high-level DeFi operations via BANKR",
  actions: [
    otakuSwapAction,
    otakuLimitOrderAction,
    otakuDcaAction,
    otakuPositionsAction,
  ],
  services: [OtakuService],
  providers: [],
  evaluators: [],
  routes: [positionsRoute],
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
