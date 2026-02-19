/**
 * KELLY_RECOMMEND_WORKOUT action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendWorkoutAction } from "../actions/recommendWorkout.action";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_RECOMMEND_WORKOUT Action", () => {
  describe("validate", () => {
    it("returns true for recommend a workout", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("recommend a workout");
      const result = await kellyRecommendWorkoutAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(true);
    });
    it("returns true for today workout", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("today's workout");
      const result = await kellyRecommendWorkoutAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(true);
    });
    it("returns true for workout of the day", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("workout of the day");
      const result = await kellyRecommendWorkoutAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(true);
    });
    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("recommend a hotel");
      const result = await kellyRecommendWorkoutAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text when service and composeState provided", async () => {
      const mockService = {
        getCurrentSeason: () => "pool",
        getWellnessTipOfTheDay: () => "Stretch 5 min.",
        getDailyBriefing: () => ({
          day: "monday",
          date: "2025-02-03",
          suggestions: [],
          specialNotes: [],
        }),
      } as unknown as KellyLifestyleService;
      const runtime = createMockRuntime({
        getService: (n: string) =>
          n === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
        composeState: async () => ({
          values: {},
          data: {},
          text: "Pool season.",
        }),
        useModel: async () => "Today: 1000m pool, then 10 min surfer yoga.",
      });
      const message = createMockMessage("recommend a workout");
      const callback = createMockCallback();
      await kellyRecommendWorkoutAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );
      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]?.text).toBeDefined();
    });

    it("pool season returns pool-oriented suggestion, gym season returns gym/yoga", async () => {
      const mockServicePool = {
        getCurrentSeason: () => "pool",
        getWellnessTipOfTheDay: () => "Stretch.",
        getDailyBriefing: () => ({
          day: "wednesday",
          date: "2025-06-04",
          suggestions: [],
          specialNotes: [],
        }),
      } as unknown as KellyLifestyleService;
      const runtimePool = createMockRuntime({
        getService: (n: string) =>
          n === "KELLY_LIFESTYLE_SERVICE" ? mockServicePool : null,
        composeState: async () => ({ values: {}, data: {}, text: "Pool." }),
        useModel: async () =>
          "1000m in the backyard pool. Then 10 min surfer yoga.",
      });
      const callbackPool = createMockCallback();
      await kellyRecommendWorkoutAction.handler(
        runtimePool,
        createMockMessage("workout of the day"),
        createMockState(),
        {},
        callbackPool,
      );
      expect(callbackPool.calls[0]?.text?.toLowerCase()).toMatch(
        /pool|swim|yoga/,
      );

      const mockServiceGym = {
        getCurrentSeason: () => "gym",
        getWellnessTipOfTheDay: () => "Stretch.",
        getDailyBriefing: () => ({
          day: "wednesday",
          date: "2025-02-05",
          suggestions: [],
          specialNotes: [],
        }),
        getPalacePoolStatusLine: () => "Palais reopens Feb 12.",
      } as unknown as KellyLifestyleService;
      const runtimeGym = createMockRuntime({
        getService: (n: string) =>
          n === "KELLY_LIFESTYLE_SERVICE" ? mockServiceGym : null,
        composeState: async () => ({
          values: {},
          data: {},
          text: "Gym season.",
        }),
        useModel: async () =>
          "Gym or indoor pool at Palais. Surfer yoga 15 min.",
      });
      const callbackGym = createMockCallback();
      await kellyRecommendWorkoutAction.handler(
        runtimeGym,
        createMockMessage("today's workout"),
        createMockState(),
        {},
        callbackGym,
      );
      expect(callbackGym.calls[0]?.text?.toLowerCase()).toMatch(
        /gym|yoga|pool|indoor|palais/,
      );
    });
  });
});
