/**
 * Plugin-Kelly — lifestyle-only concierge
 *
 * Daily briefing (health, dining, hotels, wellness), no trading.
 * Scheduled task pushes to channels whose name contains "kelly" or "lifestyle".
 */

import type { IAgentRuntime, Plugin } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { KellyLifestyleService } from "./services/lifestyle.service";
import { registerKellyLifestyleDailyTask } from "./tasks/lifestyleDaily.tasks";

export const kellyPlugin: Plugin = {
  name: "plugin-kelly",
  description:
    "Lifestyle-only concierge: daily briefing, health, dining, hotels, wellness. No trading.",

  services: [KellyLifestyleService],

  init: async (_config: Record<string, string>, runtime: IAgentRuntime) => {
    const name = (runtime.character?.name ?? "").toUpperCase();
    if (name !== "KELLY") {
      return;
    }

    setImmediate(async () => {
      try {
        await registerKellyLifestyleDailyTask(runtime);
      } catch (e) {
        logger.warn("[Kelly] Failed to register lifestyle daily task:", e);
      }
    });
  },
};

export { KellyLifestyleService } from "./services/lifestyle.service";
export { registerKellyLifestyleDailyTask } from "./tasks/lifestyleDaily.tasks";
