/**
 * Bankr Orders Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { BankrOrdersService } from "../services/bankr-orders.service";
import type { IAgentRuntime } from "@elizaos/core";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock runtime
const createMockRuntime = (
  settings: Record<string, string> = {},
): IAgentRuntime =>
  ({
    getSetting: (key: string) => settings[key],
  }) as unknown as IAgentRuntime;

describe("BankrOrdersService", () => {
  let service: BankrOrdersService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BANKR_API_KEY = "test-api-key";
    const runtime = createMockRuntime({ BANKR_API_KEY: "test-key" });
    service = new BankrOrdersService(runtime);
  });

  afterEach(() => {
    delete process.env.BANKR_API_KEY;
  });

  describe("isConfigured", () => {
    it("should return true when API key is set", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should return false when no API key", () => {
      delete process.env.BANKR_API_KEY;
      const runtime = createMockRuntime({});
      service = new BankrOrdersService(runtime);
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("createQuote", () => {
    it("should create a quote for limit order", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quoteId: "quote-123",
          actions: [
            { type: "approval", to: "0x123", data: "0x456" },
            {
              type: "orderSignature",
              typedData: {
                domain: { name: "Bankr", chainId: 8453 },
                types: {},
                primaryType: "Order",
                message: {},
              },
            },
          ],
          metadata: {
            sellToken: { symbol: "ETH", decimals: 18 },
            buyToken: { symbol: "USDC", decimals: 6 },
          },
        }),
      });

      const result = await service.createQuote({
        maker: "0xmaker123",
        orderType: "limit",
        config: { limitPrice: "3500" },
        chainId: 8453,
        sellToken: "0xETH",
        buyToken: "0xUSDC",
        sellAmount: "1000000000000000000",
        slippageBps: 50,
        expirationDate: Date.now() + 86400000,
      });

      expect(result.quoteId).toBe("quote-123");
      expect(result.actions).toHaveLength(2);
      expect(result.actions[0].type).toBe("approval");
      expect(result.actions[1].type).toBe("orderSignature");
    });

    it("should throw on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Invalid order type" } }),
      });

      await expect(
        service.createQuote({
          maker: "0x123",
          orderType: "invalid",
          config: {},
          chainId: 8453,
          sellToken: "0x1",
          buyToken: "0x2",
          sellAmount: "100",
          slippageBps: 50,
          expirationDate: Date.now(),
        }),
      ).rejects.toThrow("Invalid order type");
    });
  });

  describe("submitOrder", () => {
    it("should submit order with signature", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          order: {
            orderId: "order-456",
            status: "active",
            maker: "0xmaker",
            orderType: "limit",
            chainId: 8453,
            sellToken: "0xETH",
            buyToken: "0xUSDC",
            sellAmount: "1000000000000000000",
          },
        }),
      });

      const result = await service.submitOrder({
        quoteId: "quote-123",
        orderSignature: "0xsignature...",
      });

      expect(result.orderId).toBe("order-456");
      expect(result.status).toBe("active");
    });

    it("should throw when no order in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await expect(
        service.submitOrder({ quoteId: "q", orderSignature: "s" }),
      ).rejects.toThrow("did not include order");
    });
  });

  describe("listOrders", () => {
    it("should list orders for maker", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: [
            { orderId: "order-1", status: "active", orderType: "limit" },
            { orderId: "order-2", status: "filled", orderType: "stop" },
            { orderId: "order-3", status: "active", orderType: "dca" },
          ],
        }),
      });

      const result = await service.listOrders({
        maker: "0xmaker123",
        chainId: 8453,
      });

      expect(result.orders).toHaveLength(3);
      expect(result.orders?.[0].orderType).toBe("limit");
      expect(result.orders?.[2].orderType).toBe("dca");
    });

    it("should filter by status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: [
            { orderId: "order-1", status: "active", orderType: "limit" },
          ],
        }),
      });

      const result = await service.listOrders({
        maker: "0xmaker123",
        status: "active",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            maker: "0xmaker123",
            status: "active",
          }),
        }),
      );
      expect(result.orders).toHaveLength(1);
    });
  });

  describe("getOrder", () => {
    it("should get order by ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          order: {
            orderId: "order-123",
            status: "active",
            maker: "0xmaker",
            orderType: "limit",
          },
        }),
      });

      const result = await service.getOrder("order-123");

      expect(result?.orderId).toBe("order-123");
      expect(result?.status).toBe("active");
    });

    it("should return null for not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "Order not found" } }),
      });

      const result = await service.getOrder("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("cancelOrder", () => {
    it("should cancel order with signature", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await service.cancelOrder("order-123", "0xcancelsig...");

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.bankr.bot/trading/order/cancel/order-123",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ signature: "0xcancelsig..." }),
        }),
      );
    });

    it("should throw on cancel failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: "Cannot cancel filled order" },
        }),
      });

      await expect(service.cancelOrder("order-123", "0xsig")).rejects.toThrow(
        "Cannot cancel filled order",
      );
    });
  });

  describe("order types", () => {
    it("should support limit orders", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quoteId: "q1",
          actions: [{ type: "orderSignature", typedData: {} }],
        }),
      });

      const result = await service.createQuote({
        maker: "0x123",
        orderType: "limit",
        config: { limitPrice: "3500" },
        chainId: 8453,
        sellToken: "0x1",
        buyToken: "0x2",
        sellAmount: "100",
        slippageBps: 50,
        expirationDate: Date.now() + 86400000,
      });

      expect(result.quoteId).toBe("q1");
    });

    it("should support stop orders", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quoteId: "q2",
          actions: [{ type: "orderSignature", typedData: {} }],
        }),
      });

      const result = await service.createQuote({
        maker: "0x123",
        orderType: "stop",
        config: { triggerPrice: "3000" },
        chainId: 8453,
        sellToken: "0x1",
        buyToken: "0x2",
        sellAmount: "100",
        slippageBps: 50,
        expirationDate: Date.now() + 86400000,
      });

      expect(result.quoteId).toBe("q2");
    });

    it("should support DCA orders", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quoteId: "q3",
          actions: [{ type: "orderSignature", typedData: {} }],
        }),
      });

      const result = await service.createQuote({
        maker: "0x123",
        orderType: "dca",
        config: { interval: "1d", numOrders: 30 },
        chainId: 8453,
        sellToken: "0x1",
        buyToken: "0x2",
        sellAmount: "100",
        slippageBps: 50,
        expirationDate: Date.now() + 86400000 * 30,
      });

      expect(result.quoteId).toBe("q3");
    });

    it("should support TWAP orders", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quoteId: "q4",
          actions: [{ type: "orderSignature", typedData: {} }],
        }),
      });

      const result = await service.createQuote({
        maker: "0x123",
        orderType: "twap",
        config: { duration: "4h", numSlices: 24 },
        chainId: 8453,
        sellToken: "0x1",
        buyToken: "0x2",
        sellAmount: "100",
        slippageBps: 50,
        expirationDate: Date.now() + 86400000,
      });

      expect(result.quoteId).toBe("q4");
    });
  });
});
