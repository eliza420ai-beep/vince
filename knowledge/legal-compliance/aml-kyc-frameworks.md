---
tags: [legal, compliance, regulation]
agents: [oracle, eliza]
last_reviewed: 2026-02-15
---

# AML/KYC Frameworks for Crypto

## KYC Tiers

### Tier 0 — No KYC (Decentralized Protocols)

Pure DeFi protocols with no custodial control generally fall outside VASP definitions. However, post-Tornado Cash (OFAC, 2022), even non-custodial interfaces face sanctions compliance obligations. The line is blurring — regulators increasingly argue that front-end operators and governance token holders may qualify as VASPs.

### Tier 1 — Basic KYC

- Name, date of birth, country of residence
- Government-issued ID (passport/national ID)
- Liveness check (selfie matching)
- Typical threshold: transactions < $1,000/day or $10,000/month
- Providers: Jumio, Onfido, Sumsub, Persona

### Tier 2 — Enhanced KYC

- All Tier 1 requirements plus proof of address (utility bill, bank statement < 3 months)
- Source of funds declaration
- PEP (Politically Exposed Person) and sanctions screening
- Required for: fiat on/off-ramps, higher transaction limits, institutional accounts

### Tier 3 — Enhanced Due Diligence (EDD)

- Triggered by: high-risk jurisdictions (FATF grey/black list), PEP status, unusual transaction patterns, large volumes
- Detailed source of wealth documentation
- Ongoing monitoring with manual review
- Senior management sign-off required

## The Travel Rule (FATF Recommendation 16)

The travel rule requires VASPs to share originator and beneficiary information for transfers exceeding applicable thresholds (USD/EUR 1,000 in most jurisdictions, $3,000 in the US). Implementation remains the single biggest operational challenge in crypto compliance.

**Technical solutions:**

- **TRISA** (Travel Rule Information Sharing Architecture) — open-source, decentralized protocol
- **Notabene** — commercial travel rule platform, broadest VASP network coverage
- **Sygna Bridge** — strong in APAC markets
- **OpenVASP** — open protocol backed by Swiss origins

**Challenges:** counterparty VASP identification (the "sunrise problem"), unhosted wallet transfers, jurisdictional threshold mismatches, and privacy-preserving compliance for self-custodial users.

## Privacy Coins & Regulatory Friction

Monero (XMR), Zcash (ZEC), and similar privacy-enhanced tokens create fundamental tension with AML requirements:

- **Japan, South Korea, Australia, Dubai** — effectively banned from licensed exchanges
- **EU (MiCA/AMLR)** — the 2024 AML Regulation prohibits anonymous crypto accounts; privacy coins face de-listing pressure
- **Chainalysis/CipherTrace** claim partial Monero tracing capability, but reliability is disputed
- **Practical approach:** most compliant platforms either de-list privacy coins entirely or restrict them to transparent transaction modes (e.g., Zcash t-addresses only)

## Transaction Monitoring

Effective AML programs require continuous transaction monitoring, not just onboarding KYC:

- **Rule-based alerts:** threshold triggers, rapid succession transactions, round-number patterns
- **Behavioral analytics:** deviation from established user patterns, dormant account activation
- **Blockchain analytics integration:** flag transactions touching sanctioned addresses, darknet markets, mixers, or high-risk entities (see defi-compliance-toolkit.md)
- **SAR filing:** Suspicious Activity Reports must be filed within mandated timeframes (FinCEN: 30 days in US; varies by jurisdiction)

## Practical Implementation Checklist

1. **Risk assessment** — document your project's ML/TF risk exposure before designing controls
2. **MLRO appointment** — designate a Money Laundering Reporting Officer (required in most jurisdictions)
3. **Written AML policy** — regulators expect documented procedures, not just tooling
4. **Staff training** — annual AML training with records retained
5. **Record retention** — 5 years minimum (7 years in some jurisdictions) for all KYC data and transaction records
6. **Independent audit** — annual AML program audit by external party

_Last updated: 2026-02-15_
