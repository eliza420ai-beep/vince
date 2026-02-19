/**
 * OTAKU_STOP_LOSS - Set stop-loss and take-profit orders
 *
 * Creates conditional orders that trigger when price hits targets.
 * Essential for risk management on leveraged positions.
 *
 * Supports:
 * - Stop-loss: Sell when price drops to X
 * - Take-profit: Sell when price rises to X
 * - Combined: Both SL and TP in one order
 * - Trailing stop: Dynamic stop that follows price
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
  setPending,
  getPending,
  clearPending,
  isConfirmation,
  hasPending,
} from "../utils/pendingCache";
import { parseStopLossIntentWithLLM } from "../utils/intentParser";
import type { BankrAgentService } from "../types/services";
import { appendNotificationEvent } from "../lib/notificationEvents";

interface StopLossRequest {
  token: string;
  amount: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  trailingPercent?: number;
  chain?: string;
}

/**
 * Parse stop-loss/take-profit request from text
 */
function parseStopLossRequest(text: string): StopLossRequest | null {
  const lower = text.toLowerCase();

  // Token and amount patterns
  const tokenMatch = text.match(/(\d+\.?\d*)\s+(\w+)/i);
  if (!tokenMatch) return null;

  const result: StopLossRequest = {
    amount: tokenMatch[1],
    token: tokenMatch[2].toUpperCase(),
  };

  // Stop-loss price
  const slMatch = text.match(/stop[- ]?loss\s+(?:at\s+)?[\$]?(\d+\.?\d*)/i);
  if (slMatch) {
    result.stopLossPrice = slMatch[1];
  }

  // Take-profit price
  const tpMatch = text.match(/take[- ]?profit\s+(?:at\s+)?[\$]?(\d+\.?\d*)/i);
  if (tpMatch) {
    result.takeProfitPrice = tpMatch[1];
  }

  // Trailing stop
  const trailMatch = text.match(/trail(?:ing)?\s+(\d+\.?\d*)\s*%/i);
  if (trailMatch) {
    result.trailingPercent = parseFloat(trailMatch[1]);
  }

  // Alternative patterns
  if (
    !result.stopLossPrice &&
    !result.takeProfitPrice &&
    !result.trailingPercent
  ) {
    // "stop at $1800" or "tp at $2200"
    const stopMatch = text.match(/(?:stop|sl)\s+(?:at\s+)?[\$]?(\d+\.?\d*)/i);
    const tpAltMatch = text.match(
      /(?:tp|target)\s+(?:at\s+)?[\$]?(\d+\.?\d*)/i,
    );

    if (stopMatch) result.stopLossPrice = stopMatch[1];
    if (tpAltMatch) result.takeProfitPrice = tpAltMatch[1];
  }

  // Chain
  const chainMatch = text.match(/on\s+(base|ethereum|arbitrum|polygon)/i);
  if (chainMatch) result.chain = chainMatch[1].toLowerCase();

  // Require at least one target
  if (
    !result.stopLossPrice &&
    !result.takeProfitPrice &&
    !result.trailingPercent
  ) {
    return null;
  }

  return result;
}

