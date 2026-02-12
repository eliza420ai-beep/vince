/**
 * Shared X sentiment logic: keyword scoring, risk detection, and aggregation.
 * Used by VinceXSentimentService and scripts/x-vibe-check.ts so in-app and cron stay aligned.
 * Supports account-tier weighting (whale/alpha count more) via qualityAccounts.
 */
import {
  BULLISH_WORDS,
  BEARISH_WORDS,
  RISK_WORDS,
  PHRASE_OVERRIDES,
  NEGATION_WINDOW,
  WEIGHTED_KEYWORDS,
  type WeightedKeyword,
} from "../constants/sentimentKeywords";
import { getTierWeight } from "../constants/qualityAccounts";

export interface SentimentKeywordLists {
  bullish: string[];
  bearish: string[];
  risk: string[];
}

const DEFAULT_LISTS: SentimentKeywordLists = {
  bullish: [...BULLISH_WORDS],
  bearish: [...BEARISH_WORDS],
  risk: [...RISK_WORDS],
};

/** Phrase override: if text matches a phrase, return -1 (bearish), 0 (neutral), or 1 (bullish); else null. */
function getPhraseOverride(text: string): number | null {
  const lower = text.toLowerCase();
  for (const { phrase, sentiment } of PHRASE_OVERRIDES) {
    if (lower.includes(phrase.toLowerCase())) {
      if (sentiment === "bullish") return 1;
      if (sentiment === "bearish") return -1;
      return 0;
    }
  }
  return null;
}

function hasNegationBefore(lower: string, idx: number): boolean {
  const words = lower.slice(0, idx).split(/\s+/);
  const window = words.slice(-NEGATION_WINDOW).join(" ");
  return /\b(not|n't|never|isn't|wasn't|aren't|won't|don't|doesn't|didn't)\s*$/i.test(window);
}

/**
 * Weighted keyword sentiment in [-1, 1]. Phrase overrides first; then sum of keyword weights with negation handling.
 */
export function weightedSentiment(
  text: string,
  keywords: WeightedKeyword[] = WEIGHTED_KEYWORDS,
): number {
  const lower = text.toLowerCase();
  const override = getPhraseOverride(text);
  if (override !== null) return override;
  let score = 0;
  for (const kw of keywords) {
    const i = lower.indexOf(kw.word.toLowerCase());
    if (i === -1) continue;
    const sign = hasNegationBefore(lower, i) ? -1 : 1;
    score += sign * kw.weight;
  }
  if (score === 0) return 0;
  return Math.max(-1, Math.min(1, score));
}

/**
 * Per-tweet sentiment in [-1, 1]. Phrase overrides first; else word count with negation; then cap.
 */
export function simpleSentiment(
  text: string,
  lists?: { bullish?: string[]; bearish?: string[] },
): number {
  const lower = text.toLowerCase();
  const override = getPhraseOverride(text);
  if (override !== null) return override;

  const bullishWords = lists?.bullish ?? DEFAULT_LISTS.bullish;
  const bearishWords = lists?.bearish ?? DEFAULT_LISTS.bearish;
  let score = 0;
  for (const w of bullishWords) {
    const i = lower.indexOf(w);
    if (i === -1) continue;
    if (hasNegationBefore(lower, i)) score -= 1;
    else score += 1;
  }
  for (const w of bearishWords) {
    const i = lower.indexOf(w);
    if (i === -1) continue;
    if (hasNegationBefore(lower, i)) score += 1;
    else score -= 1;
  }
  if (score === 0) return 0;
  return Math.max(-1, Math.min(1, score / 5));
}

export function hasRiskKeyword(text: string, riskWords?: string[]): boolean {
  const words = riskWords ?? DEFAULT_LISTS.risk;
  return words.some((w) => text.toLowerCase().includes(w));
}

const CONTRARIAN_THRESHOLD = 0.65;

export interface SentimentCacheEntry {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  hasHighRiskEvent: boolean;
  updatedAt: number;
  /** Extreme sentiment (potential reversal). */
  isContrarian?: boolean;
  contrarianNote?: string;
}

