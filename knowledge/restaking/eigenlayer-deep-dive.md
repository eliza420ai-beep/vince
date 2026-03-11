---
tags: [restaking, ethereum, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# EigenLayer Deep Dive

## Operators

Operators are the execution layer of EigenLayer. They register on-chain, run AVS-specific validation software, and receive delegated stake from restakers. Key dynamics:

- **Professional operators** dominate: firms like P2P, Figment, Chorus One run multiple AVSs simultaneously. Running an operator node requires DevOps expertise and reliable infrastructure — this isn't solo-staker friendly.
- **Delegation model**: Restakers delegate to operators rather than running AVS software themselves. This creates a trust relationship — if an operator misbehaves, the delegator's stake gets slashed too.
- **Operator fees**: Operators take a commission from AVS rewards before passing the remainder to delegators. Fee competition is emerging but immature.
- **Operator concentration**: A small number of operators control a disproportionate share of delegated stake, raising centralization concerns similar to Ethereum's validator concentration around Lido.

## AVS Mechanics

Each AVS is a self-contained validation system built on EigenLayer's shared security:

- **Task definition**: AVSs define discrete tasks (e.g., attesting to data blobs for EigenDA, signing cross-chain messages for Omni) with specific computational and uptime requirements.
- **Quorum configuration**: AVSs set minimum stake thresholds and quorum rules. Some require ETH-only quorums; others accept LSTs or even the EIGEN token as a separate quorum.
- **Reward distribution**: AVSs pay operators in their native token or ETH. The EigenLayer protocol takes no cut currently — a deliberate growth strategy.

## Slashing

Slashing is the enforcement mechanism that gives restaked security its teeth:

- **Objectively attributable faults**: EigenLayer's design principle is that slashing should only occur for behavior provably attributable on-chain — double-signing, invalid attestations, etc. Subjective faults (liveness failures) are harder to slash for.
- **Slashing veto committee**: A governance-controlled committee can veto illegitimate slashing events, providing a safety net against buggy AVS slashing logic. This is controversial — it's training wheels that may centralize dispute resolution.
- **Compounding slashing risk**: A restaker opted into 5 AVSs faces slashing conditions from all 5. One AVS's bug could slash ETH that was also securing the other 4, creating contagion risk.

## EIGEN Token

EIGEN launched mid-2024 with a novel "intersubjective" forking model:

- **Dual staking**: EIGEN serves as a complementary quorum alongside ETH. The thesis: ETH handles objective faults (provable on-chain), while EIGEN handles intersubjective faults (the community can agree something went wrong, but it's not automatically provable).
- **Social forking**: In a dispute, EIGEN can be "forked" — holders vote with their tokens on which fork represents the legitimate state. This is an experimental governance primitive with no real-world stress test yet.
- **Tokenomics**: 1.67B total supply. Distribution included stakedrop to restakers and ecosystem participants. Initial circulating supply was limited, with multi-year vesting for team/investors. Fully diluted valuation peaked at ~$10B+.

## Points & Airdrop Dynamics

EigenLayer's points system was one of DeFi's most influential meta-games:

- **Restaking points** accumulated linearly based on ETH restaked × time. No cap, no decay.
- **Points-to-EIGEN conversion** drove billions in TVL as speculators deposited LSTs to farm the anticipated airdrop.
- **LRT amplification**: Liquid restaking protocols (ether.fi, Renzo, etc.) offered their own points on top of EigenLayer points, creating a points-on-points meta that attracted mercenary capital.
- **Post-airdrop dynamics**: TVL partially deflated after EIGEN distribution as mercenary capital rotated. The sustainability of EigenLayer's TVL depends on real AVS revenue replacing speculative incentives.

## Competitive Moat

EigenLayer's moat rests on three pillars:

1. **TVL network effect**: More restaked ETH → more attractive to AVSs → more AVS revenue → more restakers. This flywheel is hard to replicate once spinning.
2. **AVS ecosystem lock-in**: AVSs that build on EigenLayer's slashing and delegation contracts face switching costs.
3. **First-mover brand**: "Restaking" is synonymous with EigenLayer in the same way "DEX" once meant Uniswap.

Competitors (Symbiotic, Karak) are attempting to challenge with different collateral flexibility (any ERC-20, not just ETH/LSTs) and more modular architectures, but EigenLayer's head start in TVL and AVS partnerships remains substantial.

_Last updated: 2026-02-15_
