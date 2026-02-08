/**
 * VinceXResearchService: 15-min cache and thread().
 * Cache: two identical search() calls return same result and second does not hit API.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { VinceXResearchService } from "../services/xResearch.service";
import type { IAgentRuntime } from "@elizaos/core";
import type { XTweet } from "../services/xResearch.service";

const mockTweet: XTweet = {
  id: "123",
  text: "test",
  author_id: "u1",
  username: "u",
  name: "U",
  created_at: new Date().toISOString(),
  conversation_id: "123",
  metrics: { likes: 0, retweets: 0, replies: 0, quotes: 0, impressions: 0, bookmarks: 0 },
  urls: [],
  mentions: [],
  hashtags: [],
  tweet_url: "https://x.com/u/status/123",
};

function createMockRuntimeWithCache(): IAgentRuntime {
  const cache = new Map<string, { tweets: XTweet[]; ts: number }>();
  return {
    getCache: vi.fn(async (key: string) => cache.get(key)),
    setCache: vi.fn(async (key: string, value: { tweets: XTweet[]; ts: number }) => {
      cache.set(key, value);
      return true;
    }),
    getSetting: vi.fn(() => null),
  } as unknown as IAgentRuntime;
}

describe("VinceXResearchService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("search cache", () => {
    it("returns cached result on second identical search (no second API call)", async () => {
      const runtime = createMockRuntimeWithCache();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          data: [
            {
              id: "123",
              text: "test",
              author_id: "u1",
              created_at: new Date().toISOString(),
              conversation_id: "123",
              public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 0, bookmark_count: 0 },
              entities: { urls: [], mentions: [], hashtags: [] },
            },
          ],
          includes: { users: [{ id: "u1", username: "u", name: "U" }] },
          meta: {},
        }),
      } as Response);

      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";

      const query = "test query";
      const opts = { pages: 1, sortOrder: "relevancy" as const };

      const result1 = await service.search(query, opts);
      const result2 = await service.search(query, opts);

      expect(result1.length).toBe(1);
      expect(result2.length).toBe(1);
      expect(result2).toEqual(result1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(runtime.setCache).toHaveBeenCalled();
      expect(runtime.getCache).toHaveBeenCalledTimes(2);
    });
  });

  describe("thread", () => {
    it("calls search with conversation_id and getTweet for root", async () => {
      const runtime = createMockRuntimeWithCache();
      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";
      const searchSpy = vi.spyOn(service, "search").mockResolvedValue([mockTweet]);
      const getTweetSpy = vi.spyOn(service, "getTweet").mockResolvedValue(mockTweet);

      const threadId = "1234567890";
      const tweets = await service.thread(threadId, { pages: 2 });

      expect(searchSpy).toHaveBeenCalledWith(
        `conversation_id:${threadId}`,
        expect.objectContaining({ sortOrder: "recency", pages: 2 }),
      );
      expect(getTweetSpy).toHaveBeenCalledWith(threadId);
      expect(Array.isArray(tweets)).toBe(true);
    });
  });
});
