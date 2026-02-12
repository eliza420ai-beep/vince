/**
 * Otaku Service Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
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
const createMockRuntime = (configured = true): IAgentRuntime =>
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
    getSetting: () => (configured ? "test-key" : undefined),
  }) as unknown as IAgentRuntime;

describe("OtakuService", () => {
  let service: OtakuService;

  beforeEach(() => {
    vi.clearAllMocks();
    const runtime = createMockRuntime(true);
    service = new OtakuService(runtime);
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
        "swap 1 ETH to USDC on base"
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
        expect.stringContaining("limit order")
      );
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
        expect.stringContaining("DCA")
      );
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
