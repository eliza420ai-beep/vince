/**
 * X Accounts Service
 * 
 * Account analysis and discovery.
 * Profile analysis, recent takes, reputation scoring.
 */

import { getXClient, XClientService } from './xClient.service';
import type { XTweet, XUser, AccountTier } from '../types/tweet.types';
import type { AccountAnalysis } from '../types/analysis.types';
import { 
  getAccountTier, 
  getAccountReliability, 
  ACCOUNT_BY_USERNAME,
  ALL_QUALITY_ACCOUNTS,
} from '../constants/qualityAccounts';
import { ALL_TOPICS } from '../constants/topics';

export interface AccountSearchOptions {
  includeMetrics?: boolean;
  recentTweetsCount?: number;
}

/**
 * X Accounts Service
 */
export class XAccountsService {
  private client: XClientService;

  constructor(client?: XClientService) {
    this.client = client ?? getXClient();
  }

  /**
   * Get account by username
   */
  async getAccount(username: string): Promise<XUser | null> {
    // Remove @ if present
    const cleanUsername = username.replace(/^@/, '');
    return this.client.getUserByUsername(cleanUsername);
  }

  /**
   * Analyze an account
   */
  async analyzeAccount(username: string): Promise<AccountAnalysis | null> {
    const cleanUsername = username.replace(/^@/, '');
    
    // Get user profile
    const user = await this.getAccount(cleanUsername);
    if (!user) return null;

    // Get recent tweets
    const recentTweets = await this.client.getUserTweets(user.id, {
      maxResults: 20,
      excludeRetweets: true,
    });

    // Calculate metrics
    const avgLikes = recentTweets.length > 0
      ? recentTweets.reduce((sum, t) => sum + (t.metrics?.likeCount ?? 0), 0) / recentTweets.length
      : 0;

    const avgRetweets = recentTweets.length > 0
      ? recentTweets.reduce((sum, t) => sum + (t.metrics?.retweetCount ?? 0), 0) / recentTweets.length
      : 0;

    const followers = user.metrics?.followersCount ?? 0;
    const engagementRate = followers > 0 ? (avgLikes / followers) * 100 : 0;

    // Determine tier
    const tier = this.determineTier(user, avgLikes, engagementRate);
    const tierReason = this.getTierReason(tier, user, avgLikes);

    // Detect topic focus
    const topicFocus = this.detectTopicFocus(recentTweets);

    // Detect sentiment bias
    const sentimentBias = this.detectSentimentBias(recentTweets);

    // Get reliability from our database
    const reliability = getAccountReliability(cleanUsername);

    return {
      userId: user.id,
      username: cleanUsername,
      tier,
      tierReason,
      metrics: {
        followers,
        avgLikes: Math.round(avgLikes),
        avgRetweets: Math.round(avgRetweets),
        engagementRate: Math.round(engagementRate * 100) / 100,
      },
      topicFocus,
      sentimentBias,
      reliability,
    };
  }

  /**
   * Get recent takes from an account
   */
  async getRecentTakes(username: string, count = 10): Promise<XTweet[]> {
    const cleanUsername = username.replace(/^@/, '');
    const user = await this.getAccount(cleanUsername);
    if (!user) return [];

    return this.client.getUserTweets(user.id, {
      maxResults: count,
      excludeRetweets: true,
      excludeReplies: true,
    });
  }

  /**
   * Get top tweets by engagement (for content audit).
   * Fetches up to 100 tweets, sorts by likeCount + 2*retweetCount + replyCount, returns top count.
   */
  async getTopTweetsByEngagement(username: string, count = 20): Promise<XTweet[]> {
    const cleanUsername = username.replace(/^@/, '');
    const user = await this.getAccount(cleanUsername);
    if (!user) return [];

    const tweets = await this.client.getUserTweets(user.id, {
      maxResults: 100,
      excludeRetweets: true,
      excludeReplies: true,
    });

    const score = (t: XTweet) =>
      (t.metrics?.likeCount ?? 0) + 2 * (t.metrics?.retweetCount ?? 0) + (t.metrics?.replyCount ?? 0);
    const sorted = [...tweets].sort((a, b) => score(b) - score(a));
    return sorted.slice(0, count);
  }

  /**
   * Check if an account is in our quality list
   */
  isQualityAccount(username: string): boolean {
    const cleanUsername = username.replace(/^@/, '').toLowerCase();
    return ACCOUNT_BY_USERNAME.has(cleanUsername);
  }

