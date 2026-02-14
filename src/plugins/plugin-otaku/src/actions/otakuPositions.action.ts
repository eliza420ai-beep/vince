/**
 * OTAKU_POSITIONS - View portfolio positions and active orders
 *
 * High-level positions action that:
 * 1. Fetches portfolio balances from BANKR
 * 2. Fetches active orders (limit, stop, DCA, TWAP)
 * 3. Formats a clean summary
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
import { OtakuService } from "../services/otaku.service";

export const otakuPositionsAction: Action = {
  name: "OTAKU_POSITIONS",
  description:
    "View your portfolio positions and active orders. Shows token balances across chains and any pending limit/stop/DCA/TWAP orders.",
  similes: [
    "SHOW_POSITIONS",
    "MY_PORTFOLIO",
    "SHOW_PORTFOLIO",
    "MY_ORDERS",
    "ACTIVE_ORDERS",
    "MY_BALANCES",
    "SHOW_BALANCES",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Show my positions" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Portfolio:**\n- 2.5 ETH (~$6,625)\n- 1,500 USDC\n- 0.1 BTC (~$4,200)\n\n**Active Orders:**\n- Limit: Buy ETH at $2,500 (pending)\n- DCA: $500 → ETH over 30 days (10/30 complete)\n\nTotal Value: ~$12,325",
          actions: ["OTAKU_POSITIONS"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "What are my active orders?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Active Orders:**\n\n1. **Limit Order** #abc123\n   - Sell 0.5 ETH for USDC at $3,500\n   - Status: Pending\n   - Expires: 18h remaining\n\n2. **DCA** #def456\n   - $1,000 USDC → ETH (daily)\n   - Progress: 15/30 orders (50%)\n   - Next execution: ~2h",
          actions: ["OTAKU_POSITIONS"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain positions/portfolio/orders intent
    const hasIntent =
      text.includes("position") ||
      text.includes("portfolio") ||
      text.includes("balance") ||
      text.includes("holdings") ||
      (text.includes("my") && text.includes("order")) ||
      (text.includes("active") && text.includes("order")) ||
      (text.includes("show") && (text.includes("order") || text.includes("wallet")));

    if (!hasIntent) return false;

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
    const otakuSvc = runtime.getService("otaku") as OtakuService;

    if (!otakuSvc) {
      await callback?.({
        text: "Otaku service not available. Please check configuration.",
      });
      return { success: false, error: new Error("Otaku service not available") };
    }

    await callback?.({
      text: "Fetching positions and orders...",
    });

    try {
      const result = await otakuSvc.getPositions();

      // Format positions
      const positionLines: string[] = [];
      if (result.positions.length > 0) {
        positionLines.push("**Portfolio:**");
        for (const pos of result.positions) {
          const usdStr = pos.usdValue ? ` (~$${parseFloat(pos.usdValue).toLocaleString()})` : "";
          positionLines.push(`- ${pos.balance} ${pos.token}${usdStr}`);
        }
      } else {
        positionLines.push("**Portfolio:** No positions found");
      }

      // Format orders
      const orderLines: string[] = [];
      if (result.orders.length > 0) {
        orderLines.push("\n**Active Orders:**");
        for (const order of result.orders) {
          const typeLabel = order.type.toUpperCase();
          const statusLabel = order.status === "active" ? "⏳" : order.status === "filled" ? "✅" : "❌";
          const priceStr = order.price ? ` at ${order.price}` : "";
          const fillStr = order.fillPercent ? ` (${order.fillPercent}% filled)` : "";

          orderLines.push(
            `${statusLabel} **${typeLabel}** #${order.orderId.slice(0, 8)}...`
          );
          orderLines.push(
            `   ${order.amount} ${order.sellToken} → ${order.buyToken}${priceStr}${fillStr}`
          );
        }
      } else {
        orderLines.push("\n**Active Orders:** None");
      }

      // Total value
      const totalLine = result.totalUsdValue
        ? `\n**Total Value:** ~$${parseFloat(result.totalUsdValue).toLocaleString()}`
        : "";

      const out = "Here are your positions—\n\n" + [...positionLines, ...orderLines, totalLine].join("\n");
      await callback?.({
        text: out,
      });

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[OTAKU_POSITIONS] Failed: ${msg}`);
      await callback?.({
        text: `Failed to fetch positions: ${msg}`,
      });
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },
};

export default otakuPositionsAction;
