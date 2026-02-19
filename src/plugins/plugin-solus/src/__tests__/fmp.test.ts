/**
 * FMPService API test — Verifies Financial Modeling Prep API is working.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FMPService } from "../services/fmp.service";
import type { IAgentRuntime } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

const TEST_API_KEY = process.env.FMP_API_KEY || "test_api_key";

function createTestRuntime(apiKey: string | null): IAgentRuntime {
  return {
    agentId: uuidv4() as any,
    character: { name: "Solus" },
    getSetting: ((key: string) => {
      if (key === "FMP_API_KEY") return apiKey;
      return null;
    }) as any,
  } as unknown as IAgentRuntime;
}

describe("FMPService", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("isConfigured", () => {
    it("returns true when FMP_API_KEY is set", () => {
      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FMPService(runtime);
      expect(service.isConfigured()).toBe(true);
    });

    it("returns false when no API key is set", () => {
      const runtime = createTestRuntime(null);
      const service = new FMPService(runtime);
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("getProfile", () => {
    it("should fetch company profile successfully", async () => {
      const mockProfile = {
        symbol: "AAPL",
        companyName: "Apple Inc.",
        price: 150.25,
        mktCap: 2500000000000,
        beta: 1.2,
        industry: "Technology",
        sector: "Consumer Electronics",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockProfile],
      });

      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FMPService(runtime);
      const profile = await service.getProfile("AAPL");

      expect(profile).toEqual(mockProfile);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://financialmodelingprep.com/api/v3/profile/AAPL"),
      );
    });
  });

  describe("getKeyMetrics", () => {
    it("should fetch all key metrics", async () => {
      const mockProfile = { symbol: "AAPL", price: 150, mktCap: 2.5e12, beta: 1.2 };
      const mockIncome = [{ revenueGrowth: 0.1, netProfitMargin: 0.25 }];
      const mockRatios = {
        priceEarningsRatio: 25,
        dividendYield: 0.02,
        debtEquityRatio: 1.5,
        returnOnEquity: 0.5,
      };
      const mockEarnings = [
        { date: "2026-01-15", eps: 2.5, epsEstimate: 2.3, revenue: 120e9, revenueEstimate: 118e9 },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      // Override individual methods
      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FMPService(runtime) as any;

      // Mock the internal methods
      service.getProfile = vi.fn().mockResolvedValue(mockProfile);
      service.getIncomeStatement = vi.fn().mockResolvedValue(mockIncome);
      service.getRatios = vi.fn().mockResolvedValue(mockRatios);
      service.getEarningsCalendar = vi.fn().mockResolvedValue(mockEarnings);

      const metrics = await service.getKeyMetrics("AAPL");

      expect(metrics).not.toBeNull();
      expect(metrics?.price).toBe(150);
      expect(metrics?.peRatio).toBe(25);
      expect(metrics?.dividendYield).toBe(0.02);
      expect(metrics?.revenueGrowth).toBe(0.1);
      expect(metrics?.nextEarnings).toBeDefined();
    });
  });
});

/**
 * Integration test — Run with: FMP_API_KEY=your_key npm run test:integration
 */
describe("FMPService Integration Test", () => {
  const integrationApiKey = process.env.FMP_API_KEY;

  const it.skipIfNoKey = integrationApiKey ? it : it.skip;

  it.skipIfNoKey("should make real API call to FMP", async () => {
    const runtime = createTestRuntime(integrationApiKey!);
    const service = new FMPService(runtime);

    // Test profile endpoint
    const profile = await service.getProfile("AAPL");
    console.log("FMP profile response:", profile);

    expect(profile).toBeDefined();
    expect(profile?.symbol).toBe("AAPL");

    // Test key metrics
    const metrics = await service.getKeyMetrics("NVDA");
    console.log("FMP key metrics:", metrics);

    expect(metrics).toBeDefined();
  }, 30000);
});
