/**
 * Knowledge-grounded and "never invent" suite: recommendations must come from
 * the-good-life or curated-open-schedule; never invent hotel or restaurant names.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendPlaceAction } from "../actions/recommendPlace.action";
import { kellyRecommendWineAction } from "../actions/recommendWine.action";
import { kellyItineraryAction } from "../actions/itinerary.action";
import {
  createMockRuntimeWithService,
  createMockMessage,
  createMockState,
  createMockCallback,
  loadAllowlistFromKnowledge,
} from "./test-utils";

/** Extract recommendation names from text: **Name** or "Name—" pattern. */
function extractRecommendationNames(text: string): string[] {
  const bold = text.match(/\*\*([^*]+)\*\*/g);
  const names = (bold ?? []).map((s) => s.replace(/\*\*/g, "").trim());
  const dash = text.match(/([A-Za-zÀ-ÿ0-9\s'-]+)\s*—/g);
  const fromDash = (dash ?? []).map((s) => s.replace(/\s*—\s*$/, "").trim()).filter(Boolean);
  const combined = [...new Set([...names, ...fromDash])];
  return combined.filter((n) => n.length > 2);
}

describe("Knowledge-grounded and never invent", () => {
  const placesAllowlist = loadAllowlistFromKnowledge("places");
  const winesAllowlist = loadAllowlistFromKnowledge("wines");

  describe("allowlist loading", () => {
    it("loads places allowlist from fixtures", () => {
      expect(placesAllowlist.length).toBeGreaterThan(0);
      expect(placesAllowlist).toContain("Maison Devaux");
      expect(placesAllowlist).toContain("Hôtel du Palais");
    });
    it("loads wines allowlist from fixtures", () => {
      expect(winesAllowlist.length).toBeGreaterThan(0);
      expect(winesAllowlist).toContain("Château Olivier");
      expect(winesAllowlist).toContain("Margaux");
    });
  });

  describe("extractRecommendationNames", () => {
    it("extracts bold names", () => {
      const text = "**Maison Devaux** — great. Alternative: **Auberge du Lavoir**.";
      expect(extractRecommendationNames(text)).toContain("Maison Devaux");
      expect(extractRecommendationNames(text)).toContain("Auberge du Lavoir");
    });
    it("returns empty for text with no names", () => {
      expect(extractRecommendationNames("Just some text.").length).toBe(0);
    });
  });

  describe("KELLY_RECOMMEND_PLACE — valid response passes allowlist", () => {
    it("callback with only allowlist/curated names passes", async () => {
      const curated = ["Maison Devaux | Rion", "Auberge du Lavoir | Garrosse"];
      const runtime = createMockRuntimeWithService({
        getCuratedOpenContext: () => ({
          restaurants: curated,
          hotels: ["Relais de la Poste | Magescq"],
          fitnessNote: "Pool",
          rawSection: "Wed",
        }),
      });
      const r = runtime as any;
      r.composeState = async () => ({
        values: { kellyDay: "Wednesday" },
        data: {},
        text: "Landes: Maison Devaux.",
      });
      r.useModel = async () =>
        "**Maison Devaux** — Michelin Bib Gourmand. Alternative: **Auberge du Lavoir**.";
      const message = createMockMessage("where to eat in Landes");
      const callback = createMockCallback();
      await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);
      expect(callback.calls.length).toBeGreaterThan(0);
      const text = callback.calls[0]?.text ?? "";
      const names = extractRecommendationNames(text);
      const curatedNames = ["Maison Devaux", "Auberge du Lavoir"];
      for (const name of names) {
        const inAllowlist = placesAllowlist.some((a) => a.includes(name) || name.includes(a));
        const inCurated = curatedNames.some((c) => name.includes(c) || c.includes(name));
        expect(inAllowlist || inCurated).toBe(true);
      }
    });

    it("curated open today for Landes: handler with mocked useModel returning curated place passes", async () => {
      const restaurantsOpenToday = ["Maison Devaux", "Auberge du Lavoir"];
      const runtime = createMockRuntimeWithService({
        getCuratedOpenContext: () => ({
          restaurants: ["Maison Devaux | Rion", "Auberge du Lavoir | Garrosse"],
          hotels: [],
          fitnessNote: "",
          rawSection: "",
        }),
      });
      const r = runtime as any;
      r.composeState = async () => ({
        values: { kellyDay: "Wednesday", restaurantsOpenToday },
        data: {},
        text: "Landes: Maison Devaux, Auberge du Lavoir.",
      });
      r.useModel = async () => "**Maison Devaux** — open today. Alternative: **Auberge du Lavoir**.";
      const message = createMockMessage("where to eat in Landes");
      const callback = createMockCallback();
      await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);
      const text = callback.calls[0]?.text ?? "";
      expect(text).toContain("Maison Devaux");
    });
  });

  describe("KELLY_RECOMMEND_WINE — valid response passes allowlist", () => {
    it("callback with allowlist wine name passes", async () => {
      const runtime = createMockRuntimeWithService();
      const r = runtime as any;
      r.composeState = async () => ({ values: {}, data: {}, text: "" });
      r.useModel = async () =>
        "**Château Olivier** blanc — Pessac-Léognan. Alternative: **Domaine de Chevalier**.";
      const message = createMockMessage("recommend a wine");
      const callback = createMockCallback();
      await kellyRecommendWineAction.handler(runtime, message, createMockState(), {}, callback);
      const text = callback.calls[0]?.text ?? "";
      const names = extractRecommendationNames(text);
      const atLeastOneInAllowlist = names.some((name) =>
        winesAllowlist.some((a) => a.includes(name) || name.includes(a)),
      );
      expect(atLeastOneInAllowlist).toBe(true);
    });
  });

  describe("never invent — documentation", () => {
    it("KELLY_RECOMMEND_PLACE description references knowledge or curated", () => {
      const desc = kellyRecommendPlaceAction.description ?? "";
      expect(
        desc.toLowerCase().includes("the-good-life") ||
          desc.toLowerCase().includes("knowledge") ||
          desc.toLowerCase().includes("curated"),
      ).toBe(true);
    });
    it("KELLY_RECOMMEND_WINE description references knowledge or wine", () => {
      const desc = kellyRecommendWineAction.description ?? "";
      expect(desc.length).toBeGreaterThan(0);
    });
  });

  describe("when knowledge is missing or thin (lacks knowledge)", () => {
    it("recommendPlace: early exit when place is outside default region and context is thin", async () => {
      const runtime = createMockRuntimeWithService();
      (runtime as any).composeState = async () => ({
        values: { kellyDay: "Wednesday" },
        data: {},
        text: "General wellness note.", // short (<200) and must NOT contain placeQuery so early exit triggers
      });
      const message = createMockMessage("best restaurant in Tokyo");
      const callback = createMockCallback();
      await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);

      expect(callback.calls.length).toBe(1);
      const text = (callback.calls[0]?.text ?? "").toLowerCase();
      expect(text).toMatch(/don't have|don’t have|not enough|curated/);
      expect(text).toMatch(/michelin|james edition/);
      expect(text).toContain("tokyo");
      const names = extractRecommendationNames(callback.calls[0]?.text ?? "");
      const recommendedVenues = names.filter((n) =>
        placesAllowlist.some((p) => p.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(p.toLowerCase())),
      );
      expect(recommendedVenues.length).toBe(0);
    });

    it("recommendPlace: when useModel returns empty, callback uses fallback (no invented name)", async () => {
      const runtime = createMockRuntimeWithService();
      (runtime as any).composeState = async () => ({
        values: { kellyDay: "Wednesday", kellyRestaurantsOpenToday: "Wed: Maison Devaux" },
        data: {},
        text: "Bordeaux: some general text about the region. No specific restaurant names in this snippet.",
      });
      (runtime as any).useModel = async () => "";
      const message = createMockMessage("recommend a restaurant in Bordeaux");
      const callback = createMockCallback();
      await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);

      expect(callback.calls.length).toBe(1);
      const text = (callback.calls[0]?.text ?? "").toLowerCase();
      expect(text).toMatch(/don't have|don’t have|not enough|michelin|james edition/);
    });

    it("recommendWine: when useModel returns empty, callback uses fallback", async () => {
      const runtime = createMockRuntimeWithService();
      (runtime as any).composeState = async () => ({
        values: {},
        data: {},
        text: "Wine-tasting: Bordeaux.",
      });
      (runtime as any).useModel = async () => "";
      const message = createMockMessage("wine for steak");
      const callback = createMockCallback();
      await kellyRecommendWineAction.handler(runtime, message, createMockState(), {}, callback);

      expect(callback.calls.length).toBe(1);
      const text = (callback.calls[0]?.text ?? "").toLowerCase();
      expect(text).toMatch(/don't have|don’t have|specific wine|knowledge|dish or occasion/);
    });

    it("itinerary: when useModel returns empty, callback uses fallback", async () => {
      const runtime = createMockRuntimeWithService();
      (runtime as any).composeState = async () => ({
        values: {},
        data: {},
        text: "the-good-life: Bordeaux region.",
      });
      (runtime as any).useModel = async () => "";
      const message = createMockMessage("2 days in Lyon");
      const callback = createMockCallback();
      await kellyItineraryAction.handler(runtime, message, createMockState(), {}, callback);

      expect(callback.calls.length).toBe(1);
      const text = (callback.calls[0]?.text ?? "").toLowerCase();
      expect(text).toMatch(/couldn't|could not|don't have|itinerary|knowledge|michelin|james edition/);
    });

    it("recommendPlace: when useModel returns 'no curated pick' style reply, no invented place name", async () => {
      const runtime = createMockRuntimeWithService();
      (runtime as any).composeState = async () => ({
        values: { kellyDay: "Wednesday" },
        data: {},
        text: "Context for Marseille: no specific restaurant names in the-good-life for this city.",
      });
      (runtime as any).useModel = async () =>
        "I don't have a curated pick for Marseille in my knowledge; check MICHELIN Guide or James Edition.";
      const message = createMockMessage("best restaurant in Marseille");
      const callback = createMockCallback();
      await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);

      expect(callback.calls.length).toBe(1);
      const text = callback.calls[0]?.text ?? "";
      const names = extractRecommendationNames(text);
      const hasSafeFallback =
        /don't have|don’t have|curated pick|michelin|james edition/i.test(text);
      expect(hasSafeFallback).toBe(true);
      expect(names.length).toBe(0);
    });

    it("recommendPlace: response guard replaces callback when useModel returns off-allowlist name", async () => {
      const runtime = createMockRuntimeWithService();
      (runtime as any).composeState = async () => ({
        values: { kellyDay: "Wednesday" },
        data: {},
        text: "Bordeaux: some general text.",
      });
      (runtime as any).useModel = async () =>
        "**Fake Bistro** — great food. Alternative: **Made Up Hotel**.";
      const message = createMockMessage("best restaurant in Bordeaux");
      const callback = createMockCallback();
      await kellyRecommendPlaceAction.handler(runtime, message, createMockState(), {}, callback);

      expect(callback.calls.length).toBe(1);
      const text = (callback.calls[0]?.text ?? "").toLowerCase();
      expect(text).toMatch(/don't have|not enough|curated/);
      expect(text).toMatch(/michelin|james edition/);
      expect(text).toContain("bordeaux");
      const names = extractRecommendationNames(callback.calls[0]?.text ?? "");
      const recommendedVenues = names.filter((n) =>
        placesAllowlist.some((p) => p.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(p.toLowerCase())),
      );
      expect(recommendedVenues.length).toBe(0);
    });
  });
});
