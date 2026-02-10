/**
 * KellyContextProvider — injects today's wellness tip, day, season, and known preferences
 * into state for every reply so Kelly can personalize recommendations.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import type { KellyLifestyleService } from "../services/lifestyle.service";

const LIFESTYLE_FACT_HINTS = [
  "loved",
  "prefer",
  "prefers",
  "quiet",
  "quieter",
  "noisy",
  "perfect",
  "didn't work",
  "won't go again",
  "we'll go back",
  "hotel",
  "restaurant",
  "wine",
  "activity",
];

const DAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type DayName = (typeof DAY_NAMES)[number];

/** Detect if the user is asking for recommendations for a specific day (e.g. "Monday lunch", "tomorrow is Monday", "place to eat on Monday"). */
function detectRequestedDay(messageText: string): DayName | null {
  const lower = (messageText ?? "").toLowerCase().trim();
  if (!lower) return null;
  const dayTrigger =
    /\b(on|for|tomorrow is)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.exec(
      lower,
    ) ||
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(lunch|dinner|recommendations|picks|open)\b/i.exec(
      lower,
    ) ||
    /\b(place to eat|where to eat|eat|recommend|restaurant| lunch)\s+.*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.exec(
      lower,
    ) ||
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b(lunch|dinner|eat|place|restaurant)\b/i.exec(
      lower,
    );
  if (dayTrigger) {
    const day = dayTrigger[2] ?? dayTrigger[3];
    if (day && DAY_NAMES.includes(day as DayName)) return day as DayName;
  }
  return null;
}

function isLifestyleFact(text: string): boolean {
  const lower = text.toLowerCase();
  return LIFESTYLE_FACT_HINTS.some((h) => lower.includes(h));
}

