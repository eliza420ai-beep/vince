---
tags: [defi, protocols, metrics]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Hyperliquid Protocol

## Quick Reference

| Attribute            | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Type**             | Perpetuals DEX / L1 Blockchain                 |
| **Products**         | Perps Trading, HyperEVM, HIP Tokens            |
| **Governance Token** | HYPE                                           |
| **Revenue Model**    | Buyback (trading fees fund token buybacks)     |
| **Key Chains**       | Hyperliquid L1 (native), bridges from Arbitrum |
| **Launch**           | 2023 (mainnet), HYPE token 2024                |

---

## How It Works

Hyperliquid is a purpose-built L1 for perpetual futures:

1. **Deposit**: Bridge USDC from Arbitrum to Hyperliquid L1
2. **Trade**: Access 100+ perpetual markets with up to 50x leverage
3. **Order Book**: Central limit order book (not AMM) for tight spreads
4. **Settlement**: Sub-second finality on custom consensus

### Products

- **Perpetual Futures**: Core product - 100+ markets with deep liquidity
- **HyperEVM**: EVM-compatible layer for DeFi apps (lending, DEXes)
- **HIP Tokens**: Hyperliquid Improvement Proposal tokens for ecosystem projects
- **HUSDE**: USDe integration for alternative margin

### The Order Book Advantage

Unlike AMM-based perps (GMX, Gains):

- No slippage for size (within order book depth)
- Maker/taker fee structure (makers often get rebates)
- Professional trading features (advanced order types)
- Faster execution (purpose-built L1)

---

## Revenue Model

**Classification**: Buyback

Hyperliquid has one of the most aggressive buyback models in DeFi:

- Trading fees (taker fees minus maker rebates) generate revenue
- Revenue used to buy back HYPE from open market
- Bought-back HYPE is burned or held by protocol
- Direct supply reduction = value accrual to remaining holders

### Fee Structure

- Taker fees: ~2-4 bps depending on tier
- Maker rebates: Often negative (makers get paid)
- Net spread funds protocol revenue

---

## Key Metrics to Track

| Metric              | Why It Matters                   |
| ------------------- | -------------------------------- |
| **Daily Volume**    | Primary revenue driver           |
| **Open Interest**   | Market depth and user commitment |
| **Buyback Amount**  | Direct HYPE value accrual        |
| **Active Users**    | Platform growth                  |
| **Market Listings** | Ecosystem expansion              |

---

## Competitive Position

| Protocol        | Model        | Advantage                | Disadvantage                 |
| --------------- | ------------ | ------------------------ | ---------------------------- |
| **Hyperliquid** | Order Book   | Best execution, low fees | Requires liquidity providers |
| **GMX**         | AMM (GLP/GM) | Passive LP, simple       | Slippage on large trades     |
| **dYdX**        | Order Book   | Established, governance  | Higher fees, DYDX inflation  |
| **Vertex**      | Hybrid       | Multi-product            | Smaller ecosystem            |

---

## Recent Developments & Context

**Key Milestones (for narrative context):**

- HYPE token launch (late 2024) - one of largest airdrops ever
- Top 3 perps DEX by volume (competing with dYdX, GMX)
- HyperEVM launch - expanding beyond pure perps
- HIP token ecosystem growing (projects launching on Hyperliquid)
- Aggressive buyback execution - consistent fee → buyback flow

**Market Narrative:**

- Hyperliquid represents "CEX-killer" narrative for perps
- Order book model attracts professional traders from CEXes
- Bull case: Volume growth → more buybacks → HYPE appreciation
- Bear case: dYdX/Vertex competition, regulatory risk on perps
- Current sentiment: Strong momentum, HyperEVM unlocks new use cases

**Volume & Growth Story:**

- Daily volume often exceeds $1B+
- Open interest competitive with major CEXes
- User growth accelerating with token incentives
- Maker rebates attract liquidity providers

**What To Watch:**

- Daily/weekly volume trends
- HyperEVM ecosystem development
- Buyback amounts and frequency
- Competition from dYdX v4, Vertex

## Risk Considerations

### Centralization Risk

- Single validator set (though expanding)
- Team controls significant HYPE supply
- Less battle-tested than established chains

### Bridge Risk

- Assets bridged from Arbitrum
- Bridge exploit could impact funds

### Competition Risk

- dYdX, Vertex, GMX all competing for perps volume
- CEX perps (Binance, Bybit) remain dominant

### Smart Contract Risk

- Novel L1 architecture
- HyperEVM is newer, less audited

---

## Related Tokens

| Token          | Type                 | Description                                    |
| -------------- | -------------------- | ---------------------------------------------- |
| **HYPE**       | Governance + Buyback | Protocol token, benefits from fee buybacks     |
| **HUSDE**      | Stablecoin           | Ethena's USDe integrated for margin            |
| **HIP Tokens** | Ecosystem            | Various project tokens launched on Hyperliquid |

---

## Valuation Framework

When analyzing HYPE valuation:

1. Use CALCULATE_REVENUE_MULTIPLIER for current market cap / revenue ratio
2. Compare to other buyback models (UNI, AAVE)
3. Key differentiator: Hyperliquid's buyback is more aggressive and consistent
4. Volume growth = revenue growth = more buybacks

---

## Context for Analysis

Hyperliquid represents the shift from CEX to on-chain perps trading. Its success depends on:

- Maintaining competitive fee structure
- Growing trading volume (currently top 3 in perps)
- HyperEVM ecosystem development
- Decentralization roadmap execution

For current metrics, use: GET_PROTOCOL_FEES_REVENUE, CALCULATE_REVENUE_MULTIPLIER, MESSARI_NEWS
