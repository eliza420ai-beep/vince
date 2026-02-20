/**
 * GET /arb/trades
 * Returns recent Polymarket latency arb trades for the leaderboard Polymarket tab.
 * Use Oracle agent ID: /api/agents/:oracleAgentId/plugins/polymarket-arb/arb/trades
 */

import type { IAgentRuntime } from "@elizaos/core";

const ARB_TRADES_TABLE = "plugin_polymarket_arb.arb_trades";
const DEFAULT_LIMIT = 50;

export interface ArbTradeRow {
  id: string;
  created_at: string;
  condition_id: string;
  token_id: string;
  side: string;
  btc_spot_price: number | null;
  contract_price: number | null;
  implied_prob: number | null;
  edge_pct: number | null;
  size_usd: number | null;
  fill_price: number | null;
  pnl_usd: number | null;
  status: string;
  exit_price: number | null;
  exit_reason: string | null;
}

export interface ArbTradesResponse {
  trades: Array<{
    id: string;
    createdAt: string;
    conditionId: string;
    tokenId: string;
    side: string;
    btcSpotPrice: number | null;
    contractPrice: number | null;
    edgePct: number | null;
    sizeUsd: number | null;
    fillPrice: number | null;
    pnlUsd: number | null;
    status: string;
    exitPrice: number | null;
    exitReason: string | null;
  }>;
  updatedAt: number;
  hint?: string;
}

export function buildArbTradesHandler() {
  return async (
    _req: { params?: Record<string, string>; query?: Record<string, string>; [k: string]: unknown },
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
        hint: "Ensure the Oracle agent is running and has plugin-polymarket-arb loaded",
      });
      return;
    }

    const conn = await (
      agentRuntime as { getConnection?: () => Promise<unknown> }
    ).getConnection?.();

    if (
      !conn ||
      typeof (conn as { query: (s: string, v?: unknown[]) => Promise<{ rows: ArbTradeRow[] }> }).query !== "function"
    ) {
      res.status(200).json({
        trades: [],
        updatedAt: Date.now(),
        hint: "Database not configured; arb trades are stored in plugin_polymarket_arb.arb_trades",
      } as ArbTradesResponse);
      return;
    }

    try {
      const limit = Math.min(
        parseInt(String(_req.query?.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
        100,
      );
      const client = conn as {
        query: (text: string, values?: unknown[]) => Promise<{ rows: ArbTradeRow[] }>;
      };
      const result = await client.query(
        `SELECT id, created_at, condition_id, token_id, side, btc_spot_price, contract_price, implied_prob, edge_pct, size_usd, fill_price, pnl_usd, status, exit_price, exit_reason
         FROM ${ARB_TRADES_TABLE}
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit],
      );
      const rows = result?.rows ?? [];
      const trades = rows.map((r) => ({
        id: r.id,
        createdAt: (() => {
          const raw = r.created_at as unknown;
          return raw instanceof Date ? raw.toISOString() : String(raw ?? "");
        })(),
        conditionId: r.condition_id,
        tokenId: r.token_id,
        side: r.side,
        btcSpotPrice: r.btc_spot_price,
        contractPrice: r.contract_price,
        edgePct: r.edge_pct,
        sizeUsd: r.size_usd,
        fillPrice: r.fill_price,
        pnlUsd: r.pnl_usd,
        status: r.status,
        exitPrice: r.exit_price,
        exitReason: r.exit_reason,
      }));
      res.status(200).json({
        trades,
        updatedAt: Date.now(),
      } as ArbTradesResponse);
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
