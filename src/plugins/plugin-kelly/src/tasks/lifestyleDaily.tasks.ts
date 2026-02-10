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
  wellnessTip: string;
  touchGrassNote: string;
  wineOfTheDay: string;
  travelIdeaOfTheWeek: string;
  /** Biarritz surf forecast line (always include when present). */
  surfBiarritzLine?: string;
  /** Bordeaux & Biarritz weather line (always include when present). */
  weatherBordeauxBiarritzLine?: string;
  /** Local (home) weather for daily swimming ritual; never name the town in output. */
  weatherHomeLine?: string;
  currentTimeParis?: string;
  pastLunch?: boolean;
}

function getParisTimeAndPastLunch(day: string): {
  currentTimeParis: string;
  pastLunch: boolean;
} {
  const now = new Date();
  const timeParis = now.toLocaleString("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const hourParis = parseInt(
    now.toLocaleString("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }),
    10,
  );
  const minParis = parseInt(
    now.toLocaleString("en-GB", { timeZone: "Europe/Paris", minute: "2-digit" }),
    10,
  );
  const minutesSinceMidnight = hourParis * 60 + minParis;
  const isSunday = day.toLowerCase() === "sunday";
  const cutoff = isSunday ? 15 * 60 : 14 * 60 + 30;
  return { currentTimeParis: timeParis, pastLunch: minutesSinceMidnight >= cutoff };
}

function buildLifestyleDataContext(ctx: LifestyleDataContext): string {
  const lines: string[] = [];

  lines.push(`=== LIFESTYLE (${ctx.day}, ${ctx.date}) ===`);
  lines.push(
    `Season: ${ctx.season === "pool" ? "Pool season (Apr-Nov)" : "Gym season (Dec-Mar)"}`,
  );
  if (ctx.currentTimeParis !== undefined && ctx.pastLunch !== undefined) {
    lines.push(
      ctx.pastLunch
        ? `CURRENT TIME (Europe/Paris): ${ctx.currentTimeParis}. CRITICAL: Past lunch hours. Do NOT suggest lunch or dinner at a restaurant. We almost never go out for dinner. Suggest pool, swim, walk, yoga, wine at home, or afternoon/evening activities instead.`
        : `Current time (Europe/Paris): ${ctx.currentTimeParis}. Lunch ends 14:00–15:00.`,
    );
  }
  lines.push("");

  if (ctx.wellnessTip) {
    lines.push("WELLNESS/FITNESS TIP FOR TODAY:");
    lines.push(ctx.wellnessTip);
    lines.push("");
  }

  if (ctx.wineOfTheDay) {
    lines.push("WINE OF THE DAY:");
    lines.push(ctx.wineOfTheDay);
    lines.push("");
  }

  if (ctx.travelIdeaOfTheWeek) {
    lines.push(
      "DAY TRIP IDEA (we are based in the Landes, between Bordeaux and Biarritz; suggest only day trips within about 1h drive from home):",
    );
    lines.push(ctx.travelIdeaOfTheWeek);
    lines.push("");
  }

  if (ctx.touchGrassNote) {
    lines.push("REBALANCE NOTE:");
    lines.push(ctx.touchGrassNote);
    lines.push("");
  }

  if (ctx.weatherBordeauxBiarritzLine) {
    lines.push(
      "BORDEAUX & BIARRITZ (weather) — include in the daily briefing so outdoor activities (terrace lunch, walk, pool, surf) match conditions:",
    );
    lines.push(ctx.weatherBordeauxBiarritzLine);
    lines.push("");
  }

  if (ctx.weatherHomeLine) {
    lines.push(
      "LOCAL (where we live — use for daily swimming ritual; never name the town in your reply):",
    );
    lines.push(ctx.weatherHomeLine);
    lines.push("");
  }

  if (ctx.surfBiarritzLine) {
    lines.push("SURF (Biarritz) — always include this in the daily briefing:");
    lines.push(ctx.surfBiarritzLine);
    lines.push("");
  }

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
1. Start with the day's vibe - what kind of day is it? Pool day, gym day, midweek escape day? Do not repeat the day name or "Sunday evening" etc. in the title; the date and time are already shown above.
2. DINING BY TIME: We almost NEVER go out for dinner—lunch only. If CURRENT TIME shows past lunch hours (past 14:30, or 15:00 on Sunday), do NOT suggest lunch or dinner at a restaurant. Suggest pool, swim, walk, yoga, wine at home, or afternoon activities instead. Otherwise, suggest LUNCH at the curated places—never dinner out.
3. CRITICAL: For DINING and HOTELS, prefer the curated lists when provided. If empty or short, suggest one or two specific places from the-good-life only—never invent names.
4. Give specific recommendations — name the restaurant, the hotel, or the activity. No generic "consider a spa" without naming a place.
5. If a WELLNESS/FITNESS TIP is provided, include one short line weaving it in.
6. If WINE OF THE DAY and DAY TRIP IDEA are provided, mention them in one sentence each (e.g. "Wine to try: Margaux." "Day trip idea: Saint-Émilion for château + lunch."). We are based in the Landes (between Bordeaux and Biarritz); suggest a concrete day trip within about 1h drive from home—not "travel to Southwest France".
7. If SURF (Biarritz) is provided, always include the Biarritz surf forecast in the briefing (one sentence, e.g. "Surf Biarritz: 1.2 m, 8 s, SW, sea 14 °C—fun size, most levels.").
8. If BORDEAUX & BIARRITZ (weather) is provided, include it in the briefing (one sentence) so suggestions for outdoor activities (terrace lunch, walk, pool, surf) match conditions.
9. If LOCAL weather is provided, include it in one sentence for the daily swimming ritual (e.g. "Local: clear, 14°C—good for a swim."). Never name the town or location in your reply.
10. If a REBALANCE NOTE is provided (Friday or weekend), add one sentence encouraging rebalance—dinner at home, pool, or a walk—without mentioning work or markets.
11. Season matters - pool season is for swimming and rooftops, gym season is for indoor workouts and wellness.
12. End with a specific suggestion for the day (dining = lunch, hotel, or activity).
13. Do NOT mention trading, strikes, options, perps, or markets. You are purely lifestyle: hotels, dining, wine, health, fitness.

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

/** Filter for which channel names to push to: "kelly" | "lifestyle" | "both" (default both). */
type ChannelNameFilter = "kelly" | "lifestyle" | "both";

/**
 * Push text to channels whose name contains "kelly" or "lifestyle" (or only one if filter set).
 * Uses runtime.getAllWorlds() / getRooms() and sendMessageToTarget.
 */
async function pushToKellyChannels(
  runtime: IAgentRuntime,
  text: string,
  nameFilter: ChannelNameFilter = "both",
): Promise<number> {
  if (!text?.trim()) return 0;

  const nameMatches = (room: { name?: string }): boolean => {
    const name = (room.name ?? "").toLowerCase();
    if (nameFilter === "kelly") return name.includes("kelly");
    if (nameFilter === "lifestyle") return name.includes("lifestyle");
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

      const maxRetries = 3;
      const backoffMs = [2000, 5000, 10000];
      let lifestyleService = rt.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      for (let i = 0; i < maxRetries && !lifestyleService; i++) {
        logger.warn(
          `[KellyLifestyleDaily] KellyLifestyleService not ready, retry ${i + 1}/${maxRetries} in ${backoffMs[i]}ms`,
        );
        await new Promise((r) => setTimeout(r, backoffMs[i]));
        lifestyleService = rt.getService(
          "KELLY_LIFESTYLE_SERVICE",
        ) as KellyLifestyleService | null;
      }
      if (!lifestyleService) {
        logger.warn("[KellyLifestyleDaily] KellyLifestyleService not available after retries");
        return;
      }

      logger.info("[KellyLifestyleDaily] Building lifestyle briefing...");
      try {
        const minimalMessage = {
          content: { text: "daily briefing" },
          roomId: ZERO_UUID,
        } as Parameters<IAgentRuntime["composeState"]>[0];
        const state = await rt.composeState(minimalMessage);
        const surfSummary = state.values?.surfBiarritzSummary as string | undefined;
        const surfBiarritzLine = surfSummary
          ? surfSummary.replace(/\.\s*When the user asks.*$/i, ".").trim()
          : undefined;
        const wBdx = state.values?.weatherBordeaux as { condition: string; temp: number } | undefined;
        const wBiarritz = state.values?.weatherBiarritz as { condition: string; temp: number } | undefined;
        const weatherParts: string[] = [];
        if (wBdx) weatherParts.push(`Bordeaux: ${wBdx.condition}, ${wBdx.temp}°C`);
        if (wBiarritz) weatherParts.push(`Biarritz: ${wBiarritz.condition}, ${wBiarritz.temp}°C`);
        const weatherBordeauxBiarritzLine =
          weatherParts.length > 0 ? weatherParts.join(". ") + "." : undefined;
        const wHome = state.values?.weatherHome as { condition: string; temp: number } | undefined;
        const weatherHomeLine = wHome
          ? `Local: ${wHome.condition}, ${wHome.temp}°C`
          : undefined;

        const briefing = lifestyleService.getDailyBriefing();
        const season = lifestyleService.getCurrentSeason();
        const contextRetries = [2000, 4000];
        let curated: ReturnType<KellyLifestyleService["getCuratedOpenContext"]> = null;
        for (let c = 0; c <= contextRetries.length; c++) {
          curated = lifestyleService.getCuratedOpenContext?.() ?? null;
          if (curated !== null || c === contextRetries.length) break;
          logger.warn(
            `[KellyLifestyleDaily] getCuratedOpenContext returned null, retry ${c + 1}/${contextRetries.length} in ${contextRetries[c]}ms`,
          );
          await new Promise((r) => setTimeout(r, contextRetries[c]));
        }

        const dayLower = briefing.day.toLowerCase();
        const isFriday = dayLower === "friday";
        const isSaturday = dayLower === "saturday";
        const day = briefing.day.charAt(0).toUpperCase() + briefing.day.slice(1);
        const { currentTimeParis, pastLunch } = getParisTimeAndPastLunch(day);

        const ctx: LifestyleDataContext = {
          day,
          date: briefing.date,
          season,
          isFriday,
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
          currentTimeParis,
          pastLunch,
          wellnessTip: lifestyleService.getWellnessTipOfTheDay?.() ?? "",
          touchGrassNote:
            isFriday || isSaturday
              ? "If it's been a heavy week, add one sentence encouraging a weekend rebalance—dinner at home, pool, or a walk—without mentioning work or markets."
              : "",
          wineOfTheDay: lifestyleService.getWineOfTheDay?.() ?? "",
          travelIdeaOfTheWeek: lifestyleService.getDayTripIdeaOfTheWeek?.() ?? lifestyleService.getTravelIdeaOfTheWeek?.() ?? "",
          surfBiarritzLine,
          weatherBordeauxBiarritzLine,
          weatherHomeLine,
        };

        const dataContext = buildLifestyleDataContext(ctx);
        let humanBriefing = "";
        let lastErr: unknown;
        for (let r = 0; r < maxRetries; r++) {
          try {
            humanBriefing = await generateLifestyleHumanBriefing(rt, dataContext);
            break;
          } catch (genErr) {
            lastErr = genErr;
            if (r < maxRetries - 1) {
              logger.warn(
                `[KellyLifestyleDaily] Briefing generation failed, retry ${r + 1} in ${backoffMs[r]}ms`,
              );
              await new Promise((res) => setTimeout(res, backoffMs[r]));
            }
          }
        }
        if (!humanBriefing?.trim()) {
          logger.error(`[KellyLifestyleDaily] Briefing failed after ${maxRetries} attempts: ${lastErr}`);
          humanBriefing = "Lifestyle data's glitching. Check knowledge/the-good-life for recommendations.";
        }

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
          logger.info(
            `[KellyLifestyleDaily] Pushed to ${sent} channel(s) (roomCount=${sent})`,
          );
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

const NUDGE_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const DEFAULT_NUDGE_DAY = "wednesday";
const DEFAULT_NUDGE_HOUR_UTC = 9;
const NUDGE_MESSAGE =
  "It's midweek escape day. Want one pick for hotel + lunch?";

/**
 * Register optional nudge task: on a configurable day (default Wednesday) at a set hour,
 * send one line to kelly/lifestyle channels. Set KELLY_NUDGE_ENABLED=true to enable.
 */
export async function registerKellyNudgeTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.KELLY_NUDGE_ENABLED === "true" ||
    process.env.KELLY_NUDGE_ENABLED === "1";
  if (!enabled) {
    logger.debug("[KellyNudge] Disabled (KELLY_NUDGE_ENABLED not true)");
    return;
  }

  const nudgeDay = (process.env.KELLY_NUDGE_DAY ?? DEFAULT_NUDGE_DAY).toLowerCase();
  const nudgeHour =
    parseInt(process.env.KELLY_NUDGE_HOUR ?? String(DEFAULT_NUDGE_HOUR_UTC), 10) ||
    DEFAULT_NUDGE_HOUR_UTC;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "KELLY_NUDGE_WEDNESDAY",
    validate: async () => true,
    execute: async (rt) => {
      if (
        process.env.KELLY_NUDGE_ENABLED !== "true" &&
        process.env.KELLY_NUDGE_ENABLED !== "1"
      )
        return;

      const now = new Date();
      // Nudge only to channels whose name contains "lifestyle" (configurable)
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const currentDay = dayNames[now.getUTCDay()];
      const hourUtc = now.getUTCHours();

      if (currentDay !== nudgeDay || hourUtc !== nudgeHour) {
        logger.debug(
          `[KellyNudge] Skip: today ${currentDay}, hour ${hourUtc} UTC (target: ${nudgeDay} ${nudgeHour}:00)`,
        );
        return;
      }

      const sent = await pushToKellyChannels(rt, NUDGE_MESSAGE, "lifestyle");
      if (sent > 0) {
        logger.info(`[KellyNudge] Sent nudge to ${sent} channel(s)`);
      }
    },
  });

  await runtime.createTask({
    name: "KELLY_NUDGE_WEDNESDAY",
    description: "Optional midweek nudge to kelly/lifestyle channels",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["kelly", "nudge", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: NUDGE_INTERVAL_MS,
    },
  });

  logger.info(
    `[KellyNudge] Task registered (${nudgeDay} at ${nudgeHour}:00 UTC, KELLY_NUDGE_ENABLED=true)`,
  );
}

const WEEKLY_DIGEST_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_WEEKLY_DIGEST_HOUR_UTC = 8;

/**
 * Register optional weekly digest task: Sunday at configured hour, push a short
 * week-ahead summary to kelly/lifestyle channels. Set KELLY_WEEKLY_DIGEST_ENABLED=true.
 */
export async function registerKellyWeeklyDigestTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.KELLY_WEEKLY_DIGEST_ENABLED === "true" ||
    process.env.KELLY_WEEKLY_DIGEST_ENABLED === "1";
  if (!enabled) {
    logger.debug("[KellyWeeklyDigest] Disabled (KELLY_WEEKLY_DIGEST_ENABLED not true)");
    return;
  }

  const digestHour =
    parseInt(
      process.env.KELLY_WEEKLY_DIGEST_HOUR ?? String(DEFAULT_WEEKLY_DIGEST_HOUR_UTC),
      10,
    ) || DEFAULT_WEEKLY_DIGEST_HOUR_UTC;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "KELLY_WEEKLY_DIGEST",
    validate: async () => true,
    execute: async (rt) => {
      if (
        process.env.KELLY_WEEKLY_DIGEST_ENABLED !== "true" &&
        process.env.KELLY_WEEKLY_DIGEST_ENABLED !== "1"
      )
        return;

      const now = new Date();
      if (now.getUTCDay() !== 0 || now.getUTCHours() !== digestHour) {
        logger.debug(
          `[KellyWeeklyDigest] Skip: day ${now.getUTCDay()} hour ${now.getUTCHours()} UTC (target: Sunday ${digestHour}:00)`,
        );
        return;
      }

      const service = rt.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      if (!service) {
        logger.warn("[KellyWeeklyDigest] KellyLifestyleService not available");
        return;
      }

      const curated = service.getCuratedOpenContext?.() ?? null;
      const restLine =
        (curated?.restaurants?.length ?? 0) > 0
          ? (curated!.restaurants as string[]).slice(0, 6).join(", ")
          : "See curated schedule by day.";
      const hotelLine =
        (curated?.hotels?.length ?? 0) > 0
          ? (curated!.hotels as string[]).slice(0, 4).join(", ")
          : "See curated schedule.";
      const season = service.getCurrentSeason?.() ?? "pool";
      const palaceLine =
        season === "gym" ? service.getPalacePoolStatusLine?.() ?? "" : "";

      const prompt = `You are Kelly, a concierge. In one short paragraph (3–5 sentences), suggest the week ahead: dining (lunch only), one hotel idea, and wellness. We are in Southwest France (Landes, Bordeaux–Biarritz). Dining options this week: ${restLine}. Hotels: ${hotelLine}.${palaceLine ? ` Palace pools: ${palaceLine}.` : ""} Be specific; no jargon. Output only the paragraph.`;

      try {
        const summary = await rt.useModel(ModelType.TEXT_SMALL, { prompt });
        const text = String(summary).trim();
        const message = [
          "**Week ahead**",
          "",
          text,
          "",
          "---",
          KELLY_FOOTER,
        ].join("\n");
        const sent = await pushToKellyChannels(rt, message);
        if (sent > 0) {
          logger.info(`[KellyWeeklyDigest] Pushed to ${sent} channel(s)`);
        }
      } catch (err) {
        logger.error(`[KellyWeeklyDigest] Failed: ${err}`);
      }
    },
  });

  await runtime.createTask({
    name: "KELLY_WEEKLY_DIGEST",
    description: "Optional weekly digest (Sunday) to kelly/lifestyle channels",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["kelly", "weekly", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: WEEKLY_DIGEST_INTERVAL_MS,
    },
  });

  logger.info(
    `[KellyWeeklyDigest] Task registered (Sunday ${digestHour}:00 UTC, KELLY_WEEKLY_DIGEST_ENABLED=true)`,
  );
}

