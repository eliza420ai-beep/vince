import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionResult } from '@elizaos/core';
import { GamificationService } from '../services/GamificationService';

export const getLeaderboardAction: Action = {
  name: 'GET_LEADERBOARD',
  description: "Top ranks this week or all time.",
  similes: ['LEADERBOARD', 'RANKINGS', 'TOP_USERS', 'LEADERBOARD_RANKINGS', 'WHOS_ON_TOP'],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const gamificationService = runtime.getService('gamification') as GamificationService;
      if (!gamificationService) {
        const errorText = 'Ranking service unavailable.';
        await callback?.({
          text: errorText,
        });
        return {
          text: errorText,
          success: false,
        };
      }

      const scope = (options?.scope as 'weekly' | 'all_time') || 'weekly';
      const limit = (options?.limit as number) || 10;

      const entries = await gamificationService.getLeaderboard(scope, limit);
      const userRank = await gamificationService.getUserRank(message.entityId, scope);

      const scopeLabel = scope === 'weekly' ? 'Weekly' : 'All-time';
      let text = `**${scopeLabel} top ${limit}**\n\n`;
      entries.forEach((entry) => {
        const displayName = entry.username || entry.levelName || `User ${entry.userId.substring(0, 8)}`;
        text += `${entry.rank}. ${displayName} — ${entry.points.toLocaleString()} pts\n`;
      });

      if (userRank > 0) {
        text += `\n**Your rank:** #${userRank}`;
      }

      const data = { entries, userRank, scope };

      await callback?.({
        text,
        data,
      });

      return {
        text,
        success: true,
        data,
      };
    } catch (error) {
      const errorText = 'Could not load leaderboard.';
      await callback?.({
        text: errorText,
      });
      return {
        text: errorText,
        success: false,
      };
    }
  },

  examples: [
    [
      { name: 'user', content: { text: 'Leaderboard' } },
      { name: 'agent', content: { text: 'Here’s the weekly top.', actions: ['GET_LEADERBOARD'] } },
    ],
    [
      { name: 'user', content: { text: 'Who’s on top?' } },
      { name: 'agent', content: { text: 'Top ranks.', actions: ['GET_LEADERBOARD'] } },
    ],
  ],
};

