/**
 * KELLY_ITINERARY — multi-day plan (e.g. 2 days in Bordeaux, weekend in Paris).
 * Uses the-good-life only; experience-prioritization and lifestyle-roi frameworks.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { NEVER_INVENT_LINE } from "../constants/safety";
import { getVoiceAvoidPromptFragment } from "../constants/voice";

export const kellyItineraryAction: Action = {
  name: "KELLY_ITINERARY",
  similes: ["ITINERARY", "TRIP_PLAN", "MULTI_DAY_PLAN", "WEEKEND_PLAN"],
  description:
    "Create a structured multi-day itinerary (hotel, lunch, dinner, activities) for a place using only the-good-life knowledge and experience-prioritization rules.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("itinerary") ||
      text.includes("plan me") ||
      text.includes("2 days") ||
      text.includes("3 days") ||
      text.includes("weekend in") ||
      (text.includes("trip to") && text.includes("plan")) ||
      (text.includes("days in") &&
        (text.includes("hotel") ||
          text.includes("eat") ||
          text.includes("food"))) ||
      /plan\s+(?:me\s+)?(?:a\s+)?\d+\s*day/i.test(text) ||
      /weekend\s+(?:in|to)\s+/i.test(text)
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_ITINERARY] Action fired");
    try {
      const state = await runtime.composeState(message);
      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 14000);

      const userAsk = (message.content?.text ?? "").trim();
      const wantCalendarFormat =
        /calendar|ical|copy-paste|copy paste|for notes|paste into/i.test(
          userAsk,
        );
      const formatInstruction = wantCalendarFormat
        ? " Format so it can be copy-pasted into a calendar or notes: short lines, times optional (e.g. 12:00 Lunch, 19:30 Dinner), place names clear."
        : "";

      const prompt = `You are Kelly, a concierge. The user wants a multi-day itinerary:

"${userAsk}"

Use ONLY the following context (the-good-life knowledge: luxury-hotels, michelin-restaurants, experience-prioritization-framework, lifestyle-roi-framework, within-2h-bordeaux-biarritz). ${NEVER_INVENT_LINE}

**Convention:** Assume a **1-night stay**. We usually have **lunch before check-in** and **lunch after check-out**. Structure every 2-day / weekend / road-trip plan like this:

**Day 1**
- Lunch: [Name from context] — before check-in
- Hotel: [Name from context] — check-in after lunch
- Dinner: [Name from context]

**Day 2**
- Check out. (Optional: breakfast at hotel or one activity/tasting from context.)
- Lunch: [Name from context] — after check-out

We have strong the-good-life content for **Bordeaux** (city and region), **Saint-Émilion**, **Landes**, **Basque coast**, **Biarritz**, **Paris**: luxury-hotels (e.g. Le Grand Hôtel Bordeaux, InterContinental, Les Sources de Caudalie, Yndo, La Grande Maison, Grand Barrail, Château Cordeillan-Bages) and michelin-restaurants (e.g. Le Pressoir d'Argent, La Grand'Vigne, Lafaurie-Peyraguey, Le Saint-James). **Always produce a concrete itinerary** with real hotel and restaurant names from the context for these places. Do not say "I don't have enough" for Bordeaux, Saint-Émilion, Biarritz, or Paris—use the names in the context. Only if the user asks for a city or region with no hotels or restaurants in the context, say so once and suggest MICHELIN Guide; then still give one hotel + one lunch or dinner from the context if any appear.

<context>
${knowledgeSnippet}
</context>

Output a short markdown itinerary with the structure above (only real places from the context).${formatInstruction}

Output only the itinerary, no XML or preamble. Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      const text = String(response).trim();

      const out = text
        ? "Here's your itinerary—\n\n" + text
        : "I couldn't build a full itinerary from my knowledge for that request. Check MICHELIN Guide or James Edition and I can still suggest a few picks.";
      await callback({
        text: out,
        actions: ["KELLY_ITINERARY"],
      });

      logger.info("[KELLY_ITINERARY] Itinerary sent");
    } catch (error) {
      logger.error(`[KELLY_ITINERARY] Error: ${error}`);
      await callback({
        text: "Itinerary failed. Try asking for a specific city and number of days, or check MICHELIN Guide / James Edition.",
        actions: ["KELLY_ITINERARY"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Plan me 2 days in Bordeaux" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_ITINERARY for a structured multi-day plan from the-good-life.",
          actions: ["KELLY_ITINERARY"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Weekend in Paris with great food" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_ITINERARY for a weekend plan.",
          actions: ["KELLY_ITINERARY"],
        },
      },
    ],
  ],
};
