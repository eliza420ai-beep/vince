/**
 * X News Action
 * 
 * Get crypto news from X's News API.
 * "What's the crypto news on X?"
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
} from '@elizaos/core';
import { getXNewsService } from '../services/xNews.service';
import { getXSearchService } from '../services/xSearch.service';
import { initXClientFromEnv } from '../services/xClient.service';
import { getMandoContextForX } from '../utils/mandoContext';
import { ALL_TOPICS } from '../constants/topics';
import { setLastResearch } from '../store/lastResearchStore';

export const xNewsAction: Action = {
  name: 'X_NEWS',
  description: 'Get crypto news from X/Twitter News API. Grok-generated summaries with relevance scoring.',
  
  similes: [
    'CRYPTO_NEWS',
    'X_HEADLINES',
    'CT_NEWS',
  ],

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: "What's the crypto news on X?" },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "📰 **X News | Crypto**\n\n🔴 **HIGH IMPACT**\n\n1. **BTC ETF Sees Record $1.2B Inflows**\n   📈 Bullish | Relevance: 95\n   BlackRock's IBIT leads with $800M. Grayscale outflows slowing.\n\n2. **SEC Delays ETH ETF Decision**\n   😐 Neutral | Relevance: 88\n   Extended to May. Market expected this.\n\n🟡 **MEDIUM IMPACT**\n\n3. **Solana DEX Volume Hits ATH**\n   📈 Bullish | Relevance: 72\n   Pump.fun and Jupiter driving activity.\n\n4. **Hyperliquid Announces Token Launch**\n   📈 Bullish | Relevance: 85\n   $HYPE airdrop details coming.\n\n_Powered by X News API_",
          action: 'X_NEWS',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() ?? '';
    
    const triggers = [
      'x news', 'crypto news', 'news on x', 'twitter news',
      'ct news', 'headlines', 'what\'s happening', 'whats happening',
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
      initXClientFromEnv(runtime);

      const newsService = getXNewsService();

      // Get top crypto news
      const news = await newsService.getDailyTopNews();

      if (news.length === 0) {
        const fallback = await buildNewsFallback(runtime);
        if (fallback) {
          if (message.roomId) setLastResearch(message.roomId, fallback);
          callback({ text: fallback, action: 'X_NEWS' });
          return true;
        }
        callback({
          text: "📰 **X News**\n\nNo crypto news found. The News API might not have recent stories or is rate limited.",
          action: 'X_NEWS',
        });
        return true;
      }

      // Group by impact level
      const highImpact = news.filter(n => n.impactLevel === 'high');
      const mediumImpact = news.filter(n => n.impactLevel === 'medium');
      const lowImpact = news.filter(n => n.impactLevel === 'low');

      // Build response
      let response = `📰 **X News | Crypto**\n\n`;

      if (highImpact.length > 0) {
        response += `🔴 **HIGH IMPACT**\n\n`;
        for (const item of highImpact.slice(0, 3)) {
          response += formatNewsItem(item);
        }
      }

      if (mediumImpact.length > 0) {
        response += `🟡 **MEDIUM IMPACT**\n\n`;
        for (const item of mediumImpact.slice(0, 3)) {
          response += formatNewsItem(item);
        }
      }

      if (lowImpact.length > 0 && highImpact.length + mediumImpact.length < 4) {
        response += `🟢 **OTHER**\n\n`;
        for (const item of lowImpact.slice(0, 2)) {
          response += formatNewsItem(item);
        }
      }

      response += `\n_Powered by X News API_`;

      if (message.roomId) setLastResearch(message.roomId, response);
      callback({
        text: response,
        action: 'X_NEWS',
      });

      return true;
    } catch (error) {
      console.error('[X_NEWS] Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNewsApiUnavailable =
        errorMessage.includes('404') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('News API');

      const fallback = await buildNewsFallback(runtime);
      if (fallback) {
        callback({ text: fallback, action: 'X_NEWS' });
        return true;
      }

      if (isNewsApiUnavailable) {
        callback({
          text: "📰 **X News**\n\n⚠️ X News API is not available. This endpoint may require specific API access or isn't enabled for your account.",
          action: 'X_NEWS',
        });
      } else {
        callback({
          text: `📰 **X News**\n\n❌ Error: ${errorMessage}`,
          action: 'X_NEWS',
        });
      }

      return false;
    }
  },
};

function formatNewsItem(item: { 
  name: string; 
  summary: string; 
  sentiment: string; 
  relevanceScore: number;
  contexts?: { finance?: { tickers: string[] } };
}): string {
  const sentimentEmoji = item.sentiment === 'bullish' ? '📈' :
                         item.sentiment === 'bearish' ? '📉' : '😐';
  
  const tickers = item.contexts?.finance?.tickers ?? [];
  const tickerStr = tickers.length > 0 ? ` [${tickers.slice(0, 3).join(', ')}]` : '';

  let output = `**${item.name}**${tickerStr}\n`;
  output += `${sentimentEmoji} ${capitalize(item.sentiment)} | Relevance: ${item.relevanceScore}\n`;
  output += `${item.summary.slice(0, 150)}${item.summary.length > 150 ? '...' : ''}\n\n`;

  return output;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Fallback when X News API is unavailable: use Mando headlines or pulse-derived "headlines from CT".
 */
async function buildNewsFallback(runtime: IAgentRuntime): Promise<string | null> {
  const mando = await getMandoContextForX(runtime);
  if (mando?.headlines?.length) {
    let out = '📰 **CT Headlines**\n\n';
    out += `**Today's news:** ${mando.vibeCheck}\n\n`;
    out += mando.headlines.slice(0, 7).map((h) => `• ${h.length > 70 ? h.slice(0, 67) + '...' : h}`).join('\n');
    out += '\n\n_Headlines from MandoMinutes (X News API unavailable)_';
    return out;
  }

  try {
    initXClientFromEnv(runtime);
    const searchService = getXSearchService();
    const topicIds = ALL_TOPICS.filter((t) => t.priority === 'high').map((t) => t.id).slice(0, 2);
    const results = await searchService.searchMultipleTopics({
      topicsIds: topicIds,
      maxResultsPerTopic: 10,
      quick: true,
      cacheTtlMs: 60 * 60 * 1000,
    });
    const tweets = Array.from(results.values()).flat();
    if (tweets.length === 0) return null;

    const sorted = [...tweets].sort((a, b) => (b.metrics?.likeCount ?? 0) - (a.metrics?.likeCount ?? 0));
    const top = sorted.slice(0, 7);
    let out = '📰 **Headlines from CT**\n\n';
    for (const t of top) {
      const author = t.author?.username ?? 'unknown';
      const text = t.text.replace(/\n/g, ' ').slice(0, 80);
      out += `• @${author}: ${text}${t.text.length > 80 ? '...' : ''}\n`;
    }
    out += '\n_Based on recent high-engagement tweets (X News API unavailable)_';
    return out;
  } catch {
    return null;
  }
}

export default xNewsAction;
