/**
 * FinnhubService API test — Verifies Finnhub API is working.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FinnhubService } from "../services/finnhub.service";
import type { IAgentRuntime } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

const TEST_API_KEY = process.env.FINNHUB_API_KEY || "test_api_key";
const TEST_TICKER = "NVDA"; // Must be in Solus watchlist (SOLUS_OFFCHAIN_STOCKS)

function createTestRuntime(apiKey: string | null): IAgentRuntime {
  return {
    agentId: uuidv4() as any,
    character: { name: "Solus" },
    getSetting: ((key: string) => {
      if (key === "FINNHUB_API_KEY") return apiKey;
      return null;
    }) as any,
  } as unknown as IAgentRuntime;
}

describe("FinnhubService API Test", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Mock fetch for testing without real API
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("isConfigured", () => {
    it("returns true when FINNHUB_API_KEY is set", () => {
      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FinnhubService(runtime);
      expect(service.isConfigured()).toBe(true);
    });

    it("returns false when no API key is set", () => {
      const saved = process.env.FINNHUB_API_KEY;
      delete process.env.FINNHUB_API_KEY;
      try {
        const runtime = createTestRuntime(null);
        const service = new FinnhubService(runtime);
        expect(service.isConfigured()).toBe(false);
      } finally {
        if (saved !== undefined) process.env.FINNHUB_API_KEY = saved;
      }
    });

    it("returns false when API key is empty string", () => {
      const saved = process.env.FINNHUB_API_KEY;
      process.env.FINNHUB_API_KEY = "";
      try {
        const runtime = createTestRuntime("");
        const service = new FinnhubService(runtime);
        expect(service.isConfigured()).toBe(false);
      } finally {
        if (saved !== undefined) process.env.FINNHUB_API_KEY = saved;
        else delete process.env.FINNHUB_API_KEY;
      }
    });
  });

  describe("getQuote (API call)", () => {
    it("should fetch quote successfully when API key is valid", async () => {
      const mockQuote = {
        c: 150.25, // current price
        d: 2.5, // change
        dp: 1.69, // percent change
        h: 152.0, // high
        l: 148.0, // low
        o: 149.0, // open
        pc: 147.75, // previous close
        t: Date.now() / 1000, // timestamp
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockQuote,
      });

      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FinnhubService(runtime);
      const quote = await service.getQuote(TEST_TICKER);

      expect(quote).toEqual(mockQuote);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("https://finnhub.io/api/v1/quote"),
      );
    });

    it("should return null when API returns error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FinnhubService(runtime);
      const quote = await service.getQuote(TEST_TICKER);

      expect(quote).toBeNull();
    });

    it("should return null when no API key is configured", async () => {
      const saved = process.env.FINNHUB_API_KEY;
      delete process.env.FINNHUB_API_KEY;
      try {
        const runtime = createTestRuntime(null);
        const service = new FinnhubService(runtime);
        const quote = await service.getQuote(TEST_TICKER);
        expect(quote).toBeNull();
        expect(global.fetch).not.toHaveBeenCalled();
      } finally {
        if (saved !== undefined) process.env.FINNHUB_API_KEY = saved;
      }
    });
  });

  describe("getCompanyProfile (API call)", () => {
    it("should fetch company profile successfully", async () => {
      const mockProfile = {
        name: "NVIDIA Corporation",
        ticker: TEST_TICKER,
        weburl: "https://www.apple.com",
        logo: "https://logo.clearbit.com/apple.com",
        finnhubIndustry: "Technology",
        marketCapitalization: 2500000,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockProfile,
      });

      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FinnhubService(runtime);
      const profile = await service.getCompanyProfile(TEST_TICKER);

      expect(profile).toEqual(mockProfile);
    });

    it("should return null for invalid response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FinnhubService(runtime);
      const profile = await service.getCompanyProfile(TEST_TICKER);

      expect(profile).toBeNull();
    });
  });

  describe("getCompanyNews (API call)", () => {
    it("should fetch company news successfully", async () => {
      const mockNews = [
        {
          category: "technology",
          datetime: Date.now() / 1000,
          headline: "NVIDIA announces new AI features",
          id: 12345,
          image: "https://example.com/image.jpg",
          related: TEST_TICKER,
          source: "Reuters",
          summary: "Apple Inc. announced new AI features...",
          url: "https://example.com/news",
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockNews,
      });

      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FinnhubService(runtime);
      const news = await service.getCompanyNews(TEST_TICKER, 5);

      expect(news).toEqual(mockNews);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("company-news"),
      );
    });

    it("should return empty array when API returns error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const runtime = createTestRuntime(TEST_API_KEY);
      const service = new FinnhubService(runtime);
      const news = await service.getCompanyNews(TEST_TICKER);

      expect(news).toEqual([]);
    });
  });
});

/**
 * Integration test — Run with: FINNHUB_API_KEY=your_key npm run test:integration
 * This test makes real API calls to Finnhub.
 */
describe("FinnhubService Integration Test", () => {
  const integrationApiKey = process.env.FINNHUB_API_KEY;
  // Skip if no API key provided
  const itOrSkip = integrationApiKey ? it : it.skip;

  itOrSkip(
    "should make real API call to Finnhub",
    async () => {
      const runtime = createTestRuntime(integrationApiKey!);
      const service = new FinnhubService(runtime);
      const ticker = "NVDA"; // Must be in Solus watchlist

      // Test quote endpoint
      const quote = await service.getQuote(ticker);
      console.log("Finnhub quote response:", quote);

      // Should have valid data
      expect(quote).toBeDefined();
      expect(quote?.c).toBeGreaterThan(0); // Current price should be positive

      // Test profile endpoint
      const profile = await service.getCompanyProfile(ticker);
      console.log("Finnhub profile response:", profile);

      expect(profile).toBeDefined();
      expect(profile?.name).toBeDefined();
      expect(profile?.ticker).toBe(ticker);

      // Test news endpoint
      const news = await service.getCompanyNews(ticker, 3);
      console.log("Finnhub news response:", news);

      expect(news).toBeDefined();
      expect(Array.isArray(news)).toBe(true);
    },
    30000,
  ); // 30 second timeout for API calls
});
