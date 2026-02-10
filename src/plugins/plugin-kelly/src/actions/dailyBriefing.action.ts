/**
 * KELLY_DAILY_BRIEFING — on-demand lifestyle briefing for Kelly
 *
 * Same flow as KELLY_LIFESTYLE_DAILY task: day-aware health, dining, hotels, wellness.
 * Uses KellyLifestyleService; no trading content.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { KellyLifestyleService } from "../services/lifestyle.service";

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
  /** Biarritz surf forecast line for the daily briefing (always include when present). */
  surfBiarritzLine?: string;
  /** Bordeaux & Biarritz weather line (always include when present for outdoor activities). */
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
3. CRITICAL: For DINING and HOTELS, prefer the curated lists when provided. If those lists are empty or very short, suggest one or two specific places from the-good-life knowledge—only real places, never invent names.
4. Give specific recommendations — name the restaurant, the hotel, or the activity. No generic "consider a spa" without naming a place.
5. If a WELLNESS/FITNESS TIP is provided, include one short line weaving it in.
6. If WINE OF THE DAY and DAY TRIP IDEA are provided, mention them in one sentence each (e.g. "Wine to try: Margaux." "Day trip idea: Saint-Émilion for château + lunch."). We are based in the Landes (between Bordeaux and Biarritz); suggest a concrete day trip within about 1h drive from home—do not suggest "travel to Southwest France".
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
- Jargon: leverage, utilize, streamline, robust, cutting-edge, synergy, holistic, seamless, optimize, actionable, etc.

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(
      `[KELLY_DAILY_BRIEFING] Failed to generate briefing: ${error}`,
    );
    return "Lifestyle data's glitching. Check knowledge/the-good-life for recommendations.";
  }
}

const KELLY_FOOTER =
  "*Ask me for hotels, dining, wine, health, fitness, or daily suggestions.*";

export const kellyDailyBriefingAction: Action = {
  name: "KELLY_DAILY_BRIEFING",
  similes: [
    "LIFESTYLE",
    "DAILY",
    "SUGGESTIONS",
    "HEALTH",
    "DINING",
    "HOTEL",
    "SWIM",
    "GYM",
    "WINE",
    "FITNESS",
    "WELLNESS",
    "TODAY",
  ],
  description:
    "Day-of-week lifestyle suggestions: health, dining, hotels, wellness (curated from the-good-life). Concierge-only.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("lifestyle") ||
      text.includes("daily") ||
      text.includes("suggestion") ||
      text.includes("suggestions") ||
      text.includes("health") ||
      text.includes("dining") ||
      text.includes("hotel") ||
      text.includes("hotels") ||
      text.includes("swim") ||
      text.includes("gym") ||
      text.includes("lunch") ||
      text.includes("wellness") ||
      text.includes("what should i do") ||
      text.includes("what to do today") ||
      text.includes("what to do this week") ||
      (text.includes("today") &&
        (text.includes("recommend") ||
          text.includes("plan") ||
          text.includes("vibe"))) ||
      (text.includes("wine") &&
        (text.includes("recommend") ||
          text.includes("tasting") ||
          text.includes("where"))) ||
      text.includes("pool day") ||
      text.includes("fitness") ||
      text.includes("workout") ||
      text.includes("yoga") ||
      (text.includes("curated") && text.includes("open"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_DAILY_BRIEFING] Action fired");
    try {
      const lifestyleService = runtime.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;

      if (!lifestyleService) {
        await callback({
          text: "Lifestyle service is down. Can't get the suggestions right now.",
          actions: ["KELLY_DAILY_BRIEFING"],
        });
        return;
      }

      logger.info("[KELLY_DAILY_BRIEFING] Building lifestyle briefing...");

      const state = await runtime.composeState(_message);
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
      const curated = lifestyleService.getCuratedOpenContext?.() ?? null;
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
        wellnessTip: lifestyleService.getWellnessTipOfTheDay?.() ?? "",
        currentTimeParis,
        pastLunch,
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
      const humanBriefing = await generateLifestyleHumanBriefing(
        runtime,
        dataContext,
      );

      const output = [
        `**${ctx.day}** _${ctx.date}_`,
        "",
        humanBriefing,
        "",
        "---",
        KELLY_FOOTER,
      ].join("\n");

      await callback({
        text: output,
        actions: ["KELLY_DAILY_BRIEFING"],
      });

      logger.info("[KELLY_DAILY_BRIEFING] Briefing complete");
    } catch (error) {
      logger.error(`[KELLY_DAILY_BRIEFING] Error: ${error}`);
      await callback({
        text: "Lifestyle briefing failed. Check the knowledge base directly for recommendations.",
        actions: ["KELLY_DAILY_BRIEFING"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What should I do today?" } },
      {
        name: "Kelly",
        content: {
          text: "Use the daily lifestyle briefing—it's day-aware and pulls from curated places open today (dining, hotels, health). I'll run it for you.",
          actions: ["KELLY_DAILY_BRIEFING"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Where's good for lunch today?" } },
      {
        name: "Kelly",
        content: {
          text: "The daily briefing has today's curated spots—I'll run it so you get places that are open.",
          actions: ["KELLY_DAILY_BRIEFING"],
        },
      },
    ],
  ],
};
