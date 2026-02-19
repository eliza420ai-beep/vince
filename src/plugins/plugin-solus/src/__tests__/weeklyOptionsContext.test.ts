/**
 * Tests for weeklyOptionsContext parsing (parseWeeklyOptionsContext, getPortfolioContextBlock, hasOpenPositions).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseWeeklyOptionsContext,
  getWeeklyOptionsContext,
  getPortfolioContextBlock,
  hasOpenPositions,
} from "../utils/weeklyOptionsContext";

const SAMPLE_WITH_OPEN_POSITIONS = `## Portfolio
We hold BTC. Cost basis ~$70K. Mode: covered calls.

## Open positions
BTC covered call strike $72K, premium $800, expiry Friday 08:00 UTC; BTC spot $71.5K, 2 days to expiry.

## Last week's strategy
Sold 72K CC.
`;

describe("weeklyOptionsContext", () => {
  describe("parseWeeklyOptionsContext", () => {
    it("extracts Portfolio, Open positions, and Last week's strategy sections", () => {
      const ctx = parseWeeklyOptionsContext(SAMPLE_WITH_OPEN_POSITIONS);
      expect(ctx.portfolioSection).toContain("Cost basis ~$70K");
      expect(ctx.openPositionsSection).toContain("72K");
      expect(ctx.openPositionsSection).toContain("premium $800");
      expect(ctx.lastWeekStrategy).toContain("Sold 72K CC");
    });

    it("returns empty sections when raw is empty", () => {
      const ctx = parseWeeklyOptionsContext("");
      expect(ctx.portfolioSection).toBe("");
      expect(ctx.openPositionsSection).toBe("");
      expect(ctx.lastWeekStrategy).toBe("");
    });
  });

  describe("getPortfolioContextBlock", () => {
    const saved = process.env.SOLUS_PORTFOLIO_CONTEXT;

    afterEach(() => {
      if (saved !== undefined) process.env.SOLUS_PORTFOLIO_CONTEXT = saved;
      else delete process.env.SOLUS_PORTFOLIO_CONTEXT;
    });

    it("returns SOLUS_PORTFOLIO_CONTEXT when set", () => {
      process.env.SOLUS_PORTFOLIO_CONTEXT = "We hold BTC. Cost $70K.";
      expect(getPortfolioContextBlock()).toBe("We hold BTC. Cost $70K.");
    });
  });

  describe("hasOpenPositions", () => {
    it("returns true when getWeeklyOptionsContext has openPositionsSection", () => {
      const ctx = getWeeklyOptionsContext();
      if (ctx.openPositionsSection.length > 0) {
        expect(hasOpenPositions()).toBe(true);
      }
    });
  });
});
