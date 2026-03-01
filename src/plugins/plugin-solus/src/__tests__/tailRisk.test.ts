import { describe, it, expect } from "vitest";
import {
  tailRiskClosedForm,
  tailRiskImportanceSampling,
  tailRisk,
} from "../utils/tailRisk";

describe("tailRisk", () => {
  describe("tailRiskClosedForm", () => {
    it("returns a small probability for small crash threshold (e.g. 1% down)", () => {
      const S0 = 100_000;
      const sigma = 0.5;
      const T = 7 / 365;
      const p = tailRiskClosedForm(S0, 0.01, sigma, T);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(0.5);
    });

    it("returns higher P for smaller crash threshold (easier to breach)", () => {
      const S0 = 100_000;
      const sigma = 0.5;
      const T = 7 / 365;
      const p10 = tailRiskClosedForm(S0, 0.1, sigma, T); // P(spot < 0.9*S0)
      const p20 = tailRiskClosedForm(S0, 0.2, sigma, T); // P(spot < 0.8*S0)
      expect(p10).toBeGreaterThan(p20);
    });

    it("returns value in [0, 1]", () => {
      const S0 = 100_000;
      const sigma = 0.55;
      const T = 7 / 365;
      const p = tailRiskClosedForm(S0, 0.15, sigma, T);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });

    it("returns 0 for invalid inputs", () => {
      expect(tailRiskClosedForm(0, 0.15, 0.5, 7 / 365)).toBe(0);
      expect(tailRiskClosedForm(100_000, 0, 0.5, 7 / 365)).toBe(0);
      expect(tailRiskClosedForm(100_000, 1, 0.5, 7 / 365)).toBe(0);
    });
  });

  describe("tailRiskImportanceSampling", () => {
    it("returns p in [0, 1] and non-negative se", () => {
      const { p, se } = tailRiskImportanceSampling(
        100_000,
        0.15,
        0.5,
        7 / 365,
        20_000,
      );
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(se).toBeGreaterThanOrEqual(0);
    });

    it("is roughly consistent with closed form for 15% crash", () => {
      const S0 = 100_000;
      const sigma = 0.5;
      const T = 7 / 365;
      const closed = tailRiskClosedForm(S0, 0.15, sigma, T);
      const { p } = tailRiskImportanceSampling(S0, 0.15, sigma, T, 30_000);
      expect(Math.abs(p - closed)).toBeLessThan(0.05);
    });
  });

  describe("tailRisk", () => {
    it("returns p in [0, 1] using closed form by default", () => {
      const { p } = tailRisk(100_000, 50, 7 / 365, 15);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    });

    it("returns se when useImportanceSampling is true", () => {
      const out = tailRisk(100_000, 50, 7 / 365, 15, true);
      expect(out.p).toBeGreaterThanOrEqual(0);
      expect(out.p).toBeLessThanOrEqual(1);
      expect((out as { se?: number }).se).toBeDefined();
    });
  });
});
