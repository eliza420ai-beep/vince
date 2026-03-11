---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #7: Token Terminal (Protocol Fundamentals)

**Priority**: Tier 3 - Supporting  
**Specialist**: `fundamentalsSpecialist`  
**Data Source**: Token Terminal project pages

## Core Objectives

- Pull precise on-chain fundamentals for **any protocol or chain**
- Track fees, revenue, active users, TVL, transaction counts
- Compare protocols within categories (L1s, L2s, DeFi, DEXs)
- Identify revenue leaders and growth trends
- Ground investment theses with hard fundamentals

## Supported Entities

- **L1 Chains**: Bitcoin, Ethereum, Solana, Avalanche, etc.
- **L2s**: Base, Arbitrum, Optimism, zkSync, etc.
- **DeFi Protocols**: Aave, Uniswap, Lido, Maker, etc.
- **DEXs**: Raydium, Jupiter, Curve, etc.
- **Infrastructure**: Chainlink, The Graph, etc.

## Tool Usage Strategy

### Parallel Browse Calls

- `browse_page` on:
  - https://tokenterminal.com/terminal/projects/bitcoin
  - https://tokenterminal.com/terminal/projects/ethereum
  - https://tokenterminal.com/terminal/projects/solana
  - https://tokenterminal.com/terminal/projects/base
  - https://tokenterminal.com/terminal/projects/hyperliquid (if exists)
  - https://tokenterminal.com/terminal/projects (leaderboard)

Instructions for each: "Parse the entire page, focusing on the 'Key metrics' cards at the top and any highlighted charts or text. Extract exact latest values for: Fees in USD (30d total, 7d if shown, % changes MoM), Active users/addresses (exact metric name, latest value, % change MoM), Daily transactions, TVL, hash rate for BTC, Explanatory highlights or drivers (Runes, inscriptions, Ordinals, memecoins), Most recent data update date. If metric not publicly visible or behind Pro paywall, note 'Not available'. Output as structured bullet list with exact numbers and labels."

### Calculations (if needed)

- `code_execution` with pandas for:
  - BTC fee share of top chains
  - Combined ETH+Solana+Base fees
  - MoM trend comparisons

## Output Format

```markdown
## Token Terminal Fundamentals — [Current Date]

### Protocol Overview: [PROTOCOL NAME]

| Metric             | Value   | 30d Change | Rank |
| ------------------ | ------- | ---------- | ---- |
| Fees (30d)         | $X.XX M | ±Y%        | #Z   |
| Revenue (30d)      | $X.XX M | ±Y%        | #Z   |
| Active Users (30d) | X.XX M  | ±Y%        | #Z   |
| TVL                | $X.XX B | ±Y%        | #Z   |
| Daily Transactions | X.XX M  | ±Y%        |      |
| Market Cap/Fees    | X.Xx    |            |      |

### Category Leaderboard: [L1s / L2s / DeFi / DEXs]

| Rank | Protocol | 30d Fees | 30d Change | P/F Ratio |
| ---- | -------- | -------- | ---------- | --------- |
| 1    | [Name]   | $X.XX M  | ±Y%        | X.Xx      |
| 2    | [Name]   | $X.XX M  | ±Y%        | X.Xx      |
| 3    | [Name]   | $X.XX M  | ±Y%        | X.Xx      |

### Comparative Analysis (If Requested)

| Metric       | Protocol A | Protocol B | Winner |
| ------------ | ---------- | ---------- | ------ |
| 30d Fees     | $X M       | $Y M       | [A/B]  |
| Fee Growth   | +X%        | +Y%        | [A/B]  |
| Active Users | X M        | Y M        | [A/B]  |
| P/F Ratio    | X.Xx       | Y.Yx       | [A/B]  |

### Fundamentals Assessment

- **Revenue Quality**: [Strong/Growing/Declining] — [explanation]
- **User Growth**: [Accelerating/Stable/Slowing] — [explanation]
- **Valuation**: [Undervalued/Fair/Overvalued] based on P/F ratio vs category avg

### Key Insights

1. [Most important fundamental observation]
2. [Trend worth noting (growth/decline drivers)]
3. [Investment implication]

### Data Notes

- Source: Token Terminal (public data)
- Timestamp: [current date/time UTC]
- Limitations: Some metrics Pro-only; noted if unavailable
```

## Query-Specific Guidance

### "What are [protocol]'s fundamentals?"

Full fundamentals breakdown with category context

### "Compare fees of ETH vs SOL vs Base"

Side-by-side fee comparison across chains

### "Which DeFi protocols have the best fundamentals?"

Category leaderboard by fees/revenue

### "Is [protocol] undervalued?"

P/F ratio analysis vs category average

### "Top fee generators this month"

Leaderboard sorted by 30d fees

## Integration Notes

- Feeds into `fundamentalsSpecialist` for usage/activity context
- Provides valuation context (P/F ratios = price vs fundamentals)
- Complements DeFiLlama (TVL-focused) with revenue perspective

## Performance Notes

- Focus on fees and revenue as primary value metrics
- P/F ratio = Market Cap / Annualized Fees (lower = potentially undervalued)
- Public data only (note Pro-only limitations)
- Cross-verify with protocol dashboards for accuracy

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_
