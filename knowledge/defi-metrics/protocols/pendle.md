---
tags: [defi, protocols, metrics]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Pendle Protocol

## Quick Reference

| Attribute            | Value                                   |
| -------------------- | --------------------------------------- |
| **Type**             | Yield Tokenization Protocol             |
| **Products**         | PT/YT Tokens, vePENDLE, Yield Trading   |
| **Governance Token** | PENDLE                                  |
| **Revenue Model**    | Direct Fee-Sharing (80% to vePENDLE)    |
| **Key Chains**       | Ethereum, Arbitrum, Optimism, BNB Chain |
| **Launch**           | 2021 (V1), 2023 (V2 - current)          |

---

## How It Works

Pendle enables trading of future yield:

1. **Deposit**: Wrap yield-bearing asset (stETH, aUSDC, GLP, etc.)
2. **Tokenize**: Asset splits into PT (Principal Token) + YT (Yield Token)
3. **Trade**: Buy/sell PT or YT based on yield expectations
4. **Maturity**: At expiry, PT redeems for underlying, YT expires worthless

### Principal Token (PT)

- Trades at discount to underlying
- Discount = your fixed yield (locked in at purchase)
- Example: Buy PT-stETH at 0.95 ETH, redeem for 1 stETH at maturity = 5% fixed yield
- Lower risk, predictable returns

### Yield Token (YT)

- Captures all yield from underlying until maturity
- Leveraged bet on yields staying high
- If yields drop, YT value drops
- If yields rise, YT value increases
- Higher risk, speculative

### vePENDLE

- Lock PENDLE for 1 week to 2 years
- Receive 80% of protocol swap fees
- Vote on pool incentives
- Boost LP rewards up to 2.5x

---

## Revenue Model

**Classification**: Direct Fee-Sharing

Pendle has one of the purest direct fee-sharing models in DeFi:

- Swap fees generated on PT/YT trades
- **80% to vePENDLE holders** (weekly distribution)
- 20% to protocol treasury
- No token emissions diluting holders

### Why This Matters for Valuation

- Direct fee-sharing tokens typically trade at **10-50x revenue multiplier**
- Compare to buyback models (UNI, AAVE) at 100-500x
- vePENDLE holders get "real yield" - actual protocol revenue
- Lower multiplier = better value per dollar of revenue

---

## Key Markets

| Pool Type          | Examples           | Use Case                     |
| ------------------ | ------------------ | ---------------------------- |
| **Liquid Staking** | stETH, rETH, cbETH | Fixed staking yield          |
| **LRT Points**     | eETH, rsETH, ezETH | Points farming with PT hedge |
| **Stablecoins**    | sUSDe, GHO, FRAX   | Fixed stable yields          |
| **LP Tokens**      | GLP, GM            | Fixed perps yield            |

---

## Recent Developments & Context

**Key Milestones (for narrative context):**

- TVL explosion during LRT points meta (Eigenlayer, EtherFi, Renzo)
- Multi-chain expansion: Ethereum, Arbitrum, Optimism, BNB Chain
- Integration with major LRT protocols (eETH, rsETH, ezETH)
- sUSDe (Ethena) pools - yield on yield-bearing stablecoins
- V2 upgrade significantly improved UX and capital efficiency

**Market Narrative:**

- Pendle is THE yield trading protocol - first mover advantage
- Points meta was huge TVL driver (PT = lock in points + fixed yield)
- Bull case: Yield markets continue growing, more assets added
- Bear case: Points meta fades, yield compression across DeFi
- Current sentiment: Solid fundamentals, direct fee-sharing = real yield

**The Points Meta Connection:**

- Users bought PT to lock in Eigenlayer/LRT points exposure
- PT discount = your fixed yield, points came as bonus
- This drove massive TVL during restaking narrative
- As points meta matures, other yield sources (sUSDe, GLP) remain

**What To Watch:**

- vePENDLE APY (your "real yield")
- New pool launches and integrations
- TVL trends as points meta evolves
- Implied yields on major pools

## Risk Considerations

### Smart Contract Risk

- Complex tokenization logic
- Multiple chain deployments
- Audited but novel mechanics

### Liquidity Risk

- PT/YT pools can be illiquid near expiry
- Large positions may have slippage

### Yield Risk

- YT holders lose if yields drop
- Implied yields can be manipulated short-term

### Maturity Risk

- PT must be held to maturity for guaranteed returns
- Early exit may result in losses if rates move against you

---

## Related Tokens

| Token          | Type              | Description                            |
| -------------- | ----------------- | -------------------------------------- |
| **PENDLE**     | Governance        | Base token, can be locked for vePENDLE |
| **vePENDLE**   | Locked Governance | Vote-escrowed, receives 80% of fees    |
| **PT-[asset]** | Principal Token   | Fixed yield exposure                   |
| **YT-[asset]** | Yield Token       | Variable/leveraged yield exposure      |

---

## Valuation Framework

When analyzing PENDLE valuation:

1. Use CALCULATE_REVENUE_MULTIPLIER for current market cap / revenue ratio
2. **Expect LOW multiplier** (10-50x) due to direct fee-sharing
3. Compare to other direct fee-sharing: CRV, AERO, GMX
4. vePENDLE APY is the "real yield" - compare to risk-free rates

### Key Insight

PENDLE at 20x revenue multiplier is **cheaper** than UNI at 100x because:

- PENDLE: You get 80% of fees as vePENDLE holder
- UNI: You get indirect value through buybacks (if enabled)

---

## Context for Analysis

Pendle pioneered on-chain yield trading. Its success depends on:

- Continued growth in yield-bearing assets (LRTs, stablecoins)
- Points meta driving TVL (Eigenlayer, LRT campaigns)
- vePENDLE yields remaining attractive vs alternatives
- Cross-chain expansion and new asset integrations

For current metrics, use: GET_PROTOCOL_FEES_REVENUE, CALCULATE_REVENUE_MULTIPLIER, MESSARI_NEWS
