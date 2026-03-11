---
tags: [stablecoins, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

## Taxonomy of Stablecoins

### Category 1: Fiat-Backed (Fully Reserved)

**Examples:** USDC, USDT, PYUSD, FDUSD
**Mechanism:** 1:1 backed by fiat currency and equivalents (cash, T-bills). Issuer mints on deposit, burns on redemption.
**Trust assumption:** Trust the issuer to hold reserves and honor redemptions.

**Strengths:** Simple, capital efficient (1:1 ratio), tight peg
**Weaknesses:** Centralized (single issuer can freeze/blacklist), counterparty risk (banking, issuer), regulatory target
**Failure mode:** Issuer insolvency, reserve seizure, bank failure (USDC/SVB), regulatory shutdown

### Category 2: Crypto-Collateralized (Overcollateralized)

**Examples:** DAI/USDS (MakerDAO/Sky), LUSD (Liquity), crvUSD (Curve)
**Mechanism:** Users deposit crypto collateral (ETH, stETH, etc.) worth >100% of stablecoins minted. Liquidation mechanisms protect solvency.

**DAI/USDS (MakerDAO/Sky):**

- Originally pure ETH-backed, now ~60%+ backed by RWAs (T-bills) and USDC
- Collateral ratio: 150%+ for crypto vaults
- DSR distributes protocol revenue to holders
- Effectively a hybrid: decentralized governance but centralized collateral
- Market cap: ~$5-6B range

**LUSD (Liquity v1):**

- ETH-only collateral, 110% minimum ratio
- Fully immutable smart contracts — no governance, no upgrades
- Most decentralized stablecoin but limited scalability
- Liquity v2 (BOLD) introduces new mechanics

**crvUSD (Curve):**

- Uses LLAMMA (Lending-Liquidating AMM Algorithm) — soft liquidation mechanism
- Collateral gradually converts to stablecoin as price drops (no hard liquidation cliff)
- Innovative but complex; requires deep understanding of band mechanics

**Strengths:** Permissionless, censorship-resistant, transparent on-chain
**Weaknesses:** Capital inefficient (overcollateralization), liquidation risk, complexity
**Failure mode:** Collateral crash faster than liquidation (Black Thursday 2020), oracle failure, governance attack

### Category 3: Algorithmic (Undercollateralized)

**Examples:** UST (dead), Basis Cash (dead), Empty Set Dollar (dead), AMPL (rebase, still alive but niche)
**Mechanism:** Attempt to maintain peg through supply/demand algorithms without full collateral backing. Usually involves a companion token that absorbs volatility.

**Why they fail:**
The fundamental problem is reflexivity. When confidence drops:

1. Stablecoin holders sell → price drops below peg
2. Algorithm mints companion token to buy back stablecoin
3. Companion token supply inflates → its price drops
4. Less collateral backing → more confidence loss
5. Death spiral: repeat until worthless

**UST demonstrated this at $40B+ scale.** No pure algorithmic design has survived a severe stress test.

**Strengths (theoretical):** Capital efficient, decentralized, scalable
**Weaknesses (proven):** Death spiral risk, reflexive collapse, dependent on perpetual growth
**Failure mode:** Bank run → death spiral → total loss

### Category 4: Hybrid Models

**Ethena USDe:**

- Delta-neutral: holds stETH spot + short ETH perps
- Not truly "collateralized" in traditional sense — backed by a trading position
- Yield from staking rewards + funding rates
- Risk: negative funding, exchange counterparty, smart contract
- Market cap grew rapidly to $5B+ (2024-2025)

**FRAX:**

- Started as fractional-algorithmic (partially collateralized)
- Evolved to fully collateralized after UST collapse — market demanded it
- Now focused on frxETH and DeFi infrastructure
- Trajectory proves market won't accept undercollateralization

**GHO (Aave):**

- Minted by Aave borrowers using their Aave collateral
- Interest rate set by governance
- Leverages Aave's existing overcollateralized lending infrastructure
- Slow growth, struggles with peg maintenance

**Usual USD0:**

- RWA-backed (T-bills), yield distributed via USUAL token
- Attempts to combine fiat-backing stability with DeFi-native distribution

## The Evolution Pattern

The market has spoken clearly:

1. **2020-2021:** Experimentation era — algorithmic designs flourished
2. **2022:** UST collapse killed pure algorithmic confidence permanently
3. **2023-2024:** Surviving projects moved toward full/over-collateralization
4. **2025+:** Innovation focuses on yield distribution and capital efficiency within collateralized frameworks

**The winning formula emerging:** Real collateral (T-bills/crypto) + transparent on-chain mechanics + sustainable yield pass-through. Pure algorithms are dead; the debate is now about what KIND of collateral and how to distribute yield.

---

_Last updated: 2026-02-15_
