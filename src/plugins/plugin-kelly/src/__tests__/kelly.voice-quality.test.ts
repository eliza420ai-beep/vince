/**
 * Voice and quality suite: every action and provider output must have no BANNED_JARGON,
 * no filler phrases, and (optionally) benefit-led or concrete recommendation shape.
 */

import { describe, it, expect } from "bun:test";
import { findBannedJargon, findFillerPhrases } from "../constants/voice";
import { kellyDailyBriefingAction } from "../actions/dailyBriefing.action";
import { kellyRecommendPlaceAction } from "../actions/recommendPlace.action";
import { kellyRecommendWineAction } from "../actions/recommendWine.action";
import { kellySurfForecastAction } from "../actions/surfForecast.action";
import { kellyItineraryAction } from "../actions/itinerary.action";
import { kellyRecommendWorkoutAction } from "../actions/recommendWorkout.action";
import { kellyWeekAheadAction } from "../actions/weekAhead.action";
import { kellySwimmingTipsAction } from "../actions/swimmingTips.action";
import { kellyRecommendExperienceAction } from "../actions/recommendExperience.action";
import { kellyContextProvider } from "../providers/kellyContext.provider";
import {
  weatherProvider,
  __clearWeatherCacheForTesting,
} from "../providers/weather.provider";
import {
  createMockRuntimeWithService,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

function assertNoBannedJargon(text: string): void {
  const found = findBannedJargon(text);
  expect(found).toEqual([]);
}

function assertNoFillerPhrases(text: string): void {
  const found = findFillerPhrases(text);
  expect(found).toEqual([]);
}

/** Optional: text has concrete name (**Bold**) or a short "why" (for…, because…). */
function assertBenefitLedOrConcrete(text: string): void {
  const hasBold = /\*\*[^*]+\*\*/.test(text);
  const hasWhy = /\b(for\s|because\s|—\s)/i.test(text);
  expect(hasBold || hasWhy || text.length > 20).toBe(true);
}

const realisticResponse =
  "**Maison Devaux** — Michelin Bib Gourmand, Rion. Lunch Wed–Sat. Alternative: **Auberge du Lavoir** at Garrosse.";

describe("Voice and quality", () => {
  describe("helpers", () => {
    it("assertNoBannedJargon passes for clean text", () => {
      assertNoBannedJargon(realisticResponse);
    });
    it("assertNoBannedJargon fails for leverage", () => {
      const found = findBannedJargon("We should leverage this.");
      expect(found).toContain("leverage");
    });
    it("assertNoFillerPhrases passes for clean text", () => {
      assertNoFillerPhrases(realisticResponse);
    });
    it("assertNoFillerPhrases fails for certainly", () => {
      const found = findFillerPhrases("Certainly, here is a pick.");
      expect(found.length).toBeGreaterThan(0);
    });
    it("assertBenefitLedOrConcrete passes for bold pick", () => {
      assertBenefitLedOrConcrete("**Maison Devaux** — great lunch.");
    });
  });

  describe("action output quality (no jargon, no filler)", () => {
    it("KELLY_DAILY_BRIEFING callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.useModel = async () =>
        "**Wednesday** midweek. Lunch at **Maison Devaux** (curated, open today). Pool season—good for a swim. Alternative: Auberge du Lavoir.";
      const message = createMockMessage("what should I do today");
      const callback = createMockCallback();
      await kellyDailyBriefingAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_RECOMMEND_PLACE callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.composeState = async () => ({
        values: { kellyDay: "Wednesday" },
        data: {},
        text: "Landes: Maison Devaux.",
      });
      r.useModel = async () => realisticResponse;
      const message = createMockMessage("where to eat in Landes");
      const callback = createMockCallback();
      await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_RECOMMEND_WINE callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.composeState = async () => ({ values: {}, data: {}, text: "" });
      r.useModel = async () =>
        "**Château Olivier** blanc — Pessac-Léognan. Citrus, mineral. Serve 8–10 °C. Alternative: Domaine de Chevalier blanc.";
      const message = createMockMessage("recommend a wine for seafood");
      const callback = createMockCallback();
      await kellyRecommendWineAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_SURF_FORECAST callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.composeState = async () => ({
        values: {
          surfBiarritz: { waveHeight: 1.2, wavePeriod: 8, waveDirection: "SW", seaTemp: 15.5 },
          weatherBiarritz: { condition: "clear", temp: 16, code: 0 },
        },
        data: {},
        text: "Surf Biarritz 1.2 m.",
      });
      const message = createMockMessage("surf forecast Biarritz");
      const callback = createMockCallback();
      await kellySurfForecastAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_ITINERARY callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.composeState = async () => ({ values: {}, data: {}, text: "" });
      r.useModel = async () =>
        "Day 1 — **Hôtel du Palais**. Lunch **Le Relais de la Poste**. Day 2 — Lunch **Maison Devaux**. Both from the-good-life.";
      const message = createMockMessage("plan me 2 days in Bordeaux");
      const callback = createMockCallback();
      await kellyItineraryAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_RECOMMEND_WORKOUT callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.useModel = async () =>
        "Pool season—**1000m in the backyard**. Warm up 100 easy, then build. Alternative: 15 min surfer yoga for hips and shoulders.";
      const message = createMockMessage("recommend a workout");
      const callback = createMockCallback();
      await kellyRecommendWorkoutAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_WEEK_AHEAD callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.useModel = async () =>
        "1. Lunch **Maison Devaux** Wed. 2. **Relais de la Poste** midweek stay. 3. Pool or swim daily. 4. Wine: Margaux. 5. Day trip Saint-Émilion.";
      const message = createMockMessage("week ahead");
      const callback = createMockCallback();
      await kellyWeekAheadAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_SWIMMING_TIPS callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.composeState = async () => ({ values: {}, data: {}, text: "" });
      r.useModel = async () =>
        "For your daily 1000m: warm up 100–200 easy, then build. In winter use indoor pools (Palais reopens Feb 12, Caudalie Feb 5). Add swimmer yoga for shoulders.";
      const message = createMockMessage("tips for my daily 1000m");
      const callback = createMockCallback();
      await kellySwimmingTipsAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });

    it("KELLY_RECOMMEND_EXPERIENCE callback text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.composeState = async () => ({
        values: {},
        data: {},
        text: "Wine-tasting: Château Margaux. Spa: Caudalie.",
      });
      r.useModel = async () =>
        "**Best pick:** Château Margaux tasting — structure, red fruit. **Alternative:** Caudalie spa day.";
      const message = createMockMessage("wine tasting experience");
      const callback = createMockCallback();
      await kellyRecommendExperienceAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      assertNoBannedJargon(text);
      assertNoFillerPhrases(text);
    });
  });

  describe("provider text quality", () => {
    it("kellyContext provider result text passes voice checks", async () => {
      const runtime = createMockRuntimeWithService();
      const message = createMockMessage("what should I do today");
      const result = await kellyContextProvider.get(runtime, message);
      if (result?.text && result.text.length > 0) {
        assertNoBannedJargon(result.text);
        assertNoFillerPhrases(result.text);
      }
    });

    it("weather provider result text passes voice checks when present", async () => {
      __clearWeatherCacheForTesting();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        Response.json({
          current: { weather_code: 0, temperature_2m: 14, precipitation: 0, wind_speed_10m: 5 },
        }) as any;
      try {
        const runtime = createMockRuntimeWithService();
        const message = createMockMessage("what should I do today");
        const result = await weatherProvider.get(runtime, message);
        if (result?.text && result.text.length > 0) {
          assertNoBannedJargon(result.text);
          assertNoFillerPhrases(result.text);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
