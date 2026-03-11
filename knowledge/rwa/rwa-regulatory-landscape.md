---
tags: [rwa, tokenization, institutional]
agents: [eliza]
last_reviewed: 2026-02-15
---

# RWA Regulatory Landscape

_Last updated: 2026-02-15_

## United States — SEC

The SEC's position has been consistent: **most tokenized real-world assets are securities.** Putting a Treasury bill, a loan, or a revenue share on-chain doesn't change its legal nature. The Howey test applies regardless of the technology layer.

Practical implications:

- **Tokenized Treasuries** (Ondo, Franklin Templeton's BENJI) operate under existing fund structures — registered investment companies or Reg D/S exemptions. The token is a share in a fund, not a direct Treasury claim.
- **Tokenized private credit** falls under securities law. Platforms must either register offerings or use exemptions (Reg D for accredited investors, Reg S for offshore). Most chose Reg D, limiting participation to accredited investors and capping liquidity.
- **Transfer restrictions** are enforced at the smart contract level — whitelisted addresses only. This creates "permissioned DeFi," a contradiction in terms that nonetheless satisfies regulators.

The SEC's 2024-2025 enforcement actions solidified a pattern: tokenize all you want, but comply with securities law or face consequences. No special treatment for blockchain-native issuance.

## European Union — MiCA

The Markets in Crypto-Assets Regulation (MiCA), fully effective since December 2024, creates the first comprehensive framework for crypto assets in a major jurisdiction.

For RWAs specifically:

- **Asset-referenced tokens** (ARTs) — tokens backed by real assets — require authorization as an issuer, a white paper, and reserve requirements. This covers many tokenized RWA structures.
- **Security tokens** fall outside MiCA and under existing MiFID II / Prospectus Regulation. Tokenized bonds, equities, and fund shares are simply securities delivered via DLT.
- The **DLT Pilot Regime** (operational since 2023) allows regulated venues to trade and settle tokenized securities on distributed ledgers, with temporary exemptions from certain CSD requirements.

MiCA's strength is clarity. Its weakness is complexity — navigating which regime applies (MiCA vs MiFID II vs E-Money Directive) requires serious legal analysis for each token structure.

## Singapore — MAS

Singapore's approach is pragmatic and sandbox-friendly. The Monetary Authority of Singapore (MAS) treats tokenized securities under the existing Securities and Futures Act — same rules, new rails.

Key features:

- **Project Guardian** — MAS-led initiative testing tokenized bonds, FX, and asset management across institutional participants (DBS, JPMorgan, SBI). Results fed directly into regulatory guidance.
- Licensed capital markets intermediaries can deal in tokenized securities without additional licensing, provided the underlying activity is already covered.
- Relatively permissive on cross-border flows, making Singapore a hub for Asia-Pacific tokenized asset issuance.

## Switzerland — FINMA

Switzerland moved earliest with the **DLT Act** (2021), creating a legal basis for tokenized securities ("ledger-based securities" or Registerwertrechte) that are legally equivalent to traditional securities.

Key innovations:

- Tokenized securities can be created, transferred, and pledged directly on a blockchain without intermediaries — a genuine legal breakthrough.
- The DLT trading facility license allows platforms to combine trading, clearing, and settlement — functions traditionally separated.
- SIX Digital Exchange (SDX) operates under this framework, offering institutional-grade tokenized security trading.

## Custody — The Unsolved Problem

Across all jurisdictions, custody remains the critical challenge. For tokenized Treasuries, someone must custody the actual Treasury bills. For tokenized real estate, legal title must be enforceable. The token represents ownership, but **legal enforceability depends on off-chain structures** — trusts, SPVs, custodial agreements.

Qualified custodians (in SEC parlance) or regulated depositaries (MiCA) must hold underlying assets. This creates a bottleneck: decentralized token transfer, centralized custody. The gap between token movement speed and legal settlement speed creates regulatory and operational risk.

## What Matters for Traders

Regulatory regime determines **who can access what.** US-based tokenized Treasuries are mostly accredited-investor-only. EU offerings under the DLT Pilot Regime have broader access but geographic limits. Singapore and Swiss frameworks offer the most flexibility for institutional structures.

Watch for **regulatory convergence** — as MiCA sets the standard, other jurisdictions adapt. And always verify: does the token grant **legal ownership** of the underlying asset, or merely a contractual claim against an issuer? The distinction matters enormously in bankruptcy.
