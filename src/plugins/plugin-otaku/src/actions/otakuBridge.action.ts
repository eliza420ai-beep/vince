/**
 * OTAKU_BRIDGE - Cross-chain bridge with confirmation flow
 *
 * High-level bridge action that:
 * 1. Parses bridge intent from natural language
 * 2. Gets quote from Relay
 * 3. Shows confirmation summary with fees
 * 4. Waits for user confirmation
 * 5. Executes via Relay/BANKR
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
import { parseBridgeIntentWithLLM } from "../utils/intentParser";
import type { RelayService, BankrAgentService } from "../types/services";
import { appendNotificationEvent } from "../lib/notificationEvents";

interface BridgeRequest {
  token: string;
  amount: string;
  fromChain: string;
  toChain: string;
}

const CHAIN_ALIASES: Record<string, string> = {
  eth: "ethereum",
  ethereum: "ethereum",
  mainnet: "ethereum",
  base: "base",
  arb: "arbitrum",
  arbitrum: "arbitrum",
  op: "optimism",
  optimism: "optimism",
  polygon: "polygon",
  matic: "polygon",
  sol: "solana",
  solana: "solana",
};

/**
 * Parse bridge request from text
 */
function parseBridgeRequest(text: string): BridgeRequest | null {
  const lower = text.toLowerCase();

  // Pattern: "bridge X TOKEN from CHAIN to CHAIN"
  const patterns = [
    // "bridge 1 ETH from base to arbitrum"
    /bridge\s+(\d+\.?\d*)\s+(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/i,
    // "send 1 ETH from base to arbitrum"
    /send\s+(\d+\.?\d*)\s+(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/i,
    // "move 1 ETH to arbitrum" (from current chain)
    /(?:move|transfer)\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 5) {
        // Full bridge with from/to
        const fromChain =
          CHAIN_ALIASES[match[3].toLowerCase()] || match[3].toLowerCase();
        const toChain =
          CHAIN_ALIASES[match[4].toLowerCase()] || match[4].toLowerCase();
        return {
          amount: match[1],
          token: match[2].toUpperCase(),
          fromChain,
          toChain,
        };
      } else if (match.length === 4) {
        // Just "to chain", assume from base
        const toChain =
          CHAIN_ALIASES[match[3].toLowerCase()] || match[3].toLowerCase();
        return {
          amount: match[1],
          token: match[2].toUpperCase(),
          fromChain: "base",
          toChain,
        };
      }
    }
  }

  return null;
}

