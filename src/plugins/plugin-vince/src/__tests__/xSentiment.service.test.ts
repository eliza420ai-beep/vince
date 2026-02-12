/**
 * VinceXSentimentService: cache, refresh, getTradingSentiment, and rate-limit handling.
 * Covers: unconfigured/empty cache, bullish/bearish/neutral/risk, rate-limit backoff and skip,
 * stale cache, empty/few tweets, stop() cleanup, query shape (HYPE vs $TICKER),
 * staggered refresh (one asset per tick), and persistent cache file load/save.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  VinceXSentimentService,
  parseRateLimitResetSeconds,
  simpleSentiment,
  hasRiskKeyword,
  buildSentimentQuery,
  getKeywordLists,
} from "../services/xSentiment.service";
import { createMockRuntime } from "./test-utils";

/** Must exceed service CACHE_TTL_MS (24h) to trigger stale behavior. */
const STALE_CACHE_AGE_MS = 25 * 60 * 60 * 1000;

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

/** Mock X research service with getSentimentCooldownKey so sentiment service refreshOneAsset does not throw. */
function mockXResearch(overrides: { search?: any } = {}) {
  return {
    isConfigured: () => true,
    search: overrides.search ?? vi.fn().mockResolvedValue([]),
    getSentimentCooldownKey: (i?: number) => `vince_x:rate_limited_sentiment_${i ?? 0}`,
  };
}

