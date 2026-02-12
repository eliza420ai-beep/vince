/**
 * X Account Action
 * 
 * Analyze a Twitter/X account.
 * "Tell me about @crediblecrypto"
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
} from '@elizaos/core';
import { getXAccountsService } from '../services/xAccounts.service';
import { initXClientFromEnv, getXClient } from '../services/xClient.service';

export const xAccountAction: Action = {
  name: 'X_ACCOUNT',
  description: 'Analyze a Twitter/X account - their influence tier, recent takes, topic focus, and sentiment bias.',
  
  similes: [
    'ANALYZE_ACCOUNT',
    'WHO_IS',
    'ACCOUNT_INFO',
  ],

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: "Who is @crediblecrypto?" },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "👤 **@crediblecrypto**\n\n**Tier:** 🐋 Whale\n**Reason:** 285K followers, market-moving influence\n\n**Stats:**\n• Followers: 285K\n• Avg Likes: 1.2k\n• Engagement: 0.42%\n\n**Focus:** BTC, trading, macro\n**Bias:** Bullish (historically)\n**Reliability:** 80/100\n\n**Recent Takes:**\n• Supply shock thesis for BTC\n• ETF flows analysis\n• Caution on altseason timing",
          action: 'X_ACCOUNT',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: { text: "Tell me about @DegenSpartan on X" },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "👤 **@DegenSpartan**\n\n**Tier:** 🎯 Alpha\n**Reason:** High engagement (890 avg likes), quality insights\n\n**Stats:**\n• Followers: 142K\n• Avg Likes: 890\n• Engagement: 0.63%\n\n**Focus:** DeFi, trading, memes\n**Bias:** Neutral (balanced takes)\n**Reliability:** 75/100\n\n**Recent Takes:**\n• Points meta critique\n• DeFi yield compression\n• \"Mid-curve trap\" warning",
          action: 'X_ACCOUNT',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text ?? '';
    
    // Check for @username pattern or account-related question
    const hasUsername = /@\w+/.test(text);
    const hasAccountQuery = /who is|tell me about|analyze|account|profile/i.test(text);
    
    return hasUsername && hasAccountQuery;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    try {
      initXClientFromEnv();

      const text = message.content?.text ?? '';
      
      // Extract username
      const usernameMatch = text.match(/@(\w+)/);
      
      if (!usernameMatch) {
        callback({
          text: "I need a username to analyze. Example: `Who is @crediblecrypto?`",
          action: 'X_ACCOUNT',
        });
        return true;
      }

      const username = usernameMatch[1];
      const accountsService = getXAccountsService();

      // Analyze the account
      const analysis = await accountsService.analyzeAccount(username);

      if (!analysis) {
        callback({
          text: `Couldn't find or analyze @${username}. The account might not exist or be protected.`,
          action: 'X_ACCOUNT',
        });
        return true;
      }

      // Get recent takes
      const recentTweets = await accountsService.getRecentTakes(username, 5);

      // Build response
      const tierEmoji = getTierEmoji(analysis.tier);
      
      let response = `👤 **@${analysis.username}**\n\n`;
      response += `**Tier:** ${tierEmoji} ${capitalize(analysis.tier)}\n`;
      response += `**Reason:** ${analysis.tierReason}\n\n`;

      response += `**Stats:**\n`;
      response += `• Followers: ${formatNumber(analysis.metrics.followers)}\n`;
      response += `• Avg Likes: ${formatNumber(analysis.metrics.avgLikes)}\n`;
      response += `• Engagement: ${analysis.metrics.engagementRate}%\n\n`;

      if (analysis.topicFocus.length > 0) {
        response += `**Focus:** ${analysis.topicFocus.join(', ')}\n`;
      }
      
      response += `**Bias:** ${capitalize(analysis.sentimentBias)}\n`;
      response += `**Reliability:** ${analysis.reliability}/100\n`;

      // Recent takes summary
      if (recentTweets.length > 0) {
        response += `\n**Recent Takes:**\n`;
        for (const tweet of recentTweets.slice(0, 3)) {
          const shortText = tweet.text.slice(0, 60).replace(/\n/g, ' ');
          response += `• ${shortText}${tweet.text.length > 60 ? '...' : ''}\n`;
        }
      }

      // Find similar accounts
      const similar = await accountsService.findSimilarAccounts(username);
      if (similar.length > 0) {
        response += `\n**Similar:** ${similar.slice(0, 3).map(s => `@${s}`).join(', ')}`;
      }

      callback({
        text: response,
        action: 'X_ACCOUNT',
      });

      return true;
    } catch (error) {
      console.error('[X_ACCOUNT] Error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callback({
        text: `👤 **Account Analysis**\n\n❌ Error: ${errorMessage}`,
        action: 'X_ACCOUNT',
      });
      
      return false;
    }
  },
};

function getTierEmoji(tier: string): string {
  switch (tier) {
    case 'whale': return '🐋';
    case 'alpha': return '🎯';
    case 'quality': return '✨';
    case 'verified': return '✓';
    default: return '👤';
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export default xAccountAction;
