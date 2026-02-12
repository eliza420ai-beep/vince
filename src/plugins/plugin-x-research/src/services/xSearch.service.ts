/**
 * X Search Service
 * 
 * High-level search operations:
 * - Topic-based searches
 * - Quality filtering
 * - Multi-topic aggregation
 * - Volume spike detection
 */

import { getXClient, XClientService } from './xClient.service';
import type { XTweet, XSearchResponse, XCountsResponse } from '../types/tweet.types';
import type { VolumeSpike } from '../types/analysis.types';
import { ALL_TOPICS, TOPIC_BY_ID, type Topic } from '../constants/topics';
import { getAccountTier } from '../constants/qualityAccounts';

export interface TopicSearchOptions {
  maxResults?: number;
  minLikes?: number;
  sortOrder?: 'recency' | 'relevancy';
  excludeRetweets?: boolean;
  excludeReplies?: boolean;
  hoursBack?: number;
  /** Override cache TTL for this request (e.g. 1h for pulse/vibe). */
  cacheTtlMs?: number;
}

export interface MultiSearchOptions {
  topicsIds?: string[];
  maxResultsPerTopic?: number;
  deduplicateAcrossTopics?: boolean;
  /** When true, limit to first 2 topics and 10 results per topic (quick vibe check). */
  quick?: boolean;
  /** Cache TTL for search requests (e.g. 1h for pulse). */
  cacheTtlMs?: number;
}

/**
 * X Search Service
 */
export class XSearchService {
  private client: XClientService;

  constructor(client?: XClientService) {
    this.client = client ?? getXClient();
  }

  /**
   * Search for a specific topic
   */
  async searchTopic(topicId: string, options: TopicSearchOptions = {}): Promise<XTweet[]> {
    const topic = TOPIC_BY_ID[topicId];
    if (!topic) {
      throw new Error(`Unknown topic: ${topicId}`);
    }

    const {
      maxResults = 100,
      minLikes = 0,
      sortOrder = 'relevancy',
      excludeRetweets = true,
      excludeReplies = true,
      hoursBack = 24,
    } = options;

    // Build query
    const query = this.buildTopicQuery(topic, { excludeRetweets, excludeReplies, minLikes });

    // Calculate time range
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const response = await this.client.searchRecent(query, {
      maxResults,
      sortOrder,
      startTime,
      cacheTtlMs: options.cacheTtlMs,
    });

    // Enrich tweets with computed fields
    return this.enrichTweets(response);
  }

  /**
   * Search multiple topics at once
   */
  async searchMultipleTopics(options: MultiSearchOptions = {}): Promise<Map<string, XTweet[]>> {
    const {
      topicsIds: rawTopicsIds = ALL_TOPICS.filter(t => t.priority === 'high').map(t => t.id),
      maxResultsPerTopic: rawMaxResults = 50,
      deduplicateAcrossTopics = true,
      quick = false,
      cacheTtlMs,
    } = options;

    const topicsIds = quick ? rawTopicsIds.slice(0, 2) : rawTopicsIds;
    const maxResultsPerTopic = quick ? 10 : rawMaxResults;

    const results = new Map<string, XTweet[]>();
    const seenIds = new Set<string>();

    // Search topics in parallel (with some throttling)
    const batchSize = 3;
    for (let i = 0; i < topicsIds.length; i += batchSize) {
      const batch = topicsIds.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (topicId) => {
          try {
            const tweets = await this.searchTopic(topicId, {
              maxResults: maxResultsPerTopic,
              hoursBack: 24,
              cacheTtlMs,
            });
            return { topicId, tweets };
          } catch (error) {
            console.error(`[xSearch] Error searching ${topicId}:`, error);
            return { topicId, tweets: [] };
          }
        })
      );

