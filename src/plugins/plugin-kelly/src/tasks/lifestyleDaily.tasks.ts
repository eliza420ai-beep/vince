/**
 * Kelly Lifestyle Daily Task
 *
 * Scheduled concierge-only daily briefing pushed to Discord/Slack/Telegram.
 * Runs only for Kelly. Pushes to channels whose name contains "kelly" or "lifestyle".
 *
 * - Runs at configured hour (default 8:00 UTC).
 * - Uses KELLY_LIFESTYLE_SERVICE; no trading content; Kelly footer.
 *
 * Set KELLY_LIFESTYLE_HOUR=8 (UTC) to customize. Disable with KELLY_LIFESTYLE_DAILY_ENABLED=false.
 */

import {
  type IAgentRuntime,
  type UUID,
  logger,
  ModelType,
} from "@elizaos/core";
import type { KellyLifestyleService } from "../services/lifestyle.service";

const DEFAULT_LIFESTYLE_HOUR_UTC = 8;
const TASK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const ZERO_UUID = "00000000-0000-0000-0000-000000000000" as UUID;
const PUSH_SOURCES = ["discord", "slack", "telegram"] as const;
const KELLY_FOOTER =
  "*Ask me for hotels, dining, wine, health, fitness, or daily suggestions.*";

// Data context shape for LLM (lifestyle-only; no Friday strike line)
interface LifestyleDataContext {
  day: string;
  date: string;
  season: "pool" | "gym";
  isFriday: boolean;
  specialNotes: string[];
  health: { suggestion: string; reason: string }[];
  dining: { suggestion: string; reason: string; daySpecific: boolean }[];
  hotel: { suggestion: string; reason: string }[];
  activity: { suggestion: string; reason: string }[];
  curatedRestaurants: string[];
  curatedHotels: string[];
}

function buildLifestyleDataContext(ctx: LifestyleDataContext): string {
  const lines: string[] = [];

  lines.push(`=== LIFESTYLE (${ctx.day}, ${ctx.date}) ===`);
  lines.push(
    `Season: ${ctx.season === "pool" ? "Pool season (Apr-Nov)" : "Gym season (Dec-Mar)"}`,
  );
  lines.push("");

  if (ctx.specialNotes.length > 0) {
    lines.push("SPECIAL NOTES:");
    lines.push(...ctx.specialNotes);
    lines.push("");
  }

  if (ctx.activity.length > 0) {
    lines.push("TODAY'S FOCUS:");
    for (const a of ctx.activity) {
      lines.push(`${a.suggestion}`);
      lines.push(`  Reason: ${a.reason}`);
    }
    lines.push("");
  }

  if (ctx.health.length > 0) {
    lines.push("HEALTH:");
    for (const h of ctx.health) {
      lines.push(`${h.suggestion}`);
    }
    lines.push("");
  }

  if (ctx.curatedRestaurants.length > 0) {
    lines.push("DINING (curated, open today — suggest ONLY from this list):");
    for (const r of ctx.curatedRestaurants) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  } else if (ctx.dining.length > 0) {
    lines.push("DINING:");
    for (const d of ctx.dining) {
      lines.push(`${d.suggestion}`);
      if (d.daySpecific) lines.push(`  (Day-specific: ${d.reason})`);
    }
    lines.push("");
  }

  if (ctx.curatedHotels.length > 0) {
    lines.push(
      "HOTELS (curated, open this season — suggest ONLY from this list):",
    );
    for (const h of ctx.curatedHotels) {
      lines.push(`- ${h}`);
    }
  } else if (ctx.hotel.length > 0) {
    lines.push("HOTELS:");
    for (const h of ctx.hotel) {
      lines.push(`${h.suggestion}`);
      lines.push(`  ${h.reason}`);
    }
  }

  return lines.join("\n");
}

