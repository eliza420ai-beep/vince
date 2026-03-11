---
tags: [mev, trading, ethereum]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Cross-Chain MEV

## The Multi-Chain Reality

DeFi liquidity is fragmented across dozens of chains: Ethereum mainnet, Arbitrum, Optimism, Base, Solana, and more. The same asset trades at slightly different prices on each chain. These discrepancies are MEV opportunities — and the searchers exploiting them are becoming the connective tissue of the multi-chain economy.

## Cross-Domain Arbitrage

The simplest cross-chain MEV: an asset is cheaper on Chain A than Chain B. A searcher buys on A, bridges, sells on B. In practice, bridging latency makes atomic execution impossible, so searchers take inventory risk. Sophisticated actors pre-position capital on multiple chains and rebalance based on observed price deltas.

CEX-DEX arbitrage is the dominant form: a price moves on Binance, and searchers race to arbitrage the stale DEX price on Ethereum or an L2. This accounts for a massive share of all MEV — some estimates put it at 40-60% of total builder revenue. It's also the hardest to eliminate because it requires information from outside the blockchain.

## L1-L2 MEV

Rollup sequencers have privileged ordering rights, analogous to L1 block builders. Current centralized sequencers (operated by Arbitrum, Optimism, Base teams) could extract MEV but generally don't — for now. As sequencers decentralize, MEV dynamics will emerge:

- **Sequencer MEV** — the sequencer can reorder L2 transactions for profit, just like an L1 builder
- **Cross-domain MEV** — a sequencer who also sees L1 state (or another L2's state) can execute atomic cross-domain arbitrage
- **Forced inclusion delays** — L2 transactions can be force-included via L1, creating timing games between L1 proposers and L2 sequencers

## Shared Sequencers

Shared sequencing is the most ambitious response to cross-chain MEV. The idea: multiple rollups use the same sequencer (or sequencer set), enabling atomic cross-rollup transactions.

Key projects:

- **Espresso Systems** — shared sequencer network providing ordering and data availability across rollups. Validators stake and earn fees for sequencing multiple chains.
- **Astria** — shared sequencer that decouples execution from ordering. Rollups plug in for decentralized sequencing without building their own validator sets.
- **Radius** — encrypted mempool shared sequencer, attempting to prevent the sequencer itself from extracting MEV.

If shared sequencers work, they could enable atomic cross-rollup composability — a swap on Arbitrum and a deposit on Base in one atomic bundle. This would internalize cross-chain MEV rather than leaking it to bridging intermediaries.

## SUAVE

SUAVE (Single Unified Auction for Value Expression) is Flashbots' vision for a chain-agnostic MEV infrastructure. Core concepts:

- **A separate chain** optimized for preference expression — users and searchers submit "preferences" (transaction intents, MEV bundles) to SUAVE rather than to individual chain mempools
- **Confidential computation** — SUAVE nodes run TEEs (Trusted Execution Environments) to process sensitive order flow without revealing it
- **Cross-chain block building** — builders on SUAVE can construct blocks for multiple chains simultaneously, capturing cross-domain MEV efficiently and redistributing it

SUAVE aims to be the universal MEV marketplace — a single venue where all chains' order flow competes. It's ambitious and still in development, but represents the most comprehensive attempt to solve cross-chain MEV at the infrastructure level.

## Intent-Based Architectures

Intents shift the paradigm: instead of submitting exact transactions, users express desired outcomes ("swap 1 ETH for at least 3000 USDC, any chain"). Solvers compete to fulfill intents, internalizing MEV as better execution.

- **Across** — cross-chain intent settlement using a competitive relayer market
- **UniswapX** — cross-chain swap intents with Dutch auction pricing
- **Socket/Bungee** — intent-based bridging aggregation

Intent systems don't eliminate MEV — they redirect it. Solvers still extract value, but competition forces them to return most of it to users as improved prices. The risk: solver centralization mirrors builder centralization.

## The Multi-Chain MEV Future

Cross-chain MEV will grow as activity fragments further. The question isn't whether it exists — it's who captures it and how it's distributed. Shared sequencers, SUAVE, and intent systems each offer partial solutions. The likely outcome is a layered market: intent systems for user-facing flow, shared sequencers for rollup composability, and SUAVE-like infrastructure for the global MEV auction.

_Last updated: 2026-02-15_
