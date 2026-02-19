/**
 * Shared sentiment keyword and phrase constants for X and news sentiment.
 * Single source of truth for trading lexicon (crypto-CT aligned).
 */

/** Bullish words (substring match). Used by X sentiment; news can mirror. */
export const BULLISH_WORDS = [
  "bullish",
  "moon",
  "pump",
  "buy",
  "long",
  "great",
  "love",
  "bull",
  "growth",
  "profit",
  "accumulate",
  "bottom",
  "rally",
  "surge",
  "breakout",
  "ath",
  "gains",
  "inflows",
  "accumulation",
  "institutional",
  "adoption",
  "approval",
  "breakthrough",
  "accumulating",
  "buying",
  "record high",
  "record inflow",
];

/** Bearish words (substring match). */
export const BEARISH_WORDS = [
  "bearish",
  "dump",
  "sell",
  "short",
  "bad",
  "hate",
  "bear",
  "crash",
  "fud",
  "top",
  "plunge",
  "selloff",
  "sell-off",
  "decline",
  "capitulation",
  "liquidation",
  "distribution",
  "selling",
  "outflows",
  "etf outflow",
  "retreat",
  "collapse",
  "downgrade",
  "failure",
];

/** Risk keywords (any match sets risk flag). Aligned with news RISK_EVENT. */
export const RISK_WORDS = [
  "rug",
  "rugged",
  "scam",
  "exploit",
  "exploited",
  "hack",
  "hacked",
  "drain",
  "stolen",
  "insolvency",
  "bankruptcy",
];

/**
 * Phrase-level overrides: checked before word scoring.
 * If phrase found in text (case-insensitive), return this sentiment and skip word count.
 * "bull trap" / "bear trap" -> neutral; "buy the dip" -> bullish; "sell the rip" -> bearish.
 */
export const PHRASE_OVERRIDES: {
  phrase: string;
  sentiment: "bullish" | "bearish" | "neutral";
}[] = [
  { phrase: "bull trap", sentiment: "neutral" },
  { phrase: "bear trap", sentiment: "neutral" },
  { phrase: "buy the dip", sentiment: "bullish" },
  { phrase: "sell the rip", sentiment: "bearish" },
  { phrase: "selling the rip", sentiment: "bearish" },
  { phrase: "not bullish", sentiment: "neutral" },
  { phrase: "not bearish", sentiment: "neutral" },
  { phrase: "isn't bullish", sentiment: "neutral" },
  { phrase: "isn't bearish", sentiment: "neutral" },
  { phrase: "wasn't bullish", sentiment: "neutral" },
  { phrase: "wasn't bearish", sentiment: "neutral" },
];

/** Max words to look back for negation (e.g. "not" before "bullish"). */
export const NEGATION_WINDOW = 3;

/** Weighted keyword for finer sentiment scoring (-1 to +1). Aligned with plugin-x-research. */
export interface WeightedKeyword {
  word: string;
  weight: number;
}

/** Weighted keywords: positive = bullish, negative = bearish. Used when useWeightedKeywords in computeSentimentFromTweets. */
export const WEIGHTED_KEYWORDS: WeightedKeyword[] = [
  { word: "moon", weight: 0.8 },
  { word: "mooning", weight: 0.9 },
  { word: "ath", weight: 0.7 },
  { word: "breakout", weight: 0.6 },
  { word: "bullish", weight: 0.7 },
  { word: "pump", weight: 0.7 },
  { word: "pumping", weight: 0.75 },
  { word: "accumulate", weight: 0.4 },
  { word: "accumulating", weight: 0.5 },
  { word: "long", weight: 0.4 },
  { word: "buying", weight: 0.4 },
  { word: "support", weight: 0.3 },
  { word: "rally", weight: 0.5 },
  { word: "breakthrough", weight: 0.5 },
  { word: "crash", weight: -0.8 },
  { word: "crashing", weight: -0.85 },
  { word: "dump", weight: -0.7 },
  { word: "dumping", weight: -0.75 },
  { word: "bearish", weight: -0.7 },
  { word: "capitulation", weight: -0.8 },
  { word: "liquidated", weight: -0.75 },
  { word: "selling", weight: -0.4 },
  { word: "short", weight: -0.4 },
  { word: "breakdown", weight: -0.5 },
  { word: "selloff", weight: -0.6 },
  { word: "outflows", weight: -0.4 },
  { word: "fud", weight: -0.5 },
  { word: "panic", weight: -0.7 },
  { word: "fear", weight: -0.4 },
];
