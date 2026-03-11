---
tags: [intents, ux, cross-chain]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Cross-Chain Bridges V2

## The V1 Era: Lock-and-Mint

First-generation bridges followed a simple pattern: lock assets on the source chain, mint synthetic representations on the destination. Wrapped Bitcoin (WBTC), Multichain (formerly AnySwap), and Ronin Bridge all used variants of this model.

The security record was catastrophic. Ronin: $625M stolen via compromised validators. Wormhole: $320M from a signature verification bug. Multichain: $130M lost when the CEO's key access became a single point of failure. The pattern: lock-and-mint concentrates hundreds of millions in smart contracts or multisigs, creating honeypots that attract the most sophisticated attackers in crypto.

The capital inefficiency was equally problematic. Every wrapped asset is a synthetic with counterparty risk. Liquidity fragments across bridge-specific representations (USDC.e vs USDC.wh vs USDC.axl). And minting synthetics on N chains requires locking N× the capital.

## The V2 Shift: Intent-Based Bridges

Modern bridges flip the model. Instead of lock-and-mint, they use **liquidity networks** where professional relayers front capital on the destination chain and get repaid on the source. No synthetics, no wrapped tokens — users receive canonical assets.

### Across Protocol

Across pioneered the optimistic relayer model. When a user initiates a transfer, a relayer delivers canonical tokens on the destination within seconds, then submits a proof to Across's UMA-based optimistic oracle for reimbursement.

Key design choices:

- **Optimistic verification**: relayers are repaid after a dispute window unless challenged, minimizing on-chain verification costs
- **Canonical assets**: users receive real USDC/ETH, not bridge-specific synthetics
- **Single liquidity pool**: LPs deposit into a unified pool on Ethereum mainnet; relayers draw from destination-chain inventory and get repaid from the hub

Across has become the fastest bridge in most benchmarks (sub-minute fills) with zero exploits since launch. The tradeoff: reliance on UMA's optimistic oracle introduces a dispute window for relayer repayment, and the relayer set could theoretically centralize.

### deBridge

deBridge uses a delegated staking and slashing model with its own validator set. Validators stake collateral and attest to cross-chain messages; fraudulent attestations trigger slashing.

deBridge's DLN (Debridge Liquidity Network) layer implements intent-based fills: users create orders, market makers fill them on the destination, and settlement happens through deBridge's messaging layer. This separates the speed layer (instant market maker fills) from the security layer (validator attestations for settlement).

The architecture achieves both speed and security but introduces a trust assumption on the validator set's honesty and liveness.

### Stargate V2

Stargate, built on LayerZero, evolved significantly in V2. The original Stargate used a unified liquidity pool model with the Delta algorithm for rebalancing. V2 introduces:

- **AI-planned liquidity**: dynamic credit allocation across chains based on flow prediction
- **Hydra**: a batching mechanism that amortizes verification costs across multiple transactions
- **Bus rides**: users can opt for batched (cheaper, slower) or taxi (instant, premium) delivery

Stargate V2's credit-based system is clever — instead of physically moving liquidity, chains extend credit to each other based on predicted demand, settling net flows periodically. This dramatically improves capital efficiency.

## Security Tradeoffs Matrix

| Model                      | Trust Assumption      | Capital Efficiency | Exploit Surface                 |
| -------------------------- | --------------------- | ------------------ | ------------------------------- |
| Lock-and-mint              | Multisig/validators   | Low (1:1 lock)     | Smart contract + key management |
| Optimistic (Across)        | Oracle + dispute game | Medium             | Oracle manipulation             |
| Validator set (deBridge)   | Staked validators     | Medium-High        | Validator collusion             |
| Credit-based (Stargate V2) | LayerZero DVNs        | High               | DVN compromise                  |
| Intent-based (general)     | Solver solvency       | Highest            | Solver default risk             |

## Where It's Going

The trend is clear: bridges are becoming invisible infrastructure behind intent layers. Users won't "use a bridge" — they'll swap tokens or interact with dApps, and solver networks will route through whichever bridge offers the best speed/cost/security profile for that specific transfer. ERC-7683 (cross-chain intent standard) is the coordination layer making this composable.

_Last updated: 2026-02-15_

## Related

- [Account Abstraction](account-abstraction.md)
- [Chain Abstraction Overview](chain-abstraction-overview.md)
- [Intent Based Trading](intent-based-trading.md)
- [Defi Regulation Challenges](../regulation/defi-regulation-challenges.md)
- [Enforcement Case Studies](../regulation/enforcement-case-studies.md)
