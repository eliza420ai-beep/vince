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

export const kellyItineraryAction: Action = {
  name: "KELLY_ITINERARY",
  similes: [
    "ITINERARY",
    "TRIP_PLAN",
    "MULTI_DAY_PLAN",
    "WEEKEND_PLAN",
  ],
  description:
    "Create a structured multi-day itinerary (hotel, lunch, dinner, activities) for a place using only the-good-life knowledge and experience-prioritization rules.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("itinerary") ||
      text.includes("plan me") ||
      text.includes("2 days") ||
      text.includes("3 days") ||
      text.includes("weekend in") ||
      (text.includes("trip to") && text.includes("plan")) ||
      (text.includes("days in") && (text.includes("hotel") || text.includes("eat") || text.includes("food"))) ||
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
      const wantCalendarFormat = /calendar|ical|copy-paste|copy paste|for notes|paste into/i.test(userAsk);
      const formatInstruction = wantCalendarFormat
        ? " Format so it can be copy-pasted into a calendar or notes: short lines, times optional (e.g. 12:00 Lunch, 19:30 Dinner), place names clear."
        : "";

      const prompt = `You are Kelly, a concierge. The user wants a multi-day itinerary:

"${userAsk}"

Use ONLY the following context (the-good-life knowledge, experience-prioritization-framework, lifestyle-roi-framework, within-2h-bordeaux-biarritz). Do not invent any names. Apply:
- **When to do what:** midweek vs weekend, peak vs routine, energy level (experience-prioritization-framework).
- **ROI of experiences:** time/energy/memory (lifestyle-roi-framework).
- **Road trips / day trips:** We are based in the Landes (between Bordeaux and Biarritz). Only suggest places within 2h drive from home (see within-2h-bordeaux-biarritz). Default region: Southwest France.
- Prefer Wednesday for midweek escape; avoid inventing places.

<context>
${knowledgeSnippet}
</context>

Output a short markdown itinerary with this structure (only real places from the context).${formatInstruction}

**Day 1**
- Hotel: [Name from context]
- Lunch: [Name from context]
- Dinner: [Name from context]
(optional: one activity or note)

**Day 2**
- (e.g. Tasting at [Name] or activity)
- Lunch: [Name from context]
- (optional dinner or departure note)

If the context has little for this place, say: "I don't have enough in the-good-life for a full itinerary there; check MICHELIN Guide and James Edition, and I can still suggest one hotel + one dinner from my knowledge."

Output only the itinerary (or the fallback sentence), no XML or preamble.`;

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
      const text = String(response).trim();

      await callback({
        text: text || "I couldn't build a full itinerary from my knowledge for that request. Check MICHELIN Guide or James Edition and I can still suggest a few picks.",
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
      { name: "{{user1}}", content: { text: "Plan me 2 days in Bordeaux" } },
      {
        name: "Kelly",
        content: {
          text: "Use KELLY_ITINERARY for a structured multi-day plan from the-good-life.",
          actions: ["KELLY_ITINERARY"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "Weekend in Paris with great food" } },
      {
        name: "Kelly",
        content: {
          text: "Use KELLY_ITINERARY for a weekend plan.",
          actions: ["KELLY_ITINERARY"],
        },
      },
    ],
  ],
};
