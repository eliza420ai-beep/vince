/**
 * Shared briefing utilities — single source of truth for:
 * - LifestyleDataContext type
 * - Paris time + past-lunch logic
 * - Data context builder (structured text for LLM)
 * - Human briefing generator (LLM call)
 *
 * Used by both dailyBriefing.action.ts and lifestyleDaily.tasks.ts.
 * Do NOT duplicate this logic elsewhere.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { getVoiceAvoidPromptFragment } from "../constants/voice";

const PARIS_TZ = "Europe/Paris";

export interface LifestyleDataContext {
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

/**
 * Get current Paris time and whether it's past lunch hours.
 * Sunday cutoff: 15:00. Other days: 14:30.
 */
export function getParisTimeAndPastLunch(day: string): {
  currentTimeParis: string;
  pastLunch: boolean;
} {
  const now = new Date();
  const timeParis = now.toLocaleString("en-GB", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const hourParis = parseInt(
    now.toLocaleString("en-GB", {
      timeZone: PARIS_TZ,
      hour: "2-digit",
      hour12: false,
    }),
    10,
  );
  const minParis = parseInt(
    now.toLocaleString("en-GB", { timeZone: PARIS_TZ, minute: "2-digit" }),
    10,
  );
  const minutesSinceMidnight = hourParis * 60 + minParis;
  const isSunday = day.toLowerCase() === "sunday";
  const cutoff = isSunday ? 15 * 60 : 14 * 60 + 30;
  return {
    currentTimeParis: timeParis,
    pastLunch: minutesSinceMidnight >= cutoff,
  };
}

/**
 * Build structured text data context for the LLM from lifestyle data.
 */
export function buildLifestyleDataContext(ctx: LifestyleDataContext): string {
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

/**
 * Generate a human-readable lifestyle briefing from structured data context.
 * Single source of truth for the LLM prompt used by both action and task.
 */
export async function generateLifestyleHumanBriefing(
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
${getVoiceAvoidPromptFragment()}

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[Kelly briefing] Failed to generate briefing: ${error}`);
    return "Lifestyle data's glitching. Check knowledge/the-good-life for recommendations.";
  }
}

export const KELLY_FOOTER =
  "*Ask me for hotels, dining, wine, health, fitness, or daily suggestions.*";