/** Get week of year (1–53). */
function getWeekOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil((diff + start.getDay() * 86400000) / (7 * 86400000));
}

const DEFAULT_WINTER_SWIM_WEEK = 5; // First week of February

/**
 * Register optional winter swim reminder: once in Jan/Feb (configurable week),
 * push Palais/Caudalie reopen dates to kelly/lifestyle channels.
 * Set KELLY_WINTER_SWIM_REMINDER_ENABLED=true.
 */
export async function registerKellyWinterSwimReminderTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled =
    process.env.KELLY_WINTER_SWIM_REMINDER_ENABLED === "true" ||
    process.env.KELLY_WINTER_SWIM_REMINDER_ENABLED === "1";
  if (!enabled) {
    logger.debug(
      "[KellyWinterSwim] Disabled (KELLY_WINTER_SWIM_REMINDER_ENABLED not true)",
    );
    return;
  }

  const reminderWeek =
    parseInt(
      process.env.KELLY_WINTER_SWIM_REMINDER_WEEK ?? String(DEFAULT_WINTER_SWIM_WEEK),
      10,
    ) || DEFAULT_WINTER_SWIM_WEEK;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "KELLY_WINTER_SWIM_REMINDER",
    validate: async () => true,
    execute: async (rt) => {
      if (
        process.env.KELLY_WINTER_SWIM_REMINDER_ENABLED !== "true" &&
        process.env.KELLY_WINTER_SWIM_REMINDER_ENABLED !== "1"
      )
        return;

      const now = new Date();
      const month = now.getUTCMonth();
      const week = getWeekOfYear(now);
      if ((month !== 0 && month !== 1) || week !== reminderWeek) {
        logger.debug(
          `[KellyWinterSwim] Skip: month ${month + 1} week ${week} (target week ${reminderWeek})`,
        );
        return;
      }

      const service = rt.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      if (!service) {
        logger.warn("[KellyWinterSwim] KellyLifestyleService not available");
        return;
      }

      const statusLine = service.getPalacePoolStatusLine?.() ?? "Palais reopens Feb 12, Caudalie Feb 5, Eugenie Mar 6.";
      const message = [
        "**Winter swim reminder**",
        "",
        statusLine,
        "",
        "---",
        KELLY_FOOTER,
      ].join("\n");

      const sent = await pushToKellyChannels(rt, message);
      if (sent > 0) {
        logger.info(`[KellyWinterSwim] Pushed reminder to ${sent} channel(s)`);
      }
    },
  });

  await runtime.createTask({
    name: "KELLY_WINTER_SWIM_REMINDER",
    description: "Optional winter swim reminder (Jan/Feb) with palace pool reopen dates",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["kelly", "winter-swim", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: 7 * 24 * 60 * 60 * 1000,
    },
  });

  logger.info(
    `[KellyWinterSwim] Task registered (week ${reminderWeek}, KELLY_WINTER_SWIM_REMINDER_ENABLED=true)`,
  );
}
