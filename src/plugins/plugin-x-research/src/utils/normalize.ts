/**
 * Normalize X API v2 responses from snake_case to camelCase.
 * X API returns: public_metrics, author_id, created_at, like_count, etc.
 * Our types use: metrics, authorId, createdAt, likeCount, etc.
 */

import type { XTweet, XUser, XSearchResponse, XCountsResponse } from '../types/tweet.types';

/** Raw tweet metrics from API (snake_case) */
interface RawPublicMetrics {
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
  quote_count?: number;
  impression_count?: number;
  bookmark_count?: number;
}

/** Raw user public_metrics (snake_case) */
interface RawUserMetrics {
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
}

function toTweetMetrics(raw: RawPublicMetrics | undefined): XTweet['metrics'] {
  if (!raw) return undefined;
  return {
    likeCount: raw.like_count ?? 0,
    retweetCount: raw.retweet_count ?? 0,
    replyCount: raw.reply_count ?? 0,
    quoteCount: raw.quote_count ?? 0,
    impressionCount: raw.impression_count,
    bookmarkCount: raw.bookmark_count,
  };
}

function toUserMetrics(raw: RawUserMetrics | undefined): XUser['metrics'] {
  if (!raw) return undefined;
  return {
    followersCount: raw.followers_count ?? 0,
    followingCount: raw.following_count ?? 0,
    tweetCount: raw.tweet_count ?? 0,
    listedCount: raw.listed_count,
  };
}

/** Normalize a single tweet from API shape to our XTweet type */
export function normalizeTweet(raw: Record<string, unknown>): XTweet {
  const pm = raw.public_metrics as RawPublicMetrics | undefined;
  const refs = raw.referenced_tweets as Array<{ type: string; id: string }> | undefined;
  return {
    id: String(raw.id ?? ''),
    text: String(raw.text ?? ''),
    authorId: String((raw.author_id as string) ?? ''),
    createdAt: String((raw.created_at as string) ?? ''),
    metrics: toTweetMetrics(pm),
    conversationId: raw.conversation_id as string | undefined,
    inReplyToUserId: raw.in_reply_to_user_id as string | undefined,
    referencedTweets: refs?.map((r) => ({ type: r.type as 'replied_to' | 'quoted' | 'retweeted', id: r.id })),
    entities: raw.entities as XTweet['entities'],
  };
}

/** Normalize a single user from API shape to our XUser type */
export function normalizeUser(raw: Record<string, unknown>): XUser {
  const pm = raw.public_metrics as RawUserMetrics | undefined;
  return {
    id: String(raw.id ?? ''),
    username: String((raw.username as string) ?? ''),
    name: String((raw.name as string) ?? ''),
    description: raw.description as string | undefined,
    profileImageUrl: raw.profile_image_url as string | undefined,
    verified: raw.verified as boolean | undefined,
    verifiedType: raw.verified_type as XUser['verifiedType'],
    metrics: toUserMetrics(pm),
  };
}

/** Normalize search response: data (tweets) and includes.users */
export function normalizeSearchResponse(raw: Record<string, unknown>): XSearchResponse {
  const data = (raw.data as Record<string, unknown>[] | undefined) ?? [];
  const includes = raw.includes as { users?: Record<string, unknown>[]; tweets?: Record<string, unknown>[] } | undefined;
  const meta = (raw.meta as XSearchResponse['meta']) ?? { resultCount: 0 };

  return {
    data: data.map((t) => normalizeTweet(t)),
    includes: includes
      ? {
          users: includes.users?.map((u) => normalizeUser(u)),
          tweets: includes.tweets?.map((t) => normalizeTweet(t)),
        }
      : undefined,
    meta,
  };
}

/** Normalize a count bucket (start, end, tweet_count → tweetCount) */
function normalizeCountBucket(raw: Record<string, unknown>): { start: string; end: string; tweetCount: number } {
  return {
    start: String(raw.start ?? ''),
    end: String(raw.end ?? ''),
    tweetCount: Number((raw.tweet_count as number) ?? raw.tweetCount ?? 0),
  };
}

/** Normalize counts response */
export function normalizeCountsResponse(raw: Record<string, unknown>): XCountsResponse {
  const data = (raw.data as Record<string, unknown>[] | undefined) ?? [];
  const rawMeta = raw.meta as Record<string, unknown> | undefined;
  const meta: XCountsResponse['meta'] = rawMeta
    ? { totalTweetCount: Number(rawMeta.total_tweet_count ?? rawMeta.totalTweetCount ?? 0) }
    : { totalTweetCount: 0 };
  return {
    data: data.map((b) => normalizeCountBucket(b)),
    meta,
  };
}

/** Normalize single tweet response { data: tweet } */
export function normalizeTweetResponse(raw: { data?: Record<string, unknown> }): { data?: XTweet } {
  if (!raw.data) return { data: undefined };
  return { data: normalizeTweet(raw.data) };
}

/** Normalize tweet array response { data: tweets[] } */
export function normalizeTweetArrayResponse(raw: { data?: Record<string, unknown>[] }): { data: XTweet[] } {
  const data = raw.data ?? [];
  return { data: data.map((t) => normalizeTweet(t)) };
}

/** Normalize user response { data: user } */
export function normalizeUserResponse(raw: { data?: Record<string, unknown> }): { data?: XUser } {
  if (!raw.data) return { data: undefined };
  return { data: normalizeUser(raw.data) };
}
