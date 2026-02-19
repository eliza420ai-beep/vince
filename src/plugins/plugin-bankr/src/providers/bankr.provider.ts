/**
 * Bankr Provider
 *
 * Exposes BANKR state to other agents (e.g., VINCE ALOHA can include positions).
 * Read-only access to wallets, positions, and orders.
 */

import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { BankrAgentService } from "../services/bankr-agent.service";
import { BankrOrdersService } from "../services/bankr-orders.service";
import type { UserInfoResponse, ExternalOrder } from "../types";

export interface BankrProviderData {
  isConfigured: boolean;
  wallets?: Array<{ chain: string; address: string }>;
  bankrClub?: { active: boolean; subscriptionType?: string };
  openOrders?: ExternalOrder[];
  orderCount?: number;
  lastUpdated: number;
}

/**
 * Get BANKR account info (wallets, club status)
 */
async function getAccountInfo(
  runtime: IAgentRuntime,
): Promise<UserInfoResponse | null> {
  const service = runtime.getService<BankrAgentService>(
    BankrAgentService.serviceType,
  );
  if (!service?.isConfigured()) return null;

  try {
    return await service.getAccountInfo();
  } catch (error) {
    logger.error({ err: error }, "[BankrProvider] Error getting account info");
    return null;
  }
}

/**
 * Get open orders for all wallets
 */
async function getOpenOrders(
  runtime: IAgentRuntime,
  wallets: Array<{ chain: string; address: string }>,
): Promise<ExternalOrder[]> {
  const ordersService = runtime.getService<BankrOrdersService>(
    BankrOrdersService.serviceType,
  );
  if (!ordersService?.isConfigured()) return [];

  const allOrders: ExternalOrder[] = [];

  for (const wallet of wallets) {
    if (wallet.chain !== "evm") continue; // External Orders API is EVM only

    try {
      const result = await ordersService.listOrders({
        maker: wallet.address,
        status: "active",
      });

      if (result.orders) {
        allOrders.push(...result.orders);
      }
    } catch (error) {
      logger.error(
        { err: error, address: wallet.address },
        "[BankrProvider] Error getting orders",
      );
    }
  }

  return allOrders;
}

/**
 * BANKR Provider
 *
 * Provides BANKR state for context injection into other agents.
 */
export const bankrProvider: Provider = {
  name: "BANKR_PROVIDER",
  description:
    "Provides BANKR wallet, positions, and order state for cross-agent context",

  get: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    const agentService = runtime.getService<BankrAgentService>(
      BankrAgentService.serviceType,
    );

    if (!agentService?.isConfigured()) {
      return { text: "BANKR: Not configured (BANKR_API_KEY not set)" };
    }

    try {
      // Get account info
      const accountInfo = await getAccountInfo(runtime);
      if (!accountInfo) {
        return { text: "BANKR: Could not fetch account info" };
      }

      const wallets = accountInfo.wallets ?? [];
      const evmWallets = wallets.filter((w) => w.chain === "evm");

      // Get open orders for EVM wallets
      const openOrders = await getOpenOrders(runtime, wallets);

      // Build context string
      let context = `**BANKR Status**\n`;

      // Wallets
      context += `Wallets: ${wallets.length} (${evmWallets.length} EVM, ${wallets.length - evmWallets.length} Solana)\n`;

      // Club status
      if (accountInfo.bankrClub?.active) {
        context += `Bankr Club: Active (${accountInfo.bankrClub.subscriptionType})\n`;
      }

      // Leaderboard
      if (accountInfo.leaderboard) {
        context += `Leaderboard: Rank #${accountInfo.leaderboard.rank ?? "?"} (Score: ${accountInfo.leaderboard.score})\n`;
      }

      // Open orders
      if (openOrders.length > 0) {
        context += `\n**Open Orders (${openOrders.length}):**\n`;
        for (const order of openOrders.slice(0, 5)) {
          context += `- ${order.orderType}: ${order.sellToken} → ${order.buyToken} (${order.status})\n`;
        }
        if (openOrders.length > 5) {
          context += `... and ${openOrders.length - 5} more\n`;
        }
      } else {
        context += `Open Orders: None\n`;
      }

      return { text: context };
    } catch (error) {
      logger.error({ err: error }, "[BankrProvider] Error");
      return { text: "BANKR: Error fetching state" };
    }
  },
};

/**
 * Get structured BANKR data (for programmatic use)
 */
export async function getBankrData(
  runtime: IAgentRuntime,
): Promise<BankrProviderData> {
  const agentService = runtime.getService<BankrAgentService>(
    BankrAgentService.serviceType,
  );

  if (!agentService?.isConfigured()) {
    return {
      isConfigured: false,
      lastUpdated: Date.now(),
    };
  }

  try {
    const accountInfo = await getAccountInfo(runtime);
    const wallets = accountInfo?.wallets ?? [];
    const openOrders = await getOpenOrders(runtime, wallets);

    return {
      isConfigured: true,
      wallets: wallets.map((w) => ({ chain: w.chain, address: w.address })),
      bankrClub: accountInfo?.bankrClub,
      openOrders,
      orderCount: openOrders.length,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    logger.error({ err: error }, "[getBankrData] Error");
    return {
      isConfigured: true,
      lastUpdated: Date.now(),
    };
  }
}

export default bankrProvider;
