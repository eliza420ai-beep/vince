/**
 * GET /desk/status
 * Returns Polymarket desk paper-trading summary: trades today, volume, execution P&L.
 * Use Oracle agent ID: /api/agents/:agentId/plugins/polymarket-desk/desk/status
 */

import type { IAgentRuntime } from "@elizaos/core";

function startOfTodayUtcMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildDeskStatusHandler() {
  return async (
    _req: { params?: Record<string, string>; [k: string]: unknown },
    res: {
      status: (n: number) => { json: (o: object) => void };
      json: (o: object) => void;
    },
    runtime?: IAgentRuntime,
  ): Promise<void> => {
    const agentRuntime = runtime as IAgentRuntime | undefined;
    if (!agentRuntime) {
      res.status(500).json({
        error: "No runtime",
        tradesToday: 0,
        volumeTodayUsd: 0,
        executionPnlTodayUsd: 0,
        pendingSignalsCount: 0,
        pendingSizedOrdersCount: 0,
        hint: "Ensure the agent has plugin-polymarket-desk loaded",
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
          query: (s: string, v?: unknown[]) => Promise<{ rows: unknown[] }>;
        }
      ).query !== "function"
    ) {
      res.status(200).json({
        tradesToday: 0,
        volumeTodayUsd: 0,
        executionPnlTodayUsd: 0,
        pendingSignalsCount: 0,
        pendingSizedOrdersCount: 0,
        updatedAt: Date.now(),
        hint: "Database not configured; desk tables in plugin_polymarket_desk",
      });
      return;
    }

    try {
      const client = conn as {
        query: (
          text: string,
          values?: unknown[],
        ) => Promise<{
          rows: {
            trades_today?: number;
            volume_today?: number;
            execution_pnl_today?: number;
          }[];
          rowCount?: number;
        }>;
      };
      const since = startOfTodayUtcMs();

      const [tradeSummary, pendingSignalsResult, pendingSizedResult] =
        await Promise.all([
          client.query(
            `SELECT
            COUNT(*)::int AS trades_today,
            COALESCE(SUM(size_usd), 0)::double precision AS volume_today,
            COALESCE(SUM((arrival_price - fill_price) * size_usd), 0)::double precision AS execution_pnl_today
           FROM plugin_polymarket_desk.trade_log
           WHERE created_at >= to_timestamp($1 / 1000.0) AT TIME ZONE 'UTC'`,
            [since],
          ),
          client.query(
            `SELECT COUNT(*)::int AS cnt FROM plugin_polymarket_desk.signals WHERE status = 'pending'`,
          ),
          client.query(
            `SELECT COUNT(*)::int AS cnt FROM plugin_polymarket_desk.sized_orders WHERE status = 'pending'`,
          ),
        ]);

      const row = tradeSummary?.rows?.[0];
      const pendingRow = pendingSignalsResult?.rows?.[0] as
        | { cnt?: number }
        | undefined;
      const sizedRow = pendingSizedResult?.rows?.[0] as
        | { cnt?: number }
        | undefined;

      res.status(200).json({
        tradesToday: row?.trades_today ?? 0,
        volumeTodayUsd: row?.volume_today ?? 0,
        executionPnlTodayUsd: row?.execution_pnl_today ?? 0,
        pendingSignalsCount: pendingRow?.cnt ?? 0,
        pendingSizedOrdersCount: sizedRow?.cnt ?? 0,
        updatedAt: Date.now(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        error: msg,
        tradesToday: 0,
        volumeTodayUsd: 0,
        executionPnlTodayUsd: 0,
        pendingSignalsCount: 0,
        pendingSizedOrdersCount: 0,
        updatedAt: Date.now(),
      });
    }
  };
}
