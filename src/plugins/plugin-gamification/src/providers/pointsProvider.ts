import type {
  Provider,
  IAgentRuntime,
  Memory,
  State,
  ProviderResult,
} from "@elizaos/core";
import { GamificationService } from "../services/GamificationService";

export const pointsProvider: Provider = {
  name: "USER_POINTS",
  description: "User's points, level, streak for context.",

  dynamic: true,
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<ProviderResult> => {
    try {
      const gamificationService = runtime.getService(
        "gamification",
      ) as GamificationService;
      if (!gamificationService) {
        return {
          text: "Ranking service unavailable.",
          values: {},
        };
      }

      const summary = await gamificationService.getUserSummary(
        message.entityId,
      );

      return {
        text: `User has ${summary.allTimePoints.toLocaleString()} total points (Level: ${summary.levelName}, Streak: ${summary.streakDays} days)`,
        values: {
          points: summary.allTimePoints,
          weeklyPoints: summary.weeklyPoints,
          level: summary.level,
          levelName: summary.levelName,
          streak: summary.streakDays,
        },
        data: {
          points: summary.allTimePoints,
          weeklyPoints: summary.weeklyPoints,
          level: summary.level,
          levelName: summary.levelName,
          streak: summary.streakDays,
        },
      };
    } catch (error) {
      return {
        text: "Could not load points.",
        values: {},
      };
    }
  },
};
