import { describe, expect, test } from "bun:test";
import {
  buildOtakuHandoffPayload,
  collectRoutedExpressions,
} from "../otakuHandoff.ts";
import type { PasteTradeRunRecord } from "../runRegistry.ts";

describe("collectRoutedExpressions", () => {
  test("finds nested selected_expression", () => {
    const snap = {
      theses: [
        {
          thesis: "Long SMR",
          route_evidence: {
            selected_expression: {
              platform: "hyperliquid",
              ticker: "SMR-PERP",
              direction: "long",
              instrument: "SMR perp",
            },
          },
        },
      ],
    };
    const got = collectRoutedExpressions(snap);
    expect(got).toHaveLength(1);
    expect(got[0]?.ticker).toBe("SMR-PERP");
    expect(got[0]?.platform).toBe("hyperliquid");
  });

  test("uses routed_ticker when ticker missing", () => {
    const got = collectRoutedExpressions({
      route_evidence: {
        selected_expression: {
          platform: "polymarket",
          routed_ticker: "KXFED-26MAR",
          direction: "yes",
        },
      },
    });
    expect(got[0]?.ticker).toBe("KXFED-26MAR");
  });
});

describe("buildOtakuHandoffPayload", () => {
  const base = (): PasteTradeRunRecord => ({
    runId: "run-1",
    agentId: "a1",
    status: "done",
    events: [],
    createdAt: 1,
    updatedAt: 1,
  });

  test("eligible for hyperliquid", () => {
    const rec = {
      ...base(),
      sourceUrl: "https://pt/s/abc",
      lastSnapshot: {
        route_evidence: {
          selected_expression: {
            platform: "hyperliquid",
            ticker: "ETH-PERP",
            direction: "short",
          },
        },
      },
    };
    const p = buildOtakuHandoffPayload(rec);
    expect(p.eligible).toBe(true);
    expect(p.message.toLowerCase()).toContain("hyperliquid");
    expect(p.message).toContain("ETH-PERP");
    expect(p.message).toContain("https://pt/s/abc");
    expect(p.expressions).toHaveLength(1);
  });

  test("not eligible for robinhood-only", () => {
    const rec = {
      ...base(),
      lastSnapshot: {
        route_evidence: {
          selected_expression: {
            platform: "robinhood",
            ticker: "BAH",
            direction: "long",
          },
        },
      },
    };
    const p = buildOtakuHandoffPayload(rec);
    expect(p.eligible).toBe(false);
    expect(p.reason).toContain("Robinhood");
  });

  test("fallback when no routes", () => {
    const p = buildOtakuHandoffPayload({
      ...base(),
      sourceUrl: "https://x/1",
      lastSnapshot: { foo: 1 },
    });
    expect(p.eligible).toBe(false);
    expect(p.message).toContain("No routed");
  });
});
