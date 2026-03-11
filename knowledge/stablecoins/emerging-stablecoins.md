---
tags: [stablecoins, defi]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

## PayPal USD (PYUSD)

Launched August 2023, issued by Paxos, fully backed by cash and short-term Treasuries. PYUSD's differentiator isn't mechanism — it's distribution. PayPal's 400M+ user base gives it a fiat on/off-ramp advantage no crypto-native issuer can match. Initially Ethereum-only, it expanded to Solana in mid-2024, where adoption accelerated due to low fees.

Market cap has fluctuated between $500M-$1B — modest by stablecoin standards but significant as a TradFi bridgehead. The risk isn't depeg (Paxos reserves are well-audited) but rather PayPal's willingness to sustain the product through regulatory headwinds. PYUSD doesn't pay yield to holders, making it less attractive for DeFi but cleaner from a regulatory standpoint.

**Key risk:** PayPal could freeze or restrict PYUSD at any time for compliance — it's the most censorable stablecoin in circulation.

## First Digital USD (FDUSD)

Issued by First Digital Trust (Hong Kong), FDUSD rose to prominence as Binance's preferred zero-fee trading pair after BUSD's wind-down. Backed by cash and Treasuries, audited by Prescient Assurance. Its market cap (~$2-4B) is almost entirely driven by Binance volume incentives — organic demand outside that ecosystem is minimal.

**Key risk:** Single-exchange dependency. If Binance changes fee structures or faces regulatory action, FDUSD demand evaporates overnight. Hong Kong regulatory framework provides some legitimacy but lacks the depth of US or EU oversight. First Digital faced brief controversy in early 2025 over reserve transparency; the trust structure (vs. direct issuer model) adds opacity.

## Ethena USDe (Delta-Neutral)

The most innovative and controversial entrant. USDe maintains its peg through a delta-neutral strategy: it holds staked ETH (or BTC) as collateral and opens equivalent short perpetual futures positions. The yield comes from staking rewards + funding rate payments (which are positive when the market is bullish — longs pay shorts).

USDe grew explosively to $5B+ in supply, offering 15-30% APY during bull conditions. The sUSDe staked variant captures the yield. But the mechanism has a critical vulnerability: **during prolonged bearish periods, funding rates go negative**, meaning USDe would need to pay longs rather than earn. Ethena maintains a reserve fund to buffer this, but a sustained negative funding environment (like Q2-Q3 2022) could drain reserves and force unwinding.

**Key risk:** Not a "stablecoin" in the traditional sense — it's a structured product with basis trade risk. The peg held through several stress tests in 2024-2025, but the true test is a multi-month bear with persistent negative funding. Also: CEX counterparty risk on the short positions (Ethena uses custodians like Copper and Ceffu, not direct exchange accounts).

## Usual USD0

Usual Protocol issues USD0, backed by short-term US Treasuries, with yield distributed to USUAL governance token holders rather than directly to USD0 holders. This design attempts to dodge the "stablecoin yield = security" classification by routing returns through a separate token.

Grew rapidly in late 2024 through DeFi incentive campaigns and Curve/Pendle integrations. The USD0++ variant (locked USD0) offers enhanced yield but introduced controversy when Usual modified redemption terms, triggering a brief depeg of USD0++ in January 2025.

**Key risk:** Governance token reflexivity — USUAL token value depends on protocol TVL, which depends on USD0 adoption, which depends on USUAL incentives. This circular dependency can unwind rapidly. The redemption term change demonstrated governance centralization risk.

## Mountain Protocol USDM

USDM is a yield-bearing stablecoin backed by short-term US Treasuries, with yield passed directly to holders via daily rebasing. Issued by Mountain Protocol (Bermuda-regulated), it targets non-US persons explicitly, sidestepping SEC jurisdiction.

**Key risk:** Regulatory — if US regulators assert extraterritorial jurisdiction or if Bermuda regulation proves insufficient. Rebasing mechanism can cause integration issues with some DeFi protocols that don't handle balance changes gracefully. Smaller market cap (~$100-200M) means less liquidity and fewer integrations.

_Last updated: 2026-02-15_
