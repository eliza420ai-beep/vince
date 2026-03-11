---
tags: [bitcoin, l2, scaling]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Bitcoin L2 Landscape

## The Scaling Problem

Bitcoin processes ~7 TPS with 10-minute block times. Its base layer optimizes for security and decentralization, deliberately sacrificing throughput. L2s exist to extend Bitcoin's capabilities without compromising L1 properties.

## Approaches by Category

### State Channels: Lightning Network

Lightning moves payments off-chain via bilateral payment channels linked into a network. Users lock BTC in 2-of-2 multisig, transact off-chain, and settle on L1 only when needed. **Trust model:** trustless (fraud proofs via timelocks). **Tradeoff:** optimized purely for payments; no programmability. Capacity sits around ~5,000 BTC with millions of channels. Dominant for BTC payments (Strike, Cash App, Wallet of Satoshi).

### Federated Sidechains: Liquid Network

Blockstream's Liquid uses a federation of ~65 functionaries who custody BTC in an 11-of-15 multisig. L-BTC is issued 1:1. Offers Confidential Transactions, ~2 minute blocks, and basic scripting. **Trust model:** federated — you trust the functionaries won't collude. **Sweet spot:** institutional trading, issuance (security tokens, stablecoins). Limited DeFi due to federation trust assumption.

### Smart Contract L2: Stacks

Stacks runs its own chain anchored to Bitcoin via Proof of Transfer (PoX). Miners spend BTC to mine STX blocks; every Stacks block hashes to Bitcoin. The **Nakamoto upgrade** (2024) gave Stacks Bitcoin finality and enabled **sBTC** — a decentralized, non-custodial BTC peg managed by a dynamic signer set. **Trust model:** open signer set with economic penalties, approaching trustless. Brings full smart contracts (Clarity language) to Bitcoin's security budget.

### Optimistic/ZK Verification: BitVM

BitVM (Robin Linus, 2023) enables arbitrary computation verification on Bitcoin without soft forks. It uses a challenge-response fraud proof protocol — a prover commits to a computation, and a verifier can challenge it on L1. **Trust model:** 1-of-n honest verifier assumption (trustless in practice). Primary use case: **trustless BTC bridges** to rollups and sidechains. Still early — BitVM2 simplifies the protocol but production deployments are nascent.

### Hybrid Rollups: BOB (Build on Bitcoin)

BOB is an Ethereum-aligned rollup that settles on Bitcoin. It uses an EVM execution environment with Bitcoin as DA/settlement layer, bridging via BitVM for trust-minimization. **Sweet spot:** bringing Ethereum's DeFi tooling to Bitcoin-secured infrastructure. Targets developers familiar with Solidity who want BTC exposure.

### ZK Rollups: Citrea

Citrea builds a ZK-rollup on Bitcoin, using zero-knowledge proofs to compress execution and verify state transitions on L1. BTC bridged via BitVM-based trust-minimized bridge. **Trust model:** approaching trustless via ZK proofs + BitVM verification. Most ambitious technically — requires inscribing proof data on Bitcoin and verifying within Script constraints.

## Landscape Summary

| Project   | Type                | Trust Model       | BTC Integration      | Maturity      |
| --------- | ------------------- | ----------------- | -------------------- | ------------- |
| Lightning | State channels      | Trustless         | Native               | Production    |
| Liquid    | Federated sidechain | Federated (11/15) | Federated peg        | Production    |
| Stacks    | Smart contract L1.5 | Open signer set   | sBTC (decentralized) | Production    |
| BitVM     | Verification layer  | 1-of-n honest     | Trustless bridge     | Early         |
| BOB       | EVM rollup          | BitVM-based       | Hybrid bridge        | Testnet/Early |
| Citrea    | ZK rollup           | ZK + BitVM        | Trust-minimized      | Early         |

## Key Insight

The Bitcoin L2 landscape is converging on BitVM as the missing piece for trustless bridging. Lightning won payments. The open question is whether Stacks/BOB/Citrea can win programmability without the federation compromises that limited Liquid's growth.

_Last updated: 2026-02-15_

## Related

- [Bitcoin Defi Thesis](bitcoin-defi-thesis.md)
- [Lightning Network](lightning-network.md)
- [Stacks Bitvm](stacks-bitvm.md)
- [Crypto Tax Frameworks](../regulation/crypto-tax-frameworks.md)
- [Defi Regulation Challenges](../regulation/defi-regulation-challenges.md)
