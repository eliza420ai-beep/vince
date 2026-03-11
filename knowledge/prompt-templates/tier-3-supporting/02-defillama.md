---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt #2: DefiLlama (DeFi Ecosystem Analysis)

**Priority**: Tier 3 - Supporting  
**Specialist**: `defiFlowsSpecialist`  
**Data Source**: DefiLlama API (https://api.llama.fi)

## Core Objectives

- Assess overall DeFi ecosystem health across all chains
- Track TVL by chain, protocol category, and major protocols
- Monitor capital flows: stablecoin movements, bridge volumes, yield trends
- Identify which chains/protocols are gaining or losing market share
- Compare current state to historical cycles (2021 peak, 2022 bear, 2024-2025 recovery)

## Tool Usage Strategy

### Primary: DefiLlama API Endpoints

- `code_execution` with `requests` to query DefiLlama public APIs:
  - `/v2/chains` - All chains with current TVL, 1d/7d changes
  - `/v2/historicalChainTvl/{chain}` - Historical TVL for specific chain
  - `/protocols` - All protocols with TVL, category, chain
  - `/protocol/{slug}` - Detailed protocol data
  - `/stablecoins` - Stablecoin market caps and flows
  - `/stablecoins/chains` - Stablecoins by chain
  - `/bridges` - Cross-chain bridge volumes
  - `/yields/pools` - DeFi yield opportunities
  - `/fees` - Protocol revenue/fees data
  - `/dexs` - DEX volumes by chain/protocol

### Key Metrics to Extract

1. **TVL by Chain**: Top 10 chains, their TVL, 7d/30d % changes
2. **TVL by Category**: Lending, DEX, Liquid Staking, Bridges, Derivatives
3. **Stablecoin Health**: Total supply, chain distribution, depegs
4. **Yield Environment**: Average yields by category, risk tiers
5. **Capital Velocity**: Bridge volumes, DEX volumes, fee generation

### Fallback: Browse Page

- `browse_page` on defillama.com if API fails:
  - https://defillama.com/ (overview)
  - https://defillama.com/chains (chain rankings)
  - https://defillama.com/stablecoins (stablecoin dashboard)

## Output Format

```markdown
## DeFi Ecosystem Pulse — [Current Date]

**Overview**  
One-paragraph summary: Total DeFi TVL (~$X B), direction (growing/shrinking), dominant chains, and the most significant recent development.

**Chain Rankings (Top 10 by TVL)**
| Chain | TVL | 7d Change | 30d Change | Key Driver |
|-------|-----|-----------|------------|------------|
| Ethereum | $XX B | +X% | +X% | [brief note] |
| Solana | $XX B | +X% | +X% | [brief note] |
| ... | ... | ... | ... | ... |

**Category Breakdown**
| Category | TVL | Trend | Notable Protocols |
|----------|-----|-------|-------------------|
| Lending | $XX B | ↑/↓ | Aave, Compound, Morpho |
| DEXs | $XX B | ↑/↓ | Uniswap, Raydium, Orca |
| Liquid Staking | $XX B | ↑/↓ | Lido, Jito, Marinade |
| Bridges | $XX B | ↑/↓ | Stargate, Across |

**Capital Flow Signals**

- **Stablecoins**: Total supply $X B, USDT dominance X%, notable flows...
- **Bridge Activity**: $X B/day volume, top routes (e.g., Ethereum→Arbitrum)
- **Yield Trends**: Average lending yield X%, stablecoin yield X%

**Key Insights**

1. [Most important observation about ecosystem health]
2. [Chain gaining/losing market share and why]
3. [Risk signal or opportunity]
4. [Comparison to previous cycle]

**Ecosystem Health Score**: X/10

- Liquidity depth: [assessment]
- Yield sustainability: [assessment]
- Cross-chain activity: [assessment]
```

## Integration Notes

- Feeds into `defiFlowsSpecialist` for capital flow analysis
- Provides context for chain-specific agents (Solana, Ethereum, etc.)
- Informs macro positioning (DeFi health = risk-on/risk-off signal)
- Can identify which chains to focus on for yield opportunities

## Performance Notes

- Always fetch fresh data via API (DeFi TVL changes rapidly)
- Compare current TVL to ATH and cycle benchmarks
- Watch for anomalies: sudden TVL drops (exploits?), unusual bridge flows
- Stablecoin supply is a leading indicator of DeFi activity
- DEX volume/TVL ratio indicates capital efficiency

## Query-Specific Guidance

### "Which chains are growing/shrinking?"

Focus on `/v2/chains` endpoint, sort by 7d/30d change, identify outliers

### "Is DeFi healthy right now?"

Holistic view: TVL trend, yield sustainability, stablecoin flows, DEX volumes

### "Where should I deploy capital?"

Yield opportunities + risk assessment (protocol age, audit status, TVL stability)

### "BTC DeFi specifically"

Filter for Bitcoin chain, WBTC protocols, BTC-collateralized lending

---

_Template Version: 2.0_  
_Last Updated: 2026-01-22_
_Changes: Expanded from BTC-only to general DeFi ecosystem analysis_
