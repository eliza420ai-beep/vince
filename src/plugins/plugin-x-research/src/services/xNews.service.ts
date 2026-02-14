/**
 * X News Service
 * 
 * Leverages the new X News API for structured crypto/finance news.
 * Returns Grok-generated summaries with ticker extraction.
 */

import { getXClient, XClientService } from './xClient.service';
import type { XNewsItem, XNewsResult, NewsSearchOptions, CryptoNewsOptions } from '../types/news.types';
import type { XTweet } from '../types/tweet.types';
import { FOCUS_TICKERS, AI_INFRA_TICKERS } from '../constants/topics';

const DEFAULT_FOCUS_TICKERS = [...FOCUS_TICKERS, ...AI_INFRA_TICKERS];

// Focus filters for relevance scoring
const FOCUS_TOPICS = ['Cryptocurrency', 'DeFi', 'NFT', 'AI', 'Blockchain', 'Bitcoin', 'Ethereum'];
const FOCUS_ORGS = ['SEC', 'Binance', 'Coinbase', 'BlackRock', 'Fidelity', 'Grayscale', 'MicroStrategy'];

/**
 * X News Service
 */
export class XNewsService {
  private client: XClientService;

  constructor(client?: XClientService) {
    this.client = client ?? getXClient();
  }

  /**
   * Search news by query
   */
  async searchNews(query: string, options: NewsSearchOptions = {}): Promise<XNewsResult[]> {
    const { maxResults = 10 } = options;

    const response = await this.client.searchNews(query, { maxResults });
    
    if (!response.data || response.data.length === 0) {
      return [];
    }

    return response.data.map(item => this.enrichNewsItem(item));
  }

  /**
   * Get news for our focus tickers
   */
  async getTickerNews(tickers: string[] = DEFAULT_FOCUS_TICKERS): Promise<XNewsResult[]> {
    const query = tickers.map(t => `$${t}`).join(' OR ');
    return this.searchNews(query, { maxResults: 20 });
  }

  /**
   * Get crypto-specific news
   */
  async getCryptoNews(options: CryptoNewsOptions = {}): Promise<XNewsResult[]> {
    const {
      maxResults = 20,
      focusAssets = DEFAULT_FOCUS_TICKERS,
      includeDefi = true,
      includeNft = false,
    } = options;

    // Build comprehensive crypto query
    const parts: string[] = [];
    
    // Assets
    parts.push(...focusAssets.map(a => `$${a}`));
    parts.push('cryptocurrency', 'crypto');
    
    if (includeDefi) {
      parts.push('DeFi', 'decentralized finance');
    }
    
    if (includeNft) {
      parts.push('NFT', 'digital collectibles');
    }

    const query = parts.join(' OR ');
    return this.searchNews(query, { maxResults });
  }

  /**
   * Get posts that drove a news story
   */
  async getNewsClusterPosts(newsItem: XNewsItem): Promise<XTweet[]> {
    if (!newsItem.clusterPostIds || newsItem.clusterPostIds.length === 0) {
      return [];
    }

    return this.client.getTweets(newsItem.clusterPostIds.slice(0, 100));
  }

  /**
   * Get top news stories for the day
   */
  async getDailyTopNews(): Promise<XNewsResult[]> {
    const cryptoNews = await this.getCryptoNews({ maxResults: 30 });
    
    // Sort by relevance and impact
    return cryptoNews
      .sort((a, b) => {
        // Prioritize high impact
        const impactScore = (item: XNewsResult) => 
          item.impactLevel === 'high' ? 3 :
          item.impactLevel === 'medium' ? 2 : 1;
        
        const aScore = impactScore(a) * 10 + a.relevanceScore;
        const bScore = impactScore(b) * 10 + b.relevanceScore;
        
        return bScore - aScore;
      })
      .slice(0, 10);
  }

  // ─────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────

  private enrichNewsItem(item: XNewsItem): XNewsResult {
    const relevanceScore = this.calculateRelevance(item);
    const sentiment = this.detectSentiment(item);
    const impactLevel = this.assessImpact(item);

    return {
      ...item,
      relevanceScore,
      sentiment,
      impactLevel,
    };
  }

  private calculateRelevance(item: XNewsItem): number {
    let score = 0;

    // Check tickers (focus + AI infra)
    const tickers = item.contexts?.finance?.tickers ?? [];
    const focusTickersAll = [...FOCUS_TICKERS, ...AI_INFRA_TICKERS];
    for (const ticker of tickers) {
      if (focusTickersAll.includes(ticker.toUpperCase())) {
        score += 20;
      }
    }

    // Check topics
    const topics = item.contexts?.topics ?? [];
    for (const topic of topics) {
      if (FOCUS_TOPICS.some(ft => topic.toLowerCase().includes(ft.toLowerCase()))) {
        score += 15;
      }
    }

    // Check organizations
    const orgs = item.contexts?.entities?.organizations ?? [];
    for (const org of orgs) {
      if (FOCUS_ORGS.some(fo => org.toLowerCase().includes(fo.toLowerCase()))) {
        score += 10;
      }
    }

    // Bonus for having cluster posts (more engagement)
    if (item.clusterPostIds && item.clusterPostIds.length > 5) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private detectSentiment(item: XNewsItem): 'bullish' | 'bearish' | 'neutral' {
    const text = `${item.name} ${item.summary} ${item.hook}`.toLowerCase();

    const bullishTerms = ['surge', 'rally', 'soar', 'gain', 'rise', 'bullish', 'inflows', 'adoption', 'approval', 'milestone'];
    const bearishTerms = ['crash', 'drop', 'fall', 'plunge', 'bearish', 'outflows', 'hack', 'exploit', 'lawsuit', 'ban', 'reject'];

    let bullishCount = 0;
    let bearishCount = 0;

    for (const term of bullishTerms) {
      if (text.includes(term)) bullishCount++;
    }

    for (const term of bearishTerms) {
      if (text.includes(term)) bearishCount++;
    }

    if (bullishCount > bearishCount + 1) return 'bullish';
    if (bearishCount > bullishCount + 1) return 'bearish';
    return 'neutral';
  }

  private assessImpact(item: XNewsItem): 'high' | 'medium' | 'low' {
    const text = `${item.name} ${item.summary}`.toLowerCase();
    
    // High impact indicators
    const highImpact = ['sec', 'etf', 'approval', 'ban', 'hack', 'billion', 'regulation', 'blackrock', 'fidelity'];
    for (const term of highImpact) {
      if (text.includes(term)) return 'high';
    }

    // Many cluster posts = high engagement = higher impact
    if (item.clusterPostIds && item.clusterPostIds.length > 10) {
      return 'high';
    }

    // Check for major tickers
    const tickers = item.contexts?.finance?.tickers ?? [];
    if (tickers.some(t => ['BTC', 'ETH'].includes(t.toUpperCase()))) {
      return 'medium';
    }

    return 'low';
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────

let instance: XNewsService | null = null;

export function getXNewsService(): XNewsService {
  if (!instance) {
    instance = new XNewsService();
  }
  return instance;
}
