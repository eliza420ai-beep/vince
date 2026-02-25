/**
 * VincePositionGuardrails Service Tests (#61)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { VincePositionGuardrailsService } from "../services/vincePositionGuardrails.service";
import { VinceCapitalBucketsService } from "../services/vinceCapitalBuckets.service";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let svc: VincePositionGuardrailsService;
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "guardrails-test-"));
  VincePositionGuardrailsService.setInstance(
    null as unknown as VincePositionGuardrailsService,
  );
  svc = new VincePositionGuardrailsService();

  // Set up a fresh capital buckets service with known state
  VinceCapitalBucketsService.setInstance(null as unknown as VinceCapitalBucketsService);
  const buckets = new VinceCapitalBucketsService(tmpDir);
  VinceCapitalBucketsService.setInstance(buckets);
});

describe("VincePositionGuardrailsService", () => {
  describe("hard block: below minimum size", () => {
    it("blocks when requestedSize < GUARDRAIL_MIN_SIZE_USD (10)", () => {
      const result = svc.applyGuardrails({
        requestedSizeUsd: 5,
        bucketId: "paper",
        asset: "BTC",
      });
      expect(result.hardBlocked).toBe(true);
      expect(result.blockReason).toContain("size-below-minimum");
      expect(result.approvedSizeUsd).toBe(0);
    });
  });

  describe("hard block: exceeds hard cap", () => {
    it("blocks when requestedSize > GUARDRAIL_MAX_SIZE_USD (500)", () => {
      const result = svc.applyGuardrails({
        requestedSizeUsd: 600,
        bucketId: "paper",
        asset: "BTC",
      });
      expect(result.hardBlocked).toBe(true);
      expect(result.blockReason).toContain("size-exceeds-hard-cap");
      expect(result.approvedSizeUsd).toBe(0);
    });
  });

  describe("passes through valid size", () => {
    it("approves size within bounds", () => {
      const result = svc.applyGuardrails({
        requestedSizeUsd: 100,
        bucketId: "paper",
        asset: "SOL",
        openPositions: [],
      });
      expect(result.hardBlocked).toBe(false);
      expect(result.approvedSizeUsd).toBe(100);
    });
  });

  describe("reduction: max position pct", () => {
    it("reduces when position exceeds max % of bucket capital", () => {
      // Paper bucket has allocatedUsd=100000; 10% = 10000
      // Request 15000 should be reduced to 10000 (or blocked by hard cap first)
      // Hard cap is 500, so let's test with a smaller bucket
      // The service reads from the singleton, so we need a custom bucket
      const bucketsService = VinceCapitalBucketsService.getInstance();
      bucketsService.updateBucketConfig("pilot", {
        allocatedUsd: 1000, // 10% = 100
      });

      const result = svc.applyGuardrails({
        requestedSizeUsd: 200, // over 10% of 1000=100, but also under hard cap 500
        bucketId: "pilot",
        asset: "SOL",
        openPositions: [],
      });
      // Note: hard cap is 500, but 10% of $1000 = $100
      // So approved should be reduced to 100
      expect(result.hardBlocked).toBe(false);
      expect(result.approvedSizeUsd).toBeLessThan(result.originalSizeUsd);
      expect(result.approvedSizeUsd).toBe(100);
      expect(result.reductionReason).toContain("max-position-pct");
    });
  });

  describe("correlated exposure", () => {
    it("getCorrelatedExposure returns sum of BTC+ETH positions for BTC query", () => {
      const openPositions = [
        { asset: "BTC", sizeUsd: 200 },
        { asset: "ETH", sizeUsd: 150 },
        { asset: "SOL", sizeUsd: 100 },
      ];
      const exposure = svc.getCorrelatedExposure("ETH", openPositions);
      // ETH is correlated with BTC; correlated group = [BTC, ETH]
      expect(exposure).toBe(350); // BTC + ETH
    });

    it("getCorrelatedExposure returns 0 for non-correlated asset", () => {
      const openPositions = [
        { asset: "BTC", sizeUsd: 200 },
        { asset: "ETH", sizeUsd: 150 },
      ];
      const exposure = svc.getCorrelatedExposure("SOL", openPositions);
      expect(exposure).toBe(0);
    });

    it("blocks when correlated exposure at limit", () => {
      const bucketsService = VinceCapitalBucketsService.getInstance();
      // Set pilot: 1000 allocated, 25% correlated = 250 max
      bucketsService.updateBucketConfig("pilot", {
        allocatedUsd: 1000,
      });

      // Existing BTC + ETH exposure = 250 (at limit)
      const openPositions = [
        { asset: "BTC", sizeUsd: 150 },
        { asset: "ETH", sizeUsd: 100 },
      ];

      const result = svc.applyGuardrails({
        requestedSizeUsd: 50,
        bucketId: "pilot",
        asset: "ETH",
        openPositions,
      });
      // correlated exposure = 250 (150 BTC + 100 ETH), max = 250
      // remaining room = 0 → hard blocked
      expect(result.hardBlocked).toBe(true);
      expect(result.blockReason).toContain("correlated-exposure-full");
    });
  });

  describe("guardrails only reduce", () => {
    it("approved size is always <= requested size", () => {
      const result = svc.applyGuardrails({
        requestedSizeUsd: 100,
        bucketId: "paper",
        asset: "BTC",
        openPositions: [],
      });
      expect(result.approvedSizeUsd).toBeLessThanOrEqual(
        result.originalSizeUsd,
      );
    });
  });
});