export const kellyContextProvider: Provider = {
  name: "KELLY_CONTEXT",
  description:
    "Today's wellness tip, day of week, season (pool/gym), restaurants open today (SW France/Landes), and known lifestyle preferences from past feedback.",
  position: -5,

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<ProviderResult> => {
    const service = runtime.getService(
      "KELLY_LIFESTYLE_SERVICE",
    ) as KellyLifestyleService | null;

    const values: Record<string, unknown> = {};
    const textParts: string[] = [];

    const messageText = (message.content?.text ?? "") || "";
    const requestedDayLower = detectRequestedDay(messageText);
    const requestedDayCap =
      requestedDayLower
        ? requestedDayLower.charAt(0).toUpperCase() + requestedDayLower.slice(1)
        : null;

    if (service) {
      const wellnessTip = service.getWellnessTipOfTheDay?.() ?? "";
      const briefing = service.getDailyBriefing();
      const day =
        briefing.day.charAt(0).toUpperCase() + briefing.day.slice(1);
      const season = service.getCurrentSeason();

      values.kellyWellnessTip = wellnessTip;
      values.kellyDay = day;
      values.kellySeason = season;
      if (requestedDayCap) values.kellyRequestedDay = requestedDayCap;

      const nowParis = new Date().toLocaleString("en-GB", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const hourParis = new Date().toLocaleString("en-GB", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        hour12: false,
      });
      const minParis = new Date().toLocaleString("en-GB", {
        timeZone: "Europe/Paris",
        minute: "2-digit",
      });
      const hourNum = parseInt(hourParis, 10);
      const minNum = parseInt(minParis, 10);
      const minutesSinceMidnight = hourNum * 60 + minNum;
      const lunchCutoff = 14 * 60 + 30; // 14:30 - don't suggest lunch after this
      const lunchCutoffSunday = 15 * 60; // 15:00 - Maison Devaux Sun until 15:00
      const isSunday = day.toLowerCase() === "sunday";
      const pastLunch =
        minutesSinceMidnight >= (isSunday ? lunchCutoffSunday : lunchCutoff);

      values.kellyCurrentTimeParis = nowParis;
      values.kellyPastLunch = pastLunch;

      textParts.push(`Today's wellness tip: ${wellnessTip || "—"}`);
      textParts.push(`Day: ${day}`);
      textParts.push(
        pastLunch
          ? `**Current time (Europe/Paris):** ${nowParis}. CRITICAL: It is past lunch hours. Do NOT suggest lunch or "open until 3pm"—lunch is over. We almost NEVER go out for dinner—lunch only. Suggest pool, swim, walk, yoga, wine at home, or afternoon/evening activities instead. Never suggest a restaurant for dinner.`
          : `**Current time (Europe/Paris):** ${nowParis}. Lunch at Landes restaurants ends by 14:00–15:00. We almost never go out for dinner—lunch only. If suggesting lunch, confirm they can still make it.`,
      );
      if (requestedDayCap) {
        textParts.push(
          `**User asked for ${requestedDayCap}.** Use ${requestedDayCap}'s list below for this request; do not use today's list.`,
        );
      }
      textParts.push(
        `Season: ${season === "pool" ? "Pool (Apr–Nov)" : "Gym (Dec–Mar)"}`,
      );
      if (season === "gym") {
        const datesLine = service.getPalacePoolStatusLine();
        textParts.push(
          `**Swimming:** Backyard pool heating off until end Feb; consider 5/3 wetsuit or indoor swim. Palace pools: ${datesLine}. When a pool has reopened, say it's back open—don't say "reopens [date]" if that date has passed. When suggesting swim or pool, use the **Local** weather from context (if present) to tailor backyard vs indoor—e.g. cold or rain favors indoor; clear and mild can suit wetsuit in the backyard.`,
        );
      } else {
        textParts.push(
          "**Swimming:** Pool season. When suggesting a swim or pool, use the **Local** weather from context (if present) to tailor your suggestion—e.g. mention if it's good for the backyard or if they should wait for a warmer/clearer moment.",
        );
      }

      const dayForCurated = requestedDayLower ?? undefined;
      const curated = service.getCuratedOpenContext(dayForCurated);
      if (curated) {
        values.kellyRestaurantsOpenToday = curated.rawSection;
        const dayLabel = requestedDayCap ?? "today";
        if (curated.restaurants.length > 0) {
          textParts.push(
            `**Restaurants open ${dayLabel} (SW France / Landes):**\n${curated.restaurants.join("\n")}\nFor 'where to eat' in SW France or Landes, only suggest from this list${requestedDayCap ? ` for ${requestedDayCap}` : " when the user is asking for today"}.`,
          );
        } else {
          textParts.push(
            `**Restaurants open ${dayLabel}:** None in curated list. Suggest cooking at home or check MICHELIN Guide for exceptions.`,
          );
        }
      }
    } else {
      const now = new Date();
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      values.kellyDay = days[now.getDay()];
      values.kellySeason = "pool";
      values.kellyWellnessTip = "";
      if (requestedDayCap) values.kellyRequestedDay = requestedDayCap;
      const nowParis = now.toLocaleString("en-GB", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      values.kellyCurrentTimeParis = nowParis;
      textParts.push(`Day: ${values.kellyDay}`);
      textParts.push(
        `**Current time (Europe/Paris):** ${nowParis}. Do not suggest lunch if it's past 14:30 (or 15:00 on Sunday).`,
      );
      if (requestedDayCap) textParts.push(`**User asked for ${requestedDayCap}.**`);
      textParts.push("Season: pool");
    }

    textParts.push(
      "**Location context:** We are based in the Landes (between Bordeaux and Biarritz). Default for dining and hotels: within 2h drive from home — Landes (Hossegor, Magescq), Basque coast (Biarritz and up to ~1h south, e.g. Akelarre), Saint-Émilion, Arcachon. Do not default to Bordeaux city unless the user asks for Bordeaux.",
    );
    values.kellyLocationContext = "Landes (Hossegor, Magescq), Basque coast, Saint-Émilion, Arcachon — within 2h of home";
    textParts.push(
      "**Yoga:** Daily vinyasa (wife); surfer yoga pre/post surf; swimmer yoga pre/post pool in pool season. Use yoga-practice, daily-yoga-surfers-vinyasa, and yoga-vinyasa-surfers-swimmers for vinyasa, surfer, and swimmer recommendations.",
    );

    if (message.roomId) {
      try {
        const facts = await runtime.getMemories({
          tableName: "facts",
          roomId: message.roomId,
          count: 5,
          unique: true,
        });

        const lifestyleFacts = facts
          .map((m) => m.content?.text ?? "")
          .filter(Boolean)
          .filter(isLifestyleFact);

        if (lifestyleFacts.length > 0) {
          const prefsLine = lifestyleFacts.join(" ");
          values.kellyKnownPreferences = prefsLine;
          textParts.push(`Known preferences: ${prefsLine}`);
        }

        const preferCuisine = facts
          .map((m) => (m.content as Record<string, unknown>)?.preferredCuisine as string | undefined)
          .filter(Boolean);
        const preferVibe = facts
          .map((m) => (m.content as Record<string, unknown>)?.preferredVibe as string | undefined)
          .filter(Boolean);
        if (preferCuisine.length > 0 || preferVibe.length > 0) {
          const youPrefer: string[] = [];
          if (preferCuisine.length > 0) youPrefer.push(`cuisine: ${preferCuisine[preferCuisine.length - 1]}`);
          if (preferVibe.length > 0) youPrefer.push(`vibe: ${preferVibe[preferVibe.length - 1]}`);
          textParts.push(`You prefer: ${youPrefer.join("; ")}.`);
          values.kellyStructuredPreferences = youPrefer.join("; ");
        }

        const lastLovedHint = facts
          .map((m) => (m.content?.text ?? "").trim())
          .filter(Boolean)
          .find(
            (t) =>
              /loved|we'll go back|perfect|hit the mark|exactly what we wanted/i.test(t),
          );
        if (lastLovedHint) {
          const short = lastLovedHint.length > 120 ? lastLovedHint.slice(0, 117) + "…" : lastLovedHint;
          values.kellyLastLoved = short;
          textParts.push(`Last time you loved: ${short}`);
        }

        const lastRecommend = await runtime.getCache<{ type: string; query: string; pick: string }>(
          `kelly:lastRecommend:${message.roomId}`,
        );
        if (lastRecommend?.pick) {
          const line =
            lastRecommend.type === "wine"
              ? `Last time you asked for wine (${lastRecommend.query.slice(0, 50)}…), I suggested ${lastRecommend.pick}.`
              : `Last time you asked for ${lastRecommend.query}, I suggested ${lastRecommend.pick}.`;
          values.kellyLastRecommend = lastRecommend;
          textParts.push(line);
        }
      } catch {
        // ignore
      }
    }

    const text = textParts.join("\n");

    return {
      values,
      text,
    };
  },
};
