/**
 * VINCE Lifestyle Action
 *
 * Human-style lifestyle briefing that reads like a friend helping you plan the day.
 * Uses LLM to generate conversational narrative about daily suggestions.
 *
 * Features:
 * - Day of week awareness
 * - Season (pool vs gym)
 * - Trading rhythm integration
 * - Dining and hotel recommendations
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { VinceLifestyleService } from "../services/lifestyle.service";

// ==========================================
// Build data context for LLM (exported for daily push task)
// ==========================================

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
  /** Curated places open today — ONLY suggest from these lists */
  curatedRestaurants: string[];
  curatedHotels: string[];
}

export function buildLifestyleDataContext(
  ctx: LifestyleDataContext,
  opts?: { lifestyleOnly?: boolean },
): string {
  const lines: string[] = [];

  lines.push(`=== LIFESTYLE (${ctx.day}, ${ctx.date}) ===`);
  lines.push(
    `Season: ${ctx.season === "pool" ? "Pool season (Apr-Nov)" : "Gym season (Dec-Mar)"}`,
  );
  if (ctx.isFriday && !opts?.lifestyleOnly) {
    lines.push("FRIDAY - Strike selection ritual day");
  }
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

// ==========================================
// Generate human briefing via LLM
// ==========================================

export async function generateLifestyleHumanBriefing(
  runtime: IAgentRuntime,
  dataContext: string,
): Promise<string> {
  const characterName = runtime.character?.name ?? "VINCE";
  const isLifestyleOnly = characterName.toUpperCase() !== "VINCE";

  const prompt = isLifestyleOnly
    ? `You are ${characterName}, a concierge focused on five-star hotels, fine dining, fine wine, health, and fitness. You give lifestyle suggestions so your friend can live the life.

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

Write the briefing:`
    : `You are VINCE, giving lifestyle suggestions to a friend who trades for a living. You know their rhythm - trading in the morning, living well the rest of the day.

Here's the data:

${dataContext}

Write a lifestyle briefing that:
1. Start with the day's vibe - what kind of day is it? Pool day, gym day, Friday ritual?
2. Connect trading and lifestyle naturally - "After you set those strikes, hit the pool" not as separate categories
3. CRITICAL: For DINING and HOTELS, suggest ONLY from the curated lists provided. These are places open today / this season. Do not invent or recommend places not on the list.
4. Give specific recommendations — name the restaurant, the hotel, the activity from the data.
5. If it's Friday, make the strike selection ritual prominent
6. Season matters - pool season is for rooftops and swimming, gym season is for indoor workouts
7. End with a specific suggestion for the day

STYLE RULES:
- Write like a friend helping plan the day
- Short suggestions mixed with explanations
- No bullet points - flow naturally
- Be specific when you can
- Make it feel like good living, not a to-do list
- Around 100-150 words. Concise but warm.

AVOID:
- "Interestingly", "notably"
- Generic wellness advice
- Making it feel like work
- Separating trading and lifestyle into categories

Write the briefing:`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    return String(response).trim();
  } catch (error) {
    logger.error(`[VINCE_LIFESTYLE] Failed to generate briefing: ${error}`);
    return "Lifestyle data's glitching. Check knowledge/the-good-life for recommendations.";
  }
}

