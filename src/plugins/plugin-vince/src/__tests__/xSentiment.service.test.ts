/**
 * VinceXSentimentService: cache, refresh, getTradingSentiment, and rate-limit handling.
 * Covers: unconfigured/empty cache, bullish/bearish/neutral/risk, rate-limit backoff and skip,
 * stale cache, empty/few tweets, stop() cleanup, and query shape (HYPE vs $TICKER).
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  VinceXSentimentService,
  parseRateLimitResetSeconds,
} from "../services/xSentiment.service";
import { createMockRuntime } from "./test-utils";

/** Must exceed service CACHE_TTL_MS (30 min) to trigger stale behavior. */
const STALE_CACHE_AGE_MS = 31 * 60 * 1000;

const mockTweets = (texts: string[]) =>
  texts.map((text, i) => ({
    id: `t${i}`,
    text,
    author_id: "u1",
    username: "u",
    name: "U",
    created_at: new Date().toISOString(),
    conversation_id: "c1",
    metrics: {
      likes: 10,
      retweets: 0,
      replies: 0,
      quotes: 0,
      impressions: 0,
      bookmarks: 0,
    },
    urls: [],
    mentions: [],
    hashtags: [],
    tweet_url: "https://x.com/u/status/1",
  }));

describe("VinceXSentimentService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("configuration and cache", () => {
    it("returns neutral and 0 confidence when X research service is not configured", async () => {
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: null,
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out).toEqual({
        sentiment: "neutral",
        confidence: 0,
        hasHighRiskEvent: false,
      });
    });

    it("returns neutral and 0 confidence when X research is present but isConfigured is false", async () => {
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => false,
            search: vi.fn().mockResolvedValue([]),
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.sentiment).toBe("neutral");
      expect(out.confidence).toBe(0);
      expect(out.hasHighRiskEvent).toBe(false);
    });

    it("returns neutral and 0 confidence when cache is empty (no refresh for asset)", async () => {
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search: vi.fn().mockResolvedValue([]),
          },
        } as any,
      });
      const service = new VinceXSentimentService(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out).toEqual({
        sentiment: "neutral",
        confidence: 0,
        hasHighRiskEvent: false,
      });
    });

    it("returns neutral and 0 confidence when cache is stale (older than TTL)", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets(["bullish moon pump", "moon soon", "buy the dip"]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      expect(service.getTradingSentiment("BTC").sentiment).toBe("bullish");
      const cache = (service as any).cache as Map<string, { updatedAt: number }>;
      const entry = cache.get("BTC");
      expect(entry).toBeDefined();
      entry!.updatedAt = Date.now() - STALE_CACHE_AGE_MS;
      const out = service.getTradingSentiment("BTC");
      expect(out).toEqual({
        sentiment: "neutral",
        confidence: 0,
        hasHighRiskEvent: false,
      });
    });

    it("stop() clears cache so getTradingSentiment returns neutral/0 after stop", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets(["bullish moon", "pump buy", "long growth"]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      expect(service.getTradingSentiment("BTC").sentiment).toBe("bullish");
      await service.stop();
      expect(service.getTradingSentiment("BTC")).toEqual({
        sentiment: "neutral",
        confidence: 0,
        hasHighRiskEvent: false,
      });
    });
  });

  describe("sentiment and risk", () => {
    it("returns bullish and non-zero confidence after refresh with bullish tweets", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets(["BTC is so bullish", "moon soon", "buy the dip", "bull run"]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.sentiment).toBe("bullish");
      expect(out.confidence).toBeGreaterThan(0);
      expect(out.hasHighRiskEvent).toBe(false);
      expect(search).toHaveBeenCalled();
    });

    it("returns bearish after refresh with bearish tweets", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets(["BTC dump", "bearish", "sell", "crash incoming"]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.sentiment).toBe("bearish");
      expect(out.confidence).toBeGreaterThan(0);
    });

    it("returns neutral when tweets have no strong bullish/bearish keywords", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets([
          "BTC is trading sideways",
          "waiting for catalyst",
          "no clear direction",
          "consolidation continues",
        ]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.sentiment).toBe("neutral");
    });

    it("sets hasHighRiskEvent when tweets contain risk keywords", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets(["rug pull", "scam token", "exploit found"]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.hasHighRiskEvent).toBe(true);
    });

    it("stores neutral/0 when search returns empty array", async () => {
      const search = vi.fn().mockResolvedValue([]);
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out).toEqual({
        sentiment: "neutral",
        confidence: 0,
        hasHighRiskEvent: false,
      });
    });

    it("stores neutral/0 when search returns fewer than MIN_TWEETS_FOR_CONFIDENCE", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets(["bullish moon", "pump"]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.sentiment).toBe("neutral");
      expect(out.confidence).toBe(0);
    });
  });

  describe("rate limit handling", () => {
    it("on rate limit error (Resets in Ns), sets cooldown and second refreshAll does not call search", async () => {
      const search = vi
        .fn()
        .mockRejectedValueOnce(new Error("X API rate limited. Resets in 120s"));
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      expect(search).toHaveBeenCalledTimes(1);
      await (service as any).refreshAll();
      expect(search).toHaveBeenCalledTimes(1);
    });

    it("on 429-style message, treats as rate limit and skips next refresh", async () => {
      const search = vi
        .fn()
        .mockRejectedValueOnce(new Error("429 Too Many Requests"));
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      expect(search).toHaveBeenCalledTimes(1);
      await (service as any).refreshAll();
      expect(search).toHaveBeenCalledTimes(1);
    });

    it("non-rate-limit error does not set cooldown; next refresh still calls search", async () => {
      const tweets = mockTweets(["bullish moon", "pump buy", "long"]);
      const search = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue(tweets);
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const callsAfterStart = search.mock.calls.length;
      await (service as any).refreshAll();
      const callsAfterSecondRefresh = search.mock.calls.length;
      expect(callsAfterSecondRefresh).toBeGreaterThan(callsAfterStart);
    });
  });

  describe("parseRateLimitResetSeconds", () => {
    it('parses "Resets in 672s" to 672', () => {
      expect(parseRateLimitResetSeconds("Resets in 672s")).toBe(672);
    });

    it('parses "Resets in 120s" to 120', () => {
      expect(parseRateLimitResetSeconds("Resets in 120s")).toBe(120);
    });

    it('parses "Resets in 1s" to 1', () => {
      expect(parseRateLimitResetSeconds("Resets in 1s")).toBe(1);
    });

    it('parses "reset in 60s" (lowercase) to 60', () => {
      expect(parseRateLimitResetSeconds("reset in 60s")).toBe(60);
    });

    it("returns 0 for message without Resets in Ns", () => {
      expect(parseRateLimitResetSeconds("Rate limited")).toBe(0);
      expect(parseRateLimitResetSeconds("")).toBe(0);
      expect(parseRateLimitResetSeconds("429 Too Many Requests")).toBe(0);
    });

    it("clamps to at least 1 when parsed value is positive", () => {
      expect(parseRateLimitResetSeconds("Resets in 1s")).toBe(1);
    });
  });

  describe("query shape", () => {
    it("calls search with $BTC for BTC and HYPE crypto for HYPE", async () => {
      const search = vi.fn().mockResolvedValue(mockTweets(["bullish"]));
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: {
            isConfigured: () => true,
            search,
          },
        } as any,
      });
      await VinceXSentimentService.start(runtime);
      expect(search).toHaveBeenCalledWith("$BTC", expect.any(Object));
      expect(search).toHaveBeenCalledWith("$ETH", expect.any(Object));
      expect(search).toHaveBeenCalledWith("$SOL", expect.any(Object));
      expect(search).toHaveBeenCalledWith("HYPE crypto", expect.any(Object));
    });
  });
});
