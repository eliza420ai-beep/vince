/**
 * Unit tests for Record line parser and stripRecordLine (Phase 2 auto-record).
 */

import { describe, it, expect } from "vitest";
import {
  parseRecordLine,
  stripRecordLine,
  RECORD_LINE_REGEX,
} from "../actions/solusOptimalStrike.action";

describe("parseRecordLine", () => {
  it("parses Record: BTC 106000 24%", () => {
    const text = "Some prose.\nRecord: BTC 106000 24%";
    const r = parseRecordLine(text);
    expect(r).not.toBeNull();
    expect(r!.asset).toBe("BTC");
    expect(r!.strike).toBe(106000);
    expect(r!.prob).toBe(0.24);
  });

  it("parses Record: ETH 3500 22%", () => {
    const text = "Record: ETH 3500 22%";
    const r = parseRecordLine(text);
    expect(r).not.toBeNull();
    expect(r!.asset).toBe("ETH");
    expect(r!.strike).toBe(3500);
    expect(r!.prob).toBe(0.22);
  });

  it("parses strike with k suffix (106k)", () => {
    const text = "Record: BTC 106k 24%";
    const r = parseRecordLine(text);
    expect(r).not.toBeNull();
    expect(r!.strike).toBe(106000);
  });

  it("returns null when no Record line", () => {
    expect(parseRecordLine("Just some text.")).toBeNull();
    expect(parseRecordLine("Record: invalid")).toBeNull();
  });

  it("returns null for invalid prob", () => {
    expect(parseRecordLine("Record: BTC 106000 101%")).toBeNull();
    expect(parseRecordLine("Record: BTC 106000 -1%")).toBeNull();
  });

  it("parses from last matching line", () => {
    const text = "Record: ETH 3000 20%\nMore text.\nRecord: BTC 106000 24%";
    const r = parseRecordLine(text);
    expect(r).not.toBeNull();
    expect(r!.asset).toBe("BTC");
    expect(r!.strike).toBe(106000);
  });
});

describe("stripRecordLine", () => {
  it("removes Record line from response", () => {
    const text = "BTC strike $106k, 24% assignment.\nRecord: BTC 106000 24%";
    const out = stripRecordLine(text);
    expect(out).not.toContain("Record:");
    expect(out).toContain("BTC strike");
  });

  it("leaves text without Record line unchanged", () => {
    const text = "Only prose here.";
    expect(stripRecordLine(text)).toBe(text);
  });

  it("handles multiple lines and removes only Record line", () => {
    const text = "Line 1\nRecord: BTC 106000 24%\nLine 3";
    const out = stripRecordLine(text);
    expect(out).toBe("Line 1\nLine 3");
  });
});

describe("RECORD_LINE_REGEX", () => {
  it("matches valid Record lines", () => {
    expect("Record: BTC 106000 24%".match(RECORD_LINE_REGEX)).not.toBeNull();
    expect("Record: ETH 3500 22%".match(RECORD_LINE_REGEX)).not.toBeNull();
    expect("record: sol 100 30%".match(RECORD_LINE_REGEX)).not.toBeNull();
  });

  it("does not match invalid asset", () => {
    expect("Record: XYZ 106000 24%".match(RECORD_LINE_REGEX)).toBeNull();
  });
});
