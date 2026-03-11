---
tags: [defi, protocols, metrics]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Ethena Protocol

## Quick Reference

| Attribute            | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Type**             | Synthetic Dollar Protocol                        |
| **Products**         | USDe (stablecoin), sUSDe (staked), Internet Bond |
| **Governance Token** | ENA                                              |
| **Revenue Model**    | Treasury (yield from hedging to reserve)         |
| **Key Chains**       | Ethereum, Arbitrum, Aptos                        |
| **Launch**           | 2024                                             |

---

## How It Works

USDe is a synthetic dollar backed by delta-hedged positions:

1. **Deposit Collateral**: User deposits approved collateral (stETH, wBTC, etc.)
2. **Mint USDe**: Protocol mints USDe 1:1 against collateral value
3. **Delta Hedge**: Protocol opens short perpetual positions equal to collateral value
4. **Price Neutral**: Long spot + short perp = delta-neutral (no directional exposure)
5. **Yield Generation**: Returns from staking rewards + funding rate payments

### Products

- **USDe**: The core synthetic dollar - maintains $1 peg through delta-hedging
- **sUSDe**: Staked USDe that earns yield from the protocol (variable APY)
- **Internet Bond**: Savings instrument combining staking + funding yields

### The Funding Rate Mechanism

- When funding is **positive** (longs pay shorts): Ethena earns yield
- When funding is **negative** (shorts pay longs): Ethena pays out, reducing yields
- Historical funding has been positive ~80% of the time across major venues

---

## Revenue Model

**Classification**: Treasury (NOT direct fee-sharing!)

⚠️ **CRITICAL DISTINCTION**: ENA does NOT receive direct protocol fees!

Unlike direct fee-sharing protocols (PENDLE, CRV, AERO), Ethena uses a treasury model:

- Protocol yield flows to reserve fund first
- Yields distributed to **sUSDe stakers** (not ENA holders!)
- **ENA is governance-only** - votes on parameters, no direct revenue share
- ENA value = governance rights + potential future fee switch
- Compare ENA to other treasury models: MKR, COMP, not to CRV/AERO

**Actionable Insight**: If you want Ethena yield, hold **sUSDe** (the yield token), not ENA (the governance token).

---

## Key Integrations

| Partner         | Integration        | Significance                                   |
| --------------- | ------------------ | ---------------------------------------------- |
| **Aave**        | USDe as collateral | Major DeFi lending integration, boosts utility |
| **Hyperliquid** | HUSDE ticker       | Perps trading with USDe margin                 |
| **Binance**     | Full integration   | CEX liquidity and trading pairs                |
| **Aptos**       | sUSDe lending      | Cross-chain expansion with yield opportunities |
| **MegaETH**     | MegaUSD (USDm)     | L2 stablecoin partnership                      |

---

## Recent Developments & Context

**Key Milestones (for narrative context):**

- USDe supply crossed $6B+ (one of fastest growing stablecoins ever)
- Aave integration - USDe as collateral, massive DeFi utility unlock
- Hyperliquid integration - HUSDE for perps trading
- Aptos expansion - sUSDe lending for cross-chain yield
- Binance full integration - major CEX adoption

**Market Narrative:**

- Ethena represents the "yield-bearing stablecoin" narrative
- Competes with: DAI (overcollateralized), USDC/USDT (fiat-backed)
- Bull case: Captures perp funding premium at scale
- Bear case: Funding goes negative, yield compression
- Current sentiment: Growing adoption, but skeptics cite custodial risk

**What To Watch:**

- Funding rate trends across major venues
- USDe supply growth vs redemptions
- New chain/protocol integrations
- Regulatory developments on synthetic assets

## Risk Considerations

### Funding Rate Risk

- Negative funding periods reduce or eliminate yields
- Extended negative funding could cause mass redemptions
- Protocol maintains insurance fund for funding drawdowns

### Custodial Risk

- Collateral held on CEXes (Binance, Bybit, OKX) for hedging
- Exchange failure/hack could impact collateral
- Mitigation: Uses OES (off-exchange settlement) custody

### Smart Contract Risk

- Complex multi-chain architecture
- Audited but novel mechanism

### Depeg Risk

- Not backed by fiat/treasuries like USDC/USDT
- Relies on derivatives markets functioning normally
- Stress scenario: Derivatives market disruption

---

## Related Tokens

| Token     | Type          | Description                                |
| --------- | ------------- | ------------------------------------------ |
| **ENA**   | Governance    | Protocol governance, no direct fee-sharing |
| **USDe**  | Stablecoin    | Synthetic dollar, maintains $1 peg         |
| **sUSDe** | Yield-bearing | Staked USDe that earns protocol yield      |

---

## Valuation Framework

When analyzing ENA valuation:

1. Use CALCULATE_REVENUE_MULTIPLIER for current market cap / revenue ratio
2. Compare to other treasury-model protocols (Maker/Sky, Compound)
3. Consider: ENA doesn't receive direct fees like PENDLE or CRV
4. Growth thesis is TVL expansion and future fee switch potential

---

## Context for Analysis

Ethena represents a new paradigm in stablecoin design - neither fiat-backed (USDC) nor overcollateralized (DAI). Its success depends on:

- Perpetual funding rates remaining positive on average
- Continued CEX integration and trust
- Expansion of USDe utility across DeFi

For current metrics, use: GET_PROTOCOL_FEES_REVENUE, CALCULATE_REVENUE_MULTIPLIER, MESSARI_NEWS
