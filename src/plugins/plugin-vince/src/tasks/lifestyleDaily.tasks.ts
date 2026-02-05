/**
 * VINCE Lifestyle Daily Task
 *
 * Scheduled daily lifestyle briefing pushed to Discord/Slack/Telegram.
 * Uses curated-open-schedule knowledge to suggest only places open today.
 *
 * - Runs at configured hour (default 8:00 UTC).
 * - Pushes to channels whose name contains "lifestyle" (e.g. #vince-lifestyle).
 * - Uses VinceNotificationService.push() with roomNameContains filter.
 *
 * Set VINCE_LIFESTYLE_HOUR=8 (UTC) to customize. Disable with VINCE_LIFESTYLE_DAILY_ENABLED=false.
 */

import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import type { VinceLifestyleService } from "../services/lifestyle.service";
import {
  buildLifestyleDataContext,
  generateLifestyleHumanBriefing,
  type LifestyleDataContext,
} from "../actions/lifestyle.action";

const DEFAULT_LIFESTYLE_HOUR_UTC = 8;
const TASK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

export async function registerLifestyleDailyTask(runtime: IAgentRuntime): Promise<void> {
  const enabled = process.env.VINCE_LIFESTYLE_DAILY_ENABLED !== "false";
  if (!enabled) {
    logger.info("[LifestyleDaily] Task disabled (VINCE_LIFESTYLE_DAILY_ENABLED=false)");
    return;
  }

  const lifestyleHour =
    parseInt(process.env.VINCE_LIFESTYLE_HOUR ?? String(DEFAULT_LIFESTYLE_HOUR_UTC), 10) ||
    DEFAULT_LIFESTYLE_HOUR_UTC;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "VINCE_LIFESTYLE_DAILY",
    validate: async () => true,
    execute: async (rt) => {
      const now = new Date();
      const hourUtc = now.getUTCHours();
      if (hourUtc !== lifestyleHour) {
        logger.debug(
          `[LifestyleDaily] Skipping: current hour ${hourUtc} UTC, target ${lifestyleHour}`
        );
        return;
      }

      const lifestyleService = rt.getService("VINCE_LIFESTYLE_SERVICE") as VinceLifestyleService | null;
      if (!lifestyleService) {
        logger.warn("[LifestyleDaily] VinceLifestyleService not available");
        return;
      }

      const notif = rt.getService("VINCE_NOTIFICATION_SERVICE") as {
        push?: (text: string, opts?: { roomNameContains?: string }) => Promise<number>;
      } | null;
      if (!notif?.push) {
        logger.warn("[LifestyleDaily] VinceNotificationService not available");
        return;
      }

      logger.info("[LifestyleDaily] Building lifestyle briefing...");
      try {
        const briefing = lifestyleService.getDailyBriefing();
        const season = lifestyleService.getCurrentSeason();
        const curated = lifestyleService.getCuratedOpenContext?.() ?? null;

        const ctx: LifestyleDataContext = {
          day: briefing.day.charAt(0).toUpperCase() + briefing.day.slice(1),
          date: briefing.date,
          season,
          isFriday: briefing.day.toLowerCase() === "friday",
          specialNotes: briefing.specialNotes,
          health: briefing.suggestions
            .filter((s) => s.category === "health")
            .map((s) => ({ suggestion: s.suggestion, reason: s.reason })),
          dining: briefing.suggestions
            .filter((s) => s.category === "dining")
            .map((s) => ({
              suggestion: s.suggestion,
              reason: s.reason,
              daySpecific: s.daySpecific || false,
            })),
          hotel: briefing.suggestions
            .filter((s) => s.category === "hotel")
            .map((s) => ({ suggestion: s.suggestion, reason: s.reason })),
          activity: briefing.suggestions
            .filter((s) => s.category === "activity")
            .map((s) => ({ suggestion: s.suggestion, reason: s.reason })),
          curatedRestaurants: curated?.restaurants ?? [],
          curatedHotels: curated?.hotels ?? [],
        };

        const dataContext = buildLifestyleDataContext(ctx);
        const humanBriefing = await generateLifestyleHumanBriefing(rt, dataContext);

        const text = [
          `**${ctx.day}** _${ctx.date}_`,
          "",
          humanBriefing,
          "",
          "---",
          "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
        ].join("\n");

        const sent = await notif.push(text, { roomNameContains: "lifestyle" });
        if (sent > 0) {
          logger.info(`[LifestyleDaily] Pushed to ${sent} channel(s)`);
        } else {
          logger.debug(
            "[LifestyleDaily] No channels matched (room name contains 'lifestyle'). Create e.g. #vince-lifestyle."
          );
        }
      } catch (error) {
        logger.error(`[LifestyleDaily] Failed: ${error}`);
      }
    },
  });

  await runtime.createTask({
    name: "VINCE_LIFESTYLE_DAILY",
    description: "Daily lifestyle briefing (dining, hotel, health, fitness) pushed to Discord/Slack/Telegram",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "lifestyle", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: TASK_INTERVAL_MS,
    },
  });

  logger.info(
    `[LifestyleDaily] Task registered (runs at ${lifestyleHour}:00 UTC, push to channels with "lifestyle" in name)`
  );
}
