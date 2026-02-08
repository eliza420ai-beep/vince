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
      const result = await kellyRecommendWorkoutAction.validate(runtime, message);
      expect(result).toBe(true);
    });
    it("returns true for today workout", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("today's workout");
      const result = await kellyRecommendWorkoutAction.validate(runtime, message);
      expect(result).toBe(true);
    });
    it("returns true for workout of the day", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("workout of the day");
      const result = await kellyRecommendWorkoutAction.validate(runtime, message);
      expect(result).toBe(true);
    });
    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("recommend a hotel");
      const result = await kellyRecommendWorkoutAction.validate(runtime, message);
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
        getService: (n: string) => (n === "KELLY_LIFESTYLE_SERVICE" ? mockService : null),
        composeState: async () => ({ values: {}, data: {}, text: "Pool season." }),
        useModel: async () => "Today: 1000m pool, then 10 min surfer yoga.",
      });
      const message = createMockMessage("recommend a workout");
      const callback = createMockCallback();
      await kellyRecommendWorkoutAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]?.text).toBeDefined();
    });
  });
});
