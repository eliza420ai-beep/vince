/**
 * KELLY_RECOMMEND_PLACE action tests (open today, Landes).
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendPlaceAction } from "../actions/recommendPlace.action";
import type { KellyLifestyleService } from "../services/lifestyle.service";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_RECOMMEND_PLACE Action", () => {
  describe("validate", () => {
    it("returns true for recommend a hotel in Bordeaux", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("recommend a hotel in Bordeaux");
      const result = await kellyRecommendPlaceAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for where to eat in Landes", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("where to eat in Landes");
      const result = await kellyRecommendPlaceAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for open today", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("restaurant open today");
      const result = await kellyRecommendPlaceAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for open now", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("where to eat open now");
      const result = await kellyRecommendPlaceAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what is the capital of France");
      const result = await kellyRecommendPlaceAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text when service and composeState provided", async () => {
      const mockService = {
        getCuratedOpenContext: () => ({
          restaurants: ["Maison Devaux | Rion", "Auberge du Lavoir | Garrosse"],
          hotels: ["Relais de la Poste | Magescq"],
          fitnessNote: "Pool Apr-Nov",
          rawSection: "Wed: Maison Devaux",
        }),
      } as unknown as KellyLifestyleService;
      const runtime = createMockRuntime({
        getService: (name: string) =>
          name === "KELLY_LIFESTYLE_SERVICE" ? mockService : null,
        composeState: async () => ({
          values: { kellyDay: "Wednesday" },
          data: {},
          text: "Landes: Maison Devaux, Auberge du Lavoir.",
        }),
        useModel: async () =>
          "**Best pick:** Maison Devaux. **Alternative:** Auberge du Lavoir.",
      });
      const message = createMockMessage("where to eat in Landes");
      const callback = createMockCallback();

      await kellyRecommendPlaceAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBeGreaterThan(0);
      expect(callback.calls[0]?.text).toBeDefined();
    });
  });
});
