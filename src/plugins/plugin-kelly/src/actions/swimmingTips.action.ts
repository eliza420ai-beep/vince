/**
 * KELLY_SWIMMING_TIPS — tips for daily swim (e.g. 1000m), winter pools, swimmer yoga.
 * Pulls from swimming-daily-winter-pools and yoga-vinyasa-surfers-swimmers.
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

const SWIMMING_TIPS_TRIGGERS = [
  "tips for my daily 1000m",
  "swimming tips",
  "daily swim tips",
  "1000m tips",
  "lap swim tips",
  "winter swimming",
  "indoor pool tips",
];

function wantsSwimmingTips(text: string): boolean {
  const lower = text.toLowerCase();
  return SWIMMING_TIPS_TRIGGERS.some((t) => lower.includes(t));
}

export const kellySwimmingTipsAction: Action = {
  name: "KELLY_SWIMMING_TIPS",
  similes: ["SWIMMING_TIPS", "DAILY_SWIM", "LAP_SWIM_TIPS"],
  description:
    "Tips for daily lap swim (e.g. 1000m), winter indoor pools, and swimmer yoga. Uses swimming-daily-winter-pools and yoga-vinyasa-surfers-swimmers.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSwimmingTips(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_SWIMMING_TIPS] Action fired");
    try {
      const service = runtime.getService(
        "KELLY_LIFESTYLE_SERVICE",
      ) as KellyLifestyleService | null;
      const state = await runtime.composeState(message);

      const season = service?.getCurrentSeason() ?? "pool";
      const palaceDates = service?.getPalacePoolReopenDates?.() ?? {};
      const datesLine =
        Object.entries(palaceDates).length > 0
          ? Object.entries(palaceDates)
              .map(([k, v]) => `${k} ${v}`)
              .join(", ")
          : "Palais Feb 12, Caudalie Feb 5, Eugenie Mar 6";
      const contextBlock = typeof state.text === "string" ? state.text : "";

      const prompt = `You are Kelly. The user wants swimming tips—e.g. for a daily 1000m or lap swim.

Context:
- Season: ${season === "pool" ? "Pool (Apr–Nov)" : "Gym (Dec–Mar)"}
- Palace indoor pool reopen dates (winter): ${datesLine}

Knowledge to use (from the-good-life):
${contextBlock.slice(0, 2500)}

Instructions:
1. Give a short, concrete summary: warm-up, build, winter vs pool season.
2. In winter, reference indoor palace pools (swimming-daily-winter-pools) and their reopen dates so they can plan.
3. Add one line on swimmer yoga (yoga-vinyasa-surfers-swimmers) for shoulders and hips.
4. End with: "See swimming-daily-winter-pools and yoga-vinyasa-surfers-swimmers for detail."
5. One short paragraph + that line. Benefit-led, no jargon. No bullet list unless very short.`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      await callback({
        text:
          text ||
          "For your daily 1000m: warm up 100–200 easy, then build. In winter use indoor palace pools (Palais, Caudalie, Eugenie)—see swimming-daily-winter-pools for reopen dates. Add a short yoga flow for shoulders and hips (yoga-vinyasa-surfers-swimmers). See swimming-daily-winter-pools and yoga-vinyasa-surfers-swimmers for detail.",
        actions: ["KELLY_SWIMMING_TIPS"],
      });
    } catch (error) {
      logger.error("[KELLY_SWIMMING_TIPS] Error:", error);
      await callback({
        text: "For daily 1000m: warm up, then build. Winter = indoor palace pools (see swimming-daily-winter-pools for reopen dates). Swimmer yoga: yoga-vinyasa-surfers-swimmers. See those two docs for detail.",
        actions: ["REPLY"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "Tips for my daily 1000m" } },
      {
        name: "Kelly",
        content: {
          text: "Warm up 100–200 easy, then build. In winter use the indoor pools from the-good-life (swimming-daily-winter-pools)—Palais, Caudalie, Eugenie close/reopen dates so you can plan. Add a short yoga flow (yoga-vinyasa-surfers-swimmers) for shoulders and hips. See swimming-daily-winter-pools and yoga-vinyasa-surfers-swimmers for detail.",
          actions: ["KELLY_SWIMMING_TIPS"],
        },
      },
    ],
  ],
};
