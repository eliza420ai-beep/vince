/**
 * X Client Service unit tests.
 * Mocks fetch to test auth, cache, and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { XClientService } from '../services/xClient.service';

describe('XClientService', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('authentication', () => {
    it('includes Authorization Bearer header in requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({ data: [], meta: { result_count: 0 } }),
      });

      const client = new XClientService({
        bearerToken: 'test-token-123',
        cacheEnabled: false,
      });

      await client.searchRecent('bitcoin');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(options?.headers?.Authorization).toBe('Bearer test-token-123');
      expect(url).toContain('/tweets/search/recent');
    });
  });

  describe('caching', () => {
    it('returns cached data on second call with same cache key', async () => {
      const mockData = { data: [], meta: { result_count: 0 } };
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve(mockData),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: true,
      });

      const result1 = await client.searchRecent('bitcoin', { maxResults: 50 });
      const result2 = await client.searchRecent('bitcoin', { maxResults: 50 });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual([]);
      expect(result2.data).toEqual([]);
    });

    it('skips cache when cacheEnabled is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({ data: [], meta: { result_count: 0 } }),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: false,
      });

      await client.searchRecent('bitcoin');
      await client.searchRecent('bitcoin');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('clearCache clears stored entries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({ data: [], meta: { result_count: 0 } }),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: true,
      });

      await client.searchRecent('bitcoin');
      expect(client.getCacheStats().size).toBe(1);

      client.clearCache();
      expect(client.getCacheStats().size).toBe(0);

      await client.searchRecent('bitcoin');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('returns clear message on 401', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Invalid token' }),
      });

      const client = new XClientService({
        bearerToken: 'bad-token',
        cacheEnabled: false,
      });

      await expect(client.searchRecent('bitcoin')).rejects.toThrow(/authentication|Bearer token/);
    });

    it('returns clear message on 403', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Forbidden' }),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: false,
      });

      await expect(client.searchRecent('bitcoin')).rejects.toThrow(/Access denied|token/);
    });

    it('throws with rate limit code on 429 when no reset header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
        json: () => Promise.resolve({ detail: 'Rate limited' }),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: false,
      });

      await expect(client.searchRecent('bitcoin')).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTweet', () => {
    it('returns tweet when found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            data: {
              id: '123',
              text: 'Hello',
              author_id: 'u1',
              created_at: '2024-01-01T00:00:00Z',
              public_metrics: { like_count: 10, retweet_count: 2, reply_count: 1, quote_count: 0 },
            },
          }),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: false,
      });

      const tweet = await client.getTweet('123');

      expect(tweet).not.toBeNull();
      expect(tweet?.id).toBe('123');
      expect(tweet?.text).toBe('Hello');
      expect(tweet?.metrics?.likeCount).toBe(10);
    });

    it('returns null when tweet not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () => Promise.resolve({}),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: false,
      });

      const tweet = await client.getTweet('999');
      expect(tweet).toBeNull();
    });
  });

  describe('getUserByUsername', () => {
    it('returns user when found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: () =>
          Promise.resolve({
            data: {
              id: 'u1',
              username: 'trader1',
              name: 'Trader',
              public_metrics: { followers_count: 5000 },
            },
          }),
      });

      const client = new XClientService({
        bearerToken: 'token',
        cacheEnabled: false,
      });

      const user = await client.getUserByUsername('trader1');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('trader1');
      expect(user?.metrics?.followersCount).toBe(5000);
    });
  });
});
