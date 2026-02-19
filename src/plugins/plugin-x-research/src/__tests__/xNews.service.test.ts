/**
 * X News Service Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { XNewsService, getXNewsService } from "../services/xNews.service";
import type { XNewsItem } from "../types/news.types";

// Mock the xClient
vi.mock("../services/xClient.service", () => ({
  getXClient: vi.fn(() => mockClient),
}));

const mockClient = {
  searchNews: vi.fn(),
  getTweets: vi.fn(),
};

describe("XNewsService", () => {
  let service: XNewsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new XNewsService(mockClient as any);
  });

  describe("searchNews", () => {
    it("should search news and enrich results", async () => {
      const mockNews: XNewsItem[] = [
        createMockNews(
          "BTC ETF Sees Record Inflows",
          "BlackRock ETF hits $1B",
          ["BTC"],
        ),
        createMockNews("Ethereum L2 Growth", "Layer 2 TVL reaches ATH", [
          "ETH",
        ]),
      ];

      mockClient.searchNews.mockResolvedValue({ data: mockNews });

      const results = await service.searchNews("crypto", { maxResults: 10 });

      expect(results.length).toBe(2);
      expect(results[0].relevanceScore).toBeDefined();
      expect(results[0].sentiment).toBeDefined();
      expect(results[0].impactLevel).toBeDefined();
    });

    it("should return empty for no results", async () => {
      mockClient.searchNews.mockResolvedValue({ data: [] });

      const results = await service.searchNews("random_query");

      expect(results.length).toBe(0);
    });
  });

  describe("getTickerNews", () => {
    it("should search for focus tickers by default", async () => {
      mockClient.searchNews.mockResolvedValue({ data: [] });

      await service.getTickerNews();

      expect(mockClient.searchNews).toHaveBeenCalledWith(
        expect.stringContaining("$BTC"),
        expect.any(Object),
      );
    });

    it("should search for custom tickers", async () => {
      mockClient.searchNews.mockResolvedValue({ data: [] });

      await service.getTickerNews(["DOGE", "SHIB"]);

      expect(mockClient.searchNews).toHaveBeenCalledWith(
        expect.stringMatching(/\$DOGE.*\$SHIB|\$SHIB.*\$DOGE/),
        expect.any(Object),
      );
    });
  });

  describe("getCryptoNews", () => {
    it("should build comprehensive crypto query", async () => {
      mockClient.searchNews.mockResolvedValue({ data: [] });

      await service.getCryptoNews({
        focusAssets: ["BTC", "ETH"],
        includeDefi: true,
        includeNft: false,
      });

      const call = mockClient.searchNews.mock.calls[0][0];
      expect(call).toContain("$BTC");
      expect(call).toContain("$ETH");
      expect(call).toContain("DeFi");
      expect(call).not.toContain("NFT");
    });
  });

  describe("getDailyTopNews", () => {
    it("should sort by impact and relevance", async () => {
      const mockNews: XNewsItem[] = [
        createMockNews("Minor Update", "Small news", []),
        createMockNews("SEC ETF Approval", "Major regulatory news", ["BTC"]),
        createMockNews("ETH Update", "Medium news", ["ETH"]),
      ];

      mockClient.searchNews.mockResolvedValue({ data: mockNews });

      const results = await service.getDailyTopNews();

      // SEC news should be first (high impact keyword)
      expect(results[0].name).toContain("SEC");
    });
  });

  describe("relevance scoring", () => {
    it("should score higher for focus tickers", async () => {
      const btcNews = createMockNews("BTC News", "Bitcoin update", ["BTC"]);
      const randomNews = createMockNews("Random", "Something else", ["XYZ"]);

      mockClient.searchNews.mockResolvedValue({ data: [btcNews, randomNews] });

      const results = await service.searchNews("test");

      const btcResult = results.find((r) => r.name === "BTC News");
      const randomResult = results.find((r) => r.name === "Random");

      expect(btcResult?.relevanceScore).toBeGreaterThan(
        randomResult?.relevanceScore ?? 0,
      );
    });
  });

  describe("sentiment detection", () => {
    it("should detect bullish sentiment", async () => {
      const bullishNews = createMockNews(
        "BTC Surges to New ATH",
        "Bitcoin rally continues with massive inflows and adoption",
        ["BTC"],
      );

      mockClient.searchNews.mockResolvedValue({ data: [bullishNews] });

      const results = await service.searchNews("test");

      expect(results[0].sentiment).toBe("bullish");
    });

    it("should detect bearish sentiment", async () => {
      const bearishNews = createMockNews(
        "Market Crash Continues",
        "Bitcoin plunges amid massive outflows and hack concerns",
        ["BTC"],
      );

      mockClient.searchNews.mockResolvedValue({ data: [bearishNews] });

      const results = await service.searchNews("test");

      expect(results[0].sentiment).toBe("bearish");
    });

    it("should detect neutral sentiment", async () => {
      const neutralNews = createMockNews(
        "Bitcoin Price Update",
        "Bitcoin trades sideways with mixed signals",
        ["BTC"],
      );

      mockClient.searchNews.mockResolvedValue({ data: [neutralNews] });

      const results = await service.searchNews("test");

      expect(results[0].sentiment).toBe("neutral");
    });
  });

  describe("impact assessment", () => {
    it("should mark SEC news as high impact", async () => {
      const secNews = createMockNews(
        "SEC Announces New Crypto Rules",
        "Major regulatory update",
        [],
      );

      mockClient.searchNews.mockResolvedValue({ data: [secNews] });

      const results = await service.searchNews("test");

      expect(results[0].impactLevel).toBe("high");
    });

    it("should mark ETF news as high impact", async () => {
      const etfNews = createMockNews(
        "New ETF Approval Expected",
        "BlackRock ETF update",
        [],
      );

      mockClient.searchNews.mockResolvedValue({ data: [etfNews] });

      const results = await service.searchNews("test");

      expect(results[0].impactLevel).toBe("high");
    });
  });

  describe("getNewsClusterPosts", () => {
    it("should fetch cluster posts for news item", async () => {
      const newsItem = createMockNews("Test", "Test", ["BTC"]);
      newsItem.clusterPostIds = ["123", "456", "789"];

      const mockTweets = [
        { id: "123", text: "Tweet 1" },
        { id: "456", text: "Tweet 2" },
      ];

      mockClient.getTweets.mockResolvedValue(mockTweets);

      const posts = await service.getNewsClusterPosts(newsItem);

      expect(mockClient.getTweets).toHaveBeenCalledWith(["123", "456", "789"]);
      expect(posts.length).toBe(2);
    });

    it("should return empty for news without cluster posts", async () => {
      const newsItem = createMockNews("Test", "Test", ["BTC"]);
      newsItem.clusterPostIds = [];

      const posts = await service.getNewsClusterPosts(newsItem);

      expect(posts.length).toBe(0);
      expect(mockClient.getTweets).not.toHaveBeenCalled();
    });
  });

  describe("getXNewsService", () => {
    it("returns singleton instance", () => {
      const a = getXNewsService();
      const b = getXNewsService();
      expect(a).toBe(b);
    });
  });
});

// Helper to create mock news
function createMockNews(
  name: string,
  summary: string,
  tickers: string[],
): XNewsItem {
  return {
    id: Math.random().toString(36).slice(2),
    name,
    summary,
    hook: summary.slice(0, 50),
    category: "Crypto",
    contexts: {
      finance: { tickers },
      topics: ["Cryptocurrency"],
      entities: {
        organizations: [],
        people: [],
      },
    },
    clusterPostIds: [],
    lastUpdatedAt: Date.now(),
  };
}
