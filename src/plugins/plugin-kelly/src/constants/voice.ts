/**
 * Voice principles: single source of truth for banned jargon.
 * Used by tests (tone check), prompts, and knowledge (kelly-voice-principles).
 */

export const BANNED_JARGON = [
  "leverage",
  "utilize",
  "streamline",
  "robust",
  "cutting-edge",
  "game-changer",
  "synergy",
  "paradigm",
  "holistic",
  "seamless",
  "best-in-class",
  "optimize",
  "scalable",
  "actionable",
  "dive deep",
  "circle back",
  "touch base",
  "move the needle",
  "low-hanging fruit",
  "think outside the box",
  "at the end of the day",
] as const;

export type BannedJargonWord = (typeof BANNED_JARGON)[number];

/** Filler phrases to avoid (no "I'd be happy to", "Certainly", etc.). Used by voice-quality tests. */
export const FILLER_PHRASES = [
  "i'd be happy to",
  "certainly",
  "great question",
  "in terms of",
  "when it comes to",
  "it's worth noting",
  "let me explain",
  "to be clear",
] as const;

/**
 * Returns any banned jargon words found in text (case-insensitive).
 */
export function findBannedJargon(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_JARGON.filter((word) => lower.includes(word));
}

/**
 * Returns any filler phrases found in text (case-insensitive).
 */
export function findFillerPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return FILLER_PHRASES.filter((phrase) => lower.includes(phrase));
}
