---
tags: [solana, l1, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Jupiter: Solana's Aggregation Super-App

## Product Suite

### Swap Aggregation (Core)

Jupiter routes across 20+ Solana DEXs (Raydium, Orca, Meteora, Phoenix, Lifinity, etc.) to find optimal execution paths. Multi-hop routing, split orders, and dynamic slippage protection are standard. Jupiter handles 70-80% of Solana's DEX volume by routing — making it the de facto swap infrastructure. The Metis routing engine (v3) introduced improved path-finding algorithms.

### Limit Orders

On-chain limit orders that execute when market price hits the target. Unlike CEX limit orders, these are filled by keepers monitoring Jupiter's order book. Execution depends on available liquidity and keeper activity. Useful for users who want to set-and-forget entries/exits without monitoring.

### DCA (Dollar-Cost Averaging)

Automated recurring buys over configurable time periods. Users deposit USDC/SOL and set parameters (buy X token, every Y minutes/hours/days, for Z total). Smart contract executes swaps via Jupiter routing at each interval. Simple but powerful product for passive accumulation.

### Perpetual Futures

Jupiter Perps launched as an oracle-based perpetual exchange offering up to 100x leverage on SOL, ETH, BTC, and other pairs. The model uses a JLP (Jupiter Liquidity Pool) as counterparty — LPs provide liquidity and earn trading fees + trader losses, while bearing the risk of trader profits. JLP has attracted $500M-1B+ in TVL, offering attractive yields from fee revenue.

The perps product competes with Drift Protocol and centralized venues. Volume has grown substantially but remains a fraction of total Solana spot volume.

### LFG Launchpad

Jupiter's token launch platform where JUP holders vote on which projects get to launch. LFG (a nod to crypto culture) provides:

- Community-vetted token launches with JUP voter governance
- Fair launch mechanics with dynamic pricing
- Immediate Jupiter routing integration post-launch
- Built-in community distribution through voter incentives

Notable launches include WEN, JUP itself, and various ecosystem projects. The launchpad creates a flywheel: JUP holders get early access → demand for JUP governance rights → token value support.

## JUP Token

JUP serves as the governance token with voting rights over: launchpad project selection, protocol fee parameters, treasury allocation, and Active Staking Rewards (ASR). ASR distributes protocol revenue to JUP stakers who actively participate in governance votes — creating a "vote-to-earn" dynamic that incentivizes engaged governance rather than passive holding.

Supply: 10B total, with significant community allocation. Multiple airdrop rounds distributed tokens broadly across Solana users.

## Competitive Position

Jupiter's moat is multi-layered: (1) routing algorithm quality + liquidity source integrations, (2) brand recognition as Solana's default swap interface, (3) SDK adoption by wallets and bots (Phantom, Solflare, trading bots all use Jupiter API), (4) expanding product suite creating an ecosystem rather than single product. The primary risk is disintermediation — if wallets build native routing or DEXs capture more direct traffic.

_Last updated: 2026-02-15_
