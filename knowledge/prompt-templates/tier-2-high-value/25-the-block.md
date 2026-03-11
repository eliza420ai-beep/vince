---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #25: The Block (Research Reports & News Aggregation)

**Priority**: Tier 2 - High Value  
**Specialist**: `cycleContextSpecialist`  
**Data Source**: The Block research and data sections

## Core Objectives

- Synthesize insights from The Block research: trading volumes, on-chain adoption metrics, regulatory developments, funding trends, mining/hash rate dynamics, cycle comparisons
- Provide balanced market overviews and forward-looking signals
- Remain grounded in published content (note potential media bias toward bullish narratives)
- Cross-reference with neutral sources where relevant

## Tool Usage Strategy

### Primary: The Block Research

- `browse_page` on:
  - Research hub: `https://www.theblock.co/research`
    - Instructions: "List the 10 most recent reports/articles (title, publication date, short description). Identify and prioritize any focused on Bitcoin, market overviews, quarterly recaps, volumes, adoption, regulation, funding, or mining. Provide direct URLs to the full reports."
  - Data dashboards: `https://www.theblock.co/data` or subcategory pages
    - Instructions: "Focus on BTC-specific charts/metrics: extract current values for volumes, hash rate, active addresses, institutional holdings, etc., and sample historical points if charts visible."
  - Individual reports: Browse each relevant report URL
    - Instructions: "Summarize the core Bitcoin sections. Extract key statistics quoted (e.g., spot volume $X B quarterly, hash rate ATH, VC funding $Y M in BTC infra, regulatory updates). Pull cycle comparisons or forward theses."

### Supplement

- `web_search`: "The Block Bitcoin report latest 2025/2026" OR "The Block quarterly Bitcoin market overview"

### Analysis

- `code_execution` to:
  - Organize extracted stats into clean lists/tables
  - Calculate changes (QoQ volume growth) or aggregate funding totals

## Output Format

```markdown
### Recent The Block BTC Coverage

| Publication Date | Report/Section Title                    | Key Stats & Findings                                                                                                                                            |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YYYY-MM-DD       | e.g., "Q4 2025 Bitcoin Market Overview" | - Spot volume: $X.XX T (up YY% QoQ)<br>- Hash rate: Z.Z EH/s ATH<br>- BTC ecosystem VC: $A.A B (focus on L2/infra)<br>- Regulatory: Positive clarity on staking |
| ...              | ...                                     | ...                                                                                                                                                             |

(Limit to 4–7 most recent/relevant entries. Prioritize 2025–2026 content.)

### Key Trends

- e.g., "Aggregate exchange volumes up XX% YoY with institutional share rising."
- e.g., "VC funding into BTC-related infrastructure +ZZ% quarter-over-quarter."
- e.g., "Hash rate and difficulty at new highs despite post-halving adjustments."
- e.g., "Adoption metrics: Active addresses stable, ETF holdings +$WW B."

### Cross-Report Insights

3–5 concise bullets synthesizing themes:

- e.g., "Consistent narrative of maturing institutional adoption via ETFs and custody solutions, echoing early 2024 momentum."
- e.g., "Regulatory section highlights tailwinds from clearer frameworks, contrasting 2022 uncertainty."
- e.g., "Mining data shows resilient hash rate growth, supporting network security amid price consolidation."

### Data Notes

- Sources: The Block (pages browsed: list main URLs + individual report URLs)
- Timestamp: As of [current date/time UTC]
- Scope: Limited to free/public content; note if premium/paywalled sections excluded.
- Bias Note: The Block coverage may lean bullish/institutional—cross-verified where possible with neutral sources.
```

## Integration Notes

- Feeds into `cycleContextSpecialist` for research synthesis and cycle comparisons
- Provides institutional research perspective (complements Substack #11 archives)
- Can inform strike selection (research themes affect market narrative)

## Performance Notes

- Note potential bullish/institutional bias - cross-verify with neutral sources
- Extract only explicitly stated stats (no amplification or inference)
- Prioritize reports from last 6-12 months

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: theblock.co_
