/**
 * Jargon / voice test: action and provider output should not contain banned words.
 * Uses shared BANNED_JARGON from constants/voice.ts.
 */

import { describe, it, expect } from "bun:test";
import { BANNED_JARGON, findBannedJargon } from "../constants/voice";

function containsBannedJargon(text: string): string[] {
  return findBannedJargon(text);
}

describe("Voice / jargon", () => {
  it("formatInterpretation-style strings do not contain banned jargon", () => {
    const sampleOutputs = [
      "Small and clean—walk before you run; good for beginners or longboard.",
      "There's a flow to it; small and clean, good for beginners.",
      "Time slows down when it's like this—fun size, most levels.",
      "Solid. Intermediate and up; put yourself in the right part of it.",
      "Powerful—experienced only. Life-and-death thoughts on the face of it.",
      "Check conditions on the spot.",
      "Best window: wind is often lighter in the morning.",
      "Rain or storm expected — consider indoor options or surfer yoga instead.",
    ];
    for (const line of sampleOutputs) {
      const found = containsBannedJargon(line);
      expect(found).toEqual([]);
    }
  });

  it("banned list is non-empty and lowercased for checking", () => {
    expect(BANNED_JARGON.length).toBeGreaterThan(10);
    expect(findBannedJargon("We should leverage this")).toEqual(["leverage"]);
    expect(findBannedJargon("Let's optimize the flow")).toEqual(["optimize"]);
  });
});
