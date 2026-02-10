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

function getCancelParams(state?: State): { orderId: string; signature: string } | null {
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  const orderId = typeof params.orderId === "string" ? params.orderId.trim() : null;
  const signature = typeof params.signature === "string" ? params.signature.trim() : null;
  if (!orderId || !signature) return null;
  return { orderId, signature };
}

export const bankrOrderCancelAction: Action = {
  name: "BANKR_ORDER_CANCEL",
  description:
    "Cancel an open Bankr External Order by orderId. Requires the cancel signature (EIP-712). Obtain the cancel typed data from Bankr if needed, sign it via BANKR_AGENT_SIGN (eth_signTypedData_v4), then call this with actionParams: orderId, signature.",
  similes: ["BANKR_CANCEL_ORDER", "BANKR_ORDER_CANCEL"],

  validate: async (runtime: IAgentRuntime, _message: Memory, state?: State) => {
    const service = runtime.getService<BankrOrdersService>(BankrOrdersService.serviceType);
    if (!service?.isConfigured()) return false;
    return !!getCancelParams(state);
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

    const cancelParams = getCancelParams(state);
    if (!cancelParams) {
      const err =
        "Missing actionParams: orderId and signature. Signature is the EIP-712 cancel signature (e.g. from BANKR_AGENT_SIGN with cancel typed data).";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      await service.cancelOrder(cancelParams.orderId, cancelParams.signature);
      const reply = `Order \`${cancelParams.orderId}\` cancelled.`;
      callback?.({
        text: reply,
        actions: ["BANKR_ORDER_CANCEL"],
        source: message.content?.source,
      });
      return { success: true, text: reply };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_ORDER_CANCEL] " + msg);
      callback?.({ text: `Cancel failed: ${msg}`, actions: ["BANKR_ORDER_CANCEL"] });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "Cancel my Bankr order abc123" } },
      { name: "Otaku", content: { text: "Order `abc123` cancelled.", actions: ["BANKR_ORDER_CANCEL"] } },
    ],
  ],
};
