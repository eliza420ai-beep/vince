/**
 * X API v2 Endpoints
 */

export const X_API_BASE = 'https://api.x.com/2';

export const ENDPOINTS = {
  // Search
  SEARCH_RECENT: '/tweets/search/recent',
  SEARCH_COUNTS: '/tweets/counts/recent',
  
  // Tweets
  TWEET: '/tweets/:id',
  TWEETS: '/tweets',
  QUOTE_TWEETS: '/tweets/:id/quote_tweets',
  RETWEETED_BY: '/tweets/:id/retweeted_by',
  
  // Users
  USER_BY_USERNAME: '/users/by/username/:username',
  USER: '/users/:id',
  USER_TWEETS: '/users/:id/tweets',
  USER_MENTIONS: '/users/:id/mentions',
  USER_FOLLOWERS: '/users/:id/followers',
  USER_FOLLOWING: '/users/:id/following',
  
  // Lists
  LIST: '/lists/:id',
  LIST_TWEETS: '/lists/:id/tweets',
  LIST_MEMBERS: '/lists/:id/members',
  
  // Trends
  PERSONALIZED_TRENDS: '/users/personalized_trends',
  
  // News (NEW!)
  NEWS_SEARCH: '/news/search',
  NEWS_BY_ID: '/news/:id',
  
  // Spaces
  SPACES_SEARCH: '/spaces/search',
  SPACE: '/spaces/:id',
} as const;

// Default fields to request
export const DEFAULT_TWEET_FIELDS = [
  'id',
  'text',
  'author_id',
  'created_at',
  'public_metrics',
  'conversation_id',
  'in_reply_to_user_id',
  'referenced_tweets',
  'entities',
].join(',');

export const DEFAULT_USER_FIELDS = [
  'id',
  'username',
  'name',
  'description',
  'profile_image_url',
  'verified',
  'verified_type',
  'public_metrics',
].join(',');

export const DEFAULT_EXPANSIONS = [
  'author_id',
  'referenced_tweets.id',
  'referenced_tweets.id.author_id',
].join(',');
