/**
 * ALOHA-style rules for plugin-vince narrative outputs.
 * Keep in sync with plugin-x-research/src/utils/alohaStyle.ts
 * friend-over-coffee, no bullets, take positions, no AI-slop.
 */

export const ALOHA_STYLE_RULES = `STYLE RULES:
- Write like you're explaining this to a smart friend over coffee, not presenting to a board.
- Vary your sentence length. Mix short punchy takes with longer explanations when you need to unpack something.
- Use specific details but weave them in naturally.
- Don't bullet point anything. Flow naturally between thoughts.
- Skip the formal structure. No headers, no "In conclusion", no "Overall".
- Have a personality. If the news is quiet, say so. If something stands out, say why.
- Don't be sycophantic or hedge everything. Take positions.
- Around 200-300 words is good. Don't pad it.

AVOID:
- Starting every sentence with the same topic name
- "Interestingly", "notably", "it's worth noting"
- Generic observations that could apply to any day
- Phrases like "the landscape is showing signs of..." — just say what's happening
- Repeating the same sentence structure over and over`;

export const NO_AI_SLOP =
  'Also NEVER use these words or phrases: leverage, utilize, streamline, robust, cutting-edge, game-changer, synergy, paradigm, holistic, seamless, best-in-class, delve, landscape, certainly, great question, I\'d be happy to, let me help, explore, dive into, unpack, nuanced, actionable, circle back, touch base, at the end of the day, it\'s worth noting, to be clear, in essence, let\'s dive in.';
