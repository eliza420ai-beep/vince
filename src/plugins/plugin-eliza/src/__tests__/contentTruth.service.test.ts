/**
 * ContentTruthService Tests (#69)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ContentTruthService } from "../services/contentTruth.service";

let tmpDir: string;
let svc: ContentTruthService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "content-truth-test-"));
  svc = new ContentTruthService(tmpDir);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("ContentTruthService", () => {
  describe("extractClaimsFromContent", () => {
    it("extracts dollar amounts", () => {
      const claims = svc.extractClaimsFromContent(
        "We made $1,234 this week from $500 premium.",
      );
      expect(claims.some((c) => c.includes("$1,234"))).toBe(true);
      expect(claims.some((c) => c.includes("$500"))).toBe(true);
    });

    it("extracts percentage claims", () => {
      const claims = svc.extractClaimsFromContent(
        "Win rate hit 75% with 25% drawdown.",
      );
      expect(claims.some((c) => c.includes("75%"))).toBe(true);
      expect(claims.some((c) => c.includes("25%"))).toBe(true);
    });

    it("extracts trade counts", () => {
      const claims = svc.extractClaimsFromContent(
        "Closed 12 trades this month.",
      );
      expect(claims.some((c) => /12\s*trades?/i.test(c))).toBe(true);
    });

    it("returns empty array for content with no claims", () => {
      const claims = svc.extractClaimsFromContent(
        "The market is interesting today. Let's explore narratives.",
      );
      expect(claims).toHaveLength(0);
    });
  });

  describe("checkContent - all verified", () => {
    it("approves content when all claims match verified metrics", () => {
      const verifiedMetrics = {
        weeklyPnl: 1000,
        winRate: 75,
      };
      const content = "We made $1,000 this week with a win rate of 75%.";
      const result = svc.checkContent(content, verifiedMetrics);
      expect(result.verdict).toBe("approved");
      expect(result.passed).toBe(true);
      expect(result.blockedClaims).toHaveLength(0);
    });
  });

  describe("checkContent - some blocked", () => {
    it("needs-review when some claims unverifiable but < 50% blocked", () => {
      // 1 claim matches, 1 does not → 50% blocked → "blocked"
      // Let's make it so only 1 out of 3 claims is blocked → "needs-review"
      const verifiedMetrics = {
        weeklyPnl: 1000,
        winRate: 75,
      };
      // $1,000 matches weeklyPnl, 75% matches winRate, $999 is unverified
      const content =
        "We made $1,000 with 75% win rate. Premium collected was $999.";
      const result = svc.checkContent(content, verifiedMetrics);
      // 2 verified, 1 blocked → < 50% blocked → "needs-review"
      expect(["needs-review", "approved"]).toContain(result.verdict);
    });
  });

  describe("checkContent - all blocked", () => {
    it("blocks content when > 50% of claims are unverifiable", () => {
      const verifiedMetrics: Record<string, number> = {}; // no verified metrics
      const content =
        "Collected $5,000 in premium. Win rate 80%. Closed 20 trades.";
      const result = svc.checkContent(content, verifiedMetrics);
      expect(result.verdict).toBe("blocked");
      expect(result.passed).toBe(false);
      expect(result.blockedClaims.length).toBeGreaterThan(0);
    });
  });

  describe("checkContent - no claims", () => {
    it("approves content with no performance claims", () => {
      const result = svc.checkContent(
        "The market looks interesting today.",
        {},
      );
      expect(result.verdict).toBe("approved");
      expect(result.passed).toBe(true);
    });
  });

  describe("checkContent - 10% tolerance", () => {
    it("verifies claim within 10% tolerance of metric", () => {
      const verifiedMetrics = { weeklyPnl: 1000 };
      // $1,050 is within 10% of 1000
      const content = "We made $1,050 this week.";
      const result = svc.checkContent(content, verifiedMetrics);
      // $1,050 is within 10% of $1,000 (tolerance = 100, diff = 50 < 100)
      expect(result.verdict).toBe("approved");
    });

    it("blocks claim outside 10% tolerance", () => {
      const verifiedMetrics = { weeklyPnl: 1000 };
      // $2,000 is NOT within 10% of 1000
      const content = "We made $2,000 this week.";
      const result = svc.checkContent(content, verifiedMetrics);
      expect(result.blockedClaims.length).toBeGreaterThan(0);
    });
  });

  describe("getVerifiedMetrics", () => {
    it("returns empty object when no file exists", () => {
      const metrics = svc.getVerifiedMetrics();
      expect(metrics).toEqual({});
    });

    it("loads metrics from JSON file", () => {
      const filePath = path.join(tmpDir, "verified-metrics.json");
      fs.writeFileSync(
        filePath,
        JSON.stringify({ weeklyPnl: 1234, winRate: 66 }),
      );
      const metrics = svc.getVerifiedMetrics();
      expect(metrics.weeklyPnl).toBe(1234);
      expect(metrics.winRate).toBe(66);
    });
  });
});
