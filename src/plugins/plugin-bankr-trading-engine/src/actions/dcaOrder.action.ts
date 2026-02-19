/**
 * OTAKU_DCA - Dollar Cost Average Order
 *
 * Creates a DCA order that splits investment over time.
 * Perfect for accumulating positions without timing the market.
 *
 * Examples:
 * - "DCA $1000 into ETH over 7 days" → 7 buys of ~$143 each
 * - "DCA $500 into WBTC, 10 buys, every 4 hours"
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
import type { BankrTradingEngineService } from "../services/tradingEngine.service";

// Common token addresses on Base
const BASE_TOKENS: Record<string, string> = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  WETH: "0x4200000000000000000000000000000000000006",
  ETH: "0x4200000000000000000000000000000000000006",
  CBBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  WBTC: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  DEGEN: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed",
};

interface DCARequest {
  totalAmount: string;
  buyToken: string;
  sellToken: string;
  executionCount: number;
  intervalMinutes: number;
}

function parseDCARequest(text: string): DCARequest | null {
  const lower = text.toLowerCase();

  // Amount pattern: "$1000", "1000 USDC", "$500"
  const amountMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (!amountMatch) return null;

  const totalAmount = amountMatch[1].replace(/,/g, "");

  // Buy token: "into ETH", "into WETH", "for WBTC"
  const buyTokenMatch = text.match(/(?:into|for|buy)\s+(\w+)/i);
  const buyTokenSymbol = buyTokenMatch?.[1]?.toUpperCase() || "WETH";
  const buyToken = BASE_TOKENS[buyTokenSymbol];

  if (!buyToken) {
    return null; // Unknown token
  }

  // Default sell token is USDC
  const sellToken = BASE_TOKENS.USDC;

  // Execution count: "10 buys", "7 times", default 7
  const countMatch = text.match(/(\d+)\s*(?:buys?|times|executions?|orders?)/i);
  const executionCount = countMatch ? parseInt(countMatch[1]) : 7;

  // Interval: "every 4 hours", "over 7 days", "hourly"
  let intervalMinutes = 60 * 24; // Default: daily

  const intervalMatch = text.match(/every\s+(\d+)\s*(hour|minute|min|day)/i);
  if (intervalMatch) {
    const num = parseInt(intervalMatch[1]);
    const unit = intervalMatch[2].toLowerCase();
    if (unit.startsWith("min")) intervalMinutes = num;
    else if (unit.startsWith("hour")) intervalMinutes = num * 60;
    else if (unit.startsWith("day")) intervalMinutes = num * 60 * 24;
  }

  const overDaysMatch = text.match(/over\s+(\d+)\s*days?/i);
  if (overDaysMatch) {
    const days = parseInt(overDaysMatch[1]);
    intervalMinutes = Math.floor((days * 24 * 60) / executionCount);
  }

  // Enforce minimum interval
  if (intervalMinutes < 5) intervalMinutes = 5;

  return {
    totalAmount,
    buyToken,
    sellToken,
    executionCount,
    intervalMinutes,
  };
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes < 60 * 24) return `${(minutes / 60).toFixed(1)} hours`;
  return `${(minutes / 60 / 24).toFixed(1)} days`;
}

export const dcaOrderAction: Action = {
  name: "OTAKU_DCA",
  description:
    "Create a Dollar Cost Average (DCA) order to accumulate tokens over time. Splits investment into multiple buys at regular intervals.",
  similes: [
    "DCA_ORDER",
    "DOLLAR_COST_AVERAGE",
    "AUTO_BUY",
    "RECURRING_BUY",
    "STACK_SATS",
  ],
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "DCA $1000 into ETH over 7 days" },
      },
      {
        name: "Otaku",
        content: {
          text: '**DCA Order Preview:**\n\n💰 **Total Investment:** $1,000 USDC\n🎯 **Buying:** WETH\n📊 **Schedule:** 7 buys of ~$143 each\n⏱️ **Interval:** Every 24 hours\n\nType "confirm" to create this DCA order.',
          actions: ["OTAKU_DCA"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "DCA $500 into WBTC, 10 buys, every 4 hours" },
      },
      {
        name: "Otaku",
        content: {
          text: '**DCA Order Preview:**\n\n💰 **Total Investment:** $500 USDC\n🎯 **Buying:** cbBTC\n📊 **Schedule:** 10 buys of $50 each\n⏱️ **Interval:** Every 4 hours\n\nType "confirm" to create this DCA order.',
          actions: ["OTAKU_DCA"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain DCA intent
    const hasDCAIntent =
      text.includes("dca") ||
      (text.includes("dollar") && text.includes("cost")) ||
      (text.includes("recurring") && text.includes("buy")) ||
      (text.includes("auto") && text.includes("buy") && text.includes("over"));

    if (!hasDCAIntent) return false;

    // Check service availability
    const tradingEngine = runtime.getService(
      "bankr_trading_engine",
    ) as BankrTradingEngineService | null;

    return !!tradingEngine?.isConfigured?.();
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";
    const lower = text.toLowerCase();

    // Check for confirmation
    const isConfirmation = lower === "confirm" || lower === "yes";
    const pendingDCA = state?.pendingDCA as DCARequest | undefined;

    if (isConfirmation && pendingDCA) {
      const tradingEngine = runtime.getService(
        "bankr_trading_engine",
      ) as BankrTradingEngineService;

      await callback?.({
        text: "🔄 Creating DCA order...",
      });

      try {
        const order = await tradingEngine.createDCAOrder({
          sellToken: pendingDCA.sellToken,
          buyToken: pendingDCA.buyToken,
          totalAmount: pendingDCA.totalAmount,
          executionCount: pendingDCA.executionCount,
          intervalMinutes: pendingDCA.intervalMinutes,
        });

        await callback?.({
          text: [
            "✅ **DCA Order Created!**",
            "",
            `📋 **Order ID:** \`${order.orderId}\``,
            `📊 **Status:** ${order.status}`,
            `💰 **Total:** ${order.sellToken.amount?.formatted || pendingDCA.totalAmount} USDC`,
            `🎯 **Buying:** ${order.buyToken.symbol || "Token"}`,
            `⏱️ **Executions:** ${pendingDCA.executionCount} over ${formatInterval(pendingDCA.intervalMinutes * pendingDCA.executionCount)}`,
            "",
            "Your DCA will execute automatically. Track with `show my orders`.",
          ].join("\n"),
        });

        return { success: true };
      } catch (err) {
        await callback?.({
          text: `❌ Failed to create DCA order: ${err instanceof Error ? err.message : String(err)}`,
        });
        return {
          success: false,
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    }

    // Parse new DCA request
    const request = parseDCARequest(text);
    if (!request) {
      await callback?.({
        text: [
          "I couldn't parse the DCA details. Please specify:",
          "- Amount to invest (e.g., $1000)",
          "- Token to buy (e.g., ETH, WBTC)",
          "- Duration or interval (e.g., over 7 days, every 4 hours)",
          "",
          "**Examples:**",
          "• DCA $1000 into ETH over 7 days",
          "• DCA $500 into WBTC, 10 buys, every 4 hours",
          "• DCA $2000 into ETH over 30 days",
        ].join("\n"),
      });
      return {
        success: false,
        error: new Error("Could not parse DCA request"),
      };
    }

    const perBuyAmount = (
      parseFloat(request.totalAmount) / request.executionCount
    ).toFixed(2);
    const totalDuration = request.intervalMinutes * request.executionCount;

    // Find token symbol
    const tokenSymbol =
      Object.entries(BASE_TOKENS).find(
        ([, addr]) => addr.toLowerCase() === request.buyToken.toLowerCase(),
      )?.[0] || "Token";

    // Build preview message
    const lines = [
      "**DCA Order Preview:**",
      "",
      `💰 **Total Investment:** $${parseFloat(request.totalAmount).toLocaleString()} USDC`,
      `🎯 **Buying:** ${tokenSymbol}`,
      `📊 **Schedule:** ${request.executionCount} buys of ~$${perBuyAmount} each`,
      `⏱️ **Interval:** Every ${formatInterval(request.intervalMinutes)}`,
      `📅 **Total Duration:** ${formatInterval(totalDuration)}`,
      "",
      "⚠️ This will sign an EIP-712 order. Gas fees apply for approval (if needed).",
      "",
      'Type "confirm" to create this DCA order.',
    ];

    await callback?.({ text: lines.join("\n") });

    // Store pending DCA in state (would need state management)
    logger.info(`[OTAKU_DCA] Pending: ${JSON.stringify(request)}`);

    return { success: true };
  },
};

export default dcaOrderAction;