export const vinceLifestyleAction: Action = {
  name: "VINCE_LIFESTYLE",
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
    "Day-of-week lifestyle suggestions: health, dining, hotels, wellness (curated from the-good-life; trading rhythm for VINCE, concierge-only for Kelly)",

  validate: async (
    runtime: IAgentRuntime,
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
      (text.includes("today") && (text.includes("recommend") || text.includes("plan") || text.includes("vibe"))) ||
      (text.includes("wine") && (text.includes("recommend") || text.includes("tasting") || text.includes("where"))) ||
      text.includes("pool day") ||
      text.includes("fitness") ||
      text.includes("workout") ||
      text.includes("yoga") ||
      (text.includes("curated") && text.includes("open"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      const lifestyleService = runtime.getService(
        "VINCE_LIFESTYLE_SERVICE",
      ) as VinceLifestyleService | null;

      if (!lifestyleService) {
        await callback({
          text: "Lifestyle service is down. Can't get the suggestions right now.",
          actions: ["VINCE_LIFESTYLE"],
        });
        return;
      }

      logger.info("[VINCE_LIFESTYLE] Building lifestyle briefing...");

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

      // Generate briefing (lifestyle-only agents get context without trading note)
      const characterName = runtime.character?.name ?? "VINCE";
      const lifestyleOnly = characterName.toUpperCase() !== "VINCE";
      const dataContext = buildLifestyleDataContext(ctx, { lifestyleOnly });
      logger.info("[VINCE_LIFESTYLE] Generating briefing...");
      const humanBriefing = await generateLifestyleHumanBriefing(
        runtime,
        dataContext,
      );

      const footer = lifestyleOnly
        ? "*Ask me for hotels, dining, wine, health, fitness, or daily suggestions.*"
        : "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*";

      const output = [
        `**${ctx.day}** _${ctx.date}_`,
        "",
        humanBriefing,
        "",
        "---",
        footer,
      ].join("\n");

      await callback({
        text: output,
        actions: ["VINCE_LIFESTYLE"],
      });

      logger.info("[VINCE_LIFESTYLE] Briefing complete");
    } catch (error) {
      logger.error(`[VINCE_LIFESTYLE] Error: ${error}`);
      await callback({
        text: "Lifestyle briefing failed. Check the knowledge base directly for recommendations.",
        actions: ["VINCE_LIFESTYLE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "What should I do today?" } },
      {
        name: "VINCE",
        content: {
          text: "**Friday** _Jan 31_\n\nFriday ritual day. You know the drill - strike selection comes first. Markets are quiet right now so take the morning to review positions, set your covered calls and puts for the week ahead. The skew is elevated on puts so that's where the premium is.\n\nOnce the trades are in, it's pool time. Four Seasons rooftop is the move - it's warm out and Friday afternoons there are ideal. The crowd is good, the service is better.\n\nFor dinner, Cha Cha Cha is solid for a Friday - lively atmosphere, good cocktails, and you don't need to think too hard about the menu. Or if you want something quieter, Sushi Nakazawa does an excellent omakase.\n\nThe day: Strikes in the morning, pool in the afternoon, good dinner to close the week. That's the rhythm.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_LIFESTYLE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Any dining suggestions?" } },
      {
        name: "VINCE",
        content: {
          text: "**Tuesday** _Feb 4_\n\nMidweek vibes. Markets should be active this morning - focus on perps setups if the signals are there. Tuesday is typically a good volatility day so keep an eye on funding rates.\n\nGym day since we're in the December-March window. Morning workout before markets if you can swing it, otherwise lunch break works. The W pool isn't running but their fitness center is solid.\n\nFor lunch, keep it light - markets are moving. Sweetgreen or something quick that won't put you into a food coma. You want to stay sharp.\n\nDinner is more flexible. Tuesday isn't a special dining day so pick based on mood. If you want steak, Wolfgang's never misses. Something lighter, Sugarfish has great quality without the heaviness.\n\nThe day: Trade the morning, gym at lunch, easy dinner. Standard Tuesday.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_LIFESTYLE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Hotel recommendations?" } },
      {
        name: "VINCE",
        content: {
          text: "**Saturday** _Feb 8_\n\nWeekend. Markets are quiet so today's actually about living, not trading. Maybe review the week's performance in the morning but don't force any trades.\n\nIt's pool season which means hotel selection matters. Four Seasons has the best rooftop - cabanas, good service, and the crowd skews successful rather than influencer. Book early though, especially on weekends.\n\nThe Edition is another strong option if Four Seasons is booked. Slightly more scene-y but the pool is excellent and the location works.\n\nIf you're thinking staycation, the Peninsula does an incredible job with in-room experience. Good for a quieter weekend if you want to decompress without the scene.\n\nLunch poolside, dinner at one of the spots nearby. Keep it simple - the goal is relaxation, not optimization.\n\nThe day: Light review in the morning, pool all afternoon, dinner wherever sounds good. Enjoy the weekend.\n\n---\n*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
          actions: ["VINCE_LIFESTYLE"],
        },
      },
    ],
  ],
};
