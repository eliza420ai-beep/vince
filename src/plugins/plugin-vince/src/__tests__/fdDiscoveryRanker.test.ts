/**
 * FD discovery ranker: score and bucket tickers from snapshots.
 */

import { describe, it, expect } from "vitest";
import {
  scoreTickerForDiscovery,
  bucketFromScore,
  rankDiscoveryCandidates,
} from "../utils/fdDiscoveryRanker";
import type { FdTickerSnapshot } from "../utils/fdFactorBuilder.types";
import type { FdReplayRow } from "../utils/fdReplayImporter";

function mockSnapshot(
  overrides: Partial<FdTickerSnapshot> = {},
): FdTickerSnapshot {
  return {
    ticker: "AAPL",
    snapshotAt: new Date().toISOString(),
    momentum_1m_pct: null,
    momentum_3m_pct: null,
    momentum_6m_pct: null,
    momentum_12m_pct: null,
    vol_realized_20d: null,
    drawdown_pct: null,
    dollar_volume_avg: null,
    ev_sales_ttm: null,
    fcf_yield_pct: null,
    gross_margin_pct: null,
    revenue_growth_yoy_pct: null,
    operating_margin_pct: null,
    days_since_earnings: null,
    recent_8k: false,
    recent_10q: false,
    recent_10k: false,
    filing_count_30d: 0,
    filing_count_90d: 0,
    insider_buy_sell_skew: null,
    insider_buy_count: 0,
    insider_sell_count: 0,
    earnings_surprise_pct: null,
    sector_relative_momentum_3m_pct: null,
    rowCount: 0,
    startDate: null,
    endDate: null,
    ...overrides,
  };
}

describe("fdDiscoveryRanker", () => {
  describe("scoreTickerForDiscovery", () => {
    it("returns baseline score when snapshot has no signals", () => {
      const { score, reason } = scoreTickerForDiscovery(mockSnapshot());
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(reason).toBeDefined();
    });

    it("increases score for positive momentum and insider buy skew", () => {
      const { score } = scoreTickerForDiscovery(
        mockSnapshot({
          momentum_3m_pct: 15,
          momentum_12m_pct: 20,
          insider_buy_sell_skew: 0.4,
        }),
      );
      expect(score).toBeGreaterThan(0.5);
    });

    it("decreases score for insider sell skew", () => {
      const { score } = scoreTickerForDiscovery(
        mockSnapshot({ insider_buy_sell_skew: -0.5 }),
      );
      expect(score).toBeLessThan(0.55);
    });
  });

  describe("bucketFromScore", () => {
    it("returns PromoteNow for score >= 0.6", () => {
      expect(bucketFromScore(0.6)).toBe("PromoteNow");
      expect(bucketFromScore(0.9)).toBe("PromoteNow");
    });

    it("returns ResearchNext for 0.35 <= score < 0.6", () => {
      expect(bucketFromScore(0.35)).toBe("ResearchNext");
      expect(bucketFromScore(0.5)).toBe("ResearchNext");
      expect(bucketFromScore(0.59)).toBe("ResearchNext");
    });

    it("returns Avoid for score < 0.35", () => {
      expect(bucketFromScore(0)).toBe("Avoid");
      expect(bucketFromScore(0.34)).toBe("Avoid");
    });
  });

  describe("rankDiscoveryCandidates", () => {
    it("returns sorted candidates with bucket and reason", () => {
      const rows: FdReplayRow[] = [
        {
          ticker: "A",
          sleeve: "tastytrade",
          targetWeightPct: 10,
          snapshot: mockSnapshot({ momentum_3m_pct: 20, ticker: "A" }),
          snapshotAt: new Date().toISOString(),
        },
        {
          ticker: "B",
          sleeve: "watchlist",
          targetWeightPct: 5,
          snapshot: null,
          snapshotAt: null,
        },
      ];
      const ranked = rankDiscoveryCandidates(rows);
      expect(ranked).toHaveLength(2);
      expect(ranked[0].ticker).toBe("A");
      expect(ranked[0].bucket).toBeDefined();
      expect(ranked[0].reason).toBeDefined();
      expect(ranked[1].ticker).toBe("B");
      expect(ranked[1].score).toBe(0.3);
    });
  });
});
