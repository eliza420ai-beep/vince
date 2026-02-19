import { describe, it, expect } from "bun:test";
import {
  VINCE_POLYMARKET_PREFERRED_TAG_SLUGS,
  VINCE_POLYMARKET_PREFERRED_LABELS,
} from "../constants";

describe("VINCE_POLYMARKET_PREFERRED_TAG_SLUGS", () => {
  it("has expected length", () => {
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS.length).toBeGreaterThan(10);
  });

  it("includes expected crypto and finance slugs", () => {
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("bitcoin");
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("ethereum");
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("solana");
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("weekly");
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("stocks");
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("fed-rates");
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("geopolitics");
    expect(VINCE_POLYMARKET_PREFERRED_TAG_SLUGS).toContain("economy");
  });
});

describe("VINCE_POLYMARKET_PREFERRED_LABELS", () => {
  it("each entry has slug, label, and group", () => {
    for (const entry of VINCE_POLYMARKET_PREFERRED_LABELS) {
      expect(entry).toHaveProperty("slug");
      expect(entry).toHaveProperty("label");
      expect(entry).toHaveProperty("group");
      expect(typeof entry.slug).toBe("string");
      expect(typeof entry.label).toBe("string");
      expect(["crypto", "finance", "other"]).toContain(entry.group);
    }
  });

  it("groups are only crypto, finance, or other", () => {
    const groups = new Set(
      VINCE_POLYMARKET_PREFERRED_LABELS.map((e) => e.group),
    );
    expect(groups).toEqual(new Set(["crypto", "finance", "other"]));
  });

  it("has crypto group entries", () => {
    const crypto = VINCE_POLYMARKET_PREFERRED_LABELS.filter(
      (e) => e.group === "crypto",
    );
    expect(crypto.length).toBeGreaterThan(0);
    expect(crypto.some((e) => e.slug === "bitcoin")).toBe(true);
  });

  it("has finance group entries", () => {
    const finance = VINCE_POLYMARKET_PREFERRED_LABELS.filter(
      (e) => e.group === "finance",
    );
    expect(finance.length).toBeGreaterThan(0);
  });

  it("has other group entries", () => {
    const other = VINCE_POLYMARKET_PREFERRED_LABELS.filter(
      (e) => e.group === "other",
    );
    expect(other.length).toBeGreaterThan(0);
  });
});
