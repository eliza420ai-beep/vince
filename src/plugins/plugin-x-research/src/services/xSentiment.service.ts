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
}

/**
 * X Sentiment Service
 */
export class XSentimentService {
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

    // Score each tweet
    const scores = tweets.map((tweet) => this.scoreTweet(tweet, weightByTier));

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

    const scores = tweets
      .filter((t) => this.isRelevantToTopic(t, topic))
      .map((t) => this.scoreTweet(t, true));

    if (scores.length === 0) return null;

    return this.calculateTopicSentiment(topicId, scores, true);
  }

  // ─────────────────────────────────────────────────────────────
  // Internal: Scoring
  // ─────────────────────────────────────────────────────────────

  private scoreTweet(
    tweet: XTweet,
    weightByTier: boolean,
  ): TweetSentimentScore {
    const text = tweet.text.toLowerCase();
    const matchedKeywords: string[] = [];
    let rawScore = 0;

    // Score based on matched keywords
    for (const keyword of ALL_KEYWORDS) {
      if (text.includes(keyword.word.toLowerCase())) {
        matchedKeywords.push(keyword.word);
        rawScore += keyword.weight * 100; // Scale to -100 to +100
      }
    }

    // Normalize score
    const normalizedScore = Math.max(-100, Math.min(100, rawScore));

    // Get account tier
    const username = tweet.author?.username ?? "";
    const tier = getAccountTier(username);
    const tierWeight = weightByTier ? this.getTierWeight(tier) : 1;

    return {
      tweet,
      score: normalizedScore,
      matchedKeywords,
      tier,
      tierWeight,
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

    // Confidence based on:
    // 1. Sample size (more tweets = more confident)
    // 2. Agreement (less variance = more confident)
    // 3. Quality accounts (more quality = more confident)

    const sampleFactor = Math.min(scores.length / 50, 1) * 40; // Up to 40 points for sample size

    const avgScore =
      scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s.score - avgScore, 2), 0) /
      scores.length;
    const agreementFactor = Math.max(0, 30 - variance / 100); // Up to 30 points for agreement

    const qualityCount = scores.filter((s) => s.tier !== "standard").length;
    const qualityFactor = Math.min(qualityCount / 10, 1) * 30; // Up to 30 points for quality

    return Math.round(sampleFactor + agreementFactor + qualityFactor);
  }

  private isRelevantToTopic(
    tweet: XTweet,
    topic: { searchTerms: string[]; hashtags: string[]; cashtags?: string[] },
  ): boolean {
    const text = tweet.text.toLowerCase();

    // Check search terms
    for (const term of topic.searchTerms) {
      if (text.includes(term.toLowerCase())) return true;
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
