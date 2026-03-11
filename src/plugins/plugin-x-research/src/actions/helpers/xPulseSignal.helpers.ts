import type {
  XBreakingContent,
  XThreadSummary,
} from "../../types/analysis.types";
import type { XTweet } from "../../types/tweet.types";
import {
  getAccountTier,
  getAccountReliability,
} from "../../constants/qualityAccounts";

function detectTopic(text: string): string {
  const t = text.toLowerCase();
  if (/\b(bitcoin|btc)\b/.test(t)) return "btc";
  if (/\b(ethereum|eth)\b/.test(t)) return "eth";
  if (/\b(solana|sol)\b/.test(t)) return "sol";
  if (/\b(hype|hyperliquid)\b/.test(t)) return "hype";
  if (/\b(sec|cpi|fed|rates|macro)\b/.test(t)) return "macro";
  return "crypto";
}

function inferThreadCount(tweet: XTweet): number {
  const text = tweet.text ?? "";
  const explicit = text.match(/\b(\d{1,2})\/\d{1,2}\b/);
  if (explicit) {
    const n = parseInt(explicit[1], 10);
    if (Number.isFinite(n) && n > 1) return n;
  }
  // Prefer conservative estimate from engagement if no explicit counter found.
  const replies = tweet.metrics?.replyCount ?? 0;
  if (replies >= 12) return 4;
  if (replies >= 6) return 3;
  if (replies >= 2) return 2;
  return 1;
}

export function findThreads(tweets: XTweet[]): XThreadSummary[] {
  return tweets
    .filter((t) => t.computed?.isThread && t.metrics)
    .map((t) => ({
      id: t.id,
      author: {
        username: t.author?.username ?? "unknown",
        name: t.author?.name ?? "Unknown",
        tier: t.computed?.qualityTier ?? "standard",
      },
      topic: detectTopic(t.text ?? ""),
      hook: t.text.slice(0, 280),
      tweetCount: inferThreadCount(t),
      engagement: {
        likes: t.metrics!.likeCount,
        retweets: t.metrics!.retweetCount,
        replies: t.metrics!.replyCount,
      },
      velocity: t.computed?.velocity ?? 0,
      url: `https://x.com/${t.author?.username}/status/${t.id}`,
    }))
    .sort((a, b) => b.velocity - a.velocity);
}

export function findBreakingContent(
  tweets: XTweet[],
  breakingVelocityThreshold: number,
): XBreakingContent[] {
  const seen = new Map<string, number>();
  const noveltyPenalty = (tweet: XTweet): number => {
    const key = (tweet.text ?? "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^\w\s$#]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (!key) return 1;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    return count > 1 ? 0.72 : 1;
  };

  const qualityWeight = (tweet: XTweet): number => {
    const username = tweet.author?.username ?? "";
    const tier = getAccountTier(username);
    const reliability = getAccountReliability(username) / 100;
    const tierWeight =
      tier === "whale"
        ? 1.45
        : tier === "alpha"
          ? 1.3
          : tier === "quality"
            ? 1.2
            : tier === "verified"
              ? 1.05
              : 1.0;
    return tierWeight * Math.max(0.7, Math.min(1.2, reliability + 0.35));
  };

  return tweets
    .filter((t) => (t.computed?.velocity ?? 0) >= breakingVelocityThreshold)
    .map((t) => {
      const velocity = t.computed?.velocity ?? 0;
      const engagementScore =
        (t.metrics?.likeCount ?? 0) +
        (t.metrics?.retweetCount ?? 0) * 2.4 +
        (t.metrics?.quoteCount ?? 0) * 2.8 +
        (t.metrics?.replyCount ?? 0) * 1.5;
      const weightedVelocity =
        (velocity + engagementScore / 8) * qualityWeight(t) * noveltyPenalty(t);
      return {
        tweet: t,
        reason: `${Math.round(velocity)} likes/hour`,
        velocity: weightedVelocity,
        topic: detectTopic(t.text ?? ""),
        urgency: (weightedVelocity > 500
          ? "high"
          : weightedVelocity > 200
            ? "medium"
            : "low") as "high" | "medium" | "low",
      };
    })
    .sort((a, b) => b.velocity - a.velocity);
}
