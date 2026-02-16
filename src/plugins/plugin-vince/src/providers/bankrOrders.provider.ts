/**
 * BANKR Orders Provider for VINCE
 *
 * Fetches active orders from BANKR and includes them in VINCE's context.
 * This allows VINCE to reference Otaku's open orders in ALOHA briefings.
 *
 * Data flow:
 * 1. BANKR_USER_INFO → get wallet addresses
 * 2. BANKR_ORDER_LIST → get active orders for each wallet
 * 3. Format and return as context string
 */

import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";

interface BankrOrder {
  orderId: string;
  orderType: "limit" | "stop" | "dca" | "twap";
  status: string;
  sellToken: string;
  buyToken: string;
  sellAmount?: string;
  buyAmount?: string;
  limitPrice?: string;
  triggerPrice?: string;
  fillPercent?: number;
  chainId?: number;
  createdAt?: string;
}

interface BankrWallet {
  chain: string;
  address: string;
}

/**
 * Get BANKR agent service from runtime
 */
function getBankrAgentService(runtime: IAgentRuntime): any {
  try {
    return runtime.getService("bankr_agent");
  } catch {
    return null;
  }
}

/**
 * Get BANKR orders service from runtime
 */
function getBankrOrdersService(runtime: IAgentRuntime): any {
  try {
    return runtime.getService("bankr_orders");
  } catch {
    return null;
  }
}

/**
 * Fetch active orders from BANKR
 */
async function fetchBankrOrders(runtime: IAgentRuntime): Promise<BankrOrder[]> {
  const agentSvc = getBankrAgentService(runtime);
  const ordersSvc = getBankrOrdersService(runtime);

  if (!agentSvc?.isConfigured?.() || !ordersSvc?.isConfigured?.()) {
    return [];
  }

  try {
    // Get wallets first
    const accountInfo = await agentSvc.getAccountInfo();
    const wallets: BankrWallet[] = accountInfo?.wallets ?? [];

    // Only EVM wallets support External Orders API
    const evmWallets = wallets.filter((w) => w.chain === "evm");
    if (evmWallets.length === 0) {
      return [];
    }

    // Fetch orders for each wallet
    const allOrders: BankrOrder[] = [];
    for (const wallet of evmWallets) {
      try {
        const result = await ordersSvc.listOrders({
          maker: wallet.address,
          status: "active",
        });
        if (result.orders) {
          allOrders.push(...result.orders);
        }
      } catch (err) {
        logger.warn(`[BankrOrdersProvider] Error fetching orders for ${wallet.address}: ${err}`);
      }
    }

    return allOrders;
  } catch (err) {
    logger.error(`[BankrOrdersProvider] Error: ${err}`);
    return [];
  }
}

/**
 * Format order for display
 */
function formatOrder(order: BankrOrder): string {
  const type = order.orderType.toUpperCase();
  const pair = `${order.sellToken} → ${order.buyToken}`;
  const amount = order.sellAmount ?? "?";
  const price = order.limitPrice ?? order.triggerPrice ?? "";
  const priceStr = price ? ` @ ${price}` : "";
  const fill = order.fillPercent ? ` (${order.fillPercent}% filled)` : "";

  return `${type}: ${amount} ${pair}${priceStr}${fill}`;
}

/**
 * Format chain name from chainId
 */
function getChainName(chainId?: number): string {
  const chains: Record<number, string> = {
    1: "Ethereum",
    8453: "Base",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
  };
  return chainId ? chains[chainId] ?? `Chain ${chainId}` : "Unknown";
}

/**
 * BANKR Orders Provider
 *
 * Provides active BANKR orders for VINCE's context.
 * Use in ALOHA to mention pending trades/automations.
 */
export const bankrOrdersProvider: Provider = {
  name: "BANKR_ORDERS_PROVIDER",
  description: "Active BANKR orders (limit/stop/DCA/TWAP) for cross-agent context",

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ) => {
    const orders = await fetchBankrOrders(runtime);

    if (orders.length === 0) {
      return { text: "" }; // No orders, don't add to context
    }

    // Group by order type
    const byType: Record<string, BankrOrder[]> = {};
    for (const order of orders) {
      const type = order.orderType;
      if (!byType[type]) byType[type] = [];
      byType[type].push(order);
    }

    // Build context string
    const lines: string[] = ["**Active BANKR Orders:**"];

    for (const [type, typeOrders] of Object.entries(byType)) {
      lines.push(`\n${type.toUpperCase()} (${typeOrders.length}):`);
      for (const order of typeOrders.slice(0, 3)) {
        lines.push(`- ${formatOrder(order)}`);
      }
      if (typeOrders.length > 3) {
        lines.push(`  ... and ${typeOrders.length - 3} more`);
      }
    }

    lines.push(`\nTotal: ${orders.length} active orders`);

    return { text: lines.join("\n") };
  },
};

/**
 * Get structured BANKR orders data (for programmatic use)
 */
export async function getBankrOrdersData(runtime: IAgentRuntime): Promise<{
  orders: BankrOrder[];
  summary: {
    total: number;
    byType: Record<string, number>;
  };
}> {
  const orders = await fetchBankrOrders(runtime);

  const byType: Record<string, number> = {};
  for (const order of orders) {
    byType[order.orderType] = (byType[order.orderType] ?? 0) + 1;
  }

  return {
    orders,
    summary: {
      total: orders.length,
      byType,
    },
  };
}

export default bankrOrdersProvider;
