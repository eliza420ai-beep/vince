/**
 * Tweet Types — X API v2 Post Objects
 */

export interface XTweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;

  // Engagement metrics
  metrics?: XTweetMetrics;

  // Author expansion
  author?: XUser;

  // Context
  conversationId?: string;
  inReplyToUserId?: string;
  referencedTweets?: XReferencedTweet[];

  // Entities
  entities?: XTweetEntities;

  // Computed fields (added by our analysis)
  computed?: {
    velocity?: number; // Likes per hour
    isThread?: boolean;
    threadPosition?: number;
    qualityTier?: AccountTier;
    relevanceScore?: number;
  };
}

export interface XTweetMetrics {
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  impressionCount?: number;
  bookmarkCount?: number;
}

export interface XReferencedTweet {
  type: "replied_to" | "quoted" | "retweeted";
  id: string;
}

export interface XTweetEntities {
  hashtags?: Array<{ tag: string; start: number; end: number }>;
  mentions?: Array<{
    username: string;
    id: string;
    start: number;
    end: number;
  }>;
  urls?: Array<{ url: string; expanded_url: string; display_url: string }>;
  cashtags?: Array<{ tag: string; start: number; end: number }>;
}

export interface XUser {
  id: string;
  username: string;
  name: string;

  // Profile
  description?: string;
  profileImageUrl?: string;
  verified?: boolean;
  verifiedType?: "blue" | "business" | "government" | "none";

  // Metrics
  metrics?: XUserMetrics;

  // Computed
  tier?: AccountTier;
}

export interface XUserMetrics {
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  listedCount?: number;
}

export type AccountTier =
  | "whale" // 100k+ followers, high engagement
  | "alpha" // Known for quality insights
  | "quality" // In our curated list
  | "verified" // Blue check
  | "standard"; // Everyone else

export interface XSearchResponse {
  data: XTweet[];
  includes?: {
    users?: XUser[];
    tweets?: XTweet[];
  };
  meta: {
    newestId?: string;
    oldestId?: string;
    resultCount: number;
    nextToken?: string;
  };
}

export interface XCountsResponse {
  data: Array<{
    start: string;
    end: string;
    tweetCount: number;
  }>;
  meta: {
    totalTweetCount: number;
  };
}
