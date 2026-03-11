---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #32: Binance Research (Market Reports & On-Chain Analysis)

**Priority**: Tier 2 - High Value  
**Specialist**: `cycleContextSpecialist`  
**Data Source**: Binance Research website

## Core Objectives

- Synthesize insights from Binance Research: on-chain analysis, price cycle dynamics, holder behavior, macro correlations, forward-looking theses
- Blend on-chain, cycle, macro for comprehensive BTC research perspective
- Extract grounded, data-backed conclusions only (no speculation)
- Compare to other research sources (Substack #11, The Block #25) for cross-validation

## Tool Usage Strategy

### Primary: Binance Research

- `browse_page` on:
  - Main analysis hub: `https://research.binance.com/en/analysis`
    - Instructions: "List the 10 most recent reports (title, publication date, short description). Identify and prioritize any focused on Bitcoin, market cycles, monthly outlooks, or macro/on-chain themes. Provide direct URLs to the full reports."
  - Category pages: `https://research.binance.com/en/analysis/bitcoin`, `/analysis/market-outlook`
    - Instructions: "Extract list of BTC-relevant reports with dates and URLs."
  - Individual report pages: Browse each relevant report URL
    - Instructions: "Summarize the core Bitcoin thesis. Extract key sections on price cycles, on-chain trends (e.g., long-term holder supply, exchange flows, realized cap), holder distribution, macro correlations (e.g., rates, liquidity, risk assets), and any forward-looking conclusions. Pull specific statistics quoted (e.g., '% of supply held >1 year', 'net exchange outflow $X B'). Structure output as dated bullet points."

### Supplement

- `web_search`: "Binance Research Bitcoin report 2025" OR "Binance Research monthly outlook latest"

### Analysis

- `code_execution` to:
  - Organize extracted stats into clean tables if multiple numerical series emerge
  - Aggregate recurring metrics across reports (e.g., average LTH supply % quoted)

## Output Format

```markdown
### Recent Binance Research Reports (BTC-Relevant)

| Publication Date | Report Title                                    | Core Thesis                                                                      | Key Statistics & Findings                                                                                                             |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| YYYY-MM-DD       | e.g., "Monthly Market Insights – December 2025" | e.g., "BTC remains in early-stage bull market with strong on-chain accumulation" | - Long-term holders control 78% of supply<br>- Net exchange outflows: $4.2B in Q4 2025<br>- Realized price: $68k (spot trading above) |
| ...              | ...                                             | ...                                                                              | ...                                                                                                                                   |

(Limit to 4–6 most recent/relevant reports. Prioritize 2025–2026 publications.)

### Cross-Report Insights

3–5 concise bullets synthesizing themes:

- e.g., "Consistent emphasis on rising long-term holder supply as evidence of accumulation phase, echoing post-2020 halving pattern."
- e.g., "Macro section repeatedly highlights declining real yields and global liquidity expansion as tailwinds for BTC vs. 2022 bear regime."
- e.g., "On-chain flows show sustained exchange outflows, contrasting with late-2021 inflow peaks ahead of tops."

### Data Notes

- Sources: Binance Research (pages browsed: list main URLs + individual report URLs)
- Timestamp: As of [current date/time UTC]
- Scope: Limited to free/public reports; if no BTC-specific content in recent publications, note clearly and provide most relevant market-wide insights touching BTC.
- Limitations: Reports are periodic and qualitative—insights reflect Binance institutional view at publication date.
```

## Integration Notes

- Feeds into `cycleContextSpecialist` for research synthesis
- Complements Substack Archives (#11) and The Block (#25) for comprehensive research coverage
- Provides institutional research perspective on cycles and macro
- Can inform strike selection (research themes affect market narrative)

## Performance Notes

- Extract only what is explicitly stated (do not infer or extrapolate)
- Prioritize reports from last 12 months
- Cross-reference with Substack/The Block for bias checking

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_  
_Source: research.binance.com_
