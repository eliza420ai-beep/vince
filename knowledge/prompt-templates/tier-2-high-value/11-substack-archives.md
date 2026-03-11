---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #11: Substack Archives (Past Ikigai BTC Analysis)

**Priority**: Tier 2 - High Value  
**Specialist**: `cycleContextSpecialist`, `eliza.ts` (knowledge base retrieval)  
**Data Source**: ikigaistudio.substack.com (public archive)

## Core Objectives

- Cross-reference past Ikigai Bitcoin analyses from Substack archive
- Retrieve and summarize historical BTC takes: market regimes, cycles, sentiment, price theses, accumulations/dips, bull/bear characterizations, historical comparisons
- Compare current BTC context to past analyses for alignment/divergence
- Provide readable, evidence-based historical context for ELIZA's knowledge-aware reasoning

## Tool Usage Strategy

### Discovery Phase

- `web_search` with query:
  - `site:ikigaistudio.substack.com (bitcoin OR btc OR "market regime" OR cycle OR bear OR bull OR accumulation OR dip OR sentiment OR "price target")` with `num_results=30`
  - If results sparse (<10 relevant), broaden: add "crypto" or specific years like "2022"
  - Narrow if too many: add specific terms from user query

### Selection & Deep Extraction

- From search results, filter to 8-12 most relevant posts (prioritize analytical depth on BTC regimes, sentiment, cycle comparisons)
- For each selected URL, use `browse_page`:
  - Instructions: "Extract the exact publication date (format as YYYY-MM or closest). Summarize the core theses on Bitcoin market regime, sentiment, price outlook, cycle stage, or historical parallels. Focus on 2-4 bullet points of the main arguments. Quote key phrases if they capture the thesis precisely. Ignore non-BTC sections."

### Compilation

- `code_execution` if needed to clean/format text or dates
- Aggregate extracted data chronologically (newest to oldest)

## Output Format

```markdown
## Past BTC Takes (Newest to Oldest)

- **Date:** YYYY-MM  
  **Title:** Post Title  
  **URL:** https://ikigaistudio.substack.com/p/...  
  **Key Theses:**
  - Bullet point summary of main BTC arguments (2-4 bullets).
  - Use direct quotes for precision where helpful.
  - Another bullet if needed.

- **Date:** YYYY-MM  
  ... (repeat for each post)

## Cross-References & Observations

- Overall historical coverage: Brief note (e.g., "Heavy emphasis on 2024-2025 cycle positioning; fewer deep dives pre-2023").

- Specific comparisons (only if user query provides current BTC context/data):
  - Current situation aligns ~60% with [Date: YYYY-MM] thesis on [topic] because [grounded reason from post]. Key differences: [clear mismatches].
  - Another comparison if relevant.
  - If no meaningful parallels: "No strong historical matches found in the archive for the described conditions."
```

## Integration Notes

- Feeds into ELIZA's knowledge base retrieval system
- Used by `cycleContextSpecialist` for historical cycle comparisons
- ELIZA can reference past Ikigai analyses when synthesizing recommendations
- Provides context for regime detection (compare current state to past predictions/analyses)

## Performance Notes

- Only include theses clearly stated in posts (no speculation or forced connections)
- Evidence-based comparisons only (ground claims in actual post content)
- If user message includes current BTC context, use it for grounded comparisons
- Never force matches—state plainly if nothing aligns

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: ikigaistudio.substack.com_
