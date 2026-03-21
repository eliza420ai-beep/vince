import { describe, expect, it } from "bun:test";
import { buildLocalLeaderboardSnapshot } from "../localLeaderboardSnapshot.ts";

describe("buildLocalLeaderboardSnapshot", () => {
  it("sets local_only and copies theses", () => {
    const theses = [
      {
        thesis: "BTC up",
        who: [{ ticker: "BTC", direction: "long" }],
      },
    ];
    const snap = buildLocalLeaderboardSnapshot(theses);
    expect(snap.local_only).toBe(true);
    expect(snap.theses).toEqual(theses);
  });

  it("flattens who into trades for leaderboard lines", () => {
    const snap = buildLocalLeaderboardSnapshot([
      {
        who: [
          { ticker: "BTC", direction: "long" },
          { ticker: "ETH", direction: "short" },
        ],
      },
    ]);
    const trades = snap.trades as Record<string, unknown>[];
    expect(trades).toHaveLength(2);
    expect(trades[0]).toMatchObject({
      ticker: "BTC",
      direction: "long",
      local_extract_only: true,
    });
  });
});
