/**
 * COINBASE_LIST_ORDERS - List open orders on Coinbase Advanced Trade (CEX).
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  getAdvancedTradeConfig,
  advancedTradeRequest,
  isAdvancedTradeConfigured,
} from "../utils/advancedTradeClient";

interface ListOrdersResponse {
  orders?: Array<{
    order_id?: string;
    product_id?: string;
    side?: string;
    order_configuration?: Record<string, unknown>;
    status?: string;
    created_time?: string;
  }>;
  sequence?: string;
  has_next?: boolean;
  cursor?: string;
}

export const cdpAdvancedTradeListOrders: Action = {
  name: "COINBASE_LIST_ORDERS",
  similes: ["COINBASE_ORDERS", "LIST_COINBASE_ORDERS", "MY_COINBASE_ORDERS"],
  description:
    "List your open orders on Coinbase (Advanced Trade). Use when the user asks for their Coinbase orders or 'my open orders on Coinbase'. Requires Advanced Trade API keys.",

  validate: async (_runtime: IAgentRuntime) => isAdvancedTradeConfigured(),

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const config = getAdvancedTradeConfig();
    if (!config) {
      const text = "Coinbase Advanced Trade is not configured.";
      await callback?.({ text });
      return { success: false, text };
    }
    try {
      const path =
        "/api/v3/brokerage/orders/historical/batch?order_status=OPEN&limit=25";
      const data = await advancedTradeRequest<ListOrdersResponse>(
        "GET",
        path,
        config,
      );
      const orders = data?.orders ?? [];
      const lines = orders.map(
        (o) =>
          `- ${o.side} ${o.product_id ?? "?"} (${o.status ?? "?"}) — id: ${o.order_id ?? "?"}`,
      );
      const text =
        lines.length > 0
          ? `**Open Coinbase orders:**\n${lines.join("\n")}`
          : "No open orders on Coinbase.";
      await callback?.({ text });
      return { success: true, text, data: { orders } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[COINBASE_LIST_ORDERS] ${msg}`);
      await callback?.({ text: `Could not list Coinbase orders: ${msg}` });
      return { success: false, text: msg, error: msg };
    }
  },
  examples: [
    [
      { name: "user", content: { text: "Show my open orders on Coinbase" } },
      {
        name: "Otaku",
        content: {
          text: "Fetching your Coinbase orders…",
          actions: ["COINBASE_LIST_ORDERS"],
        },
      },
    ],
  ],
};
