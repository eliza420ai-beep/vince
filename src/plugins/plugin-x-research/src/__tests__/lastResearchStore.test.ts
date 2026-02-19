/**
 * lastResearchStore unit tests.
 * Tests set/get and TTL expiry.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setLastResearch, getLastResearch } from "../store/lastResearchStore";

describe("lastResearchStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns stored text when retrieved within TTL", () => {
    setLastResearch("room-1", "📊 X Pulse\n\nBullish sentiment...");
    expect(getLastResearch("room-1")).toBe(
      "📊 X Pulse\n\nBullish sentiment...",
    );
  });

  it("returns null for unknown room", () => {
    const knownRoom = `lastresearch-known-${Date.now()}`;
    const unknownRoom = `lastresearch-unknown-${Date.now()}`;
    setLastResearch(knownRoom, "Some text");
    expect(getLastResearch(unknownRoom)).toBeNull();
    expect(getLastResearch(knownRoom)).toBe("Some text");
  });

  it("returns null after TTL expires", () => {
    setLastResearch("room-1", "Expiring text");

    // Advance 4 minutes - still within 5 min TTL
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(getLastResearch("room-1")).toBe("Expiring text");

    // Advance past 5 min TTL
    vi.advanceTimersByTime(2 * 60 * 1000); // 6 min total
    expect(getLastResearch("room-1")).toBeNull();
  });

  it("overwrites previous research for same room", () => {
    setLastResearch("room-1", "First pulse");
    setLastResearch("room-1", "Second pulse");
    expect(getLastResearch("room-1")).toBe("Second pulse");
  });

  it("stores different text per room", () => {
    setLastResearch("room-a", "Pulse A");
    setLastResearch("room-b", "Vibe B");
    expect(getLastResearch("room-a")).toBe("Pulse A");
    expect(getLastResearch("room-b")).toBe("Vibe B");
  });
});
