import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compactQuestion,
  getPolymarketContextForWtt,
  parseStringOrArrayField,
  resolveYesProbability,
} from "../utils/polymarketContext";

describe("polymarketContext helpers", () => {
  it("parses arrays from JSON strings and array values", () => {
    expect(parseStringOrArrayField('["yes","no"]')).toEqual(["yes", "no"]);
    expect(parseStringOrArrayField(["0.2", "0.8"])).toEqual(["0.2", "0.8"]);
    expect(parseStringOrArrayField("{bad")).toEqual([]);
  });

  it("resolves yes probability with yes/true fallback behavior", () => {
    expect(resolveYesProbability('["Yes","No"]', '["0.61","0.39"]')).toEqual({
      yesProb: 0.61,
      parseQuality: "yes_outcome",
    });
    expect(resolveYesProbability('["up","down"]', '["0.55","0.45"]')).toEqual({
      yesProb: 0.55,
      parseQuality: "fallback_first_outcome",
    });
  });

  it("returns unparsed for malformed values", () => {
    expect(resolveYesProbability('["yes","no"]', '["oops","0.2"]')).toEqual({
      yesProb: null,
      parseQuality: "unparsed",
    });
  });

  it("compacts long questions deterministically", () => {
    const q =
      "Will this extremely long and winding market question be compacted for prompt quality and readability?";
    expect(compactQuestion(q).length).toBeLessThanOrEqual(80);
  });
});

describe("getPolymarketContextForWtt", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
  });

  it("returns deduped and formatted market lines", async () => {
    (globalThis as { fetch?: typeof fetch }).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        events: [
          {
            markets: [
              {
                question: "Will BTC break 100k this month?",
                outcomes: '["Yes","No"]',
                outcomePrices: '["0.62","0.38"]',
              },
              {
                question: "Will BTC break 100k this month?",
                outcomes: ["Yes", "No"],
                outcomePrices: ["0.60", "0.40"],
              },
              {
                question: "Will ETH outpace BTC this quarter?",
                outcomes: ["up", "down"],
                outcomePrices: ["0.57", "0.43"],
              },
            ],
          },
        ],
      }),
    })) as unknown as typeof fetch;

    const out = await getPolymarketContextForWtt("bitcoin");
    expect(out).toContain("Prediction markets:");
    expect(out).toContain("Will BTC break 100k this month? — Yes 62%");
    expect(out).toContain("Will ETH outpace BTC this quarter? — Yes 57%");
  });

  it("returns null on non-ok response", async () => {
    (globalThis as { fetch?: typeof fetch }).fetch = vi.fn(async () => ({
      ok: false,
    })) as unknown as typeof fetch;
    await expect(getPolymarketContextForWtt("bitcoin")).resolves.toBeNull();
  });
});
