/**
 * Normalize X API v2 responses — unit tests.
 * Tests snake_case to camelCase conversion for API contract safety.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeTweet,
  normalizeUser,
  normalizeSearchResponse,
  normalizeCountsResponse,
  normalizeTweetResponse,
  normalizeTweetArrayResponse,
  normalizeUserResponse,
} from '../utils/normalize';

describe('normalizeTweet', () => {
  it('converts snake_case API response to camelCase', () => {
    const raw = {
      id: '123',
      text: 'Hello world',
      author_id: 'user1',
      created_at: '2024-01-15T12:00:00Z',
      public_metrics: {
        like_count: 42,
        retweet_count: 10,
        reply_count: 5,
        quote_count: 2,
      },
      conversation_id: 'conv1',
      in_reply_to_user_id: 'user0',
    };

    const result = normalizeTweet(raw);

    expect(result.id).toBe('123');
    expect(result.text).toBe('Hello world');
    expect(result.authorId).toBe('user1');
    expect(result.createdAt).toBe('2024-01-15T12:00:00Z');
    expect(result.metrics?.likeCount).toBe(42);
    expect(result.metrics?.retweetCount).toBe(10);
    expect(result.metrics?.replyCount).toBe(5);
    expect(result.metrics?.quoteCount).toBe(2);
    expect(result.conversationId).toBe('conv1');
    expect(result.inReplyToUserId).toBe('user0');
  });

  it('handles missing optional fields', () => {
    const raw = {
      id: '456',
      text: 'Minimal tweet',
      author_id: 'user2',
      created_at: '2024-01-16T00:00:00Z',
    };

    const result = normalizeTweet(raw);

    expect(result.id).toBe('456');
    expect(result.text).toBe('Minimal tweet');
    expect(result.authorId).toBe('user2');
    expect(result.metrics).toBeUndefined();
    expect(result.conversationId).toBeUndefined();
  });

  it('handles referenced_tweets', () => {
    const raw = {
      id: '789',
      text: 'Quote tweet',
      author_id: 'user3',
      created_at: '2024-01-17T00:00:00Z',
      referenced_tweets: [{ type: 'quoted', id: 'orig123' }],
    };

    const result = normalizeTweet(raw);

    expect(result.referencedTweets).toEqual([{ type: 'quoted', id: 'orig123' }]);
  });

  it('handles empty or null values with safe defaults', () => {
    const raw: Record<string, unknown> = {};
    const result = normalizeTweet(raw);

    expect(result.id).toBe('');
    expect(result.text).toBe('');
    expect(result.authorId).toBe('');
    expect(result.createdAt).toBe('');
    expect(result.metrics).toBeUndefined();
  });
});

describe('normalizeUser', () => {
  it('converts snake_case user to camelCase', () => {
    const raw = {
      id: 'u1',
      username: 'trader1',
      name: 'Trader One',
      description: 'Crypto enthusiast',
      profile_image_url: 'https://example.com/avatar.png',
      public_metrics: {
        followers_count: 10000,
        following_count: 500,
        tweet_count: 2500,
      },
    };

    const result = normalizeUser(raw);

    expect(result.id).toBe('u1');
    expect(result.username).toBe('trader1');
    expect(result.name).toBe('Trader One');
    expect(result.description).toBe('Crypto enthusiast');
    expect(result.profileImageUrl).toBe('https://example.com/avatar.png');
    expect(result.metrics?.followersCount).toBe(10000);
    expect(result.metrics?.followingCount).toBe(500);
    expect(result.metrics?.tweetCount).toBe(2500);
  });

  it('handles missing optional fields', () => {
    const raw = { id: 'u2', username: 'minimal', name: 'Minimal User' };
    const result = normalizeUser(raw);

    expect(result.metrics).toBeUndefined();
    expect(result.description).toBeUndefined();
  });
});

describe('normalizeSearchResponse', () => {
  it('normalizes data and includes.users', () => {
    const raw = {
      data: [
        {
          id: 't1',
          text: 'BTC pump',
          author_id: 'u1',
          created_at: '2024-01-15T12:00:00Z',
        },
      ],
      includes: {
        users: [
          {
            id: 'u1',
            username: 'trader1',
            name: 'Trader',
            public_metrics: { followers_count: 1000 },
          },
        ],
      },
      meta: { result_count: 1, next_token: 'abc' },
    };

    const result = normalizeSearchResponse(raw);

    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe('t1');
    expect(result.data[0].text).toBe('BTC pump');
    expect(result.includes?.users?.length).toBe(1);
    expect(result.includes?.users?.[0].username).toBe('trader1');
    expect(result.includes?.users?.[0].metrics?.followersCount).toBe(1000);
    expect(result.meta).toBeDefined();
  });

  it('handles empty data array', () => {
    const raw = { data: [], meta: { resultCount: 0 } };
    const result = normalizeSearchResponse(raw);

    expect(result.data).toEqual([]);
    expect(result.includes).toBeUndefined();
    expect(result.meta.resultCount).toBe(0);
  });

  it('handles missing includes', () => {
    const raw = {
      data: [{ id: 't1', text: 'x', author_id: 'u1', created_at: '2024-01-01T00:00:00Z' }],
      meta: { resultCount: 1 },
    };

    const result = normalizeSearchResponse(raw);

    expect(result.data.length).toBe(1);
    expect(result.includes).toBeUndefined();
  });
});

describe('normalizeCountsResponse', () => {
  it('normalizes tweet_count to tweetCount in count buckets', () => {
    const raw = {
      data: [
        { start: '2024-01-01T00:00:00Z', end: '2024-01-01T01:00:00Z', tweet_count: 100 },
        { start: '2024-01-01T01:00:00Z', end: '2024-01-01T02:00:00Z', tweet_count: 200 },
      ],
      meta: { total_tweet_count: 300 },
    };

    const result = normalizeCountsResponse(raw);

    expect(result.data.length).toBe(2);
    expect(result.data[0].tweetCount).toBe(100);
    expect(result.data[1].tweetCount).toBe(200);
    expect(result.meta.totalTweetCount).toBe(300);
  });

  it('handles empty data', () => {
    const raw = { data: [], meta: {} };
    const result = normalizeCountsResponse(raw);

    expect(result.data).toEqual([]);
    expect(result.meta.totalTweetCount).toBe(0);
  });

  it('accepts totalTweetCount in meta (camelCase)', () => {
    const raw = { data: [], meta: { totalTweetCount: 500 } };
    const result = normalizeCountsResponse(raw);

    expect(result.meta.totalTweetCount).toBe(500);
  });
});

describe('normalizeTweetResponse', () => {
  it('returns data when present', () => {
    const raw = {
      data: {
        id: 't1',
        text: 'Single tweet',
        author_id: 'u1',
        created_at: '2024-01-01T00:00:00Z',
      },
    };

    const result = normalizeTweetResponse(raw);

    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe('t1');
    expect(result.data?.text).toBe('Single tweet');
  });

  it('returns undefined data when raw.data is missing', () => {
    const result = normalizeTweetResponse({});
    expect(result.data).toBeUndefined();
  });
});

describe('normalizeTweetArrayResponse', () => {
  it('normalizes array of tweets', () => {
    const raw = {
      data: [
        { id: 't1', text: 'First', author_id: 'u1', created_at: '2024-01-01T00:00:00Z' },
        { id: 't2', text: 'Second', author_id: 'u2', created_at: '2024-01-01T01:00:00Z' },
      ],
    };

    const result = normalizeTweetArrayResponse(raw);

    expect(result.data.length).toBe(2);
    expect(result.data[0].id).toBe('t1');
    expect(result.data[1].id).toBe('t2');
  });

  it('returns empty array when raw.data is missing', () => {
    const result = normalizeTweetArrayResponse({});
    expect(result.data).toEqual([]);
  });
});

describe('normalizeUserResponse', () => {
  it('returns user when present', () => {
    const raw = {
      data: {
        id: 'u1',
        username: 'trader1',
        name: 'Trader',
      },
    };

    const result = normalizeUserResponse(raw);

    expect(result.data?.username).toBe('trader1');
  });

  it('returns undefined when raw.data is missing', () => {
    const result = normalizeUserResponse({});
    expect(result.data).toBeUndefined();
  });
});
