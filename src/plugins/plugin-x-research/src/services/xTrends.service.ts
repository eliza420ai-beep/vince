/**
 * X Trends Service
 * 
 * Personalized trends with volume data.
 * Detect when our topics are trending.
 */

import { getXClient, XClientService } from './xClient.service';
import type { XTrend, TrendingTopicStatus, TrendVolume } from '../types/trends.types';
import { ALL_TOPICS, TOPIC_BY_ID } from '../constants/topics';

// Keywords to match for crypto/finance trends (incl. tokenized AI / AI infra)
const CRYPTO_KEYWORDS = [
  'btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'crypto',
  'defi', 'nft', 'web3', 'blockchain', 'token', 'coin', 'altcoin',
  'binance', 'coinbase', 'sec', 'etf', 'hype', 'hyperliquid',
  'bankr', 'bnkr', 'agent token', 'tokenized agent', 'ai infra', 'tokenized ai',
];

/**
 * X Trends Service
 */
export class XTrendsService {
  private client: XClientService;
  private trendCache: { data: XTrend[]; timestamp: number } | null = null;
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(client?: XClientService) {
    this.client = client ?? getXClient();
  }

  /**
   * Get personalized trends
   */
  async getTrends(): Promise<XTrend[]> {
    // Check cache
    if (this.trendCache && Date.now() - this.trendCache.timestamp < this.cacheTtlMs) {
      return this.trendCache.data;
    }

    const response = await this.client.getTrends();
    const trends = response.data ?? [];

    // Cache the result
    this.trendCache = { data: trends, timestamp: Date.now() };

    return trends;
  }

  /**
   * Filter for crypto/finance trends only
   */
  async getCryptoTrends(): Promise<XTrend[]> {
    const allTrends = await this.getTrends();

    return allTrends.filter(trend => {
      const name = trend.trendName.toLowerCase();
      
      // Check category
      if (trend.category?.toLowerCase().includes('crypto') ||
          trend.category?.toLowerCase().includes('finance')) {
        return true;
      }

      // Check keywords
      return CRYPTO_KEYWORDS.some(kw => name.includes(kw));
    });
  }

  /**
   * Check if our tracked topics are trending
   */
  async getOurTopicsTrending(): Promise<TrendingTopicStatus[]> {
    const trends = await this.getTrends();
    const trendNames = trends.map(t => t.trendName.toLowerCase());

    const results: TrendingTopicStatus[] = [];

    for (const topic of ALL_TOPICS) {
      // Check if any search term matches a trend
      let isTrending = false;
      let matchedTrend: XTrend | undefined;

      for (const term of topic.searchTerms) {
        const termLower = term.toLowerCase().replace('#', '');
        const trendIndex = trendNames.findIndex(tn => 
          tn.includes(termLower) || termLower.includes(tn.replace('#', ''))
        );

        if (trendIndex !== -1) {
          isTrending = true;
          matchedTrend = trends[trendIndex];
          break;
        }
      }

      // Also check hashtags
      if (!isTrending) {
        for (const tag of topic.hashtags) {
          const tagLower = `#${tag.toLowerCase()}`;
          const trendIndex = trendNames.findIndex(tn => tn === tagLower);

          if (trendIndex !== -1) {
            isTrending = true;
            matchedTrend = trends[trendIndex];
            break;
          }
        }
      }

      results.push({
        topic: topic.id,
        isTrending,
        postCount: matchedTrend?.postCount,
        rank: matchedTrend ? trends.indexOf(matchedTrend) + 1 : undefined,
      });
    }

    // Sort: trending first, then by rank
    return results.sort((a, b) => {
      if (a.isTrending && !b.isTrending) return -1;
      if (!a.isTrending && b.isTrending) return 1;
      if (a.rank && b.rank) return a.rank - b.rank;
      return 0;
    });
  }

  /**
   * Get volume comparison for a topic
   */
  async getTrendVolume(topicId: string): Promise<TrendVolume | null> {
    const topic = TOPIC_BY_ID[topicId];
    if (!topic) return null;

    try {
      // Get counts for the last 24h
      const query = topic.searchTerms[0];
      const counts = await this.client.getCounts(query, { granularity: 'hour' });

      if (!counts.data || counts.data.length < 6) {
        return null;
      }

      const volumes = counts.data.map(d => d.tweetCount);
      const current = volumes[volumes.length - 1];
      const avg24h = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const percentChange = avg24h > 0 ? ((current - avg24h) / avg24h) * 100 : 0;

      return {
        topic: topicId,
        current,
        avg24h: Math.round(avg24h),
        percentChange: Math.round(percentChange),
        isSpike: percentChange > 100, // 2x or more
      };
    } catch (error) {
      console.error(`[xTrends] Error getting volume for ${topicId}:`, error);
      return null;
    }
  }

  /**
   * Get trending summary for all high-priority topics
   */
  async getTrendingSummary(): Promise<{
    trending: TrendingTopicStatus[];
    cryptoTrends: XTrend[];
    volumeSpikes: TrendVolume[];
  }> {
    const [trending, cryptoTrends] = await Promise.all([
      this.getOurTopicsTrending(),
      this.getCryptoTrends(),
    ]);

    // Check volume for topics that are trending
    const trendingTopicIds = trending
      .filter(t => t.isTrending)
      .map(t => t.topic);

    const volumeSpikes: TrendVolume[] = [];
    
    for (const topicId of trendingTopicIds.slice(0, 5)) {
      const volume = await this.getTrendVolume(topicId);
      if (volume?.isSpike) {
        volumeSpikes.push(volume);
      }
    }

    return {
      trending,
      cryptoTrends: cryptoTrends.slice(0, 10),
      volumeSpikes,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────

let instance: XTrendsService | null = null;

export function getXTrendsService(): XTrendsService {
  if (!instance) {
    instance = new XTrendsService();
  }
  return instance;
}
