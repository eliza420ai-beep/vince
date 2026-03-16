import { describe, expect, it } from "vitest";
import { loadTop100FromMarkdown } from "../utils/top100Stocks";

describe("Top100 model", () => {
  it("assigns a stable unique id per normalized ticker and dedupes rows", () => {
    const { rows } = loadTop100FromMarkdown(process.cwd());
    expect(rows.length).toBeGreaterThan(0);

    const seenIds = new Set<string>();
    const seenTickers = new Set<string>();

    for (const row of rows) {
      expect(typeof row.id).toBe("string");
      expect(row.id.length).toBeGreaterThan(0);
      const upper = row.ticker.toUpperCase().trim();

      // ids should be unique
      expect(seenIds.has(row.id)).toBe(false);
      seenIds.add(row.id);

      // after dedupe we should only see each normalized ticker once
      expect(seenTickers.has(upper)).toBe(false);
      seenTickers.add(upper);
    }
  });
});