export const otakuStopLossAction: Action = {
  name: "OTAKU_STOP_LOSS",
  description:
    "Set stop-loss and take-profit orders for risk management. Triggers automatically when price hits targets.",
  similes: [
    "SET_STOP_LOSS",
    "STOP_LOSS",
    "TAKE_PROFIT",
    "SL_TP",
    "TRAILING_STOP",
    "RISK_MANAGEMENT",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "Set stop-loss at $1800 and take-profit at $2200 for 1 ETH",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: '**Stop-Loss/Take-Profit Order:**\n- Token: 1 ETH\n- Stop-Loss: $1,800 (↓10%)\n- Take-Profit: $2,200 (↑10%)\n\nType "confirm" to place orders.',
          actions: ["OTAKU_STOP_LOSS"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Trailing stop 5% on my ETH position" },
      },
      {
        name: "{{agent}}",
        content: {
          text: '**Trailing Stop Order:**\n- Token: ETH\n- Trail: 5% below highest price\n\nType "confirm" to activate.',
          actions: ["OTAKU_STOP_LOSS"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    if (isConfirmation(text)) {
      return hasPending(runtime, message, "stopLoss");
    }

    const hasIntent =
      text.includes("stop-loss") ||
      text.includes("stop loss") ||
      text.includes("take-profit") ||
      text.includes("take profit") ||
      text.includes("trailing") ||
      (text.includes("sl") && text.includes("tp")) ||
      (text.includes("stop") && text.includes("at"));

    if (!hasIntent) return false;

    const bankr = runtime.getService("bankr_agent") as BankrAgentService | null;

    return !!bankr?.isConfigured?.();
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";

    let request: StopLossRequest | null = parseStopLossRequest(text);
    if (!request) {
      const llmIntent = await parseStopLossIntentWithLLM(runtime, text);
      if (llmIntent) {
        request = {
          token: llmIntent.token,
          amount: llmIntent.amount,
          stopLossPrice: llmIntent.stopLossPrice,
          takeProfitPrice: llmIntent.takeProfitPrice,
          trailingPercent: llmIntent.trailingPercent,
          chain: llmIntent.chain,
        };
      }
    }
    if (!request) {
      await callback?.({
        text: [
          "I couldn't parse the stop-loss/take-profit details. Please specify:",
          "- Token and amount (e.g., 1 ETH)",
          "- Stop-loss price (e.g., stop-loss at $1800)",
          "- Take-profit price (e.g., take-profit at $2200)",
          "- Or trailing stop (e.g., trailing 5%)",
          "",
          'Example: "Set stop-loss at $1800 and take-profit at $2200 for 1 ETH"',
        ].join("\n"),
      });
      return {
        success: false,
        error: new Error("Could not parse stop-loss request"),
      };
    }

    const pendingOrder = await getPending<StopLossRequest>(
      runtime,
      message,
      "stopLoss",
    );

    if (isConfirmation(text) && pendingOrder) {
      await clearPending(runtime, message, "stopLoss");
      const bankr = runtime.getService(
        "bankr_agent",
      ) as BankrAgentService | null;
      if (!bankr?.submitPrompt || !bankr?.pollJobUntilComplete) {
        await callback?.({ text: "BANKR service not available for orders." });
        return { success: false, error: new Error("BANKR not available") };
      }

      const prompts: string[] = [];

      if (pendingOrder.stopLossPrice) {
        prompts.push(
          `stop-loss order: sell ${pendingOrder.amount} ${pendingOrder.token} if price drops to $${pendingOrder.stopLossPrice}`,
        );
      }

      if (pendingOrder.takeProfitPrice) {
        prompts.push(
          `take-profit order: sell ${pendingOrder.amount} ${pendingOrder.token} when price reaches $${pendingOrder.takeProfitPrice}`,
        );
      }

      if (pendingOrder.trailingPercent) {
        prompts.push(
          `trailing stop ${pendingOrder.trailingPercent}% for ${pendingOrder.amount} ${pendingOrder.token}`,
        );
      }

      await callback?.({
        text: `Placing ${prompts.length} order(s)...`,
      });

      const results: string[] = [];
      for (const prompt of prompts) {
        try {
          const { jobId } = await bankr.submitPrompt(prompt);
          const result = await bankr.pollJobUntilComplete(jobId, {
            intervalMs: 2000,
            maxAttempts: 30,
          });

          if (result.status === "completed") {
            results.push(`✅ ${result.response || "Order placed"}`);
          } else {
            results.push(`❌ ${result.error || "Failed"}`);
          }
        } catch (err) {
          results.push(
            `❌ ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      const out = "Here are the order results—\n\n" + results.join("\n\n");
      await callback?.({
        text: out,
      });
      const successCount = results.filter((r) => r.startsWith("✅")).length;
      if (successCount > 0) {
        await appendNotificationEvent(
          runtime,
          {
            action: "stop_loss_created",
            title: "Stop-loss order(s) created",
            subtitle: `${pendingOrder.amount} ${pendingOrder.token} · ${successCount} order(s) placed`,
          },
          message.entityId,
        );
      }
      return { success: true };
    }

    // Get current price for context
    let currentPrice: number | null = null;
    const marketData = runtime.getService("VINCE_MARKET_DATA_SERVICE") as {
      getPrice?: (token: string) => Promise<number | null>;
    } | null;

    if (marketData?.getPrice) {
      currentPrice = await marketData.getPrice(request.token);
    }

    // Build confirmation message
    const lines = ["**Stop-Loss/Take-Profit Order:**", ""];
    lines.push(`📊 **Token:** ${request.amount} ${request.token}`);

    if (currentPrice) {
      lines.push(`💰 **Current Price:** $${currentPrice.toLocaleString()}`);
    }

    if (request.stopLossPrice) {
      const slPrice = parseFloat(request.stopLossPrice);
      const pctChange = currentPrice
        ? (((slPrice - currentPrice) / currentPrice) * 100).toFixed(1)
        : "?";
      lines.push(
        `🔴 **Stop-Loss:** $${slPrice.toLocaleString()} (${pctChange}%)`,
      );
    }

    if (request.takeProfitPrice) {
      const tpPrice = parseFloat(request.takeProfitPrice);
      const pctChange = currentPrice
        ? (((tpPrice - currentPrice) / currentPrice) * 100).toFixed(1)
        : "?";
      lines.push(
        `🟢 **Take-Profit:** $${tpPrice.toLocaleString()} (+${pctChange}%)`,
      );
    }

    if (request.trailingPercent) {
      lines.push(
        `📈 **Trailing Stop:** ${request.trailingPercent}% below peak`,
      );
    }

    lines.push("");
    lines.push("⚠️ Orders will execute automatically when targets are hit.");
    lines.push("");
    lines.push('Type "confirm" to place orders.');

    await callback?.({ text: lines.join("\n") });
    await setPending(runtime, message, "stopLoss", request);
    logger.info(`[OTAKU_STOP_LOSS] Pending stored: ${JSON.stringify(request)}`);

    return { success: true };
  },
};

export default otakuStopLossAction;