export interface ComputeSentimentOptions {
  keywordLists?: SentimentKeywordLists;
  minTweets?: number;
  bullBearThreshold?: number;
  engagementCap?: number;
  riskMinTweets?: number;
  /** Use weighted keywords for finer signal; default false (simpleSentiment). */
  useWeightedKeywords?: boolean;
  weightedKeywords?: WeightedKeyword[];
}

const DEFAULT_OPTIONS: Required<Omit<ComputeSentimentOptions, "useWeightedKeywords" | "weightedKeywords">> & {
  useWeightedKeywords: boolean;
  weightedKeywords: WeightedKeyword[];
} = {
  keywordLists: DEFAULT_LISTS,
  minTweets: 3,
  bullBearThreshold: 0.15,
  engagementCap: 3,
  riskMinTweets: 2,
  useWeightedKeywords: false,
  weightedKeywords: WEIGHTED_KEYWORDS,
};

/** Tweet-like shape (service uses XTweet, cron uses Tweet; both have text and metrics.likes). */
export interface TweetLike {
  text: string;
  metrics?: { likes?: number };
  /** Author username for tier weighting (whale/alpha count more). */
  authorUsername?: string;
}

/**
 * Compute sentiment from an array of tweets. Same formula as VinceXSentimentService.refreshForAsset
 * so in-app and cron produce comparable results.
 */
export function computeSentimentFromTweets(
  tweets: TweetLike[],
  opts: ComputeSentimentOptions = {},
): SentimentCacheEntry {
  const now = Date.now();
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const { keywordLists, minTweets, bullBearThreshold, engagementCap, riskMinTweets, useWeightedKeywords, weightedKeywords } = options;

  if (tweets.length < minTweets) {
    return { sentiment: "neutral", confidence: 0, hasHighRiskEvent: false, updatedAt: now };
  }

  let sumSentiment = 0;
  let weightedSum = 0;
  let totalWeight = 0;
  let riskTweetCount = 0;

  for (const t of tweets) {
    const s =
      useWeightedKeywords && weightedKeywords.length > 0
        ? weightedSentiment(t.text, weightedKeywords)
        : simpleSentiment(t.text, { bullish: keywordLists.bullish, bearish: keywordLists.bearish });
    if (hasRiskKeyword(t.text, keywordLists.risk)) riskTweetCount += 1;
    const rawWeight = 1 + Math.log10(1 + (t.metrics?.likes ?? 0));
    const engagementWeight = Math.min(rawWeight, engagementCap);
    const tierWeight = t.authorUsername ? getTierWeight(t.authorUsername) : 1;
    const weight = engagementWeight * tierWeight;
    sumSentiment += s;
    weightedSum += s * weight;
    totalWeight += weight;
  }

  const hasRisk = riskTweetCount >= riskMinTweets;
  const avgRaw = sumSentiment / tweets.length;
  const avgWeighted = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const avgSentiment = avgWeighted !== 0 ? avgWeighted : avgRaw;

  let sentiment: "bullish" | "bearish" | "neutral" = "neutral";
  if (avgSentiment > bullBearThreshold) sentiment = "bullish";
  else if (avgSentiment < -bullBearThreshold) sentiment = "bearish";

  const strength = Math.min(
    1,
    Math.abs(avgSentiment) * 2 +
      tweets.length / 25 +
      (tweets.length >= minTweets && Math.abs(avgSentiment) > 0.2 ? 0.08 : 0),
  );
  const confidence = Math.round(Math.min(100, strength * 70));

  let isContrarian = false;
  let contrarianNote: string | undefined;
  if (avgSentiment >= CONTRARIAN_THRESHOLD) {
    isContrarian = true;
    contrarianNote = "Extreme bullish sentiment — contrarian warning: historically extreme greed can precede pullbacks.";
  } else if (avgSentiment <= -CONTRARIAN_THRESHOLD) {
    isContrarian = true;
    contrarianNote = "Extreme bearish sentiment — contrarian note: extreme fear can signal potential bottoms.";
  }

  return {
    sentiment,
    confidence,
    hasHighRiskEvent: hasRisk,
    updatedAt: now,
    isContrarian: isContrarian || undefined,
    contrarianNote,
  };
}
