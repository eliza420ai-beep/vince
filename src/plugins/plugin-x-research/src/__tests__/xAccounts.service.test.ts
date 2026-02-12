/**
 * X Accounts Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XAccountsService } from '../services/xAccounts.service';
import type { XUser, XTweet } from '../types/tweet.types';

// Mock the xClient
vi.mock('../services/xClient.service', () => ({
  getXClient: vi.fn(() => mockClient),
}));

const mockClient = {
  getUserByUsername: vi.fn(),
  getUserTweets: vi.fn(),
};

describe('XAccountsService', () => {
  let service: XAccountsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new XAccountsService(mockClient as any);
  });

  describe('getAccount', () => {
    it('should fetch account by username', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'testuser',
        name: 'Test User',
        metrics: {
          followersCount: 10000,
          followingCount: 500,
          tweetCount: 5000,
        },
      };

      mockClient.getUserByUsername.mockResolvedValue(mockUser);

      const result = await service.getAccount('testuser');

      expect(result).toEqual(mockUser);
      expect(mockClient.getUserByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should strip @ from username', async () => {
      mockClient.getUserByUsername.mockResolvedValue(null);

      await service.getAccount('@testuser');

      expect(mockClient.getUserByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should return null for non-existent user', async () => {
      mockClient.getUserByUsername.mockResolvedValue(null);

      const result = await service.getAccount('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('analyzeAccount', () => {
    it('should analyze account and return full analysis', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'cryptotrader',
        name: 'Crypto Trader',
        metrics: {
          followersCount: 150000,
          followingCount: 500,
          tweetCount: 5000,
        },
      };

      const mockTweets: XTweet[] = [
        createMockTweet('BTC bullish breakout', 500, 50),
        createMockTweet('ETH looking strong', 600, 60),
        createMockTweet('Long BTC here', 400, 40),
      ];

      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue(mockTweets);

      const analysis = await service.analyzeAccount('cryptotrader');

      expect(analysis).not.toBeNull();
      expect(analysis?.username).toBe('cryptotrader');
      expect(analysis?.metrics.followers).toBe(150000);
      expect(analysis?.metrics.avgLikes).toBe(500); // (500+600+400)/3
      expect(analysis?.tier).toBeDefined();
      expect(analysis?.topicFocus).toBeDefined();
    });

    it('should return null for non-existent account', async () => {
      mockClient.getUserByUsername.mockResolvedValue(null);

      const analysis = await service.analyzeAccount('nonexistent');

      expect(analysis).toBeNull();
    });

    it('should detect whale tier for high follower accounts', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'bigwhale',
        name: 'Big Whale',
        metrics: {
          followersCount: 500000,
          followingCount: 100,
          tweetCount: 10000,
        },
      };

      const mockTweets: XTweet[] = [
        createMockTweet('Market update', 5000, 500),
        createMockTweet('Analysis', 4000, 400),
      ];

      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue(mockTweets);

      const analysis = await service.analyzeAccount('bigwhale');

      expect(analysis?.tier).toBe('whale');
    });

    it('should detect bullish sentiment bias', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'bullish_trader',
        name: 'Bullish Trader',
        metrics: { followersCount: 10000, followingCount: 500, tweetCount: 1000 },
      };

      const mockTweets: XTweet[] = [
        createMockTweet('Super bullish on BTC! Long!', 100, 10),
        createMockTweet('Accumulating more, bullish', 100, 10),
        createMockTweet('Moon incoming, buy buy buy', 100, 10),
      ];

      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue(mockTweets);

      const analysis = await service.analyzeAccount('bullish_trader');

      expect(analysis?.sentimentBias).toBe('bullish');
    });
  });

  describe('isQualityAccount', () => {
    it('should return true for known quality accounts', () => {
      // caboronto is in our quality list
      expect(service.isQualityAccount('caboronto')).toBe(true);
      expect(service.isQualityAccount('@caboronto')).toBe(true);
    });

    it('should return false for unknown accounts', () => {
      expect(service.isQualityAccount('random_unknown_user_123')).toBe(false);
    });
  });

  describe('getQualityAccounts', () => {
    it('should return all quality accounts', () => {
      const accounts = service.getQualityAccounts();

      expect(accounts.length).toBeGreaterThan(0);
      expect(accounts.some(a => a.tier === 'whale')).toBe(true);
      expect(accounts.some(a => a.tier === 'alpha')).toBe(true);
    });
  });

  describe('findSimilarAccounts', () => {
    it('should find accounts with similar topic focus', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'btc_trader',
        name: 'BTC Trader',
        metrics: { followersCount: 50000, followingCount: 500, tweetCount: 5000 },
      };

      const mockTweets: XTweet[] = [
        createMockTweet('Bitcoin analysis', 500, 50),
        createMockTweet('BTC technical breakdown', 600, 60),
        createMockTweet('Trading BTC today', 400, 40),
      ];

      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue(mockTweets);

      const similar = await service.findSimilarAccounts('btc_trader');

      // Should find accounts with BTC/trading focus
      expect(Array.isArray(similar)).toBe(true);
    });
  });
});

// Helper to create mock tweets
function createMockTweet(text: string, likes = 100, retweets = 10): XTweet {
  return {
    id: Math.random().toString(36).slice(2),
    text,
    authorId: '123',
    createdAt: new Date().toISOString(),
    metrics: {
      likeCount: likes,
      retweetCount: retweets,
      replyCount: 5,
      quoteCount: 2,
    },
  };
}
