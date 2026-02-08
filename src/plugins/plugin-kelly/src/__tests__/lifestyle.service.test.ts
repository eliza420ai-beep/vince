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

  describe("getPalacePoolStatusLine", () => {
    it("returns 'back open' for past reopen dates, 'reopens' for future", async () => {
      const service = await getService();
      const beforeAll = new Date(2026, 0, 15);
      const afterCaudalie = new Date(2026, 1, 10);
      const afterAll = new Date(2026, 3, 1);

      const lineBefore = service.getPalacePoolStatusLine(beforeAll);
      const lineAfterCaudalie = service.getPalacePoolStatusLine(afterCaudalie);
      const lineAfterAll = service.getPalacePoolStatusLine(afterAll);

      expect(lineBefore).toMatch(/reopens/i);
      expect(lineBefore).not.toMatch(/back open/i);

      expect(lineAfterCaudalie).toMatch(/Caudalie: back open/i);
      expect(lineAfterCaudalie).toMatch(/Palais reopens Feb 12/i);

      expect(lineAfterAll).toMatch(/back open/i);
      expect(lineAfterAll).not.toMatch(/reopens Feb 5/);
    });
  });
});
