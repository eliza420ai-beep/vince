/**
 * KELLY_SURF_FORECAST — surf report for Biarritz from marine + weather context.
 * Uses state.values.surfBiarritz and state.values.weatherBiarritz from the weather provider.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import { isRainOrStormCode } from "../constants/safety";
import type { SurfBiarritzValue } from "../types.ts";

const SURF_TRIGGERS = [
  "surf forecast",
  "how's the surf",
  "hows the surf",
  "waves in biarritz",
  "waves biarritz",
  "surf conditions biarritz",
  "can i surf today",
  "surf biarritz",
  "biarritz surf",
];

function wantsSurfForecast(text: string): boolean {
  const lower = text.toLowerCase();
  return SURF_TRIGGERS.some((t) => lower.includes(t));
}

function isRainOrStorm(weatherCode: number | undefined): boolean {
  if (weatherCode === undefined) return false;
  return isRainOrStormCode(weatherCode);
}

function formatInterpretation(surf: SurfBiarritzValue): string {
  const { waveHeight, wavePeriod } = surf;
  if (waveHeight <= 0.5 && wavePeriod >= 8)
    return "Small and clean—walk before you run; good for beginners or longboard.";
  if (waveHeight <= 1 && wavePeriod >= 7)
    return "There's a flow to it; small and clean, good for beginners.";
  if (waveHeight <= 1.5 && wavePeriod >= 6)
    return "Time slows down when it's like this—fun size, most levels.";
  if (waveHeight <= 2.5)
    return "Solid. Intermediate and up; put yourself in the right part of it.";
  if (waveHeight > 2.5)
    return "Powerful—experienced only. Life-and-death thoughts on the face of it.";
  return "Check conditions on the spot.";
}

export const kellySurfForecastAction: Action = {
  name: "KELLY_SURF_FORECAST",
  similes: ["SURF_FORECAST", "SURF_REPORT", "BIARRITZ_SURF"],
  description:
    "Surf forecast for Biarritz: wave height, period, direction, sea temp. Use when the user asks about surf or waves in Biarritz.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsSurfForecast(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_SURF_FORECAST] Action fired");
    try {
      const state = await runtime.composeState(message);
      const surf = state.values?.surfBiarritz as SurfBiarritzValue | undefined;
      const weatherBiarritz = state.values?.weatherBiarritz as
        | { condition: string; temp: number; code?: number }
        | undefined;

      if (!surf || surf.waveHeight === undefined) {
        await callback({
          text: "Surf data for Biarritz isn't available right now; try again in a few minutes.",
          actions: ["KELLY_SURF_FORECAST"],
        });
        return;
      }

      const interpretation = formatInterpretation(surf);
      const lines: string[] = [
        `**Surf Biarritz** — ${surf.waveHeight} m, ${surf.wavePeriod} s, ${surf.waveDirection}, sea ${surf.seaTemp} °C.`,
        interpretation,
      ];
      lines.push(
        "Best window: wind is often lighter in the morning; if you can, check conditions early and go then.",
      );

      if (
        weatherBiarritz?.code !== undefined &&
        isRainOrStorm(weatherBiarritz.code)
      ) {
        lines.push(
          "Rain or storm expected — consider indoor options or surfer yoga instead.",
        );
      }

      const out = "Here's the surf forecast—\n\n" + lines.join(" ");
      await callback({
        text: out,
        actions: ["KELLY_SURF_FORECAST"],
      });

      logger.info("[KELLY_SURF_FORECAST] Report sent");
    } catch (error) {
      logger.error(`[KELLY_SURF_FORECAST] Error: ${error}`);
      await callback({
        text: "Surf forecast failed. Try again in a few minutes.",
        actions: ["KELLY_SURF_FORECAST"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "How's the surf in Biarritz?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_SURF_FORECAST for wave height, period, direction, sea temp.",
          actions: ["KELLY_SURF_FORECAST"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Surf forecast for today" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_SURF_FORECAST for Biarritz surf conditions.",
          actions: ["KELLY_SURF_FORECAST"],
        },
      },
    ],
  ],
};
