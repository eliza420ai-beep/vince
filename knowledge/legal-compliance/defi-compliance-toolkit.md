---
tags: [legal, compliance, regulation]
agents: [oracle, eliza]
last_reviewed: 2026-02-15
---

# DeFi Compliance Toolkit

## Blockchain Analytics Platforms

### Chainalysis

The industry leader with the broadest coverage. Key products:

- **Chainalysis Reactor** — investigation tool for tracing fund flows across chains, clustering addresses, and visualizing transaction networks
- **Chainalysis KYT (Know Your Transaction)** — real-time transaction monitoring API, assigns risk scores (low/medium/high/severe), flags exposure to sanctioned entities, darknet markets, ransomware, mixers
- **Chainalysis Sanctions Oracle** — free on-chain smart contract (Ethereum) that returns whether an address is sanctioned. Used by Aave, Uniswap front-end, and others

**Coverage:** 30+ blockchains including Bitcoin, Ethereum, Solana, Tron, BSC. Limited privacy coin support (claims partial Monero tracing).

### TRM Labs

Strong competitor with emphasis on DeFi-native compliance:

- **TRM Forensics** — cross-chain investigation with DeFi protocol decoding (understands LP positions, yield farming flows)
- **TRM Transaction Monitoring** — API-based, real-time screening with configurable risk thresholds
- **TRM Wallet Screening** — bulk address screening for sanctions, terrorism financing, fraud typologies

**Differentiator:** superior DeFi protocol coverage and cross-chain bridge tracing. Preferred by several major DeFi protocols.

### Other Notable Tools

- **Elliptic** — strong in regulatory/institutional markets, Elliptic Lens for wallet screening
- **Arkham Intelligence** — entity attribution and on-chain intelligence, more investigative than compliance
- **Nansen** — primarily analytics/alpha, but entity labels useful for compliance context
- **Breadcrumbs** — accessible investigation tool for smaller teams

## OFAC Sanctions Compliance

The Office of Foreign Assets Control (US Treasury) maintains the **SDN List** (Specially Designated Nationals) which includes blockchain addresses. Compliance is **strict liability** — intent is irrelevant.

**Key sanctioned entities with on-chain footprint:**

- Tornado Cash (August 2022 designation, partially overturned by _Van Loon v. Treasury_ 2024 — immutable smart contracts may not be "property," but the front-end and TORN token remain sanctioned)
- Lazarus Group (North Korea) — associated addresses regularly updated
- Various ransomware-affiliated wallets

**Compliance approach:**

1. Screen all interacting addresses against OFAC SDN list before processing transactions
2. Use Chainalysis Sanctions Oracle or TRM API for real-time checks
3. Block sanctioned addresses at the front-end/API level
4. Maintain logs of all screening activity and blocked interactions
5. File voluntary self-disclosures if sanctioned exposure is discovered retroactively

## Front-End Blocking

Since DeFi smart contracts are immutable and permissionless, compliance enforcement happens at the **front-end layer** — the hosted web interface users interact with:

- **IP-based geoblocking** — restrict access from sanctioned jurisdictions (DPRK, Iran, Syria, Cuba, Crimea/Donetsk/Luhansk). Use MaxMind GeoIP or Cloudflare country rules. Not foolproof (VPNs) but demonstrates good faith.
- **Wallet screening on connect** — when a user connects their wallet, screen the address via Chainalysis/TRM API before enabling transactions. Block or flag high-risk addresses.
- **Terms of Service** — explicitly prohibit sanctioned jurisdiction access and sanctioned person usage. Required for legal defensibility.
- **VPN detection** — services like IPQualityScore or Cloudflare bot management can flag VPN/proxy usage from blocked regions.

**Implementation pattern:**

```
User connects wallet → API call to screening service →
  If SANCTIONED → block + log
  If HIGH_RISK → flag for review, optionally restrict
  If CLEAN → proceed
```

## Compliance Stack Recommendations

**Minimum viable compliance (small DeFi project):**

- Chainalysis Sanctions Oracle (free, on-chain)
- Cloudflare geoblocking for sanctioned jurisdictions
- Clear Terms of Service with jurisdiction restrictions

**Production compliance (growth-stage protocol):**

- TRM Labs or Chainalysis KYT API integration
- Wallet screening on connect with risk scoring
- IP geoblocking + VPN detection
- Incident response plan for sanctions exposure
- Quarterly compliance reviews with external counsel

**Enterprise compliance (major protocol/exchange):**

- Full Chainalysis Reactor + KYT deployment
- Dedicated compliance team with MLRO
- Real-time transaction monitoring with automated SAR workflows
- Regular independent audits
- Regulatory engagement program

## Emerging Challenges

- **Cross-chain bridges** make tracing increasingly difficult — analytics tools are catching up but coverage is inconsistent
- **Account abstraction** (ERC-4337) changes wallet identification patterns
- **Privacy pools** (Vitalik's proposal) aim to enable compliant privacy — prove your withdrawal isn't from sanctioned deposits without revealing your specific deposit
- **MEV and sandwich attacks** can create inadvertent exposure to sanctioned funds in the same block

_Last updated: 2026-02-15_
