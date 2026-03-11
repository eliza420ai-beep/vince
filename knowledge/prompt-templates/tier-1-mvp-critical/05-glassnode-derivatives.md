---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #5: Glassnode (Derivatives & Market Snapshot)

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `derivativesSpecialist`  
**Data Source**: Glassnode Studio Public Dashboard (free tier)

## Core Objectives

- Extract Bitcoin derivatives metrics: Open Interest (OI), funding rates, liquidations
- Compare current readings to historical cycle benchmarks (2021 euphoria, 2020 accumulation, 2022 bear)
- Assess leverage health and regime signals
- Deliver concise, cycle-aware market snapshot

## Tool Usage Strategy

### Primary: Glassnode Studio Dashboard

- `browse_page` on `https://studio.glassnode.com/`
  - Instructions: "Extract all visible Bitcoin-specific metrics from the asset table and any overview sections: current price, 24h/7d % changes, market cap, 24h volume & % change, open interest (OI) & % change, funding rate, 24h liquidations. Include any additional context like total market cap, spot volume highlights, or top gainers mention for BTC. Note units clearly (e.g., $41.6B for OI, $29.6M for liqs)."

## Cycle Benchmarks (Reference)

- **Euphoria (2021 tops)**: OI >$60B, funding >0.08–0.1%, daily liqs >$500M–$1B spikes
- **Accumulation (2020 pre-bull)**: Low liqs <$50M, neutral-positive funding ~0.01%, moderate OI
- **Bear/distribution (2022)**: Negative funding, high liqs >$200M+, declining OI
- **Early bull/consolidation**: Positive but mild funding (0.005–0.03%), stable/low liqs, OI $30–50B range

## Output Format

```markdown
**Bitcoin Market Snapshot**  
_As of [current date/time if visible, otherwise today's date] – Source: Glassnode Studio Public Dashboard_

**Key Metrics**

- **Price**: $XX,XXX (+X.X% 24h | +X.X% 7d)
- **Market Cap**: $X.XX T
- **24h Volume**: $XX.X B (X.X% change)
- **Open Interest**: $XX.X B (X.X% change)  
  → [Brief interpretation, e.g., "Moderate leverage, well below 2021 euphoria peaks (> $60B)"]
- **Funding Rate**: X.XXXX%  
  → [Brief interpretation, e.g., "Mildly positive – perpetuals bullish without overheating"]
- **24h Liquidations**: $XX.X M  
  → [Brief interpretation, e.g., "Low – minimal leverage flush, healthy vs bear-market spikes"]

**Current Regime**  
[One-line classification, e.g., "Early bull consolidation"]  
[1–2 sentence justification based on signals + cycle comp]

**Insights**
• [Insight 1 – e.g., "Positive funding paired with declining OI and low liquidations suggests controlled profit-taking rather than a long squeeze."]
• [Insight 2 – e.g., "Volume contraction amid price stability mirrors pre-markup accumulation phases seen in 2020."]
• [Insight 3 – e.g., "Overall leverage remains prudent – room for upside if spot demand returns."]

**Notes & Uncertainties**
• Data is real-time snapshot only – no historical charts or on-chain depth available publicly.
• Derivatives metrics are exchange-aggregated; individual venue variance possible.
• Advanced on-chain signals (realized price, SOPR, flows) not accessible without account.
```

## Integration Notes

- Primary input for `derivativesSpecialist` (leverage & positioning signals)
- Feeds into `regimeAggregatorSpecialist` for strike selection context
- Funding rates and OI are critical for 7-day options pricing

## Performance Notes

- Free tier provides limited but high-signal derivatives data
- Cycle comparisons are key differentiator (grounds current state in history)
- Focus on public dashboard only (no login/signup required)

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_
