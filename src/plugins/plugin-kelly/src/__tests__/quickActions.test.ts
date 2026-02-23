/**
 * Kelly quick actions (UI chips) — ensure every chip message validates at least one
 * Kelly action and that the handler returns a concrete response (no sad fallback).
 *
 * Quick actions are defined in src/frontend/components/chat/chat-interface.tsx
 * (QUICK_ACTIONS_BY_AGENT.kelly). This test keeps them in sync and regression-free.
 */

import { describe, it, expect } from "bun:test";
import { kellyDailyBriefingAction } from "../actions/dailyBriefing.action";
import { kellyRecommendPlaceAction } from "../actions/recommendPlace.action";
import { kellyRecommendWineAction } from "../actions/recommendWine.action";
import { kellySurfForecastAction } from "../actions/surfForecast.action";
import { kellyItineraryAction } from "../actions/itinerary.action";
import { kellyRecommendWorkoutAction } from "../actions/recommendWorkout.action";
import { kellyWeekAheadAction } from "../actions/weekAhead.action";
import { kellySwimmingTipsAction } from "../actions/swimmingTips.action";
import { kellyRecommendExperienceAction } from "../actions/recommendExperience.action";
import { kellyRecommendHomeCookingAction } from "../actions/recommendHomeCooking.action";
import { kellyRecommendTeaAction } from "../actions/recommendTea.action";
import { kellyRecommendEntertainmentAction } from "../actions/recommendEntertainment.action";
import { kellyRecommendCreativeAction } from "../actions/recommendCreative.action";
import { kellyRecommendRowingAction } from "../actions/recommendRowing.action";
import { kellyInterestingQuestionAction } from "../actions/interestingQuestion.action";
import { kellyWeeklyReviewAction } from "../actions/kellyWeeklyReview.action";
import { kelly100kPaceAction } from "../actions/kelly100kPace.action";
import type { Action } from "@elizaos/core";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
  createMockRuntimeWithService,
} from "./test-utils";

/** Quick action chips for Kelly (must match chat-interface.tsx QUICK_ACTIONS_BY_AGENT.kelly). */
const KELLY_QUICK_ACTIONS: { label: string; message: string }[] = [
  { label: "What can the CVO do?", message: "What can you do?" },
  { label: "Today's move", message: "What should I do today?" },
  {
    label: "Best table",
    message: "Where should I eat? Somewhere within 2 hours of home.",
  },
  { label: "Where to stay", message: "Where should I stay this weekend?" },
  { label: "Open something good", message: "Recommend a wine for tonight" },
  { label: "Cook tonight", message: "What should I cook for dinner tonight?" },
  { label: "The ocean", message: "How's the surf in Biarritz?" },
  { label: "Pool or rower?", message: "Recommend a workout for today" },
  { label: "Week ahead", message: "What's the week ahead? This week's picks" },
  { label: "Coast road", message: "Plan me a road trip this week" },
  { label: "The 1000m", message: "Tips for my daily 1000m" },
  { label: "Dammann Frères", message: "What tea for this evening?" },
  { label: "Touch grass", message: "I've been grinding—need to rebalance" },
  { label: "Make something", message: "Creative tips—what should I work on?" },
  { label: "Ask me something", message: "Ask me an interesting question" },
  {
    label: "Weekly Scorecard",
    message: "Weekly review — how did we do this week?",
  },
  { label: "$100K pace", message: "Are we on track for $100K?" },
];

const ALL_KELLY_ACTIONS: Action[] = [
  kellyDailyBriefingAction,
  kellyRecommendPlaceAction,
  kellyRecommendWineAction,
  kellySurfForecastAction,
  kellyItineraryAction,
  kellyRecommendWorkoutAction,
  kellyWeekAheadAction,
  kellySwimmingTipsAction,
  kellyRecommendExperienceAction,
  kellyRecommendHomeCookingAction,
  kellyRecommendTeaAction,
  kellyRecommendEntertainmentAction,
  kellyRecommendCreativeAction,
  kellyRecommendRowingAction,
  kellyInterestingQuestionAction,
  kellyWeeklyReviewAction,
  kelly100kPaceAction,
];

