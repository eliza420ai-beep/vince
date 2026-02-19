import {
  type Action,
  type IAgentRuntime,
  logger,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
} from "@elizaos/core";
import { BankrOrdersService } from "../services/bankr-orders.service";

function getMaker(state?: State): string | null {
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  if (typeof params.maker === "string" && params.maker.trim())
    return params.maker.trim();
  return null;
}

export const bankrOrderListAction: Action = {
  name: "BANKR_ORDER_LIST",
  description:
    "List Bankr External Orders for a maker wallet address. Optionally filter by chainId or status.",
  similes: ["BANKR_ORDERS", "BANKR_LIST_ORDERS", "BANKR_ORDER_LIST"],

  validate: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const service = runtime.getService<BankrOrdersService>(
      BankrOrdersService.serviceType,
    );
    if (!service?.isConfigured()) return false;
    return !!getMaker(state);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const service = runtime.getService<BankrOrdersService>(
      BankrOrdersService.serviceType,
    );
    if (!service) {
      const err = "Bankr Orders service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const maker = getMaker(state);
    if (!maker) {
      const err = "Missing maker address for listing orders.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
    const chainId =
      typeof params.chainId === "number" ? params.chainId : undefined;
    const status =
      typeof params.status === "string" ? params.status : undefined;

    try {
      const res = await service.listOrders({ maker, chainId, status });
      const orders = res.orders ?? [];
      if (orders.length === 0) {
        const reply = "No orders found for this wallet.";
        callback?.({
          text: reply,
          actions: ["BANKR_ORDER_LIST"],
          source: message.content?.source,
        });
        return { success: true, text: reply, data: { orders: [] } };
      }
      let reply = `**Orders (${orders.length}):**\n`;
      for (const o of orders) {
        reply += `- \`${o.orderId}\` ${o.orderType} ${o.status}${o.sellAmount && o.sellToken ? ` ${o.sellAmount} ${o.sellToken}` : ""}\n`;
      }
      callback?.({
        text: reply,
        actions: ["BANKR_ORDER_LIST"],
        source: message.content?.source,
      });
      return { success: true, text: reply, data: { orders } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_ORDER_LIST] " + msg);
      callback?.({
        text: `List failed: ${msg}`,
        actions: ["BANKR_ORDER_LIST"],
      });
      return {
        success: false,
        text: msg,
        error: err instanceof Error ? err : new Error(msg),
      };
    }
  },

  examples: [
    [
      {
        name: "user",
        content: { text: "List my Bankr orders for this wallet" },
      },
      {
        name: "Otaku",
        content: { text: "Orders (2): …", actions: ["BANKR_ORDER_LIST"] },
      },
    ],
  ],
};
