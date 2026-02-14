/**
 * CONTENT_AUDIT — Content audit for creators
 *
 * Fetches top posts by engagement (via plugin-x-research) and uses AI to produce
 * a playbook: hooks that work, topics that land, formats that engage, what to avoid.
 * Uses ELIZA_X_BEARER_TOKEN when set (initXClientFromEnv in plugin-x-research).
 *
 * Requires plugin-x-research at src/plugins/plugin-x-research (relative to repo).
 * If the module is missing, the handler returns a clear message instead of leaking internals.
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
} from '@elizaos/core';
import { initXClientFromEnv } from '../../../plugin-x-research/src/services/xClient.service';
import { getXAccountsService } from '../../../plugin-x-research/src/services/xAccounts.service';
import { buildContentAuditPrompt } from '../../../plugin-x-research/src/constants/contentAuditPrompt';
import { setLastResearch } from '../../../plugin-x-research/src/store/lastResearchStore';
import type { XTweet } from '../../../plugin-x-research/src/types/tweet.types';

const MIN_TWEETS_FOR_AUDIT = 5;
const DEFAULT_TOP_COUNT = 20;

export const contentAuditAction: Action = {
  name: 'CONTENT_AUDIT',
  description:
    'Run a content audit on an X account: fetches top posts by engagement and uses AI to produce a playbook (hooks, topics, formats). Use when the user says "analyze my top posts," "content audit for @user," "what\'s working on my X," "my best performing tweets."',

  similes: ['X_CONTENT_AUDIT', 'TOP_PERFORMERS_ANALYSIS', 'CONTENT_PLAYBOOK'],

  examples: [
    [
      { name: '{{user}}', content: { text: 'Analyze my top posts @myhandle' } },
      {
        name: '{{agent}}',
        content: {
          text: '**Content playbook for @myhandle**\n\n**Hooks that work**\n• Open with a specific credential tied to the topic\n• Name the broken system the reader is stuck in\n\n**Topics that land**\n• ...',
          action: 'CONTENT_AUDIT',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? '').toLowerCase();
    const hasHandle = /@\w+/.test(text);
    const auditIntent =
      /analyze my top posts|content audit|what'?s working on my x|my best performing tweets|playbook for/.test(
        text
      );
    return hasHandle && auditIntent;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<void | ActionResult> => {
    try {
      initXClientFromEnv(runtime);

      const text = message.content?.text ?? '';
      const usernameMatch = text.match(/@(\w+)/);
      if (!usernameMatch) {
        callback({
          text: 'I need an @username to run a content audit. Example: "Analyze my top posts @yourhandle"',
          action: 'CONTENT_AUDIT',
        });
        return { success: true };
      }

      const username = usernameMatch[1];
      const accountsService = getXAccountsService();
      const tweets = await accountsService.getTopTweetsByEngagement(username, DEFAULT_TOP_COUNT);

      if (tweets.length < MIN_TWEETS_FOR_AUDIT) {
        callback({
          text: `Need at least ${MIN_TWEETS_FOR_AUDIT} posts to run a useful audit. @${username} has only ${tweets.length} (excl. replies/RTs).`,
          action: 'CONTENT_AUDIT',
        });
        return { success: true };
      }

      const tweetInputs = tweets.map((t: XTweet) => ({
        text: t.text,
        likeCount: t.metrics?.likeCount,
        retweetCount: t.metrics?.retweetCount,
        replyCount: t.metrics?.replyCount,
      }));
      const prompt = buildContentAuditPrompt(tweetInputs);

      const raw = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      let playbook = typeof raw === 'string' ? raw : String(raw ?? '');
      if (playbook.startsWith('```')) {
        playbook = playbook.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      }

      const responseText = `**Content playbook for @${username}**\n\n${playbook.trim()}`;
      if (message.roomId) setLastResearch(message.roomId, responseText);

      const out = "Here's the content playbook—\n\n" + responseText;
      callback({ text: out, action: 'CONTENT_AUDIT' });
      return { success: true };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isTokenError = errMsg.includes('X_BEARER_TOKEN') || errMsg.includes('ELIZA_X_BEARER');
      const isMissingModule =
        errMsg.includes('Cannot find module') ||
        errMsg.includes('plugin-x-research') ||
        errMsg.includes('getXClient') ||
        errMsg.includes('getXAccountsService');
      let text: string;
      if (isTokenError) {
        text =
          '**Content audit** — X API not configured. Set `X_BEARER_TOKEN` (or `ELIZA_X_BEARER_TOKEN` for Eliza) to enable.';
      } else if (isMissingModule) {
        text =
          '**Content audit** — Requires plugin-x-research (X/Twitter data). Ensure plugin-x-research is at `src/plugins/plugin-x-research` and set `ELIZA_X_BEARER_TOKEN` for the X API.';
      } else {
        text = `**Content audit** — Error: ${errMsg}`;
      }
      callback({ text, action: 'CONTENT_AUDIT' });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
};

export default contentAuditAction;
