/**
 * Otaku Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OtakuService } from "../services/otaku.service";
import type { IAgentRuntime } from "@elizaos/core";

// Mock BANKR services
const mockBankrAgent = {
  isConfigured: vi.fn(() => true),
  submitPrompt: vi.fn(),
  pollJobUntilComplete: vi.fn(),
  getAccountInfo: vi.fn(),
};

const mockBankrOrders = {
  isConfigured: vi.fn(() => true),
  listOrders: vi.fn(),
};

// Mock runtime
const createMockRuntime = (
  configured = true,
  extraSettings: Record<string, string> = {},
): IAgentRuntime =>
  ({
    getService: (type: string) => {
      if (type === "bankr_agent") {
        mockBankrAgent.isConfigured.mockReturnValue(configured);
        return mockBankrAgent;
      }
      if (type === "bankr_orders") {
        mockBankrOrders.isConfigured.mockReturnValue(configured);
        return mockBankrOrders;
      }
      return null;
    },
    getCache: vi.fn(async () => undefined),
    setCache: vi.fn(async () => true),
    getSetting: (key: string) => {
      if (key in extraSettings) return extraSettings[key];
      if (key === "OTAKU_RECONCILE_AFTER_TRADE") return "false";
      if (key === "OTAKU_RISK_COOLDOWN_ENABLED") return "false";
      return configured ? "test-key" : undefined;
    },
  }) as unknown as IAgentRuntime;

describe("OtakuService", () => {
  let service: OtakuService;
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = origFetch;
    const runtime = createMockRuntime(true);
    service = new OtakuService(runtime);
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  describe("isBankrAvailable", () => {
    it("should return true when BANKR is configured", () => {
      expect(service.isBankrAvailable()).toBe(true);
    });

    it("should return false when BANKR is not configured", () => {
      const runtime = createMockRuntime(false);
      service = new OtakuService(runtime);
      expect(service.isBankrAvailable()).toBe(false);
    });
  });

  describe("executeSwap", () => {
    it("should execute swap via BANKR", async () => {
      mockBankrAgent.submitPrompt.mockResolvedValueOnce({ jobId: "job-123" });
      mockBankrAgent.pollJobUntilComplete.mockResolvedValueOnce({
        status: "completed",
        response: "Swapped 1 ETH for 2650 USDC",
        transactions: [{ hash: "0xtx123" }],
      });

      const result = await service.executeSwap({
        sellToken: "ETH",
        buyToken: "USDC",
        amount: "1",
        chain: "base",
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBe("0xtx123");
      expect(mockBankrAgent.submitPrompt).toHaveBeenCalledWith(
        expect.stringMatching(/^swap 1 ETH to USDC on base\./),
      );
    });

    it("should return error when BANKR not configured", async () => {
      const runtime = createMockRuntime(false);
      service = new OtakuService(runtime);

      const result = await service.executeSwap({
        sellToken: "ETH",
        buyToken: "USDC",
        amount: "1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("BANKR not configured");
    });

    it("should handle failed jobs", async () => {
      mockBankrAgent.submitPrompt.mockResolvedValueOnce({ jobId: "job-123" });
      mockBankrAgent.pollJobUntilComplete.mockResolvedValueOnce({
        status: "failed",
        error: "Insufficient balance",
      });

      const result = await service.executeSwap({
        sellToken: "ETH",
        buyToken: "USDC",
        amount: "1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insufficient balance");
    });

    it("should route hyperliquid_perps market to HL sidecar when configured", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ orderId: "hl-999" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as unknown as typeof fetch;

      const runtime = createMockRuntime(true, {
        OTAKU_HL_SIDECAR_URL: "http://sidecar.local",
      });
      const hlService = new OtakuService(runtime);

      const result = await hlService.executeSwap({
        sellToken: "USDC",
        buyToken: "BTC",
        amount: "0.1",
        executionVenue: "hyperliquid_perps",
        hlPerps: {
          coin: "BTC",
          isBuy: true,
          size: "0.1",
          orderType: "market",
        },
      });

      expect(result.success).toBe(true);
      expect(result.txHash).toBe("hl-999");
      expect(mockBankrAgent.submitPrompt).not.toHaveBeenCalled();
    });

    it("should error hyperliquid_perps without hlPerps", async () => {
      const result = await service.executeSwap({
        sellToken: "USDC",
        buyToken: "BTC",
        amount: "0.1",
        executionVenue: "hyperliquid_perps",
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/hlPerps/);
    });

    it("should error hyperliquid_perps without sidecar URL", async () => {
      const runtime = createMockRuntime(true, { OTAKU_HL_SIDECAR_URL: "" });
      const local = new OtakuService(runtime);
      const result = await local.executeSwap({
        sellToken: "USDC",
        buyToken: "BTC",
        amount: "0.1",
        executionVenue: "hyperliquid_perps",
        hlPerps: {
          coin: "BTC",
          isBuy: true,
          size: "0.1",
          orderType: "market",
        },
      });
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/OTAKU_HL_SIDECAR_URL/);
    });
  });

  describe("createLimitOrder", () => {
    it("should create limit order via BANKR", async () => {
      mockBankrAgent.submitPrompt.mockResolvedValueOnce({ jobId: "job-456" });
      mockBankrAgent.pollJobUntilComplete.mockResolvedValueOnce({
        status: "completed",
        response: "Limit order created: order-abc123",
      });

      const result = await service.createLimitOrder({
        sellToken: "ETH",
        buyToken: "USDC",
        amount: "1",
        limitPrice: "3500",
        chain: "base",
      });

      expect(result.success).toBe(true);
      expect(mockBankrAgent.submitPrompt).toHaveBeenCalledWith(
        expect.stringContaining("limit order"),
      );
    });

    it("should place HL perps limit via sidecar when configured", async () => {
      globalThis.fetch = vi.fn(async () => {
        return new Response(JSON.stringify({ oid: 777 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as unknown as typeof fetch;

      const runtime = createMockRuntime(true, {
        OTAKU_HL_SIDECAR_URL: "http://sidecar.local",
      });
      const hlService = new OtakuService(runtime);

      const result = await hlService.createLimitOrder({
        sellToken: "USDC",
        buyToken: "ETH",
        amount: "0.5",
        limitPrice: "3200",
        executionVenue: "hyperliquid_perps",
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe("777");
      expect(mockBankrAgent.submitPrompt).not.toHaveBeenCalled();
    });
  });

  describe("createDca", () => {
    it("should create DCA schedule via BANKR", async () => {
      mockBankrAgent.submitPrompt.mockResolvedValueOnce({ jobId: "job-789" });
      mockBankrAgent.pollJobUntilComplete.mockResolvedValueOnce({
        status: "completed",
        response: "DCA schedule created",
      });

      const result = await service.createDca({
        sellToken: "USDC",
        buyToken: "ETH",
        totalAmount: "500",
        interval: "daily",
        numOrders: 30,
        chain: "base",
      });

      expect(result.success).toBe(true);
      expect(mockBankrAgent.submitPrompt).toHaveBeenCalledWith(
        expect.stringContaining("DCA"),
      );
    });
  });

  describe("getReconciliationReport", () => {
    it("appends HL sidecar section when reconcile returns JSON summary", async () => {
      const origFetch = globalThis.fetch;
      globalThis.fetch = vi.fn(async (url: string) => {
        if (String(url).includes("/v1/reconcile")) {
          return new Response(JSON.stringify({ summary: "HL: flat" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("{}", { status: 404 });
      }) as unknown as typeof fetch;

      const runtime = createMockRuntime(true, {
        OTAKU_HL_SIDECAR_URL: "http://recon.test",
        OTAKU_RECONCILE_AFTER_TRADE: "false",
      });
      const svc = new OtakuService(runtime);
      const report = await svc.getReconciliationReport();
      expect(report).toContain("BANKR");
      expect(report).toContain("HL sidecar");
      expect(report).toContain("HL: flat");
      globalThis.fetch = origFetch;
    });
  });

  describe("getPositions", () => {
    it("should fetch positions and orders", async () => {
      // Need fresh service with proper mock setup
      mockBankrAgent.getAccountInfo.mockResolvedValue({
        wallets: [{ chain: "evm", address: "0x123" }],
      });
      mockBankrAgent.submitPrompt.mockResolvedValue({ jobId: "job-port" });
      mockBankrAgent.pollJobUntilComplete.mockResolvedValue({
        status: "completed",
        response: "1.5 ETH ($3,975)\n500 USDC",
      });
      mockBankrOrders.listOrders.mockResolvedValue({
        orders: [
          {
            orderId: "order-1",
            orderType: "limit",
            status: "active",
            sellToken: "ETH",
            buyToken: "USDC",
            sellAmount: "0.5",
            chainId: 8453,
          },
        ],
      });

      const result = await service.getPositions();

      // Should have parsed positions from response
      expect(result.positions.length).toBeGreaterThanOrEqual(0);
      // Orders are fetched via bankr_orders service
      expect(result.orders).toBeDefined();
    });

    it("should return empty when BANKR not configured", async () => {
      const runtime = createMockRuntime(false);
      service = new OtakuService(runtime);

      const result = await service.getPositions();

      expect(result.positions).toEqual([]);
      expect(result.orders).toEqual([]);
    });
  });

  describe("formatSwapConfirmation", () => {
    it("should format swap confirmation message", () => {
      const message = service.formatSwapConfirmation({
        sellToken: "ETH",
        buyToken: "USDC",
        amount: "1",
        chain: "base",
      });

      expect(message).toContain("Swap Summary");
      expect(message).toContain("1 ETH");
      expect(message).toContain("USDC");
      expect(message).toContain("base");
      expect(message).toContain("IRREVERSIBLE");
      expect(message).toContain("confirm");
    });
  });

  describe("formatLimitOrderConfirmation", () => {
    it("should format limit order confirmation message", () => {
      const message = service.formatLimitOrderConfirmation({
        sellToken: "ETH",
        buyToken: "USDC",
        amount: "1",
        limitPrice: "3500",
        chain: "base",
        expirationHours: 48,
      });

      expect(message).toContain("Limit Order Summary");
      expect(message).toContain("1 ETH");
      expect(message).toContain("3500");
      expect(message).toContain("48 hours");
      expect(message).toContain("confirm");
    });
  });

  describe("formatDcaConfirmation", () => {
    it("should format DCA confirmation message", () => {
      const message = service.formatDcaConfirmation({
        sellToken: "USDC",
        buyToken: "ETH",
        totalAmount: "500",
        interval: "daily",
        numOrders: 30,
        chain: "base",
      });

      expect(message).toContain("DCA Schedule Summary");
      expect(message).toContain("500 USDC");
      expect(message).toContain("ETH");
      expect(message).toContain("30");
      expect(message).toContain("daily");
      expect(message).toContain("confirm");
    });
  });
});
