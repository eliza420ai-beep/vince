/**
 * Trends Types — X API v2 Trends Objects
 */

export interface XTrend {
  trendName: string;
  postCount: number;
  category?: string;
  trendingSince?: string;
}

export interface TrendingTopicStatus {
  topic: string;                   // BTC, ETH, ElizaOS, etc.
  isTrending: boolean;
  postCount?: number;
  rank?: number;                   // Position in trends
}

export interface TrendVolume {
  topic: string;
  current: number;
  avg24h: number;
  percentChange: number;
  isSpike: boolean;
}

export interface XTrendsResponse {
  data: XTrend[];
  meta?: {
    resultCount: number;
  };
}
