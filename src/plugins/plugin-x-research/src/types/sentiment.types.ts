/**
 * Sentiment Types — Trading Sentiment Analysis
 */

export type SentimentDirection = 'bullish' | 'bearish' | 'neutral' | 'mixed';

export interface TopicSentiment {
  topic: string;
  direction: SentimentDirection;
  confidence: number;              // 0-100
  score: number;                   // -100 to +100 (bearish to bullish)
  
  breakdown: {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    totalAnalyzed: number;
  };
  
  // Quality weighting
  weightedScore: number;           // Score weighted by account tier
  whaleAlignment: number;          // How aligned are whale accounts (-100 to +100)
  
  // Temporal
  trend: 'increasing' | 'decreasing' | 'stable';
  change24h: number;               // Score change in last 24h
  
  // Risk signals
  isContrarian?: boolean;          // Extreme sentiment (potential reversal)
  contrarianNote?: string;
}

export interface SentimentKeyword {
  word: string;
  weight: number;                  // -1 to +1
  category: 'bullish' | 'bearish' | 'risk' | 'fomo' | 'fear';
}

export interface SentimentResult {
  overallSentiment: SentimentDirection;
  overallConfidence: number;
  overallScore: number;
  
  byTopic: Record<string, TopicSentiment>;
  
  summary: string;                 // Human-readable summary
  warnings: string[];              // Contrarian/risk warnings
  
  timestamp: number;
  sampleSize: number;
}

export interface SentimentTier {
  tier: 'extreme_bullish' | 'bullish' | 'slightly_bullish' |
        'neutral' |
        'slightly_bearish' | 'bearish' | 'extreme_bearish';
  label: string;
  emoji: string;
  scoreRange: [number, number];
}

// Sentiment tier definitions
export const SENTIMENT_TIERS: SentimentTier[] = [
  { tier: 'extreme_bullish', label: 'Extreme Greed', emoji: '🚀', scoreRange: [80, 100] },
  { tier: 'bullish', label: 'Bullish', emoji: '📈', scoreRange: [40, 79] },
  { tier: 'slightly_bullish', label: 'Slightly Bullish', emoji: '🟢', scoreRange: [10, 39] },
  { tier: 'neutral', label: 'Neutral', emoji: '😐', scoreRange: [-9, 9] },
  { tier: 'slightly_bearish', label: 'Slightly Bearish', emoji: '🟡', scoreRange: [-39, -10] },
  { tier: 'bearish', label: 'Bearish', emoji: '📉', scoreRange: [-79, -40] },
  { tier: 'extreme_bearish', label: 'Extreme Fear', emoji: '💀', scoreRange: [-100, -80] },
];
