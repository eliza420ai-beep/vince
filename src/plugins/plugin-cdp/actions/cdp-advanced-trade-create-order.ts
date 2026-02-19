/**
 * COINBASE_CREATE_ORDER - Create a market order on Coinbase Advanced Trade (CEX).
 * Simple market IOC: buy or sell by quote size (e.g. $100) or base size.
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

const PATH = "/api/v3/brokerage/orders";

interface CreateOrderResponse {
  success?: boolean;
  success_response?: { order_id?: string };
  error_response?: { error?: string; message?: string };
}

function generateClientOrderId(): string {
  return `otaku-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const cdpAdvancedTradeCreateOrder: Action = {
  name: "COINBASE_CREATE_ORDER",
  similes: ["COINBASE_BUY", "COINBASE_SELL", "COINBASE_MARKET_ORDER"],
  description:
    "Place a market order on Coinbase (Advanced Trade). Use for 'buy $100 of Bitcoin on Coinbase' or 'sell 0.01 BTC on Coinbase'. Parameters: product_id (e.g. BTC-USD), side (BUY or SELL), and either quote_size (e.g. { value: '100', currency: 'USD' }) or base_size (e.g. { value: '0.01', currency: 'BTC' }). Requires Advanced Trade API keys. Confirm with user before executing.",

  parameters: {
    product_id: {
      type: "string",
      description: "Trading pair e.g. BTC-USD",
      required: true,
    },
    side: { type: "string", description: "BUY or SELL", required: true },
    quote_size: {
      type: "object",
      description:
        "Optional: { value: string, currency: string } e.g. { value: '100', currency: 'USD' }",
      required: false,
    },
    base_size: {
      type: "object",
      description:
        "Optional: { value: string, currency: string } e.g. { value: '0.01', currency: 'BTC' }",
      required: false,
    },
  },

  validate: async (_runtime: IAgentRuntime) => isAdvancedTradeConfigured(),

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const config = getAdvancedTradeConfig();
    if (!config) {
      const text = "Coinbase Advanced Trade is not configured.";
      await callback?.({ text });
      return { success: false, text };
    }
    const productId = (options?.product_id as string)?.trim();
    const side = ((options?.side as string)?.trim() ?? "").toUpperCase();
    const quoteSize = options?.quote_size as
      | { value?: string; currency?: string }
      | undefined;
    const baseSize = options?.base_size as
      | { value?: string; currency?: string }
      | undefined;

    if (!productId || !side || (side !== "BUY" && side !== "SELL")) {
      const text =
        "COINBASE_CREATE_ORDER needs product_id (e.g. BTC-USD) and side (BUY or SELL), plus quote_size or base_size.";
      await callback?.({ text });
      return { success: false, text };
    }
    if (!quoteSize && !baseSize) {
      const text =
        "Provide either quote_size (e.g. { value: '100', currency: 'USD' }) or base_size (e.g. { value: '0.01', currency: 'BTC' }).";
      await callback?.({ text });
      return { success: false, text };
    }

    const orderConfiguration: Record<string, unknown> = quoteSize
      ? { market_market_ioc: { quote_size: quoteSize } }
      : { market_market_ioc: { base_size: baseSize } };

    const body = {
      client_order_id: generateClientOrderId(),
      product_id: productId,
      side,
      order_configuration: orderConfiguration,
    };

    try {
      const data = await advancedTradeRequest<CreateOrderResponse>(
        "POST",
        PATH,
        config,
        body,
      );
      if (data?.success && data?.success_response?.order_id) {
        const text = `Order placed on Coinbase. Order ID: ${data.success_response.order_id}`;
        await callback?.({ text });
        return { success: true, text, data: data as Record<string, unknown> };
      }
      const errMsg =
        (data as any)?.error_response?.message ??
        (data as any)?.error_response?.error ??
        "Order failed";
      await callback?.({ text: `Coinbase order failed: ${errMsg}` });
      return { success: false, text: errMsg, error: errMsg };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[COINBASE_CREATE_ORDER] ${msg}`);
      await callback?.({ text: `Could not place Coinbase order: ${msg}` });
      return { success: false, text: msg, error: msg };
    }
  },
  examples: [
    [
      { name: "user", content: { text: "Buy $50 of Bitcoin on Coinbase" } },
      {
        name: "Otaku",
        content: {
          text: "Placing market buy on Coinbase…",
          actions: ["COINBASE_CREATE_ORDER"],
        },
      },
    ],
  ],
};
