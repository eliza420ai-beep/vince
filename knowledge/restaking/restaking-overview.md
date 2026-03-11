---
tags: [restaking, ethereum, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Restaking Overview

## What Is Restaking?

Restaking allows already-staked ETH (or LSTs like stETH) to be "re-pledged" as security for additional protocols beyond Ethereum's consensus layer. The core insight: Ethereum validators collectively secure ~$50B+ in staked ETH, but that security only protects Ethereum L1. Restaking lets other protocols tap into this economic security pool without bootstrapping their own validator sets from scratch.

## The Problem It Solves

Every new protocol needing cryptoeconomic security — oracles, bridges, data availability layers, keeper networks — historically had to either (a) launch its own token and convince validators to stake it, or (b) rely on multisigs. Option (a) fragments security and creates cold-start problems. Option (b) is centralized. Restaking offers option (c): borrow Ethereum's battle-tested security via opt-in delegation.

## EigenLayer's Shared Security Model

EigenLayer is the dominant restaking protocol, pioneered by Sreeram Kannan (University of Washington). The architecture has three roles:

- **Restakers** — ETH stakers who opt in by pointing their withdrawal credentials to EigenLayer contracts (native restaking) or depositing LSTs (liquid restaking). They earn additional yield but accept additional slashing conditions.
- **Operators** — Node operators who register on EigenLayer and run validation software for one or more AVSs. They receive delegated stake from restakers.
- **Actively Validated Services (AVSs)** — Protocols that consume shared security. Each AVS defines its own validation logic, reward structure, and slashing conditions. Examples: EigenDA (data availability), Omni Network (cross-chain messaging), Lagrange (ZK coprocessing).

## The AVS Model

An AVS is any system that requires distributed validation and wants to leverage restaked ETH rather than bootstrapping its own trust network. The AVS lifecycle:

1. AVS deploys smart contracts defining tasks, validation rules, and slashing conditions
2. Operators opt in to run the AVS's software
3. Restakers delegate to operators running their preferred AVSs
4. AVS pays rewards (tokens, fees) to operators and restakers
5. Misbehavior triggers slashing of the restaked ETH

This creates a **security marketplace**: AVSs compete for restaked capital by offering attractive rewards, while restakers evaluate risk/reward across available AVSs.

## How It Extends ETH Staking

Traditional ETH staking: ~3-4% APY for securing Ethereum consensus. Restaking adds incremental yield from AVS rewards on top. A restaker might earn base ETH staking yield + EigenDA rewards + Omni rewards, but each additional AVS adds marginal slashing risk. The capital remains the same ETH — it's the obligation set that expands.

## Current Scale

As of early 2025, EigenLayer held ~$10-15B in TVL across native restaking and LST deposits, making it one of the largest DeFi protocols by TVL. The number of registered AVSs has grown from EigenDA (the flagship) to dozens across data availability, interoperability, AI inference, and more. Operator count exceeds 200 registered entities.

The restaking thesis is essentially: Ethereum's security is underutilized, and a marketplace can efficiently allocate it. Whether the incremental yield justifies the compounding risk is the central debate — explored further in [restaking-risks.md](restaking-risks.md).

_Last updated: 2026-02-15_
