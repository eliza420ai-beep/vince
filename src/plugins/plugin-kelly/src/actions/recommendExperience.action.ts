/**
 * KELLY_RECOMMEND_EXPERIENCE — one best pick + one alternative for one-off experiences
 * (wine tasting, spa, cooking class, guided tour) from the-good-life knowledge only.
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

const EXPERIENCE_TRIGGERS = [
  "recommend an experience",
  "special experience",
  "wine tasting",
  "spa day",
  "spa experience",
  "cooking class",
  "guided tour",
  "something special to do",
  "something special",
  "one-off experience",
  "tasting experience",
  "vineyard visit",
  "winery visit",
];

function extractExperienceQuery(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("wine tasting") || lower.includes("vineyard") || lower.includes("winery")) {
    return "wine tasting";
  }
  if (lower.includes("spa") || lower.includes("wellness")) {
    return "spa / wellness";
  }
  if (lower.includes("cooking class") || lower.includes("cooking")) {
    return "cooking class";
  }
  if (lower.includes("guided tour") || lower.includes("tour")) {
    return "guided tour";
  }
  return "special experience";
}

export const kellyRecommendExperienceAction: Action = {
  name: "KELLY_RECOMMEND_EXPERIENCE",
  similes: [
    "KELLY_RECOMMEND_EXPERIENCE",
    "RECOMMEND_EXPERIENCE",
    "EXPERIENCE_RECOMMENDATION",
  ],
  description:
    "Recommend exactly one best pick and one alternative for a one-off experience (wine tasting, spa, cooking class, guided tour) using only the-good-life knowledge.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return EXPERIENCE_TRIGGERS.some((t) => text.includes(t));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_EXPERIENCE] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const experienceType = extractExperienceQuery(userAsk);

      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 12000);

      if (
        knowledgeSnippet.length < 300 &&
        !knowledgeSnippet.toLowerCase().includes("wine") &&
        !knowledgeSnippet.toLowerCase().includes("spa") &&
        !knowledgeSnippet.toLowerCase().includes("tasting") &&
        !knowledgeSnippet.toLowerCase().includes("experience")
      ) {
        await callback({
          text: "I don't have enough in the-good-life for that kind of experience right now. Check MICHELIN Guide or James Edition for wine tastings, spas, and experiences.",
          actions: ["KELLY_RECOMMEND_EXPERIENCE"],
        });
        return;
      }

      const prompt = `You are Kelly, a concierge. The user wants a recommendation for: **${experienceType}** (one-off experience).

Use ONLY the following context (the-good-life: experience-prioritization-framework, wine-tasting, luxury-hotels with spa/experiences, lifestyle, within-2h-bordeaux-biarritz). ${NEVER_INVENT_LINE} Default to **Southwest France** (Bordeaux, Biarritz, Landes, Saint-Émilion, Basque coast) when the user does not specify a place.

<context>
${knowledgeSnippet}
</context>

Output exactly:
1. **Best pick:** [Name or experience] — one short sentence why (from context). Add one benefit-led sentence why this fits them.
2. **Alternative:** [Name or experience] — one short sentence why (from context).

Output only the recommendation text, no XML or extra commentary.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const out = text
        ? "Here's an experience for you—\n\n" + text
        : "I don't have enough in the-good-life for that experience right now. Check MICHELIN Guide or James Edition.";
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_EXPERIENCE"],
      });

      logger.info("[KELLY_RECOMMEND_EXPERIENCE] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_EXPERIENCE] Error: ${error}`);
      await callback({
        text: "Recommendation failed. Try asking for wine tasting, spa, or cooking class—or check MICHELIN Guide / James Edition.",
        actions: ["KELLY_RECOMMEND_EXPERIENCE"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Recommend a wine tasting experience near Bordeaux" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_EXPERIENCE for one best pick and one alternative from the-good-life.",
          actions: ["KELLY_RECOMMEND_EXPERIENCE"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Something special to do this weekend—spa or cooking?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_EXPERIENCE for one experience pick and one alternative.",
          actions: ["KELLY_RECOMMEND_EXPERIENCE"],
        },
      },
    ],
  ],
};
