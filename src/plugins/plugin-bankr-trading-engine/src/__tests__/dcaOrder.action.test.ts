/**
 * Tests for OTAKU_DCA action
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { dcaOrderAction } from "../actions/dcaOrder.action";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";

// Mock trading engine service
const mockTradingEngine = {
  isConfigured: vi.fn(() => true),
  createDCAOrder: vi.fn(),
};

// Mock runtime
const createMockRuntime = (): IAgentRuntime =>
  ({
    getService: vi.fn((name: string) => {
      if (name === "bankr_trading_engine") return mockTradingEngine;
      return null;
    }),
    getSetting: vi.fn(),
  }) as unknown as IAgentRuntime;

// Mock memory
const createMockMemory = (text: string): Memory =>
  ({
    content: { text },
    userId: "test-user",
    roomId: "test-room",
    agentId: "test-agent",
  }) as Memory;

describe("OTAKU_DCA Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validate", () => {
    it("should validate DCA intent", async () => {
      const runtime = createMockRuntime();

      const validMessages = [
        "DCA $1000 into ETH over 7 days",
        "dollar cost average $500 into WBTC",
        "recurring buy of $100 ETH over 30 days",
        "auto buy $2000 into WETH over 2 weeks",
      ];

      for (const text of validMessages) {
        const memory = createMockMemory(text);
        const result = await dcaOrderAction.validate(runtime, memory);
        expect(result).toBe(true);
      }
    });

    it("should reject non-DCA messages", async () => {
      const runtime = createMockRuntime();

      const invalidMessages = [
        "buy 1 ETH",
        "swap 100 USDC for ETH",
        "what is DCA?",
        "limit order at $2000",
      ];

      for (const text of invalidMessages) {
        const memory = createMockMemory(text);
        const result = await dcaOrderAction.validate(runtime, memory);
        expect(result).toBe(false);
      }
    });

    it("should reject when service not configured", async () => {
      mockTradingEngine.isConfigured.mockReturnValue(false);
      const runtime = createMockRuntime();
      const memory = createMockMemory("DCA $1000 into ETH");

      const result = await dcaOrderAction.validate(runtime, memory);
      expect(result).toBe(false);
    });
  });

  describe("handler - parse DCA requests", () => {
    it("should parse basic DCA request", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory("DCA $1000 into ETH over 7 days");
      const callback = vi.fn();

      await dcaOrderAction.handler(
        runtime,
        memory,
        undefined,
        undefined,
        callback,
      );

      expect(callback).toHaveBeenCalled();
      const response = callback.mock.calls[0][0].text;
      expect(response).toContain("DCA Order Preview");
      expect(response).toContain("$1,000");
      expect(response).toContain("WETH");
      expect(response).toContain("7 buys");
    });

    it("should parse custom execution count", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory("DCA $500 into WBTC, 10 buys");
      const callback = vi.fn();

      await dcaOrderAction.handler(
        runtime,
        memory,
        undefined,
        undefined,
        callback,
      );

      const response = callback.mock.calls[0][0].text;
      expect(response).toContain("10 buys");
      expect(response).toContain("$50");
    });

    it("should parse custom interval", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory("DCA $1000 into ETH every 4 hours");
      const callback = vi.fn();

      await dcaOrderAction.handler(
        runtime,
        memory,
        undefined,
        undefined,
        callback,
      );

      const response = callback.mock.calls[0][0].text;
      expect(response).toContain("4");
      expect(response).toContain("hour");
    });

    it("should reject unknown tokens", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory(
        "DCA $1000 into UNKNOWNTOKEN over 7 days",
      );
      const callback = vi.fn();

      await dcaOrderAction.handler(
        runtime,
        memory,
        undefined,
        undefined,
        callback,
      );

      const response = callback.mock.calls[0][0].text;
      expect(response).toContain("couldn't parse");
    });
  });

  describe("handler - execute DCA orders", () => {
    it("should execute on confirmation", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory("confirm");
      const callback = vi.fn();

      // Simulate pending DCA in state
      const state: State = {
        pendingDCA: {
          totalAmount: "1000",
          buyToken: "0x4200000000000000000000000000000000000006",
          sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          executionCount: 7,
          intervalMinutes: 1440,
        },
      } as unknown as State;

      mockTradingEngine.createDCAOrder.mockResolvedValue({
        orderId: "test-order-123",
        status: "open",
        sellToken: { amount: { formatted: "1000" } },
        buyToken: { symbol: "WETH" },
      });

      await dcaOrderAction.handler(runtime, memory, state, undefined, callback);

      expect(mockTradingEngine.createDCAOrder).toHaveBeenCalledWith({
        sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        buyToken: "0x4200000000000000000000000000000000000006",
        totalAmount: "1000",
        executionCount: 7,
        intervalMinutes: 1440,
      });

      const response =
        callback.mock.calls[callback.mock.calls.length - 1][0].text;
      expect(response).toContain("DCA Order Created");
      expect(response).toContain("test-order-123");
    });

    it("should handle execution errors gracefully", async () => {
      const runtime = createMockRuntime();
      const memory = createMockMemory("confirm");
      const callback = vi.fn();

      const state: State = {
        pendingDCA: {
          totalAmount: "1000",
          buyToken: "0x4200000000000000000000000000000000000006",
          sellToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          executionCount: 7,
          intervalMinutes: 1440,
        },
      } as unknown as State;

      mockTradingEngine.createDCAOrder.mockRejectedValue(
        new Error("Insufficient balance"),
      );

      await dcaOrderAction.handler(runtime, memory, state, undefined, callback);

      const response =
        callback.mock.calls[callback.mock.calls.length - 1][0].text;
      expect(response).toContain("Failed");
      expect(response).toContain("Insufficient balance");
    });
  });
});
