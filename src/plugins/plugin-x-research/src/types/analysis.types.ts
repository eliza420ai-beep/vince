/**
 * Analysis Types — Computed Analysis Results
 */

import type { SentimentResult, TopicSentiment } from './sentiment.types';
import type { XTweet, AccountTier } from './tweet.types';
import type { XNewsResult } from './news.types';
import type { TrendingTopicStatus } from './trends.types';

/**
 * X Pulse — The North Star Output
 * ALOHA-style briefing on CT sentiment and alpha
 */
export interface XPulseResult {
  timestamp: number;
  
  // Headline summary (1-2 sentences)
  headline: string;
  
  // Sentiment snapshot
  sentiment: SentimentResult;
  
  // Top threads worth reading
  threads: XThreadSummary[];
  
  // Breaking content (high velocity)
  breakingContent: XBreakingContent[];
  
  // News highlights
  news: XNewsResult[];
  
  // Trending status
  trending: TrendingTopicStatus[];
  
  // Risk warnings
  warnings: string[];
  
  // Full briefing text (ALOHA-style)
  briefing: string;
}

export interface XThreadSummary {
  id: string;
  author: {
    username: string;
    name: string;
    tier: AccountTier;
  };
  topic: string;
  hook: string;                    // First ~280 chars
  tweetCount: number;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  velocity: number;                // Engagement per hour
  url: string;
}

export interface XBreakingContent {
  tweet: XTweet;
  reason: string;                  // Why it's breaking
  velocity: number;
  topic: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface VelocityScore {
  tweetId: string;
  velocity: number;                // Likes per hour
  ageHours: number;
  currentLikes: number;
  projectedLikes24h: number;
  percentile: number;              // How it ranks vs others (0-100)
  isBreaking: boolean;             // Above threshold for "breaking"
}

export interface TopicCluster {
  name: string;                    // Cluster label
  keywords: string[];
  tweetCount: number;
  sentiment: TopicSentiment;
  topTweets: XTweet[];
  isEmerging: boolean;             // New in last 6h
  growthRate: number;              // Tweet count growth %
}

export interface ContrarianWarning {
  topic: string;
  direction: 'bullish' | 'bearish';
  severity: 'warning' | 'extreme';
  message: string;
  score: number;
  historicalContext?: string;      // What happened last time sentiment was here
}

export interface AccountAnalysis {
  userId: string;
  username: string;
  tier: AccountTier;
  tierReason: string;
  
  metrics: {
    followers: number;
    avgLikes: number;
    avgRetweets: number;
    engagementRate: number;
  };
  
  topicFocus: string[];            // What they usually talk about
  sentimentBias: 'bullish' | 'bearish' | 'neutral';
  reliability: number;             // 0-100, based on historical accuracy
}

export interface VolumeSpike {
  topic: string;
  currentVolume: number;
  avgVolume: number;
  spikeMultiple: number;           // e.g., 3x = 3
  startedAt: string;
  possibleCause?: string;
}
