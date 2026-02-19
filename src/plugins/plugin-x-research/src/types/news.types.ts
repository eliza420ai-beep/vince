/**
 * News Types — X API v2 News Objects
 */

export interface XNewsItem {
  id: string;
  name: string; // Headline
  summary: string; // Grok-generated summary
  hook: string; // Attention-grabbing one-liner
  category: string;

  contexts: XNewsContexts;

  clusterPostIds: string[]; // Tweet IDs driving the story
  lastUpdatedAt: number;
  disclaimer?: string;
}

export interface XNewsContexts {
  finance?: {
    tickers: string[]; // BTC, ETH, NVDA, etc.
  };
  topics: string[]; // Cryptocurrency, ETF, etc.
  entities: {
    organizations: string[]; // BlackRock, SEC, etc.
    people: string[]; // Vitalik, CZ, etc.
    events?: string[];
    places?: string[];
  };
}

export interface XNewsResult extends XNewsItem {
  relevanceScore: number; // How relevant to our topics (0-100)
  sentiment: "bullish" | "bearish" | "neutral";
  impactLevel: "high" | "medium" | "low";
}

export interface NewsSearchOptions {
  maxResults?: number;
  tickers?: string[];
  topics?: string[];
  since?: string; // ISO date
}

export interface CryptoNewsOptions {
  maxResults?: number;
  focusAssets?: string[]; // BTC, ETH, SOL, etc.
  includeDefi?: boolean;
  includeNft?: boolean;
}

export interface XNewsResponse {
  data: XNewsItem[];
  meta?: {
    resultCount: number;
    nextToken?: string;
  };
}
