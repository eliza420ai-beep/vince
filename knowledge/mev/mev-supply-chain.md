---
tags: [mev, trading, ethereum]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# MEV Supply Chain

## The Pre-PBS World

Before PBS, validators did everything: received transactions, ordered them, built blocks, and proposed them. Sophisticated validators could extract MEV directly; unsophisticated ones couldn't. This created centralizing pressure — validators with MEV capabilities earned more, compounding their stake advantage. Flashbots emerged in 2020 to address this by creating a structured MEV marketplace.

## Proposer-Builder Separation (PBS)

PBS splits block production into two roles:

- **Proposers** (validators) — have the right to propose a block but don't build it. They simply accept the highest-value block offered.
- **Builders** — construct optimized blocks by combining searcher bundles, private order flow, and public mempool transactions. They bid for the right to have their block proposed.

This separation is crucial: it lets validators earn MEV revenue without running complex MEV strategies themselves, democratizing access to MEV profits across the validator set.

## MEV-Boost

MEV-Boost is Flashbots' out-of-protocol implementation of PBS for Ethereum. It works as middleware between validators and builders:

1. Builders construct blocks and submit them to **relays**
2. Relays validate blocks, ensure builders can pay, and forward block headers to proposers
3. Proposers select the highest-bid header and sign it
4. The relay reveals the full block body

As of 2025, ~90% of Ethereum blocks are built through MEV-Boost. This is both a success (validators earn more, MEV is distributed) and a concern (extreme reliance on a small number of relays and builders).

## The Builder Market

Block building has consolidated aggressively. A handful of builders (historically: Flashbots, BeaverBuild, Titan, rsync) produce the vast majority of blocks. Why? Network effects and exclusive order flow:

- **Exclusive order flow (EOF)** — searchers and applications route transactions directly to preferred builders, bypassing the public mempool. A builder with more EOF can construct more valuable blocks, winning more auctions, attracting more EOF. This is a flywheel.
- **Latency advantages** — builders closer to relays and with faster simulation infrastructure win ties.
- **Vertical integration** — some builders also run searcher strategies, capturing more of the MEV stack.

Builder centralization is arguably the most pressing structural risk in Ethereum today. A dominant builder could censor transactions, extract additional rents, or become a regulatory chokepoint.

## Order Flow Auctions (OFAs)

OFAs attempt to return MEV to its source — the user. Instead of broadcasting transactions to the public mempool (where searchers extract value), users send transactions to an OFA, which auctions the right to execute against that order flow. The auction revenue flows back to the user as improved execution.

Key OFA implementations:

- **MEV Blocker** (Flashbots/CoW) — users submit transactions; searchers bid to backrun them; refunds go to users.
- **MEV Share** (Flashbots) — programmable MEV redistribution. Searchers get hints about pending transactions and bid for access. Configurable split between user, searcher, and builder.
- **UniswapX** — an OFA for swap order flow specifically. Fillers compete to give users the best execution, internalizing MEV into better prices.

## Relays

Relays are the trusted intermediaries in MEV-Boost. They verify builder blocks, hold them in escrow, and reveal them only after the proposer commits. Relay trust is a known weak point — a malicious relay could steal MEV or enable proposer-builder collusion. Efforts toward **enshrined PBS** (ePBS) aim to move this trust into the protocol itself.

## Centralization Concerns

The MEV supply chain creates multiple centralization vectors:

- **Builder dominance** — 2-3 builders producing 80%+ of blocks
- **Relay concentration** — most blocks flow through a small number of relays
- **EOF as moat** — exclusive order flow deals entrench incumbent builders
- **Censorship risk** — OFAC-compliant relays/builders have filtered transactions (notably Tornado Cash), demonstrating that the MEV supply chain is a censorship surface

The community response includes ePBS proposals, inclusion lists (forcing builders to include certain transactions), FOCIL (Fork-Choice Enforced Inclusion Lists), and encrypted mempools. None are deployed yet. The tension between efficiency (specialized builders) and decentralization (anyone can build blocks) remains unresolved.

_Last updated: 2026-02-15_
