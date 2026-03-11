/**
 * Action handler tests for X_ACCOUNT, X_MENTIONS, X_NEWS, X_PULSE, X_THREAD, X_VIBE, X_WATCHLIST.
 * Uses vi.mock for services - each describe sets up mocks for its action.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  Memory,
  IAgentRuntime,
  HandlerCallback,
  State,
} from "@elizaos/core";

const mockInitXClient = vi.fn();
const mockGetXAccountsService = vi.fn();
const mockGetXClient = vi.fn();
const mockGetXNewsService = vi.fn();
const mockGetXSearchService = vi.fn();
const mockGetXSentimentService = vi.fn();
const mockGetXThreadsService = vi.fn();
const mockGetMandoContextForX = vi.fn();

vi.mock("../services/xClient.service", () => ({
  initXClientFromEnv: (...args: unknown[]) => mockInitXClient(...args),
  getXClient: () => mockGetXClient(),
}));

vi.mock("../services/xAccounts.service", () => ({
  getXAccountsService: () => mockGetXAccountsService(),
}));

vi.mock("../services/xNews.service", () => ({
  getXNewsService: () => mockGetXNewsService(),
}));

vi.mock("../services/xSearch.service", () => ({
  getXSearchService: () => mockGetXSearchService(),
  selectFairQuickTopics: (topicIds: string[], count = 4) =>
    topicIds.slice(0, count),
}));

vi.mock("../services/xSentiment.service", () => ({
  getXSentimentService: () => mockGetXSentimentService(),
}));

vi.mock("../services/xThreads.service", () => ({
  getXThreadsService: () => mockGetXThreadsService(),
}));

vi.mock("../utils/mandoContext", () => ({
  getMandoContextForX: (...args: unknown[]) => mockGetMandoContextForX(...args),
}));

function createMemory(text: string, roomId?: string): Memory {
  return {
    content: { text },
    entityId: "00000000-0000-0000-0000-000000000001",
    userId: "u1",
    agentId: "00000000-0000-0000-0000-00000000000a",
    roomId: roomId ?? "room-1",
  } as Memory;
}

function createState(overrides?: Partial<State>): State {
  return { values: {}, data: {}, text: "", ...overrides };
}

function createCallback(): HandlerCallback {
  return vi.fn();
}

function expectExactKeys(value: unknown, expected: string[]): void {
  const obj = value as Record<string, unknown>;
  expect(Object.keys(obj).sort()).toEqual([...expected].sort());
}

const mockRuntime = {} as IAgentRuntime;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("X_ACCOUNT handler", () => {
  it("calls callback with help when no username", async () => {
    const { xAccountAction } = await import("../actions/xAccount.action");
    const callback = createCallback();
    await xAccountAction.handler!(
      mockRuntime,
      createMemory("Tell me about"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("username"),
        action: "X_ACCOUNT",
      }),
    );
  });

  it("calls callback when analysis is null", async () => {
    mockGetXAccountsService.mockReturnValue({
      analyzeAccount: vi.fn().mockResolvedValue(null),
      getRecentTakes: vi.fn(),
      findSimilarAccounts: vi.fn(),
    });
    const { xAccountAction } = await import("../actions/xAccount.action");
    const callback = createCallback();
    await xAccountAction.handler!(
      mockRuntime,
      createMemory("Who is @nobody123?"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Couldn't find"),
        action: "X_ACCOUNT",
      }),
    );
  });

  it("calls callback with analysis on success", async () => {
    const analyzeAccount = vi.fn().mockResolvedValue({
      username: "trader1",
      tier: "whale",
      tierReason: "100K followers",
      metrics: { followers: 100000, avgLikes: 500, engagementRate: 0.5 },
      topicFocus: ["btc", "eth"],
      sentimentBias: "bullish",
      reliability: 85,
    });
    const getRecentTakes = vi
      .fn()
      .mockResolvedValue([{ text: "BTC looking strong", id: "1" }]);
    const findSimilarAccounts = vi.fn().mockResolvedValue(["user2", "user3"]);
    mockGetXAccountsService.mockReturnValue({
      analyzeAccount,
      getRecentTakes,
      findSimilarAccounts,
    });
    const { xAccountAction } = await import("../actions/xAccount.action");
    const callback = createCallback();
    await xAccountAction.handler!(
      mockRuntime,
      createMemory("Who is @trader1?"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("@trader1"),
        action: "X_ACCOUNT",
      }),
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Trading Signal"),
      }),
    );
    expect(analyzeAccount).toHaveBeenCalledWith("trader1");
  });
});

describe("X_MENTIONS handler", () => {
  it("calls callback with help when no match", async () => {
    const { xMentionsAction } = await import("../actions/xMentions.action");
    const callback = createCallback();
    await xMentionsAction.handler!(
      mockRuntime,
      createMemory("random message"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("username"),
        action: "X_MENTIONS",
      }),
    );
  });

  it("calls callback when user not found", async () => {
    mockGetXClient.mockReturnValue({
      getUserByUsername: vi.fn().mockResolvedValue(null),
    });
    const { xMentionsAction } = await import("../actions/xMentions.action");
    const callback = createCallback();
    (mockRuntime as { useModel?: unknown }).useModel = vi.fn();
    await xMentionsAction.handler!(
      mockRuntime,
      createMemory("What are people saying to @nonexistent?"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Couldn't find"),
        action: "X_MENTIONS",
      }),
    );
  });

  it("calls callback with mentions summary on success", async () => {
    mockGetXClient.mockReturnValue({
      getUserByUsername: vi
        .fn()
        .mockResolvedValue({ id: "u1", username: "trader" }),
      getUserMentions: vi.fn().mockResolvedValue([
        {
          text: "great take agree",
          id: "1",
          author: {},
          metrics: { likeCount: 10 },
        },
        {
          text: "why do you think that",
          id: "2",
          author: {},
          metrics: { likeCount: 5 },
        },
      ]),
    });
    (mockRuntime as { useModel?: unknown }).useModel = vi
      .fn()
      .mockResolvedValue("Theme 1\nTheme 2");
    const { xMentionsAction } = await import("../actions/xMentions.action");
    const callback = createCallback();
    await xMentionsAction.handler!(
      mockRuntime,
      createMemory("What are people saying to @trader?"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("@trader"),
        action: "X_MENTIONS",
      }),
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Trading Signal"),
      }),
    );
  });
});

describe("X_NEWS handler", () => {
  it("calls callback when no news and no fallback", async () => {
    mockGetXNewsService.mockReturnValue({
      getDailyTopNews: vi.fn().mockResolvedValue([]),
    });
    mockGetMandoContextForX.mockResolvedValue(null);
    const { xNewsAction } = await import("../actions/xNews.action");
    const callback = createCallback();
    await xNewsAction.handler!(
      mockRuntime,
      createMemory("crypto news"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("No crypto news"),
        action: "X_NEWS",
      }),
    );
  });

  it("calls callback with news on success", async () => {
    mockGetXNewsService.mockReturnValue({
      getDailyTopNews: vi.fn().mockResolvedValue([
        {
          name: "ETF approved",
          summary: "BTC spot ETF sees record inflows.",
          sentiment: "bullish",
          relevanceScore: 95,
          impactLevel: "high" as const,
        },
      ]),
    });
    const { xNewsAction } = await import("../actions/xNews.action");
    const callback = createCallback();
    await xNewsAction.handler!(
      mockRuntime,
      createMemory("x news", "room-news"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("X News"),
        action: "X_NEWS",
      }),
    );
  });
});

describe("X_PULSE handler", () => {
  it("calls callback when no tweets (generic)", async () => {
    mockGetXSearchService.mockReturnValue({
      searchMultipleTopics: vi.fn().mockResolvedValue(new Map([["btc", []]])),
    });
    mockGetXSentimentService.mockReturnValue({ analyzeSentiment: vi.fn() });
    mockGetMandoContextForX.mockResolvedValue(null);
    const { xPulseAction } = await import("../actions/xPulse.action");
    const callback = createCallback();
    await xPulseAction.handler!(
      mockRuntime,
      createMemory("x pulse"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("No recent data"),
        action: "X_PULSE",
      }),
    );
  });

  it("calls callback with pulse on success", async () => {
    const tweets = [
      {
        id: "1",
        text: "BTC bullish",
        author: { username: "u1" },
        metrics: { likeCount: 100 },
        computed: { qualityTier: "whale" },
        createdAt: new Date().toISOString(),
      },
    ];
    mockGetXSearchService.mockReturnValue({
      searchMultipleTopics: vi
        .fn()
        .mockResolvedValue(new Map([["btc", tweets]])),
      detectVolumeSpikes: vi.fn().mockResolvedValue([]),
    });
    mockGetXSentimentService.mockReturnValue({
      analyzeSentiment: vi.fn().mockReturnValue({
        overallScore: 42,
        confidence: 0.7,
        topicScores: {},
        summary: "Bullish",
        contrarianWarning: null,
      }),
    });
    mockGetMandoContextForX.mockResolvedValue(null);
    (mockRuntime as { useModel?: unknown }).useModel = vi
      .fn()
      .mockResolvedValue("Briefing text");
    const { xPulseAction } = await import("../actions/xPulse.action");
    const callback = createCallback();
    await xPulseAction.handler!(
      mockRuntime,
      createMemory("x pulse", "room-pulse"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(/X Pulse|Briefing/),
        action: "X_PULSE",
      }),
    );
  });
});

describe("X_THREAD handler", () => {
  it("calls callback with help when no tweetId", async () => {
    const { xThreadAction } = await import("../actions/xThread.action");
    const callback = createCallback();
    await xThreadAction.handler!(
      mockRuntime,
      createMemory("summarize thread"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("tweet URL or ID"),
        action: "X_THREAD",
      }),
    );
  });

  it("calls callback when thread empty", async () => {
    mockGetXThreadsService.mockReturnValue({
      getThread: vi.fn().mockResolvedValue([]),
      summarizeThread: vi.fn(),
    });
    const { xThreadAction } = await import("../actions/xThread.action");
    const callback = createCallback();
    await xThreadAction.handler!(
      mockRuntime,
      createMemory("https://x.com/user/status/1234567890123"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Couldn't fetch"),
        action: "X_THREAD",
      }),
    );
  });

  it("calls callback with summary on success", async () => {
    const tweets = [
      { id: "1", text: "Point 1", author: { username: "author" } },
      { id: "2", text: "Point 2", author: { username: "author" } },
    ];
    mockGetXThreadsService.mockReturnValue({
      getThread: vi.fn().mockResolvedValue(tweets),
      summarizeThread: vi.fn().mockReturnValue({
        author: { username: "author", tier: "standard" },
        tweetCount: 2,
        engagement: { likes: 1000, retweets: 100 },
        url: "https://x.com/author/status/123",
      }),
    });
    (mockRuntime as { useModel?: unknown }).useModel = vi
      .fn()
      .mockResolvedValue("TL;DR summary");
    const { xThreadAction } = await import("../actions/xThread.action");
    const callback = createCallback();
    await xThreadAction.handler!(
      mockRuntime,
      createMemory("https://x.com/author/status/1234567890123"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Thread Summary"),
        action: "X_THREAD",
      }),
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Trading Signal"),
      }),
    );
  });
});

describe("X_VIBE handler", () => {
  it("calls callback with help when no topic detected", async () => {
    const { xVibeAction } = await import("../actions/xVibe.action");
    const callback = createCallback();
    await xVibeAction.handler!(
      mockRuntime,
      createMemory("what is the vibe"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("topic"),
        action: "X_VIBE",
      }),
    );
  });

  it("calls callback with vibe on success", async () => {
    const tweets = [
      {
        id: "1",
        text: "ETH up",
        author: { username: "u1" },
        metrics: { likeCount: 50 },
      },
    ];
    mockGetXSearchService.mockReturnValue({
      searchTopic: vi.fn().mockResolvedValue(tweets),
    });
    mockGetXSentimentService.mockReturnValue({
      getTopicVibe: vi.fn().mockReturnValue({
        direction: "bearish",
        weightedScore: -28,
        confidence: 65,
        breakdown: { bullishCount: 23, bearishCount: 47, neutralCount: 30 },
        whaleAlignment: 12,
        isContrarian: false,
        contrarianNote: null,
      }),
    });
    mockGetMandoContextForX.mockResolvedValue(null);
    (mockRuntime as { useModel?: unknown }).useModel = vi
      .fn()
      .mockResolvedValue("Vibe summary");
    const { xVibeAction } = await import("../actions/xVibe.action");
    const callback = createCallback();
    await xVibeAction.handler!(
      mockRuntime,
      createMemory("What's the vibe on ETH?", "room-vibe"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringMatching(/ETH|Vibe/),
        action: "X_VIBE",
      }),
    );
  });
});

describe("X_BTC_LONG_TERM_SENTIMENT handler", () => {
  it("calls callback with no-data response when searches are empty", async () => {
    mockGetXSearchService.mockReturnValue({
      searchTopic: vi.fn().mockResolvedValue([]),
      searchQuery: vi.fn().mockResolvedValue([]),
    });
    const { xBtcLongTermSentimentAction } =
      await import("../actions/xBtcLongTermSentiment.action");
    const callback = createCallback();
    await xBtcLongTermSentimentAction.handler!(
      mockRuntime,
      createMemory("Give me BTC long-term sentiment and price targets"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          "No recent long-horizon BTC prediction posts",
        ),
        action: "X_BTC_LONG_TERM_SENTIMENT",
      }),
    );
  });

  it("calls callback with long-term sentiment output on success", async () => {
    mockGetXSearchService.mockReturnValue({
      searchTopic: vi.fn().mockResolvedValue([
        {
          id: "1",
          text: "Bitcoin long term still bullish, 150k year end target",
          createdAt: new Date().toISOString(),
        },
      ]),
      searchQuery: vi.fn().mockResolvedValue([
        {
          id: "2",
          text: "BTC base case 120k, bear case 80k, bull case 200k",
          createdAt: new Date().toISOString(),
        },
      ]),
    });
    (mockRuntime as { useModel?: unknown }).useModel = vi
      .fn()
      .mockResolvedValue("Long-term BTC narrative");
    const { xBtcLongTermSentimentAction } =
      await import("../actions/xBtcLongTermSentiment.action");
    const callback = createCallback();
    await xBtcLongTermSentimentAction.handler!(
      mockRuntime,
      createMemory("btc long term prediction sentiment"),
      createState(),
      {},
      callback as HandlerCallback,
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("BTC Long-Term Sentiment"),
        action: "X_BTC_LONG_TERM_SENTIMENT",
      }),
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Trading Signal"),
      }),
    );
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "X_BTC_LONG_TERM_SENTIMENT",
        btcLongTermSignal: expect.objectContaining({
          schemaVersion: 1,
          asset: "BTC",
          targets: expect.objectContaining({
            median: expect.any(Number),
          }),
        }),
      }),
    );
    const payload = (callback as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expectExactKeys(payload.btcLongTermSignal, [
      "schemaVersion",
      "asset",
      "lookbackHours",
      "sampleSize",
      "directionBias",
      "confidence",
      "targets",
      "cueCounts",
    ]);
    expectExactKeys(payload.btcLongTermSignal.targets, [
      "floor",
      "median",
      "tail",
    ]);
    expectExactKeys(payload.btcLongTermSignal.cueCounts, [
      "bullish",
      "bearish",
    ]);
  });
});

describe("X_WATCHLIST handler", () => {
  it("calls callback when watchlist empty", async () => {
    const origPath = process.env.X_WATCHLIST_PATH;
    const testDir = join(tmpdir(), `watchlist-empty-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const emptyPath = join(testDir, "watchlist-empty.json");
    writeFileSync(emptyPath, '{"accounts":[]}', "utf-8");
    process.env.X_WATCHLIST_PATH = emptyPath;
    try {
      const { xWatchlistAction } = await import("../actions/xWatchlist.action");
      const callback = createCallback();
      await xWatchlistAction.handler!(
        mockRuntime,
        createMemory("check my watchlist"),
        createState(),
        {},
        callback as HandlerCallback,
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("empty"),
          action: "X_WATCHLIST",
        }),
      );
    } finally {
      if (origPath !== undefined) process.env.X_WATCHLIST_PATH = origPath;
      else delete process.env.X_WATCHLIST_PATH;
    }
  });

  it("calls callback with watchlist on success", async () => {
    const testDir = join(tmpdir(), `watchlist-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const watchlistPath = join(testDir, "watchlist.json");
    writeFileSync(
      watchlistPath,
      JSON.stringify({
        accounts: [
          {
            username: "trader1",
            note: "whale",
            addedAt: new Date().toISOString(),
          },
        ],
      }),
      "utf-8",
    );
    const origPath = process.env.X_WATCHLIST_PATH;
    process.env.X_WATCHLIST_PATH = watchlistPath;
    mockGetXAccountsService.mockReturnValue({
      getRecentTakes: vi
        .fn()
        .mockResolvedValue([
          { text: "BTC strong", metrics: { likeCount: 100 } },
        ]),
    });
    try {
      const { xWatchlistAction } = await import("../actions/xWatchlist.action");
      const callback = createCallback();
      await xWatchlistAction.handler!(
        mockRuntime,
        createMemory("check my watchlist"),
        createState(),
        {},
        callback as HandlerCallback,
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("@trader1"),
          action: "X_WATCHLIST",
        }),
      );
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Trading Signal"),
        }),
      );
    } finally {
      if (origPath !== undefined) process.env.X_WATCHLIST_PATH = origPath;
      else delete process.env.X_WATCHLIST_PATH;
    }
  });
});
