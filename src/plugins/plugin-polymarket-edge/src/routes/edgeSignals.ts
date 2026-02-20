/**
 * GET /edge/signals
 * Returns recent edge signals (from plugin_polymarket_edge.edge_signals).
 */

import type { IAgentRuntime } from "@elizaos/core";

const DEFAULT_LIMIT = 50;

interface EdgeSignalRow {
  id: string;
  created_at: string | Date;
  strategy: string;
  source: string;
  market_id: string;
  side: string;
  confidence: number | null;
  edge_bps: number | null;
  forecast_prob: number | null;
  market_price: number | null;
  desk_signal_id: string | null;
}

export function buildEdgeSignalsHandler() {
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
        signals: [],
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
          query: (
            s: string,
            v?: unknown[],
          ) => Promise<{ rows: EdgeSignalRow[] }>;
        }
      ).query !== "function"
    ) {
      res.status(200).json({
        signals: [],
        updatedAt: Date.now(),
        hint: "Database not configured; signals are in plugin_polymarket_edge.edge_signals",
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
        ) => Promise<{ rows: EdgeSignalRow[] }>;
      };
      const result = await client.query(
        `SELECT id, created_at, strategy, source, market_id, side, confidence, edge_bps, forecast_prob, market_price, desk_signal_id
         FROM plugin_polymarket_edge.edge_signals
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
      const rows = result?.rows ?? [];
      const signals = rows.map((r) => ({
        id: r.id,
        createdAt:
          typeof r.created_at === "string"
            ? r.created_at
            : r.created_at instanceof Date
              ? r.created_at.toISOString()
              : String(r.created_at ?? ""),
        strategy: r.strategy,
        source: r.source,
        marketId: r.market_id,
        side: r.side,
        confidence: r.confidence,
        edgeBps: r.edge_bps,
        forecastProb: r.forecast_prob,
        marketPrice: r.market_price,
        deskSignalId: r.desk_signal_id,
      }));
      res.status(200).json({
        signals,
        updatedAt: Date.now(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        signals: [],
        updatedAt: Date.now(),
        error: msg,
      });
    }
  };
}
