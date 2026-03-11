---
tags: [ai, crypto, agents]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Decentralized Inference Markets

_Last updated: 2026-02-15_

## Methodology & Framework

Decentralized inference is the attempt to move AI model execution off centralized servers and onto open networks. The core question: can you trustlessly verify that an AI model ran correctly and returned honest outputs? This is the "oracle problem for AI" — extending the same challenge DeFi faces with price feeds to the far more complex domain of neural network computation. Evaluate projects on: (1) cryptographic verification approach, (2) actual inference volume, (3) economic sustainability without token subsidies.

## The Oracle Problem for AI

Traditional oracles (Chainlink, Pyth) solve a relatively simple problem: fetching a price or data point and attesting to it. AI inference is orders of magnitude harder. A single LLM call involves billions of floating-point operations. You can't just hash the output and compare — the same model can produce different outputs due to temperature, batching, and hardware-level floating point variance.

This creates a fundamental tension: either you re-run the computation (expensive, defeats the purpose) or you develop novel cryptographic proofs that the computation was performed correctly.

## Key Projects

**Ritual** takes the infrastructure approach — a coprocessor network that lets smart contracts call AI models. Their key insight is that most on-chain use cases don't need full cryptographic proof of every inference. Instead, they use a combination of optimistic execution (assume honest, challenge if suspicious) and TEE (Trusted Execution Environment) attestations. Practical but relies on hardware trust assumptions. The protocol targets DeFi applications: risk scoring, dynamic parameters, intent resolution. Strongest when AI is a component of an on-chain action rather than the end product.

**Allora** builds a network of ML models that compete on prediction accuracy, creating a self-improving inference market. Their "topic" system lets anyone create prediction markets around specific questions, with models staking tokens on their outputs. Accuracy is measured against ground truth over time. The clever part: they don't need to verify the computation itself — they verify the _result_ against reality. Works well for forecasting, less applicable to generative AI where "correctness" is subjective.

**Morpheus** takes a more community-driven approach — a decentralized network matching AI agents with compute providers and users. Uses a staking model where compute providers bond tokens against service quality. More focused on access and routing than cryptographic verification. Think of it as a decentralized API gateway for AI, with economic incentives replacing trust.

## Proof of Inference Approaches

The verification spectrum runs from cheap-but-trust-dependent to expensive-but-trustless:

- **Optimistic verification**: Assume outputs are correct, allow challenge periods. Cheapest but relies on vigilant challengers and clear dispute resolution. Ritual leans here.
- **TEE attestation**: Run inference inside secure hardware enclaves (Intel SGX, AMD SEV). Hardware attests the code ran correctly. Practical today but trusts chip manufacturers — a single hardware vulnerability breaks the model.
- **ZK proofs of inference**: Generate a zero-knowledge proof that a neural network executed correctly. Mathematically trustless but currently 1000-10000x overhead for large models. Projects like EZKL and Modulus Labs are pushing boundaries, but proving a full LLM call remains impractical at scale.
- **Cryptoeconomic verification**: Stake-and-slash mechanisms where providers lose tokens for incorrect outputs. Requires detectable misbehavior, which is hard when outputs are probabilistic.

## What Actually Matters

The honest assessment: most real AI workloads don't need trustless verification. Enterprises use AWS/GCP and trust the provider. The use cases where decentralized inference genuinely adds value are narrow but real:

1. **Censorship-resistant AI** — models that can't be shut down or filtered by a single entity
2. **On-chain composability** — smart contracts that need AI outputs within the same trust model as the rest of DeFi
3. **Model marketplaces** — creators monetizing models without intermediaries taking 30%+ cuts

The market will likely bifurcate: practical projects using optimistic/TEE approaches capture near-term demand, while ZK-proof research plays the long game for eventual trustless verification. Watch for actual inference volume metrics, not just token price or partnership announcements. The projects processing real queries at sustainable unit economics will win.

## Related

- [Ai Crypto Overview](ai-crypto-overview.md)
- [Ai Crypto Risks](ai-crypto-risks.md)
- [Decentralized Compute](decentralized-compute.md)
- [Chain Abstraction Overview](../chain-abstraction/chain-abstraction-overview.md)
- [Cross Chain Bridges V2](../chain-abstraction/cross-chain-bridges-v2.md)
