/**
 * Structured prompt for content audit (top posts by engagement).
 * Input: top N posts by engagement. Output: playbook (hooks, topics, formats, avoid).
 */

export interface TweetForAudit {
  text: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
}

/**
 * Build the analysis prompt. Quality of input = quality of output; this template is specific and structured.
 */
export function buildContentAuditPrompt(tweets: TweetForAudit[]): string {
  const postsBlock = tweets
    .map((t, i) => {
      const meta =
        t.likeCount != null || t.retweetCount != null
          ? ` (${t.likeCount ?? 0} likes, ${t.retweetCount ?? 0} RTs)`
          : "";
      return `${i + 1}. ${t.text}${meta}`;
    })
    .join("\n\n");

  return `You are analyzing a creator's top-performing X posts to extract a repeatable content playbook. This is a personal playbook from their own track record, not generic advice. Use the data below; do not invent patterns.

TOP POSTS (by engagement):

${postsBlock}

---

Identify:
1. **Emotional triggers** shared by the top performers (fear, aspiration, outrage, validation, etc.).
2. **Hook patterns** — how do the best posts open (first line)? Sentence structure, length, tone.
3. **Topics** that consistently outperformed.
4. **Personal story vs data-driven** — which performed better in this set?
5. **What to avoid** — what did weaker posts in this set do differently (e.g. eased into the point, too many ideas, context instead of conviction).

Return a concise playbook in markdown with exactly these sections. Keep each section to 3–5 bullets. No preamble.

**Hooks that work**
**Topics that land**
**Formats that engage**
**Avoid**`;
}
