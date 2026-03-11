---
tags: [rwa, tokenization, institutional]
agents: [eliza]
last_reviewed: 2026-02-15
---

## The Six-Dimension RWA Evaluation Framework

### 1. Legal Structure

- **What legal entity holds the underlying asset?** (SPV, fund, trust, SPC)
- **What jurisdiction?** (BVI, Cayman, U.S., Singapore, Bermuda)
- **What regulatory exemption or registration?** (Reg D, Reg S, Form N-1A, MAS, UCITS)
- **What happens in bankruptcy?** Are assets ring-fenced from issuer insolvency?
- Best-in-class: SEC-registered funds (BENJI, WTGXX) or well-regulated SPVs with clear bankruptcy remoteness.

### 2. Custody

- **Who holds the underlying assets?** Name the custodian.
- **Is the custodian regulated and insured?** (BNY Mellon, CACEIS, JPMorgan > unnamed offshore entity)
- **Is there segregation of assets?** Client assets must be separate from issuer assets.
- Red flag: issuer self-custodies or uses an unregulated entity.

### 3. Oracle / NAV Methodology

- **How is NAV calculated?** Mark-to-market, amortized cost, or hybrid?
- **How often is NAV updated?** Real-time, daily, weekly?
- **Who calculates NAV?** Independent fund administrator vs. self-reported?
- **Is there an on-chain oracle?** How does on-chain price reflect off-chain NAV?

### 4. Redemption Mechanics

- **What is the redemption timeline?** Instant, T+0, T+1, T+3, or gated?
- **What is the redemption currency?** USDC, USD wire, other?
- **Are there redemption fees or gates?** Any conditions that limit withdrawal?
- **What is the minimum redemption amount?**
- Best-in-class: instant on-chain redemption to USDC (e.g., OUSG via BUIDL liquidity).

### 5. Compliance / Investor Eligibility

- **Who can hold the token?** KYC required? Whitelisted addresses only?
- **What investor qualification?** Qualified purchaser, accredited, retail?
- **Are transfers restricted?** Can tokens be freely transferred or only to whitelisted addresses?
- **AML/sanctions screening?** Ongoing monitoring or one-time onboarding?

### 6. DeFi Composability

- **How many chains is the token deployed on?**
- **Can the token be used as collateral in lending protocols?**
- **Is the token transferable on secondary markets (DEXs)?**
- **Does the token standard support DeFi integration (ERC-20, rebasing, etc.)?**
- Composability adds value but may conflict with compliance requirements.

---

_Last updated: 2026-02-15_
