/**
 * Dashboard BANKR API – orders, wallets, and positions for the BANKR tab.
 * GET /api/agents/:agentId/plugins/plugin-vince/vince/bankr
 *
 * Shows:
 * - Wallet addresses (EVM, Solana)
 * - Active orders (limit, stop, DCA, TWAP)
 * - Bankr Club status
 * - Recent job history
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";

// ---------------------------------------------------------------------------
// Response types for frontend
// ---------------------------------------------------------------------------

export interface BankrWallet {
  chain: "evm" | "solana";
  address: string;
  shortAddress: string;
}

export interface BankrOrder {
  orderId: string;
  orderType: "limit" | "stop" | "dca" | "twap";
  status: "active" | "filled" | "cancelled" | "expired";
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount?: string;
  limitPrice?: string;
  triggerPrice?: string;
  fillPercent?: number;
  chainId?: number;
  chainName?: string;
  createdAt?: string;
}

export interface BankrClubStatus {
  active: boolean;
  subscriptionType?: "monthly" | "yearly";
  expiresAt?: string;
}

export interface BankrLeaderboard {
  rank?: number;
  score?: number;
}

export interface BankrResponse {
  configured: boolean;
  wallets: BankrWallet[];
  orders: BankrOrder[];
  orderSummary: {
    total: number;
    limit: number;
    stop: number;
    dca: number;
    twap: number;
  };
  bankrClub: BankrClubStatus | null;
  leaderboard: BankrLeaderboard | null;
  error?: string;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getChainName(chainId?: number): string {
  if (!chainId) return "Unknown";
  const chains: Record<number, string> = {
    1: "Ethereum",
    8453: "Base",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
    130: "Unichain",
  };
  return chains[chainId] ?? `Chain ${chainId}`;
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export async function buildBankrResponse(
  runtime: IAgentRuntime
): Promise<BankrResponse> {
  const emptyResponse: BankrResponse = {
    configured: false,
    wallets: [],
    orders: [],
    orderSummary: { total: 0, limit: 0, stop: 0, dca: 0, twap: 0 },
    bankrClub: null,
    leaderboard: null,
    updatedAt: Date.now(),
  };

  // Get BANKR services
  const bankrAgent = runtime.getService("bankr_agent") as {
    isConfigured?: () => boolean;
    getAccountInfo?: () => Promise<any>;
  } | null;

  const bankrOrders = runtime.getService("bankr_orders") as {
    isConfigured?: () => boolean;
    listOrders?: (params: { maker: string; status?: string }) => Promise<any>;
  } | null;

  // Check if BANKR is configured
  if (!bankrAgent?.isConfigured?.()) {
    return {
      ...emptyResponse,
      error: "BANKR not configured. Set BANKR_API_KEY to enable.",
    };
  }

  try {
    // Fetch account info
    const accountInfo = await bankrAgent.getAccountInfo?.();
    if (!accountInfo) {
      return {
        ...emptyResponse,
        configured: true,
        error: "Failed to fetch BANKR account info",
      };
    }

    // Format wallets
    const wallets: BankrWallet[] = (accountInfo.wallets ?? []).map(
      (w: { chain: string; address: string }) => ({
        chain: w.chain as "evm" | "solana",
        address: w.address,
        shortAddress: shortenAddress(w.address),
      })
    );

    // Format Bankr Club status
    const bankrClub: BankrClubStatus | null = accountInfo.bankrClub?.active
      ? {
          active: true,
          subscriptionType: accountInfo.bankrClub.subscriptionType,
          expiresAt: accountInfo.bankrClub.expiresAt,
        }
      : null;

    // Format leaderboard
    const leaderboard: BankrLeaderboard | null = accountInfo.leaderboard
      ? {
          rank: accountInfo.leaderboard.rank,
          score: accountInfo.leaderboard.score,
        }
      : null;

    // Fetch orders for EVM wallets
    const orders: BankrOrder[] = [];
    if (bankrOrders?.isConfigured?.()) {
      const evmWallet = wallets.find((w) => w.chain === "evm");
      if (evmWallet) {
        try {
          const orderResult = await bankrOrders.listOrders?.({
            maker: evmWallet.address,
            status: "active",
          });

          if (orderResult?.orders) {
            for (const o of orderResult.orders) {
              orders.push({
                orderId: o.orderId,
                orderType: o.orderType,
                status: o.status,
                sellToken: o.sellToken ?? o.sellTokenSymbol ?? "?",
                buyToken: o.buyToken ?? o.buyTokenSymbol ?? "?",
                sellAmount: o.sellAmount ?? "?",
                buyAmount: o.buyAmount,
                limitPrice: o.limitPrice,
                triggerPrice: o.triggerPrice,
                fillPercent: o.fillPercent,
                chainId: o.chainId,
                chainName: getChainName(o.chainId),
                createdAt: o.createdAt,
              });
            }
          }
        } catch (err) {
          logger.warn(`[BANKR Dashboard] Error fetching orders: ${err}`);
        }
      }
    }

    // Calculate order summary
    const orderSummary = {
      total: orders.length,
      limit: orders.filter((o) => o.orderType === "limit").length,
      stop: orders.filter((o) => o.orderType === "stop").length,
      dca: orders.filter((o) => o.orderType === "dca").length,
      twap: orders.filter((o) => o.orderType === "twap").length,
    };

    return {
      configured: true,
      wallets,
      orders,
      orderSummary,
      bankrClub,
      leaderboard,
      updatedAt: Date.now(),
    };
  } catch (err) {
    logger.error(`[BANKR Dashboard] Error: ${err}`);
    return {
      ...emptyResponse,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Formatted text output (for CLI/chat)
// ---------------------------------------------------------------------------

export function formatBankrDashboard(data: BankrResponse): string {
  if (!data.configured) {
    return "**BANKR:** Not configured (BANKR_API_KEY not set)";
  }

  if (data.error) {
    return `**BANKR:** Error - ${data.error}`;
  }

  const lines: string[] = ["**BANKR Dashboard**", ""];

  // Wallets
  lines.push("**Wallets:**");
  if (data.wallets.length === 0) {
    lines.push("- No wallets found");
  } else {
    for (const w of data.wallets) {
      lines.push(`- ${w.chain.toUpperCase()}: \`${w.shortAddress}\``);
    }
  }
  lines.push("");

  // Bankr Club
  if (data.bankrClub?.active) {
    lines.push(`**Bankr Club:** ✅ Active (${data.bankrClub.subscriptionType})`);
  } else {
    lines.push("**Bankr Club:** Not active");
  }

  // Leaderboard
  if (data.leaderboard?.rank) {
    lines.push(
      `**Leaderboard:** Rank #${data.leaderboard.rank} (Score: ${data.leaderboard.score ?? "?"})`
    );
  }
  lines.push("");

  // Orders
  lines.push(`**Active Orders (${data.orderSummary.total}):**`);
  if (data.orders.length === 0) {
    lines.push("- No active orders");
  } else {
    // Group by type
    const byType: Record<string, BankrOrder[]> = {};
    for (const o of data.orders) {
      if (!byType[o.orderType]) byType[o.orderType] = [];
      byType[o.orderType].push(o);
    }

    for (const [type, typeOrders] of Object.entries(byType)) {
      lines.push(`\n*${type.toUpperCase()}* (${typeOrders.length}):`);
      for (const o of typeOrders.slice(0, 5)) {
        const priceStr = o.limitPrice
          ? ` @ ${o.limitPrice}`
          : o.triggerPrice
            ? ` trigger ${o.triggerPrice}`
            : "";
        const fillStr = o.fillPercent ? ` (${o.fillPercent}% filled)` : "";
        lines.push(
          `- ${o.sellAmount} ${o.sellToken} → ${o.buyToken}${priceStr}${fillStr}`
        );
      }
      if (typeOrders.length > 5) {
        lines.push(`  ... and ${typeOrders.length - 5} more`);
      }
    }
  }

  return lines.join("\n");
}
