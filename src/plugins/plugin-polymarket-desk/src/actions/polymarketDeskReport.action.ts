/**
 * POLYMARKET_DESK_REPORT – Performance agent: read trade log and desk state,
 * compute TCA (slippage), fill rates, and optional realized vs theoretical edge.
 * No wallet; read-only.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type HandlerCallback,
  logger,
} from "@elizaos/core";

const TRADE_LOG_TABLE = "plugin_polymarket_desk.trade_log";
const SIZED_ORDERS_TABLE = "plugin_polymarket_desk.sized_orders";
const SIGNALS_TABLE = "plugin_polymarket_desk.signals";

export const polymarketDeskReportAction: Action = {
  name: "POLYMARKET_DESK_REPORT",
  description:
    "Produce a performance report for the Polymarket desk: trade log summary, TCA (slippage), fill rates, and realized vs theoretical edge. Use when asked for desk performance, TCA, fill rate, or EOD/weekly report.",
  similes: ["POLYMARKET_TCA", "POLYMARKET_PERFORMANCE_REPORT", "DESK_REPORT"],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "How did the Polymarket desk do today?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Desk report** (last 24h): 5 filled, 1 rejected. Avg slippage +12 bps. Fill rate 83%.",
          actions: ["POLYMARKET_DESK_REPORT"],
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
      text.includes("desk report") ||
      text.includes("polymarket report") ||
      text.includes("tca") ||
      text.includes("fill rate") ||
      text.includes("how did the desk") ||
      text.includes("performance report")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: unknown,
    options?: { limit?: number; hours?: number },
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
        await out("Database connection not available; cannot read trade log.");
        return;
      }

      const client = conn as {
        query: (
          text: string,
          values?: unknown[],
        ) => Promise<{ rows: unknown[] }>;
      };

      const limit = Math.min(Number(options?.limit) || 50, 200);
      const hours = Number(options?.hours) || 24 * 7; // default 7 days
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const [tradesRes, ordersRes, signalsRes] = await Promise.all([
        client.query(
          `SELECT id, market_id, side, size_usd, arrival_price, fill_price, slippage_bps, created_at FROM ${TRADE_LOG_TABLE} WHERE created_at >= $1 ORDER BY created_at DESC LIMIT $2`,
          [since, limit],
        ),
        client.query(
          `SELECT status, COUNT(*) as cnt FROM ${SIZED_ORDERS_TABLE} WHERE created_at >= $1 GROUP BY status`,
          [since],
        ),
        client.query(
          `SELECT COUNT(*) as cnt FROM ${SIGNALS_TABLE} WHERE created_at >= $1 AND status = 'approved'`,
          [since],
        ),
      ]);

      const trades = (tradesRes.rows || []) as Array<{
        id: string;
        market_id: string;
        side: string;
        size_usd: number;
        arrival_price: number;
        fill_price: number;
        slippage_bps: number | null;
        created_at: string;
      }>;
      const orderCounts = (ordersRes.rows || []) as Array<{
        status: string;
        cnt: string;
      }>;
      const approvedSignals = parseInt(
        String((signalsRes.rows?.[0] as { cnt: string })?.cnt ?? "0"),
        10,
      );

      const filled = orderCounts.find((r) => r.status === "filled");
      const pending = orderCounts.find((r) => r.status === "pending");
      const rejected = orderCounts.find((r) => r.status === "rejected");
      const filledCount = filled ? parseInt(filled.cnt, 10) : 0;
      const pendingCount = pending ? parseInt(pending.cnt, 10) : 0;
      const rejectedCount = rejected ? parseInt(rejected.cnt, 10) : 0;
      const totalOrders = filledCount + pendingCount + rejectedCount;
      const fillRate = totalOrders > 0 ? (filledCount / totalOrders) * 100 : 0;

      let avgSlippageBps: number | null = null;
      let totalSizeUsd = 0;
      if (trades.length > 0) {
        const withSlippage = trades.filter((t) => t.slippage_bps != null);
        if (withSlippage.length > 0) {
          avgSlippageBps =
            withSlippage.reduce((a, t) => a + Number(t.slippage_bps), 0) /
            withSlippage.length;
        }
        totalSizeUsd = trades.reduce((a, t) => a + Number(t.size_usd), 0);
      }

      const lines: string[] = [
        `**Polymarket desk report** (last ${hours}h)`,
        ` Trades: ${trades.length} filled, ${totalSizeUsd.toFixed(0)} USD notional.`,
        ` Orders: ${filledCount} filled, ${pendingCount} pending, ${rejectedCount} rejected. Fill rate ${fillRate.toFixed(0)}%.`,
      ];
      if (avgSlippageBps != null) {
        lines.push(
          ` TCA (avg slippage): ${avgSlippageBps >= 0 ? "+" : ""}${avgSlippageBps.toFixed(0)} bps.`,
        );
      }
      if (approvedSignals > 0) {
        lines.push(` Signals approved (in period): ${approvedSignals}.`);
      }
      const summary = lines.join("\n");
      await out(summary);
      logger.info(
        `[POLYMARKET_DESK_REPORT] ${trades.length} trades, fill rate ${fillRate.toFixed(0)}%`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[POLYMARKET_DESK_REPORT] ${msg}`);
      await out(`Report failed: ${msg}`);
    }
  },
};
