# Essay categorization and cross-directory duplicates

## Purpose

Many essays are categorized into more than one knowledge directory (e.g. the same essay appears in substack-essays and in options, or in macro-economy and stocks). This is intentional: the Substack processor and curators assign categories by theme, so an essay about options and macro may live in both options and macro-economy.

## Implications for curators

- **No deduplication required:** Files are not symlinked or deduplicated; each directory holds a full copy so that RAG retrieval by topic (e.g. "options", "macro") returns the relevant essay.
- **Metadata:** Essay files use `## Metadata` with **Category** (and optionally **Tags**). The same essay may have different category in different dirs; content is identical.
- **Updates:** If you fix or update an essay that exists in multiple dirs, update all copies, or document the canonical location (e.g. substack-essays) and treat others as references.

## Naming

Essay filenames often use a numeric prefix (e.g. `182595861hidden-truth.md`) from the source. These are opaque but stable. For discoverability, use directory READMEs and the root [knowledge/README.md](../README.md) map; optional future improvement: a manifest (title → path) for tooling.

## Audit and quality

Quality metrics and recommendations are produced by:

```bash
bun run scripts/audit-knowledge-quality.ts
```

Results are written to `scripts/knowledge-quality-audit.json`. Common findings:

- **Low methodology/conceptual content:** Many reference-style or list-style files (e.g. luxury-hotels, creative-production) score lower; that is expected. Essay-style dirs (bitcoin-maxi, macro-economy, options, perps-trading, etc.) are optimized for methodology.
- **Outdated numbers:** The audit flags numeric content; per [KNOWLEDGE-USAGE-GUIDELINES.md](../KNOWLEDGE-USAGE-GUIDELINES.md), numbers in essays are illustrative. No need to "fix" numbers; ensure agents use knowledge for frameworks, not for current data.
- **Meta-instruction ratio:** Keep low; avoid "use this tool" or "call this API" in knowledge content. See [KNOWLEDGE-QUALITY-GUIDE.md](KNOWLEDGE-QUALITY-GUIDE.md).

Exceptions (e.g. files that are intentionally reference-only and need no Methodology block) can be listed here or in AUDIT-EXCEPTIONS.md if maintained.
