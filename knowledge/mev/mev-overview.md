---
tags: [mev, trading, ethereum]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# MEV Overview

## What Is MEV?

Maximal Extractable Value (originally "Miner Extractable Value") is the profit a block producer — or anyone who can influence transaction ordering — can extract by including, excluding, or reordering transactions within a block. On Ethereum post-Merge, validators replaced miners, but the dynamic persists: whoever controls ordering controls value.

MEV exists because blockchain state transitions are deterministic and the mempool is (by default) public. If you can see a pending transaction and predict its state impact, you can craft a transaction that profits from that knowledge.

## Extraction Methods

### Frontrunning

The simplest form. A searcher spots a profitable pending transaction (e.g., a large DEX swap) and submits an identical or similar transaction with higher gas, executing first. The frontrunner captures the price impact the original user would have received.

### Sandwich Attacks

A refinement of frontrunning. The attacker places one transaction _before_ the victim's swap (buying the asset, pushing the price up) and one _after_ (selling into the inflated price). The victim gets worse execution; the attacker pockets the spread. Sandwich attacks are the most visible and controversial form of MEV — they directly harm retail users.

### Backrunning

The opposite of frontrunning: the searcher places a transaction _immediately after_ a state-changing event. The canonical example is DEX arbitrage — a large swap moves a pool's price away from the global market price, and a backrunner rebalances it for profit. Backrunning is generally considered benign or even beneficial: it corrects price dislocations and improves market efficiency.

### Liquidations

In lending protocols (Aave, Compound, Maker), undercollateralized positions can be liquidated by anyone. Searchers compete to be the first to call the liquidation function, earning the liquidation bonus. This is pure backrunning on oracle price updates — when a price feed updates and a position becomes unhealthy, the race begins.

### JIT Liquidity

Just-In-Time liquidity provision: a searcher sees a large incoming swap, adds concentrated liquidity to the exact tick range, earns the swap fees, then removes the liquidity in the same block. The original LPs earn nothing from that trade. Controversial because it extracts value from passive LPs.

## Who Captures MEV?

The MEV supply chain has distinct roles:

- **Searchers** — the strategists. They monitor mempools, run simulations, and construct profitable transaction bundles. Highly competitive, technically sophisticated, often anonymous.
- **Builders** — assemble full blocks from searcher bundles and ordinary transactions, optimizing for total block value. Post-PBS, this is a specialized market.
- **Validators/Proposers** — ultimately decide which block gets proposed. Under MEV-Boost, they accept the highest-bidding builder's block, capturing MEV as a proposer payment.
- **Protocols** — some protocols now internalize MEV (e.g., Uniswap v4 hooks, CoW Protocol batch auctions). This is the frontier of MEV redistribution.

## Scale

MEV on Ethereum alone has exceeded $600M+ in cumulative extracted value since 2020 (per Flashbots data). The real number is higher — much MEV is invisible (private order flow, CEX-DEX arbitrage settled off-chain). On L2s and alt-L1s, MEV is growing as DeFi activity migrates.

## Why It Matters

MEV is an invisible tax on users. Every swap, every loan, every NFT mint is potentially subject to extraction. Understanding MEV isn't optional for anyone building, investing, or transacting onchain — it's the cost of doing business in a transparent execution environment, and the battle to minimize, redirect, or democratize it is one of crypto's most important ongoing fights.

_Last updated: 2026-02-15_
