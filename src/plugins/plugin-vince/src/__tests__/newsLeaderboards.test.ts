import { describe, it, expect } from "vitest";
import type { IAgentRuntime } from "@elizaos/core";

import { buildLeaderboardsResponse } from "../routes/dashboardLeaderboards";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import { createMockRuntime } from "./test-utils";

describe("Leaderboards news section", () => {
  it("returns all MandoMinutes headlines from raw cache", async () => {
    const articleCount = 39;
    const articles: Array<{ title: string; url?: string }> = [];

    for (let i = 0; i < articleCount; i++) {
      articles.push({
        title: `Headline ${i + 1}`,
        url: `https://example.com/${i + 1}`,
      });
    }

    const sentiments = articles.map((a, i) => ({
      title: a.title,
      sentiment: i % 2 === 0 ? "bullish" : "neutral",
    }));

    const services: Record<string, unknown> = {};

    const newsService: Partial<VinceNewsSentimentService> = {
      // getAllHeadlines is used only to attach sentiment to raw cache articles
      getAllHeadlines: async () => sentiments as any,
      getTLDR: () => "NEWS: Test TLDR",
    } as any;

    services["VINCE_NEWS_SENTIMENT_SERVICE"] = newsService;

    const runtime = createMockRuntime({ services }) as IAgentRuntime;

    // Override cache methods so buildNewsSection can read raw Mando cache
    const mandoCacheKey = "mando_minutes:latest:v9";
    const cache = new Map<string, unknown>();
    cache.set(mandoCacheKey, {
      articles,
      timestamp: Date.now(),
    });

    (runtime as any).getCache = async <T>(key: string): Promise<T | null> => {
      return (cache.get(key) as T) ?? null;
    };
    (runtime as any).setCache = async () => true;

    const res = await buildLeaderboardsResponse(runtime);

    expect(res.news).not.toBeNull();
    expect(res.news?.headlines).toHaveLength(articleCount);
    expect(res.news?.headlines[0]?.text).toBe("Headline 1");
    expect(res.news?.headlines[articleCount - 1]?.text).toBe(
      `Headline ${articleCount}`,
    );

    // Verify sentiment mapping from getAllHeadlines to raw cache articles
    expect(res.news?.headlines[0]?.sentiment).toBe("bullish");
    expect(res.news?.headlines[1]?.sentiment).toBe("neutral");
  });

  it("handles empty Mando cache gracefully", async () => {
    const services: Record<string, unknown> = {};

    const newsService: Partial<VinceNewsSentimentService> = {
      getAllHeadlines: async () => [],
      getTLDR: () => "NEWS: Test TLDR",
    } as any;

    services["VINCE_NEWS_SENTIMENT_SERVICE"] = newsService;

    const runtime = createMockRuntime({ services }) as IAgentRuntime;

    const cache = new Map<string, unknown>();
    (runtime as any).getCache = async <T>(key: string): Promise<T | null> => {
      return (cache.get(key) as T) ?? null;
    };
    (runtime as any).setCache = async () => true;

    const res = await buildLeaderboardsResponse(runtime);

    expect(res.news).not.toBeNull();
    expect(res.news?.headlines).toHaveLength(0);
  });

  it("filters nav-junk from raw cache headlines", async () => {
    const services: Record<string, unknown> = {};

    const newsService: Partial<VinceNewsSentimentService> = {
      getAllHeadlines: async () =>
        [
          { title: "MinutesAffiliatePodcastsFollow on", sentiment: "neutral" },
          {
            title:
              "ETF demand surges as institutions rotate into crypto risk assets",
            sentiment: "bullish",
          },
        ] as any,
      getTLDR: () => "NEWS: Test TLDR",
    } as any;

    services["VINCE_NEWS_SENTIMENT_SERVICE"] = newsService;

    const runtime = createMockRuntime({ services }) as IAgentRuntime;
    const cache = new Map<string, unknown>();
    cache.set("mando_minutes:latest:v9", {
      timestamp: Date.now(),
      articles: [
        { title: "MinutesAffiliatePodcastsFollow on" },
        {
          title:
            "ETF demand surges as institutions rotate into crypto risk assets",
        },
      ],
    });

    (runtime as any).getCache = async <T>(key: string): Promise<T | null> => {
      return (cache.get(key) as T) ?? null;
    };
    (runtime as any).setCache = async () => true;

    const res = await buildLeaderboardsResponse(runtime);
    expect(res.news).not.toBeNull();
    expect(res.news?.headlines).toHaveLength(1);
    expect(res.news?.headlines[0]?.text).toContain("ETF demand surges");
  });
});
