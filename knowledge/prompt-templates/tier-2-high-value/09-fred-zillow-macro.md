---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #9: Zillow/FRED (Macro Overlays - Real Estate in BTC)

**Priority**: Tier 2 - High Value  
**Specialist**: `macroOverlaysSpecialist`  
**Data Source**: FRED (Federal Reserve Economic Data), Zillow, Census Bureau, tradingeconomics.com

## Core Objectives

- Track Bitcoin's purchasing power against US real estate (median home prices)
- Calculate how many BTC it takes to buy a median US home
- Analyze 5-year trend (decreasing = BTC purchasing power increasing)
- Provide macro regime signal for strike selection

## Tool Usage Strategy

- `web_search` OR `browse_page` on:
  - FRED: https://fred.stlouisfed.org/ (search for home price indices)
  - Zillow Research: https://www.zillow.com/research/
  - Census Bureau, tradingeconomics.com, macrotrends.net
  - OR sources that directly visualize "[asset description] in Bitcoin" ratio
- Instructions: "Find current median US home price (in USD) and current BTC price (in USD). If available, find historical trends or existing charts/articles showing 'median home price in Bitcoin' or 'how many BTC to buy a home' over the past 5 years. Prioritize sources that directly provide or visualize the ratio (home price ÷ BTC price) to avoid manual calculation. Focus on national-level data (not regional)."

## Output Format

```markdown
# Bitcoin Purchasing Power vs US Real Estate – [Current Date]

**Current Value**
As of [latest date], a median US home costs roughly X BTC.

**5-Year Trend**
In [start period, e.g., January 2021], it took around Y BTC; today it's down to X BTC, a decrease of Z%.

**Insight**
This [upward/downward] trend indicates BTC has [increased/decreased] its purchasing power against US real estate, meaning [fewer/more] bitcoins are needed to buy a median home compared to 5 years ago.

**Explanatory Notes**
[1-2 brief notes on impact of BTC price appreciation vs home price growth, or market cycle influences]
```

## Integration Notes

- Feeds into `macroOverlaysSpecialist` for macro context
- Provides regime signal (BTC outperforming real assets = risk-on, underperforming = risk-off)
- Can inform strike selection (macro risk levels)

## Performance Notes

- Focus on national-level data (not regional)
- Prioritize sources with direct ratio visualization (avoid manual calculation)
- Keep response factual, sourced, easy to read (no tables, JSON, charts)

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_
