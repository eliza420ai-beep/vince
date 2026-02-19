/**
 * KELLY_WEEK_AHEAD — 3–5 suggestions for the week (dining, hotels, wellness).
 * Uses the-good-life and curated schedule.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { getVoiceAvoidPromptFragment } from "../constants/voice";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import { getParisTimeAndPastLunch } from "../utils/briefing";

const WEEK_AHEAD_TRIGGERS = [
  "week ahead",
  "this week's picks",
  "this week picks",
  "what to do this week",
  "week picks",
  "plan for the week",
];

function wantsWeekAhead(text: string): boolean {
  const lower = text.toLowerCase();
  return WEEK_AHEAD_TRIGGERS.some((t) => lower.includes(t));
}

export const kellyWeekAheadAction: Action = {
  name: "KELLY_WEEK_AHEAD",
  similes: ["WEEK_PICKS", "THIS_WEEK", "WEEK_SUGGESTIONS"],
  description:
    "Returns 3–5 suggestions for the week across dining, hotels, wellness from the-good-life and curated schedule.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsWeekAhead(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_WEEK_AHEAD] Action fired");
    try {
      const service = runtime.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      const state = await runtime.composeState(message);

      const curated = service?.getCuratedOpenContext() ?? null;
      const restaurants = curated?.restaurants ?? [];
      const hotels = curated?.hotels ?? [];
      const season = service?.getCurrentSeason() ?? "pool";
      const contextBlock = typeof state.text === "string" ? state.text : "";

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const today = dayNames[new Date().getDay()] ?? "Monday";
      const { currentTimeParis: timeParis, pastLunch } =
        getParisTimeAndPastLunch(today);

      const restLine =
        restaurants.length > 0
          ? restaurants.slice(0, 8).join("; ")
          : "See curated-open-schedule by day";
      const hotelLine =
        hotels.length > 0
          ? hotels.slice(0, 5).join("; ")
          : "See curated-open-schedule";
      const palacePoolLine =
        season === "gym" ? (service?.getPalacePoolStatusLine() ?? "") : "";
      const weatherSummary = (state.values?.weatherSummary as string) ?? "";
      const weatherLine = weatherSummary || "Weather unavailable.";

      const timeRule = pastLunch
        ? `CRITICAL: It is ${timeParis} on ${today} — past lunch hours. Do NOT suggest ${today} lunch (it's over). "Week ahead" means the UPCOMING part of the week: suggest Wed–Sat lunch, not today. We almost never go out for dinner—lunch only.`
        : `Current time: ${timeParis} on ${today}. If suggesting lunch for today, confirm they can still make it (lunch ends 14:00–15:00).`;

      const prompt = `You are Kelly, a concierge for five-star hotels, fine dining, and wellness. Give 3–5 concrete picks for THIS WEEK (dining, hotel, wellness).

Context:
- Season: ${season === "pool" ? "Pool (Apr–Nov)" : "Gym (Dec–Mar)"}
- Today: ${today}, current time Europe/Paris: ${timeParis}
- ${timeRule}
- Restaurants open this week (by day in curated list): ${restLine}
- Hotels this season: ${hotelLine}${palacePoolLine ? `\n- Palace pools: ${palacePoolLine}` : ""}
- Current weather (use this, do not assume): ${weatherLine}

Additional context from the-good-life:
${contextBlock.slice(0, 2000)}

Rules:
- 3–5 specific suggestions (name places). Mix dining, one hotel idea, one wellness/fitness idea.
- Only names from the-good-life or the curated lists. No invented names.
- Wednesday = best midweek escape day. Tuesday/Thursday = gastronomic lunch days.
- Never suggest today's lunch if it's already past lunch hours. "Week ahead" = upcoming days, not things that are over.
- Weather: Use the current weather line above. Do NOT mention rain, "watch the rain", or assume bad weather unless the weather explicitly says rain/storm. If it says clear, partly cloudy, overcast, etc.—describe the actual conditions or skip weather in your suggestions.
- One short paragraph per pick or a tight list. Benefit-led, no jargon.
- No trading or markets.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const out = text
        ? "Here's the week ahead—\n\n" + text
        : "This week: check curated-open-schedule for restaurants by day and hotels by season; Wednesday is the best midweek escape day.";
      await callback({
        text: out,
        actions: ["KELLY_WEEK_AHEAD"],
      });
    } catch (error) {
      logger.error("[KELLY_WEEK_AHEAD] Error:", error);
      await callback({
        text: "Week picks are glitching. Check the-good-life and curated-open-schedule for dining by day and hotels this season.",
        actions: ["REPLY"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What's the week ahead?" } },
      {
        name: "{{agent}}",
        content: {
          text: "**Wed:** Midweek escape—Relais de la Poste + lunch at Côté Quillier. **Thu:** Maison Devaux or Auberge du Lavoir for gastronomic lunch. **Fri:** Gastronomic lunch to close the week; dinner at home. **Wellness:** Pool session (pool season) or gym + mobility (gym season). One palace stay this week if you can—Palais or Caudalie once they reopen.",
          actions: ["KELLY_WEEK_AHEAD"],
        },
      },
    ],
  ],
};