  /**
   * Get all quality accounts
   */
  getQualityAccounts(): typeof ALL_QUALITY_ACCOUNTS {
    return ALL_QUALITY_ACCOUNTS;
  }

  /**
   * Find accounts similar to a given account (by topic focus)
   */
  async findSimilarAccounts(username: string): Promise<string[]> {
    const analysis = await this.analyzeAccount(username);
    if (!analysis || analysis.topicFocus.length === 0) {
      return [];
    }

    // Find quality accounts with overlapping topic focus
    const similar = ALL_QUALITY_ACCOUNTS.filter(qa => {
      if (qa.username.toLowerCase() === username.toLowerCase()) return false;
      return qa.focus.some(f => analysis.topicFocus.includes(f));
    });

    return similar.map(qa => qa.username);
  }

  /**
   * Batch analyze multiple accounts
   */
  async batchAnalyze(usernames: string[]): Promise<Map<string, AccountAnalysis | null>> {
    const results = new Map<string, AccountAnalysis | null>();

    // Process in batches to respect rate limits
    for (const username of usernames) {
      try {
        const analysis = await this.analyzeAccount(username);
        results.set(username, analysis);
      } catch (error) {
        console.error(`[xAccounts] Error analyzing ${username}:`, error);
        results.set(username, null);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────

  private determineTier(user: XUser, avgLikes: number, engagementRate: number): AccountTier {
    // Check our known accounts first
    const knownTier = getAccountTier(user.username);
    if (knownTier !== 'standard') {
      return knownTier;
    }

    const followers = user.metrics?.followersCount ?? 0;

    // Whale: 100k+ followers and high engagement
    if (followers >= 100000 && engagementRate > 0.5) {
      return 'whale';
    }

    // Alpha: High engagement rate regardless of follower count
    if (avgLikes > 500 && engagementRate > 1) {
      return 'alpha';
    }

    // Verified
    if (user.verified || user.verifiedType === 'blue') {
      return 'verified';
    }

    // Quality: Decent engagement
    if (avgLikes > 100 && engagementRate > 0.3) {
      return 'quality';
    }

    return 'standard';
  }

  private getTierReason(tier: AccountTier, user: XUser, avgLikes: number): string {
    const followers = user.metrics?.followersCount ?? 0;

    switch (tier) {
      case 'whale':
        return `${this.formatNumber(followers)} followers, market-moving influence`;
      case 'alpha':
        return `High engagement (${Math.round(avgLikes)} avg likes), quality insights`;
      case 'quality':
        return 'Consistent valuable content';
      case 'verified':
        return 'Verified account';
      default:
        return 'Standard account';
    }
  }

  private detectTopicFocus(tweets: XTweet[]): string[] {
    const topicCounts: Record<string, number> = {};

    for (const tweet of tweets) {
      const text = tweet.text.toLowerCase();

      for (const topic of ALL_TOPICS) {
        const matches = topic.searchTerms.some(term => 
          text.includes(term.toLowerCase())
        );

        if (matches) {
          topicCounts[topic.id] = (topicCounts[topic.id] ?? 0) + 1;
        }
      }
    }

    // Return topics that appear in at least 20% of tweets
    const threshold = tweets.length * 0.2;
    return Object.entries(topicCounts)
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([topicId]) => topicId);
  }

  private detectSentimentBias(tweets: XTweet[]): 'bullish' | 'bearish' | 'neutral' {
    const bullishTerms = ['bullish', 'long', 'buy', 'moon', 'pump', 'lfg', 'accumulate'];
    const bearishTerms = ['bearish', 'short', 'sell', 'dump', 'crash', 'rekt'];

    let bullishCount = 0;
    let bearishCount = 0;

    for (const tweet of tweets) {
      const text = tweet.text.toLowerCase();
      
      if (bullishTerms.some(t => text.includes(t))) bullishCount++;
      if (bearishTerms.some(t => text.includes(t))) bearishCount++;
    }

    if (bullishCount > bearishCount * 1.5) return 'bullish';
    if (bearishCount > bullishCount * 1.5) return 'bearish';
    return 'neutral';
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────

let instance: XAccountsService | null = null;

export function getXAccountsService(): XAccountsService {
  if (!instance) {
    instance = new XAccountsService();
  }
  return instance;
}
