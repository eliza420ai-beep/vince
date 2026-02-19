/**
 * X Threads Service
 *
 * Thread detection and fetching.
 * Identifies multi-tweet threads and fetches complete content.
 */

import { getXClient, XClientService } from "./xClient.service";
import type { XTweet } from "../types/tweet.types";
import type { XThreadSummary } from "../types/analysis.types";
import { getAccountTier } from "../constants/qualityAccounts";

export interface ThreadFetchOptions {
  maxTweets?: number;
  includeReplies?: boolean;
}

export interface ThreadDetectionResult {
  isThread: boolean;
  threadId?: string;
  position?: number;
  indicators: string[];
}

/**
 * X Threads Service
 */
export class XThreadsService {
  private client: XClientService;

  constructor(client?: XClientService) {
    this.client = client ?? getXClient();
  }

  /**
   * Detect if a tweet is part of a thread
   */
  detectThread(tweet: XTweet): ThreadDetectionResult {
    const indicators: string[] = [];
    let isThread = false;

    const text = tweet.text.toLowerCase();

    // Check for thread indicators in text
    if (text.includes("🧵") || text.includes("thread")) {
      indicators.push("thread_emoji_or_word");
      isThread = true;
    }

    if (text.match(/^\d+[.\/]/)) {
      indicators.push("numbered_tweet");
      isThread = true;
    }

    if (text.includes("1/") || text.match(/\(\d+\/\d+\)/)) {
      indicators.push("fraction_notation");
      isThread = true;
    }

    // Check if it's a self-reply (reply to own tweet)
    if (tweet.referencedTweets) {
      const selfReply = tweet.referencedTweets.find(
        (ref) => ref.type === "replied_to" && ref.id === tweet.conversationId,
      );
      if (selfReply) {
        indicators.push("self_reply");
        isThread = true;
      }
    }

    // Check if conversation_id matches (this is the root of a thread)
    if (tweet.conversationId === tweet.id && indicators.length > 0) {
      indicators.push("is_thread_root");
    }

    return {
      isThread,
      threadId: isThread ? tweet.conversationId : undefined,
      position: this.detectPosition(tweet),
      indicators,
    };
  }

  /**
   * Fetch a complete thread by conversation ID
   */
  async fetchThread(
    conversationId: string,
    options: ThreadFetchOptions = {},
  ): Promise<XTweet[]> {
    const { maxTweets = 50, includeReplies = false } = options;

    // Search for tweets in this conversation
    let query = `conversation_id:${conversationId}`;
    if (!includeReplies) {
      // Only get the original author's tweets
      query += " -is:reply";
    }

    const response = await this.client.searchRecent(query, {
      maxResults: Math.min(maxTweets, 100),
      sortOrder: "recency",
    });

    const tweets = response.data ?? [];

    // Sort by position in thread (created_at ascending)
    return tweets.sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return aTime - bTime;
    });
  }

  /**
   * Get thread by URL or tweet ID
   */
  async getThread(tweetIdOrUrl: string): Promise<XTweet[]> {
    // Extract tweet ID from URL if needed
    const tweetId = this.extractTweetId(tweetIdOrUrl);
    if (!tweetId) {
      throw new Error("Invalid tweet ID or URL");
    }

    // Get the tweet first
    const tweet = await this.client.getTweet(tweetId);
    if (!tweet) {
      throw new Error("Tweet not found");
    }

    // Fetch the full thread
    const conversationId = tweet.conversationId ?? tweetId;
    return this.fetchThread(conversationId);
  }

  /**
   * Summarize a thread
   */
  summarizeThread(tweets: XTweet[]): XThreadSummary | null {
    if (tweets.length === 0) return null;

    const rootTweet = tweets[0];
    const username = rootTweet.author?.username ?? "unknown";

    // Combine all text
    const fullText = tweets.map((t) => t.text).join("\n\n");

    // Calculate total engagement
    const totalLikes = tweets.reduce(
      (sum, t) => sum + (t.metrics?.likeCount ?? 0),
      0,
    );
    const totalRetweets = tweets.reduce(
      (sum, t) => sum + (t.metrics?.retweetCount ?? 0),
      0,
    );
    const totalReplies = tweets.reduce(
      (sum, t) => sum + (t.metrics?.replyCount ?? 0),
      0,
    );

    // Calculate velocity based on root tweet
    let velocity = 0;
    if (rootTweet.createdAt && rootTweet.metrics) {
      const ageMs = Date.now() - new Date(rootTweet.createdAt).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours > 0.1) {
        velocity = totalLikes / ageHours;
      }
    }

    return {
      id: rootTweet.id,
      author: {
        username,
        name: rootTweet.author?.name ?? username,
        tier: getAccountTier(username),
      },
      topic: "crypto", // TODO: detect from content
      hook: rootTweet.text.slice(0, 280),
      tweetCount: tweets.length,
      engagement: {
        likes: totalLikes,
        retweets: totalRetweets,
        replies: totalReplies,
      },
      velocity,
      url: `https://x.com/${username}/status/${rootTweet.id}`,
    };
  }

  /**
   * Find threads from a list of tweets
   */
  findThreads(tweets: XTweet[]): XTweet[] {
    return tweets.filter((tweet) => {
      const detection = this.detectThread(tweet);
      return (
        detection.isThread && detection.indicators.includes("is_thread_root")
      );
    });
  }

  /**
   * Get top threads by engagement
   */
  async getTopThreads(tweets: XTweet[], limit = 5): Promise<XThreadSummary[]> {
    // Find thread roots
    const threadRoots = this.findThreads(tweets);

    // Sort by engagement
    const sorted = threadRoots.sort((a, b) => {
      const aEngagement =
        (a.metrics?.likeCount ?? 0) + (a.metrics?.retweetCount ?? 0) * 3;
      const bEngagement =
        (b.metrics?.likeCount ?? 0) + (b.metrics?.retweetCount ?? 0) * 3;
      return bEngagement - aEngagement;
    });

    // Fetch and summarize top threads
    const summaries: XThreadSummary[] = [];

    for (const root of sorted.slice(0, limit)) {
      try {
        const threadTweets = await this.fetchThread(
          root.conversationId ?? root.id,
        );
        const summary = this.summarizeThread(threadTweets);
        if (summary) {
          summaries.push(summary);
        }
      } catch (error) {
        // If we can't fetch the thread, just summarize the root
        const summary = this.summarizeThread([root]);
        if (summary) {
          summaries.push(summary);
        }
      }
    }

    return summaries;
  }

  // ─────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────

  private extractTweetId(input: string): string | null {
    // If it's already an ID (numeric string)
    if (/^\d+$/.test(input)) {
      return input;
    }

    // Try to extract from URL
    const urlMatch = input.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    if (urlMatch) {
      return urlMatch[1];
    }

    return null;
  }

  private detectPosition(tweet: XTweet): number | undefined {
    const text = tweet.text;

    // Check for "1/" or "(1/10)" style
    const fractionMatch = text.match(/^(\d+)\//);
    if (fractionMatch) {
      return parseInt(fractionMatch[1], 10);
    }

    const parenMatch = text.match(/\((\d+)\/\d+\)/);
    if (parenMatch) {
      return parseInt(parenMatch[1], 10);
    }

    // Check for "1." style
    const dotMatch = text.match(/^(\d+)\./);
    if (dotMatch) {
      return parseInt(dotMatch[1], 10);
    }

    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────

let instance: XThreadsService | null = null;

export function getXThreadsService(): XThreadsService {
  if (!instance) {
    instance = new XThreadsService();
  }
  return instance;
}
