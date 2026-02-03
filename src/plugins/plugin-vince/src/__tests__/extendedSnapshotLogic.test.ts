/**
 * Unit tests for extended snapshot logic (DATA_LEVERAGE):
 * - Book imbalance filter (reject long when book favors sellers, short when book favors buyers)
 * - SMA20 trend alignment confidence boost
 * - Funding reversal confidence boost
 *
 * Learnings to improve:
 * - Thresholds are exported from the util so tuning is explicit and testable.
 * - Integration: evaluateAndTrade() is not covered here; consider an e2e or mocked service test.
 * - DVOL sizing lives in the service; add tests there if that logic becomes more complex.
 */

import { describe, it, expect } from "bun:test";
import {
  getBookImbalanceRejection,
  getSma20ConfidenceBoost,
  getFundingReversalConfidenceBoost,
  getAdjustedConfidence,
  BOOK_IMBALANCE_THRESHOLD,
  FUNDING_DELTA_THRESHOLD,
  CONFIDENCE_BOOST,
  MAX_CONFIDENCE,
  type ExtendedSnapshot,
  type SignalDirection,
} from "../utils/extendedSnapshotLogic";

function snap(overrides: Partial<ExtendedSnapshot> = {}): ExtendedSnapshot {
  return {
    bookImbalance: null,
    priceVsSma20: null,
    fundingDelta: null,
    dvol: null,
    ...overrides,
  };
}

