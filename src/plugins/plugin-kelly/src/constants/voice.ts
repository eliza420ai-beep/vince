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

/**
 * Returns any banned jargon words found in text (case-insensitive).
 */
export function findBannedJargon(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_JARGON.filter((word) => lower.includes(word));
}
