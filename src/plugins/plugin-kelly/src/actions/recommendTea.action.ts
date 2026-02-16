/**
 * KELLY_RECOMMEND_TEA — morning or evening tea from Dammann Frères.
 *
 * Suggests by occasion and time of day: morning profiles (Darjeeling, Ceylon,
 * breakfast blends, Assam with milk, Yunnan, green) vs evening caffeine-free
 * (herbal, rooibos, fruit). One pick + one alternative, product names from
 * Dammann only. Uses lifestyle/tea-dammann-freres knowledge.
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

const TEA_TRIGGERS = [
  "recommend tea",
  "what tea",
  "tea for tonight",
  "tea for this evening",
  "evening tea",
  "morning tea",
  "tea with milk",
  "tea suggestion",
  "suggest a tea",
  "good tea for",
  "dammann",
  "which tea",
  "tea to drink",
  "caffeine free tea",
  "caffeine-free tea",
  "herbal tea",
  "rooibos",
  "green tea",
  "breakfast tea",
];

function wantsTeaRecommendation(text: string): boolean {
  const lower = text.toLowerCase();
  return TEA_TRIGGERS.some((t) => lower.includes(t));
}

type TeaTime = "morning" | "evening" | "general";

function detectTeaTime(text: string): TeaTime {
  const lower = text.toLowerCase();
  if (
    lower.includes("morning") ||
    lower.includes("breakfast") ||
    lower.includes("wake") ||
    lower.includes("start the day")
  ) {
    return "morning";
  }
  if (
    lower.includes("evening") ||
    lower.includes("tonight") ||
    lower.includes("before bed") ||
    lower.includes("caffeine free") ||
    lower.includes("caffeine-free") ||
    lower.includes("herbal") ||
    lower.includes("rooibos") ||
    lower.includes("wind down") ||
    lower.includes("relax")
  ) {
    return "evening";
  }
  return "general";
}

export const kellyRecommendTeaAction: Action = {
  name: "KELLY_RECOMMEND_TEA",
  similes: [
    "RECOMMEND_TEA",
    "TEA_RECOMMENDATION",
    "MORNING_TEA",
    "EVENING_TEA",
    "DAMMANN",
  ],
  description:
    "Recommend tea from Dammann Frères by occasion and time of day. Morning profiles (Darjeeling, Ceylon, green) or evening caffeine-free (herbal, rooibos, fruit). One pick + one alternative.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsTeaRecommendation(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_TEA] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const teaTime = detectTeaTime(userAsk);
      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 8000);

      const timeHint =
        teaTime === "morning"
          ? "The user wants a **morning tea**. Suggest wake-up profiles: Darjeeling, Ceylon, breakfast blends (English Breakfast, Irish Breakfast), Assam (with milk), Yunnan, or green tea. Caffeine is fine."
          : teaTime === "evening"
            ? "The user wants an **evening tea**. Must be **caffeine-free**: herbal, rooibos, fruit infusions, chamomile, verbena, mint. No black or green tea."
            : "Time of day not specified. Suggest based on context — if it's an energizing request lean morning profiles; if relaxing lean evening caffeine-free. Mention which is which.";

      const prompt = `You are Kelly, a concierge. The user wants a tea recommendation.

"${userAsk}"

${timeHint}

Use ONLY the following context (lifestyle/tea-dammann-freres and any preferences). ${NEVER_INVENT_LINE} Only suggest **Dammann Frères** products — do not suggest other brands.

<context>
${knowledgeSnippet}
</context>

Rules:
- **Morning:** Darjeeling (clean, bright), Ceylon (balanced), English/Irish Breakfast (robust, with or without milk), Assam (malty, best with milk), Yunnan (smooth, light smoke), green (Sencha, Gyokuro for energy without jitters).
- **Evening:** Rooibos (Earl Grey rooibos, vanilla rooibos — caffeine-free), herbal (chamomile, verbena, mint), fruit infusions. No caffeine.
- **With milk:** Assam or robust breakfast blends.
- **In a rush:** Sachets/bags; mention if Dammann has them for the pick.
- Use Dammann product names when available in context. If the context has specific Dammann references, use those exact names.
- One pick + one alternative. Mention the profile (what it tastes like, when to drink it).

Output exactly:
1. **Pick:** [Dammann product/type] — one sentence profile + when to drink. One sentence why this fits.
2. **Alternative:** [Dammann product/type] — one sentence profile.

Output only the recommendation text, no XML or extra commentary.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const out = text
        ? "Here's a tea pick—\n\n" + text
        : "I don't have a specific tea pick for that right now. Check Dammann Frères (dammann.fr) for their full range.";
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_TEA"],
      });

      logger.info("[KELLY_RECOMMEND_TEA] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_TEA] Error: ${error}`);
      await callback({
        text: "Tea recommendation failed. Try asking for morning or evening tea.",
        actions: ["KELLY_RECOMMEND_TEA"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What tea for this evening?" } },
      {
        name: "{{agent}}",
        content: {
          text: "**Rooibos Earl Grey** from Dammann—bergamot and rooibos, caffeine-free so you can enjoy it late. If you want something more floral and calming, **Tisane fleur d'oranger** (orange blossom, chamomile).",
          actions: ["KELLY_RECOMMEND_TEA"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Morning tea with milk?" } },
      {
        name: "{{agent}}",
        content: {
          text: "**Assam GFBOP** from Dammann—malty, full body, built for milk. Brews strong at 3–4 min, 95°C. If you want something lighter, **English Breakfast** (Dammann blend)—balanced, takes milk well, classic start.",
          actions: ["KELLY_RECOMMEND_TEA"],
        },
      },
    ],
  ],
};
