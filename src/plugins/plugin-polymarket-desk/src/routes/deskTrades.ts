/**
 * GET /desk/trades
 * Returns recent Polymarket desk fills (trade_log) for the leaderboard.
 * Use Oracle agent ID: /api/agents/:agentId/plugins/polymarket-desk/desk/trades
 */

import type { IAgentRuntime } from "@elizaos/core";

const DEFAULT_LIMIT = 50;

interface TradeLogRow {
  id: string;
  created_at: string | Date;
  market_id: string;
  side: string;
  size_usd: number;
  arrival_price: number | null;
  fill_price: number;
}

export function buildDeskTradesHandler() {
  return async (
    _req: {
      params?: Record<string, string>;
      query?: Record<string, string>;
      [k: string]: unknown;
    },
    res: {
      status: (n: number) => { json: (o: object) => void };
      json: (o: object) => void;
    },
    runtime?: IAgentRuntime,
  ): Promise<void> => {
    const agentRuntime = runtime as IAgentRuntime | undefined;
    if (!agentRuntime) {
      res.status(500).json({
        trades: [],
        updatedAt: Date.now(),
        error: "No runtime",
      });
      return;
    }

    const conn = await (
      agentRuntime as { getConnection?: () => Promise<unknown> }
    ).getConnection?.();

    if (
      !conn ||
      typeof (
        conn as {
          query: (s: string, v?: unknown[]) => Promise<{ rows: TradeLogRow[] }>;
        }
      ).query !== "function"
    ) {
      res.status(200).json({
        trades: [],
        updatedAt: Date.now(),
        hint: "Database not configured; trade log in plugin_polymarket_desk.trade_log",
      });
      return;
    }

    try {
      const limit = Math.min(
        parseInt(String(_req.query?.limit ?? DEFAULT_LIMIT), 10) ||
          DEFAULT_LIMIT,
        100,
      );
      const client = conn as {
        query: (
          text: string,
          values?: unknown[],
        ) => Promise<{ rows: TradeLogRow[] }>;
      };
      const result = await client.query(
        `SELECT id, created_at, market_id, side, size_usd, arrival_price, fill_price
         FROM plugin_polymarket_desk.trade_log
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
      const rows = result?.rows ?? [];
      const trades = rows.map((r) => {
        const arrival = r.arrival_price ?? 0;
        const executionPnlUsd = (arrival - r.fill_price) * r.size_usd;
        return {
          id: r.id,
          createdAt:
            typeof r.created_at === "string"
              ? r.created_at
              : r.created_at instanceof Date
                ? r.created_at.toISOString()
                : String(r.created_at ?? ""),
          marketId: r.market_id,
          side: r.side,
          sizeUsd: r.size_usd,
          arrivalPrice: r.arrival_price,
          fillPrice: r.fill_price,
          executionPnlUsd,
        };
      });
      res.status(200).json({
        trades,
        updatedAt: Date.now(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        trades: [],
        updatedAt: Date.now(),
        error: msg,
      });
    }
  };
}
