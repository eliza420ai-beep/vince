/**
 * KELLY_RECOMMEND_HOME_COOKING — dinner at home: Green Egg BBQ, Thermomix TM7, oven.
 *
 * We almost never go out for dinner — dinner is at home. This action suggests
 * what to cook tonight using lifestyle/home-cooking knowledge and local meat context.
 * One main pick + one alternative.
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

const HOME_COOKING_TRIGGERS = [
  "what to cook",
  "what should i cook",
  "dinner idea",
  "dinner ideas",
  "what for dinner",
  "what's for dinner",
  "whats for dinner",
  "tonight's dinner",
  "tonights dinner",
  "cook tonight",
  "bbq",
  "green egg",
  "thermomix",
  "something in the oven",
  "oven cook",
  "slow cook",
  "home cooking",
  "cook at home",
  "dinner at home",
  "what to make for dinner",
  "what to make tonight",
];

function wantsHomeCooking(text: string): boolean {
  const lower = text.toLowerCase();
  return HOME_COOKING_TRIGGERS.some((t) => lower.includes(t));
}

export const kellyRecommendHomeCookingAction: Action = {
  name: "KELLY_RECOMMEND_HOME_COOKING",
  similes: [
    "HOME_COOKING",
    "DINNER_AT_HOME",
    "BBQ",
    "GREEN_EGG",
    "THERMOMIX",
    "WHAT_TO_COOK",
  ],
  description:
    "Suggest what to cook for dinner at home: Green Egg BBQ, Thermomix TM7, long oven cooks, local meat. One main pick + one alternative from lifestyle/home-cooking knowledge.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsHomeCooking(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_HOME_COOKING] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 12000);

      // Detect cooking method preference from the message
      const lower = userAsk.toLowerCase();
      const wantsBBQ = lower.includes("bbq") || lower.includes("green egg") || lower.includes("grill");
      const wantsThermomix = lower.includes("thermomix");
      const wantsOven = lower.includes("oven") || lower.includes("slow cook") || lower.includes("slow-cook");

      let methodHint = "";
      if (wantsBBQ) methodHint = "The user wants to use the **Green Egg BBQ**. Focus on BBQ and grilling.";
      else if (wantsThermomix) methodHint = "The user wants to use the **Thermomix TM7**. Focus on dishes that shine with Thermomix (risotto, soups, sauces, slow cooks).";
      else if (wantsOven) methodHint = "The user wants a **long oven cook**. Focus on slow-roasted, braised, or baked dishes.";
      else methodHint = "Suggest the best method for tonight: Green Egg BBQ (at least once a week), Thermomix TM7, or long oven cook.";

      const weatherHome = state.values?.weatherHome as { condition: string; temp: number } | undefined;
      const weatherHint = weatherHome
        ? `Local weather: ${weatherHome.condition}, ${weatherHome.temp}°C. Use this — e.g. cold evening favors oven or Thermomix; warm clear evening is perfect for the Green Egg outside.`
        : "";

      const prompt = `You are Kelly, a concierge. The user wants a dinner-at-home idea.

"${userAsk}"

${methodHint}
${weatherHint}

Use ONLY the following context (lifestyle/home-cooking, local meat, the-good-life). ${NEVER_INVENT_LINE}

<context>
${knowledgeSnippet}
</context>

Rules:
- We have access to **high-quality local meat** (Landes, SW France).
- **Green Egg** BBQ at least once a week — smoke, grill, sear.
- **Thermomix TM7** for dishes hard without it — risotto, soups, precise sauces, slow cooks.
- **Long oven cooks** — slow-roasted shoulder, confit, braised short ribs, baked dishes.
- Suggest a **wine pairing** in one sentence (from wine-tasting knowledge if available).
- One main pick + one alternative. Concrete dish names, not "consider making something."
- If a specific method (BBQ, Thermomix, oven) was requested, both picks should use that method.

Output exactly:
1. **Tonight:** [Dish] — one sentence why + method (Green Egg / Thermomix / oven). One sentence wine pairing.
2. **Alternative:** [Dish] — one sentence why + method.

Output only the recommendation text, no XML or extra commentary.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const out = text
        ? "Here's a dinner idea—\n\n" + text
        : "I don't have a specific home cooking pick for that right now. Check lifestyle/home-cooking for Green Egg, Thermomix, and oven ideas.";
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_HOME_COOKING"],
      });

      logger.info("[KELLY_RECOMMEND_HOME_COOKING] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_HOME_COOKING] Error: ${error}`);
      await callback({
        text: "Dinner idea failed. Try asking for BBQ, Thermomix, or something in the oven.",
        actions: ["KELLY_RECOMMEND_HOME_COOKING"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "What should I cook tonight?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_HOME_COOKING for a dinner-at-home pick (Green Egg, Thermomix, or oven).",
          actions: ["KELLY_RECOMMEND_HOME_COOKING"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Green Egg tonight — what should I grill?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_HOME_COOKING for a BBQ pick.",
          actions: ["KELLY_RECOMMEND_HOME_COOKING"],
        },
      },
    ],
  ],
};
