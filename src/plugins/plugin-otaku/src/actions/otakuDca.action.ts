/**
 * OTAKU_DCA - Dollar Cost Averaging setup
 *
 * High-level DCA action that:
 * 1. Parses DCA schedule from natural language
 * 2. Shows confirmation with schedule breakdown
 * 3. Waits for user confirmation
 * 4. Creates DCA via BANKR
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
import { OtakuService, type DcaRequest } from "../services/otaku.service";

/**
 * Parse DCA request from text
 */
function parseDcaRequest(text: string): DcaRequest | null {
  // Patterns for DCA:
  // "DCA $500 into ETH over 30 days"
  // "DCA $100 into BTC every day for 30 days"
  // "Set up DCA: $50 into ETH daily"
  // "Dollar cost average 1000 USDC into ETH weekly"

  const patterns = [
    // "DCA $X into TOKEN over N days/weeks"
    /dca\s+\$?(\d+\.?\d*)\s+(?:into|to|for)\s+(\w+)\s+over\s+(\d+)\s*(days?|weeks?|months?)/i,
    // "DCA $X into TOKEN every INTERVAL for N orders"
    /dca\s+\$?(\d+\.?\d*)\s+(?:into|to|for)\s+(\w+)\s+every\s+(hour|day|week)\s*(?:for\s+(\d+))?/i,
    // "DCA X TOKEN into TOKEN over N orders"
    /dca\s+(\d+\.?\d*)\s+(\w+)\s+(?:into|to|for)\s+(\w+)/i,
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      if (i === 0) {
        // Pattern 1: DCA $500 into ETH over 30 days
        const unit = match[4].toLowerCase();
        let numOrders = parseInt(match[3]);
        let interval: "hourly" | "daily" | "weekly" = "daily";

        if (unit.startsWith("week")) {
          interval = "weekly";
        } else if (unit.startsWith("month")) {
          numOrders = numOrders * 4; // ~4 weeks per month
          interval = "weekly";
        }

        return {
          totalAmount: match[1],
          sellToken: "USDC",
          buyToken: match[2].toUpperCase(),
          interval,
          numOrders,
        };
      } else if (i === 1) {
        // Pattern 2: DCA $100 into BTC every day
        const intervalMap: Record<string, "hourly" | "daily" | "weekly"> = {
          hour: "hourly",
          day: "daily",
          week: "weekly",
        };

        return {
          totalAmount: match[1],
          sellToken: "USDC",
          buyToken: match[2].toUpperCase(),
          interval: intervalMap[match[3].toLowerCase()] ?? "daily",
          numOrders: match[4] ? parseInt(match[4]) : 30, // Default 30 orders
        };
      } else if (i === 2) {
        // Pattern 3: DCA 1000 USDC into ETH
        return {
          totalAmount: match[1],
          sellToken: match[2].toUpperCase(),
          buyToken: match[3].toUpperCase(),
          interval: "daily",
          numOrders: 30, // Default
        };
      }
    }
  }

  return null;
}

/**
 * Extract chain from text
 */
function extractChain(text: string): string | undefined {
  const match = text.match(/on\s+(base|ethereum|eth|arbitrum|arb|polygon|matic)/i);
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

export const otakuDcaAction: Action = {
  name: "OTAKU_DCA",
  description:
    "Set up a Dollar Cost Averaging (DCA) schedule to automatically buy a token at regular intervals. Supports hourly, daily, and weekly intervals.",
  similes: [
    "DCA",
    "DOLLAR_COST_AVERAGE",
    "AUTO_BUY",
    "RECURRING_BUY",
    "SCHEDULED_BUY",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "DCA $500 into ETH over 30 days" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**DCA Schedule Summary:**\n- Total: $500 USDC\n- Into: ETH\n- Orders: 30 × $16.67\n- Frequency: daily\n- Chain: base\n\nDCA will automatically execute 30 swaps.\n\nType \"confirm\" to start DCA.",
          actions: ["OTAKU_DCA"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Set up weekly DCA of $100 into BTC" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**DCA Schedule Summary:**\n- Total: $3000 USDC\n- Into: BTC\n- Orders: 30 × $100\n- Frequency: weekly\n- Chain: base\n\nDCA will automatically execute 30 swaps over ~7 months.\n\nType \"confirm\" to start DCA.",
          actions: ["OTAKU_DCA"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain DCA intent
    const hasDcaIntent =
      text.includes("dca") ||
      text.includes("dollar cost") ||
      (text.includes("recurring") && text.includes("buy")) ||
      (text.includes("auto") && text.includes("buy"));

    if (!hasDcaIntent) return false;

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
    callback?: HandlerCallback
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";
    const otakuSvc = runtime.getService("otaku") as OtakuService;

    if (!otakuSvc) {
      await callback?.({
        text: "Otaku service not available. Please check configuration.",
      });
      return { success: false, error: new Error("Otaku service not available") };
    }

    // Parse DCA request
    const request = parseDcaRequest(text);
    if (!request) {
      await callback?.({
        text: "I couldn't parse the DCA details. Please specify:\n- Total amount (e.g., $500 or 500 USDC)\n- Target token (e.g., ETH, BTC)\n- Duration or interval\n\nExamples:\n- \"DCA $500 into ETH over 30 days\"\n- \"DCA $100 into BTC every week\"\n- \"Set up daily DCA of $50 into ETH\"",
      });
      return { success: false, error: new Error("Could not parse DCA request") };
    }

    // Add chain if specified
    request.chain = extractChain(text);

    // Check if this is a confirmation
    const isConfirmation =
      text.toLowerCase().includes("confirm") ||
      text.toLowerCase() === "yes" ||
      text.toLowerCase() === "go ahead" ||
      text.toLowerCase() === "do it" ||
      text.toLowerCase() === "proceed";

    // Check state for pending DCA
    const pendingDca = state?.pendingDca as DcaRequest | undefined;

    if (isConfirmation && pendingDca) {
      // Execute the DCA
      await callback?.({
        text: `Creating DCA: ${pendingDca.totalAmount} ${pendingDca.sellToken} → ${pendingDca.buyToken} (${pendingDca.numOrders} × ${pendingDca.interval})...`,
      });

      const result = await otakuSvc.createDca(pendingDca);

      if (result.success) {
        const dcaOut = `✅ DCA schedule created!\n\n${result.response ?? ""}\n\nSchedule ID: ${result.orderId ?? "active"}`;
        await callback?.({
          text: "Here's the DCA schedule—\n\n" + dcaOut,
        });
        return { success: true };
      } else {
        await callback?.({
          text: `❌ DCA creation failed: ${result.error}`,
        });
        return { success: false, error: new Error(result.error ?? "DCA creation failed") };
      }
    }

    // Show confirmation
    const confirmation = otakuSvc.formatDcaConfirmation(request);
    await callback?.({
      text: confirmation,
    });

    logger.info(`[OTAKU_DCA] Pending DCA: ${JSON.stringify(request)}`);

    return { success: true };
  },
};

export default otakuDcaAction;
