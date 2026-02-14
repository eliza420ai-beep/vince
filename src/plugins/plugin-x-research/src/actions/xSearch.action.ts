/**
 * X Search Action
 *
 * Generic search: "search X for …", "what are people saying about …".
 * Returns ALOHA-style narrative (themes, standout takes) then optional sample posts.
 * Supports optional from:user, sort, limit, quick mode, quality filter.
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
  logger,
} from '@elizaos/core';
import { getXSearchService } from '../services/xSearch.service';
import { initXClientFromEnv } from '../services/xClient.service';
import { formatCostFooter } from '../constants/cost';
import { setLastResearch } from '../store/lastResearchStore';
import { ALOHA_STYLE_RULES, NO_AI_SLOP } from '../utils/alohaStyle';
import type { XTweet } from '../types/tweet.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const QUICK_MAX_RESULTS = 10;
const QUALITY_MIN_LIKES = 10;
const SNIPPET_LEN = 120;
const SAMPLE_POSTS_COUNT = 7;

function formatTweetForContext(t: XTweet): string {
  const author = t.author?.username ?? 'unknown';
  const snippet = t.text.length > SNIPPET_LEN ? t.text.slice(0, SNIPPET_LEN) + '…' : t.text.replace(/\n/g, ' ');
  const likes = t.metrics?.likeCount ?? 0;
  return `@${author}: ${snippet} (${likes} likes)`;
}

async function generateNarrative(
  runtime: IAgentRuntime,
  query: string,
  dataContext: string
): Promise<string | null> {
  const prompt = `You are summarizing X (Twitter) search results for: "${query}". Below are the posts (author, snippet, likes). Turn them into one short narrative.

Here are the posts:

${dataContext}

Write a single narrative (~150-250 words) that:
1. Opens with the overall vibe — what are people saying about this topic? Give your gut take.
2. Weaves in key themes and standout takes. Connect the dots. If something is getting a lot of engagement or one voice stands out, say so.
3. Ends with a clear take — what's the read?

${ALOHA_STYLE_RULES}

${NO_AI_SLOP}

Write the narrative only (no "Here's the summary" wrapper — start with the narrative itself):`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const text = String(response).trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    logger.warn({ err: error }, '[X_SEARCH] LLM narrative failed');
    return null;
  }
}

export const xSearchAction: Action = {
  name: 'X_SEARCH',
  description:
    'Search X/Twitter for an arbitrary query. Use when asked to "search X for …", "what are people saying about …", "find tweets about …". Supports optional from:user and quality filter.',

  similes: ['SEARCH_X', 'SEARCH_TWITTER', 'FIND_TWEETS', 'WHAT_ARE_PEOPLE_SAYING'],

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Search X for BNKR' },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "**X Search: BNKR**\n\n• @user1: BNKR looking strong… (42 likes)\n• @user2: Accumulating here… (28 likes)\n\n_Based on 10 posts from the last 24h_",
          action: 'X_SEARCH',
        },
      },
    ],
    [
      {
        user: '{{user1}}',
        content: { text: 'What are people saying about Opus 4.6?' },
      },
      {
        user: '{{agentName}}',
        content: {
          text: "**X Search: Opus 4.6**\n\n• @dev: Just tried the new model… (120 likes)\n\n_Based on 10 posts from the last 24h_",
          action: 'X_SEARCH',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? '').toLowerCase();
    const triggers = [
      'search x for',
      'search twitter for',
      'what are people saying about',
      'find tweets about',
      'search for',
      'x search',
      'twitter search',
    ];
    return triggers.some((t) => text.includes(t));
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

      const text = (message.content?.text ?? '').trim();
      const quick = /quick|fast|brief/i.test(text);
      const quality = /quality|curated|min.*likes/i.test(text);

      const query = extractQuery(text);
      if (!query) {
        callback({
          text: "I need a search query. Example: \"Search X for BNKR\" or \"What are people saying about ETH?\"",
          action: 'X_SEARCH',
        });
        return true;
      }

      const fromUser = extractFromUser(text);
      const maxResults = quick ? QUICK_MAX_RESULTS : Math.min(DEFAULT_LIMIT + 10, MAX_LIMIT);
      const cacheTtlMs = quick ? 60 * 60 * 1000 : 15 * 60 * 1000;

      const searchService = getXSearchService();
      const tweets = await searchService.searchQuery({
        query,
        from: fromUser,
        sortOrder: 'relevancy',
        maxResults,
        minLikes: quality ? QUALITY_MIN_LIKES : 0,
        hoursBack: 24,
        cacheTtlMs,
      });

      const limit = quick ? Math.min(5, tweets.length) : Math.min(DEFAULT_LIMIT, tweets.length);
      const toShow = tweets.slice(0, limit);

      let response = `**X Search:** ${query}`;
      if (fromUser) response += ` (from @${fromUser})`;
      response += '\n\n';

      if (toShow.length === 0) {
        response += 'No matching posts in the last 24h. Try a broader query or remove the from: filter.';
      } else {
        const dataContext = tweets.map(formatTweetForContext).join('\n');
        const narrative = await generateNarrative(runtime, query, dataContext);

        if (narrative) {
          response += narrative;
          const sampleCount = Math.min(SAMPLE_POSTS_COUNT, toShow.length);
          const samplePosts = toShow.slice(0, sampleCount);
          response += '\n\n**Sample posts:**\n';
          for (const t of samplePosts) {
            const author = t.author?.username ?? 'unknown';
            const snippet = t.text.slice(0, SNIPPET_LEN).replace(/\n/g, ' ');
            const more = t.text.length > SNIPPET_LEN ? '…' : '';
            const likes = t.metrics?.likeCount ?? 0;
            response += `• **@${author}:** ${snippet}${more} (${likes} likes)\n`;
          }
        } else {
          for (const t of toShow) {
            const author = t.author?.username ?? 'unknown';
            const snippet = t.text.slice(0, SNIPPET_LEN).replace(/\n/g, ' ');
            const more = t.text.length > SNIPPET_LEN ? '…' : '';
            const likes = t.metrics?.likeCount ?? 0;
            response += `• **@${author}:** ${snippet}${more} (${likes} likes)\n`;
          }
        }
      }

      response += `\n_Based on ${tweets.length} posts from the last 24h_`;

      if (process.env.X_RESEARCH_SHOW_COST === 'true') {
        response += `\n\n${formatCostFooter(tweets.length)}`;
      }

      if (message.roomId) setLastResearch(message.roomId, response);
      callback({
        text: response,
        action: 'X_SEARCH',
      });
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('X_BEARER_TOKEN')) {
        callback({
          text: "**X Search**\n\n⚠️ X API not configured. Set `X_BEARER_TOKEN` to enable search.",
          action: 'X_SEARCH',
        });
      } else {
        callback({
          text: `**X Search**\n\n❌ Error: ${errMsg}`,
          action: 'X_SEARCH',
        });
      }
      return false;
    }
  },
};

function extractQuery(text: string): string | null {
  const lower = text.toLowerCase();
  const patterns = [
    /search\s+x\s+for\s+(.+?)(?:\s+from\s+@?(\w+))?$/i,
    /search\s+twitter\s+for\s+(.+?)(?:\s+from\s+@?(\w+))?$/i,
    /what are people saying about\s+(.+?)(?:\s+from\s+@?(\w+))?$/i,
    /find tweets about\s+(.+?)(?:\s+from\s+@?(\w+))?$/i,
    /search for\s+(.+?)(?:\s+from\s+@?(\w+))?$/i,
    /x search\s+(.+?)(?:\s+from\s+@?(\w+))?$/i,
    /twitter search\s+(.+?)(?:\s+from\s+@?(\w+))?$/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function extractFromUser(text: string): string | undefined {
  const fromMatch = text.match(/(?:from|by)\s+@?(\w+)/i);
  if (fromMatch) return fromMatch[1];
  const atEnd = text.match(/\s+from\s+@?(\w+)\s*$/i);
  if (atEnd) return atEnd[1];
  return undefined;
}

export default xSearchAction;
