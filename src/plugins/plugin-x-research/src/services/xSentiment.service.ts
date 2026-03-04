/**
 * X Sentiment Service
 *
 * Trading-focused sentiment analysis:
 * - Keyword-based scoring with weights
 * - Account tier weighting (whales count more)
 * - Contrarian detection (extreme sentiment = warning)
 * - Temporal trends
 */

import type { XTweet, AccountTier } from "../types/tweet.types";
import type {
  SentimentResult,
  TopicSentiment,
  SentimentDirection,
  SENTIMENT_TIERS,
} from "../types/sentiment.types";
import { KEYWORD_MAP, ALL_KEYWORDS } from "../constants/sentimentKeywords";
import {
  getAccountTier,
  getAccountReliability,
} from "../constants/qualityAccounts";
import { ALL_TOPICS, TOPIC_BY_ID } from "../constants/topics";
import { loadWatchlistUsernames } from "../utils/watchlist";
import { XSourceQualityService } from "./xSourceQuality.service";
import { SourceReputationService } from "./sourceReputation.service";

export interface SentimentOptions {
  topics?: string[]; // Filter to specific topics
  weightByTier?: boolean; // Weight by account tier (default: true)
  detectContrarian?: boolean; // Flag extreme sentiment (default: true)
}

interface TweetSentimentScore {
  tweet: XTweet;
  score: number; // -100 to +100
  matchedKeywords: string[];
  tier: AccountTier;
  tierWeight: number;
  reliability: number;
  freshnessScore: number; // 0-100
  sourceMultiplier: number;
}

/**
 * X Sentiment Service
 */
export class XSentimentService {
  private sourceQuality = new XSourceQualityService();
  private sourceReputation = new SourceReputationService();

  /**
   * Analyze sentiment from a batch of tweets
   */
  analyzeSentiment(
    tweets: XTweet[],
    options: SentimentOptions = {},
  ): SentimentResult {
    const {
      topics = ALL_TOPICS.map((t) => t.id),
      weightByTier = true,
      detectContrarian = true,
    } = options;

    if (tweets.length === 0) {
      return this.emptyResult();
    }

    // Watchlist = "people we care about" (e.g. who we follow); weight them as alpha in sentiment
    const watchlistUsernames = weightByTier ? loadWatchlistUsernames() : [];

    // Score each tweet
    const scores = tweets.map((tweet) =>
      this.scoreTweet(tweet, weightByTier, watchlistUsernames),
    );

    // Aggregate by topic
    const byTopic: Record<string, TopicSentiment> = {};

    for (const topicId of topics) {
      const topic = TOPIC_BY_ID[topicId];
      if (!topic) continue;

      // Filter tweets relevant to this topic
      const topicTweets = scores.filter((s) =>
        this.isRelevantToTopic(s.tweet, topic),
      );

      if (topicTweets.length > 0) {
        byTopic[topicId] = this.calculateTopicSentiment(
          topicId,
          topicTweets,
          detectContrarian,
        );
      }
    }

    // Calculate overall sentiment
    const allScores = scores.map((s) => s.score * s.tierWeight);
    const totalWeight = scores.reduce((sum, s) => sum + s.tierWeight, 0);
    const overallScore =
      totalWeight > 0 ? allScores.reduce((a, b) => a + b, 0) / totalWeight : 0;

    const overallSentiment = this.scoreToDirection(overallScore);
    const overallConfidence = this.calculateConfidence(scores);

    // Generate warnings
    const warnings: string[] = [];
    if (detectContrarian) {
      for (const [topicId, sentiment] of Object.entries(byTopic)) {
        if (sentiment.isContrarian && sentiment.contrarianNote) {
          warnings.push(sentiment.contrarianNote);
        }
      }
    }

    // Generate summary
    const summary = this.generateSummary(
      overallSentiment,
      overallScore,
      byTopic,
      warnings,
    );

    return {
      overallSentiment,
      overallConfidence,
      overallScore: Math.round(overallScore),
      byTopic,
      summary,
      warnings,
      timestamp: Date.now(),
      sampleSize: tweets.length,
    };
  }

