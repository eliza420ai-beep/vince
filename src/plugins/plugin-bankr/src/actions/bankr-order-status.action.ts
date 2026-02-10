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

function getOrderId(state?: State): string | null {
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  if (typeof params.orderId === "string" && params.orderId.trim()) return params.orderId.trim();
  return null;
}

export const bankrOrderStatusAction: Action = {
  name: "BANKR_ORDER_STATUS",
  description: "Get status and details of a single Bankr External Order by orderId.",
  similes: ["BANKR_ORDER_GET", "BANKR_ORDER_STATUS", "BANKR_ORDER_DETAILS"],

  validate: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const service = runtime.getService<BankrOrdersService>(BankrOrdersService.serviceType);
    if (!service?.isConfigured()) return false;
    return !!getOrderId(state);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const service = runtime.getService<BankrOrdersService>(BankrOrdersService.serviceType);
    if (!service) {
      const err = "Bankr Orders service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const orderId = getOrderId(state);
    if (!orderId) {
      const err = "Missing orderId for status.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      const order = await service.getOrder(orderId);
      if (!order) {
        const reply = `Order \`${orderId}\` not found.`;
        callback?.({ text: reply, actions: ["BANKR_ORDER_STATUS"], source: message.content?.source });
        return { success: true, text: reply, data: { order: null } };
      }
      const reply = `**Order** \`${order.orderId}\`\n- Type: ${order.orderType}\n- Status: ${order.status}\n- Maker: ${order.maker}${order.chainId != null ? `\n- ChainId: ${order.chainId}` : ""}${order.sellToken && order.sellAmount ? `\n- Sell: ${order.sellAmount} ${order.sellToken}` : ""}${order.buyToken ? `\n- Buy: ${order.buyToken}` : ""}${order.createdAt ? `\n- Created: ${order.createdAt}` : ""}`;
      callback?.({
        text: reply,
        actions: ["BANKR_ORDER_STATUS"],
        source: message.content?.source,
      });
      return { success: true, text: reply, data: { order } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_ORDER_STATUS] " + msg);
      callback?.({ text: `Status failed: ${msg}`, actions: ["BANKR_ORDER_STATUS"] });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "What's the status of Bankr order xyz?" } },
      { name: "Otaku", content: { text: "Order xyz: …", actions: ["BANKR_ORDER_STATUS"] } },
    ],
  ],
};
