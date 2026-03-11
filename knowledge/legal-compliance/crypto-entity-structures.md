---
tags: [legal, compliance, regulation]
agents: [oracle, eliza]
last_reviewed: 2026-02-15
---

# Crypto Entity Structures

## Core Entity Types

### LLC (Limited Liability Company)

The US LLC (particularly Wyoming and Delaware) remains the default for early-stage crypto projects. Wyoming's DAO LLC legislation (2021) formally recognizes DAOs as LLCs, providing member liability protection while allowing on-chain governance. Delaware offers superior case law and Series LLC options for isolating assets across sub-projects. Key limitation: US nexus triggers SEC/CFTC jurisdiction and complex tax reporting (FATCA/CRS).

### Foundation (Cayman, Swiss, Singapore)

Foundations serve as the "stewardship" layer for decentralized protocols. The **Cayman Foundation Company** is the current gold standard — no beneficial owners, can act in its own interest, and compatible with token treasury management. Swiss foundations (Stiftung) offer credibility but require FINMA engagement for anything touching tokens. Singapore foundations are cost-effective but increasingly scrutinized by MAS post-TerraLuna.

**Typical foundation responsibilities:** hold IP, manage treasury, fund grants, govern protocol upgrades, engage with regulators.

### DAO Wrappers

Unwrapped DAOs face unlimited joint liability for all members — the ooki DAO enforcement action (CFTC, 2022) confirmed this. Wrapper options:

- **Wyoming DAO LLC** — simplest, but US-domiciled
- **Marshall Islands DAO LLC** — offshore alternative with explicit DAO recognition (2022 legislation)
- **Cayman Foundation + DAO** — foundation acts as legal personality, DAO governs via advisory/director powers
- **UNA (Unincorporated Nonprofit Association)** — lightweight, used by some US DAOs, but untested in court for token projects

### Offshore Structures

**BVI Business Companies** remain popular for token SPVs and holding companies — no corporate tax, minimal reporting, fast incorporation. **Panama** offers strong privacy but weak international reputation. **Dubai/ADGM** has emerged as a serious contender with VARA licensing providing regulatory clarity for virtual asset service providers. **Bermuda** pioneered the Digital Asset Business Act, offering a clear licensing path.

## Multi-Entity Stack (Best Practice)

Most serious projects deploy a **three-entity minimum**:

1. **Operating Company** (US/EU) — employs developers, handles fiat, interfaces with traditional finance
2. **Foundation** (Cayman/Swiss) — holds protocol IP, manages token treasury, issues grants
3. **Token SPV** (BVI/Cayman) — isolates token issuance liability, handles TGE mechanics

Optional additions: a **Labs entity** for R&D (often Singapore or Switzerland), and a **DAO wrapper** for on-chain governance legitimacy.

## Jurisdictional Selection Criteria

| Factor                 | Wyoming | Cayman | Switzerland | Singapore | BVI  | Dubai  |
| ---------------------- | ------- | ------ | ----------- | --------- | ---- | ------ |
| Token issuance clarity | Medium  | High   | High        | Medium    | High | High   |
| Banking access         | High    | Medium | High        | High      | Low  | Medium |
| Tax efficiency         | Medium  | High   | Low         | Medium    | High | High   |
| Regulatory maturity    | Medium  | High   | High        | High      | Low  | Medium |
| DAO compatibility      | High    | Medium | Low         | Low       | Low  | Low    |

## Key Considerations

- **Substance requirements** are tightening everywhere — Cayman and BVI now require local directors, offices, and decision-making presence
- **MiCA (EU)** effective 2024-2025 creates a unified licensing framework; consider EU entity if targeting European users
- **US persons** in the cap table or user base dramatically increase compliance burden regardless of entity jurisdiction
- Always obtain jurisdiction-specific legal opinions before token issuance — regulatory letters from local counsel are table stakes for exchange listings

_Last updated: 2026-02-15_
