/**
 * X Pulse Action — The North Star
 * 
 * ALOHA-style briefing on CT sentiment and alpha.
 * "What's the vibe on X today?"
 * 
 * Returns:
 * - Overall sentiment with confidence
 * - Per-topic breakdown (BTC, ETH, SOL, etc.)
 * - Top threads worth reading
 * - Breaking content (high velocity)
 * - Contrarian warnings
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
} from '@elizaos/core';
import { getXSearchService } from '../services/xSearch.service';
import { getXSentimentService } from '../services/xSentiment.service';
import { initXClientFromEnv } from '../services/xClient.service';
import type { XPulseResult, XThreadSummary, XBreakingContent } from '../types/analysis.types';
import type { XTweet } from '../types/tweet.types';
import { ALL_TOPICS, FOCUS_TICKERS } from '../constants/topics';
import { formatCostFooter } from '../constants/cost';
import { setLastResearch } from '../store/lastResearchStore';
import { getMandoContextForX } from '../utils/mandoContext';

const BREAKING_VELOCITY_THRESHOLD = 100; // 100+ likes/hour = breaking

export const xPulseAction: Action = {
  name: 'X_PULSE',
  description: 'Get an ALOHA-style briefing on X/Twitter sentiment and alpha for crypto topics. Use when asked about "what\'s CT saying", "X vibe", "twitter sentiment", "crypto twitter", etc.',
  
  similes: [
    'X_VIBE',
    'TWITTER_SENTIMENT',
    'CT_PULSE',
    'CRYPTO_TWITTER',
    'WHATS_CT_SAYING',
  ],

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: "What's CT saying about BTC today?" },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "📊 **X Pulse** | BTC\n\n📈 Overall: Bullish (+42)\n\nCT is cautiously optimistic today. ETF inflows continue to dominate the conversation — @CryptoHayes posted a thread on the \"supply shock\" thesis that's getting serious traction (2.3k likes in 2 hours).\n\n**Top Thread:**\n🧵 @crediblecrypto on why this rally is different (technical breakdown)\n\n**Breaking:**\n🔥 @lookonchain flagged a large BTC transfer to Coinbase — could be profit-taking\n\n**Whale alignment:** +38 (whales agree with retail)\n\nNo contrarian warnings — sentiment is elevated but not extreme.",
          action: 'X_PULSE',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: { text: "Give me the X vibe check" },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "📊 **X Pulse**\n\n😐 Overall: Neutral (-5)\n\nMixed signals today. BTC 📈 slightly bullish, ETH 📉 facing L2 fee complaints, SOL 🔀 meme season fatigue.\n\n**Key Threads:**\n• @Tetranode on DeFi yields post-points meta\n• @DegenSpartan calling this a \"mid-curve trap\"\n\n**Volume Spike:**\n⚡ 3x normal volume on \"SEC\" — likely Gensler news\n\n**⚠️ Warning:**\nExtreme bearish sentiment on regulatory topics (-72). Historically, peak fear = buying opportunity.",
          action: 'X_PULSE',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() ?? '';
    
    const triggers = [
      'x pulse', 'x vibe', 'ct saying', 'ct saying today', 'what\'s ct saying',
      'crypto twitter', 'twitter sentiment', 'what\'s x saying', 'what is x saying',
      'x sentiment', 'ct vibe', 'twitter vibe', 'pulse check', 'vibe check x', 'x check',
      'quick pulse', 'fast vibe', 'quality pulse', 'curated vibe', 'whale take',
    ];

    return triggers.some(t => text.includes(t));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    try {
      // Initialize client
      initXClientFromEnv(runtime);
      
      const searchService = getXSearchService();
      const sentimentService = getXSentimentService();

      const text = (message.content?.text ?? '').toLowerCase();
      const quick = process.env.X_PULSE_QUICK === 'true' || /quick|fast/.test(text);
      const qualityOnly = process.env.X_PULSE_QUALITY === 'true' || /quality|curated|whale take/.test(text);

      const pulseCacheTtlMs = process.env.X_PULSE_CACHE_TTL_MS
        ? parseInt(process.env.X_PULSE_CACHE_TTL_MS, 10)
        : 60 * 60 * 1000; // 1h default

      const mandoContext = await getMandoContextForX(runtime);

      const highPriorityTopicIds = ALL_TOPICS.filter(t => t.priority === 'high').map(t => t.id);
      const requestedTopicIds = quick ? highPriorityTopicIds.slice(0, 2) : highPriorityTopicIds;

      // Search high-priority topics (quick = fewer topics + results)
      const topicResults = await searchService.searchMultipleTopics({
        topicsIds: requestedTopicIds,
        maxResultsPerTopic: quick ? 10 : 50,
        quick,
        cacheTtlMs: pulseCacheTtlMs,
      });

      const emptyTopics = requestedTopicIds.filter((id) => (topicResults.get(id)?.length ?? 0) === 0);

      // Flatten all tweets; optionally filter to quality accounts only
      let allTweets = Array.from(topicResults.values()).flat();
      if (qualityOnly && allTweets.length > 0) {
        allTweets = allTweets.filter(
          t => t.computed?.qualityTier && t.computed.qualityTier !== 'standard'
        );
      }

      if (allTweets.length === 0) {
        const noDataMsg = qualityOnly
          ? "📊 **X Pulse**\n\nNo recent tweets from quality/whale accounts in this window. Try full pulse or a different time."
          : "📊 **X Pulse**\n\nNo recent data available. X API might be rate limited or no matching content found.";
        callback({ text: noDataMsg, action: 'X_PULSE' });
        return true;
      }

      // Analyze sentiment
      const sentiment = sentimentService.analyzeSentiment(allTweets);

      // Find threads
      const threads = findThreads(allTweets).slice(0, 3);

      // Find breaking content
      const breaking = findBreakingContent(allTweets).slice(0, 3);

      // Check for volume spikes
      const spikes = await searchService.detectVolumeSpikes();

      // Generate the briefing
      let briefing = await generateBriefing(runtime, {
        sentiment,
        threads,
        breaking,
        spikes,
        sampleSize: allTweets.length,
        quick,
        qualityOnly,
        mandoContext,
        emptyTopics: emptyTopics.length > 0 ? emptyTopics : undefined,
      });

      if (process.env.X_RESEARCH_SHOW_COST === 'true') {
        briefing += `\n\n${formatCostFooter(allTweets.length)}`;
      }

      if (message.roomId) setLastResearch(message.roomId, briefing);
      callback({
        text: briefing,
        action: 'X_PULSE',
      });

      return true;
    } catch (error) {
      console.error('[X_PULSE] Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('X_BEARER_TOKEN')) {
        callback({
          text: "📊 **X Pulse**\n\n⚠️ X API not configured. Set `X_BEARER_TOKEN` environment variable to enable X research.",
          action: 'X_PULSE',
        });
      } else {
        callback({
          text: `📊 **X Pulse**\n\n❌ Error fetching X data: ${errorMessage}`,
          action: 'X_PULSE',
        });
      }
      
      return false;
    }
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function findThreads(tweets: XTweet[]): XThreadSummary[] {
  return tweets
    .filter(t => t.computed?.isThread && t.metrics)
    .map(t => ({
      id: t.id,
      author: {
        username: t.author?.username ?? 'unknown',
        name: t.author?.name ?? 'Unknown',
        tier: t.computed?.qualityTier ?? 'standard',
      },
      topic: 'crypto', // TODO: detect topic
      hook: t.text.slice(0, 280),
      tweetCount: 1, // TODO: fetch thread length
      engagement: {
        likes: t.metrics!.likeCount,
        retweets: t.metrics!.retweetCount,
        replies: t.metrics!.replyCount,
      },
      velocity: t.computed?.velocity ?? 0,
      url: `https://x.com/${t.author?.username}/status/${t.id}`,
    }))
    .sort((a, b) => b.velocity - a.velocity);
}

function findBreakingContent(tweets: XTweet[]): XBreakingContent[] {
  return tweets
    .filter(t => (t.computed?.velocity ?? 0) >= BREAKING_VELOCITY_THRESHOLD)
    .map(t => ({
      tweet: t,
      reason: `${Math.round(t.computed?.velocity ?? 0)} likes/hour`,
      velocity: t.computed?.velocity ?? 0,
      topic: 'crypto',
      urgency: (t.computed?.velocity ?? 0) > 500 ? 'high' : 
               (t.computed?.velocity ?? 0) > 200 ? 'medium' : 'low',
    }))
    .sort((a, b) => b.velocity - a.velocity);
}

async function generateBriefing(
  runtime: IAgentRuntime,
  data: {
    sentiment: ReturnType<typeof getXSentimentService extends () => infer S ? S extends { analyzeSentiment: (...args: any[]) => infer R } ? R : never : never>;
    threads: XThreadSummary[];
    breaking: XBreakingContent[];
    spikes: Array<{ topic: string; spikeMultiple: number }>;
    sampleSize: number;
    quick?: boolean;
    qualityOnly?: boolean;
    mandoContext?: { vibeCheck: string; headlines: string[] } | null;
    emptyTopics?: string[];
  }
): Promise<string> {
  const { sentiment, threads, breaking, spikes, sampleSize, quick, qualityOnly, mandoContext, emptyTopics } = data;

  // Build structured output
  let output = `📊 **X Pulse**\n\n`;
  if (quick) output += `_Quick pulse — fewer posts._\n\n`;
  if (qualityOnly) output += `_Quality/curated mode — whale & alpha accounts only._\n\n`;

  if (mandoContext?.vibeCheck) {
    output += `**Today's news:** ${mandoContext.vibeCheck}\n\n`;
    if (mandoContext.headlines?.length > 0) {
      const topHeadlines = mandoContext.headlines.slice(0, 5).map((h) => (h.length > 60 ? h.slice(0, 57) + '...' : h));
      output += topHeadlines.map((h) => `• ${h}`).join('\n') + '\n\n';
    }
    output += `_(Prices: ask VINCE for current levels.)_\n\n`;
  }

  // Overall sentiment
  const emoji = sentiment.overallSentiment === 'bullish' ? '📈' :
                sentiment.overallSentiment === 'bearish' ? '📉' :
                sentiment.overallSentiment === 'mixed' ? '🔀' : '😐';
  
  const scoreStr = sentiment.overallScore > 0 ? `+${sentiment.overallScore}` : String(sentiment.overallScore);
  output += `${emoji} **Overall:** ${capitalize(sentiment.overallSentiment)} (${scoreStr}) | ${sentiment.overallConfidence}% confidence\n\n`;

  // Topic breakdown
  const topTopics = Object.entries(sentiment.byTopic)
    .sort((a, b) => b[1].breakdown.totalAnalyzed - a[1].breakdown.totalAnalyzed)
    .slice(0, 4);

  if (topTopics.length > 0) {
    output += `**By Topic:**\n`;
    for (const [topicId, topicSentiment] of topTopics) {
      const tEmoji = topicSentiment.direction === 'bullish' ? '📈' :
                     topicSentiment.direction === 'bearish' ? '📉' : '😐';
      const tScore = topicSentiment.weightedScore > 0 ? `+${topicSentiment.weightedScore}` : String(topicSentiment.weightedScore);
      output += `• ${topicId.toUpperCase()} ${tEmoji} ${tScore}`;
      if (topicSentiment.whaleAlignment !== 0) {
        output += ` (whales: ${topicSentiment.whaleAlignment > 0 ? '+' : ''}${topicSentiment.whaleAlignment})`;
      }
      output += `\n`;
    }
    output += `\n`;
  }

  // Threads
  if (threads.length > 0) {
    output += `**Top Threads:**\n`;
    for (const thread of threads.slice(0, 2)) {
      output += `🧵 @${thread.author.username}: ${thread.hook.slice(0, 100)}...\n`;
      output += `   ${thread.engagement.likes} likes | ${thread.url}\n`;
    }
    output += `\n`;
  }

  // Breaking content
  if (breaking.length > 0) {
    output += `**🔥 Breaking:**\n`;
    for (const item of breaking.slice(0, 2)) {
      output += `• @${item.tweet.author?.username}: ${item.tweet.text.slice(0, 100)}...\n`;
      output += `  (${item.reason})\n`;
    }
    output += `\n`;
  }

  // Volume spikes (only show spikes with valid finite positive multiple)
  const validSpikes = spikes.filter(
    (s) => Number.isFinite(s.spikeMultiple) && s.spikeMultiple > 0
  );
  if (validSpikes.length > 0) {
    output += `**⚡ Volume Spikes:**\n`;
    for (const spike of validSpikes.slice(0, 2)) {
      output += `• ${spike.topic}: ${spike.spikeMultiple}x normal volume\n`;
    }
    output += `\n`;
  }

  // Warnings
  if (sentiment.warnings.length > 0) {
    output += `${sentiment.warnings.join('\n')}\n\n`;
  }

  if (emptyTopics && emptyTopics.length > 0) {
    output += `_Some topics temporarily unavailable: ${emptyTopics.join(', ')}._\n\n`;
  }

  output += `_Based on ${sampleSize} posts from the last 24h_`;

  // Optional: append LLM-generated themes and takeaway (X_PULSE_LLM_NARRATIVE=true)
  if (process.env.X_PULSE_LLM_NARRATIVE === 'true') {
    try {
      const narrativePrompt = `You are summarizing Crypto Twitter sentiment for a trader. Given this CT pulse summary, add 2-3 short sentences only: first "**Themes:**" (main themes in one line), then "**Takeaway:**" (one actionable takeaway). Do not repeat the data above. Output only the two lines, no preamble.\n\nSummary:\n${output}`;
      const raw = await runtime.useModel(ModelType.TEXT_SMALL, { prompt: narrativePrompt });
      const narrative = typeof raw === 'string' ? raw : (raw as { text?: string })?.text ?? String(raw);
      const trimmed = narrative.trim();
      if (trimmed.length > 0) {
        output += `\n\n${trimmed}`;
      }
    } catch {
      // Skip narrative on LLM failure; template output is still useful
    }
  }

  return output;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default xPulseAction;
