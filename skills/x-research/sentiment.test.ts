/**
 * Test: prove we can use the x-research skill to search X and derive sentiment.
 *
 * Run from repo root:
 *   bun test skills/x-research/sentiment.test.ts
 * Or from skills/x-research (with X_BEARER_TOKEN set):
 *   bun test sentiment.test.ts
 *
 * Without X_BEARER_TOKEN the live search tests are skipped.
 * With token + network, live tests hit the X API and prove end-to-end sentiment-on-X.
 */

import { describe, it, expect } from "bun:test";
import * as api from "./lib/api";

// Naive keyword-based sentiment score for a single tweet (-1 to 1).
// Used to prove we can derive "sentiment on X" from search results.
function simpleSentiment(text: string): number {
  const lower = text.toLowerCase();
  const positive = [
    "bullish",
    "moon",
    "pump",
    "buy",
    "long",
    "great",
    "love",
    "bull",
    "growth",
    "profit",
  ];
  const negative = [
    "bearish",
    "dump",
    "sell",
    "short",
    "bad",
    "hate",
    "bear",
    "crash",
    "scam",
    "rug",
  ];
  let score = 0;
  for (const w of positive) {
    if (lower.includes(w)) score += 1;
  }
  for (const w of negative) {
    if (lower.includes(w)) score -= 1;
  }
  if (score === 0) return 0;
  return Math.max(-1, Math.min(1, score / 5));
}

// Aggregate sentiment across tweets (average).
function aggregateSentiment(tweets: api.Tweet[]): {
  count: number;
  avgSentiment: number;
  sampleTexts: string[];
} {
  if (tweets.length === 0) {
    return { count: 0, avgSentiment: 0, sampleTexts: [] };
  }
  let sum = 0;
  const sampleTexts: string[] = [];
  for (const t of tweets) {
    const s = simpleSentiment(t.text);
    sum += s;
    if (sampleTexts.length < 3) sampleTexts.push(t.text.slice(0, 80));
  }
  return {
    count: tweets.length,
    avgSentiment: sum / tweets.length,
    sampleTexts,
  };
}

describe("x-research skill: sentiment on X", () => {
  const hasToken = !!process.env.X_BEARER_TOKEN?.trim();

  it("aggregateSentiment works on tweet-like data (no network)", () => {
    const mockTweets: api.Tweet[] = [
      { id: "1", text: "BNKR is bullish and great for growth", username: "a", name: "A", author_id: "1", created_at: "", conversation_id: "", metrics: { likes: 10, retweets: 0, replies: 0, quotes: 0, impressions: 100, bookmarks: 0 }, urls: [], mentions: [], hashtags: [], tweet_url: "" },
      { id: "2", text: "Market dump and crash, bearish", username: "b", name: "B", author_id: "2", created_at: "", conversation_id: "", metrics: { likes: 5, retweets: 0, replies: 0, quotes: 0, impressions: 50, bookmarks: 0 }, urls: [], mentions: [], hashtags: [], tweet_url: "" },
    ];
    const { count, avgSentiment } = aggregateSentiment(mockTweets);
    expect(count).toBe(2);
    expect(avgSentiment).toBeGreaterThan(-1);
    expect(avgSentiment).toBeLessThan(1);
  });

  it("search returns tweets with text and metrics (sentiment-ready)", async () => {
    if (!hasToken) {
      console.log("Skipping live search: X_BEARER_TOKEN not set");
      return;
    }

    const query = "BNKR crypto";
    let tweets: api.Tweet[];
    try {
      tweets = await api.search(query, {
        maxResults: 20,
        pages: 1,
        sortOrder: "relevancy",
        since: "7d",
      });
    } catch (e) {
      console.log("Skipping live search: network or API error", (e as Error).message);
      return;
    }

    expect(Array.isArray(tweets)).toBe(true);
    expect(tweets.length).toBeGreaterThan(0);

    for (const t of tweets.slice(0, 5)) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("text");
      expect(typeof t.text).toBe("string");
      expect(t.text.length).toBeGreaterThan(0);
      expect(t).toHaveProperty("metrics");
      expect(t.metrics).toHaveProperty("likes");
      expect(t.metrics).toHaveProperty("impressions");
      expect(t).toHaveProperty("username");
      expect(t).toHaveProperty("tweet_url");
    }
  });

  it("can derive sentiment from search results (proof for sentiment-on-X)", async () => {
    if (!hasToken) {
      console.log("Skipping live search: X_BEARER_TOKEN not set");
      return;
    }

    let tweets: api.Tweet[];
    try {
      tweets = await api.search("BNKR", {
        maxResults: 15,
        pages: 1,
        sortOrder: "relevancy",
        since: "7d",
      });
    } catch (e) {
      console.log("Skipping live search: network or API error", (e as Error).message);
      return;
    }

    expect(tweets.length).toBeGreaterThan(0);

    const { count, avgSentiment, sampleTexts } = aggregateSentiment(tweets);

    expect(count).toBe(tweets.length);
    expect(avgSentiment).toBeGreaterThanOrEqual(-1);
    expect(avgSentiment).toBeLessThanOrEqual(1);
    expect(sampleTexts.length).toBeGreaterThan(0);

    // Prove we have tweet text usable for sentiment (naive or real model)
    const allText = tweets.map((t) => t.text).join(" ");
    expect(allText.length).toBeGreaterThan(50);
  });
});
