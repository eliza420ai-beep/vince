/**
 * Tests for impliedProbability: impliedProbabilityAbove and clampVol.
 */

import { describe, it, expect } from "bun:test";
import {
  impliedProbabilityAbove,
  clampVol,
} from "../services/impliedProbability";

describe("plugin-polymarket-edge: impliedProbability", () => {
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  describe("impliedProbabilityAbove", () => {
    it("returns > 0.5 when spot > strike with T > 0 and vol > 0", () => {
      const expiryMs = Date.now() + oneYearMs;
      const prob = impliedProbabilityAbove(70_000, 60_000, expiryMs, 0.5);
      expect(prob).toBeGreaterThan(0.5);
      expect(prob).toBeLessThanOrEqual(1);
    });

    it("returns < 0.5 when spot < strike with T > 0", () => {
      const expiryMs = Date.now() + oneYearMs;
      const prob = impliedProbabilityAbove(60_000, 70_000, expiryMs, 0.5);
      expect(prob).toBeLessThan(0.5);
      expect(prob).toBeGreaterThanOrEqual(0);
    });

    it("returns 1 when T <= 0 and spot > strike", () => {
      const expiryMs = Date.now() - 1000;
      const prob = impliedProbabilityAbove(70_000, 60_000, expiryMs, 0.5);
      expect(prob).toBe(1);
    });

    it("returns 0 when T <= 0 and spot < strike", () => {
      const expiryMs = Date.now() - 1000;
      const prob = impliedProbabilityAbove(60_000, 70_000, expiryMs, 0.5);
      expect(prob).toBe(0);
    });

    it("returns 0.5 when spot <= 0", () => {
      const expiryMs = Date.now() + oneYearMs;
      expect(impliedProbabilityAbove(0, 70_000, expiryMs, 0.5)).toBe(0.5);
      expect(impliedProbabilityAbove(-1, 70_000, expiryMs, 0.5)).toBe(0.5);
    });

    it("returns 0.5 when strike <= 0", () => {
      const expiryMs = Date.now() + oneYearMs;
      expect(impliedProbabilityAbove(70_000, 0, expiryMs, 0.5)).toBe(0.5);
      expect(impliedProbabilityAbove(70_000, -1, expiryMs, 0.5)).toBe(0.5);
    });
  });

  describe("clampVol", () => {
    it("returns value in [0.2, 2.0] for in-range vol", () => {
      expect(clampVol(0.5)).toBe(0.5);
      expect(clampVol(1)).toBe(1);
      expect(clampVol(0.2)).toBe(0.2);
      expect(clampVol(2)).toBe(2);
    });

    it("returns 0.2 when vol below 0.2", () => {
      expect(clampVol(0)).toBe(0.2);
      expect(clampVol(0.1)).toBe(0.2);
    });

    it("returns 2 when vol above 2", () => {
      expect(clampVol(3)).toBe(2);
      expect(clampVol(10)).toBe(2);
    });
  });
});
