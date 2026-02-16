/**
 * KELLY_RECOMMEND_ROWING — water rowing for surf and swim fitness.
 *
 * The user has a water rowing machine at home and wants to use it more.
 * Suggests workouts tailored to surf and swim fitness from
 * lifestyle/water-rowing-surf-swim-fit knowledge.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { getVoiceAvoidPromptFragment } from "../constants/voice";
import type { KellyLifestyleService } from "../services/lifestyle.service";

const ROWING_TRIGGERS = [
  "rowing",
  "rowing machine",
  "water rower",
  "row today",
  "rowing workout",
  "surf fit",
  "swim fit",
  "indoor cardio",
  "erg",
  "rower workout",
];

function wantsRowing(text: string): boolean {
  const lower = text.toLowerCase();
  // "forecast" or "conditions" → surf forecast, not rowing
  if (lower.includes("forecast") || lower.includes("conditions")) return false;
  return ROWING_TRIGGERS.some((t) => lower.includes(t));
}

export const kellyRecommendRowingAction: Action = {
  name: "KELLY_RECOMMEND_ROWING",
  similes: [
    "ROWING_WORKOUT",
    "WATER_ROWER",
    "SURF_FIT",
    "SWIM_FIT",
    "INDOOR_CARDIO",
  ],
  description:
    "Rowing workout for surf and swim fitness. Uses lifestyle/water-rowing-surf-swim-fit. One concrete session + benefit.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsRowing(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_ROWING] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const state = await runtime.composeState(message);
      const service = runtime.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;

      const season = service?.getCurrentSeason() ?? "pool";
      const contextBlock =
        typeof state.text === "string" ? state.text : "";
      const knowledgeSnippet = contextBlock.slice(0, 6000);

      const weatherHome = state.values?.weatherHome as
        | { condition: string; temp: number }
        | undefined;
      const weatherHint = weatherHome
        ? `Local weather: ${weatherHome.condition}, ${weatherHome.temp}°C. Use this — e.g. cold/rainy day is perfect for rowing indoors instead of outdoor swim.`
        : "";

      // Detect if they want surf-specific or swim-specific
      const lower = userAsk.toLowerCase();
      const wantsSurf = lower.includes("surf");
      const wantsSwim = lower.includes("swim");
      const focusHint = wantsSurf
        ? "Focus on **surf fitness**: paddle power (long pulls), explosive starts (interval sprints), shoulder endurance."
        : wantsSwim
          ? "Focus on **swim fitness**: steady-state cardio, breathing rhythm, shoulder and lat endurance."
          : "General rowing for surf and swim fitness — mix steady-state and intervals.";

      const prompt = `You are Kelly, a fitness concierge. The user wants a rowing workout.

"${userAsk}"

Context:
- They have a **water rowing machine** at home and want to use it more.
- Season: ${season === "pool" ? "Pool (Apr–Nov)" : "Gym (Dec–Mar)"}
- ${focusHint}
${weatherHint}

Knowledge (lifestyle/water-rowing-surf-swim-fit):
${knowledgeSnippet}

Rules:
- One concrete rowing session: duration, structure (warm-up, main set, cool-down), stroke rate targets.
- Connect it to surf/swim benefit: "this builds paddle endurance" or "this matches the effort pattern of a 1000m swim."
- In gym season (Dec–Mar), rowing is a great alternative to outdoor swim — mention this.
- Keep it short: one session description + one sentence on the benefit.
- If context has specific water-rowing workouts, use those. Otherwise give a solid general session.

Output exactly:
1. **Session:** [Duration + structure] — e.g. "20 min: 5 min warm-up at 20 spm, 4x3 min at 26-28 spm with 1 min easy, 3 min cool-down."
2. **Why:** One sentence connecting to surf/swim fitness.

Output only the text, no XML. Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const out = text
        ? "Here's a rowing session—\n\n" + text
        : "For surf/swim fit: 20 min on the rower — 5 min warm-up, 4x3 min intervals at higher rate, cool down. Builds the same paddle and pull endurance you need in the water.";
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_ROWING"],
      });

      logger.info("[KELLY_RECOMMEND_ROWING] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_ROWING] Error: ${error}`);
      await callback({
        text: "Rowing workout suggestion failed. Try: 20 min steady-state at 22-24 spm — builds the endurance you need for surf paddling and 1000m swims.",
        actions: ["KELLY_RECOMMEND_ROWING"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Rowing workout for surf fitness" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_ROWING for a surf-fit rowing session.",
          actions: ["KELLY_RECOMMEND_ROWING"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Should I row today?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_ROWING for a rowing session tailored to your swim and surf goals.",
          actions: ["KELLY_RECOMMEND_ROWING"],
        },
      },
    ],
  ],
};
