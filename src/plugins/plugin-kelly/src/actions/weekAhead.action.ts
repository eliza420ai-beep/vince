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
import type { KellyLifestyleService } from "../services/lifestyle.service";

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

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
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

      const restLine = restaurants.length > 0 ? restaurants.slice(0, 8).join("; ") : "See curated-open-schedule by day";
      const hotelLine = hotels.length > 0 ? hotels.slice(0, 5).join("; ") : "See curated-open-schedule";

      const prompt = `You are Kelly, a concierge for five-star hotels, fine dining, and wellness. Give 3–5 concrete picks for THIS WEEK (dining, hotel, wellness).

Context:
- Season: ${season === "pool" ? "Pool (Apr–Nov)" : "Gym (Dec–Mar)"}
- Restaurants open this week (by day in curated list): ${restLine}
- Hotels this season: ${hotelLine}

Additional context from the-good-life:
${contextBlock.slice(0, 2000)}

Rules:
- 3–5 specific suggestions (name places). Mix dining, one hotel idea, one wellness/fitness idea.
- Only names from the-good-life or the curated lists. No invented names.
- Wednesday = best midweek escape day. Tuesday/Thursday = gastronomic lunch days.
- One short paragraph per pick or a tight list. Benefit-led, no jargon.
- No trading or markets.`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      await callback({
        text: text || "This week: check curated-open-schedule for restaurants by day and hotels by season; Wednesday is the best midweek escape day.",
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
      { name: "{{user1}}", content: { text: "What's the week ahead?" } },
      {
        name: "Kelly",
        content: {
          text: "**Wed:** Midweek escape—Relais de la Poste + lunch at Côté Quillier. **Thu:** Maison Devaux or Auberge du Lavoir for gastronomic lunch. **Fri:** Gastronomic lunch to close the week; dinner at home. **Wellness:** Pool session (pool season) or gym + mobility (gym season). One palace stay this week if you can—Palais or Caudalie once they reopen.",
          actions: ["KELLY_WEEK_AHEAD"],
        },
      },
    ],
  ],
};
