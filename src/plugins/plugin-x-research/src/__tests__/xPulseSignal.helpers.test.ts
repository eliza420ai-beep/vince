import { describe, expect, it } from "vitest";
import {
  findBreakingContent,
  findThreads,
} from "../actions/helpers/xPulseSignal.helpers";
import type { XTweet } from "../types/tweet.types";

function makeTweet(params: {
  id: string;
  text: string;
  username: string;
  velocity: number;
  likes?: number;
  retweets?: number;
  replies?: number;
  isThread?: boolean;
}): XTweet {
  return {
    id: params.id,
    text: params.text,
    authorId: params.username,
    conversationId: params.id,
    createdAt: new Date().toISOString(),
    author: {
      id: params.username,
      username: params.username,
      name: params.username,
    },
    metrics: {
      likeCount: params.likes ?? 100,
      retweetCount: params.retweets ?? 25,
      replyCount: params.replies ?? 12,
      quoteCount: 5,
    },
    computed: {
      velocity: params.velocity,
      isThread: params.isThread ?? false,
      qualityTier: "standard",
    },
  };
}

describe("xPulseSignal helpers", () => {
  it("findThreads keeps highest velocity first", () => {
    const tweets = [
      makeTweet({
        id: "1",
        text: "🧵 BTC thread",
        username: "alpha_one",
        velocity: 120,
        isThread: true,
      }),
      makeTweet({
        id: "2",
        text: "🧵 ETH thread",
        username: "alpha_two",
        velocity: 320,
        isThread: true,
      }),
    ];
    const out = findThreads(tweets);
    expect(out.length).toBe(2);
    expect(out[0].id).toBe("2");
  });

  it("breaking ranking penalizes duplicates and keeps novel content higher", () => {
    const tweets = [
      makeTweet({
        id: "a1",
        text: "ETF flows surge across BTC complex",
        username: "news_alpha",
        velocity: 240,
      }),
      makeTweet({
        id: "a2",
        text: "ETF flows surge across BTC complex",
        username: "news_beta",
        velocity: 260,
      }),
      makeTweet({
        id: "b1",
        text: "Hyperliquid open interest flips risk skew",
        username: "whalewatch",
        velocity: 235,
      }),
    ];

    const breaking = findBreakingContent(tweets, 150);
    expect(breaking.length).toBe(3);
    const novelIndex = breaking.findIndex((item) => item.tweet.id === "b1");
    const duplicateIndex = breaking.findIndex((item) => item.tweet.id === "a2");
    expect(novelIndex).toBeGreaterThanOrEqual(0);
    expect(duplicateIndex).toBeGreaterThanOrEqual(0);
    expect(novelIndex).toBeLessThan(duplicateIndex);
  });
});
