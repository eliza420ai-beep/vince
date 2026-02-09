/**
 * VINCE_X_RESEARCH action: intent detection (search, profile, thread, tweet) and handler branches.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { vinceXResearchAction } from "../../actions/xResearch.action";
import {
  createMockRuntime,
  createMockMessage,
  createMockCallback,
  createMockState,
} from "../test-utils";
import type { XTweet } from "../../services/xResearch.service";

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

function createRuntimeWithXResearchService(mockImpl: {
  search?: (q: string, opts?: any) => Promise<XTweet[]>;
  profile?: (username: string, opts?: any) => Promise<{ user: any; tweets: XTweet[] }>;
  thread?: (id: string, opts?: any) => Promise<XTweet[]>;
  getTweet?: (id: string) => Promise<XTweet | null>;
  sortBy?: (tweets: XTweet[], metric: string) => XTweet[];
  isConfigured?: () => boolean;
}) {
  return createMockRuntime({
    services: {
      VINCE_X_RESEARCH_SERVICE: {
        isConfigured: () => mockImpl.isConfigured ?? true,
        search: vi.fn().mockImplementation(mockImpl.search ?? (async () => [mockTweet])),
        profile: vi.fn().mockImplementation(mockImpl.profile ?? (async () => ({ user: {}, tweets: [mockTweet] }))),
        thread: vi.fn().mockImplementation(mockImpl.thread ?? (async () => [mockTweet])),
        getTweet: vi.fn().mockImplementation(mockImpl.getTweet ?? (async () => mockTweet)),
        sortBy: vi.fn().mockImplementation((t: XTweet[], _m: string) => [...(mockImpl.sortBy?.(t, "likes") ?? t)]),
      },
    } as any,
  });
}

describe("vinceXResearchAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validate", () => {
    it("returns false when X research service is not configured", async () => {
      const runtime = createMockRuntime({
        services: { VINCE_X_RESEARCH_SERVICE: { isConfigured: () => false } },
      } as any);
      const msg = createMockMessage("What are people saying about BNKR?");
      const result = await vinceXResearchAction.validate!(runtime, msg);
      expect(result).toBe(false);
    });

    it("returns true for search-style message when configured", async () => {
      const runtime = createRuntimeWithXResearchService({});
      const msg = createMockMessage("What are people saying about BNKR?");
      const result = await vinceXResearchAction.validate!(runtime, msg);
      expect(result).toBe(true);
    });

    it("returns true for profile-style message", async () => {
      const runtime = createRuntimeWithXResearchService({});
      const msg = createMockMessage("What did @foo post recently?");
      const result = await vinceXResearchAction.validate!(runtime, msg);
      expect(result).toBe(true);
    });

    it("returns true for thread-style message", async () => {
      const runtime = createRuntimeWithXResearchService({});
      const msg = createMockMessage("Get thread for tweet 1234567890123456789");
      const result = await vinceXResearchAction.validate!(runtime, msg);
      expect(result).toBe(true);
    });

    it("returns true for tweet-style message", async () => {
      const runtime = createRuntimeWithXResearchService({});
      const msg = createMockMessage("Get tweet 1234567890123456789");
      const result = await vinceXResearchAction.validate!(runtime, msg);
      expect(result).toBe(true);
    });
  });

  describe("handler", () => {
    it("calls search for search intent and returns briefing", async () => {
      const searchFn = vi.fn().mockResolvedValue([mockTweet]);
      const sortByFn = vi.fn().mockImplementation((t: XTweet[]) => [...t]);
      const runtime = createRuntimeWithXResearchService({ search: searchFn, sortBy: sortByFn });
      const msg = createMockMessage("What are people saying about BNKR?");
      const callback = createMockCallback();

      const result = await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

      expect(result.success).toBe(true);
      expect(searchFn).toHaveBeenCalled();
      expect(callback.calls.length).toBeGreaterThanOrEqual(2);
      expect(callback.calls.some((c) => c.text?.includes("X research: BNKR"))).toBe(true);
    });

    it("calls profile for profile intent", async () => {
      const profileFn = vi.fn().mockResolvedValue({ user: { username: "foo" }, tweets: [mockTweet] });
      const runtime = createRuntimeWithXResearchService({ profile: profileFn });
      const msg = createMockMessage("What did @foo post recently?");
      const callback = createMockCallback();

      const result = await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

      expect(result.success).toBe(true);
      expect(profileFn).toHaveBeenCalledWith("foo", expect.any(Object));
    });

    it("calls thread for thread intent", async () => {
      const threadFn = vi.fn().mockResolvedValue([mockTweet]);
      const runtime = createRuntimeWithXResearchService({ thread: threadFn });
      const msg = createMockMessage("Get thread for tweet 1234567890123456789");
      const callback = createMockCallback();

      const result = await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

      expect(result.success).toBe(true);
      expect(threadFn).toHaveBeenCalledWith("1234567890123456789", expect.any(Object));
    });

    it("calls getTweet for single-tweet intent", async () => {
      const getTweetFn = vi.fn().mockResolvedValue(mockTweet);
      const runtime = createRuntimeWithXResearchService({ getTweet: getTweetFn });
      const msg = createMockMessage("Get tweet 1234567890123456789");
      const callback = createMockCallback();

      const result = await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

      expect(result.success).toBe(true);
      expect(getTweetFn).toHaveBeenCalledWith("1234567890123456789");
    });

    it("when service throws rate limit error, sends user-facing error and returns success false", async () => {
      const runtime = createRuntimeWithXResearchService({
        search: () => Promise.reject(new Error("X API rate limited. Resets in 900s")),
      });
      const msg = createMockMessage("What are people saying about BTC?");
      const callback = createMockCallback();

      const result = await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

      expect(result.success).toBe(false);
      const errorCall = callback.calls.find((c) => c.text?.includes("X research failed"));
      expect(errorCall).toBeDefined();
      expect(errorCall!.text).toContain("X research failed");
      expect(errorCall!.text).toContain("rate limited");
      expect(errorCall!.text).toContain("Resets in 900s");
      expect(errorCall!.text).toMatch(/X_BEARER_TOKEN|X API tier/);
    });

    describe("query expansion for known tickers", () => {
      it("expands BTC to $BTC OR Bitcoin when user asks what people are saying about BTC", async () => {
        const searchFn = vi.fn().mockResolvedValue([mockTweet]);
        const runtime = createRuntimeWithXResearchService({ search: searchFn });
        const msg = createMockMessage("What are people saying about BTC?");
        const callback = createMockCallback();

        await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

        expect(searchFn).toHaveBeenCalledWith("$BTC OR Bitcoin", expect.any(Object));
      });

      it("expands ETH to $ETH OR Ethereum", async () => {
        const searchFn = vi.fn().mockResolvedValue([mockTweet]);
        const runtime = createRuntimeWithXResearchService({ search: searchFn });
        const msg = createMockMessage("What are people saying about ETH?");
        const callback = createMockCallback();

        await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

        expect(searchFn).toHaveBeenCalledWith("$ETH OR Ethereum", expect.any(Object));
      });

      it("expands SOL to $SOL OR Solana", async () => {
        const searchFn = vi.fn().mockResolvedValue([mockTweet]);
        const runtime = createRuntimeWithXResearchService({ search: searchFn });
        const msg = createMockMessage("What are people saying about SOL?");
        const callback = createMockCallback();

        await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

        expect(searchFn).toHaveBeenCalledWith("$SOL OR Solana", expect.any(Object));
      });

      it("expands HYPE to HYPE crypto", async () => {
        const searchFn = vi.fn().mockResolvedValue([mockTweet]);
        const runtime = createRuntimeWithXResearchService({ search: searchFn });
        const msg = createMockMessage("What are people saying about HYPE?");
        const callback = createMockCallback();

        await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

        expect(searchFn).toHaveBeenCalledWith("HYPE crypto", expect.any(Object));
      });

      it("expands DOGE to $DOGE OR Dogecoin", async () => {
        const searchFn = vi.fn().mockResolvedValue([mockTweet]);
        const runtime = createRuntimeWithXResearchService({ search: searchFn });
        const msg = createMockMessage("What are people saying about DOGE?");
        const callback = createMockCallback();

        await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

        expect(searchFn).toHaveBeenCalledWith("$DOGE OR Dogecoin", expect.any(Object));
      });

      it("expands PEPE to $PEPE OR Pepe", async () => {
        const searchFn = vi.fn().mockResolvedValue([mockTweet]);
        const runtime = createRuntimeWithXResearchService({ search: searchFn });
        const msg = createMockMessage("What are people saying about PEPE?");
        const callback = createMockCallback();

        await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

        expect(searchFn).toHaveBeenCalledWith("$PEPE OR Pepe", expect.any(Object));
      });

      it("leaves unknown ticker BNKR unchanged", async () => {
        const searchFn = vi.fn().mockResolvedValue([mockTweet]);
        const runtime = createRuntimeWithXResearchService({ search: searchFn });
        const msg = createMockMessage("What are people saying about BNKR?");
        const callback = createMockCallback();

        await vinceXResearchAction.handler!(runtime, msg, createMockState(), {}, callback);

        expect(searchFn).toHaveBeenCalledWith("BNKR", expect.any(Object));
      });
    });
  });
});
