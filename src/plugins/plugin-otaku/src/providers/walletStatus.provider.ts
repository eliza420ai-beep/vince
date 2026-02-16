/**
 * Wallet Status Provider
 *
 * Provides wallet context for Otaku and other agents.
 * Includes balances, active orders, and recent transactions.
 */

import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import type { CdpService, BankrAgentService, BankrOrdersService } from "../types/services";

interface WalletBalance {
  token: string;
  balance: string;
  usdValue?: number;
  chain: string;
}

interface ActiveOrder {
  orderId: string;
  type: string;
  status: string;
  pair: string;
  amount: string;
  price?: string;
}

interface WalletContext {
  address?: string;
  balances: WalletBalance[];
  activeOrders: ActiveOrder[];
  totalUsdValue?: number;
  hasBalance: boolean;
  hasBankr: boolean;
  hasCdp: boolean;
}

export const walletStatusProvider: Provider = {
  name: "OTAKU_WALLET_STATUS",
  description: "Provides Otaku wallet balances, active orders, and DeFi positions",

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ) => {
    const context: WalletContext = {
      balances: [],
      activeOrders: [],
      hasBalance: false,
      hasBankr: false,
      hasCdp: false,
    };

    const cdpService = runtime.getService("cdp") as CdpService | null;

    if (cdpService) {
      context.hasCdp = true;

      try {
        if (cdpService.getWalletAddress) {
          context.address = await cdpService.getWalletAddress();
        }

        if (cdpService.getBalances) {
          const balances = await cdpService.getBalances();
          context.balances = balances.map((b) => ({
            token: b.symbol || b.token,
            balance: b.balance || b.amount,
            usdValue: b.usdValue,
            chain: b.chain || "base",
          }));

          context.totalUsdValue = context.balances.reduce(
            (sum, b) => sum + (b.usdValue || 0),
            0
          );
          context.hasBalance = context.totalUsdValue > 0;
        }
      } catch (err) {
        logger.debug(`[OTAKU] Failed to get CDP balances: ${err}`);
      }
    }

    const bankrOrders = runtime.getService("bankr_orders") as BankrOrdersService | null;
    const bankrAgent = runtime.getService("bankr_agent") as BankrAgentService | null;

    if (bankrAgent?.isConfigured?.()) {
      context.hasBankr = true;

      if (bankrOrders?.getActiveOrders) {
        try {
          const orders = await bankrOrders.getActiveOrders();
          context.activeOrders = orders.slice(0, 5).map((o) => ({
            orderId: o.orderId,
            type: o.orderType || o.type,
            status: o.status,
            pair: `${o.sellToken}/${o.buyToken}`,
            amount: o.sellAmount || o.amount,
            price: o.limitPrice || o.price,
          }));
        } catch (err) {
          logger.debug(`[OTAKU] Failed to get BANKR orders: ${err}`);
        }
      }
    }

    // Format context string
    const lines: string[] = [
      "## Otaku Wallet Status",
    ];

    if (context.address) {
      lines.push(`**Address:** ${context.address.slice(0, 10)}...${context.address.slice(-8)}`);
    }

    if (context.balances.length > 0) {
      lines.push("");
      lines.push("**Balances:**");
      for (const b of context.balances.slice(0, 5)) {
        const usd = b.usdValue ? ` (~$${b.usdValue.toFixed(2)})` : "";
        lines.push(`- ${b.balance} ${b.token} on ${b.chain}${usd}`);
      }
      if (context.totalUsdValue) {
        lines.push(`- **Total:** ~$${context.totalUsdValue.toFixed(2)}`);
      }
    } else {
      lines.push("");
      lines.push("**Balances:** No tokens found");
    }

    if (context.activeOrders.length > 0) {
      lines.push("");
      lines.push("**Active Orders:**");
      for (const o of context.activeOrders) {
        const price = o.price ? ` @ ${o.price}` : "";
        lines.push(`- ${o.type}: ${o.amount} ${o.pair}${price} (${o.status})`);
      }
    }

    lines.push("");
    lines.push(`**Services:** CDP: ${context.hasCdp ? "✅" : "❌"} | BANKR: ${context.hasBankr ? "✅" : "❌"}`);

    return { text: lines.join("\n") };
  },
};

export default walletStatusProvider;
