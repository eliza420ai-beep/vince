/**
 * Dashboard BANKR Route Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildBankrResponse,
  formatBankrDashboard,
  type BankrResponse,
} from "../routes/dashboardBankr";
import type { IAgentRuntime } from "@elizaos/core";

// Mock BANKR services
const mockBankrAgent = {
  isConfigured: vi.fn(() => true),
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
        return configured ? mockBankrAgent : null;
      }
      if (type === "bankr_orders") {
        mockBankrOrders.isConfigured.mockReturnValue(configured);
        return configured ? mockBankrOrders : null;
      }
      return null;
    },
  }) as unknown as IAgentRuntime;

describe("buildBankrResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not configured when BANKR unavailable", async () => {
    const runtime = createMockRuntime(false);
    const result = await buildBankrResponse(runtime);

    expect(result.configured).toBe(false);
    expect(result.error).toContain("not configured");
  });

  it("should return wallets and orders when configured", async () => {
    mockBankrAgent.getAccountInfo.mockResolvedValueOnce({
      wallets: [
        { chain: "evm", address: "0x1234567890abcdef1234567890abcdef12345678" },
        { chain: "solana", address: "ABC123DEF456GHI789" },
      ],
      bankrClub: { active: true, subscriptionType: "monthly" },
      leaderboard: { rank: 42, score: 1000 },
    });

    mockBankrOrders.listOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: "order-1",
          orderType: "limit",
          status: "active",
          sellToken: "ETH",
          buyToken: "USDC",
          sellAmount: "1.0",
          limitPrice: "3500",
          chainId: 8453,
        },
        {
          orderId: "order-2",
          orderType: "dca",
          status: "active",
          sellToken: "USDC",
          buyToken: "ETH",
          sellAmount: "100",
          chainId: 8453,
        },
      ],
    });

    const runtime = createMockRuntime(true);
    const result = await buildBankrResponse(runtime);

    expect(result.configured).toBe(true);
    expect(result.wallets).toHaveLength(2);
    expect(result.wallets[0].chain).toBe("evm");
    expect(result.wallets[0].shortAddress).toBe("0x1234...5678");

    expect(result.orders).toHaveLength(2);
    expect(result.orderSummary.total).toBe(2);
    expect(result.orderSummary.limit).toBe(1);
    expect(result.orderSummary.dca).toBe(1);

    expect(result.bankrClub?.active).toBe(true);
    expect(result.bankrClub?.subscriptionType).toBe("monthly");

    expect(result.leaderboard?.rank).toBe(42);
  });

  it("should handle no orders gracefully", async () => {
    mockBankrAgent.getAccountInfo.mockResolvedValueOnce({
      wallets: [{ chain: "evm", address: "0x123" }],
    });

    mockBankrOrders.listOrders.mockResolvedValueOnce({
      orders: [],
    });

    const runtime = createMockRuntime(true);
    const result = await buildBankrResponse(runtime);

    expect(result.orders).toHaveLength(0);
    expect(result.orderSummary.total).toBe(0);
  });

  it("should handle API errors gracefully", async () => {
    mockBankrAgent.getAccountInfo.mockRejectedValueOnce(
      new Error("API timeout")
    );

    const runtime = createMockRuntime(true);
    const result = await buildBankrResponse(runtime);

    expect(result.configured).toBe(true);
    expect(result.error).toContain("API timeout");
  });

  it("should handle order fetch errors gracefully", async () => {
    mockBankrAgent.getAccountInfo.mockResolvedValueOnce({
      wallets: [{ chain: "evm", address: "0x123" }],
    });

    mockBankrOrders.listOrders.mockRejectedValueOnce(
      new Error("Order API error")
    );

    const runtime = createMockRuntime(true);
    const result = await buildBankrResponse(runtime);

    // Should still return account info, just no orders
    expect(result.configured).toBe(true);
    expect(result.wallets).toHaveLength(1);
    expect(result.orders).toHaveLength(0);
  });
});

describe("formatBankrDashboard", () => {
  it("should format not configured state", () => {
    const data: BankrResponse = {
      configured: false,
      wallets: [],
      orders: [],
      orderSummary: { total: 0, limit: 0, stop: 0, dca: 0, twap: 0 },
      bankrClub: null,
      leaderboard: null,
      updatedAt: Date.now(),
    };

    const output = formatBankrDashboard(data);
    expect(output).toContain("Not configured");
  });

  it("should format error state", () => {
    const data: BankrResponse = {
      configured: true,
      wallets: [],
      orders: [],
      orderSummary: { total: 0, limit: 0, stop: 0, dca: 0, twap: 0 },
      bankrClub: null,
      leaderboard: null,
      error: "Something went wrong",
      updatedAt: Date.now(),
    };

    const output = formatBankrDashboard(data);
    expect(output).toContain("Error");
    expect(output).toContain("Something went wrong");
  });

  it("should format complete dashboard", () => {
    const data: BankrResponse = {
      configured: true,
      wallets: [
        { chain: "evm", address: "0x123...", shortAddress: "0x12...23" },
        { chain: "solana", address: "ABC...", shortAddress: "AB...BC" },
      ],
      orders: [
        {
          orderId: "o1",
          orderType: "limit",
          status: "active",
          sellToken: "ETH",
          buyToken: "USDC",
          sellAmount: "1.0",
          limitPrice: "3500",
        },
        {
          orderId: "o2",
          orderType: "dca",
          status: "active",
          sellToken: "USDC",
          buyToken: "ETH",
          sellAmount: "100",
        },
      ],
      orderSummary: { total: 2, limit: 1, stop: 0, dca: 1, twap: 0 },
      bankrClub: { active: true, subscriptionType: "monthly" },
      leaderboard: { rank: 42, score: 1000 },
      updatedAt: Date.now(),
    };

    const output = formatBankrDashboard(data);

    expect(output).toContain("BANKR Dashboard");
    expect(output).toContain("Wallets");
    expect(output).toContain("EVM");
    expect(output).toContain("SOLANA");
    expect(output).toContain("Bankr Club");
    expect(output).toContain("Active");
    expect(output).toContain("monthly");
    expect(output).toContain("Rank #42");
    expect(output).toContain("LIMIT");
    expect(output).toContain("DCA");
    expect(output).toContain("ETH");
    expect(output).toContain("USDC");
  });

  it("should handle empty orders", () => {
    const data: BankrResponse = {
      configured: true,
      wallets: [{ chain: "evm", address: "0x123", shortAddress: "0x1...3" }],
      orders: [],
      orderSummary: { total: 0, limit: 0, stop: 0, dca: 0, twap: 0 },
      bankrClub: null,
      leaderboard: null,
      updatedAt: Date.now(),
    };

    const output = formatBankrDashboard(data);
    expect(output).toContain("No active orders");
  });
});
