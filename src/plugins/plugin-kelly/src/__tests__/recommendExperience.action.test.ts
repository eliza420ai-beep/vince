/**
 * KELLY_RECOMMEND_EXPERIENCE action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendExperienceAction } from "../actions/recommendExperience.action";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_RECOMMEND_EXPERIENCE Action", () => {
  describe("validate", () => {
    it("returns true for 'wine tasting experience'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage(
        "recommend a wine tasting experience near Bordeaux",
      );
      const result = await kellyRecommendExperienceAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(true);
    });

    it("returns true for 'spa day'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("I want a spa day");
      const result = await kellyRecommendExperienceAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(true);
    });

    it("returns true for 'something special to do'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("something special to do this weekend");
      const result = await kellyRecommendExperienceAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(true);
    });

    it("returns true for 'cooking class'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("recommend a cooking class");
      const result = await kellyRecommendExperienceAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("best hotel in Paris");
      const result = await kellyRecommendExperienceAction.validate(
        runtime,
        message,
      );
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text when composeState and useModel provided", async () => {
      const runtime = createMockRuntime({
        composeState: async () => ({
          values: {},
          data: {},
          text: "Wine-tasting: Château Margaux, spa: Caudalie.",
        }),
        useModel: async () =>
          "**Best pick:** Château Margaux tasting. **Alternative:** Caudalie spa day.",
      });
      const message = createMockMessage("wine tasting experience");
      const callback = createMockCallback();

      await kellyRecommendExperienceAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );

      expect(callback.calls.length).toBe(1);
      expect(callback.calls[0]?.text).toBeDefined();
      expect(typeof callback.calls[0]?.text).toBe("string");
    });

    it("early exit when context is thin and no experience-related keywords", async () => {
      const runtime = createMockRuntime({
        composeState: async () => ({
          values: {},
          data: {},
          text: "Short.",
        }),
      });
      const message = createMockMessage("spa day");
      const callback = createMockCallback();
      await kellyRecommendExperienceAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );
      expect(callback.calls.length).toBe(1);
      const text = callback.calls[0]?.text ?? "";
      expect(text).toContain("MICHELIN Guide or James Edition");
      expect(text).not.toContain("invent");
    });

    it("when useModel returns empty, callback uses fallback", async () => {
      const runtime = createMockRuntime({
        composeState: async () => ({
          values: {},
          data: {},
          text: "Wine-tasting, spa, experiences.",
        }),
        useModel: async () => "",
      });
      const message = createMockMessage("something special to do");
      const callback = createMockCallback();
      await kellyRecommendExperienceAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );
      const text = callback.calls[0]?.text ?? "";
      expect(text).toContain("MICHELIN Guide or James Edition");
    });
  });
});
