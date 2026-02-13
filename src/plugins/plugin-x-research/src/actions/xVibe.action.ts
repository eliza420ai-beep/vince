/**
 * X Vibe Action
 * 
 * Quick sentiment check for a single topic.
 * "What's the vibe on ETH right now?"
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
import { TOPIC_BY_ID, ALL_TOPICS } from '../constants/topics';
import { formatCostFooter } from '../constants/cost';
import { setLastResearch } from '../store/lastResearchStore';
import { getMandoContextForX } from '../utils/mandoContext';

export const xVibeAction: Action = {
  name: 'X_VIBE',
  description: 'Quick sentiment check for a specific crypto topic on X/Twitter. Use when asked about sentiment for a specific coin or topic.',
  
  similes: [
    'QUICK_SENTIMENT',
    'TOPIC_VIBE',
    'CT_SENTIMENT',
  ],

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: "What's the vibe on ETH?" },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "📊 **ETH Vibe Check**\n\n📉 Bearish (-28) | 65% confidence\n\n**Breakdown:**\n• Bullish: 23 tweets\n• Bearish: 47 tweets\n• Neutral: 30 tweets\n\n**Whale alignment:** +12 (whales slightly more bullish than retail)\n\nMain topics: L2 fees, gas costs, ETH/BTC ratio weakness\n\n_Based on 100 tweets from the last 24h_",
          action: 'X_VIBE',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: { text: "SOL sentiment check" },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "📊 **SOL Vibe Check**\n\n📈 Bullish (+52) | 72% confidence\n\n**Breakdown:**\n• Bullish: 68 tweets\n• Bearish: 18 tweets\n• Neutral: 14 tweets\n\n**Whale alignment:** +48 (whales agree)\n\nMeme season narrative still strong. Pump.fun activity high.\n\n_Based on 100 tweets from the last 24h_",
          action: 'X_VIBE',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() ?? '';
    
    // Check for vibe/sentiment + topic pattern
    const vibeTerms = ['vibe', 'sentiment', 'feeling', 'mood'];
    const hasVibeTerm = vibeTerms.some(t => text.includes(t));
    
    // Check for any topic mention
    const hasTopic = ALL_TOPICS.some(topic => 
      topic.searchTerms.some(term => text.includes(term.toLowerCase())) ||
      topic.hashtags.some(tag => text.includes(tag.toLowerCase()))
    );

    return hasVibeTerm && hasTopic;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    try {
      initXClientFromEnv(runtime);

      const text = message.content?.text?.toLowerCase() ?? '';
      
      // Detect which topic
      let detectedTopic: typeof ALL_TOPICS[0] | null = null;
      
      for (const topic of ALL_TOPICS) {
        const matches = topic.searchTerms.some(term => 
          text.includes(term.toLowerCase())
        ) || topic.hashtags.some(tag => text.includes(tag.toLowerCase()));
        
        if (matches) {
          detectedTopic = topic;
          break;
        }
      }

      if (!detectedTopic) {
        callback({
          text: "I couldn't identify the topic. Try asking about BTC, ETH, SOL, or other crypto topics.",
          action: 'X_VIBE',
        });
        return true;
      }

      const searchService = getXSearchService();
      const sentimentService = getXSentimentService();

      const vibeCacheTtlMs = process.env.X_PULSE_CACHE_TTL_MS
        ? parseInt(process.env.X_PULSE_CACHE_TTL_MS, 10)
        : 60 * 60 * 1000; // 1h default, same as pulse

      // Search for the topic
      const tweets = await searchService.searchTopic(detectedTopic.id, {
        maxResults: 100,
        hoursBack: 24,
        cacheTtlMs: vibeCacheTtlMs,
      });

      if (tweets.length === 0) {
        callback({
          text: `📊 **${detectedTopic.name} Vibe Check**\n\nNo recent tweets found. X API might be rate limited.`,
          action: 'X_VIBE',
        });
        return true;
      }

      // Analyze sentiment
      const topicSentiment = sentimentService.getTopicVibe(tweets, detectedTopic.id);

      if (!topicSentiment) {
        callback({
          text: `📊 **${detectedTopic.name} Vibe Check**\n\nNot enough data to determine sentiment.`,
          action: 'X_VIBE',
        });
        return true;
      }

      const mandoContext = await getMandoContextForX(runtime);

      // Build response
      const emoji = topicSentiment.direction === 'bullish' ? '📈' :
                    topicSentiment.direction === 'bearish' ? '📉' :
                    topicSentiment.direction === 'mixed' ? '🔀' : '😐';

      const scoreStr = topicSentiment.weightedScore > 0 
        ? `+${topicSentiment.weightedScore}` 
        : String(topicSentiment.weightedScore);

      let response = `📊 **${detectedTopic.name} Vibe Check**\n\n`;
      if (mandoContext?.vibeCheck) {
        response += `**Today's news:** ${mandoContext.vibeCheck}\n\n`;
        response += `_(Prices: ask VINCE for current levels.)_\n\n`;
      }
      response += `${emoji} ${capitalize(topicSentiment.direction)} (${scoreStr}) | ${topicSentiment.confidence}% confidence\n\n`;

      response += `**Breakdown:**\n`;
      response += `• Bullish: ${topicSentiment.breakdown.bullishCount} tweets\n`;
      response += `• Bearish: ${topicSentiment.breakdown.bearishCount} tweets\n`;
      response += `• Neutral: ${topicSentiment.breakdown.neutralCount} tweets\n\n`;

      if (topicSentiment.whaleAlignment !== 0) {
        const whaleEmoji = topicSentiment.whaleAlignment > 0 ? '🐋📈' : '🐋📉';
        response += `**Whale alignment:** ${topicSentiment.whaleAlignment > 0 ? '+' : ''}${topicSentiment.whaleAlignment} ${whaleEmoji}\n\n`;
      }

      if (topicSentiment.isContrarian && topicSentiment.contrarianNote) {
        response += `${topicSentiment.contrarianNote}\n\n`;
      }

      response += `_Based on ${tweets.length} tweets from the last 24h_`;

      // Optional: append LLM-generated themes and takeaway (X_PULSE_LLM_NARRATIVE=true)
      if (process.env.X_PULSE_LLM_NARRATIVE === 'true') {
        try {
          const narrativePrompt = `You are summarizing Crypto Twitter sentiment for a trader. Given this vibe check, add 2-3 short sentences only: first "**Themes:**" (main themes in one line), then "**Takeaway:**" (one actionable takeaway). Do not repeat the data above. Output only the two lines, no preamble.\n\nSummary:\n${response}`;
          const raw = await runtime.useModel(ModelType.TEXT_SMALL, { prompt: narrativePrompt });
          const narrative = typeof raw === 'string' ? raw : (raw as { text?: string })?.text ?? String(raw);
          const trimmed = narrative.trim();
          if (trimmed.length > 0) {
            response += `\n\n${trimmed}`;
          }
        } catch {
          // Skip narrative on LLM failure
        }
      }

      if (process.env.X_RESEARCH_SHOW_COST === 'true') {
        response += `\n\n${formatCostFooter(tweets.length)}`;
      }

      if (message.roomId) setLastResearch(message.roomId, response);
      callback({
        text: response,
        action: 'X_VIBE',
      });

      return true;
    } catch (error) {
      console.error('[X_VIBE] Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callback({
        text: `📊 **Vibe Check**\n\n❌ Error: ${errorMessage}`,
        action: 'X_VIBE',
      });
      
      return false;
    }
  },
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default xVibeAction;
