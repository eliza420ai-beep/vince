---
tags: [bitcoin, l2, scaling]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Stacks & BitVM

## Stacks

### Architecture

Stacks is the most mature smart contract platform anchored to Bitcoin. It runs its own consensus (Proof of Transfer) where miners spend BTC to earn STX block rewards, creating a direct economic link to Bitcoin. Every Stacks transaction ultimately anchors to a Bitcoin block.

**Clarity** — Stacks' smart contract language — is decidable (no halting problem), interpreted (not compiled, so what you read is what executes), and designed to prevent common exploit classes (no reentrancy). Tradeoff: less flexible than Solidity, steeper learning curve, smaller developer pool.

### Nakamoto Upgrade

The Nakamoto upgrade (rolled out 2024) was transformative:

- **Bitcoin finality** — Stacks transactions become irreversible once their anchor Bitcoin block is finalized. Before Nakamoto, Stacks had its own fork possibility.
- **Fast blocks** — Block times dropped from ~10 min (tied to Bitcoin) to ~5 seconds via tenure-based mining.
- **MEV mitigation** — New mining algorithm prevents Bitcoin miners from cheaply winning Stacks blocks.

Post-Nakamoto, Stacks is arguably the most Bitcoin-aligned programmable layer. It doesn't just checkpoint to Bitcoin — it inherits Bitcoin's finality.

### sBTC

sBTC is the crown jewel: a decentralized, programmatic BTC peg.

- BTC is locked on L1 and sBTC is minted 1:1 on Stacks
- Managed by an **open, rotating signer set** (not a fixed federation like Liquid)
- Signers are incentivized via STX stacking rewards and subject to economic penalties
- Peg-out requests are processed by signers within a defined time window

**Trust model:** Threshold signature scheme with economic incentives. Not fully trustless (signers could theoretically collude) but significantly better than federated models. The signer set is permissionless — anyone meeting requirements can join.

**TVL/traction:** sBTC has attracted meaningful BTC deposits since launch, with DeFi protocols like ALEX, Arkadiko, and Velar building on top. The key metric to watch is sBTC TVL as a proxy for market trust in the peg.

### Stacks Ecosystem

- **ALEX** — DEX and launchpad, largest Stacks DeFi protocol
- **Arkadiko** — CDP stablecoin (USDA) backed by STX/sBTC
- **Velar** — DEX with concentrated liquidity
- **Gamma** — NFT marketplace (Ordinals + Stacks NFTs)
- **StackingDAO** — Liquid stacking for STX

## BitVM

### The Breakthrough

BitVM (Robin Linus, 2023) proved you can verify arbitrary computation on Bitcoin without consensus changes. This was widely considered impossible given Bitcoin Script's limitations.

**How it works:** A prover commits to a computation by publishing hashed gate values in a Bitcoin transaction. If the computation is wrong, a verifier can execute a fraud proof on-chain — a series of challenge-response transactions that ultimately penalize the dishonest prover. It's conceptually similar to optimistic rollups on Ethereum.

### BitVM2

BitVM2 simplified the original design:

- **Single-round fraud proofs** (original required multiple rounds)
- **Permissionless verification** — anyone can challenge, not just designated verifiers
- **1-of-n trust assumption** — only one honest verifier needed to keep the system secure

### Primary Use Case: Trustless BTC Bridges

BitVM's killer application is enabling **trustless bridges** from Bitcoin to L2s. Before BitVM, every BTC bridge required either a federation (Liquid, wBTC) or a centralized custodian. BitVM enables:

1. User deposits BTC into a BitVM contract
2. L2 mints equivalent BTC representation
3. Withdrawals are processed via fraud-proof-protected claims
4. If operator misbehaves, anyone can challenge and recover funds on L1

Projects building on BitVM: **BOB** (EVM rollup), **Citrea** (ZK rollup), **BitLayer**, **Merlin Chain**.

### Limitations

- **Capital efficiency** — operators must front liquidity for withdrawals (similar to optimistic rollup challenges)
- **Complexity** — fraud proof circuits are intricate; bugs could be catastrophic
- **On-chain footprint** — challenge transactions consume block space
- **Maturity** — still pre-production for most implementations

## Convergence Thesis

Stacks provides the **execution layer** (smart contracts, DeFi protocols). BitVM provides the **verification layer** (trustless bridging). Together, they could enable a BTC DeFi stack where:

- BTC moves trustlessly via BitVM bridges
- DeFi protocols run on Stacks (or EVM rollups like BOB)
- Bitcoin L1 serves as the settlement and security layer

The pieces are falling into place. The question is whether the market cares enough about BTC-native DeFi to choose these over Ethereum L2s with wrapped BTC.

_Last updated: 2026-02-15_

## Related

- [Bitcoin Defi Thesis](bitcoin-defi-thesis.md)
- [Bitcoin L2 Landscape](bitcoin-l2-landscape.md)
- [Lightning Network](lightning-network.md)
- [Cross Chain Mev](../mev/cross-chain-mev.md)
- [Mev Supply Chain](../mev/mev-supply-chain.md)
