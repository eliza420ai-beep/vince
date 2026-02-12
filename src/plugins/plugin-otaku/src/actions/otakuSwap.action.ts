/**
 * OTAKU_SWAP - Quick swap with confirmation flow
 *
 * High-level swap action that:
 * 1. Parses swap intent from natural language
 * 2. Shows confirmation summary
 * 3. Waits for user confirmation
 * 4. Executes via BANKR
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import { OtakuService, type SwapRequest } from "../services/otaku.service";

/**
 * Parse swap request from text
 */
function parseSwapRequest(text: string): SwapRequest | null {
  const lower = text.toLowerCase();

  // Pattern: "swap X TOKEN to/for TOKEN" or "swap $X of TOKEN to TOKEN"
  const patterns = [
    // "swap 1 ETH to USDC"
    /swap\s+(\d+\.?\d*)\s+(\w+)\s+(?:to|for|into)\s+(\w+)/i,
    // "swap $50 of ETH to USDC" or "swap $50 worth of ETH to USDC"
    /swap\s+\$?(\d+\.?\d*)\s+(?:of|worth\s+of)?\s*(\w+)\s+(?:to|for|into)\s+(\w+)/i,
    // "swap ETH to USDC" (amount TBD)
    /swap\s+(\w+)\s+(?:to|for|into)\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 4) {
        // Has amount
        return {
          amount: match[1],
          sellToken: match[2].toUpperCase(),
          buyToken: match[3].toUpperCase(),
        };
      } else if (match.length === 3) {
        // No amount specified
        return {
          amount: "?",
          sellToken: match[1].toUpperCase(),
          buyToken: match[2].toUpperCase(),
        };
      }
    }
  }

  // Check for chain specification
  const chainMatch = text.match(/on\s+(base|ethereum|arbitrum|polygon|solana)/i);

  return null;
}

/**
 * Extract chain from text
 */
function extractChain(text: string): string | undefined {
  const match = text.match(/on\s+(base|ethereum|eth|arbitrum|arb|polygon|matic|solana|sol)/i);
  if (!match) return undefined;

  const chainMap: Record<string, string> = {
    base: "base",
    ethereum: "ethereum",
    eth: "ethereum",
    arbitrum: "arbitrum",
    arb: "arbitrum",
    polygon: "polygon",
    matic: "polygon",
    solana: "solana",
    sol: "solana",
  };

  return chainMap[match[1].toLowerCase()];
}

export const otakuSwapAction: Action = {
  name: "OTAKU_SWAP",
  description:
    "Execute a token swap with confirmation. Use for quick swaps between tokens on supported chains (Base, Ethereum, Arbitrum, Polygon, Solana).",
  similes: [
    "SWAP_TOKENS",
    "QUICK_SWAP",
    "TOKEN_SWAP",
    "EXCHANGE_TOKENS",
  ],
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Swap 0.5 ETH to USDC on Base" },
      },
      {
        name: "Otaku",
        content: {
          text: "**Swap Summary:**\n- Sell: 0.5 ETH\n- Buy: USDC\n- Chain: base\n- Slippage: 0.5%\n\n⚠️ This swap is IRREVERSIBLE.\n\nType \"confirm\" to proceed.",
          actions: ["OTAKU_SWAP"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Swap $100 worth of ETH to USDC" },
      },
      {
        name: "Otaku",
        content: {
          text: "**Swap Summary:**\n- Sell: $100 worth of ETH\n- Buy: USDC\n- Chain: base\n- Slippage: 0.5%\n\n⚠️ This swap is IRREVERSIBLE.\n\nType \"confirm\" to proceed.",
          actions: ["OTAKU_SWAP"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain swap-like intent
    if (!text.includes("swap")) return false;

    // Must have token pair indication
    const hasTokenPair =
      text.includes(" to ") ||
      text.includes(" for ") ||
      text.includes(" into ");
    if (!hasTokenPair) return false;

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
  ): Promise<boolean> => {
    const text = message.content?.text ?? "";
    const otakuSvc = runtime.getService("otaku") as OtakuService;

    if (!otakuSvc) {
      await callback?.({
        text: "Otaku service not available. Please check configuration.",
      });
      return false;
    }

    // Parse swap request
    const request = parseSwapRequest(text);
    if (!request) {
      await callback?.({
        text: "I couldn't parse the swap details. Please specify:\n- Amount (e.g., 0.5 or $100)\n- Sell token (e.g., ETH)\n- Buy token (e.g., USDC)\n\nExample: \"swap 0.5 ETH to USDC on Base\"",
      });
      return false;
    }

    // Add chain if specified
    request.chain = extractChain(text);

    // Check for missing amount
    if (request.amount === "?") {
      await callback?.({
        text: `I see you want to swap ${request.sellToken} to ${request.buyToken}. How much ${request.sellToken} do you want to swap?`,
      });
      return true;
    }

    // Check if this is a confirmation
    const isConfirmation =
      text.toLowerCase().includes("confirm") ||
      text.toLowerCase() === "yes" ||
      text.toLowerCase() === "go ahead" ||
      text.toLowerCase() === "do it" ||
      text.toLowerCase() === "proceed";

    // Check state for pending swap
    const pendingSwap = state?.pendingSwap as SwapRequest | undefined;

    if (isConfirmation && pendingSwap) {
      // Execute the swap
      await callback?.({
        text: `Executing swap: ${pendingSwap.amount} ${pendingSwap.sellToken} → ${pendingSwap.buyToken}...`,
      });

      const result = await otakuSvc.executeSwap(pendingSwap);

      if (result.success) {
        await callback?.({
          text: `✅ Swap complete!\n\n${result.response ?? ""}\n\nTX: ${result.txHash ?? "pending"}`,
        });
        return true;
      } else {
        await callback?.({
          text: `❌ Swap failed: ${result.error}`,
        });
        return false;
      }
    }

    // Show confirmation and store pending swap
    const confirmation = otakuSvc.formatSwapConfirmation(request);
    await callback?.({
      text: confirmation,
    });

    // Store pending swap in state (would need state management)
    // For now, the confirmation flow relies on BANKR_AGENT_PROMPT
    logger.info(`[OTAKU_SWAP] Pending swap: ${JSON.stringify(request)}`);

    return true;
  },
};

export default otakuSwapAction;
