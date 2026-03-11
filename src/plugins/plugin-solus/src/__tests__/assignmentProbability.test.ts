/**
 * Unit tests for assignment probability (GBM, N(d2)) and expiry helpers.
 * Matches the model in skills/quant/1.py (binary contract P(S_T > K)).
 */

import { describe, it, expect } from "vitest";
import {
  normalCDF,
  assignmentProbabilityGBM,
  getNextFriday0800UTC,
  getTYearsToNextFriday,
} from "../utils/assignmentProbability";

describe("assignmentProbability", () => {
  describe("normalCDF", () => {
    it("returns 0.5 at x=0", () => {
      expect(normalCDF(0)).toBeCloseTo(0.5, 5);
    });
    it("returns values in (0,1) and is increasing", () => {
      expect(normalCDF(-2)).toBeGreaterThan(0);
      expect(normalCDF(-2)).toBeLessThan(0.5);
      expect(normalCDF(2)).toBeGreaterThan(0.5);
      expect(normalCDF(2)).toBeLessThan(1);
      expect(normalCDF(1)).toBeGreaterThan(normalCDF(0));
      expect(normalCDF(-1)).toBeLessThan(normalCDF(0));
    });
    it("approximates N(1.96) ~ 0.975 and N(-1.96) ~ 0.025", () => {
      expect(normalCDF(1.96)).toBeCloseTo(0.975, 2);
      expect(normalCDF(-1.96)).toBeCloseTo(0.025, 2);
    });
  });

  describe("assignmentProbabilityGBM", () => {
    it("returns P(spot > strike) in (0,1) with valid ci95", () => {
      const r = assignmentProbabilityGBM({
        spot: 100,
        strike: 105,
        sigmaAnnual: 0.2,
        TYears: 7 / 365,
      });
      expect(r.probability).toBeGreaterThan(0);
      expect(r.probability).toBeLessThan(1);
      expect(r.ci95[0]).toBeLessThanOrEqual(r.probability);
      expect(r.ci95[1]).toBeGreaterThanOrEqual(r.probability);
      expect(r.ci95[0]).toBeGreaterThanOrEqual(0);
      expect(r.ci95[1]).toBeLessThanOrEqual(1);
    });
    it("matches known N(d2) for spot=100, strike=105, sigma=0.2, T=7/365 (OTM call ~3–5%)", () => {
      const r = assignmentProbabilityGBM({
        spot: 100,
        strike: 105,
        sigmaAnnual: 0.2,
        TYears: 7 / 365,
      });
      // d2 ≈ -1.78 → N(d2) ≈ 0.037–0.04
      expect(r.probability).toBeGreaterThan(0.02);
      expect(r.probability).toBeLessThan(0.06);
    });
    it("gives higher probability when spot is above strike (ITM call)", () => {
      const otm = assignmentProbabilityGBM({
        spot: 100,
        strike: 105,
        sigmaAnnual: 0.2,
        TYears: 7 / 365,
      });
      const itm = assignmentProbabilityGBM({
        spot: 105,
        strike: 100,
        sigmaAnnual: 0.2,
        TYears: 7 / 365,
      });
      expect(itm.probability).toBeGreaterThan(otm.probability);
      expect(itm.probability).toBeGreaterThan(0.5);
    });
    it("handles invalid inputs with safe default (0.5, [0,1])", () => {
      const r = assignmentProbabilityGBM({
        spot: 0,
        strike: 100,
        sigmaAnnual: 0.2,
        TYears: 7 / 365,
      });
      expect(r.probability).toBe(0.5);
      expect(r.ci95).toEqual([0, 1]);
    });
  });

  describe("getNextFriday0800UTC", () => {
    it("returns a Friday 08:00 UTC timestamp", () => {
      const ts = getNextFriday0800UTC(new Date("2026-03-02T12:00:00Z"));
      const d = new Date(ts);
      expect(d.getUTCDay()).toBe(5);
      expect(d.getUTCHours()).toBe(8);
      expect(d.getUTCMinutes()).toBe(0);
    });
    it("returns next Friday when given a Monday", () => {
      const monday = new Date("2026-03-02T00:00:00Z");
      const friday = getNextFriday0800UTC(monday);
      const d = new Date(friday);
      expect(d.getUTCDate()).toBe(6);
      expect(d.getUTCDay()).toBe(5);
    });
  });

  describe("getTYearsToNextFriday", () => {
    it("returns positive T in years (order of magnitude for ~1 week)", () => {
      const t = getTYearsToNextFriday(new Date("2026-03-02T00:00:00Z"));
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThan(0.1);
      expect(t).toBeCloseTo(4 / 365.25, 1);
    });
  });
});
