---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #6: Dune Analytics (Deep On-Chain Analysis)

**Priority**: Tier 1 - MVP Critical  
**Specialist**: `onChainHealthSpecialist`  
**Data Source**: Dune Analytics public dashboards and queries

## Core Objectives

- Extract deep on-chain insights across **Bitcoin, Ethereum, Solana, and L2s**
- Track whale behavior, accumulation/distribution, large transfers, exchange flows
- Analyze holder cohort changes, DEX volumes, protocol usage
- Monitor cross-chain activity (bridges, L2 flows, ecosystem growth)
- Compare current metrics to previous cycles (2016–2018, 2020–2022, 2024)
- Deliver actionable, chain-specific analysis

## Supported Chains

- **Bitcoin**: Whale flows, Ordinals/Runes, exchange activity
- **Ethereum**: DEX volume, gas usage, staking, L2 bridges
- **Solana**: DEX volume, program usage, NFT activity
- **L2s**: Arbitrum, Base, Optimism TVL/activity
- **Cross-Chain**: Bridge volumes, capital migration patterns

## Tool Usage Strategy

### Discovery Phase

- `web_search` queries by chain:
  - **Bitcoin**: "Dune Analytics Bitcoin whale accumulation", "BTC exchange flows", "Ordinals Runes activity"
  - **Ethereum**: "Dune Analytics ETH DEX volume", "Ethereum gas usage trends", "L2 bridge flows"
  - **Solana**: "Dune Analytics Solana DEX volume", "SOL program activity", "Solana NFT trends"
  - **L2s**: "Dune Analytics Arbitrum Base Optimism TVL", "L2 transaction counts"
  - **Cross-Chain**: "Dune Analytics bridge volumes", "cross-chain capital flows"

### Data Extraction Phase

- `browse_page` on promising dashboards/queries found
  - Instructions: "Extract all key metrics, tables, and time-series data visible. Include latest values, WoW/MoM changes. For charts, describe trends quantitatively. Export visible table data as structured text."

### Analysis Phase

- `code_execution` with pandas to:
  - Parse and clean extracted data
  - Compare metrics across chains
  - Compute derived metrics (DEX market share, bridge utilization rates)
  - Identify trends, anomalies, and chain-specific patterns

## Output Format

```markdown
## Dune Analytics On-Chain Deep Dive — [Current Date]

### Multi-Chain Overview

| Chain    | Key Metric        | Value      | 7d Change | Signal        |
| -------- | ----------------- | ---------- | --------- | ------------- |
| Bitcoin  | Exchange Reserves | X.XX M BTC | -X.X%     | Accumulation  |
| Ethereum | DEX Volume (7d)   | $X.XX B    | +X.X%     | High activity |
| Solana   | Daily Txns        | X.XX M     | +X.X%     | Growing usage |
| Arbitrum | TVL               | $X.XX B    | +X.X%     | Inflows       |
| Base     | Active Addresses  | X.XX M     | +X.X%     | Adoption      |

### Bitcoin On-Chain

**Regime**: [Accumulation/Distribution/Neutral]

- Whale cohort (1k-10k BTC): [accumulating/distributing], +/- X BTC (30d)
- Exchange reserves trend: [declining = bullish, rising = sell pressure]
- Ordinals/Runes activity: [volume, trend]

### Ethereum On-Chain

**Health**: [Active/Slowing/Accelerating]

- DEX volume: $X.XX B (7d), market share by protocol
- Gas usage: X gwei avg, [interpretation]
- Staking: X.XX M ETH staked, net change
- L2 bridge outflows: $X.XX B to [top L2s]

### Solana On-Chain

**Momentum**: [Hot/Cooling/Stable]

- DEX volume: $X.XX B (7d), top DEXs
- Daily transactions: X.XX M
- Top programs by usage: [list]
- NFT activity: [trend]

### L2 Ecosystem

| L2       | TVL     | 7d Txns | Active Addresses | Trend |
| -------- | ------- | ------- | ---------------- | ----- |
| Arbitrum | $X.XX B | X.XX M  | X.XX K           | ↑/↓   |
| Base     | $X.XX B | X.XX M  | X.XX K           | ↑/↓   |
| Optimism | $X.XX B | X.XX M  | X.XX K           | ↑/↓   |

### Cross-Chain Capital Flows

- **Net Bridge Direction**: [ETH→L2s / L2s→ETH / Neutral]
- **Top Bridge Routes**: [source→dest, volume]
- **Capital Migration Signal**: [interpretation]

### Key Insights

1. [Most important cross-chain observation]
2. [Chain gaining/losing activity]
3. [Whale or smart money signal]
4. [Emerging pattern worth monitoring]

### Data Sources

- Dashboards used: [list with links]
- Notable creators: hildobby, 0xKofi, dragonfly_xyz, spellcaster
```

## Query-Specific Guidance

### "What's happening on Bitcoin on-chain?"

Focus on BTC-specific metrics: exchange flows, whale cohorts, Ordinals

### "How's Ethereum doing on-chain?"

DEX volume, gas, staking, L2 bridge activity

### "Compare Solana vs Ethereum activity"

Side-by-side DEX volumes, transaction counts, user growth

### "Which L2 is winning?"

TVL, transaction counts, active addresses across Arbitrum/Base/Optimism

### "Where is capital flowing?"

Bridge data, cross-chain movements, L1→L2 patterns

## Integration Notes

- Primary input for `onChainHealthSpecialist` (whale flows, accumulation signals)
- Feeds into `regimeAggregatorSpecialist` for bias scoring
- Can be merged with Nansen (#16) for "Smart Money + Custom Queries" agent (per Grok suggestion)

## Performance Notes

- Prioritize highly viewed/forked dashboards (hildobby, dragonfly_xyz, dati, 0xRob creators)
- Cross-validate across multiple dashboards (quantitative, skeptical of single-source signals)
- Maximize depth by chaining tool calls (discovery → extraction → analysis)

---

_Template Version: 1.0_  
_Last Tested: 2026-01-XX_
