---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# X thread → methodology summary

Use this when turning an X (Twitter) thread (or any social explainer) into knowledge. Goal: extract **frameworks and methodology**, not ephemeral facts.

## Instructions

1. **Extract the argument or framework** — How should we _think_ about this topic? What’s the structure (e.g. “when X then Y”, “avoid Z when …”)?
2. **State methodology** — What to look for, how to interpret signals, what to avoid. Use bullet points or short sections.
3. **Strip ephemeral details** — Remove “as of today”, exact prices, or one-off events unless they illustrate a pattern. Keep structure (e.g. “funding > X% suggests …” as a _pattern_, not a current number).
4. **Output sections:**
   - **Summary** — 2–3 sentences: core claim and why it matters.
   - **Methodology** — How to apply this; what to do / not do.
   - **Caveats / when to use** — Limits, edge cases, when the framework doesn’t apply.
5. **Add the standard knowledge note** at the top of the generated doc:
   - Numbers and examples are **illustrative**; use for frameworks, not as current data.
   - For live data, use actions/APIs.

## Example (conceptual)

**Input:** A thread about “why funding rates matter for entries.”

**Output shape:**

- Summary: Funding as a crowd indicator; extremes suggest mean reversion.
- Methodology: Check funding before size; use flips (neg → pos) as one signal; combine with OI.
- Caveats: Works better in trending regimes; avoid in low liquidity.

---

_See PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md §8.3 and KNOWLEDGE-USAGE-GUIDELINES.md._
