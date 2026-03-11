---
tags: [solana, l1, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# MEV on Solana: Jito & the Extraction Economy

## How Solana MEV Works

Unlike Ethereum's PBS (Proposer-Builder Separation) model with discrete block auctions, Solana's continuous block production means the current leader validator has real-time control over transaction ordering. This creates MEV opportunities through:

**Transaction Ordering:** The leader can reorder transactions within their slots. Jito's Block Engine provides an off-chain marketplace where searchers submit bundles (ordered sets of transactions) with tips to be included in specific positions.

**Bundle Auctions:** Searchers compete by attaching SOL tips to their bundles. The Block Engine runs a first-price auction — highest tip wins inclusion. Tips flow to validators (and by extension, to Jito liquid staking holders). Daily tip volume has ranged from 1,000-10,000+ SOL during active periods, with extreme spikes during memecoin frenzies.

**Sandwich Attacks:** The most contentious MEV form on Solana. A searcher detects a pending swap, places a buy order before it (front-run) and a sell order after (back-run), extracting value from the user's price impact. Solana's speed makes sandwiching technically challenging but highly profitable when executed. The removal of Jito's pseudo-mempool pushed sandwich operations to private channels and direct validator relationships.

## Jito's Infrastructure Stack

- **Jito Block Engine:** Off-chain system that validators opt into. Receives bundles from searchers, auctions ordering priority, and delivers optimized blocks to the leader.
- **Jito Bundles:** Atomic transaction packages. If any transaction in the bundle fails, all revert. This enables risk-free arbitrage execution.
- **Jito Tips:** SOL payments from searchers to validators. Tips are distributed proportionally to stake, meaning jitoSOL holders benefit from MEV revenue.
- **Jito-Solana Client:** Modified Solana validator client that integrates with the Block Engine. Run by ~90%+ of stake-weighted validators.

## Validator Economics

A validator running Jito infrastructure earns: base staking rewards (~6-7% APY) + MEV tips (variable, 1-3%+ additional). This creates strong economic incentives for Jito adoption, explaining its near-universal deployment. Validators not running Jito earn less, creating a soft centralization pressure.

## User Impact & Mitigation

Users lose value through sandwich attacks, failed transaction fees (during congestion), and suboptimal execution. Mitigations include:

- **Jupiter's MEV protection:** Routes through private submission channels to reduce sandwich exposure
- **Priority fees:** Users can bid for faster inclusion, but this creates a fee auction dynamic
- **Jito tip-based submission:** Users/protocols can submit bundles directly, bypassing public transaction flow

The MEV landscape remains contentious — it improves validator economics and network efficiency (arbitrage) while simultaneously extracting value from retail users (sandwiches). The balance between these forces is Solana's central MEV challenge.

_Last updated: 2026-02-15_
