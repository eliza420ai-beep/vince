/**
 * Tests for impliedProbabilityAbove and clampVol.
 */

import { describe, it, expect } from "bun:test";
import {
  impliedProbabilityAbove,
  clampVol,
} from "../services/impliedProbability";

describe("plugin-polymarket-arb: impliedProbability", () => {
  describe("clampVol", () => {
    it("clamps below 0.2 to 0.2", () => {
      expect(clampVol(0)).toBe(0.2);
      expect(clampVol(0.1)).toBe(0.2);
    });

    it("clamps above 2.0 to 2.0", () => {
      expect(clampVol(3)).toBe(2);
      expect(clampVol(0.5)).toBe(0.5);
    });

    it("passes through values in [0.2, 2.0] range", () => {
      expect(clampVol(0.5)).toBe(0.5);
      expect(clampVol(1.0)).toBe(1);
      expect(clampVol(1.5)).toBe(1.5);
    });
  });

  describe("impliedProbabilityAbove", () => {
    it("returns 0.5 when spot or strike <= 0", () => {
      expect(
        impliedProbabilityAbove(0, 100000, Date.now() + 86400000, 0.5),
      ).toBe(0.5);
      expect(
        impliedProbabilityAbove(100000, 0, Date.now() + 86400000, 0.5),
      ).toBe(0.5);
    });

    it("returns 1 when spot > strike and T <= 0", () => {
      const past = Date.now() - 1000;
      expect(impliedProbabilityAbove(110000, 100000, past, 0.5)).toBe(1);
    });

    it("returns 0 when spot <= strike and T <= 0", () => {
      const past = Date.now() - 1000;
      expect(impliedProbabilityAbove(90000, 100000, past, 0.5)).toBe(0);
    });

    it("returns probability in (0,1) for future expiry", () => {
      const future = Date.now() + 86400000; // 1 day
      const prob = impliedProbabilityAbove(100000, 100000, future, 0.5);
      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(1);
    });

    it("higher spot gives higher probability", () => {
      const future = Date.now() + 86400000;
      const p1 = impliedProbabilityAbove(95000, 100000, future, 0.5);
      const p2 = impliedProbabilityAbove(105000, 100000, future, 0.5);
      expect(p2).toBeGreaterThan(p1);
    });
  });
});
