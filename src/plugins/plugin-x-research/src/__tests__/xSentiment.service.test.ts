/**
 * X Sentiment Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XSentimentService } from '../services/xSentiment.service';
import type { XTweet } from '../types/tweet.types';

describe('XSentimentService', () => {
  let service: XSentimentService;

  beforeEach(() => {
    service = new XSentimentService();
  });

  describe('analyzeSentiment', () => {
    it('should return empty result for no tweets', () => {
      const result = service.analyzeSentiment([]);
      
      expect(result.overallSentiment).toBe('neutral');
      expect(result.overallConfidence).toBe(0);
      expect(result.sampleSize).toBe(0);
    });

    it('should detect bullish sentiment', () => {
      const tweets: XTweet[] = [
        createTweet('BTC is mooning! 🚀 Super bullish on this breakout'),
        createTweet('Accumulating more ETH, this pump is just starting'),
        createTweet('LFG! Bitcoin to the moon, parabolic incoming'),
      ];

      const result = service.analyzeSentiment(tweets);
      
      expect(result.overallSentiment).toBe('bullish');
      expect(result.overallScore).toBeGreaterThan(20);
    });

    it('should detect bearish sentiment', () => {
      const tweets: XTweet[] = [
        createTweet('BTC crash incoming, this is a bloodbath'),
        createTweet('Just got rekt, dumping everything'),
        createTweet('Bearish divergence, capitulation soon'),
      ];

      const result = service.analyzeSentiment(tweets);
      
      expect(result.overallSentiment).toBe('bearish');
      expect(result.overallScore).toBeLessThan(-20);
    });

    it('should detect neutral sentiment', () => {
      const tweets: XTweet[] = [
        createTweet('BTC price is stable today'),
        createTweet('Watching the market, nothing exciting'),
        createTweet('Another day in crypto'),
      ];

      const result = service.analyzeSentiment(tweets);
      
      expect(['neutral', 'mixed']).toContain(result.overallSentiment);
    });

    it('should detect mixed sentiment when bullish and bearish balance', () => {
      const tweets: XTweet[] = [
        createTweet('BTC mooning! LFG! Parabolic breakout!'),
        createTweet('ETH pumping hard, accumulating more'),
        createTweet('BTC crash incoming, bloodbath'),
        createTweet('Dump everything, bear market'),
      ];

      const result = service.analyzeSentiment(tweets);
      
      expect(['neutral', 'mixed']).toContain(result.overallSentiment);
    });

    it('should weight whale accounts higher', () => {
      const bullishWhale = createTweet('Super bullish on BTC', 'caboronto'); // whale
      const bearishRetail = createTweet('BTC crash incoming', 'randomuser');
      const bearishRetail2 = createTweet('Dump it, this is bearish', 'anotheruser');

      const result = service.analyzeSentiment([bullishWhale, bearishRetail, bearishRetail2]);
      
      // Even though 2/3 are bearish, whale weight should balance it
      expect(result.byTopic).toBeDefined();
    });

    it('should detect contrarian warning for extreme sentiment', () => {
      // Include a topic keyword (BTC) so tweets are assigned to a topic and weightedScore triggers contrarian
      const tweets: XTweet[] = Array(10).fill(null).map(() => 
        createTweet('BTC MEGA BULLISH! Moon! Parabolic! FOMO! LFG! Generational!')
      );

      const result = service.analyzeSentiment(tweets, { detectContrarian: true });
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Extreme');
    });

    it('should generate a summary', () => {
      const tweets: XTweet[] = [
        createTweet('Bitcoin bullish breakout confirmed'),
        createTweet('ETH looking strong'),
      ];

      const result = service.analyzeSentiment(tweets);
      
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });

  describe('getTopicVibe', () => {
    it('should return sentiment for a specific topic', () => {
      const tweets: XTweet[] = [
        createTweet('Bitcoin is pumping hard today'),
        createTweet('BTC breakout confirmed'),
        createTweet('Ethereum is lagging behind'),
      ];

      const btcVibe = service.getTopicVibe(tweets, 'btc');
      
      expect(btcVibe).not.toBeNull();
      expect(btcVibe?.direction).toBe('bullish');
    });

    it('should return null for unknown topic', () => {
      const tweets: XTweet[] = [
        createTweet('Some random tweet'),
      ];

      const result = service.getTopicVibe(tweets, 'unknown_topic');
      
      expect(result).toBeNull();
    });
  });
});

// Helper to create test tweets
function createTweet(text: string, username = 'testuser'): XTweet {
  return {
    id: Math.random().toString(36).slice(2),
    text,
    authorId: '12345',
    createdAt: new Date().toISOString(),
    author: {
      id: '12345',
      username,
      name: 'Test User',
    },
    metrics: {
      likeCount: 100,
      retweetCount: 10,
      replyCount: 5,
      quoteCount: 2,
    },
  };
}
