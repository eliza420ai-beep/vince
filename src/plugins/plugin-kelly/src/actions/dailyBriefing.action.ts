/**
 * KELLY_DAILY_BRIEFING — on-demand lifestyle briefing for Kelly
 *
 * Same flow as KELLY_LIFESTYLE_DAILY task: day-aware health, dining, hotels, wellness.
 * Uses KellyLifestyleService and shared briefing utilities; no trading content.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import {
  type LifestyleDataContext,
  getParisTimeAndPastLunch,
  buildLifestyleDataContext,
  generateLifestyleHumanBriefing,
  KELLY_FOOTER,
} from "../utils/briefing";

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

      const out = "Here's your day—\n\n" + output;
      await callback({
        text: out,
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
      { name: "{{user}}", content: { text: "What should I do today?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use the daily lifestyle briefing—it's day-aware and pulls from curated places open today (dining, hotels, health). I'll run it for you.",
          actions: ["KELLY_DAILY_BRIEFING"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Where's good for lunch today?" } },
      {
        name: "{{agent}}",
        content: {
          text: "The daily briefing has today's curated spots—I'll run it so you get places that are open.",
          actions: ["KELLY_DAILY_BRIEFING"],
        },
      },
    ],
  ],
};
