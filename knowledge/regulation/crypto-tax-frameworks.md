---
tags: [regulation, compliance, legal]
agents: [oracle, eliza]
last_reviewed: 2026-02-15
---

# Crypto Tax Frameworks (US Focus)

## Capital Gains: The Baseline

Crypto sold within 1 year: **short-term capital gains** (ordinary income rates, up to 37%). Held over 1 year: **long-term capital gains** (0%, 15%, or 20% depending on income). This is settled law.

**Cost basis methods:** FIFO (first-in, first-out) is the default. Specific identification is allowed if you can adequately identify the units sold (per IRS FAQ Q39-40). HIFO (highest-in, first-out) minimizes tax burden but requires meticulous records. The 2024 final broker regulations clarified that CeFi brokers must support specific identification starting 2026.

**Crypto-to-crypto trades** are taxable events. Swapping ETH for USDC triggers a disposition of ETH. Section 1031 like-kind exchange arguments died with the 2017 Tax Cuts and Jobs Act, which restricted 1031 to real property.

## Staking & Mining Rewards

**Mining income:** Taxed as ordinary income at fair market value upon receipt (established since Notice 2014-21). Cost basis equals the FMV at receipt.

**Staking rewards:** The Jarrett v. United States case (2024 Sixth Circuit) initially suggested staking rewards might not be taxable until sold (the "created property" theory). However, the IRS rejected this broadly via Revenue Ruling 2023-14, firmly establishing that staking rewards are ordinary income upon receipt. Most practitioners advise reporting as income at receipt to avoid penalties, despite the theoretical debate continuing.

**Validator rewards, MEV income, and liquid staking tokens** (e.g., stETH, rETH) add complexity. Receiving stETH in exchange for ETH — is that a taxable swap or a deposit? Consensus leans toward non-taxable if economically equivalent, but no definitive IRS guidance exists.

## DeFi Transactions

DeFi creates tax nightmares through composability:

- **LP provision:** Adding to a Uniswap pool (ETH + USDC → LP token) is likely a taxable disposition of both assets. Removing liquidity triggers another event. Impermanent loss is not directly deductible — you realize the actual gain/loss upon withdrawal.
- **Yield farming:** Rewards received are ordinary income at FMV. Compounding (claiming and restaking) creates additional taxable events.
- **Borrowing/lending:** Depositing collateral is generally non-taxable (like pledging stock for a margin loan). Liquidation, however, is a taxable disposition. Interest received on lending is ordinary income.
- **Wrapping/bridging:** Wrapping ETH → WETH is likely non-taxable (same economic substance). Cross-chain bridges are murkier — if the bridge mints a new token, it could be treated as a swap.

## NFTs & Digital Collectibles

NFTs are property. Creating (minting) an NFT for sale: proceeds minus costs = ordinary income (if you're the creator) or capital gains (if you're a collector reselling).

**Collectibles rate:** The IRS proposed in 2023 that certain NFTs qualifying as "collectibles" could face the 28% long-term capital gains rate (vs. 20%). A look-through analysis determines if the underlying asset (art, music) would be a collectible. Most PFP/art NFTs likely qualify — meaning higher tax rates for long-term holders.

## 1099 Reporting & Broker Rules

The Infrastructure Investment and Jobs Act (2021) expanded "broker" to include crypto platforms. Final regulations (2024) require CeFi exchanges to issue **Form 1099-DA** starting with 2025 tax year (due early 2026). DeFi front-ends face deferred reporting requirements, with final rules for DeFi brokers pushed to 2027 after industry pushback and legal challenges.

**Impact:** Cost basis reporting will improve dramatically for CeFi users. DeFi users remain largely self-reporting.

## The Wash Sale Debate

As of early 2026, crypto is **not** subject to wash sale rules (Section 1091 applies only to "securities" and "stock"). This allows tax-loss harvesting without the 30-day waiting period — sell at a loss, immediately rebuy. Multiple legislative proposals (including provisions in various 2024-25 budget proposals) have attempted to close this, but none have been enacted. Practitioners expect this loophole to close eventually, making aggressive harvesting a time-limited strategy.

_Last updated: 2026-02-15_
