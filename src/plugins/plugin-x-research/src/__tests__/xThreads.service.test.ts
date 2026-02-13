/**
 * X Threads Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { XThreadsService } from '../services/xThreads.service';
import type { XTweet } from '../types/tweet.types';

const mockClient = {
  getTweet: vi.fn(),
  searchRecent: vi.fn(),
};

describe('XThreadsService', () => {
  let service: XThreadsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new XThreadsService(mockClient as any);
  });

  describe('detectThread', () => {
    it('should detect thread by 🧵 emoji', () => {
      const tweet = createTweet('🧵 Here is my analysis on BTC');
      const result = service.detectThread(tweet);
      
      expect(result.isThread).toBe(true);
      expect(result.indicators).toContain('thread_emoji_or_word');
    });

    it('should detect thread by "thread" keyword', () => {
      const tweet = createTweet('Thread on why ETH will flip BTC');
      const result = service.detectThread(tweet);
      
      expect(result.isThread).toBe(true);
      expect(result.indicators).toContain('thread_emoji_or_word');
    });

    it('should detect thread by numbered format (1/)', () => {
      const tweet = createTweet('1/ Let me explain why this matters');
      const result = service.detectThread(tweet);
      
      expect(result.isThread).toBe(true);
      expect(result.indicators).toContain('fraction_notation');
      expect(result.position).toBe(1);
    });

    it('should detect thread by numbered format (1.)', () => {
      const tweet = createTweet('1. First point of my analysis');
      const result = service.detectThread(tweet);
      
      expect(result.isThread).toBe(true);
      expect(result.indicators).toContain('numbered_tweet');
      expect(result.position).toBe(1);
    });

    it('should detect thread by (1/10) format', () => {
      const tweet = createTweet('Important thoughts (1/10)');
      const result = service.detectThread(tweet);
      
      expect(result.isThread).toBe(true);
      expect(result.indicators).toContain('fraction_notation');
      expect(result.position).toBe(1);
    });

    it('should not detect non-thread tweet', () => {
      const tweet = createTweet('Just a normal tweet about crypto');
      const result = service.detectThread(tweet);
      
      expect(result.isThread).toBe(false);
      expect(result.indicators.length).toBe(0);
    });

    it('should detect thread root', () => {
      const tweet = createTweet('🧵 Thread starts here');
      tweet.conversationId = tweet.id; // Same ID = root
      
      const result = service.detectThread(tweet);
      
      expect(result.isThread).toBe(true);
      expect(result.indicators).toContain('is_thread_root');
    });
  });

  describe('summarizeThread', () => {
    it('should return null for empty tweets', () => {
      const result = service.summarizeThread([]);
      expect(result).toBeNull();
    });

    it('should summarize a thread correctly', () => {
      const tweets: XTweet[] = [
        createTweet('🧵 First tweet', 'analyst', 1000, 100),
        createTweet('2/ Second point', 'analyst', 800, 80),
        createTweet('3/ Final thoughts', 'analyst', 600, 60),
      ];

      const result = service.summarizeThread(tweets);
      
      expect(result).not.toBeNull();
      expect(result?.author.username).toBe('analyst');
      expect(result?.tweetCount).toBe(3);
      expect(result?.engagement.likes).toBe(2400); // 1000 + 800 + 600
      expect(result?.engagement.retweets).toBe(240); // 100 + 80 + 60
      expect(result?.url).toContain('analyst');
    });

    it('should calculate velocity', () => {
      const tweet = createTweet('🧵 Analysis', 'analyst', 1000, 100);
      // Set created_at to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      tweet.createdAt = twoHoursAgo.toISOString();

      const result = service.summarizeThread([tweet]);
      
      expect(result).not.toBeNull();
      expect(result?.velocity).toBeCloseTo(500, -1); // ~500 likes/hour
    });
  });

  describe('findThreads', () => {
    it('should find thread roots from a list', () => {
      const tweets: XTweet[] = [
        createThreadRoot('🧵 Thread 1'),
        createTweet('Normal tweet'),
        createThreadRoot('Thread: Important analysis'),
        createTweet('Another normal tweet'),
      ];

      const threads = service.findThreads(tweets);
      
      expect(threads.length).toBe(2);
    });

    it('should return empty for no threads', () => {
      const tweets: XTweet[] = [
        createTweet('Normal tweet 1'),
        createTweet('Normal tweet 2'),
      ];

      const threads = service.findThreads(tweets);
      
      expect(threads.length).toBe(0);
    });
  });

  describe('fetchThread', () => {
    it('returns tweets sorted by created_at', async () => {
      const older = createTweet('1/ First');
      older.createdAt = '2024-01-01T10:00:00Z';
      const newer = createTweet('2/ Second');
      newer.createdAt = '2024-01-01T11:00:00Z';
      mockClient.searchRecent.mockResolvedValue({
        data: [newer, older],
        meta: { resultCount: 2 },
      });

      const result = await service.fetchThread('conv-123');

      expect(result.length).toBe(2);
      expect(result[0].text).toBe('1/ First');
      expect(result[1].text).toBe('2/ Second');
    });
  });

  describe('getThread', () => {
    it('fetches thread by tweet ID', async () => {
      const rootTweet = createTweet('🧵 Thread');
      rootTweet.id = '123';
      rootTweet.conversationId = '123';
      const replyTweet = createTweet('2/ Second');
      replyTweet.conversationId = '123';
      mockClient.getTweet.mockResolvedValue(rootTweet);
      mockClient.searchRecent.mockResolvedValue({
        data: [rootTweet, replyTweet],
        meta: { resultCount: 2 },
      });

      const result = await service.getThread('123');

      expect(result.length).toBe(2);
    });

    it('throws for invalid tweet ID', async () => {
      await expect(service.getThread('invalid')).rejects.toThrow('Invalid tweet ID');
    });

    it('throws when tweet not found', async () => {
      mockClient.getTweet.mockResolvedValue(null);
      await expect(service.getThread('999')).rejects.toThrow('Tweet not found');
    });
  });
});

// Helpers
function createTweet(
  text: string, 
  username = 'testuser',
  likes = 100,
  retweets = 10
): XTweet {
  const id = Math.random().toString(36).slice(2);
  return {
    id,
    text,
    authorId: '12345',
    createdAt: new Date().toISOString(),
    conversationId: 'conv_' + id, // Different from id = not root
    author: {
      id: '12345',
      username,
      name: 'Test User',
    },
    metrics: {
      likeCount: likes,
      retweetCount: retweets,
      replyCount: 5,
      quoteCount: 2,
    },
  };
}

function createThreadRoot(text: string, username = 'testuser'): XTweet {
  const tweet = createTweet(text, username);
  tweet.conversationId = tweet.id; // Same = root
  return tweet;
}
