---
tags: [vc, startups, investment]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Venture Capital Knowledge Cards (Style Guide)

This folder is used as **RAG knowledge** (`ragKnowledge: true`). The goal is to make each file’s _first chunk_ extremely easy to retrieve and reason over.

## Core rule

- Put a dense **Knowledge Card** near the top of the file.
- Keep the original essay/memo below as an **Appendix** (verbatim).
- Do **not** introduce new factual claims in the Knowledge Card. The card is an extraction/summary of the Appendix.

## Standard file structure

1. `# <id>.<title>`
2. `## Metadata` (existing fields preserved)
3. `---`
4. `## Knowledge Card`
5. `---`
6. `## Legacy Framework (original, verbatim)` (optional, only if the original file had a prefatory framework)
7. `---`
8. `## Appendix (original essay, verbatim)`

## Knowledge Card schema

### Required fields (all files)

- **Type**: `CompanyThesis` | `Framework`
- **PrimaryEntityOrTopic**: the company name (or the main topic for frameworks)
- **AliasesAndKeywords**: short list (names, ticker-like terms, alternative spellings, key concepts)
- **TimeContext**: “As written (mentions YYYY / timeframe)”; anchor any time-sensitive claims to the essay’s stated timeframe
- **Summary**: 1–2 sentences
- **KeyPoints**: 6–12 bullets, each bullet is atomic (stands alone, no pronouns)
- **UseWhen**: 2–5 bullets (queries this doc should answer well)
- **DoNotUseFor**: 2–5 bullets (especially “do not treat numbers as current market data”)
- **EvidenceNote**: one line like “Extracted from Appendix; no new claims added.”

### Extra fields (CompanyThesis only)

- **Thesis**: 1–3 bullets (the investment thesis in plain language)
- **Differentiators**: 3–8 bullets (why this company is distinct vs alternatives, as stated in the Appendix)
- **RisksAndUnknowns**: 3–8 bullets (licensing risk, supply risk, execution risk, regulation, competition, etc.)
- **WatchlistTriggers**: 3–8 bullets (events that would update the thesis)

## Length targets

- Knowledge Card: **~250–600 tokens** (roughly 150–400 words depending on formatting)
- Keep bullet lists short and specific; prefer concrete nouns over metaphor.

## Time-sensitive numbers

If the Appendix includes numbers (valuation, revenue, market share, dates), the Knowledge Card must label them as **“as written”** and never present them as current.

## Tagging

Keep tags in `## Metadata` as-is. If tags are missing, add only conservative tags that are clearly implied by the Appendix.
