/**
 * KellyLifestyleService tests.
 */

import { describe, it, expect } from "bun:test";
import { KellyLifestyleService } from "../services/lifestyle.service";
import { createMockRuntime } from "./test-utils";

describe("KellyLifestyleService", () => {
  async function getService(): Promise<KellyLifestyleService> {
    return KellyLifestyleService.start(createMockRuntime() as any);
  }

  describe("getDailyBriefing", () => {
    it("returns day, date, suggestions, and specialNotes", async () => {
      const service = await getService();
      const briefing = service.getDailyBriefing();
      expect(briefing).toBeDefined();
      expect(typeof briefing.day).toBe("string");
      expect(briefing.day.length).toBeGreaterThan(0);
      expect(typeof briefing.date).toBe("string");
      expect(/\d{4}-\d{2}-\d{2}/.test(briefing.date)).toBe(true);
      expect(Array.isArray(briefing.suggestions)).toBe(true);
      expect(Array.isArray(briefing.specialNotes)).toBe(true);
    });
  });

  describe("getWellnessTipOfTheDay", () => {
    it("returns a non-empty string", async () => {
      const service = await getService();
      const tip = service.getWellnessTipOfTheDay();
      expect(typeof tip).toBe("string");
      expect(tip.length).toBeGreaterThan(0);
    });
  });

  describe("getCuratedOpenContext", () => {
    it("returns null or an object with restaurants and hotels", async () => {
      const service = await getService();
      const ctx = service.getCuratedOpenContext();
      if (ctx === null) {
        expect(ctx).toBeNull();
        return;
      }
      expect(Array.isArray(ctx.restaurants)).toBe(true);
      expect(Array.isArray(ctx.hotels)).toBe(true);
      expect(typeof ctx.fitnessNote).toBe("string");
    });
  });

  describe("getWineOfTheDay", () => {
    it("returns a non-empty string", async () => {
      const service = await getService();
      const wine = service.getWineOfTheDay();
      expect(typeof wine).toBe("string");
      expect(wine.length).toBeGreaterThan(0);
    });
  });

  describe("getTravelIdeaOfTheWeek", () => {
    it("returns a non-empty string", async () => {
      const service = await getService();
      const idea = service.getTravelIdeaOfTheWeek();
      expect(typeof idea).toBe("string");
      expect(idea.length).toBeGreaterThan(0);
    });
  });

  describe("getCurrentSeason", () => {
    it("returns pool or gym", async () => {
      const service = await getService();
      const season = service.getCurrentSeason();
      expect(season === "pool" || season === "gym").toBe(true);
    });
  });
});
