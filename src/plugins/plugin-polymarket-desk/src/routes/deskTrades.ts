/**
 * GET /desk/trades
 * Returns recent Polymarket desk fills (trade_log) for the leaderboard.
 * Enriches with: strategy (from desk signals), market question (from edge_signals
 * when available, otherwise discovery), current price + mtm P&L (from discovery),
 * and Polymarket URL (from slug).
 * Use Oracle agent ID: /api/agents/:agentId/plugins/polymarket-desk/desk/trades
 */

import type { IAgentRuntime } from "@elizaos/core";

const DEFAULT_LIMIT = 50;
const MAX_MARKETS_TO_ENRICH = 25;
const DESK_SIGNALS_TABLE = "plugin_polymarket_desk.signals";

interface TradeLogRow {
  id: string;
  created_at: string | Date;
  market_id: string;
  side: string;
  size_usd: number;
  arrival_price: number | null;
  fill_price: number;
  signal_id: string;
  source: string | null;
  edge_bps: number | null;
  forecast_prob: number | null;
  market_price: number | null;
}

interface MarketEnrichment {
  question: string | null;
  marketUrl: string | null;
  currentPrice: number | null;
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
        query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
      };

      // Primary query: trade_log LEFT JOIN desk signals (same schema, always exists)
      const result = await client.query(
        `SELECT t.id, t.created_at, t.market_id, t.side, t.size_usd,
                t.arrival_price, t.fill_price, t.signal_id,
                s.source, s.edge_bps, s.forecast_prob, s.market_price
         FROM plugin_polymarket_desk.trade_log t
         LEFT JOIN ${DESK_SIGNALS_TABLE} s ON s.id = t.signal_id
         ORDER BY t.created_at DESC
         LIMIT $1`,
        [limit],
      );
      const rows: TradeLogRow[] = result?.rows ?? [];

      // Best-effort: get questions from edge_signals (different schema, may not exist)
      const questionMap = new Map<string, string>();
      if (rows.length > 0) {
        try {
          const signalIds = [
            ...new Set(rows.map((r) => r.signal_id).filter(Boolean)),
          ];
          if (signalIds.length > 0) {
            const placeholders = signalIds.map((_, i) => `$${i + 1}`).join(",");
            const qResult = await client.query(
              `SELECT desk_signal_id, question FROM plugin_polymarket_edge.edge_signals
               WHERE desk_signal_id IN (${placeholders}) AND question IS NOT NULL`,
              signalIds,
            );
            for (const row of qResult?.rows ?? []) {
              if (row.desk_signal_id && row.question) {
                questionMap.set(row.desk_signal_id, row.question);
              }
            }
          }
        } catch {
          // edge schema may not exist on this runtime — that's fine
        }
      }

      // Enrich with discovery: current prices (for mtm P&L) and slug (for links)
      const discoveryService = agentRuntime.getService(
        "POLYMARKET_DISCOVERY_SERVICE",
      ) as {
        getMarketDetail?: (conditionId: string) => Promise<{
          question?: string;
          slug?: string;
          market_slug?: string;
          eventSlug?: string;
          eventId?: string;
        }>;
        getMarketPrices?: (conditionId: string) => Promise<{
          yes_price: string;
          no_price: string;
        }>;
      } | null;

      const enrichmentMap = new Map<string, MarketEnrichment>();

      if (discoveryService && rows.length > 0) {
        const uniqueIds = [...new Set(rows.map((r) => r.market_id))].slice(
          0,
          MAX_MARKETS_TO_ENRICH,
        );

        await Promise.all(
          uniqueIds.map(async (marketId) => {
            const enrichment: MarketEnrichment = {
              question: null,
              marketUrl: null,
              currentPrice: null,
            };
            try {
              if (discoveryService.getMarketPrices) {
                const prices = await discoveryService.getMarketPrices.call(
                  discoveryService,
                  marketId,
                );
                const yesPrice = parseFloat(prices.yes_price);
                if (Number.isFinite(yesPrice))
                  enrichment.currentPrice = yesPrice;
              }
            } catch {
              // no live price
            }
            try {
              if (discoveryService.getMarketDetail) {
                const detail = await discoveryService.getMarketDetail.call(
                  discoveryService,
                  marketId,
                );
                if (detail?.question) enrichment.question = detail.question;
                const slug = detail?.slug || detail?.market_slug;
                if (slug) {
                  enrichment.marketUrl = `https://polymarket.com/market/${slug}`;
                } else if (detail?.eventSlug) {
                  enrichment.marketUrl = detail.eventId
                    ? `https://polymarket.com/event/${detail.eventSlug}-${detail.eventId}`
                    : `https://polymarket.com/event/${detail.eventSlug}`;
                }
              }
            } catch {
              // no detail
            }
            enrichmentMap.set(marketId, enrichment);
          }),
        );
      }

      const trades = rows.map((r) => {
        const side = (r.side?.toUpperCase() === "NO" ? "NO" : "YES") as
          | "YES"
          | "NO";
        const fillPrice = r.fill_price;
        const arrival = r.arrival_price ?? fillPrice;
        const executionPnlUsd = (arrival - fillPrice) * r.size_usd;
        const isPaperFill = Math.abs(executionPnlUsd) < 0.005 && arrival !== 0;

        const strategy = r.source ?? "—";
        const edgeBps = r.edge_bps != null ? Number(r.edge_bps) : null;
        const forecastProb =
          r.forecast_prob != null ? Number(r.forecast_prob) : null;
        const entryPct =
          r.market_price != null
            ? Math.round(Number(r.market_price) * 1000) / 10
            : null;
        const strategyWhy =
          [
            edgeBps != null ? `${edgeBps} bps edge` : null,
            forecastProb != null
              ? `forecast ${(forecastProb * 100).toFixed(0)}%`
              : null,
            entryPct != null ? `entry ${entryPct}%` : null,
          ]
            .filter(Boolean)
            .join(", ") || undefined;

        const enrichment = enrichmentMap.get(r.market_id);
        // Question priority: edge_signals > discovery > fallback
        const question =
          questionMap.get(r.signal_id) ?? enrichment?.question ?? undefined;

        // Mark-to-market P&L: (currentPrice - entryPrice) * size for YES
        let mtmPnlUsd: number | null = null;
        if (enrichment?.currentPrice != null) {
          const currentPrice =
            side === "YES"
              ? enrichment.currentPrice
              : 1 - enrichment.currentPrice;
          const entryPrice = side === "YES" ? fillPrice : 1 - fillPrice;
          mtmPnlUsd =
            Math.round((currentPrice - entryPrice) * r.size_usd * 100) / 100;
        }

        return {
          id: r.id,
          createdAt:
            typeof r.created_at === "string"
              ? r.created_at
              : r.created_at instanceof Date
                ? r.created_at.toISOString()
                : String(r.created_at ?? ""),
          marketId: r.market_id,
          question,
          eventUrl: enrichment?.marketUrl ?? null,
          side,
          sizeUsd: r.size_usd,
          arrivalPrice: r.arrival_price,
          fillPrice,
          executionPnlUsd: isPaperFill ? null : executionPnlUsd,
          mtmPnlUsd,
          currentPrice: enrichment?.currentPrice ?? null,
          strategy,
          strategyWhy,
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
