import { describe, expect, it } from "vitest";
import {
  parseArgs,
  replaceArrayBlock,
  getWeeklySkipInfo,
  type SyncState,
} from "../sync-quality-accounts";

describe("sync-quality-accounts script helpers", () => {
  it("parses weekly and threshold args", () => {
    const opts = parseArgs([
      "--weekly",
      "--force",
      "--org=testorg",
      "--whaleMin=2000000",
      "--alphaMax=25",
      "--dataMax=9",
    ]);

    expect(opts.weekly).toBe(true);
    expect(opts.force).toBe(true);
    expect(opts.org).toBe("testorg");
    expect(opts.whaleMin).toBe(2_000_000);
    expect(opts.alphaMax).toBe(25);
    expect(opts.dataMax).toBe(9);
  });

  it("replaces only the targeted array block deterministically", () => {
    const source = `
export const WHALE_ACCOUNTS: QualityAccount[] = [
  { username: "a", tier: "whale", focus: ["x", "y"] },
];

export const ALPHA_ACCOUNTS: QualityAccount[] = [
  { username: "b", tier: "alpha", focus: ["x", "y"] },
];
`;
    const replaced = replaceArrayBlock(
      source,
      "WHALE_ACCOUNTS",
      "export const",
      `  { username: "new", tier: "whale", focus: ["macro", "trading"] },`,
    );

    expect(replaced).toContain(`username: "new"`);
    expect(replaced).toContain(`username: "b"`);
    expect(replaced).not.toContain(`username: "a"`);
  });

  it("weekly guard skips when last run is within 7 days", () => {
    const nowMs = Date.parse("2026-03-04T12:00:00.000Z");
    const state: SyncState = {
      lastRunAt: "2026-03-02T12:00:00.000Z",
    };

    const res = getWeeklySkipInfo(state, nowMs);
    expect(res.skip).toBe(true);
    expect(res.nextEligibleAt).toBe("2026-03-09T12:00:00.000Z");
    expect(res.daysLeft).toBe(5);
  });

  it("weekly guard allows run when no state or state is old", () => {
    const nowMs = Date.parse("2026-03-10T12:00:00.000Z");
    const empty = getWeeklySkipInfo({}, nowMs);
    expect(empty.skip).toBe(false);

    const old = getWeeklySkipInfo(
      { lastRunAt: "2026-03-01T12:00:00.000Z" },
      nowMs,
    );
    expect(old.skip).toBe(false);
  });
});

