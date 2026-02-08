/**
 * Plugin-Kelly — lifestyle-only concierge
 *
 * Daily briefing (health, dining, hotels, wellness), no trading.
 * Scheduled task pushes to channels whose name contains "kelly" or "lifestyle".
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { kellyDailyBriefingAction } from "./actions/dailyBriefing.action";
import { kellyItineraryAction } from "./actions/itinerary.action";
import { kellyRecommendPlaceAction } from "./actions/recommendPlace.action";
import { kellyRecommendWineAction } from "./actions/recommendWine.action";
import { kellySurfForecastAction } from "./actions/surfForecast.action";
import { kellyRecommendWorkoutAction } from "./actions/recommendWorkout.action";
import { kellyWeekAheadAction } from "./actions/weekAhead.action";
import { kellySwimmingTipsAction } from "./actions/swimmingTips.action";
import { lifestyleFeedbackEvaluator } from "./evaluators/lifestyleFeedback.evaluator";
import { kellyContextProvider } from "./providers/kellyContext.provider";
import { weatherProvider } from "./providers/weather.provider";
import { KellyLifestyleService } from "./services/lifestyle.service";
import {
  registerKellyLifestyleDailyTask,
  registerKellyNudgeTask,
} from "./tasks/lifestyleDaily.tasks";

export const kellyPlugin: Plugin = {
  name: "plugin-kelly",
  description:
    "Lifestyle-only concierge: daily briefing, health, dining, hotels, wellness. No trading.",

  services: [KellyLifestyleService],
  actions: [
    kellyDailyBriefingAction,
    kellyRecommendPlaceAction,
    kellyRecommendWineAction,
    kellySurfForecastAction,
    kellyItineraryAction,
    kellyRecommendWorkoutAction,
    kellyWeekAheadAction,
    kellySwimmingTipsAction,
  ],
  evaluators: [lifestyleFeedbackEvaluator],
  providers: [kellyContextProvider, weatherProvider],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const name = (runtime.character?.name ?? "").toUpperCase();
    if (name !== "KELLY") {
      return;
    }

    setImmediate(async () => {
      try {
        const { getKellyHealth } = await import("./health");
        const health = await getKellyHealth(runtime);
        if (!health.ok) {
          logger.warn("[Kelly] Health check: " + (health.message ?? "curated schedule missing"));
        } else {
          logger.debug("[Kelly] Health check OK");
        }
      } catch (e) {
        logger.warn("[Kelly] Health check failed: " + e);
      }
      try {
        await registerKellyLifestyleDailyTask(runtime);
      } catch (e) {
        logger.warn("[Kelly] Failed to register lifestyle daily task:", e);
      }
      try {
        await registerKellyNudgeTask(runtime);
      } catch (e) {
        logger.warn("[Kelly] Failed to register nudge task:", e);
      }
    });
  },
};

export { KellyLifestyleService } from "./services/lifestyle.service";
export {
  registerKellyLifestyleDailyTask,
  registerKellyNudgeTask,
} from "./tasks/lifestyleDaily.tasks";
export { getKellyHealth } from "./health";
export type { KellyHealthResult } from "./health";
