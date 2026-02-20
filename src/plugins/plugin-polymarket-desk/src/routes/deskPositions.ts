/**
 * GET /desk/positions
 * Returns open paper positions (pending sized orders) with live prices and P&L.
 * Use Oracle agent ID: /api/agents/:agentId/plugins/polymarket-desk/desk/positions
 */

import type { IAgentRuntime } from "@elizaos/core";

const SIZED_ORDERS_TABLE = "plugin_polymarket_desk.sized_orders";
const SIGNALS_TABLE = "plugin_polymarket_desk.signals";
const POLYMARKET_DISCOVERY_SERVICE = "POLYMARKET_DISCOVERY_SERVICE";

interface PendingRow {
  id: string;
  created_at: string | Date;
  signal_id: string;
  market_id: string;
  side: string;
  size_usd: number;
  entry_price: number | null;
  confidence: number | null;
  edge_bps: number | null;
  forecast_prob: number | null;
  source: string | null;
  metadata_json: string | null;
}

interface MarketPrices {
  yes_price: string;
  no_price: string;
}

export interface PolymarketPaperPosition {
  id: string;
  signalId: string;
  marketId: string;
  question: string;
  side: "YES" | "NO";
  sizeUsd: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  openedAt: string;
  strategy: string;
  edgeBps: number;
  confidence: number;
  forecastProb: number;
  metadata: Record<string, unknown> | null;
}

export function buildDeskPositionsHandler() {
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
        positions: [],
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
          query: (s: string, v?: unknown[]) => Promise<{ rows: unknown[] }>;
        }
      ).query !== "function"
    ) {
      res.status(200).json({
        positions: [],
        updatedAt: Date.now(),
        hint: "Database not configured; desk tables in plugin_polymarket_desk",
      });
      return;
    }

    const client = conn as {
      query: (
        text: string,
        values?: unknown[],
      ) => Promise<{ rows: PendingRow[] }>;
    };

    const discoveryService = agentRuntime.getService(
      POLYMARKET_DISCOVERY_SERVICE,
    ) as {
      getMarketPrices?: (conditionId: string) => Promise<MarketPrices>;
      getMarketDetail?: (conditionId: string) => Promise<{ question?: string }>;
    } | null;

    try {
      const result = await client.query(
        `SELECT so.id, so.created_at, so.signal_id, so.market_id, so.side, so.size_usd,
                s.market_price AS entry_price, s.confidence, s.edge_bps, s.forecast_prob, s.source, s.metadata_json
         FROM ${SIZED_ORDERS_TABLE} so
         JOIN ${SIGNALS_TABLE} s ON s.id = so.signal_id
         WHERE so.status = 'pending'
         ORDER BY so.created_at ASC`,
        [],
      );
      const rows = result?.rows ?? [];

      const positions: PolymarketPaperPosition[] = [];
      for (const r of rows) {
        const entryPrice = Number(r.entry_price) ?? 0.5;
        const side = (r.side?.toUpperCase() === "NO" ? "NO" : "YES") as
          | "YES"
          | "NO";
        let currentPrice = entryPrice;
        let question = r.market_id.slice(0, 14) + "…";

        if (
          discoveryService?.getMarketPrices &&
          discoveryService?.getMarketDetail
        ) {
          try {
            const [prices, detail] = await Promise.all([
              discoveryService.getMarketPrices(r.market_id),
              discoveryService.getMarketDetail(r.market_id).catch(() => null),
            ]);
            const yesPrice = parseFloat(prices.yes_price) || 0.5;
            const noPrice = parseFloat(prices.no_price) || 0.5;
            currentPrice = side === "YES" ? yesPrice : noPrice;
            if (detail?.question) question = detail.question;
          } catch {
            // Keep entry as current; question stays truncated
          }
        }

        const entryPriceForSide = side === "YES" ? entryPrice : 1 - entryPrice;
        const unrealizedPnl =
          side === "YES"
            ? (currentPrice - entryPrice) * r.size_usd
            : (currentPrice - (1 - entryPrice)) * r.size_usd;
        const unrealizedPnlPct =
          entryPriceForSide !== 0
            ? (unrealizedPnl / (entryPriceForSide * r.size_usd)) * 100
            : 0;

        let metadata: Record<string, unknown> | null = null;
        if (r.metadata_json) {
          try {
            metadata = JSON.parse(r.metadata_json) as Record<string, unknown>;
          } catch {
            // ignore
          }
        }

        positions.push({
          id: r.id,
          signalId: r.signal_id,
          marketId: r.market_id,
          question,
          side,
          sizeUsd: r.size_usd,
          entryPrice,
          currentPrice,
          unrealizedPnl,
          unrealizedPnlPct,
          openedAt:
            typeof r.created_at === "string"
              ? r.created_at
              : r.created_at instanceof Date
                ? r.created_at.toISOString()
                : String(r.created_at ?? ""),
          strategy: r.source ?? "unknown",
          edgeBps: Number(r.edge_bps) ?? 0,
          confidence: Number(r.confidence) ?? 0,
          forecastProb: Number(r.forecast_prob) ?? 0,
          metadata,
        });
      }

      res.status(200).json({
        positions,
        updatedAt: Date.now(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({
        positions: [],
        updatedAt: Date.now(),
        error: msg,
      });
    }
  };
}
