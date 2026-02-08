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

    if (service) {
      const wellnessTip = service.getWellnessTipOfTheDay?.() ?? "";
      const briefing = service.getDailyBriefing();
      const day =
        briefing.day.charAt(0).toUpperCase() + briefing.day.slice(1);
      const season = service.getCurrentSeason();

      values.kellyWellnessTip = wellnessTip;
      values.kellyDay = day;
      values.kellySeason = season;

      textParts.push(`Today's wellness tip: ${wellnessTip || "—"}`);
      textParts.push(`Day: ${day}`);
      textParts.push(
        `Season: ${season === "pool" ? "Pool (Apr–Nov)" : "Gym (Dec–Mar)"}`,
      );
      if (season === "gym") {
        const palaceDates = service.getPalacePoolReopenDates();
        const datesLine =
          Object.entries(palaceDates).length > 0
            ? Object.entries(palaceDates)
                .map(([k, v]) => `${k} reopens ${v}`)
                .join(", ")
            : "Palais reopens Feb 12, Caudalie Feb 5, Eugenie Mar 6";
        textParts.push(
          `**Swimming:** Backyard pool heating off until end Feb; consider 5/3 wetsuit or indoor swim. Palace pools: ${datesLine}.`,
        );
      }

      const curated = service.getCuratedOpenContext();
      if (curated) {
        values.kellyRestaurantsOpenToday = curated.rawSection;
        if (curated.restaurants.length > 0) {
          textParts.push(
            `**Restaurants open today (SW France / Landes):**\n${curated.restaurants.join("\n")}\nFor 'where to eat' in SW France or Landes, only suggest from this list when the user is asking for today.`,
          );
        } else {
          textParts.push(
            "**Restaurants open today:** None in curated list (Monday/Tuesday). Suggest cooking at home or check MICHELIN Guide for exceptions.",
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
      textParts.push(`Day: ${values.kellyDay}`);
      textParts.push("Season: pool");
    }

    textParts.push(
      "**Location context:** Southwest France (Bordeaux / Biarritz area). Default to this region for wine, dining, road trips, and daily suggestions unless the user specifies elsewhere.",
    );
    values.kellyLocationContext = "Southwest France (Bordeaux / Biarritz area)";
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