describe("extendedSnapshotLogic", () => {
  describe("getBookImbalanceRejection", () => {
    it("returns reject for long when bookImbalance < -0.2", () => {
      expect(
        getBookImbalanceRejection({ direction: "long", confidence: 70 }, snap({ bookImbalance: -0.25 }))
      ).toEqual({ reject: true, reason: "Order book favors sellers (imbalance -0.25)" });
      expect(
        getBookImbalanceRejection({ direction: "long", confidence: 70 }, snap({ bookImbalance: -0.2 }))
      ).toEqual({ reject: false });
    });

    it("returns reject for short when bookImbalance > 0.2", () => {
      expect(
        getBookImbalanceRejection({ direction: "short", confidence: 70 }, snap({ bookImbalance: 0.3 }))
      ).toEqual({ reject: true, reason: "Order book favors buyers (imbalance 0.30)" });
      expect(
        getBookImbalanceRejection({ direction: "short", confidence: 70 }, snap({ bookImbalance: 0.2 }))
      ).toEqual({ reject: false });
    });

    it("does not reject long when bookImbalance >= -0.2", () => {
      expect(getBookImbalanceRejection({ direction: "long", confidence: 70 }, snap({ bookImbalance: 0 }))).toEqual({
        reject: false,
      });
      expect(getBookImbalanceRejection({ direction: "long", confidence: 70 }, snap({ bookImbalance: 0.1 }))).toEqual({
        reject: false,
      });
    });

    it("does not reject short when bookImbalance <= 0.2", () => {
      expect(getBookImbalanceRejection({ direction: "short", confidence: 70 }, snap({ bookImbalance: -0.1 }))).toEqual({
        reject: false,
      });
      expect(getBookImbalanceRejection({ direction: "short", confidence: 70 }, snap({ bookImbalance: 0 }))).toEqual({
        reject: false,
      });
    });

    it("does not reject when direction is neutral", () => {
      expect(
        getBookImbalanceRejection({ direction: "neutral", confidence: 70 }, snap({ bookImbalance: -0.5 }))
      ).toEqual({ reject: false });
    });

    it("does not reject when snapshot is null or bookImbalance is null", () => {
      expect(getBookImbalanceRejection({ direction: "long", confidence: 70 }, null)).toEqual({ reject: false });
      expect(getBookImbalanceRejection({ direction: "long", confidence: 70 }, snap())).toEqual({ reject: false });
    });
  });

  describe("getSma20ConfidenceBoost", () => {
    it("adds 5 for long when priceVsSma20 > 0", () => {
      expect(getSma20ConfidenceBoost({ direction: "long", confidence: 70 }, snap({ priceVsSma20: 1.5 }))).toBe(5);
      expect(getSma20ConfidenceBoost({ direction: "long", confidence: 70 }, snap({ priceVsSma20: 0.1 }))).toBe(5);
    });

    it("adds 5 for short when priceVsSma20 < 0", () => {
      expect(getSma20ConfidenceBoost({ direction: "short", confidence: 70 }, snap({ priceVsSma20: -1.2 }))).toBe(5);
      expect(getSma20ConfidenceBoost({ direction: "short", confidence: 70 }, snap({ priceVsSma20: -0.1 }))).toBe(5);
    });

    it("adds 0 for long when priceVsSma20 <= 0", () => {
      expect(getSma20ConfidenceBoost({ direction: "long", confidence: 70 }, snap({ priceVsSma20: 0 }))).toBe(0);
      expect(getSma20ConfidenceBoost({ direction: "long", confidence: 70 }, snap({ priceVsSma20: -1 }))).toBe(0);
    });

    it("adds 0 for short when priceVsSma20 >= 0", () => {
      expect(getSma20ConfidenceBoost({ direction: "short", confidence: 70 }, snap({ priceVsSma20: 0 }))).toBe(0);
      expect(getSma20ConfidenceBoost({ direction: "short", confidence: 70 }, snap({ priceVsSma20: 1 }))).toBe(0);
    });

    it("adds 0 for neutral direction", () => {
      expect(getSma20ConfidenceBoost({ direction: "neutral", confidence: 70 }, snap({ priceVsSma20: 2 }))).toBe(0);
    });

    it("adds 0 when snapshot or priceVsSma20 is null", () => {
      expect(getSma20ConfidenceBoost({ direction: "long", confidence: 70 }, null)).toBe(0);
      expect(getSma20ConfidenceBoost({ direction: "long", confidence: 70 }, snap())).toBe(0);
    });
  });

  describe("getFundingReversalConfidenceBoost", () => {
    it("adds 5 when |fundingDelta| > 0.0003 and signs opposite", () => {
      expect(getFundingReversalConfidenceBoost(snap({ fundingDelta: 0.0005 }), -0.0001)).toBe(5);
      expect(getFundingReversalConfidenceBoost(snap({ fundingDelta: -0.0004 }), 0.0002)).toBe(5);
    });

    it("adds 0 when delta and funding same sign", () => {
      expect(getFundingReversalConfidenceBoost(snap({ fundingDelta: 0.0005 }), 0.0001)).toBe(0);
      expect(getFundingReversalConfidenceBoost(snap({ fundingDelta: -0.0004 }), -0.0002)).toBe(0);
    });

    it("adds 0 when |fundingDelta| <= 0.0003", () => {
      expect(getFundingReversalConfidenceBoost(snap({ fundingDelta: 0.0003 }), -0.001)).toBe(0);
      expect(getFundingReversalConfidenceBoost(snap({ fundingDelta: 0.0002 }), -0.001)).toBe(0);
    });

    it("adds 0 when snapshot or fundingDelta is null", () => {
      expect(getFundingReversalConfidenceBoost(null, 0.001)).toBe(0);
      expect(getFundingReversalConfidenceBoost(snap(), 0.001)).toBe(0);
    });
  });

  describe("getAdjustedConfidence", () => {
    it("caps at 100", () => {
      const signal: SignalDirection = { direction: "long", confidence: 98 };
      const snapshot = snap({ priceVsSma20: 2, fundingDelta: 0.001 });
      expect(getAdjustedConfidence(signal, snapshot, -0.0001)).toBe(100);
    });

    it("applies both SMA20 and funding reversal boosts", () => {
      const signal: SignalDirection = { direction: "long", confidence: 60 };
      const snapshot = snap({ priceVsSma20: 1, fundingDelta: 0.0005 });
      expect(getAdjustedConfidence(signal, snapshot, -0.0001)).toBe(70);
    });

    it("returns base confidence when no boosts apply", () => {
      expect(getAdjustedConfidence({ direction: "long", confidence: 65 }, snap(), 0)).toBe(65);
      expect(
        getAdjustedConfidence(
          { direction: "long", confidence: 65 },
          snap({ priceVsSma20: -1, fundingDelta: 0.0001 }),
          0.001
        )
      ).toBe(65);
    });

    it("never returns negative confidence", () => {
      expect(getAdjustedConfidence({ direction: "long", confidence: 0 }, snap(), 0)).toBe(0);
    });
  });

  describe("thresholds (documented for tuning)", () => {
    it("uses BOOK_IMBALANCE_THRESHOLD 0.2 for product consistency", () => {
      expect(BOOK_IMBALANCE_THRESHOLD).toBe(0.2);
    });
    it("uses FUNDING_DELTA_THRESHOLD 0.0003 for reversal boost", () => {
      expect(FUNDING_DELTA_THRESHOLD).toBe(0.0003);
    });
    it("uses CONFIDENCE_BOOST 5 and MAX_CONFIDENCE 100", () => {
      expect(CONFIDENCE_BOOST).toBe(5);
      expect(MAX_CONFIDENCE).toBe(100);
    });
  });
});
