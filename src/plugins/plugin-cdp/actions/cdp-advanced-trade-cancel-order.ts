/**
 * COINBASE_CANCEL_ORDER - Cancel one or more orders on Coinbase Advanced Trade.
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  getAdvancedTradeConfig,
  advancedTradeRequest,
  isAdvancedTradeConfigured,
} from "../utils/advancedTradeClient";

const PATH = "/api/v3/brokerage/orders/batch_cancel";

interface CancelOrdersResponse {
  results?: Array<{ order_id?: string; success?: boolean; failure_reason?: string }>;
}

export const cdpAdvancedTradeCancelOrder: Action = {
  name: "COINBASE_CANCEL_ORDER",
  similes: ["COINBASE_CANCEL", "CANCEL_COINBASE_ORDER"],
  description:
    "Cancel one or more open orders on Coinbase (Advanced Trade). Provide order_ids (array of order ID strings). Use after COINBASE_LIST_ORDERS to cancel by ID. Requires Advanced Trade API keys.",

  parameters: {
    order_ids: { type: "array", description: "Order IDs to cancel (e.g. from COINBASE_LIST_ORDERS)", required: true },
  },

  validate: async (_runtime: IAgentRuntime) => isAdvancedTradeConfigured(),

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const config = getAdvancedTradeConfig();
    if (!config) {
      const text = "Coinbase Advanced Trade is not configured.";
      await callback?.({ text });
      return { success: false, text };
    }
    const orderIds = options?.order_ids as string[] | undefined;
    if (!orderIds?.length) {
      const text = "Provide order_ids (array of order IDs to cancel).";
      await callback?.({ text });
      return { success: false, text };
    }

    try {
      const data = await advancedTradeRequest<CancelOrdersResponse>("POST", PATH, config, { order_ids: orderIds });
      const results = data?.results ?? [];
      const ok = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success);
      const text =
        failed.length === 0
          ? `Canceled ${ok} order(s) on Coinbase.`
          : `Canceled ${ok} order(s). Failed: ${failed.map((r) => `${r.order_id} (${r.failure_reason ?? "?"})`).join(", ")}`;
      await callback?.({ text });
      return { success: failed.length === 0, text, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[COINBASE_CANCEL_ORDER] ${msg}`);
      await callback?.({ text: `Could not cancel Coinbase order(s): ${msg}` });
      return { success: false, text: msg, error: msg };
    }
  },
  examples: [
    [
      { name: "user", content: { text: "Cancel my open BTC order on Coinbase" } },
      { name: "Otaku", content: { text: "Canceling order…", actions: ["COINBASE_CANCEL_ORDER"] } },
    ],
  ],
};
