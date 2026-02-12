/**
 * BANKR Trading Engine Plugin
 * 
 * Direct programmatic trading via BANKR's external orders API.
 * 
 * Features:
 * - Limit orders (buy low / sell high)
 * - Stop orders (stop-loss / stop-buy with optional trailing)
 * - DCA (Dollar Cost Average) - split investment over time
 * - TWAP (Time-Weighted Average Price) - minimize market impact
 * - Order management (list, cancel, status)
 * 
 * Benefits over Agent API:
 * - No AI processing overhead (~3-10s → <1s)
 * - No per-request cost ($0.10 saved per operation)
 * - Better for scheduled/programmatic operations
 * - Native support for advanced order types
 * 
 * Config:
 * - BANKR_PRIVATE_KEY: Wallet private key for signing
 * - BANKR_CHAIN_ID: Chain ID (8453=Base, 1=Ethereum)
 * - BANKR_APP_FEE_BPS: Optional affiliate fee (e.g., 50 = 0.5%)
 * - BANKR_APP_FEE_RECIPIENT: Fee recipient address
 */

import type { Plugin } from "@elizaos/core";
import { BankrTradingEngineService } from "./services/tradingEngine.service";
import { dcaOrderAction } from "./actions/dcaOrder.action";

export const bankrTradingEnginePlugin: Plugin = {
  name: "plugin-bankr-trading-engine",
  description: "BANKR Trading Engine - Direct EIP-712 signed orders (limit, stop, DCA, TWAP)",
  
  actions: [
    dcaOrderAction,
    // TODO: Add more actions
    // twapOrderAction,
    // listOrdersAction,
    // cancelOrderAction,
  ],
  
  services: [BankrTradingEngineService],
  
  providers: [],
  evaluators: [],
};

// Re-export types and services
export * from "./types";
export { BankrTradingEngineService } from "./services/tradingEngine.service";
export { dcaOrderAction } from "./actions/dcaOrder.action";

export default bankrTradingEnginePlugin;
