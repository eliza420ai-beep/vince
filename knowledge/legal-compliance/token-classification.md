---
tags: [legal, compliance, regulation]
agents: [oracle, eliza]
last_reviewed: 2026-02-15
---

# Token Classification

## The Three-Category Taxonomy

### Security Tokens

Tokens representing ownership, debt, equity, revenue share, or investment rights. Subject to securities laws — registration requirements, accredited investor restrictions, transfer limitations, and ongoing disclosure obligations.

**Triggers:** profit expectation from others' efforts, equity-like features, dividend mechanisms, buyback commitments, revenue sharing.

### Utility Tokens

Tokens providing access to a product, service, or network function. Not inherently securities, but classification depends heavily on timing (pre-launch vs. functional network) and marketing.

**Key distinction:** a utility token sold before the network is functional looks like a pre-sale investment contract regardless of intended utility.

### Commodity Tokens

Sufficiently decentralized tokens (primarily BTC and ETH per current US guidance) regulated as commodities under CFTC jurisdiction. Spot markets are lightly regulated; derivatives are heavily regulated.

## The Howey Test (US)

The SEC applies the 1946 _SEC v. W.J. Howey Co._ test to determine if a token is an "investment contract" (and therefore a security). All four prongs must be met:

1. **Investment of money** — fiat or crypto consideration (nearly always satisfied)
2. **Common enterprise** — horizontal commonality (pooled funds) or vertical commonality (investor returns tied to promoter efforts). Almost always met in token sales.
3. **Expectation of profits** — assessed from the buyer's perspective. Marketing emphasizing price appreciation, exchange listings, or returns is fatal. Buyback/burn mechanisms strongly suggest profit expectation.
4. **Derived from the efforts of others** — the critical prong. If the project team, foundation, or identifiable group drives value creation, this is met. Sufficient decentralization can negate this element.

### Sufficient Decentralization (Hinman Doctrine)

Former SEC Director William Hinman's 2018 speech suggested that a token can begin life as a security but transition to a non-security once the network is "sufficiently decentralized" — meaning no central group's efforts are the primary driver of value. This doctrine has never been formalized into regulation and was contested in _SEC v. Ripple_ litigation, but remains practically influential.

**Indicators of sufficient decentralization:** no single entity controls >20% of supply, multiple independent client implementations, community-driven governance, no expectation of information asymmetry from a core team.

## EU Classification Under MiCA

MiCA (Markets in Crypto-Assets Regulation, effective 2024-2025) creates three categories:

- **E-money tokens (EMTs)** — stablecoins pegged to fiat currency. Require e-money institution license.
- **Asset-referenced tokens (ARTs)** — stablecoins pegged to baskets, commodities, or multiple assets. Require specific authorization and reserve requirements.
- **Other crypto-assets** — everything else, including utility tokens. Lighter regime with whitepaper requirements but no authorization needed for issuance.

**Important:** MiCA explicitly excludes tokens qualifying as financial instruments under MiFID II — those remain under existing securities regulation.

## Regulatory Safe Harbors

### SEC Commissioner Peirce's Token Safe Harbor (Proposed, Not Adopted)

Proposed a 3-year grace period for token projects to achieve decentralization before securities classification applies. Required: good-faith decentralization plan, semi-annual disclosures, no liquidity on registered securities exchanges. Never adopted but remains influential in policy discussions.

### Regulation A+ / Regulation D

US projects can issue security tokens under existing exemptions:

- **Reg D (506c)** — accredited investors only, no SEC registration, 12-month lockup
- **Reg A+** — up to $75M raise, non-accredited investors permitted, SEC qualification required (Tier 2)
- **Reg S** — offshore offering exclusion, no US person participation
- **Reg CF** — crowdfunding up to $5M, broad investor access

## Practical Classification Checklist

1. Is there a functional network at time of token distribution? (If no → high security risk)
2. Does the token grant consumptive utility independent of price? (If no → security indicator)
3. Is value primarily driven by an identifiable team? (If yes → security indicator)
4. Are purchasers motivated by profit expectation? (Review all marketing materials critically)
5. Does the token have equity-like features (dividends, governance over treasury, buybacks)?

When in doubt, treat as a security and use applicable exemptions. The cost of securities compliance is far less than enforcement defense.

_Last updated: 2026-02-15_
