---
tags: [restaking, ethereum, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Liquid Restaking Tokens (LRTs)

## What Are LRTs?

Liquid Restaking Tokens are receipt tokens representing a position in EigenLayer (or competing restaking protocols). They solve a UX and capital efficiency problem: without LRTs, restaked ETH is locked and illiquid. LRTs make restaked positions tradeable, composable in DeFi (lending, LPing), and accessible without running operator infrastructure.

The yield stack: ETH staking yield (~3-4%) + EigenLayer AVS rewards + LRT protocol incentives + DeFi yield from using the LRT as collateral. This compounding is the appeal — and the risk.

## Major LRT Protocols

### ether.fi (eETH / weETH)

- **Market position**: Largest LRT by TVL, consistently $5B+ at peak. First-mover in the LRT space.
- **Mechanism**: Users deposit ETH → ether.fi stakes it → restakes on EigenLayer → issues eETH (rebasing) or weETH (non-rebasing wrapper). weETH became the standard for DeFi integrations.
- **Operator strategy**: Curated operator set with diversification requirements. ether.fi selects which AVSs to opt into on behalf of depositors.
- **Differentiation**: "Operation Solo Staker" program aimed to decentralize by onboarding home validators. Also launched Cash (crypto debit card) and Liquid vaults for automated DeFi strategies.
- **ETHFI token**: Governance + fee sharing. Protocol takes a 5% platform fee on restaking rewards.

### Renzo (ezETH)

- **Market position**: Second-largest LRT, peaked at ~$3B TVL. Multi-chain from early on.
- **Mechanism**: Deposits ETH or LSTs → restakes via curated operators → issues ezETH. Non-rebasing (value accrues inside the token price).
- **Multi-chain strategy**: Deployed on Arbitrum, BNB Chain, and others early, capturing cross-chain restaking demand.
- **Depeg incident**: ezETH briefly depegged in April 2024 during a points-farming frenzy and liquidity crunch, highlighting LRT fragility. The peg restored, but it exposed how thin secondary market liquidity can be relative to TVL.
- **REZ token**: Launched via Binance Launchpool, distributed to ezETH holders and points farmers.

### Puffer Finance (pufETH)

- **Market position**: Mid-tier LRT, differentiated by anti-slashing technology.
- **Mechanism**: Native restaking focus with Secure-Signer (SGX-based anti-slashing hardware module) to reduce slashing risk at the validator level.
- **Differentiation**: Technical approach to risk mitigation — Secure-Signer makes it harder for validators to commit slashable offenses, even if their nodes are compromised. Also pioneered "Validator Tickets" for a more efficient capital model.
- **UniFi AVS**: Puffer expanded beyond pure LRT into building its own AVS (UniFi) for based rollup preconfirmations, showing vertical integration ambitions.

### Kelp DAO (rsETH)

- **Market position**: Focused on multi-AVS diversification and institutional-grade curation.
- **Mechanism**: Deposits ETH/LSTs → restakes across multiple AVSs → issues rsETH. Kelp acts as an AVS portfolio manager.
- **Gain vaults**: Automated vault strategies that deploy rsETH into DeFi for additional yield, further stacking returns.
- **KEP token**: Points-based distribution similar to competitors.

## Risks Specific to LRTs

- **Peg risk**: LRTs trade on secondary markets. If redemption queues are long or trust is shaken, LRTs can depeg below NAV. This cascades into DeFi positions using LRTs as collateral (liquidation spirals).
- **Smart contract layering**: Each LRT adds a contract layer on top of EigenLayer's contracts on top of Ethereum's staking contracts. Three deep minimum — each layer is an attack surface.
- **Operator delegation risk**: LRT holders have no direct control over which operators or AVSs their ETH secures. The protocol team makes these decisions, introducing a trust assumption.
- **Yield illusion**: Much of LRT "yield" has been points/airdrop speculation, not sustainable AVS revenue. As points programs end, real yield may disappoint relative to the risk taken.
- **Liquidity mismatch**: Billions in TVL, millions in DEX liquidity. Exiting a large LRT position quickly can mean significant slippage or waiting in redemption queues.

_Last updated: 2026-02-15_