export const otakuBridgeAction: Action = {
  name: "OTAKU_BRIDGE",
  description:
    "Bridge tokens across chains using Relay. Supports ETH, Base, Arbitrum, Optimism, Polygon, Solana.",
  similes: [
    "BRIDGE_TOKENS",
    "CROSS_CHAIN_TRANSFER",
    "MOVE_TOKENS",
    "CHAIN_BRIDGE",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Bridge 0.1 ETH from Base to Arbitrum" },
      },
      {
        name: "{{agent}}",
        content: {
          text: '**Bridge Quote:**\n- Send: 0.1 ETH on Base\n- Receive: ~0.0995 ETH on Arbitrum\n- Fee: ~$0.50\n- Time: ~2 minutes\n\nType "confirm" to proceed.',
          actions: ["OTAKU_BRIDGE"],
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
      return hasPending(runtime, message, "bridge");
    }

    const hasBridgeIntent =
      text.includes("bridge") ||
      text.includes("cross-chain") ||
      (text.includes("send") &&
        (text.includes("to") || text.includes("from"))) ||
      (text.includes("move") && text.includes("to")) ||
      (text.includes("transfer") &&
        (text.includes("to") || text.includes("from")));

    if (!hasBridgeIntent) return false;

    const relayService = runtime.getService("relay") as RelayService | null;
    const bankrService = runtime.getService(
      "bankr_agent",
    ) as BankrAgentService | null;

    return !!(relayService || bankrService?.isConfigured?.());
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";

    // Parse bridge request: regex first, then LLM fallback
    let request: BridgeRequest | null = parseBridgeRequest(text);
    if (!request) {
      const llmIntent = await parseBridgeIntentWithLLM(runtime, text);
      if (llmIntent) {
        request = {
          amount: llmIntent.amount,
          token: llmIntent.token,
          fromChain: CHAIN_ALIASES[llmIntent.fromChain] ?? llmIntent.fromChain,
          toChain: CHAIN_ALIASES[llmIntent.toChain] ?? llmIntent.toChain,
        };
      }
    }
    if (!request) {
      await callback?.({
        text: 'I couldn\'t parse the bridge details. Please specify:\n- Amount and token (e.g., 0.1 ETH)\n- Source chain (e.g., from Base)\n- Destination chain (e.g., to Arbitrum)\n\nExample: "bridge 0.1 ETH from Base to Arbitrum"',
      });
      return {
        success: false,
        error: new Error("Could not parse bridge request"),
      };
    }

    const relayService = runtime.getService("relay") as RelayService | null;
    const bankrService = runtime.getService(
      "bankr_agent",
    ) as BankrAgentService | null;

    const pendingBridge = await getPending<BridgeRequest>(
      runtime,
      message,
      "bridge",
    );

    if (isConfirmation(text) && pendingBridge) {
      await clearPending(runtime, message, "bridge");
      await callback?.({
        text: `Executing bridge: ${pendingBridge.amount} ${pendingBridge.token} from ${pendingBridge.fromChain} to ${pendingBridge.toChain}...`,
      });

      // Try Relay first
      if (relayService?.executeBridge) {
        try {
          const result = await relayService.executeBridge(pendingBridge);
          if (result.success) {
            const bridgeOut = `✅ Bridge initiated!\n\nTX: ${result.txHash}\nEstimated arrival: ${result.estimatedTime || "2-5 minutes"}\n\nUse "bridge status" to check progress.`;
            await callback?.({
              text: "Here's the bridge status—\n\n" + bridgeOut,
            });
            await appendNotificationEvent(
              runtime,
              {
                action: "bridge_completed",
                title: "Bridge completed",
                subtitle: `${pendingBridge.amount} ${pendingBridge.token} from ${pendingBridge.fromChain} to ${pendingBridge.toChain}`,
                metadata: { txHash: result.txHash },
              },
              message.entityId,
            );
            return { success: true };
          }
        } catch (err) {
          logger.debug(`[OTAKU] Relay bridge failed, trying BANKR: ${err}`);
        }
      }

      // Fallback to BANKR
      if (bankrService?.isConfigured?.()) {
        const prompt = `bridge ${pendingBridge.amount} ${pendingBridge.token} from ${pendingBridge.fromChain} to ${pendingBridge.toChain}`;
        try {
          const { jobId } = await bankrService.submitPrompt!(prompt);
          const result = await bankrService.pollJobUntilComplete!(jobId, {
            intervalMs: 2000,
            maxAttempts: 30,
          });

          if (result.status === "completed") {
            const txHash = result.transactions?.[0]?.hash;
            const bridgeOut = `✅ Bridge initiated!\n\n${result.response}\n\nTX: ${txHash || "pending"}`;
            await callback?.({
              text: "Here's the bridge status—\n\n" + bridgeOut,
            });
            await appendNotificationEvent(
              runtime,
              {
                action: "bridge_completed",
                title: "Bridge completed",
                subtitle: `${pendingBridge.amount} ${pendingBridge.token} from ${pendingBridge.fromChain} to ${pendingBridge.toChain}`,
                metadata: { txHash },
              },
              message.entityId,
            );
            return { success: true };
          } else {
            await callback?.({
              text: `❌ Bridge failed: ${result.error || "Unknown error"}`,
            });
            return {
              success: false,
              error: new Error(result.error ?? "Bridge failed"),
            };
          }
        } catch (err) {
          await callback?.({
            text: `❌ Bridge failed: ${err instanceof Error ? err.message : String(err)}`,
          });
          return {
            success: false,
            error: err instanceof Error ? err : new Error(String(err)),
          };
        }
      }

      await callback?.({
        text: "❌ No bridge service available. Check Relay or BANKR configuration.",
      });
      return {
        success: false,
        error: new Error("No bridge service available"),
      };
    }

    // Get quote
    let quote: {
      receiveAmount?: string;
      fee?: string;
      feeUsd?: string;
      estimatedTime?: string;
    } | null = null;

    if (relayService?.getQuote) {
      try {
        quote = await relayService.getQuote({
          token: request.token,
          amount: request.amount,
          fromChain: request.fromChain,
          toChain: request.toChain,
        });
      } catch (err) {
        logger.debug(`[OTAKU] Relay quote failed: ${err}`);
      }
    }

    // Format confirmation message
    const receiveAmount =
      quote?.receiveAmount ||
      `~${(parseFloat(request.amount) * 0.995).toFixed(4)}`;
    const fee = quote?.feeUsd || "~$0.50-2.00";
    const time = quote?.estimatedTime || "2-5 minutes";

    const confirmation = [
      `**Bridge Quote:**`,
      `- Send: ${request.amount} ${request.token} on ${request.fromChain}`,
      `- Receive: ${receiveAmount} ${request.token} on ${request.toChain}`,
      `- Fee: ${fee}`,
      `- Time: ${time}`,
      ``,
      `⚠️ This bridge is IRREVERSIBLE.`,
      ``,
      `Type "confirm" to proceed.`,
    ].join("\n");

    await callback?.({ text: confirmation });
    await setPending(runtime, message, "bridge", request);
    logger.info(
      `[OTAKU_BRIDGE] Pending bridge stored: ${JSON.stringify(request)}`,
    );

    return { success: true };
  },
};

export default otakuBridgeAction;
