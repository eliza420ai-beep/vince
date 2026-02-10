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

function parseOrderParams(state?: State): Partial<{
  maker: string;
  orderType: string;
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  triggerPrice: string;
  slippageBps: number;
  expirationDate: number;
}> {
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  const maker = typeof params.maker === "string" ? params.maker : undefined;
  const orderType = typeof params.orderType === "string" ? params.orderType : undefined;
  const chainId = typeof params.chainId === "number" ? params.chainId : 8453;
  const sellToken = typeof params.sellToken === "string" ? params.sellToken : undefined;
  const buyToken = typeof params.buyToken === "string" ? params.buyToken : undefined;
  const sellAmount = typeof params.sellAmount === "string" ? params.sellAmount : undefined;
  const triggerPrice = typeof params.triggerPrice === "string" ? params.triggerPrice : undefined;
  const slippageBps = typeof params.slippageBps === "number" ? params.slippageBps : 100;
  const expirationDate =
    typeof params.expirationDate === "number"
      ? params.expirationDate
      : Math.floor(Date.now() / 1000) + 3600;
  return {
    maker,
    orderType,
    chainId,
    sellToken,
    buyToken,
    sellAmount,
    triggerPrice,
    slippageBps,
    expirationDate,
  };
}

export const bankrOrderQuoteAction: Action = {
  name: "BANKR_ORDER_QUOTE",
  description:
    "Get a quote for a Bankr External Order (limit-buy, limit-sell, stop-buy, stop-sell, dca, twap). Returns quoteId and actions (approval + EIP-712 order signature). Does not sign or submit; use Bankr Agent or a wallet for that.",
  similes: ["BANKR_QUOTE", "BANKR_LIMIT_QUOTE", "BANKR_ORDER_QUOTE"],

  validate: async (runtime: IAgentRuntime) => {
    const service = runtime.getService<BankrOrdersService>(BankrOrdersService.serviceType);
    return !!service?.isConfigured();
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

    const p = parseOrderParams(state);
    if (!p.maker || !p.orderType || !p.sellToken || !p.buyToken || !p.sellAmount) {
      const err =
        "Missing required quote params: maker, orderType, sellToken, buyToken, sellAmount. For limit/stop set triggerPrice in config.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const config: Record<string, unknown> =
      p.orderType?.startsWith("limit-") || p.orderType?.startsWith("stop-")
        ? { triggerPrice: p.triggerPrice || "0" }
        : p.orderType === "dca" || p.orderType === "twap"
          ? { interval: 300, maxExecutions: 12 }
          : {};

    try {
      const quote = await service.createQuote({
        maker: p.maker,
        orderType: p.orderType,
        config,
        chainId: p.chainId ?? 8453,
        sellToken: p.sellToken,
        buyToken: p.buyToken,
        sellAmount: p.sellAmount,
        slippageBps: p.slippageBps ?? 100,
        expirationDate: p.expirationDate ?? Math.floor(Date.now() / 1000) + 3600,
      });

      const hasApproval = quote.actions?.some((a) => a.type === "approval");
      const hasSign = quote.actions?.some((a) => a.type === "orderSignature");
      let reply = `**Quote** \`${quote.quoteId}\`\n- Approval required: ${hasApproval ? "yes" : "no"}\n- Order signature: ${hasSign ? "yes (EIP-712)" : "no"}\n\nNext: sign the order (wallet or Bankr Agent) and submit with this quoteId.`;
      callback?.({
        text: reply,
        actions: ["BANKR_ORDER_QUOTE"],
        source: message.content?.source,
      });
      return { success: true, text: reply, data: { quoteId: quote.quoteId, quote } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_ORDER_QUOTE] " + msg);
      callback?.({ text: `Quote failed: ${msg}`, actions: ["BANKR_ORDER_QUOTE"] });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "Get a limit-buy quote for 100 USDC → WETH on Base" } },
      { name: "Otaku", content: { text: "Quote created. Sign and submit with quoteId.", actions: ["BANKR_ORDER_QUOTE"] } },
    ],
  ],
};
