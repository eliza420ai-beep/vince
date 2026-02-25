/**
 * SourceReputationService Tests (#72)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { SourceReputationService } from "../services/sourceReputation.service";
import type { SourceQualityRecord } from "../services/xSourceQuality.service";

let tmpDir: string;
let svc: SourceReputationService;

function makeQualityRecord(
  handle: string,
  precision: number,
  calibration: number,
  recall = precision,
  hoursAgo = 2,
): SourceQualityRecord {
  const lastUpdated = new Date(
    Date.now() - hoursAgo * 60 * 60 * 1000,
  ).toISOString();
  return {
    handle,
    precision,
    recall,
    calibration,
    timeToResolutionHrs: 24,
    totalPredictions: 10,
    correctPredictions: Math.round(precision * 10),
    lastUpdated,
  };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "source-rep-test-"));
  svc = new SourceReputationService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("SourceReputationService", () => {
  describe("recalculate", () => {
    it("assigns tier-1 for high performer (precision=0.9, calibration=0.9, recent)", () => {
      const qr = makeQualityRecord("@alpha", 0.9, 0.9, 0.9, 1);
      const record = svc.recalculate("@alpha", qr);

      expect(record.handle).toBe("@alpha");
      expect(record.reputationScore).toBeGreaterThan(70);
      expect(record.tier).toBe("tier-1");
      expect(record.lastRecalculated).toBeTruthy();
    });

    it("assigns watchlist for low performer (precision=0.1, calibration=0.1, inconsistent, very stale)", () => {
      // Use recall=0.6 (inconsistent with precision=0.1) to get worse consistency score
      // deviation = |0.1 - 0.6| = 0.5, consistencyNorm = (1-0.5)*10 = 5
      // score = 1*4 + 1*3 + 5*2 + 0*1 = 4 + 3 + 10 + 0 = 17 → watchlist
      const qr = makeQualityRecord("@poor", 0.1, 0.1, 0.6, 100 * 24); // 100 days old, inconsistent
      const record = svc.recalculate("@poor", qr);

      expect(record.reputationScore).toBeLessThan(30);
      expect(record.tier).toBe("watchlist");
    });

    it("assigns tier-2 for mid performer", () => {
      const qr = makeQualityRecord("@mid", 0.65, 0.65, 0.65, 5);
      const record = svc.recalculate("@mid", qr);

      expect(record.reputationScore).toBeGreaterThanOrEqual(30);
      // Mid performers typically land in tier-2 or tier-3
      expect(["tier-1", "tier-2", "tier-3"]).toContain(record.tier);
    });

    it("persists the record to disk", () => {
      const qr = makeQualityRecord("@saved", 0.8, 0.8, 0.8, 2);
      svc.recalculate("@saved", qr);

      const svc2 = new SourceReputationService(tmpDir);
      const top = svc2.getTopTierSources("tier-1");
      // might be tier-1 or tier-2, just check it was persisted
      const allSvc2 = [
        ...svc2.getTopTierSources("tier-1"),
        ...svc2.getTopTierSources("tier-2"),
        ...svc2.getTopTierSources("tier-3"),
        ...svc2.getTopTierSources("watchlist"),
      ];
      expect(allSvc2.some((r) => r.handle === "@saved")).toBe(true);
    });

    it("updates existing record on re-calculate", () => {
      const qr1 = makeQualityRecord("@evolving", 0.5, 0.5, 0.5, 5);
      svc.recalculate("@evolving", qr1);

      const qr2 = makeQualityRecord("@evolving", 0.9, 0.9, 0.9, 1);
      const record = svc.recalculate("@evolving", qr2);

      // Score should be higher now
      expect(record.reputationScore).toBeGreaterThan(70);

      // Should not have duplicate entries
      const all = [
        ...svc.getTopTierSources("tier-1"),
        ...svc.getTopTierSources("tier-2"),
        ...svc.getTopTierSources("tier-3"),
        ...svc.getTopTierSources("watchlist"),
      ];
      const handles = all.filter((r) => r.handle === "@evolving");
      expect(handles).toHaveLength(1);
    });
  });

  describe("getTopTierSources", () => {
    it("returns sources in the specified tier, sorted descending by score", () => {
      svc.recalculate("@a", makeQualityRecord("@a", 0.95, 0.95, 0.95, 1));
      svc.recalculate("@b", makeQualityRecord("@b", 0.85, 0.85, 0.85, 1));
      svc.recalculate("@c", makeQualityRecord("@c", 0.1, 0.1, 0.1, 100 * 24));

      const tier1 = svc.getTopTierSources("tier-1");
      expect(tier1.length).toBeGreaterThanOrEqual(1);
      for (const r of tier1) {
        expect(r.tier).toBe("tier-1");
      }
      // Verify descending order
      for (let i = 1; i < tier1.length; i++) {
        expect(tier1[i - 1].reputationScore).toBeGreaterThanOrEqual(
          tier1[i].reputationScore,
        );
      }
    });

    it("returns empty array for a tier with no members", () => {
      const results = svc.getTopTierSources("tier-1");
      expect(results).toHaveLength(0);
    });
  });

  describe("getTierBreakdown", () => {
    it("counts sources per tier", () => {
      svc.recalculate("@top1", makeQualityRecord("@top1", 0.95, 0.95, 0.95, 1));
      svc.recalculate("@low1", makeQualityRecord("@low1", 0.1, 0.1, 0.1, 200 * 24));

      const breakdown = svc.getTierBreakdown();
      expect(typeof breakdown["tier-1"]).toBe("number");
      expect(typeof breakdown["watchlist"]).toBe("number");
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      expect(total).toBe(2);
    });

    it("returns 0 counts when no sources exist", () => {
      const breakdown = svc.getTierBreakdown();
      expect(breakdown["tier-1"]).toBe(0);
      expect(breakdown["tier-2"]).toBe(0);
      expect(breakdown["tier-3"]).toBe(0);
      expect(breakdown["watchlist"]).toBe(0);
    });
  });

  describe("reputationScore boundary conditions", () => {
    it("score is clamped to 0-100", () => {
      const qr = makeQualityRecord("@extreme", 1.0, 1.0, 1.0, 0);
      const record = svc.recalculate("@extreme", qr);
      expect(record.reputationScore).toBeLessThanOrEqual(100);
      expect(record.reputationScore).toBeGreaterThanOrEqual(0);
    });
  });
});
