/**
 * OTAKU_BALANCE - Check wallet balances
 *
 * Quick action to check token balances across chains.
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
import type { CdpService, BankrAgentService } from "../types/services";

interface TokenBalance {
  token: string;
  balance: string;
  usdValue?: number;
  chain: string;
}

export const otakuBalanceAction: Action = {
  name: "OTAKU_BALANCE",
  description:
    "Check wallet balances. Shows all tokens or specific token if requested.",
  similes: [
    "CHECK_BALANCE",
    "WALLET_BALANCE",
    "MY_BALANCE",
    "SHOW_BALANCE",
    "HOW_MUCH",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "What's my balance?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Wallet Balances:**\n- 0.5 ETH (~$1,000)\n- 250 USDC (~$250)\n- 0.1 WBTC (~$4,200)\n\n**Total:** ~$5,450",
          actions: ["OTAKU_BALANCE"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "How much ETH do I have?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "You have **0.5 ETH** (~$1,000) on Base.",
          actions: ["OTAKU_BALANCE"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain balance-related intent
    const hasBalanceIntent =
      text.includes("balance") ||
      text.includes("how much") ||
      (text.includes("what") && (text.includes("have") || text.includes("hold"))) ||
      text.includes("my wallet") ||
      text.includes("portfolio");

    if (!hasBalanceIntent) return false;

    const cdp = runtime.getService("cdp");
    const bankr = runtime.getService("bankr_agent") as BankrAgentService | null;
    return !!(cdp || bankr?.isConfigured?.());
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void | ActionResult> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Check if asking about specific token
    const tokenMatch = text.match(/(?:how much|balance of|have)\s+(\w+)/i);
    const specificToken = tokenMatch?.[1]?.toUpperCase();

    const balances: TokenBalance[] = [];
    let walletAddress: string | undefined;

    const cdpService = runtime.getService("cdp") as CdpService | null;

    if (cdpService) {
      try {
        if (cdpService.getWalletAddress) {
          walletAddress = await cdpService.getWalletAddress();
        }

        if (cdpService.getBalances) {
          const cdpBalances = await cdpService.getBalances();
          for (const b of cdpBalances) {
            balances.push({
              token: b.symbol || b.token,
              balance: b.balance || b.amount,
              usdValue: b.usdValue,
              chain: b.chain || "base",
            });
          }
        }
      } catch (err) {
        logger.debug(`[OTAKU] CDP balance fetch failed: ${err}`);
      }
    }

    const bankrService = runtime.getService("bankr_agent") as BankrAgentService | null;

    if (bankrService?.isConfigured?.() && balances.length === 0) {
      try {
        const { jobId } = await bankrService.submitPrompt!("show my portfolio");
        const result = await bankrService.pollJobUntilComplete!(jobId, {
          intervalMs: 2000,
          maxAttempts: 15,
        });

        if (result.response) {
          // Parse balances from response
          const tokenPattern = /(\d+\.?\d*)\s+([A-Z]+)/gi;
          let match;
          while ((match = tokenPattern.exec(result.response)) !== null) {
            balances.push({
              token: match[2],
              balance: match[1],
              chain: "evm",
            });
          }
        }
      } catch (err) {
        logger.debug(`[OTAKU] BANKR balance fetch failed: ${err}`);
      }
    }

    if (balances.length === 0) {
      await callback?.({
        text: "I couldn't fetch your balances. Please check CDP or BANKR configuration.",
      });
      return { success: false, error: new Error("Could not fetch balances") };
    }

    // Filter if specific token requested
    const displayBalances = specificToken
      ? balances.filter((b) => b.token === specificToken)
      : balances;

    if (specificToken && displayBalances.length === 0) {
      await callback?.({
        text: `You don't have any ${specificToken} in your wallet.`,
      });
      return { success: true };
    }

    // Calculate total
    const totalUsd = displayBalances.reduce((sum, b) => sum + (b.usdValue || 0), 0);

    // Format response
    if (specificToken && displayBalances.length === 1) {
      const b = displayBalances[0];
      const usd = b.usdValue ? ` (~$${b.usdValue.toLocaleString()})` : "";
      const line = `You have **${b.balance} ${b.token}**${usd} on ${b.chain}.`;
      await callback?.({
        text: "Here's your balance—\n\n" + line,
      });
    } else {
      const lines = ["**Wallet Balances:**"];

      if (walletAddress) {
        lines.push(`*${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}*`);
        lines.push("");
      }

      for (const b of displayBalances.slice(0, 10)) {
        const usd = b.usdValue ? ` (~$${b.usdValue.toLocaleString()})` : "";
        lines.push(`- ${b.balance} ${b.token} on ${b.chain}${usd}`);
      }

      if (displayBalances.length > 10) {
        lines.push(`- ...and ${displayBalances.length - 10} more tokens`);
      }

      if (totalUsd > 0) {
        lines.push("");
        lines.push(`**Total:** ~$${totalUsd.toLocaleString()}`);
      }

      const out = "Here's your balance—\n\n" + lines.join("\n");
      await callback?.({ text: out });
    }

    return { success: true };
  },
};

export default otakuBalanceAction;
