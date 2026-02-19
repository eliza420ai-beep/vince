/**
 * KELLY_RECOMMEND_WINE action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendWineAction } from "../actions/recommendWine.action";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

describe("KELLY_RECOMMEND_WINE Action", () => {
  describe("validate", () => {
    it("returns true for 'recommend wine'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("recommend wine");
      const result = await kellyRecommendWineAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'what wine with steak'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("what wine with steak");
      const result = await kellyRecommendWineAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns true for 'bottle for tonight'", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("bottle for tonight");
      const result = await kellyRecommendWineAction.validate(runtime, message);
      expect(result).toBe(true);
    });

    it("returns false for unrelated message", async () => {
      const runtime = createMockRuntime();
      const message = createMockMessage("best hotel in Paris");
      const result = await kellyRecommendWineAction.validate(runtime, message);
      expect(result).toBe(false);
    });
  });

  describe("handler", () => {
    it("calls callback with text when composeState and useModel provided", async () => {
      const runtime = createMockRuntime({
        composeState: async () => ({
          values: {},
          data: {},
          text: "Wine-tasting knowledge: Bordeaux, Margaux.",
        }),
        useModel: async () =>
          "**Pick:** Château X Margaux. **Alternative:** Château Y. Tasting note: structured, red fruit.",
      });
      const message = createMockMessage("recommend a wine for dinner");
      const callback = createMockCallback();

      await kellyRecommendWineAction.handler(
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

    it("callback includes at least one concrete name and optional service note", async () => {
      const runtime = createMockRuntime({
        composeState: async () => ({
          values: {},
          data: {},
          text: "Bordeaux, Margaux.",
        }),
        useModel: async () =>
          "**Château Olivier** blanc. Serve 8–10 °C. Alternative: **Domaine de Chevalier**.",
      });
      const message = createMockMessage("recommend a wine");
      const callback = createMockCallback();
      await kellyRecommendWineAction.handler(
        runtime,
        message,
        createMockState(),
        {},
        callback,
      );
      const text = callback.calls[0]?.text ?? "";
      expect(text).toMatch(/\*\*[^*]+\*\*|Château|Domaine/);
    });
  });
});
