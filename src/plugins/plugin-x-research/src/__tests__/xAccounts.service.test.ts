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

  describe('getRecentTakes', () => {
    it('returns tweets when user exists', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'trader',
        name: 'Trader',
        metrics: { followersCount: 1000, followingCount: 100, tweetCount: 500 },
      };
      const mockTweets = [createMockTweet('Take 1', 50, 5), createMockTweet('Take 2', 60, 6)];
      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue(mockTweets);

      const result = await service.getRecentTakes('trader', 10);

      expect(result).toEqual(mockTweets);
      expect(mockClient.getUserTweets).toHaveBeenCalledWith('123', {
        maxResults: 10,
        excludeRetweets: true,
        excludeReplies: true,
      });
    });

    it('returns [] when user not found', async () => {
      mockClient.getUserByUsername.mockResolvedValue(null);
      const result = await service.getRecentTakes('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getTopTweetsByEngagement', () => {
    it('returns top tweets sorted by engagement', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'trader',
        name: 'Trader',
        metrics: { followersCount: 1000, followingCount: 100, tweetCount: 500 },
      };
      const tweets = [
        createMockTweet('Low', 10, 1),
        createMockTweet('High', 500, 50),
        createMockTweet('Mid', 100, 10),
      ];
      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue(tweets);

      const result = await service.getTopTweetsByEngagement('trader', 2);

      expect(result.length).toBe(2);
      expect(result[0].metrics?.likeCount).toBe(500);
      expect(result[1].metrics?.likeCount).toBe(100);
    });

    it('returns [] when user not found', async () => {
      mockClient.getUserByUsername.mockResolvedValue(null);
      const result = await service.getTopTweetsByEngagement('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('findSimilarAccounts', () => {
    it('returns [] when analysis has no topic focus', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'random_user',
        name: 'Random',
        metrics: { followersCount: 100, followingCount: 100, tweetCount: 50 },
      };
      const mockTweets = [createMockTweet('Random stuff', 5, 0)];
      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue(mockTweets);

      const similar = await service.findSimilarAccounts('random_user');

      expect(similar).toEqual([]);
    });

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

  describe('batchAnalyze', () => {
    it('returns map of analyses', async () => {
      const mockUser: XUser = {
        id: '123',
        username: 'user1',
        name: 'User',
        metrics: { followersCount: 1000, followingCount: 100, tweetCount: 100 },
      };
      mockClient.getUserByUsername.mockResolvedValue(mockUser);
      mockClient.getUserTweets.mockResolvedValue([createMockTweet('tweet', 10, 1)]);

      const result = await service.batchAnalyze(['user1']);

      expect(result.size).toBe(1);
      expect(result.get('user1')).not.toBeNull();
    });

    it('sets null for usernames that fail', async () => {
      mockClient.getUserByUsername
        .mockResolvedValueOnce({
          id: '1',
          username: 'good',
          name: 'Good',
          metrics: { followersCount: 100, followingCount: 10, tweetCount: 50 },
        })
        .mockResolvedValueOnce(null);

      mockClient.getUserTweets.mockResolvedValue([]);

      const result = await service.batchAnalyze(['good', 'nonexistent']);

      expect(result.get('good')).not.toBeNull();
      expect(result.get('nonexistent')).toBeNull();
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
