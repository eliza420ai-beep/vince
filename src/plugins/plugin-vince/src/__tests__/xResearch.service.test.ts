/**
 * VinceXResearchService: 15-min cache, thread(), profile().
 * Cache: two identical search() or profile() calls return same result and second does not hit API.
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
  const cache = new Map<string, unknown>();
  return {
    getCache: vi.fn(async (key: string) => cache.get(key)),
    setCache: vi.fn(async (key: string, value: unknown) => {
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
      const searchPayload = {
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
      };
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => JSON.stringify(searchPayload),
        json: async () => searchPayload,
      } as Response);

      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";
      (service as any).getClient = vi.fn().mockResolvedValue({});

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

  describe("profile", () => {
    it("returns cached result on second identical profile call (no second API call)", async () => {
      const runtime = createMockRuntimeWithCache();
      const getByUsernames = vi.fn().mockResolvedValue({
        data: [{ id: "u1", username: "someuser", name: "Some User" }],
      });
      const getPosts = vi.fn().mockResolvedValue({
        data: [
          {
            id: "t1",
            text: "a tweet",
            author_id: "u1",
            created_at: new Date().toISOString(),
            conversation_id: "t1",
            public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 0, bookmark_count: 0 },
            entities: { urls: [], mentions: [], hashtags: [] },
          },
        ],
        includes: { users: [{ id: "u1", username: "someuser", name: "Some User" }] },
      });
      const mockClient = {
        users: {
          getByUsernames: getByUsernames,
          getPosts: getPosts,
        },
      };
      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";
      (service as any).getClient = vi.fn().mockResolvedValue(mockClient);

      const result1 = await service.profile("someuser", { count: 10 });
      const result2 = await service.profile("someuser", { count: 10 });

      expect(result1.user).toBeDefined();
      expect(result1.tweets).toHaveLength(1);
      expect(result1.tweets[0].id).toBe("t1");
      expect(result1.tweets[0].text).toBe("a tweet");
      expect(result2).toEqual(result1);
      expect(getByUsernames).toHaveBeenCalledTimes(1);
      expect(getPosts).toHaveBeenCalledTimes(1);
      expect(runtime.setCache).toHaveBeenCalledWith(
        expect.stringContaining("profile:"),
        expect.objectContaining({ user: result1.user, tweets: result1.tweets, ts: expect.any(Number) }),
      );
    });

    it("returns user, tweets array, and optional pinnedTweet with correct shape", async () => {
      const runtime = createMockRuntimeWithCache();
      const pinnedId = "pinned123";
      const getByUsernames = vi.fn().mockResolvedValue({
        data: [{ id: "u1", username: "dev", name: "Dev User", pinned_tweet_id: pinnedId }],
        includes: {
          tweets: [
            {
              id: pinnedId,
              text: "pinned tweet",
              author_id: "u1",
              created_at: new Date().toISOString(),
              conversation_id: pinnedId,
              public_metrics: { like_count: 1, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 0, bookmark_count: 0 },
              entities: { urls: [], mentions: [], hashtags: [] },
            },
          ],
        },
      });
      const getPosts = vi.fn().mockResolvedValue({
        data: [
          {
            id: "t2",
            text: "recent",
            author_id: "u1",
            created_at: new Date().toISOString(),
            conversation_id: "t2",
            public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 0, bookmark_count: 0 },
            entities: { urls: [], mentions: [], hashtags: [] },
          },
        ],
        includes: { users: [{ id: "u1", username: "dev", name: "Dev User" }] },
      });
      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";
      (service as any).getClient = vi.fn().mockResolvedValue({
        users: { getByUsernames, getPosts },
      });

      const result = await service.profile("dev", { count: 10 });

      expect(result.user).toBeDefined();
      expect(result.user.username).toBe("dev");
      expect(Array.isArray(result.tweets)).toBe(true);
      expect(result.tweets[0].id).toBe("t2");
      expect(result.tweets[0].author_id).toBe("u1");
      expect(result.tweets[0].username).toBe("dev");
      expect(result.pinnedTweet).toBeDefined();
      expect(result.pinnedTweet!.id).toBe(pinnedId);
      expect(result.pinnedTweet!.text).toBe("pinned tweet");
    });
  });

  describe("searchPaginated", () => {
    it("yields one page per call with tweets, nextToken, and done", async () => {
      const runtime = createMockRuntimeWithCache();
      const page1 = {
        data: [
          {
            id: "1",
            text: "first",
            author_id: "u1",
            created_at: new Date().toISOString(),
            conversation_id: "1",
            public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 0, bookmark_count: 0 },
            entities: { urls: [], mentions: [], hashtags: [] },
          },
        ],
        includes: { users: [{ id: "u1", username: "u", name: "U" }] },
        meta: { next_token: "token2" },
      };
      const page2 = {
        data: [
          {
            id: "2",
            text: "second",
            author_id: "u1",
            created_at: new Date().toISOString(),
            conversation_id: "2",
            public_metrics: { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0, impression_count: 0, bookmark_count: 0 },
            entities: { urls: [], mentions: [], hashtags: [] },
          },
        ],
        includes: { users: [{ id: "u1", username: "u", name: "U" }] },
        meta: {},
      };
      const searchRecent = vi
        .fn()
        .mockResolvedValueOnce(page1)
        .mockResolvedValueOnce(page2);
      const mockClient = { posts: { searchRecent } };
      const service = new VinceXResearchService(runtime);
      (service as any).getToken = () => "fake-token";
      (service as any).getClient = vi.fn().mockResolvedValue(mockClient);

      const pages: { tweets: XTweet[]; nextToken?: string; done: boolean }[] = [];
      for await (const page of service.searchPaginated("test", { maxPages: 3 })) {
        pages.push(page);
      }

      expect(pages).toHaveLength(2);
      expect(pages[0].tweets).toHaveLength(1);
      expect(pages[0].tweets[0].id).toBe("1");
      expect(pages[0].tweets[0].text).toBe("first");
      expect(pages[0].nextToken).toBe("token2");
      expect(pages[0].done).toBe(false);
      expect(pages[1].tweets).toHaveLength(1);
      expect(pages[1].tweets[0].id).toBe("2");
      expect(pages[1].nextToken).toBeUndefined();
      expect(pages[1].done).toBe(true);
      expect(searchRecent).toHaveBeenCalledTimes(2);
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
      (service as any).getClient = vi.fn().mockResolvedValue({});

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
      (service as any).getClient = vi.fn().mockResolvedValue({});

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
