/**
 * KELLY_RECOMMEND_WORKOUT — one concrete workout suggestion (pool, gym, surfer yoga, swim).
 * Uses pool/gym season and kellyContext from lifestyle service.
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

const WORKOUT_TRIGGERS = [
  "recommend a workout",
  "today's workout",
  "workout of the day",
  "what workout",
  "workout for today",
  "today workout",
];

function wantsWorkout(text: string): boolean {
  const lower = text.toLowerCase();
  return WORKOUT_TRIGGERS.some((t) => lower.includes(t));
}

export const kellyRecommendWorkoutAction: Action = {
  name: "KELLY_RECOMMEND_WORKOUT",
  similes: ["TODAY_WORKOUT", "WORKOUT_OF_THE_DAY", "RECOMMEND_WORKOUT"],
  description:
    "Recommend one concrete workout for today: pool session, gym, surfer yoga, or swim. Uses pool/gym season and swimming/surf context.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsWorkout(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_WORKOUT] Action fired");
    try {
      const service = runtime.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      const state = await runtime.composeState(message);

      const season = service?.getCurrentSeason() ?? "pool";
      const wellnessTip = service?.getWellnessTipOfTheDay?.() ?? "";
      const day = service?.getDailyBriefing?.()?.day ?? "monday";
      const dayCap = day.charAt(0).toUpperCase() + day.slice(1);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const palacePoolLine =
        season === "gym" ? service?.getPalacePoolStatusLine?.() ?? "" : "";
      const weatherHome = state.values?.weatherHome as
        | { condition: string; temp: number }
        | undefined;
      const weatherHomeLine = weatherHome
        ? `Local: ${weatherHome.condition}, ${weatherHome.temp}°C`
        : "";

      const prompt = `You are Kelly, a concierge for health and fitness. Recommend exactly ONE concrete workout for today.

Context:
- Day: ${dayCap}
- Season: ${season === "pool" ? "Pool (Apr–Nov) — outdoor swim, rooftops" : "Gym (Dec–Mar) — indoor training, palace pools for lap swim when open"}${palacePoolLine ? `\n- Palace pools: ${palacePoolLine}. When a pool has reopened, say it's back open—don't say "reopens [date]" if that date has passed.` : ""}${weatherHomeLine ? `\n- **Local weather (use for pool/swim suggestions):** ${weatherHomeLine}. E.g. cold or rain favors indoor/gym; clear and mild can suit backyard or pool. Never name the town.` : ""}
- Today's wellness tip: ${wellnessTip || "—"}

Additional context from the-good-life:
${contextBlock.slice(0, 1500)}

Rules:
- One clear suggestion only: e.g. "Pool session this morning", "Gym + mobility", "Surfer yoga then a short swim", "Lap swim at Palais (reopens Feb 12) if you're there."
- In pool season you can suggest pool or outdoor swim; in gym season suggest gym, mobility, or indoor palace pool if reopen dates allow.
- If you suggest pool or swim and local weather is provided, briefly use it (e.g. "Local 14°C and clear—good for the pool" or "Chilly and wet—indoor at Caudalie is the move"). Never name the town.
- When suggesting gym or general fitness, favour functional fitness and mobility/stretching over heavy lifting or bulk.
- Reference yoga (yoga-vinyasa-surfers-swimmers, daily-yoga-surfers-vinyasa) only if it fits (e.g. surfer yoga pre-surf, swimmer yoga pre-pool).
- No trading, no markets. One short paragraph, benefit-led, no jargon.
- No bullet points. One concrete pick.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const fallback =
        "Today: gym or mobility (gym season). Pool when it's pool season. Check swimming-daily-winter-pools for palace pool reopen dates.";
      const out = text ? "Here's a workout for today—\n\n" + text : fallback;
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_WORKOUT"],
      });
    } catch (error) {
      logger.error("[KELLY_RECOMMEND_WORKOUT] Error:", error);
      await callback({
        text: "Workout suggestion’s glitching. In gym season try a gym or mobility session; in pool season, pool or surfer yoga. See the-good-life for yoga and swimming notes.",
        actions: ["REPLY"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Recommend a workout for today" } },
      {
        name: "{{agent}}",
        content: {
          text: "Gym session this morning—strength or mobility. Pool season starts in April; until then indoor training or palace pool once they reopen (Palais Feb 12, Caudalie Feb 5).",
          actions: ["KELLY_RECOMMEND_WORKOUT"],
        },
      },
    ],
  ],
};
