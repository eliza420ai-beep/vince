---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #22: Chainalysis (Adoption Metrics & Illicit Flows)

**Priority**: Tier 4 - Advanced  
**Specialist**: `macroOverlaysSpecialist`, `cycleContextSpecialist`  
**Data Source**: Chainalysis.com (public reports)

## Core Objectives

- Synthesize Chainalysis public reports: global/regional adoption metrics, illicit activity share, transaction types, regional breakdowns
- Contextualize BTC's maturing status as an asset class
- Provide forward-looking risk/adoption trends
- Remain strictly grounded in published content (note report periodicity and data lags)

## Tool Usage Strategy

### Primary: Chainalysis Reports

- `browse_page` on:
  - Reports hub/blog: `https://www.chainalysis.com/blog/` or `https://www.chainalysis.com/reports/`
    - Instructions: "List the 10 most recent posts/reports (title, publication date, short description). Identify and prioritize any focused on cryptocurrency crime, global adoption, geography of crypto, or market intelligence with BTC mentions. Provide direct URLs to the full reports."
  - Individual reports: Browse each relevant report URL
    - Instructions: "Summarize Bitcoin-specific sections. Extract key statistics quoted (e.g., '% of BTC transaction volume illicit', global adoption index ranking, YoY growth rates, regional receive volumes $B, illicit categories like scams/ransomware). Pull regional or trend highlights."

### Supplement

- `web_search`: "Chainalysis 2025 cryptocurrency crime report" OR "Chainalysis geography of cryptocurrency 2025/2026" OR "Chainalysis Bitcoin adoption latest"

### Analysis

- `code_execution` to:
  - Parse extracted text/stats into clean tables
  - Calculate changes (YoY illicit share decline) or aggregate regional totals

## Output Format

```markdown
### Recent Chainalysis BTC Coverage

| Publication Date | Report Title                     | Key Stats & Findings                                                                                                                                                                                     |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| YYYY-MM-DD       | e.g., "2025 Crypto Crime Report" | - Illicit share of BTC volume: <X.X%<br>- Global adoption rank: #Y (YoY Δ: +Z places)<br>- Emerging markets receive: $A.A T (up BB% YoY)<br>- Institutional/professional flows dominant in North America |
| ...              | ...                              | ...                                                                                                                                                                                                      |

(Limit to 4–7 most recent/relevant entries. Prioritize 2025–2026 reports.)

### Key Trends

- e.g., "Illicit activity share trending below X% for third consecutive year—lowest on record."
- e.g., "Grassroots adoption accelerating in emerging regions (+YY% receive volume YoY)."
- e.g., "Ransomware/scam volumes down ZZ% amid better enforcement."
- e.g., "North America remains institutional hub with >$WW B in professional-sized transfers."

### Cross-Report Insights

3–5 concise bullets synthesizing themes:

- e.g., "Persistently low illicit share (<5%) reinforces BTC's maturation as legitimate asset class, contrasting early 2010s darknet era."
- e.g., "Regional adoption shifting toward emerging markets, signaling broader grassroots use beyond Western speculation."
- e.g., "Declining crime volumes despite total market growth highlights improving ecosystem safeguards."

### Data Notes

- Sources: Chainalysis (pages browsed: list main URLs + individual report URLs)
- Timestamp: As of [current date/time UTC]
- Scope: Limited to free/public reports and blog posts; premium data excluded.
- Frequency: Reports typically annual (Crime/Adoption) with mid-year updates—note if latest data lagged.
```

## Integration Notes

- Feeds into `macroOverlaysSpecialist` for adoption/regulatory context
- Provides long-term maturation signals (low illicit share = institutional acceptance)
- Used by `cycleContextSpecialist` for macro regime analysis
- Lower priority (Tier 4) - advanced/refinement use case

## Performance Notes

- Reports are periodic (annual/mid-year) - data may be lagged
- Extract only explicitly stated stats (no inference)
- Prioritize BTC-specific mentions

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: chainalysis.com_
