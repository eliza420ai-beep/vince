/**
 * Tests for desk HTTP route handlers: status, trades, positions.
 */

import { describe, it, expect } from "bun:test";
import { buildDeskStatusHandler } from "../routes/deskStatus";
import { buildDeskTradesHandler } from "../routes/deskTrades";
import { buildDeskPositionsHandler } from "../routes/deskPositions";
import type { IAgentRuntime } from "@elizaos/core";

function mockRes(): {
  statusCode: number;
  body: object | undefined;
  status: (n: number) => { json: (o: object) => void };
  json: (o: object) => void;
} {
  const res: {
    statusCode: number;
    body: object | undefined;
    status: (n: number) => { json: (o: object) => void };
    json: (o: object) => void;
  } = {
    statusCode: 0,
    body: undefined,
    status: (n: number) => ({
      json: (o: object) => {
        res.statusCode = n;
        res.body = o;
      },
    }),
    json: (o: object) => {
      res.body = o;
    },
  };
  return res;
}

const req = { params: {}, query: {} };

describe("plugin-polymarket-desk: desk routes", () => {
  describe("desk/status", () => {
    it("returns 500 and error when no runtime", async () => {
      const statusHandler = buildDeskStatusHandler();
      const res = mockRes();
      await statusHandler(req, res as any, undefined);
      expect(res.statusCode).toBe(500);
      expect((res.body as any).error).toBe("No runtime");
      expect((res.body as any).tradesToday).toBe(0);
      expect((res.body as any).pendingSignalsCount).toBe(0);
    });

    it("returns 200 with zeros and hint when no connection", async () => {
      const runtime = {
        getConnection: async () => null,
      } as unknown as IAgentRuntime;
      const statusHandler = buildDeskStatusHandler();
      const res = mockRes();
      await statusHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      expect((res.body as any).tradesToday).toBe(0);
      expect((res.body as any).pendingSignalsCount).toBe(0);
      expect((res.body as any).hint).toContain("plugin_polymarket_desk");
    });

    it("returns 200 with zeros when connection has no query", async () => {
      const runtime = {
        getConnection: async () => ({}),
      } as unknown as IAgentRuntime;
      const statusHandler = buildDeskStatusHandler();
      const res = mockRes();
      await statusHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      expect((res.body as any).tradesToday).toBe(0);
      expect((res.body as any).pendingSignalsCount).toBe(0);
    });

    it("returns 200 with values from query when connection returns rows", async () => {
      const runtime = {
        getConnection: async () => ({
          query: async (sql: string, _values?: unknown[]) => {
            if (sql.includes("trade_log"))
              return {
                rows: [
                  {
                    trades_today: 3,
                    volume_today: 150,
                    execution_pnl_today: 12.5,
                  },
                ],
              };
            if (sql.includes("signals")) return { rows: [{ cnt: 7 }] };
            return { rows: [] };
          },
        }),
      } as unknown as IAgentRuntime;
      const statusHandler = buildDeskStatusHandler();
      const res = mockRes();
      await statusHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      expect((res.body as any).tradesToday).toBe(3);
      expect((res.body as any).volumeTodayUsd).toBe(150);
      expect((res.body as any).executionPnlTodayUsd).toBe(12.5);
      expect((res.body as any).pendingSignalsCount).toBe(7);
      expect((res.body as any).updatedAt).toBeDefined();
    });
  });

  describe("desk/trades", () => {
    it("returns 500 and error when no runtime", async () => {
      const tradesHandler = buildDeskTradesHandler();
      const res = mockRes();
      await tradesHandler(req, res as any, undefined);
      expect(res.statusCode).toBe(500);
      expect((res.body as any).error).toBe("No runtime");
      expect((res.body as any).trades).toEqual([]);
    });

    it("returns 200 with empty trades and hint when no connection", async () => {
      const runtime = {
        getConnection: async () => null,
      } as unknown as IAgentRuntime;
      const tradesHandler = buildDeskTradesHandler();
      const res = mockRes();
      await tradesHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      expect((res.body as any).trades).toEqual([]);
      expect((res.body as any).hint).toContain("trade_log");
    });

    it("returns 200 with trades array when connection returns trade_log rows", async () => {
      const runtime = {
        getConnection: async () => ({
          query: async () => ({
            rows: [
              {
                id: "t1",
                created_at: "2026-02-20T12:00:00Z",
                market_id: "0xabc",
                side: "YES",
                size_usd: 50,
                arrival_price: 0.52,
                fill_price: 0.51,
              },
            ],
          }),
        }),
      } as unknown as IAgentRuntime;
      const tradesHandler = buildDeskTradesHandler();
      const res = mockRes();
      await tradesHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      expect((res.body as any).trades).toHaveLength(1);
      expect((res.body as any).trades[0].id).toBe("t1");
      expect((res.body as any).trades[0].marketId).toBe("0xabc");
      expect((res.body as any).trades[0].executionPnlUsd).toBeCloseTo(0.5);
      expect((res.body as any).updatedAt).toBeDefined();
    });
  });

  describe("desk/positions", () => {
    it("returns 500 and error when no runtime", async () => {
      const positionsHandler = buildDeskPositionsHandler();
      const res = mockRes();
      await positionsHandler(req, res as any, undefined);
      expect(res.statusCode).toBe(500);
      expect((res.body as any).error).toBe("No runtime");
      expect((res.body as any).positions).toEqual([]);
    });

    it("returns 200 with empty positions and hint when no connection", async () => {
      const runtime = {
        getConnection: async () => null,
      } as unknown as IAgentRuntime;
      const positionsHandler = buildDeskPositionsHandler();
      const res = mockRes();
      await positionsHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      expect((res.body as any).positions).toEqual([]);
      expect((res.body as any).hint).toContain("desk tables");
    });

    it("returns 200 with positions and fallback metadata for null metadata_json", async () => {
      const runtime = {
        getConnection: async () => ({
          query: async () => ({
            rows: [
              {
                id: "order-1",
                created_at: "2026-02-20T12:00:00Z",
                signal_id: "sig-1",
                market_id: "0xmarket1234567890",
                side: "YES",
                size_usd: 50,
                entry_price: 0.485,
                confidence: 1,
                edge_bps: 5125,
                forecast_prob: 1,
                source: "model_fair_value",
                metadata_json: null,
              },
              {
                id: "order-2",
                created_at: "2026-02-20T12:01:00Z",
                signal_id: "sig-2",
                market_id: "0xmarketabcdef",
                side: "YES",
                size_usd: 50,
                entry_price: 0.5,
                confidence: 0.9,
                edge_bps: 200,
                forecast_prob: 0.6,
                source: "synth",
                metadata_json: '{"asset":"BTC","synthSource":"api"}',
              },
            ],
          }),
        }),
        getService: () => null,
      } as unknown as IAgentRuntime;
      const positionsHandler = buildDeskPositionsHandler();
      const res = mockRes();
      await positionsHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      const positions = (res.body as any).positions;
      expect(positions).toHaveLength(2);

      const posNoMeta = positions.find((p: any) => p.id === "order-1");
      expect(posNoMeta).toBeDefined();
      expect(posNoMeta.metadata).toBeDefined();
      expect(posNoMeta.metadata._fallback).toBe(true);
      expect(posNoMeta.metadata.strategy).toBe("model_fair_value");
      expect(posNoMeta.metadata.edge_bps).toBe(5125);
      expect(posNoMeta.metadata.forecast_prob).toBe(1);
      expect(posNoMeta.metadata.entry_price_pct).toBe(48.5);

      const posWithMeta = positions.find((p: any) => p.id === "order-2");
      expect(posWithMeta).toBeDefined();
      expect(posWithMeta.metadata).toEqual({
        asset: "BTC",
        synthSource: "api",
      });
      expect(posWithMeta.metadata._fallback).toBeUndefined();
    });

    it("uses discovery service for currentPrice, question, unrealizedPnl", async () => {
      const runtime = {
        getConnection: async () => ({
          query: async () => ({
            rows: [
              {
                id: "order-1",
                created_at: "2026-02-20T12:00:00Z",
                signal_id: "sig-1",
                market_id: "0xcond123",
                side: "YES",
                size_usd: 50,
                entry_price: 0.48,
                confidence: 1,
                edge_bps: 500,
                forecast_prob: 0.6,
                source: "model_fair_value",
                metadata_json: null,
              },
            ],
          }),
        }),
        getService: () => ({
          getMarketPrices: async () => ({
            yes_price: "0.99",
            no_price: "0.01",
          }),
          getMarketDetail: async () => ({
            question: "Will BTC hit $1M by 2030?",
          }),
        }),
      } as unknown as IAgentRuntime;
      const positionsHandler = buildDeskPositionsHandler();
      const res = mockRes();
      await positionsHandler(req, res as any, runtime);
      expect(res.statusCode).toBe(200);
      const positions = (res.body as any).positions;
      expect(positions).toHaveLength(1);
      expect(positions[0].currentPrice).toBe(0.99);
      expect(positions[0].question).toBe("Will BTC hit $1M by 2030?");
      expect(positions[0].unrealizedPnl).toBeCloseTo((0.99 - 0.48) * 50);
      expect(positions[0].unrealizedPnlPct).toBeGreaterThan(0);
    });
  });
});
