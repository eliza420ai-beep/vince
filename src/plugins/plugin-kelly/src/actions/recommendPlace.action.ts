/**
 * KELLY_RECOMMEND_PLACE — one best pick + one alternative for hotel or restaurant in a place.
 * Uses the-good-life knowledge only; no invented names.
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

type PlaceType = "hotel" | "restaurant";

function detectPlaceType(text: string): PlaceType {
  const lower = text.toLowerCase();
  if (
    lower.includes("hotel") ||
    lower.includes("where to stay") ||
    lower.includes("place to stay") ||
    lower.includes("stay in")
  ) {
    return "hotel";
  }
  return "restaurant";
}

function extractPlaceQuery(text: string): string {
  const patterns = [
    /(?:in|at|for)\s+([A-Za-z\s]+?)(?:\s+\d|$|\?|\.|,)/,
    /(?:best|recommend|where to (?:eat|stay)|great)\s+(?:hotel|restaurant)?\s*(?:in|at)?\s*([A-Za-z\s]+?)(?:\s*\?|$|\.|,)/i,
    /(?:hotel|restaurant)\s+(?:in|at)\s+([A-Za-z\s]+?)(?:\s*\?|$|\.|,)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return text.replace(/\?|\./g, "").trim().slice(-40) || "the area";
}

function isLandesOrSWFranceQuery(placeQuery: string): boolean {
  const lower = placeQuery.toLowerCase();
  return (
    lower.includes("landes") ||
    lower.includes("sw france") ||
    lower.includes("southwest france") ||
    lower.includes("south west france") ||
    lower.includes("the area") ||
    lower.includes("here") ||
    lower.includes("nearby") ||
    lower.includes("around") ||
    placeQuery.length < 4
  );
}

/** True when we have dedicated the-good-life content (Biarritz, Bordeaux, Basque, Landes, etc.). Never early-exit for these. */
function isDefaultRegionPlace(placeQuery: string): boolean {
  const lower = placeQuery.toLowerCase();
  return (
    lower.includes("biarritz") ||
    lower.includes("bordeaux") ||
    lower.includes("landes") ||
    lower.includes("basque") ||
    lower.includes("saint-émilion") ||
    lower.includes("saint emilion") ||
    lower.includes("arcachon") ||
    lower.includes("guéthary") ||
    lower.includes("guethary") ||
    lower.includes("saint-jean-de-luz") ||
    lower.includes("pays basque") ||
    isLandesOrSWFranceQuery(placeQuery)
  );
}

