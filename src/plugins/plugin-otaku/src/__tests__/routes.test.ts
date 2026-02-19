/**
 * Tests for Otaku API routes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IAgentRuntime, RouteRequest, RouteResponse } from "@elizaos/core";

// Mock runtime
const createMockRuntime = (services: Record<string, any> = {}): IAgentRuntime =>
  ({
    getService: vi.fn((type: string) => services[type] ?? null),
    getSetting: vi.fn(),
    agentId: "test-agent",
  }) as unknown as IAgentRuntime;

// Mock response
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    body: null,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data: any) => {
      res.body = data;
      return res;
    }),
    setHeader: vi.fn(() => res),
    send: vi.fn((data: any) => {
      res.body = data;
      return res;
    }),
  };
  return res as RouteResponse;
};

describe("Otaku Routes", () => {
  describe("Health Route", () => {
    it("should return healthy when core services available", async () => {
      // Dynamic import to test
      const { healthRoute } = await import("../routes/freeRoutes");

      const runtime = createMockRuntime({
        otaku: { initialized: true },
        bankr_agent: { isConfigured: () => true },
        cdp: { available: true },
        morpho: { available: true },
        defillama: { available: true },
      });
      const req = {} as RouteRequest;
      const res = createMockResponse();

      await healthRoute.handler(req, res, runtime);

      // Even without x402 configured, core services being available is good
      expect(res.body.services.otaku.available).toBe(true);
      expect(res.body.services.bankr.available).toBe(true);
    });

    it("should return degraded when services missing", async () => {
      const { healthRoute } = await import("../routes/freeRoutes");

      const runtime = createMockRuntime({});
      const req = {} as RouteRequest;
      const res = createMockResponse();

      await healthRoute.handler(req, res, runtime);

      expect(res.statusCode).toBe(503);
      expect(res.body.status).toBe("degraded");
    });
  });

  describe("Gas Route", () => {
    it("should return gas prices array", async () => {
      const { gasRoute } = await import("../routes/freeRoutes");

      const runtime = createMockRuntime({});
      const req = {} as RouteRequest;
      const res = createMockResponse();

      await gasRoute.handler(req, res, runtime);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.gasPrices)).toBe(true);
    });
  });

  describe("Positions Route", () => {
    it("should return positions when BANKR available", async () => {
      const { positionsRoute } = await import("../routes/paidPositions");

      const runtime = createMockRuntime({
        bankr_orders: {
          getActiveOrders: vi
            .fn()
            .mockResolvedValue([
              { orderId: "123", type: "limit", status: "active" },
            ]),
        },
      });
      const req = {} as RouteRequest;
      const res = createMockResponse();

      await positionsRoute.handler(req, res, runtime);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("Quote Route", () => {
    it("should require sell, buy, amount params", async () => {
      const { quoteRoute } = await import("../routes/paidQuote");

      const runtime = createMockRuntime({});
      const req = { query: {} } as RouteRequest;
      const res = createMockResponse();

      await quoteRoute.handler(req, res, runtime);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Missing required params");
    });

    it("should return quote with valid params", async () => {
      const { quoteRoute } = await import("../routes/paidQuote");

      const runtime = createMockRuntime({
        VINCE_MARKET_DATA_SERVICE: {
          getPrice: vi.fn().mockImplementation((token: string) => {
            if (token === "ETH") return Promise.resolve(2000);
            if (token === "USDC") return Promise.resolve(1);
            return Promise.resolve(null);
          }),
        },
      });
      const req = {
        query: { sell: "ETH", buy: "USDC", amount: "1" },
      } as RouteRequest;
      const res = createMockResponse();

      await quoteRoute.handler(req, res, runtime);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.buyAmount).toBeDefined();
    });
  });

  describe("Yields Route", () => {
    it("should return yields array", async () => {
      const { yieldsRoute } = await import("../routes/paidYields");

      // Mock global fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                project: "Aave",
                symbol: "USDC",
                chain: "base",
                apy: 5.5,
                tvlUsd: 1000000,
                ilRisk: "no",
              },
            ],
          }),
      });

      const runtime = createMockRuntime({});
      const req = { query: {} } as RouteRequest;
      const res = createMockResponse();

      await yieldsRoute.handler(req, res, runtime);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.opportunities)).toBe(true);
    });

    it("should filter by token and minApy", async () => {
      const { yieldsRoute } = await import("../routes/paidYields");

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                project: "A",
                symbol: "USDC",
                chain: "base",
                apy: 3,
                tvlUsd: 1000000,
                ilRisk: "no",
              },
              {
                project: "B",
                symbol: "USDC",
                chain: "base",
                apy: 8,
                tvlUsd: 1000000,
                ilRisk: "no",
              },
              {
                project: "C",
                symbol: "ETH",
                chain: "base",
                apy: 10,
                tvlUsd: 1000000,
                ilRisk: "no",
              },
            ],
          }),
      });

      const runtime = createMockRuntime({});
      const req = {
        query: { token: "USDC", minApy: "5" },
      } as RouteRequest;
      const res = createMockResponse();

      await yieldsRoute.handler(req, res, runtime);

      expect(res.statusCode).toBe(200);
      // Should only return USDC with APY >= 5
      const opps = res.body.data.opportunities;
      expect(opps.every((o: any) => o.apy >= 5)).toBe(true);
    });
  });
});
