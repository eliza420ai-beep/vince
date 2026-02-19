/**
 * Cost constants and formatters unit tests.
 */

import { describe, it, expect } from "vitest";
import {
  COST_PER_POST_EST_USD,
  COST_PER_USER_LOOKUP_EST_USD,
  formatCostFooter,
  formatCostFooterCombined,
} from "../constants/cost";

describe("cost constants", () => {
  it("exports COST_PER_POST_EST_USD", () => {
    expect(COST_PER_POST_EST_USD).toBe(0.005);
  });

  it("exports COST_PER_USER_LOOKUP_EST_USD", () => {
    expect(COST_PER_USER_LOOKUP_EST_USD).toBe(0.01);
  });
});

describe("formatCostFooter", () => {
  it("returns <$0.01 for 0 posts", () => {
    expect(formatCostFooter(0)).toContain("<$0.01");
    expect(formatCostFooter(0)).toContain("0 posts");
  });

  it("returns <$0.01 for 1 post", () => {
    expect(formatCostFooter(1)).toContain("<$0.01");
  });

  it("returns $0.05 for 10 posts", () => {
    expect(formatCostFooter(10)).toContain("$0.05");
    expect(formatCostFooter(10)).toContain("10 posts");
  });
});

describe("formatCostFooterCombined", () => {
  it("formats postReads only", () => {
    const result = formatCostFooterCombined({ postReads: 10 });
    expect(result).toContain("$0.05");
    expect(result).toContain("10 posts");
  });

  it("formats userLookups only", () => {
    const result = formatCostFooterCombined({ userLookups: 3 });
    expect(result).toContain("$0.03");
    expect(result).toContain("3 user lookups");
  });

  it("formats both postReads and userLookups", () => {
    const result = formatCostFooterCombined({
      postReads: 20,
      userLookups: 2,
    });
    expect(result).toContain("$0.12");
    expect(result).toContain("20 posts");
    expect(result).toContain("2 user lookups");
  });

  it("returns <$0.01 for empty breakdown", () => {
    const result = formatCostFooterCombined({});
    expect(result).toContain("<$0.01");
  });
});
