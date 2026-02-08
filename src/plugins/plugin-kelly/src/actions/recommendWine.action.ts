/**
 * KELLY_RECOMMEND_WINE — one main wine recommendation + one alternative.
 * Uses wine-tasting, sommelier-playbook, SW France/Bordeaux default when region unspecified.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const WINE_TRIGGERS = [
  "recommend wine",
  "what wine",
  "wine for dinner",
  "pairing for",
  "bottle for tonight",
  "wine with",
  "wine to go with",
  "best wine for",
  "what to drink",
  "wine suggestion",
  "suggest a wine",
  "good wine for",
];

function wantsWineRecommendation(text: string): boolean {
  const lower = text.toLowerCase();
  return WINE_TRIGGERS.some((t) => lower.includes(t));
}

export const kellyRecommendWineAction: Action = {
  name: "KELLY_RECOMMEND_WINE",
  similes: ["RECOMMEND_WINE", "WINE_RECOMMENDATION", "WINE_PAIRING"],
  description:
    "Recommend one main wine and one alternative with tasting note and pairing; default to Southwest France/Bordeaux when region unspecified. Uses sommelier-playbook and wine-tasting knowledge.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsWineRecommendation(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_WINE] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 12000);

      const weatherNote =
        knowledgeSnippet.toLowerCase().includes("do not recommend beach") ||
        knowledgeSnippet.toLowerCase().includes("rain") ||
        knowledgeSnippet.toLowerCase().includes("storm")
          ? " If the weather context in the context block indicates rain or storm, do not suggest outdoor terrace or picnic; prefer at-home or wine bar."
          : "";

      const prompt = `You are Kelly, the private sommelier. The user asks: "${userAsk}"

Use ONLY the following context (the-good-life: wine-tasting, sommelier-playbook, and any preferences). Default to **Southwest France and Bordeaux** (Margaux, Pauillac, Saint-Émilion, Sauternes, Pessac-Léognan, Bergerac, Buzet) when the user does not specify a region. Use precise tasting language (structure, acidity, finish, minerality) and one-sentence pairing or occasion. Add service (temperature, decanting) when relevant.${weatherNote}

<context>
${knowledgeSnippet}
</context>

Output exactly:
1. **Pick:** [Wine/producer] — one sentence tasting + one sentence pairing/occasion. Add one short benefit-led sentence why this fits them (e.g. "You get a clear, confident pick that works with the dish.").
2. **Alternative:** [Wine/producer] — one sentence tasting + one sentence pairing/occasion.

Output only the recommendation text, no XML or extra commentary. No jargon (no leverage, utilize, streamline, robust, etc.).`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      await callback({
        text: text || "I don't have a specific wine pick for that in my knowledge—tell me the dish or occasion and I'll try again.",
        actions: ["KELLY_RECOMMEND_WINE"],
      });

      logger.info("[KELLY_RECOMMEND_WINE] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_WINE] Error: ${error}`);
      await callback({
        text: "Wine recommendation failed. Try asking again with the dish or occasion.",
        actions: ["KELLY_RECOMMEND_WINE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Recommend a wine for tonight" } },
      {
        name: "Kelly",
        content: {
          text: "Use KELLY_RECOMMEND_WINE for one pick and one alternative, default SW France/Bordeaux.",
          actions: ["KELLY_RECOMMEND_WINE"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "What wine with lamb?" } },
      {
        name: "Kelly",
        content: {
          text: "Use KELLY_RECOMMEND_WINE for pairing with tasting note and service.",
          actions: ["KELLY_RECOMMEND_WINE"],
        },
      },
    ],
  ],
};
