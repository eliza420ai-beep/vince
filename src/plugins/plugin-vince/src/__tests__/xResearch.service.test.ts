/**
 * VinceXResearchService: 15-min cache and thread().
 * Cache: two identical search() calls return same result and second does not hit API.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  VinceXResearchService,
  X_RATE_LIMITED_UNTIL_CACHE_KEY,
} from "../services/xResearch.service";
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
      expect(runtime.getCache).toHaveBeenCalledTimes(3); // rate-limit key once, search cache key twice (miss then hit)
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

  describe("rate limit", () => {
    it("when cache has future rate limited until, search throws and does not call fetch", async () => {
      const cache = new Map<string, unknown>();
      cache.set(X_RATE_LIMITED_UNTIL_CACHE_KEY, Date.now() + 120_000);
      const runtime: IAgentRuntime = {
        getCache: vi.fn(async (key: string) => cache.get(key)),
        setCache: vi.fn(async (key: string, value: unknown) => {
          cache.set(key, value);
          return true;
        }),
        getSetting: vi.fn(() => null),
      } as unknown as IAgentRuntime;

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";

      await expect(
        service.search("test", { pages: 1, sortOrder: "relevancy" }),
      ).rejects.toThrow(/X API rate limited\. Resets in \d+s/);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("when fetch returns 429 with x-rate-limit-reset, search throws and sets shared cooldown cache", async () => {
      const cache = new Map<string, unknown>();
      const setCache = vi.fn(async (key: string, value: unknown) => {
        cache.set(key, value);
        return true;
      });
      const runtime: IAgentRuntime = {
        getCache: vi.fn(async (key: string) => cache.get(key)),
        setCache,
        getSetting: vi.fn(() => null),
      } as unknown as IAgentRuntime;

      const resetEpoch = Math.floor(Date.now() / 1000) + 900;
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ "x-rate-limit-reset": String(resetEpoch) }),
        json: async () => ({}),
      } as Response);

      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";

      await expect(
        service.search("test", { pages: 1, sortOrder: "relevancy" }),
      ).rejects.toThrow(/X API rate limited.*Resets in/);
      expect(setCache).toHaveBeenCalledWith(
        X_RATE_LIMITED_UNTIL_CACHE_KEY,
        expect.any(Number),
      );
    });
  });
});