export const kellyRecommendPlaceAction: Action = {
  name: "KELLY_RECOMMEND_PLACE",
  similes: [
    "KELLY_RECOMMEND_HOTEL",
    "KELLY_RECOMMEND_RESTAURANT",
    "RECOMMEND_HOTEL",
    "RECOMMEND_RESTAURANT",
  ],
  description:
    "Recommend exactly one best pick and one alternative for a hotel or restaurant in a given place, using only the-good-life knowledge.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      (text.includes("recommend") &&
        (text.includes("hotel") ||
          text.includes("restaurant") ||
          text.includes("where to stay") ||
          text.includes("where to eat") ||
          text.includes("best hotel") ||
          text.includes("best restaurant"))) ||
      text.includes("where to stay") ||
      text.includes("where to eat") ||
      text.includes("open now") ||
      text.includes("open today") ||
      /best (?:hotel|restaurant) in/i.test(text)
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_PLACE] Action fired");
    try {
      const placeType = detectPlaceType(message.content?.text ?? "");
      const placeQuery = extractPlaceQuery(message.content?.text ?? "");

      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 12000);

      const inDefaultRegion = isDefaultRegionPlace(placeQuery);
      if (
        !inDefaultRegion &&
        knowledgeSnippet.length < 200 &&
        !knowledgeSnippet.toLowerCase().includes(placeQuery.toLowerCase().slice(0, 15))
      ) {
        await callback({
          text: `I don't have enough in the-good-life for **${placeQuery}**. Check MICHELIN Guide or James Edition for more options—I only recommend from my curated knowledge.`,
          actions: ["KELLY_RECOMMEND_PLACE"],
        });
        return;
      }

      const typeLabel = placeType === "hotel" ? "hotel" : "restaurant";
      const isGenericPlace =
        !placeQuery ||
        placeQuery.length < 4 ||
        /^(the area|here|nearby|around)$/i.test(placeQuery.trim());
      const applyOpenTodayFilter =
        typeLabel === "restaurant" &&
        (isGenericPlace || isLandesOrSWFranceQuery(placeQuery));

      let openTodayBlock = "";
      const lifestyleService = runtime.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      const requestedDay = state.values?.kellyRequestedDay as string | undefined;
      if (applyOpenTodayFilter && lifestyleService) {
        const dayOverride = requestedDay
          ? (requestedDay.toLowerCase() as
              | "monday"
              | "tuesday"
              | "wednesday"
              | "thursday"
              | "friday"
              | "saturday"
              | "sunday")
          : undefined;
        const curated = lifestyleService.getCuratedOpenContext(dayOverride);
        const day =
          requestedDay ??
          (state.values?.kellyDay as string) ??
          new Date().toLocaleDateString("en-US", { weekday: "long" });
        const dayLabel = requestedDay ? requestedDay : "today";
        if (curated) {
          const dayLower = day.toString().toLowerCase();
          const isMonOrTue = dayLower === "monday" || dayLower === "tuesday";
          if (curated.restaurants.length === 0) {
            openTodayBlock =
              (requestedDay
                ? `**User asked for ${requestedDay}.** `
                : `**Today is ${day}.** `) +
              `No curated restaurants open ${dayLabel}; say so and suggest checking MICHELIN Guide or cooking at home. Do not suggest Le Relais de la Poste or Côté Quillier for Monday or Tuesday—they are closed (Wed–Sun only).\n\n`;
          } else {
            const openList =
              (state.values?.kellyRestaurantsOpenToday as string) ??
              curated.rawSection;
            const favoritesOrClosedLine = isMonOrTue
              ? "\n\nLe Relais de la Poste and Côté Quillier are closed Monday and Tuesday (Wed–Sun only). Do not suggest them for Mon or Tue.\n\n"
              : "\n\nOur favorites in the Landes are in landes-locals (Maison Devaux, Auberge du Lavoir, Le Relais de la Poste, Côté Quillier, La Table du Marensin, etc.); prefer them when they're open.\n\n";
            openTodayBlock =
              (requestedDay
                ? `**User asked for ${requestedDay}.** Only recommend restaurants that are **open ${requestedDay}**. Restaurants open ${requestedDay}:\n`
                : `**Today is ${day}.** Only recommend restaurants that are **open today**. Restaurants open today:\n`) +
              openList +
              favoritesOrClosedLine;
          }
        }
      }

      const regionHint =
        "Default region: Southwest France, Landes (Bordeaux–Biarritz corridor). Prefer the-good-life knowledge for this region when the query is generic or does not specify a city." +
        (typeLabel === "restaurant" && isGenericPlace
          ? " For restaurant when no city is given, prefer Michelin Guide (Stars, Bib Gourmand) from the-good-life for Bordeaux, Biarritz, Basque coast, Landes, Saint-Émilion, Arcachon."
          : "");
      const defaultRegionHint =
        inDefaultRegion
          ? `\n**We have the-good-life content for ${placeQuery}** (michelin-restaurants, luxury-hotels, landes-locals). Use the context below; recommend one best pick and one alternative. Only say "I don't have a curated pick" if the context truly contains no ${typeLabel} names for this place.\n\n`
          : "";
      const prompt = `You are Kelly, a concierge. The user wants a ${typeLabel} recommendation in or near: **${placeQuery}**.

${openTodayBlock}${regionHint ? regionHint + "\n\n" : ""}${defaultRegionHint}

Use ONLY the following context (from the-good-life knowledge and preferences). Do not invent any names.

<context>
${knowledgeSnippet}
</context>

Output exactly:
1. **Best pick:** [Name] — one short sentence why (from context). Add one benefit-led sentence why this fits them (e.g. "You get a quiet table and the classic three-star experience").
2. **Alternative:** [Name] — one short sentence why (from context).

Only recommend restaurants that appear in the "Restaurants open [Day]" list above. **Never recommend Le Relais de la Poste or Côté Quillier for Monday or Tuesday**—they are closed (Wed–Sun only). If the user asked for a specific day (e.g. Monday), only suggest from the curated list for that day. If they asked for "open now" or "open today", only suggest from the curated list for today. If the list for that day is empty, say so and suggest MICHELIN Guide or cooking at home; do not suggest venues that are closed that day. If the context has no specific ${typeLabel}s for this place, say: "I don't have a curated pick for ${placeQuery} in my knowledge; check MICHELIN Guide or James Edition." For Biarritz, Bordeaux, Basque coast, Landes, Saint-Émilion, Arcachon we have dedicated the-good-life content—prefer giving one best pick and one alternative from the context; only say you don't have a curated pick if there are truly no ${typeLabel} names in the context above.

Output only the recommendation text, no XML or extra commentary. No jargon (no leverage, utilize, streamline, robust, etc.).`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      let text = String(response).trim();
      const reqDay = (requestedDay ?? state.values?.kellyRequestedDay) as string | undefined;
      if (reqDay) {
        const reqDayLower = reqDay.toString().toLowerCase();
        if (
          (reqDayLower === "monday" || reqDayLower === "tuesday") &&
          (text.includes("Relais de la Poste") || text.includes("Côté Quillier"))
        ) {
          text =
            text +
            "\n\nNote: Le Relais de la Poste and Côté Quillier are closed Mon–Tue (Wed–Sun only).";
        }
      }

      await callback({
        text: text || `I don't have enough in the-good-life for **${placeQuery}** right now. Check MICHELIN Guide or James Edition.`,
        actions: ["KELLY_RECOMMEND_PLACE"],
      });

      logger.info("[KELLY_RECOMMEND_PLACE] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_PLACE] Error: ${error}`);
      await callback({
        text: "Recommendation failed. Try asking for a specific city or check MICHELIN Guide / James Edition.",
        actions: ["KELLY_RECOMMEND_PLACE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Recommend a hotel in Bordeaux" } },
      {
        name: "Kelly",
        content: {
          text: "Use KELLY_RECOMMEND_PLACE for one best pick and one alternative from the-good-life.",
          actions: ["KELLY_RECOMMEND_PLACE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Where to eat in Paris?" } },
      {
        name: "Kelly",
        content: {
          text: "Use KELLY_RECOMMEND_PLACE for one restaurant pick and one alternative.",
          actions: ["KELLY_RECOMMEND_PLACE"],
        },
      },
    ],
  ],
};
