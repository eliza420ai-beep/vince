/**
 * POLYMARKET_EXECUTE_PENDING_ORDER – Execute the next (or specified) approved sized order
 * on Polymarket CLOB. Only Otaku (Executor) should have this action.
 * Reads from plugin_polymarket_desk.sized_orders, places order, writes trade_log.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type HandlerCallback,
  logger,
} from "@elizaos/core";

const POLYMARKET_DISCOVERY_SERVICE = "POLYMARKET_DISCOVERY_SERVICE";
const SIGNALS_TABLE = "plugin_polymarket_desk.signals";
const SIZED_ORDERS_TABLE = "plugin_polymarket_desk.sized_orders";
const TRADE_LOG_TABLE = "plugin_polymarket_desk.trade_log";

interface SizedOrderRow {
  id: string;
  signal_id: string;
  market_id: string;
  side: string;
  size_usd: number;
  max_price: number | null;
  slippage_bps: number | null;
}

function parseFloatOrZero(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

export const polymarketExecutePendingOrderAction: Action = {
  name: "POLYMARKET_EXECUTE_PENDING_ORDER",
  description:
    "Execute the next pending Polymarket sized order (from Risk). Use when the user asks to run or place a Polymarket desk order, or to execute pending Polymarket orders.",
  similes: [
    "POLYMARKET_PLACE_ORDER",
    "EXECUTE_POLYMARKET_ORDER",
    "RUN_POLYMARKET_DESK_ORDER",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Execute the pending Polymarket order" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Executed sized order abc…: BUY $50 YES @ 0.52. Fill recorded.",
          actions: ["POLYMARKET_EXECUTE_PENDING_ORDER"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      (text.includes("execute") &&
        (text.includes("polymarket") || text.includes("desk order"))) ||
      text.includes("place polymarket") ||
      text.includes("run pending polymarket")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: unknown,
    options?: { sized_order_id?: string },
    callback?: HandlerCallback,
  ): Promise<void> => {
    const out = (text: string) => {
      if (callback) callback({ text });
    };

    try {
      const conn = await (
        runtime as { getConnection?: () => Promise<unknown> }
      ).getConnection?.();
      if (
        !conn ||
        typeof (
          conn as { query: (s: string, v?: unknown[]) => Promise<unknown> }
        ).query !== "function"
      ) {
        await out(
          "Database connection not available; cannot read sized orders.",
        );
        return;
      }

      const client = conn as {
        query: (
          text: string,
          values?: unknown[],
        ) => Promise<{ rows: unknown[] }>;
      };

      const orderId = options?.sized_order_id?.trim();
      let order: SizedOrderRow | null = null;

      if (orderId) {
        const r = await client.query(
          `SELECT id, signal_id, market_id, side, size_usd, max_price, slippage_bps FROM ${SIZED_ORDERS_TABLE} WHERE id = $1 AND status = 'pending'`,
          [orderId],
        );
        order = (r.rows[0] as SizedOrderRow) ?? null;
      } else {
        const r = await client.query(
          `SELECT id, signal_id, market_id, side, size_usd, max_price, slippage_bps FROM ${SIZED_ORDERS_TABLE} WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`,
          [],
        );
        order = (r.rows[0] as SizedOrderRow) ?? null;
      }

      if (!order) {
        await out("No pending Polymarket sized orders to execute.");
        return;
      }

      // Resolve condition_id → token_id if needed (market_id may be condition_id)
      let tokenId = order.market_id;
      const polymarketService = runtime.getService(
        POLYMARKET_DISCOVERY_SERVICE,
      ) as {
        getMarketDetail?: (conditionId: string) => Promise<{
          tokens?: Array<{ token_id: string; outcome?: string }>;
        }>;
      } | null;

      if (
        polymarketService?.getMarketDetail &&
        (order.market_id.startsWith("0x") || order.market_id.length < 80)
      ) {
        try {
          const market = await polymarketService.getMarketDetail(
            order.market_id,
          );
          const outcome = order.side.toUpperCase() === "YES" ? "Yes" : "No";
          const token = market.tokens?.find(
            (t) => t.outcome?.toLowerCase() === outcome.toLowerCase(),
          );
          if (token?.token_id) tokenId = token.token_id;
        } catch (e) {
          logger.warn(
            `[POLYMARKET_EXECUTE] Could not resolve condition_id to token_id: ${e}`,
          );
        }
      }

      // Arrival price from signal (for trade_log)
      let arrivalPrice = 0.5;
      try {
        const sig = await client.query(
          `SELECT market_price FROM ${SIGNALS_TABLE} WHERE id = $1`,
          [order.signal_id],
        );
        const row = sig.rows[0] as { market_price?: number } | undefined;
        if (row && row.market_price != null)
          arrivalPrice = parseFloatOrZero(row.market_price);
      } catch {
        // ignore
      }

      const privateKey =
        runtime.getSetting("POLYMARKET_PRIVATE_KEY") ??
        runtime.getSetting("EVM_PRIVATE_KEY");
      const apiKey = runtime.getSetting("POLYMARKET_CLOB_API_KEY");
      const apiSecret = runtime.getSetting("POLYMARKET_CLOB_SECRET");
      const apiPassphrase = runtime.getSetting("POLYMARKET_CLOB_PASSPHRASE");
      const funder = runtime.getSetting("POLYMARKET_FUNDER_ADDRESS");
      const clobHost =
        (runtime.getSetting("POLYMARKET_CLOB_API_URL") as string) ||
        "https://clob.polymarket.com";

      // Do not mark order rejected when creds missing: leave pending so it stays visible as open paper position (see POLYMARKET_TRADING_DESK § Paper-only mode).
      if (!privateKey || !apiKey || !apiSecret || !apiPassphrase || !funder) {
        await out(
          "Polymarket execution not configured (missing POLYMARKET_PRIVATE_KEY, POLYMARKET_CLOB_* or POLYMARKET_FUNDER_ADDRESS). Order left pending so it stays visible as a paper position.",
        );
        return;
      }

      let fillPrice = arrivalPrice;
      let clobOrderId: string | null = null;

      try {
        const { ClobClient, Side, OrderType } =
          await import("@polymarket/clob-client");
        // ClobClient uses ethers v5 Wallet from @ethersproject/wallet (its dependency)
        const { Wallet } = await import("@ethersproject/wallet");
        const signer = new Wallet(privateKey as string);
        const creds = {
          key: String(apiKey),
          secret: String(apiSecret),
          passphrase: String(apiPassphrase),
        };
        const clobClient = new ClobClient(
          clobHost,
          137,
          signer,
          creds,
          2,
          funder as string,
        );

        const side = order.side.toUpperCase() === "YES" ? Side.BUY : Side.SELL;
        const amount = parseFloatOrZero(order.size_usd);
        const price =
          order.max_price != null ? parseFloatOrZero(order.max_price) : 0.5;

        const resp = await clobClient.createAndPostMarketOrder(
          {
            side,
            tokenID: tokenId,
            amount,
            feeRateBps: 0,
            nonce: Date.now(),
            price,
          },
          undefined,
          OrderType.FOK,
        );
        const result = (resp as any) || {};
        if (result.orderID) clobOrderId = result.orderID;
        if (result.avgPrice != null) fillPrice = result.avgPrice;
        if (result.errorMsg) {
          await client.query(
            `UPDATE ${SIZED_ORDERS_TABLE} SET status = 'rejected' WHERE id = $1`,
            [order.id],
          );
          await out(`Order rejected by CLOB: ${result.errorMsg}`);
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`[POLYMARKET_EXECUTE] CLOB error: ${msg}`);
        await client.query(
          `UPDATE ${SIZED_ORDERS_TABLE} SET status = 'rejected' WHERE id = $1`,
          [order.id],
        );
        await out(`Execution failed: ${msg}. Order marked rejected.`);
        return;
      }

      const now = Date.now();
      const filledAt = new Date(now).toISOString();
      const slippageBps = Math.round((fillPrice - arrivalPrice) * 10000);
      const tradeId = crypto.randomUUID();
      const walletAddr =
        typeof funder === "string" ? funder.slice(0, 10) + "…" : "";

      await client.query(
        `UPDATE ${SIZED_ORDERS_TABLE} SET status = 'filled', filled_at = $1, fill_price = $2 WHERE id = $3`,
        [filledAt, fillPrice, order.id],
      );
      await client.query(
        `INSERT INTO ${TRADE_LOG_TABLE} (id, created_at, sized_order_id, signal_id, market_id, side, size_usd, arrival_price, fill_price, slippage_bps, clob_order_id, wallet)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          tradeId,
          filledAt,
          order.id,
          order.signal_id,
          order.market_id,
          order.side,
          order.size_usd,
          arrivalPrice,
          fillPrice,
          slippageBps,
          clobOrderId ?? null,
          walletAddr,
        ],
      );

      const summary =
        `**Polymarket order executed**\n` +
        ` Order \`${order.id.slice(0, 8)}…\`: ${order.side} $${order.size_usd} @ ${(fillPrice * 100).toFixed(1)}%.\n` +
        ` Fill recorded (slippage ${slippageBps > 0 ? "+" : ""}${slippageBps} bps).`;
      await out(summary);
      logger.info(
        `[POLYMARKET_EXECUTE] Filled order ${order.id} trade_log ${tradeId}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[POLYMARKET_EXECUTE_PENDING_ORDER] ${msg}`);
      await out(`Error: ${msg}`);
    }
  },
};
