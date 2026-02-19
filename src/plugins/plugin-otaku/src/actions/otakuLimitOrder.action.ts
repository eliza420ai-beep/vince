/**
 * OTAKU_LIMIT_ORDER - Create limit orders with confirmation
 *
 * High-level limit order action that:
 * 1. Parses order intent from natural language
 * 2. Shows confirmation with price/expiry
 * 3. Waits for user confirmation
 * 4. Creates order via BANKR
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import {
  OtakuService,
  type LimitOrderRequest,
} from "../services/otaku.service";

/**
 * Parse limit order request from text
 */
function parseLimitOrderRequest(text: string): LimitOrderRequest | null {
  // Patterns for limit orders:
  // "limit order: sell 1 ETH at $3500"
  // "buy 100 USDC worth of ETH at 3000"
  // "set limit order for 0.5 ETH at 3500 USDC"
  // "buy ETH if it drops to 3000"

  const patterns = [
    // "limit order sell X TOKEN at $PRICE for TOKEN"
    /limit\s+order[:\s]+sell\s+(\d+\.?\d*)\s+(\w+)\s+(?:at|for)\s+\$?(\d+\.?\d*)\s*(?:for\s+)?(\w+)?/i,
    // "buy X TOKEN at PRICE"
    /buy\s+(\d+\.?\d*)\s+(\w+)\s+(?:at|if\s+(?:it\s+)?drops?\s+to)\s+\$?(\d+\.?\d*)/i,
    // "sell X TOKEN at PRICE"
    /sell\s+(\d+\.?\d*)\s+(\w+)\s+(?:at|if\s+(?:it\s+)?(?:hits?|reaches?))\s+\$?(\d+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const isBuy = text.toLowerCase().includes("buy");
      return {
        amount: match[1],
        sellToken: isBuy ? "USDC" : match[2].toUpperCase(),
        buyToken: isBuy
          ? match[2].toUpperCase()
          : (match[4]?.toUpperCase() ?? "USDC"),
        limitPrice: match[3],
      };
    }
  }

  return null;
}

/**
 * Extract chain from text
 */
function extractChain(text: string): string | undefined {
  const match = text.match(
    /on\s+(base|ethereum|eth|arbitrum|arb|polygon|matic)/i,
  );
  if (!match) return undefined;

  const chainMap: Record<string, string> = {
    base: "base",
    ethereum: "ethereum",
    eth: "ethereum",
    arbitrum: "arbitrum",
    arb: "arbitrum",
    polygon: "polygon",
    matic: "polygon",
  };

  return chainMap[match[1].toLowerCase()];
}

/**
 * Extract expiration hours from text
 */
function extractExpiration(text: string): number | undefined {
  const match = text.match(
    /(?:expires?\s+in|valid\s+for|for)\s+(\d+)\s*(hours?|h|days?|d)/i,
  );
  if (!match) return undefined;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("d")) {
    return value * 24;
  }
  return value;
}

export const otakuLimitOrderAction: Action = {
  name: "OTAKU_LIMIT_ORDER",
  description:
    "Create a limit order to buy or sell tokens at a specific price. Order executes automatically when price target is reached.",
  similes: [
    "LIMIT_ORDER",
    "SET_LIMIT",
    "BUY_LIMIT",
    "SELL_LIMIT",
    "PRICE_ORDER",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Set a limit order to buy ETH at $3000" },
      },
      {
        name: "{{agent}}",
        content: {
          text: '**Limit Order Summary:**\n- Buy: ETH\n- Price: $3000\n- Chain: base\n- Expires: 24 hours\n\nOrder will execute when ETH reaches $3000.\n\nType "confirm" to place order.',
          actions: ["OTAKU_LIMIT_ORDER"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Sell 0.5 ETH if it hits $4000" },
      },
      {
        name: "{{agent}}",
        content: {
          text: '**Limit Order Summary:**\n- Sell: 0.5 ETH\n- Buy: USDC\n- Limit Price: $4000\n- Chain: base\n- Expires: 24 hours\n\nOrder will execute when price reaches $4000.\n\nType "confirm" to place order.',
          actions: ["OTAKU_LIMIT_ORDER"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain limit order intent
    const hasLimitIntent =
      text.includes("limit") ||
      (text.includes("buy") &&
        (text.includes(" at ") || text.includes("drops"))) ||
      (text.includes("sell") &&
        (text.includes(" at ") ||
          text.includes("hits") ||
          text.includes("reaches")));

    if (!hasLimitIntent) return false;

    // Check if BANKR is available
    const otakuSvc = runtime.getService("otaku") as OtakuService | null;
    if (!otakuSvc?.isBankrAvailable?.()) {
      return false;
    }

    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";
    const otakuSvc = runtime.getService("otaku") as OtakuService;

    if (!otakuSvc) {
      await callback?.({
        text: "Otaku service not available. Please check configuration.",
      });
      return {
        success: false,
        error: new Error("Otaku service not available"),
      };
    }

    // Parse limit order request
    const request = parseLimitOrderRequest(text);
    if (!request) {
      await callback?.({
        text: 'I couldn\'t parse the limit order details. Please specify:\n- Action (buy/sell)\n- Amount\n- Token\n- Price\n\nExamples:\n- "Buy 100 USDC worth of ETH at $3000"\n- "Sell 0.5 ETH at $4000"\n- "Set limit order: sell 1 ETH for USDC at $3500"',
      });
      return {
        success: false,
        error: new Error("Could not parse limit order"),
      };
    }

    // Add chain and expiration if specified
    request.chain = extractChain(text);
    request.expirationHours = extractExpiration(text);

    // Check if this is a confirmation
    const isConfirmation =
      text.toLowerCase().includes("confirm") ||
      text.toLowerCase() === "yes" ||
      text.toLowerCase() === "go ahead" ||
      text.toLowerCase() === "do it" ||
      text.toLowerCase() === "proceed";

    // Check state for pending order
    const pendingOrder = state?.pendingLimitOrder as
      | LimitOrderRequest
      | undefined;

    if (isConfirmation && pendingOrder) {
      // Execute the order
      await callback?.({
        text: `Creating limit order: ${pendingOrder.amount} ${pendingOrder.sellToken} → ${pendingOrder.buyToken} at ${pendingOrder.limitPrice}...`,
      });

      const result = await otakuSvc.createLimitOrder(pendingOrder);

      if (result.success) {
        const orderOut = `✅ Limit order created!\n\n${result.response ?? ""}\n\nOrder ID: ${result.orderId ?? "pending"}`;
        await callback?.({
          text: "Here's the order—\n\n" + orderOut,
        });
        return { success: true };
      } else {
        await callback?.({
          text: `❌ Order creation failed: ${result.error}`,
        });
        return {
          success: false,
          error: new Error(result.error ?? "Order creation failed"),
        };
      }
    }

    // Show confirmation
    const confirmation = otakuSvc.formatLimitOrderConfirmation(request);
    await callback?.({
      text: confirmation,
    });

    logger.info(
      `[OTAKU_LIMIT_ORDER] Pending order: ${JSON.stringify(request)}`,
    );

    return { success: true };
  },
};

export default otakuLimitOrderAction;
