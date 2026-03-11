---
tags: [stablecoins, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

## Historical Depegs: Case Studies

### UST/Luna Collapse (May 2022)

**Type:** Mechanical death spiral
**Cause:** Algorithmic design relied on arbitrage between UST and LUNA. When UST selling pressure exceeded LUNA's ability to absorb (via minting), reflexivity kicked in: UST depeg → LUNA dump → more UST selling → deeper depeg. Anchor protocol's 20% yield was unsustainable and attracted mercenary capital that fled at first sign of trouble.
**Depth:** $1.00 → $0.00 (total loss, ~$40B destroyed)
**Lesson:** Algorithmic stablecoins backed only by their own ecosystem token have a fundamental design flaw — the collateral fails exactly when you need it most. Endogenous collateral = circular backing.

### USDC March 2023 Depeg

**Type:** Confidence/contagion (banking crisis)
**Cause:** Silicon Valley Bank collapsed; Circle disclosed $3.3B of USDC reserves (~8%) held at SVB. Weekend timing meant no Fed wire for redemptions. USDC traded as low as $0.87 on DEXs.
**Recovery:** Monday: Fed announced depositor backstop → USDC fully recovered within 48 hours.
**Depth:** ~13% depeg, full recovery
**Lesson:** Even fully-reserved stablecoins carry banking counterparty risk. The depeg was a liquidity event, not a solvency event. Those who bought at $0.88 made 12% in 48 hours. Curve 3pool imbalance was the first signal.

### USDT FUD Cycles (Recurring)

**Type:** Confidence/narrative
**Pattern:** Short sellers build positions → publish research questioning reserves → social media amplifies → brief depeg (usually <1%) → Tether processes redemptions normally → shorts squeezed → recovery. Happened in 2017, 2019, 2022, 2023.
**Lesson:** Tether has processed $100B+ in cumulative redemptions without failing. Each survived FUD cycle strengthens the Lindy effect argument, but past survival doesn't guarantee future solvency.

### DAI Depegs

**Type:** Collateral-driven
**Events:** March 2020 "Black Thursday" — ETH crashed 50%+, liquidation bots failed, DAI traded above $1.10 (supply contraction). Showed that crypto-collateralized stablecoins can depeg upward during crises.

## Depeg Risk Assessment Framework

### Level 1: Design Analysis

- What backs the peg? (Exogenous collateral = safer; endogenous = dangerous)
- Is there a redemption mechanism? Who can access it?
- What's the collateral ratio? (>150% crypto-backed, 100% fiat-backed, <100% = danger)

### Level 2: On-Chain Monitoring

- **Curve pool balance:** >55/45 split = early stress; >70/30 = active depeg
- **DEX vs CEX price divergence:** DEX depegs first (less liquidity)
- **Redemption volume:** Spike in burns = institutional exits
- **Mint freezes:** If issuer stops minting, arb mechanism breaks

### Level 3: Macro/Narrative

- Banking sector stress → fiat-backed stablecoin risk (USDC/SVB lesson)
- Regulatory action → freeze/seizure risk
- Competitor launches → capital rotation (not depeg, but market cap decline)
- General crypto panic → flight to "safest" stablecoin (usually USDT paradoxically)

## Early Warning Indicators

1. **Curve 3pool imbalance** — most reliable on-chain signal
2. **Redemption queue depth** — if disclosed or observable
3. **Credit default swap equivalent** — Aave/Compound borrow rates for the stablecoin spike
4. **Social sentiment velocity** — sudden spike in negative mentions
5. **Authorized participant behavior** — large burns by known institutional wallets

## Action Playbook

- **Monitor:** Set alerts for Curve pool ratios and DEX price feeds
- **Small depeg (<2%):** Assess cause; if liquidity-driven with intact fundamentals, consider buying
- **Medium depeg (2-10%):** Reduce exposure unless you have high conviction on recovery mechanism
- **Severe depeg (>10%):** Exit remaining positions; likely structural issue
- **Death spiral indicators:** Exit everything including related tokens immediately

---

_Last updated: 2026-02-15_
