---
tags: [intents, ux, cross-chain]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Intent-Based Trading

## The Intent Primitive

Traditional DEX trading is imperative: the user specifies exact execution steps — approve token, call swap function, set slippage, choose pool. Intent-based trading inverts this. The user declares an outcome ("I want at least 2000 USDC for my 1 ETH within 10 minutes") and a network of **solvers** competes to fulfill it.

This is a fundamental architectural shift. The user signs an off-chain message (the intent), solvers evaluate it, and the winning solver executes on-chain. The user gets better prices because solvers internalize MEV instead of leaking it to block builders. Solvers profit from the spread between what the user accepts and what the market offers.

## UniswapX

UniswapX is Uniswap's intent layer, launched in 2023 and now handling significant volume. Users sign an order specifying input/output tokens and a **Dutch auction** decay curve — the price starts favorable to the solver and decays toward the user's limit. First solver to fill wins.

Key mechanics:

- **Dutch auction pricing**: eliminates the need for users to set slippage; the market discovers the fair price
- **Exclusive fillers**: a time window where one solver has priority, incentivizing tighter quotes
- **Cross-chain UniswapX**: extends intents across chains — user signs on origin, solver fills on destination, settlement happens via bridge escrow

The cross-chain extension is significant. It turns UniswapX from a DEX aggregator into a cross-chain swap protocol where the user never bridges manually. The solver handles routing, bridging, and execution risk.

## CoW Protocol

CoW (Coincidence of Wants) Protocol pioneered batch auctions for intent settlement. Instead of filling orders individually, CoW batches orders together and finds **peer-to-peer matches** before routing remaining volume to on-chain liquidity.

The batch auction model has unique properties:

- **Uniform clearing prices**: all trades in a batch get the same price, eliminating ordering advantages
- **Coincidence of Wants**: if Alice sells ETH for USDC and Bob sells USDC for ETH, they trade directly — zero LP fees, zero slippage
- **Solver competition**: solvers submit complete batch solutions; the protocol picks the solution maximizing trader surplus

CoW's MEV protection is structural, not bolted on. Because orders are batched and settled at uniform prices, sandwich attacks become impossible — there's no sequential ordering to exploit. The protocol has processed over $50B in volume, validating the model.

## 1inch Fusion

1inch Fusion combines intent-based execution with 1inch's existing aggregation engine. Users sign Fusion orders; a network of **resolvers** (1inch's term for solvers) fills them using Dutch auction pricing similar to UniswapX.

Fusion's differentiator is resolver staking and reputation. Resolvers stake 1INCH tokens and earn priority based on performance metrics — fill rate, speed, price improvement. This creates a credible commitment mechanism: bad resolvers lose stake, good resolvers earn more order flow.

The Fusion+ extension adds cross-chain capability using atomic swaps with hash time-locked contracts (HTLCs), avoiding reliance on external bridges for settlement.

## The Bigger Picture

Intent-based trading is converging with chain abstraction. When users express intents rather than transactions, the execution layer can optimize across all available chains and liquidity sources without user involvement. The combination of intents + account abstraction + chain abstraction = users who just say what they want and get it, regardless of which chain it happens on.

Open questions remain: solver centralization risk (few sophisticated solvers dominating flow), intent expressiveness limits (complex multi-step DeFi strategies are hard to express as single intents), and cross-chain settlement security (who guarantees the solver actually filled on the destination chain?).

_Last updated: 2026-02-15_

## Related

- [Account Abstraction](account-abstraction.md)
- [Chain Abstraction Overview](chain-abstraction-overview.md)
- [Cross Chain Bridges V2](cross-chain-bridges-v2.md)
- [Cross Chain Mev](../mev/cross-chain-mev.md)
- [Mev Overview](../mev/mev-overview.md)