  /**
   * Quick vibe check for a single topic
   */
  getTopicVibe(tweets: XTweet[], topicId: string): TopicSentiment | null {
    const topic = TOPIC_BY_ID[topicId];
    if (!topic) return null;

    const watchlistUsernames = loadWatchlistUsernames();
    const scores = tweets
      .filter((t) => this.isRelevantToTopic(t, topic))
      .map((t) => this.scoreTweet(t, true, watchlistUsernames));

    if (scores.length === 0) return null;

    return this.calculateTopicSentiment(topicId, scores, true);
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Scoring
  // ─────────────────────────────────────────────────────────────

  private scoreTweet(
    tweet: XTweet,
    weightByTier: boolean,
    watchlistUsernames: string[] = [],
  ): TweetSentimentScore {
    const text = tweet.text.toLowerCase();
    const matchedKeywords: string[] = [];
    let rawScore = 0;

    // Score based on matched keywords
    for (const keyword of ALL_KEYWORDS) {
      if (this.matchesKeyword(text, keyword.word)) {
        matchedKeywords.push(keyword.word);
        let signedWeight = keyword.weight;
        if (this.hasNegationNear(text, keyword.word)) {
          signedWeight = signedWeight * -0.6;
        }
        rawScore += signedWeight * 100; // Scale to -100 to +100
      }
    }

    // Phrase-level overrides to reduce common CT polarity mistakes.
    if (/\bshort squeeze\b/i.test(text)) rawScore += 22;
    if (/\bbear trap\b/i.test(text)) rawScore += 16;
    if (/\bbull trap\b/i.test(text)) rawScore -= 16;
    if (/\blong squeeze\b/i.test(text)) rawScore -= 22;

    // Spam dampener: repeated keyword-heavy text should not dominate score.
    if (matchedKeywords.length >= 6) {
      rawScore *= 0.8;
    }

    // Normalize score
    const normalizedScore = Math.max(-100, Math.min(100, rawScore));

    // Get account tier (whale/alpha/quality from qualityAccounts, or watchlist = "people we care about" as alpha)
    const username = tweet.author?.username ?? "";
    let tier = getAccountTier(username);
    if (
      tier === "standard" &&
      watchlistUsernames.length > 0 &&
      watchlistUsernames.includes(username.toLowerCase())
    ) {
      tier = "alpha";
    }
    const reliability = getAccountReliability(username);
    const sourceMultiplier = this.getSourceMultiplier(username);
    const tierWeight = weightByTier
      ? this.getTierWeight(tier) * sourceMultiplier
      : 1;

    return {
      tweet,
      score: normalizedScore,
      matchedKeywords,
      tier,
      tierWeight,
      reliability,
      freshnessScore: this.computeFreshnessScore(tweet),
      sourceMultiplier,
    };
  }

  private getTierWeight(tier: AccountTier): number {
    switch (tier) {
      case "whale":
        return 3.0;
      case "alpha":
        return 2.5;
      case "quality":
        return 2.0;
      case "verified":
        return 1.5;
      default:
        return 1.0;
    }
  }

  private calculateTopicSentiment(
    topicId: string,
    scores: TweetSentimentScore[],
    detectContrarian: boolean,
  ): TopicSentiment {
    // Weighted average
    const totalWeight = scores.reduce((sum, s) => sum + s.tierWeight, 0);
    const weightedSum = scores.reduce(
      (sum, s) => sum + s.score * s.tierWeight,
      0,
    );
    const weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Unweighted for comparison
    const rawScore =
      scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    // Breakdown
    const bullishCount = scores.filter((s) => s.score > 20).length;
    const bearishCount = scores.filter((s) => s.score < -20).length;
    const neutralCount = scores.length - bullishCount - bearishCount;

    // Whale alignment (how aligned are whale/alpha accounts)
    const qualityScores = scores.filter(
      (s) => s.tier === "whale" || s.tier === "alpha",
    );
    const whaleAlignment =
      qualityScores.length > 0
        ? qualityScores.reduce((sum, s) => sum + s.score, 0) /
          qualityScores.length
        : 0;

    // Contrarian detection
    let isContrarian = false;
    let contrarianNote: string | undefined;

    if (detectContrarian) {
      if (weightedScore > 70) {
        isContrarian = true;
        contrarianNote = `⚠️ Extreme bullish sentiment on ${TOPIC_BY_ID[topicId]?.name} (${Math.round(weightedScore)}). Contrarian warning: historically, extreme greed precedes pullbacks.`;
      } else if (weightedScore < -70) {
        isContrarian = true;
        contrarianNote = `⚠️ Extreme bearish sentiment on ${TOPIC_BY_ID[topicId]?.name} (${Math.round(weightedScore)}). Contrarian note: extreme fear can signal bottoms.`;
      }
    }

    return {
      topic: topicId,
      direction: this.scoreToDirection(weightedScore),
      confidence: this.calculateConfidence(scores),
      score: Math.round(rawScore),
      breakdown: {
        bullishCount,
        bearishCount,
        neutralCount,
        totalAnalyzed: scores.length,
      },
      weightedScore: Math.round(weightedScore),
      whaleAlignment: Math.round(whaleAlignment),
      trend: "stable", // TODO: implement temporal tracking
      change24h: 0,
      isContrarian,
      contrarianNote,
    };
  }

  private scoreToDirection(score: number): SentimentDirection {
    if (score > 20) return "bullish";
    if (score < -20) return "bearish";
    if (Math.abs(score) < 10) return "neutral";
    return "mixed";
  }

  private calculateConfidence(scores: TweetSentimentScore[]): number {
    if (scores.length === 0) return 0;
    const sampleQuality = Math.min(1, scores.length / 60);

    const avgScore =
      scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
    const variance =
      scores.reduce(
        (sum, score) => sum + Math.pow(score.score - avgScore, 2),
        0,
      ) / scores.length;
    const stdDev = Math.sqrt(variance);
    const agreement = Math.max(0, 1 - stdDev / 80);

    const sourceQuality =
      scores.reduce((sum, score) => {
        const tierNorm = Math.min(1, score.tierWeight / 3);
        const reliabilityNorm = Math.min(
          1,
          Math.max(0, score.reliability / 100),
        );
        return sum + (tierNorm + reliabilityNorm) / 2;
      }, 0) / scores.length;

    const freshness =
      scores.reduce((sum, score) => sum + score.freshnessScore / 100, 0) /
      scores.length;

    const topicPurity =
      scores.filter((score) => score.matchedKeywords.length > 0).length /
      scores.length;

    const anomalyPenalty = this.computeAnomalyPenalty(scores);

    const confidence =
      100 *
        (0.3 * agreement +
          0.25 * sourceQuality +
          0.2 * sampleQuality +
          0.15 * freshness +
          0.1 * topicPurity) -
      anomalyPenalty;

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private isRelevantToTopic(
    tweet: XTweet,
    topic: { searchTerms: string[]; hashtags: string[]; cashtags?: string[] },
  ): boolean {
    const text = tweet.text.toLowerCase();

    // Check search terms
    for (const term of topic.searchTerms) {
      if (this.containsTopicTerm(text, term)) return true;
    }

    // Check hashtags
    if (tweet.entities?.hashtags) {
      for (const ht of tweet.entities.hashtags) {
        if (topic.hashtags.includes(ht.tag.toLowerCase())) return true;
      }
    }

    // Check cashtags
    if (tweet.entities?.cashtags && topic.cashtags) {
      for (const ct of tweet.entities.cashtags) {
        if (topic.cashtags.includes(ct.tag.toUpperCase())) return true;
      }
    }

    return false;
  }

  private generateSummary(
    overall: SentimentDirection,
    score: number,
    byTopic: Record<string, TopicSentiment>,
    warnings: string[],
  ): string {
    const emoji = this.getDirectionEmoji(overall);
    const scorePct = Math.round(score);

    let summary = `${emoji} Overall: ${overall} (${scorePct > 0 ? "+" : ""}${scorePct})`;

    // Add top topic sentiments
    const topicEntries = Object.entries(byTopic)
      .filter(([_, s]) => s.breakdown.totalAnalyzed >= 5)
      .sort(
        (a, b) => Math.abs(b[1].weightedScore) - Math.abs(a[1].weightedScore),
      )
      .slice(0, 3);

    if (topicEntries.length > 0) {
      const topicSummaries = topicEntries.map(([id, s]) => {
        const name = TOPIC_BY_ID[id]?.name ?? id;
        const emoji = this.getDirectionEmoji(s.direction);
        return `${name} ${emoji}`;
      });
      summary += ` | ${topicSummaries.join(", ")}`;
    }

    return summary;
  }

  private getDirectionEmoji(direction: SentimentDirection): string {
    switch (direction) {
      case "bullish":
        return "📈";
      case "bearish":
        return "📉";
      case "neutral":
        return "😐";
      case "mixed":
        return "🔀";
    }
  }

  private emptyResult(): SentimentResult {
    return {
      overallSentiment: "neutral",
      overallConfidence: 0,
      overallScore: 0,
      byTopic: {},
      summary: "No data available",
      warnings: [],
      timestamp: Date.now(),
      sampleSize: 0,
    };
  }

  private containsTopicTerm(text: string, term: string): boolean {
    const normalizedTerm = term.trim().toLowerCase();
    if (!normalizedTerm) return false;
    if (normalizedTerm.includes(" ")) {
      return text.includes(normalizedTerm);
    }
    const escaped = this.escapeRegExp(normalizedTerm);
    return (
      new RegExp(`\\b${escaped}\\b`, "i").test(text) ||
      new RegExp(`#${escaped}\\b`, "i").test(text) ||
      new RegExp(`\\$${escaped}\\b`, "i").test(text)
    );
  }

  private matchesKeyword(text: string, keyword: string): boolean {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return false;
    if (normalizedKeyword.includes(" ")) {
      return text.includes(normalizedKeyword);
    }
    const escaped = this.escapeRegExp(normalizedKeyword);
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  }

  private hasNegationNear(text: string, keyword: string): boolean {
    const escaped = this.escapeRegExp(keyword.trim().toLowerCase());
    return new RegExp(
      `\\b(?:not|no|never|without)\\b(?:\\W+\\w+){0,2}\\W+${escaped}\\b`,
      "i",
    ).test(text);
  }

  private computeFreshnessScore(tweet: XTweet): number {
    if (!tweet.createdAt) return 55;
    const ageMs = Date.now() - new Date(tweet.createdAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs < 0) return 55;
    const ageHours = ageMs / (1000 * 60 * 60);
    return Math.max(15, Math.min(100, Math.round(100 - ageHours * 6)));
  }

  private computeAnomalyPenalty(scores: TweetSentimentScore[]): number {
    const byAuthor = new Map<string, number>();
    for (const score of scores) {
      const key = (score.tweet.author?.username ?? "unknown").toLowerCase();
      byAuthor.set(key, (byAuthor.get(key) ?? 0) + 1);
    }
    const maxShare = Math.max(...Array.from(byAuthor.values())) / scores.length;
    const concentrationPenalty = maxShare > 0.4 ? (maxShare - 0.4) * 35 : 0;
    const lowKeywordPenalty =
      scores.filter((score) => score.matchedKeywords.length === 0).length /
        scores.length >
      0.55
        ? 8
        : 0;
    return concentrationPenalty + lowKeywordPenalty;
  }

  private getSourceMultiplier(username: string): number {
    if (!username?.trim()) return 1.0;
    const qualityMultiplier = this.sourceQuality.getQualityMultiplier(username);
    const reputationMultiplier =
      this.sourceReputation.getReputationMultiplier(username);
    return Math.max(
      0.6,
      Math.min(1.8, qualityMultiplier * reputationMultiplier),
    );
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────

let instance: XSentimentService | null = null;

export function getXSentimentService(): XSentimentService {
  if (!instance) {
    instance = new XSentimentService();
  }
  return instance;
}
