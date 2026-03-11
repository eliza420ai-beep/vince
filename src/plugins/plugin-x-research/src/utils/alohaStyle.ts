/**
 * Shared ALOHA-style rules for plugin-x-research.
 * Matches Vince ALOHA (plugin-vince aloha.action.ts) and Clawterm Day Report:
 * friend-over-coffee, no bullets, take positions, no AI-slop.
 */

export const ALOHA_STYLE_SENTENCE_TARGET = "Around 200-300 words.";

/** Positive writing constraints we want in every generated narrative. */
export const ALOHA_STYLE_DO: readonly string[] = [
  "Write like you're explaining this to a smart friend over coffee, not presenting to a board.",
  "Vary sentence length: mix short, punchy lines with longer lines only when needed.",
  "Use concrete details and numbers when available, woven naturally into the flow.",
  "Flow as prose only. No bullets, headers, or formal section wrappers.",
  "State a view. If the tape is quiet, say it plainly; if something matters, say why.",
  "Take positions without fake certainty. Be decisive and honest about uncertainty.",
  "Use active voice and direct verbs. Prefer plain phrasing over abstract framing.",
  `${ALOHA_STYLE_SENTENCE_TARGET} Keep it tight and avoid filler.`,
] as const;

/** Anti-patterns that create repetitive, generic, or artificial writing. */
export const ALOHA_STYLE_AVOID: readonly string[] = [
  "Starting every sentence with the same topic name.",
  '"Interestingly", "notably", "it\'s worth noting".',
  "Generic observations that could apply to any day.",
  'Phrases like "the landscape is showing signs of..." (just say what happened).',
  "Repeating the same sentence structure over and over.",
  "Sycophantic or consultant-style tone.",
] as const;

/** Canonical banned AI-slop language, shared across prompts. */
export const NO_AI_SLOP_TERMS: readonly string[] = [
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
  "delve",
  "landscape",
  "certainly",
  "great question",
  "I'd be happy to",
  "let me help",
  "explore",
  "dive into",
  "unpack",
  "nuanced",
  "actionable",
  "circle back",
  "touch base",
  "at the end of the day",
  "it's worth noting",
  "to be clear",
  "in essence",
  "let's dive in",
] as const;

function bulletize(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join("\n");
}

/** Prompt-ready style block. Keep this for backward compatibility in existing actions/tasks. */
export const ALOHA_STYLE_RULES = `STYLE RULES:
${bulletize(ALOHA_STYLE_DO)}

AVOID:
${bulletize(ALOHA_STYLE_AVOID)}`;

/** Prompt-ready banned terms block. Keep this for backward compatibility in existing actions/tasks. */
export const NO_AI_SLOP = `Also NEVER use these words or phrases: ${NO_AI_SLOP_TERMS.join(", ")}.`;
