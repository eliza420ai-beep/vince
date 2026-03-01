import { describe, it, expect } from "vitest";
import {
  jointAssignmentProbs,
  correlationMatrixForAssets,
} from "../utils/portfolioCopula";

describe("portfolioCopula", () => {
  describe("jointAssignmentProbs", () => {
    it("returns single-position probs when probs.length < 2", () => {
      const r = jointAssignmentProbs([0.3], [[]], 1000);
      expect(r.pAtLeastOne).toBeCloseTo(0.3, 1);
      expect(r.pAll).toBeCloseTo(0.3, 1);
      expect(r.pNone).toBeCloseTo(0.7, 1);
    });

    it("two positions: joint probs in [0, 1] and pAtLeastOne >= max(p1,p2)", () => {
      const probs = [0.4, 0.5];
      const corr = [
        [1, 0.6],
        [0.6, 1],
      ];
      const r = jointAssignmentProbs(probs, corr, 20_000);
      expect(r.pAtLeastOne).toBeGreaterThanOrEqual(0);
      expect(r.pAtLeastOne).toBeLessThanOrEqual(1);
      expect(r.pAll).toBeGreaterThanOrEqual(0);
      expect(r.pAll).toBeLessThanOrEqual(1);
      expect(r.pNone).toBeGreaterThanOrEqual(0);
      expect(r.pNone).toBeLessThanOrEqual(1);
      expect(r.pAtLeastOne).toBeGreaterThanOrEqual(0.5);
      expect(r.pNone + r.pAtLeastOne).toBeCloseTo(1, 0);
    });

    it("two independent (corr=0): pNone ≈ (1-p1)(1-p2)", () => {
      const probs = [0.5, 0.5];
      const corr = [
        [1, 0],
        [0, 1],
      ];
      const r = jointAssignmentProbs(probs, corr, 50_000);
      expect(r.pNone).toBeCloseTo(0.25, 1);
      expect(r.pAll).toBeCloseTo(0.25, 1);
      expect(r.pAtLeastOne).toBeCloseTo(0.75, 1);
    });
  });

  describe("correlationMatrixForAssets", () => {
    it("returns 1 on diagonal and symmetric matrix", () => {
      const M = correlationMatrixForAssets(["BTC", "ETH", "SOL"]);
      expect(M).toHaveLength(3);
      expect(M[0]![0]).toBe(1);
      expect(M[1]![1]).toBe(1);
      expect(M[2]![2]).toBe(1);
      expect(M[0]![1]).toBe(M[1]![0]);
      expect(M[0]![2]).toBe(M[2]![0]);
    });
  });
});