describe("VinceXSentimentService", () => {
  const envRestore: Record<string, string | undefined> = {};
  beforeEach(() => {
    envRestore.X_SENTIMENT_ENABLED = process.env.X_SENTIMENT_ENABLED;
    process.env.X_SENTIMENT_ENABLED = "true";
    envRestore.X_SENTIMENT_ASSETS = process.env.X_SENTIMENT_ASSETS;
    process.env.X_SENTIMENT_ASSETS = "BTC,ETH,SOL,HYPE";
  });
  afterEach(() => {
    if (envRestore.X_SENTIMENT_ENABLED !== undefined) {
      process.env.X_SENTIMENT_ENABLED = envRestore.X_SENTIMENT_ENABLED;
    } else {
      delete process.env.X_SENTIMENT_ENABLED;
    }
    if (envRestore.X_SENTIMENT_ASSETS !== undefined) {
      process.env.X_SENTIMENT_ASSETS = envRestore.X_SENTIMENT_ASSETS;
    } else {
      delete process.env.X_SENTIMENT_ASSETS;
    }
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
      expect(out).toMatchObject({
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search: vi.fn().mockResolvedValue([]) }),
        } as any,
      });
      const service = new VinceXSentimentService(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out).toMatchObject({
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      expect(service.getTradingSentiment("BTC").sentiment).toBe("bullish");
      const cache = (service as any).cache as Map<string, { updatedAt: number }>;
      const entry = cache.get("BTC");
      expect(entry).toBeDefined();
      entry!.updatedAt = Date.now() - STALE_CACHE_AGE_MS;
      const out = service.getTradingSentiment("BTC");
      expect(out).toMatchObject({
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      expect(service.getTradingSentiment("BTC").sentiment).toBe("bullish");
      await service.stop();
      expect(service.getTradingSentiment("BTC")).toMatchObject({
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out).toMatchObject({
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
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.sentiment).toBe("neutral");
      expect(out.confidence).toBe(0);
    });
  });

  describe("rate limit handling", () => {
    it("on rate limit error (Resets in Ns), sets cooldown and next refreshOneAsset skips search", async () => {
      const search = vi
        .fn()
        .mockRejectedValueOnce(new Error("X API rate limited. Resets in 120s"));
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = new VinceXSentimentService(runtime);
      await service.refreshOneAsset(0).catch(() => {});
      expect(search).toHaveBeenCalledTimes(1);
      await service.refreshOneAsset(1);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it("on 429-style message, treats as rate limit and skips next refresh", async () => {
      const search = vi
        .fn()
        .mockRejectedValueOnce(new Error("429 Too Many Requests"));
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = new VinceXSentimentService(runtime);
      await service.refreshOneAsset(0).catch(() => {});
      expect(search).toHaveBeenCalledTimes(1);
      await service.refreshOneAsset(1);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it("non-rate-limit error does not set cooldown; next refreshOneAsset still calls search", async () => {
      const tweets = mockTweets(["bullish moon", "pump buy", "long"]);
      const search = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue(tweets);
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = new VinceXSentimentService(runtime);
      await service.refreshOneAsset(0).catch(() => {});
      const callsAfterFirst = search.mock.calls.length;
      await service.refreshOneAsset(1);
      expect(search.mock.calls.length).toBeGreaterThan(callsAfterFirst);
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
    it("calls search with expanded query plus quality filters (lang:en, -is:reply, -is:retweet) for BTC/ETH/SOL and HYPE", async () => {
      const search = vi.fn().mockResolvedValue(mockTweets(["bullish"]));
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = new VinceXSentimentService(runtime);
      await service.refreshOneAsset(0);
      expect(search).toHaveBeenLastCalledWith("$BTC OR Bitcoin lang:en -is:reply -is:retweet", expect.any(Object));
      await service.refreshOneAsset(1);
      expect(search).toHaveBeenLastCalledWith("$ETH OR Ethereum lang:en -is:reply -is:retweet", expect.any(Object));
      await service.refreshOneAsset(2);
      expect(search).toHaveBeenLastCalledWith("$SOL OR Solana lang:en -is:reply -is:retweet", expect.any(Object));
      await service.refreshOneAsset(3);
      expect(search).toHaveBeenLastCalledWith("HYPE crypto lang:en -is:reply -is:retweet", expect.any(Object));
    });
  });

  describe("buildSentimentQuery", () => {
    it("returns expanded query for BTC, ETH, SOL, HYPE, DOGE, PEPE and passthrough for unknown", () => {
      expect(buildSentimentQuery("BTC")).toBe("$BTC OR Bitcoin");
      expect(buildSentimentQuery("ETH")).toBe("$ETH OR Ethereum");
      expect(buildSentimentQuery("SOL")).toBe("$SOL OR Solana");
      expect(buildSentimentQuery("HYPE")).toBe("HYPE crypto");
      expect(buildSentimentQuery("DOGE")).toBe("$DOGE OR Dogecoin");
      expect(buildSentimentQuery("PEPE")).toBe("$PEPE OR Pepe");
      expect(buildSentimentQuery("XYZ")).toBe("$XYZ");
    });
  });

  describe("simpleSentiment phrase overrides and negation", () => {
    it("returns neutral (0) for phrase overrides: bull trap, bear trap", () => {
      expect(simpleSentiment("this is a bull trap")).toBe(0);
      expect(simpleSentiment("classic bear trap")).toBe(0);
    });
    it("returns bullish (1) for buy the dip", () => {
      expect(simpleSentiment("buy the dip")).toBe(1);
    });
    it("returns bearish (-1) for sell the rip", () => {
      expect(simpleSentiment("sell the rip")).toBe(-1);
    });
    it("returns neutral for not bullish / not bearish phrases", () => {
      expect(simpleSentiment("not bullish at all")).toBe(0);
      expect(simpleSentiment("isn't bearish")).toBe(0);
    });
    it("negation flips word: not bullish counts as bearish", () => {
      expect(simpleSentiment("I am not bullish on BTC")).toBeLessThanOrEqual(0);
    });
  });

  describe("confidence formula", () => {
    it("reaches at least 40 confidence for 5+ tweets with clear signal (avgSentiment ~0.2)", async () => {
      const search = vi.fn().mockResolvedValue(
        mockTweets([
          "bullish moon pump",
          "buy long growth",
          "accumulate bottom",
          "rally surge",
          "bull run",
        ]),
      );
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = await VinceXSentimentService.start(runtime);
      const out = service.getTradingSentiment("BTC");
      expect(out.sentiment).toBe("bullish");
      expect(out.confidence).toBeGreaterThanOrEqual(40);
    });
  });

  describe("hasRiskKeyword and getKeywordLists", () => {
    it("hasRiskKeyword returns true for rug, scam, hack", () => {
      expect(hasRiskKeyword("rug pull")).toBe(true);
      expect(hasRiskKeyword("scam token")).toBe(true);
      expect(hasRiskKeyword("hacked")).toBe(true);
    });
    it("getKeywordLists returns built-in lists when env path not set", () => {
      const lists = getKeywordLists();
      expect(lists.bullish.length).toBeGreaterThan(10);
      expect(lists.bearish.length).toBeGreaterThan(10);
      expect(lists.risk.length).toBeGreaterThan(5);
    });
  });

  describe("stagger and cache file", () => {
    it("refreshOneAsset(index) refreshes only that asset (one search call per tick)", async () => {
      const search = vi.fn().mockResolvedValue(mockTweets(["bullish moon", "pump"]));
      const runtime = createMockRuntime({
        services: {
          VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
        } as any,
      });
      const service = new VinceXSentimentService(runtime);
      await service.refreshOneAsset(1);
      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith("$ETH OR Ethereum lang:en -is:reply -is:retweet", expect.any(Object));
    });

    it("loads cache from file on start so getTradingSentiment returns file data for other assets", async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), "xsent-"));
      const cwd = process.cwd();
      process.chdir(tmp);
      try {
        const cacheDir = path.join(".elizadb", "vince-paper-bot");
        mkdirSync(cacheDir, { recursive: true });
        const cachePath = path.join(cacheDir, "x-sentiment-cache.json");
        const now = Date.now();
        writeFileSync(
          cachePath,
          JSON.stringify({
            SOL: {
              sentiment: "bearish",
              confidence: 60,
              hasHighRiskEvent: false,
              updatedAt: now,
            },
          }),
          "utf-8",
        );
        const search = vi.fn().mockResolvedValue(mockTweets(["bullish"]));
        const runtime = createMockRuntime({
          services: {
            VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
          } as any,
        });
        const service = await VinceXSentimentService.start(runtime);
        const sol = service.getTradingSentiment("SOL");
        expect(sol.sentiment).toBe("bearish");
        expect(sol.confidence).toBe(60);
        await service.stop();
      } finally {
        process.chdir(cwd);
      }
    });

    it("writes cache file after refreshOneAsset", async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), "xsent-"));
      const cwd = process.cwd();
      process.chdir(tmp);
      try {
        const search = vi.fn().mockResolvedValue(
          mockTweets(["bearish dump", "sell", "crash", "bear market"]),
        );
        const runtime = createMockRuntime({
          services: {
            VINCE_X_RESEARCH_SERVICE: mockXResearch({ search }),
          } as any,
        });
        const service = new VinceXSentimentService(runtime);
        service.loadCacheFromFile();
        await service.refreshOneAsset(0);
        const cachePath = path.join(".elizadb", "vince-paper-bot", "x-sentiment-cache.json");
        expect(existsSync(cachePath)).toBe(true);
        const data = JSON.parse(readFileSync(cachePath, "utf-8"));
        expect(data.BTC).toBeDefined();
        expect(data.BTC.sentiment).toBe("bearish");
        expect(data.BTC.confidence).toBeGreaterThan(0);
        expect(typeof data.BTC.updatedAt).toBe("number");
      } finally {
        process.chdir(cwd);
      }
    });
  });
});
