/**
 * Sentiment Keywords for Trading Analysis
 *
 * Weight: -1.0 (extremely bearish) to +1.0 (extremely bullish)
 * Category helps with nuanced analysis
 */

import type { SentimentKeyword } from "../types/sentiment.types";

// Bullish Keywords
export const BULLISH_KEYWORDS: SentimentKeyword[] = [
  // Strong bullish
  { word: "moon", weight: 0.8, category: "bullish" },
  { word: "mooning", weight: 0.9, category: "bullish" },
  { word: "ath", weight: 0.7, category: "bullish" },
  { word: "all time high", weight: 0.7, category: "bullish" },
  { word: "breakout", weight: 0.6, category: "bullish" },
  { word: "bullish", weight: 0.7, category: "bullish" },
  { word: "mega bullish", weight: 0.9, category: "bullish" },
  { word: "super bullish", weight: 0.85, category: "bullish" },
  { word: "extremely bullish", weight: 0.9, category: "bullish" },
  { word: "lfg", weight: 0.6, category: "bullish" },
  { word: "let's go", weight: 0.5, category: "bullish" },
  { word: "pump", weight: 0.7, category: "bullish" },
  { word: "pumping", weight: 0.75, category: "bullish" },
  { word: "sending", weight: 0.6, category: "bullish" },
  { word: "ripping", weight: 0.7, category: "bullish" },
  { word: "parabolic", weight: 0.8, category: "bullish" },

  // Moderate bullish
  { word: "accumulating", weight: 0.5, category: "bullish" },
  { word: "accumulate", weight: 0.4, category: "bullish" },
  { word: "buying", weight: 0.4, category: "bullish" },
  { word: "bought", weight: 0.35, category: "bullish" },
  { word: "long", weight: 0.4, category: "bullish" },
  { word: "longing", weight: 0.45, category: "bullish" },
  { word: "bid", weight: 0.3, category: "bullish" },
  { word: "bidding", weight: 0.35, category: "bullish" },
  { word: "support", weight: 0.3, category: "bullish" },
  { word: "holding", weight: 0.25, category: "bullish" },
  { word: "hodl", weight: 0.3, category: "bullish" },
  { word: "diamond hands", weight: 0.4, category: "bullish" },
  { word: "undervalued", weight: 0.5, category: "bullish" },

  // FOMO signals (bullish but warning)
  { word: "fomo", weight: 0.6, category: "fomo" },
  { word: "ngmi if", weight: 0.5, category: "fomo" },
  { word: "don't miss", weight: 0.5, category: "fomo" },
  { word: "last chance", weight: 0.6, category: "fomo" },
  { word: "generational", weight: 0.7, category: "fomo" },
];

// Bearish Keywords
export const BEARISH_KEYWORDS: SentimentKeyword[] = [
  // Strong bearish
  { word: "crash", weight: -0.8, category: "bearish" },
  { word: "crashing", weight: -0.85, category: "bearish" },
  { word: "dump", weight: -0.7, category: "bearish" },
  { word: "dumping", weight: -0.75, category: "bearish" },
  { word: "bearish", weight: -0.7, category: "bearish" },
  { word: "mega bearish", weight: -0.9, category: "bearish" },
  { word: "capitulation", weight: -0.8, category: "bearish" },
  { word: "blood", weight: -0.6, category: "bearish" },
  { word: "bloodbath", weight: -0.8, category: "bearish" },
  { word: "rekt", weight: -0.7, category: "bearish" },
  { word: "liquidated", weight: -0.75, category: "bearish" },
  { word: "nuked", weight: -0.8, category: "bearish" },
  { word: "dead", weight: -0.6, category: "bearish" },
  { word: "ded", weight: -0.55, category: "bearish" },

  // Moderate bearish
  { word: "selling", weight: -0.4, category: "bearish" },
  { word: "sold", weight: -0.35, category: "bearish" },
  { word: "short", weight: -0.4, category: "bearish" },
  { word: "shorting", weight: -0.45, category: "bearish" },
  { word: "resistance", weight: -0.2, category: "bearish" },
  { word: "rejection", weight: -0.4, category: "bearish" },
  { word: "rejected", weight: -0.35, category: "bearish" },
  { word: "breakdown", weight: -0.5, category: "bearish" },
  { word: "overvalued", weight: -0.5, category: "bearish" },
  { word: "top signal", weight: -0.6, category: "bearish" },
  { word: "exit liquidity", weight: -0.7, category: "bearish" },

  // Fear signals
  { word: "scared", weight: -0.5, category: "fear" },
  { word: "panic", weight: -0.7, category: "fear" },
  { word: "fear", weight: -0.4, category: "fear" },
  { word: "worried", weight: -0.3, category: "fear" },
  { word: "nervous", weight: -0.3, category: "fear" },
  { word: "ngmi", weight: -0.5, category: "fear" },
];

// Risk Keywords (neutral sentiment but important signals)
export const RISK_KEYWORDS: SentimentKeyword[] = [
  { word: "exploit", weight: -0.6, category: "risk" },
  { word: "hacked", weight: -0.7, category: "risk" },
  { word: "hack", weight: -0.6, category: "risk" },
  { word: "rug", weight: -0.8, category: "risk" },
  { word: "rugged", weight: -0.85, category: "risk" },
  { word: "scam", weight: -0.7, category: "risk" },
  { word: "ponzi", weight: -0.6, category: "risk" },
  { word: "sec", weight: -0.2, category: "risk" },
  { word: "lawsuit", weight: -0.4, category: "risk" },
  { word: "investigation", weight: -0.3, category: "risk" },
  { word: "warning", weight: -0.3, category: "risk" },
  { word: "caution", weight: -0.2, category: "risk" },
  { word: "careful", weight: -0.15, category: "risk" },
  { word: "risky", weight: -0.3, category: "risk" },
  { word: "volatile", weight: 0, category: "risk" },
  { word: "volatility", weight: 0, category: "risk" },
];

// All keywords combined
export const ALL_KEYWORDS: SentimentKeyword[] = [
  ...BULLISH_KEYWORDS,
  ...BEARISH_KEYWORDS,
  ...RISK_KEYWORDS,
];

// Quick lookup by word
export const KEYWORD_MAP = new Map<string, SentimentKeyword>(
  ALL_KEYWORDS.map((k) => [k.word.toLowerCase(), k]),
);