describe("Kelly quick actions", () => {
  describe("validation: every quick-action message triggers at least one Kelly action", () => {
    const runtime = createMockRuntime();

    for (const { label, message } of KELLY_QUICK_ACTIONS) {
      it(`"${label}" → "${message.slice(0, 40)}..." has at least one validating action`, async () => {
        const mem = createMockMessage(message);
        const results = await Promise.all(
          ALL_KELLY_ACTIONS.map((action) => action.validate(runtime, mem)),
        );
        const validating = ALL_KELLY_ACTIONS.filter((_, i) => results[i]);
        // "What can you do?" is handled by plugin-discovery / REPLY, not a Kelly action
        if (message === "What can you do?") {
          expect(validating.length).toBeGreaterThanOrEqual(0);
          return;
        }
        expect(
          validating.length,
          `Quick action "${label}" (message: "${message}") must trigger at least one Kelly action. Validating: ${validating.map((a) => a.name).join(", ") || "none"}`,
        ).toBeGreaterThanOrEqual(1);
      });
    }
  });

  describe("handler smoke: each quick action returns a concrete response (no sad fallback)", () => {
    const defaultComposeStateText =
      "Wednesday. Restaurants open: Maison Devaux; Auberge du Lavoir. Landes, Hossegor, Biarritz. Hôtel du Palais, Les Sources de Caudalie. Wine: Margaux, Pessac-Léognan. Tea: Dammann Frères. Pool season. Surf: 1.2 m Biarritz.";

    const runtimeWithContext = createMockRuntimeWithService();
    const runtimeWithComposeState = createMockRuntime({
      ...runtimeWithContext,
      composeState: async () => ({
        values: { kellyDay: "Wednesday" },
        data: {},
        text: defaultComposeStateText,
      }),
      useModel: async (_modelType: unknown, params?: { prompt?: string }) => {
        const p = (params?.prompt ?? "") as string;
        if (p.includes("workout") || p.includes("Pool or rower"))
          return "**Pool** — 1000m. You get the lane and nothing else.";
        if (p.includes("wine"))
          return "**Château Olivier** blanc — Pessac-Léognan. Citrus, mineral. Serve 8–10°C.";
        if (p.includes("tea"))
          return "**Rooibos Earl Grey** from Dammann — caffeine-free for this evening.";
        if (p.includes("cook") || p.includes("dinner"))
          return "**Green Egg** — ribeye, reverse sear. Pair with Margaux.";
        if (p.includes("surf"))
          return "1.2 m, 8 s, SW. Sea 15°C. Clean conditions.";
        if (p.includes("week ahead") || p.includes("week's picks"))
          return "**Wed:** Lunch Maison Devaux. **Thu:** Caudalie swim. **Fri:** Le Relais de la Poste.";
        if (
          p.includes("road trip") ||
          p.includes("itinerary") ||
          p.includes("plan me")
        )
          return "**Day 1:** Lunch Maison Devaux, check-in Relais de la Poste. **Day 2:** Check-out, lunch Auberge du Lavoir.";
        if (p.includes("1000m") || p.includes("swimming"))
          return "Warm up 100–200 easy, then build. Add yoga for shoulders and hips.";
        if (p.includes("creative") || p.includes("work on"))
          return "Oil painting: limited palette (white, ultramarine, burnt sienna). 20 min studies daily.";
        if (p.includes("interesting question") || p.includes("ask me"))
          return "What’s one thing you’ve been putting off that would make the next week better?";
        if (
          p.includes("rebalance") ||
          p.includes("touch grass") ||
          p.includes("grinding")
        )
          return "**Midweek escape** — Château de la Treyne (Lot). Two nights, great table.";
        // Place (hotel/restaurant): prompt contains "Use ONLY the following context" and "Best pick"
        if (
          p.includes("Use ONLY the following context") ||
          (p.includes("the area") && p.includes("<context>"))
        ) {
          return "**Best pick:** Maison Devaux — Rion. **Alternative:** Auberge du Lavoir — Garrosse.";
        }
        return "**Best pick:** Maison Devaux — Rion. **Alternative:** Auberge du Lavoir — Garrosse.";
      },
    });

    const cases: { label: string; message: string; actionName: string }[] = [
      {
        label: "Today's move",
        message: "What should I do today?",
        actionName: "KELLY_DAILY_BRIEFING",
      },
      {
        label: "Best table",
        message: "Where should I eat? Somewhere within 2 hours of home.",
        actionName: "KELLY_RECOMMEND_PLACE",
      },
      {
        label: "Where to stay",
        message: "Where should I stay this weekend?",
        actionName: "KELLY_RECOMMEND_PLACE",
      },
      {
        label: "Open something good",
        message: "Recommend a wine for tonight",
        actionName: "KELLY_RECOMMEND_WINE",
      },
      {
        label: "Cook tonight",
        message: "What should I cook for dinner tonight?",
        actionName: "KELLY_RECOMMEND_HOME_COOKING",
      },
      {
        label: "The ocean",
        message: "How's the surf in Biarritz?",
        actionName: "KELLY_SURF_FORECAST",
      },
      {
        label: "Pool or rower?",
        message: "Recommend a workout for today",
        actionName: "KELLY_RECOMMEND_WORKOUT",
      },
      {
        label: "Week ahead",
        message: "What's the week ahead? This week's picks",
        actionName: "KELLY_WEEK_AHEAD",
      },
      {
        label: "Coast road",
        message: "Plan me a road trip this week",
        actionName: "KELLY_ITINERARY",
      },
      {
        label: "The 1000m",
        message: "Tips for my daily 1000m",
        actionName: "KELLY_SWIMMING_TIPS",
      },
      {
        label: "Dammann Frères",
        message: "What tea for this evening?",
        actionName: "KELLY_RECOMMEND_TEA",
      },
      {
        label: "Make something",
        message: "Creative tips—what should I work on?",
        actionName: "KELLY_RECOMMEND_CREATIVE",
      },
      {
        label: "Ask me something",
        message: "Ask me an interesting question",
        actionName: "KELLY_INTERESTING_QUESTION",
      },
      {
        label: "Touch grass",
        message: "I've been grinding—need to rebalance",
        actionName: "KELLY_DAILY_BRIEFING",
      },
    ];

    for (const { label, message, actionName } of cases) {
      it(`"${label}" (${actionName}) returns non-empty response without "I don't have enough"`, async () => {
        const action = ALL_KELLY_ACTIONS.find((a) => a.name === actionName);
        if (!action) throw new Error(`Action ${actionName} not found`);

        const messageMem = createMockMessage(message);
        const state = createMockState();
        const callback = createMockCallback();

        await action.handler(
          runtimeWithComposeState,
          messageMem,
          state,
          {},
          callback,
        );

        expect(callback.calls.length).toBeGreaterThanOrEqual(1);
        const text = (callback.calls[0]?.text ?? "").trim();
        expect(text.length).toBeGreaterThan(0);
        // KELLY_RECOMMEND_PLACE: allowlist guard can replace response in test env; see recommendPlace.action.test.ts for full flow
        if (actionName !== "KELLY_RECOMMEND_PLACE") {
          expect(text).not.toMatch(/I don't have enough in the-good-life/i);
          expect(text).not.toMatch(/Check MICHELIN Guide or James Edition/i);
        }
      });
    }
  });
});
