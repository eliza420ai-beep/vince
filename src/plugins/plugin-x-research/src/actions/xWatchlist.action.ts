/**
 * X Watchlist Action
 *
 * Read-only check of the user's X watchlist (same file as skills/x-research CLI).
 * Add/remove accounts via CLI: cd skills/x-research && bun run x-search.ts watchlist add|remove <username>
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
} from '@elizaos/core';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { initXClientFromEnv } from '../services/xClient.service';
import { getXAccountsService } from '../services/xAccounts.service';
import type { XTweet } from '../types/tweet.types';

const MAX_ACCOUNTS = 10;
const TWEETS_PER_ACCOUNT = 3;

interface WatchlistAccount {
  username: string;
  note?: string;
  addedAt: string;
}

interface WatchlistFile {
  accounts: WatchlistAccount[];
}

function getWatchlistPath(): string {
  const envPath = process.env.X_WATCHLIST_PATH;
  if (envPath) return envPath;
  return join(process.cwd(), 'skills', 'x-research', 'data', 'watchlist.json');
}

function loadWatchlist(): WatchlistAccount[] {
  const path = getWatchlistPath();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf-8');
    const data = JSON.parse(raw) as WatchlistFile;
    return Array.isArray(data.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

function formatTweet(t: XTweet): string {
  const text = t.text.slice(0, 200) + (t.text.length > 200 ? '…' : '');
  const likes = t.metrics?.likeCount ?? 0;
  return `  • ${text}\n    ${likes} likes`;
}

export const xWatchlistAction: Action = {
  name: 'X_WATCHLIST',
  description: 'Check the user\'s X watchlist — recent tweets from accounts they follow for research. Use when asked "check my watchlist", "my x watchlist", "what did my watchlist post". Add/remove accounts via CLI only.',

  similes: ['X_WATCHLIST_CHECK', 'WATCHLIST_CHECK', 'MY_X_WATCHLIST'],

  examples: [
    [
      {
        user: '{{user1}}',
        content: { text: 'Check my X watchlist' },
      },
      {
        user: '{{agentName}}',
        content: {
          text: '📋 **X Watchlist**\n\n**@user1** (note)\n  • Tweet text…\n    42 likes\n\n**@user2**\n  • Another tweet…\n    12 likes',
          action: 'X_WATCHLIST',
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? '').toLowerCase();
    const triggers = [
      'watchlist',
      'check watchlist',
      'my x watchlist',
      'my twitter watchlist',
      'what did my watchlist',
      'watchlist check',
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
      const accounts = loadWatchlist();
      if (accounts.length === 0) {
        callback({
          text: "📋 **X Watchlist**\n\nWatchlist is empty or not found. Add accounts via CLI:\n`cd skills/x-research && bun run x-search.ts watchlist add <username>`",
          action: 'X_WATCHLIST',
        });
        return true;
      }

      const accountsService = getXAccountsService();
      const toCheck = accounts.slice(0, MAX_ACCOUNTS);
      const lines: string[] = ['📋 **X Watchlist**\n'];

      for (const acct of toCheck) {
        const label = acct.note ? `**@${acct.username}** (${acct.note})` : `**@${acct.username}**`;
        lines.push(label);
        try {
          const tweets = await accountsService.getRecentTakes(acct.username, TWEETS_PER_ACCOUNT);
          if (tweets.length === 0) {
            lines.push('  No recent tweets.');
          } else {
            tweets.forEach((t) => lines.push(formatTweet(t)));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          lines.push(`  Error: ${msg}`);
        }
        lines.push('');
      }

      if (accounts.length > MAX_ACCOUNTS) {
        lines.push(`_Showing first ${MAX_ACCOUNTS} of ${accounts.length} accounts._`);
      }

      callback({
        text: lines.join('\n').trimEnd(),
        action: 'X_WATCHLIST',
      });
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('X_BEARER_TOKEN')) {
        callback({
          text: "📋 **X Watchlist**\n\n⚠️ X API not configured. Set `X_BEARER_TOKEN` to enable watchlist check.",
          action: 'X_WATCHLIST',
        });
      } else {
        callback({
          text: `📋 **X Watchlist**\n\n❌ Error: ${errMsg}`,
          action: 'X_WATCHLIST',
        });
      }
      return false;
    }
  },
};

export default xWatchlistAction;
