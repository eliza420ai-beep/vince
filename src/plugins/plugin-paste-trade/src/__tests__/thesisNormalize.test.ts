import { describe, expect, test } from "bun:test";
import { validate } from "../../../../../packages/paste-trade/scripts/validate.ts";
import {
  ensureThesesPassBatchValidation,
  normalizeThesisForBatchSave,
} from "../thesisNormalize.ts";

describe("normalizeThesisForBatchSave", () => {
  test("fills empty quotes and headline_quote from body text", () => {
    const body = "First line of the post.\nSecond line with more context.";
    const t = normalizeThesisForBatchSave(
      {
        thesis: "Author is bullish.",
        route_status: "unrouted",
        unrouted_reason: "pending",
        who: [],
        why: ["because"],
        quotes: [],
        headline_quote: "",
      },
      body,
      "2026-03-21T12:00:00.000Z",
    );
    const { valid, errors } = validate(t);
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
    expect(Array.isArray(t.quotes)).toBe(true);
    expect((t.quotes as string[]).length).toBeGreaterThan(0);
    expect(String(t.headline_quote).length).toBeGreaterThan(0);
  });

  test("ensureThesesPassBatchValidation replaces invalid routed stubs", () => {
    const warnings: string[] = [];
    const out = ensureThesesPassBatchValidation(
      [
        {
          thesis: "x",
          route_status: "routed",
          who: [{ ticker: "BTC", direction: "long" }],
          why: ["y"],
          quotes: ["z"],
          headline_quote: "z",
        },
      ],
      "source body for fallback anchor",
      "2026-03-21T12:00:00.000Z",
      (m) => warnings.push(m),
    );
    expect(warnings.length).toBe(1);
    expect(out).toHaveLength(1);
    expect(out[0]?.route_status).toBe("unrouted");
    expect(validate(out[0]!).valid).toBe(true);
  });
});
