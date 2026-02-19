/**
 * X Search Service Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { XSearchService, getXSearchService } from "../services/xSearch.service";
import type { XTweet, XSearchResponse } from "../types/tweet.types";

// Mock the xClient
vi.mock("../services/xClient.service", () => ({
  getXClient: vi.fn(() => mockClient),
  XClientService: vi.fn(),
}));

const mockClient = {
  searchRecent: vi.fn(),
  getCounts: vi.fn(),
  getTweet: vi.fn(),
  getTweets: vi.fn(),
  getUserByUsername: vi.fn(),
  getUserTweets: vi.fn(),
  getListTweets: vi.fn(),
  getTrends: vi.fn(),
  searchNews: vi.fn(),
};

describe("XSearchService", () => {
  let service: XSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new XSearchService(mockClient as any);
  });

  describe("searchTopic", () => {
    it("should search for a topic and return enriched tweets", async () => {
      const mockResponse: XSearchResponse = {
        data: [
          createMockTweet("BTC is pumping!", "trader1"),
          createMockTweet("Bitcoin bullish", "trader2"),
        ],
        includes: {
          users: [
            { id: "1", username: "trader1", name: "Trader One" },
            { id: "2", username: "trader2", name: "Trader Two" },
          ],
        },
        meta: { resultCount: 2 },
      };

      mockClient.searchRecent.mockResolvedValue(mockResponse);

      const results = await service.searchTopic("btc", { maxResults: 50 });

      expect(results.length).toBe(2);
      expect(mockClient.searchRecent).toHaveBeenCalledWith(
        expect.stringContaining("bitcoin"),
        expect.objectContaining({ maxResults: 50 }),
      );
    });

    it("should throw for unknown topic", async () => {
      await expect(service.searchTopic("unknown_topic_xyz")).rejects.toThrow(
        "Unknown topic",
      );
    });

    it("should apply filters correctly", async () => {
      mockClient.searchRecent.mockResolvedValue({
        data: [],
        meta: { resultCount: 0 },
      });

      await service.searchTopic("btc", {
        minLikes: 100,
        excludeRetweets: true,
        excludeReplies: true,
      });

      expect(mockClient.searchRecent).toHaveBeenCalledWith(
        expect.stringContaining("-is:retweet"),
        expect.any(Object),
      );
    });
  });

  describe("searchMultipleTopics", () => {
    it("should search multiple topics and deduplicate", async () => {
      const btcTweet = createMockTweet("BTC pump", "user1");
      const ethTweet = createMockTweet("ETH pump", "user2");
      const sharedTweet = createMockTweet("BTC and ETH", "user3");

      // First call returns BTC tweets including shared
      mockClient.searchRecent.mockResolvedValueOnce({
        data: [btcTweet, sharedTweet],
        meta: { resultCount: 2 },
      });

      // Second call returns ETH tweets including shared
      mockClient.searchRecent.mockResolvedValueOnce({
        data: [ethTweet, sharedTweet],
        meta: { resultCount: 2 },
      });

      const results = await service.searchMultipleTopics({
        topicsIds: ["btc", "eth"],
        deduplicateAcrossTopics: true,
      });

      const btcResults = results.get("btc") ?? [];
      const ethResults = results.get("eth") ?? [];

      // BTC should have both (first)
      expect(btcResults.length).toBe(2);
      // ETH should only have 1 (shared was deduplicated)
      expect(ethResults.length).toBe(1);
    });

    it("should handle errors gracefully", async () => {
      mockClient.searchRecent
        .mockResolvedValueOnce({
          data: [createMockTweet("test", "user")],
          meta: { resultCount: 1 },
        })
        .mockRejectedValueOnce(new Error("API error"));

      const results = await service.searchMultipleTopics({
        topicsIds: ["btc", "eth"],
      });

      expect(results.get("btc")?.length).toBe(1);
      expect(results.get("eth")?.length).toBe(0);
    });
  });

  describe("getTopEngaging", () => {
    it("should return tweets sorted by engagement", async () => {
      const lowEngagement = createMockTweet("low", "user1", 10, 1);
      const highEngagement = createMockTweet("high", "user2", 1000, 100);
      const medEngagement = createMockTweet("med", "user3", 500, 50);

      mockClient.searchRecent.mockResolvedValue({
        data: [lowEngagement, highEngagement, medEngagement],
        meta: { resultCount: 3 },
      });

      const results = await service.getTopEngaging({ limit: 10 });

      // Should be sorted by engagement (high -> med -> low)
      expect(results[0].text).toBe("high");
      expect(results[1].text).toBe("med");
      expect(results[2].text).toBe("low");
    });
  });

  describe("searchQuery", () => {
    it("includes from:user in query when from option provided", async () => {
      mockClient.searchRecent.mockResolvedValue({
        data: [],
        meta: { resultCount: 0 },
      });
      await service.searchQuery({
        query: "bitcoin",
        from: "crediblecrypto",
        maxResults: 10,
      });
      expect(mockClient.searchRecent).toHaveBeenCalledWith(
        expect.stringMatching(/from:crediblecrypto/),
        expect.any(Object),
      );
    });

    it("paginates when nextToken returned", async () => {
      const tweet1 = createMockTweet("First", "u1");
      const tweet2 = createMockTweet("Second", "u2");
      mockClient.searchRecent
        .mockResolvedValueOnce({
          data: [tweet1],
          meta: { resultCount: 1, nextToken: "next-page" },
        })
        .mockResolvedValueOnce({
          data: [tweet2],
          meta: { resultCount: 1 },
        });
      const results = await service.searchQuery({
        query: "btc",
        maxResults: 100,
        maxPages: 2,
      });
      expect(results.length).toBe(2);
      expect(mockClient.searchRecent).toHaveBeenCalledTimes(2);
    });
  });

  describe("detectVolumeSpikes", () => {
    it("should detect volume spike above 2x", async () => {
      mockClient.getCounts.mockResolvedValue({
        data: [
          {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-01T01:00:00Z",
            tweetCount: 100,
          },
          {
            start: "2024-01-01T01:00:00Z",
            end: "2024-01-01T02:00:00Z",
            tweetCount: 100,
          },
          {
            start: "2024-01-01T02:00:00Z",
            end: "2024-01-01T03:00:00Z",
            tweetCount: 100,
          },
          {
            start: "2024-01-01T03:00:00Z",
            end: "2024-01-01T04:00:00Z",
            tweetCount: 100,
          },
          {
            start: "2024-01-01T04:00:00Z",
            end: "2024-01-01T05:00:00Z",
            tweetCount: 100,
          },
          {
            start: "2024-01-01T05:00:00Z",
            end: "2024-01-01T06:00:00Z",
            tweetCount: 300,
          }, // 3x spike
        ],
        meta: { totalTweetCount: 800 },
      });

      const spikes = await service.detectVolumeSpikes(["btc"]);

      expect(spikes.length).toBe(1);
      expect(spikes[0].spikeMultiple).toBeCloseTo(3, 0);
    });

    it("should not flag normal volume", async () => {
      mockClient.getCounts.mockResolvedValue({
        data: [
          {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-01T01:00:00Z",
            tweetCount: 100,
          },
          {
            start: "2024-01-01T01:00:00Z",
            end: "2024-01-01T02:00:00Z",
            tweetCount: 110,
          },
          {
            start: "2024-01-01T02:00:00Z",
            end: "2024-01-01T03:00:00Z",
            tweetCount: 95,
          },
          {
            start: "2024-01-01T03:00:00Z",
            end: "2024-01-01T04:00:00Z",
            tweetCount: 105,
          },
          {
            start: "2024-01-01T04:00:00Z",
            end: "2024-01-01T05:00:00Z",
            tweetCount: 100,
          },
          {
            start: "2024-01-01T05:00:00Z",
            end: "2024-01-01T06:00:00Z",
            tweetCount: 105,
          }, // Normal
        ],
        meta: { totalTweetCount: 615 },
      });

      const spikes = await service.detectVolumeSpikes(["btc"]);

      expect(spikes.length).toBe(0);
    });

    it("returns spike with topic, currentVolume, spikeMultiple", async () => {
      mockClient.getCounts.mockResolvedValue({
        data: [
          {
            start: "2024-01-01T00:00:00Z",
            end: "2024-01-01T01:00:00Z",
            tweetCount: 50,
          },
          {
            start: "2024-01-01T01:00:00Z",
            end: "2024-01-01T02:00:00Z",
            tweetCount: 50,
          },
          {
            start: "2024-01-01T02:00:00Z",
            end: "2024-01-01T03:00:00Z",
            tweetCount: 50,
          },
          {
            start: "2024-01-01T03:00:00Z",
            end: "2024-01-01T04:00:00Z",
            tweetCount: 50,
          },
          {
            start: "2024-01-01T04:00:00Z",
            end: "2024-01-01T05:00:00Z",
            tweetCount: 50,
          },
          {
            start: "2024-01-01T05:00:00Z",
            end: "2024-01-01T06:00:00Z",
            tweetCount: 200,
          },
        ],
        meta: { totalTweetCount: 450 },
      });
      const spikes = await service.detectVolumeSpikes(["eth"]);
      expect(spikes.length).toBe(1);
      expect(spikes[0]).toHaveProperty("topic", "eth");
      expect(spikes[0]).toHaveProperty("currentVolume");
      expect(spikes[0]).toHaveProperty("spikeMultiple");
    });
  });

  describe("getXSearchService", () => {
    it("returns service instance (singleton)", () => {
      const svc = getXSearchService();
      expect(svc).toBeDefined();
      expect(svc.searchQuery).toBeDefined();
    });
  });
});

// Helper to create mock tweets
function createMockTweet(
  text: string,
  username: string,
  likes = 100,
  retweets = 10,
): XTweet {
  return {
    id: Math.random().toString(36).slice(2),
    text,
    authorId: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    metrics: {
      likeCount: likes,
      retweetCount: retweets,
      replyCount: 5,
      quoteCount: 2,
    },
    author: {
      id: "123",
      username,
      name: username,
    },
  };
}
