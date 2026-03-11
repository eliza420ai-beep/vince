---
tags: [stablecoins, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

## USDC (Circle)

### How It Works

Circle issues USDC through a network of approved partners. Institutional users mint/redeem 1:1 via Circle's API with KYC. Retail users access via exchanges. Minting requires USD wire; redemption returns USD, typically T+1 for large amounts.

**Reserves:** Primarily short-dated US Treasuries and cash held at regulated US banks. Reserve reports published monthly by Deloitte (attestation, not full audit). Circle publishes detailed breakdowns: ~80% T-bills, ~20% cash deposits as of late 2024.

**Key characteristics:**

- US-regulated (registered MSB, pursuing various state licenses)
- Can and does blacklist addresses (OFAC compliance — froze ~$75M+ historically)
- Native on Ethereum, Solana, Avalanche, Base, Arbitrum, and others via CCTP
- Market cap fluctuated between $25-45B range (2024-2025)
- IPO filed (S-1) — moving toward public company transparency

### Attestation Model

Monthly reserve attestations by Deloitte confirm reserves ≥ circulating supply at a point in time. This is NOT a full audit — it doesn't examine controls, processes, or what happens between snapshot dates. Still, it's the most transparent major stablecoin.

## USDT (Tether)

### How It Works

Tether mints USDT for verified institutional clients (min $100K). Redemption similarly restricted. Retail accesses via secondary markets. This creates a two-tier system: authorized participants arbitrage the peg via direct minting/redemption.

**Reserves:** Tether shifted dramatically from commercial paper (peaked ~$30B in 2021) to US Treasuries. By 2024, Tether held $90B+ in T-bills, making it one of the largest T-bill holders globally. Also holds Bitcoin, gold, and secured loans.

**Key characteristics:**

- Domiciled in British Virgin Islands, regulated in El Salvador
- Market cap: $130-140B range (2025), ~3x USDC
- Dominant in emerging markets, CEX trading pairs, and OTC desks
- Can freeze addresses but historically less aggressive than Circle
- Quarterly attestations by BDO Italia (previously Deltec, MHA Cayman)

### The Audit Question

Tether has never completed a full independent audit. Their attestations confirm assets ≥ liabilities at a point in time but don't examine asset quality, liquidity, or counterparty risk in depth. The "Tether FUD" cycle is recurring: shorts build, FUD spreads, Tether processes redemptions, price recovers.

## Circle vs Tether: Key Differences

| Dimension         | USDC (Circle)                | USDT (Tether)                     |
| ----------------- | ---------------------------- | --------------------------------- |
| Jurisdiction      | US-regulated                 | BVI/El Salvador                   |
| Transparency      | Monthly Deloitte attestation | Quarterly BDO attestation         |
| Reserve quality   | T-bills + cash only          | T-bills + BTC + gold + loans      |
| Redemption access | Broader partner network      | Institutional only ($100K min)    |
| Censorship        | Active OFAC compliance       | Less aggressive freezing          |
| Market dominance  | #2 stablecoin                | #1 stablecoin by 3x               |
| Profitability     | Public financials (IPO)      | ~$6B+ profit/year (2024), private |

## How to Think About This

**USDC is the "compliant" stablecoin** — better for US-based DeFi, institutional use, and regulatory clarity. Its weakness: concentration in US banking (SVB incident proved this).

**USDT is the "global" stablecoin** — dominant liquidity, harder to regulate, more opaque. Its strength is also its risk: the system depends on trusting Tether's reserves without full audit verification.

**Neither is a "safe" dollar.** Both carry issuer risk, counterparty risk, and regulatory risk. The question is which risk profile matches your use case.

---

_Last updated: 2026-02-15_