async function generateLifestyleHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const characterName = runtime.character?.name ?? "Kelly";

  const prompt = `You are ${characterName}, a concierge focused on five-star hotels, fine dining, fine wine, health, and fitness. You give lifestyle suggestions so your friend can live the life.

Here's the data:

${dataContext}

Write a lifestyle briefing that:
1. Start with the day's vibe - what kind of day is it? Pool day, gym day, midweek escape day?
2. CRITICAL: For DINING and HOTELS, prefer the curated lists when provided. If those lists are empty or very short, suggest one or two specific places from the-good-life knowledge (e.g. Paris MICHELIN, Bordeaux region, southwest palace hotels)—only real places from that knowledge, never invent names.
3. Give specific recommendations — name the restaurant, the hotel, or the activity. No generic "consider a spa" without naming a place.
4. Season matters - pool season is for swimming and rooftops, gym season is for indoor workouts and wellness.
5. End with a specific suggestion for the day (dining, hotel, or activity).
6. Do NOT mention trading, strikes, options, perps, or markets. You are purely lifestyle: hotels, dining, wine, health, fitness.

STYLE RULES:
- Write like a discerning friend helping plan the day
- Short suggestions mixed with explanations
- No bullet points - flow naturally
- Be specific when you can
- Make it feel like good living, not a to-do list
- Around 100-150 words. Concise but warm.

AVOID:
- "Interestingly", "notably"
- Generic wellness advice
- Making it feel like work
- Any reference to trading or markets

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(
      `[KellyLifestyleDaily] Failed to generate briefing: ${error}`,
    );
    return "Lifestyle data's glitching. Check knowledge/the-good-life for recommendations.";
  }
}

/**
 * Push text to channels whose name contains "kelly" or "lifestyle".
 * Uses runtime.getAllWorlds() / getRooms() and sendMessageToTarget.
 */
async function pushToKellyChannels(
  runtime: IAgentRuntime,
  text: string,
): Promise<number> {
  if (!text?.trim()) return 0;

  const nameMatches = (room: { name?: string }): boolean => {
    const name = (room.name ?? "").toLowerCase();
    return name.includes("kelly") || name.includes("lifestyle");
  };

  const targets: Array<{
    source: string;
    roomId?: UUID;
    channelId?: string;
    serverId?: string;
  }> = [];

  try {
    const worlds = await runtime.getAllWorlds();

    for (const world of worlds) {
      const rooms = await runtime.getRooms(world.id);
      for (const room of rooms) {
        const src = (room.source ?? "").toLowerCase();
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (!room.id) continue;
        if (!nameMatches(room)) continue;

        targets.push({
          source: (room.source ?? "").toLowerCase(),
          roomId: room.id,
          channelId: room.channelId,
          serverId:
            (room as { messageServerId?: string }).messageServerId ??
            (room as { serverId?: string }).serverId,
        });
      }
    }

    if (worlds.length === 0) {
      const fallbackRooms = await runtime.getRooms(ZERO_UUID);
      for (const room of fallbackRooms) {
        const src = (room.source ?? "").toLowerCase();
        if (!PUSH_SOURCES.includes(src as (typeof PUSH_SOURCES)[number]))
          continue;
        if (!nameMatches(room)) continue;

        targets.push({
          source: (room.source ?? "").toLowerCase(),
          roomId: room.id,
          channelId: room.channelId,
          serverId:
            (room as { messageServerId?: string }).messageServerId ??
            (room as { serverId?: string }).serverId,
        });
      }
    }
  } catch (err) {
    logger.debug(`[KellyLifestyleDaily] Could not get rooms: ${err}`);
    return 0;
  }

  const isNoSendHandler = (err: unknown): boolean =>
    String(err).includes("No send handler registered") ||
    String(err).includes("Send handler not found") ||
    String((err as Error)?.message).includes("No send handler registered") ||
    String((err as Error)?.message).includes("Send handler not found");

  let sent = 0;
  for (const target of targets) {
    try {
      await runtime.sendMessageToTarget(target, { text });
      sent++;
      logger.debug(
        `[KellyLifestyleDaily] Pushed to ${target.source} room ${target.roomId ?? target.channelId ?? "?"}`,
      );
    } catch (err) {
      if (!isNoSendHandler(err)) {
        logger.warn(`[KellyLifestyleDaily] Push failed: ${err}`);
      }
    }
  }

  if (sent > 0) {
    logger.info(
      `[KellyLifestyleDaily] Pushed to ${sent} channel(s): ${text.slice(0, 60)}…`,
    );
  }

  return sent;
}

export async function registerKellyLifestyleDailyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.KELLY_LIFESTYLE_DAILY_ENABLED !== "false";
  if (!enabled) {
    logger.info(
      "[KellyLifestyleDaily] Task disabled (KELLY_LIFESTYLE_DAILY_ENABLED=false)",
    );
    return;
  }

  const lifestyleHour =
    parseInt(
      process.env.KELLY_LIFESTYLE_HOUR ?? String(DEFAULT_LIFESTYLE_HOUR_UTC),
      10,
    ) || DEFAULT_LIFESTYLE_HOUR_UTC;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "KELLY_LIFESTYLE_DAILY",
    validate: async () => true,
    execute: async (rt) => {
      if (process.env.KELLY_LIFESTYLE_DAILY_ENABLED === "false") return;

      const now = new Date();
      const hourUtc = now.getUTCHours();
      if (hourUtc !== lifestyleHour) {
        logger.debug(
          `[KellyLifestyleDaily] Skipping: current hour ${hourUtc} UTC, target ${lifestyleHour}`,
        );
        return;
      }

      const lifestyleService = rt.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      if (!lifestyleService) {
        logger.warn("[KellyLifestyleDaily] KellyLifestyleService not available");
        return;
      }

      logger.info("[KellyLifestyleDaily] Building lifestyle briefing...");
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
        const humanBriefing = await generateLifestyleHumanBriefing(
          rt,
          dataContext,
        );

        const message = [
          `**${ctx.day}** _${ctx.date}_`,
          "",
          humanBriefing,
          "",
          "---",
          KELLY_FOOTER,
        ].join("\n");

        const sent = await pushToKellyChannels(rt, message);
        if (sent > 0) {
          logger.info(`[KellyLifestyleDaily] Pushed to ${sent} channel(s)`);
        } else {
          logger.debug(
            "[KellyLifestyleDaily] No channels matched (room name contains 'kelly' or 'lifestyle'). Create e.g. #kelly or #lifestyle.",
          );
        }
      } catch (error) {
        logger.error(`[KellyLifestyleDaily] Failed: ${error}`);
      }
    },
  });

  await runtime.createTask({
    name: "KELLY_LIFESTYLE_DAILY",
    description:
      "Daily concierge briefing (dining, hotel, health, fitness) pushed to Discord/Slack/Telegram",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["kelly", "lifestyle", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: TASK_INTERVAL_MS,
    },
  });

  logger.info(
    `[KellyLifestyleDaily] Task registered (runs at ${lifestyleHour}:00 UTC, push to channels with "kelly" or "lifestyle" in name)`,
  );
}
