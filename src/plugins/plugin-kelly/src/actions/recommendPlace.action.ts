/**
 * KELLY_RECOMMEND_PLACE — one best pick + one alternative for hotel or restaurant in a place.
 * Uses the-good-life knowledge only; no invented names.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import {
  MON_TUE_CLOSED_LINE,
  PAST_LUNCH_INSTRUCTION,
  NEVER_INVENT_LINE,
} from "../constants/safety";
import { getVoiceAvoidPromptFragment } from "../constants/voice";
import {
  loadPlacesAllowlist,
  allNamesOnAllowlist,
  getNamesOffAllowlist,
  extractRecommendationNames,
} from "../utils/recommendationGuards";

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
  const lower = text.toLowerCase();
  if (
    lower.includes("near me") ||
    lower.includes("within 2h") ||
    lower.includes("within 2 hours") ||
    lower.includes("within two hours")
  ) {
    return "the area";
  }
  // "Where should I stay this weekend?" / "where to stay?" = no specific place → default region so we pull full the-good-life (hotels, Landes, Basque, etc.)
  if (
    /\bwhere\s+(?:should\s+I|to|can\s+I)\s+stay\b/i.test(text) &&
    (/\b(this\s+weekend|next\s+week|(?:for\s+)?the\s+weekend|somewhere|a\s+place)\b/i.test(
      lower,
    ) ||
      /\bwhere\s+(?:should\s+I|to|can\s+I)\s+stay\s*[?.!]*$/i.test(text.trim()))
  ) {
    return "the area";
  }
  const patterns = [
    // "eat in X", "go eat in X", "lunch in X", "dinner in X" + optional "tomorrow"/"today"
    /(?:eat|go eat|wanna go eat|lunch|dinner)\s+(?:in|at)\s+([A-Za-z\s\-']+?)(?:\s+tomorrow|\s+today|\s*\?|$|\.|,)/i,
    // "in X tomorrow" / "in X today"
    /in\s+([A-Za-z\s\-']+?)\s+(?:tomorrow|today)(?:\s|$|\?|\.|,)/i,
    // existing: "in/at/for Place"
    /(?:in|at|for)\s+([A-Za-z\s\-']+?)(?:\s+\d|$|\?|\.|,)/,
    /(?:best|recommend|where to (?:eat|stay)|great)\s+(?:hotel|restaurant)?\s*(?:in|at)?\s*([A-Za-z\s\-']+?)(?:\s*\?|$|\.|,)/i,
    /(?:hotel|restaurant)\s+(?:in|at)\s+([A-Za-z\s\-']+?)(?:\s*\?|$|\.|,)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      let place = m[1].trim().replace(/\s+/g, " ");
      // Strip trailing "tomorrow"/"today" if captured
      place = place.replace(/\s+(tomorrow|today)$/i, "").trim();
      // If result is a single known place-like token, use it; else take first word for very long captures
      if (place.length > 0 && place.length <= 50) return place;
      if (place.length > 50) return place.split(/\s+/)[0] ?? place.slice(0, 40);
    }
  }
  return text.replace(/\?|\./g, "").trim().slice(-40) || "the area";
}

function isLandesOrSWFranceQuery(placeQuery: string): boolean {
  const lower = placeQuery.toLowerCase();
  return (
    lower.includes("landes") ||
    lower.includes("hossegor") ||
    lower.includes("magescq") ||
    lower.includes("sw france") ||
    lower.includes("southwest france") ||
    lower.includes("south west france") ||
    lower.includes("the area") ||
    lower.includes("here") ||
    lower.includes("nearby") ||
    lower.includes("near me") ||
    lower.includes("around") ||
    lower.includes("within 2h") ||
    lower.includes("within 2 hours") ||
    placeQuery.length < 4
  );
}

/** True when we have dedicated the-good-life content (Landes, Biarritz, Basque, Saint-Émilion, etc.). Never early-exit for these. */
function isDefaultRegionPlace(placeQuery: string): boolean {
  const lower = placeQuery.toLowerCase();
  return (
    lower.includes("landes") ||
    lower.includes("hossegor") ||
    lower.includes("magescq") ||
    lower.includes("biarritz") ||
    lower.includes("basque") ||
    lower.includes("akelarre") ||
    lower.includes("saint-émilion") ||
    lower.includes("saint emilion") ||
    lower.includes("arcachon") ||
    lower.includes("guéthary") ||
    lower.includes("guethary") ||
    lower.includes("saint-jean-de-luz") ||
    lower.includes("pays basque") ||
    lower.includes("bordeaux") ||
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

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
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
      /where\s+(?:should\s+I|to|can\s+I)\s+stay/i.test(text) ||
      text.includes("where to eat") ||
      text.includes("open now") ||
      text.includes("open today") ||
      /best (?:hotel|restaurant) in/i.test(text) ||
      // dining intent: eat in X, go eat, lunch/dinner in X, place to eat
      /\b(?:eat|go eat|wanna go eat)\s+(?:in|at)\b/i.test(text) ||
      /\b(?:lunch|dinner)\s+(?:in|at)\b/i.test(text) ||
      /\b(?:in|at)\s+[a-z\s\-']+\s+(?:tomorrow|today)\b/i.test(text) ||
      /where should I eat|place to eat|somewhere to eat/i.test(text)
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[KELLY_RECOMMEND_PLACE] Action fired");
    try {
      const placeType = detectPlaceType(message.content?.text ?? "");
      const placeQuery = extractPlaceQuery(message.content?.text ?? "");

      const state = await runtime.composeState(message);

      let contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      let knowledgeSnippet = contextBlock.slice(0, 12000);

      const placeSlice = placeQuery.toLowerCase().slice(0, 20);
      const inDefaultRegion = isDefaultRegionPlace(placeQuery);
      const isGenericPlaceQuery =
        /^(the area|here|nearby|around)$/i.test(placeQuery.trim()) ||
        placeQuery.length < 3;
      const needsPlaceContext =
        !isGenericPlaceQuery &&
        (knowledgeSnippet.length < 800 ||
          !knowledgeSnippet.toLowerCase().includes(placeSlice));
      // For generic / default-region queries ("the area", "within 2h of home"), explicitly ask for Landes/Basque/SW France content so RAG retrieves landes-locals, landes-coast, landes-interior.
      const needsDefaultRegionContext =
        (isGenericPlaceQuery || isLandesOrSWFranceQuery(placeQuery)) &&
        knowledgeSnippet.length < 1500;
      if (
        (needsPlaceContext || needsDefaultRegionContext) &&
        typeof runtime.composeState === "function"
      ) {
        const defaultRegionKeywords =
          "Landes Hossegor Magescq landes-locals landes-coast landes-interior Basque Biarritz Saint-Émilion Arcachon within 2h dining restaurant hotel the-good-life michelin " +
          "biarritz-region bordeaux-region southwest-france-extended basque-coast southwest-france-michelin-stars-complete basque-country-northern-spain";
        const syntheticText =
          isGenericPlaceQuery || inDefaultRegion
            ? defaultRegionKeywords
            : `restaurant ${placeQuery} hotel ${placeQuery} dining the-good-life michelin`;
        const syntheticMessage: Memory = {
          ...message,
          content: {
            ...message.content,
            text: syntheticText,
          },
        };
        try {
          const statePlace = await runtime.composeState(syntheticMessage);
          const placeBlock =
            typeof statePlace.text === "string"
              ? statePlace.text
              : [statePlace.text].filter(Boolean).join("\n");
          if (placeBlock.length > 0) {
            contextBlock = contextBlock + "\n\n" + placeBlock;
            knowledgeSnippet = contextBlock.slice(0, 12000);
            logger.debug(
              "[KELLY_RECOMMEND_PLACE] Appended place-aware knowledge",
            );
          }
        } catch (err) {
          logger.debug(
            `[KELLY_RECOMMEND_PLACE] Place-aware composeState skipped: ${err}`,
          );
        }
      }

      // Only early-exit when context is clearly empty (no place-specific content). Let the model decide otherwise.
      const hasPlaceInContext =
        knowledgeSnippet.length >= 50 &&
        knowledgeSnippet.toLowerCase().includes(placeSlice);
      if (
        !inDefaultRegion &&
        knowledgeSnippet.length < 50 &&
        !hasPlaceInContext
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
      const requestedDay = state.values?.kellyRequestedDay as
        | string
        | undefined;
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
              `No curated restaurants open ${dayLabel}; say so and suggest checking MICHELIN Guide or cooking at home. ${MON_TUE_CLOSED_LINE}\n\n`;
          } else {
            const openList =
              (state.values?.kellyRestaurantsOpenToday as string) ??
              curated.rawSection;
            const favoritesOrClosedLine = isMonOrTue
              ? `\n\n${MON_TUE_CLOSED_LINE}\n\n`
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
        "Default: within 2h drive from home. Prefer the-good-life for: Landes (Hossegor, Magescq, landes-locals), Basque coast (Biarritz and up to ~1h south, e.g. Akelarre), Saint-Émilion, Arcachon. Do not default to Bordeaux city unless the user asks for Bordeaux." +
        (typeLabel === "restaurant" && isGenericPlace
          ? " For restaurant when no city is given, use landes-locals and curated-open-schedule (restaurants open today); prefer Landes and Basque coast. Only suggest places within 2h of home."
          : "");
      const defaultRegionHint = inDefaultRegion
        ? `\n**We have the-good-life content for ${placeQuery}** (michelin-restaurants, luxury-hotels, landes-locals). Use the context below; recommend one best pick and one alternative. We have the-good-life content for this region—use it; only suggest MICHELIN/James if the context above has zero venue names for this place.\n\n`
        : "";
      const useContextFirst =
        'Prefer one best pick and one alternative from the context. If the context mentions any restaurant or hotel for this place or region, recommend from that list; do not say you have no pick. Only say "I don\'t have a curated pick for [place] in my knowledge; check MICHELIN Guide or James Edition" when the context truly contains no ' +
        typeLabel +
        " names for this place.";
      const prompt = `You are Kelly, a concierge. The user wants a ${typeLabel} recommendation in or near: **${placeQuery}**.

${openTodayBlock}${regionHint ? regionHint + "\n\n" : ""}${defaultRegionHint}

Use ONLY the following context (from the-good-life knowledge and preferences). ${NEVER_INVENT_LINE}

<context>
${knowledgeSnippet}
</context>

Output exactly:
1. **Best pick:** [Name] — one short sentence why (from context). Add one benefit-led sentence why this fits them (e.g. "You get a quiet table and the classic three-star experience").
2. **Alternative:** [Name] — one short sentence why (from context).

${useContextFirst}

${openTodayBlock ? `Only recommend restaurants that appear in the "Restaurants open [Day]" list above. **Never recommend for Monday or Tuesday:** ${MON_TUE_CLOSED_LINE} If the list for that day is empty, say so and suggest MICHELIN Guide or cooking at home.` : `The user asked for a **specific place (${placeQuery})**, not "open today" or "the area". Recommend one best pick and one alternative **from the context above** for ${placeQuery}. Do NOT restrict to a "restaurants open today" list—we do not have that list for ${placeQuery}. Use the michelin-restaurants and the-good-life content in the context. **Never recommend for Monday or Tuesday:** ${MON_TUE_CLOSED_LINE}`} For Landes (Hossegor, Magescq), Basque coast (Biarritz, Akelarre), Saint-Émilion, Arcachon, Bordeaux we have the-good-life content—prefer one best pick and one alternative from the context; only say you don't have a curated pick if there are truly no ${typeLabel} names in the context above.

Output only the recommendation text, no XML or extra commentary.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}${openTodayBlock ? `\n\n${PAST_LUNCH_INSTRUCTION}` : ""}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      let text = String(response).trim();
      if (!text) {
        logger.debug("[KELLY_RECOMMEND_PLACE] Used fallback (empty response)");
      }
      const reqDay = (requestedDay ?? state.values?.kellyRequestedDay) as
        | string
        | undefined;
      if (reqDay) {
        const reqDayLower = reqDay.toString().toLowerCase();
        if (
          (reqDayLower === "monday" || reqDayLower === "tuesday") &&
          (text.includes("Relais de la Poste") ||
            text.includes("Côté Quillier"))
        ) {
          text =
            text +
            "\n\nNote: Le Relais de la Poste and Côté Quillier are closed Mon–Tue (Wed–Sun only).";
        }
      }

      const allowlist = loadPlacesAllowlist();
      if (
        text &&
        allowlist.length > 0 &&
        !allNamesOnAllowlist(text, allowlist)
      ) {
        const offList = getNamesOffAllowlist(text, allowlist);
        const anyOffListInContext =
          offList.length > 0 &&
          offList.some((name) =>
            knowledgeSnippet.toLowerCase().includes(name.toLowerCase()),
          );
        if (!anyOffListInContext) {
          logger.debug(
            "[KELLY_RECOMMEND_PLACE] Response guard: replacing off-allowlist names with fallback",
          );
          text = `I don't have enough in the-good-life for **${placeQuery}** right now. Check MICHELIN Guide or James Edition.`;
        } else {
          logger.debug(
            "[KELLY_RECOMMEND_PLACE] Response guard: off-allowlist name(s) appear in context; keeping response",
          );
        }
      }

      const out = text
        ? "Here's a place for you:\n\n" + text
        : `I don't have enough in the-good-life for **${placeQuery}** right now. Check MICHELIN Guide or James Edition.`;
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_PLACE"],
      });

      if (
        message.roomId &&
        text &&
        allowlist.length > 0 &&
        allNamesOnAllowlist(text, allowlist) &&
        typeof runtime.setCache === "function"
      ) {
        const names = extractRecommendationNames(text);
        if (names.length > 0) {
          await runtime.setCache(`kelly:lastRecommend:${message.roomId}`, {
            type: "place",
            query: placeQuery,
            pick: names[0],
          });
        }
      }

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
      { name: "{{user}}", content: { text: "Recommend a hotel in Bordeaux" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_PLACE for one best pick and one alternative from the-good-life.",
          actions: ["KELLY_RECOMMEND_PLACE"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Where to eat in Paris?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_PLACE for one restaurant pick and one alternative.",
          actions: ["KELLY_RECOMMEND_PLACE"],
        },
      },
    ],
  ],
};
