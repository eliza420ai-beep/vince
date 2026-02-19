import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
} from "@elizaos/core";
import { GamificationService } from "../services/GamificationService";

export const getPointsSummaryAction: Action = {
  name: "GET_POINTS_SUMMARY",
  description: "Where you stand: points, level, streak, next milestone.",
  similes: [
    "CHECK_POINTS",
    "MY_POINTS",
    "POINTS_BALANCE",
    "SHOW_LEVEL",
    "WHERE_DO_I_STAND",
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const gamificationService = runtime.getService(
        "gamification",
      ) as GamificationService;
      if (!gamificationService) {
        const errorText = "Ranking service unavailable.";
        await callback?.({
          text: errorText,
        });
        return {
          text: errorText,
          success: false,
        };
      }

      const summary = await gamificationService.getUserSummary(
        message.entityId,
      );

      const nextLine = summary.nextMilestone
        ? `\n- **Next:** ${summary.nextMilestone.pointsNeeded.toLocaleString()} pts to ${summary.nextMilestone.levelName}`
        : "";
      const text = `**Where you stand**
- **Total points:** ${summary.allTimePoints.toLocaleString()}
- **This week:** ${summary.weeklyPoints.toLocaleString()}
- **Level:** ${summary.levelName} (${summary.level})
- **Streak:** ${summary.streakDays} days${nextLine}`;

      await callback?.({
        text,
        data: summary,
      });

      return {
        text,
        success: true,
        data: summary as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const errorText = "Could not load your points.";
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
      { name: "user", content: { text: "Where do I stand?" } },
      {
        name: "agent",
        content: {
          text: "Checking your rank and points.",
          actions: ["GET_POINTS_SUMMARY"],
        },
      },
    ],
    [
      { name: "user", content: { text: "My points" } },
      {
        name: "agent",
        content: {
          text: "Here’s where you stand.",
          actions: ["GET_POINTS_SUMMARY"],
        },
      },
    ],
  ],
};