      for (const { topicId, tweets } of batchResults) {
        let filtered = tweets;
        
        if (deduplicateAcrossTopics) {
          filtered = tweets.filter(t => !seenIds.has(t.id));
          filtered.forEach(t => seenIds.add(t.id));
        }

        results.set(topicId, filtered);
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < topicsIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Get top engaging tweets across all topics
   */
  async getTopEngaging(options: { limit?: number; hoursBack?: number } = {}): Promise<XTweet[]> {
    const { limit = 20, hoursBack = 24 } = options;

    const topicResults = await this.searchMultipleTopics({
      maxResultsPerTopic: 50,
      deduplicateAcrossTopics: true,
    });

    // Flatten and sort by engagement
    const allTweets = Array.from(topicResults.values()).flat();
    
    return allTweets
      .sort((a, b) => {
        const aScore = this.engagementScore(a);
        const bScore = this.engagementScore(b);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * Detect volume spikes for topics
   */
  async detectVolumeSpikes(topicIds?: string[]): Promise<VolumeSpike[]> {
    const topics = topicIds 
      ? topicIds.map(id => TOPIC_BY_ID[id]).filter(Boolean) as Topic[]
      : ALL_TOPICS.filter(t => t.priority === 'high');

    const spikes: VolumeSpike[] = [];

    for (const topic of topics) {
      try {
        const query = topic.searchTerms[0]; // Use primary search term
        const counts = await this.client.getCounts(query, { granularity: 'hour' });
        
        const spike = this.analyzeVolumeCounts(topic.id, counts);
        if (spike) {
          spikes.push(spike);
        }
      } catch (error) {
        console.error(`[xSearch] Error checking volume for ${topic.id}:`, error);
      }
    }

    return spikes.sort((a, b) => b.spikeMultiple - a.spikeMultiple);
  }

  // ─────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────

  private buildTopicQuery(
    topic: Topic,
    options: { excludeRetweets?: boolean; excludeReplies?: boolean; minLikes?: number }
  ): string {
    const { excludeRetweets = true, excludeReplies = true, minLikes = 0 } = options;

    // Combine search terms with OR
    const termPart = topic.searchTerms
      .map(t => t.includes(' ') ? `"${t}"` : t)
      .join(' OR ');

    let query = `(${termPart})`;

    // Add cashtags if available
    if (topic.cashtags && topic.cashtags.length > 0) {
      const cashtagPart = topic.cashtags.map(c => `$${c}`).join(' OR ');
      query = `(${termPart} OR ${cashtagPart})`;
    }

    // Filters
    query += ' lang:en';
    if (excludeRetweets) query += ' -is:retweet';
    if (excludeReplies) query += ' -is:reply';
    if (minLikes > 0) query += ` min_faves:${minLikes}`;

    return query;
  }

  private enrichTweets(response: XSearchResponse): XTweet[] {
    const { data: tweets = [], includes } = response;

    // Build user lookup
    const userMap = new Map<string, typeof includes extends { users: infer U } ? U extends Array<infer T> ? T : never : never>();
    if (includes?.users) {
      for (const user of includes.users) {
        userMap.set(user.id, user);
      }
    }

    // Enrich tweets
    return tweets.map(tweet => {
      const author = userMap.get(tweet.authorId);
      const username = author?.username ?? '';
      const tier = getAccountTier(username);

      // Calculate velocity (if we have created_at)
      let velocity: number | undefined;
      if (tweet.createdAt && tweet.metrics) {
        const ageMs = Date.now() - new Date(tweet.createdAt).getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        if (ageHours > 0.1) { // At least 6 minutes old
          velocity = tweet.metrics.likeCount / ageHours;
        }
      }

      return {
        ...tweet,
        author: author as XTweet['author'],
        computed: {
          velocity,
          qualityTier: tier,
          isThread: tweet.conversationId === tweet.id && (tweet.text.includes('🧵') || tweet.text.includes('Thread')),
        },
      };
    });
  }

  private engagementScore(tweet: XTweet): number {
    if (!tweet.metrics) return 0;
    
    const { likeCount, retweetCount, replyCount, quoteCount } = tweet.metrics;
    
    // Weighted engagement score
    // Likes are common, retweets/quotes show stronger signal
    return likeCount + (retweetCount * 3) + (quoteCount * 4) + (replyCount * 2);
  }

  private analyzeVolumeCounts(topicId: string, counts: XCountsResponse): VolumeSpike | null {
    if (!counts.data || counts.data.length < 6) return null;

    // Get recent hour vs average (safe mapping so missing/undefined tweetCount → 0)
    const volumes = counts.data.map(d => Number(d?.tweetCount) || 0);
    const recentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);

    if (!Number.isFinite(avgVolume) || avgVolume <= 0 || avgVolume < 10) return null; // Not enough baseline or invalid

    const spikeMultiple = recentVolume / avgVolume;
    if (!Number.isFinite(spikeMultiple) || spikeMultiple <= 0) return null;
    if (spikeMultiple < 2.0) return null; // Need at least 2x spike

    const rounded = Math.round(spikeMultiple * 10) / 10;
    if (!Number.isFinite(rounded)) return null;

    return {
      topic: topicId,
      currentVolume: recentVolume,
      avgVolume: Math.round(avgVolume),
      spikeMultiple: rounded,
      startedAt: counts.data[counts.data.length - 1].start,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────

let instance: XSearchService | null = null;

export function getXSearchService(): XSearchService {
  if (!instance) {
    instance = new XSearchService();
  }
  return instance;
}
