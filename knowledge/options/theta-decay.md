---
tags: [trading, options, derivatives]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# 182267164.Theta Decay

## Metadata

**Source**: Substack Essay
**Category**: options
**Word Count**: 627
**Tags**: #bitcoin #btc #eth #defi #options #trading #substack

---

Our current strategy revolves around covered calls—holding 1 BTC as collateral while selling out-of-the-money (OTM) call options to collect premiums. This transforms idle Bitcoin into a yield-generating asset, capturing theta decay (time value erosion) while maintaining upside exposure up to the strike price.

As of December 21, 2025, with Bitcoin trading around $88,000–$88,400 amid thin holiday liquidity, this method has proven particularly effective in range-bound or mildly bullish environments.

## Context

We execute this strategy primarily through Hypersurface, a leading DeFi structured products platform built on HyperEVM. Hypersurface specializes in on-chain covered calls, automating the process with smart contracts for transparency, composability, and efficiency. Unlike centralized exchanges or OTC desks, it allows seamless, trustless yield generation on BTC holdings—receiving premiums in stablecoins (typically USDT0) while retaining full control of the underlying asset.

**Weathering the Massive December 26 Options Expiry**

Our active covered call is a $90,000 strike expiring December 26, 2025—the date of one of the largest Bitcoin options expiries in history, with approximately $23–$23.8 billion in notional value unwinding, predominantly on Deribit.

## Main

This event represents over half of current total open interest and features heavy clustering: significant put protection around $85,000–$88,000 and call walls higher at $100,000+.

Max pain estimates vary slightly across sources (some peg it near $88,000–$90,000 for near-term dynamics, others at $100,000 for the year-end cluster), but the net effect is clear: dealer gamma hedging creates strong “pinning” forces, pulling price toward zones of highest open interest while rejecting clean breaks.

With Bitcoin stubbornly hovering below $90,000 for weeks—compressed implied volatility around 44% and defensive flows dominating—this expiry setup favors option sellers like us.

The base case remains containment in the $85,000–$90,000 range through settlement, amplified by holiday-thinned liquidity and reduced ETF flows.
\*\*
Wicks and stop hunts are likely, but a violent upside break above $90,000 into expiry feels lower probability (~30–40%).

If price pins near or below $90,000 (our core expectation), the call expires worthless: we retain the full premium (already collected upfront via Hypersurface) plus our BTC intact, achieving the strategy’s primary goal of risk-free yield in a choppy market.

This aligns perfectly with covered call mechanics—premium income as compensation for capping upside in sideways conditions.

Rolling into January 2, 2026\*\*

Assuming the high-probability scenario plays out (expiry worthless, BTC around $88,000–$90,000 post-settlement), we plan an immediate roll into the next weekly cycle: selling a new covered call on Hypersurface for the January 2, 2026 expiry at $96K strike.

Why $96,000? It’s aggressively OTM:

- Ample upside buffer for the expected relief rally—historical patterns after massive gamma unwinds show sharp volatility expansion and cleaner directional moves as hedging drag lifts.

- Alignment with longer-dated skew: 2026 flows remain call-heavy and bullish, with repositioning likely favoring upside into the new year (potential Santa Claus rally extension, fresh institutional inflows).

\*\*
Post-December 26, the removal of $23B+ in gamma “gravity” often unleashes bigger candles. If downside leverage flushes first (testing $85,000 support), a squeeze higher toward $92,000–$95,000+ becomes plausible early January.

Our $96,000 strike leaves room to participate while still collecting meaningful theta in a bull-trending asset.

Risk Management and Long-Term Philosophy\*\*

This rolling covered call approach isn’t about timing tops or predicting breakouts; it’s about systematic income in a structurally bullish asset. Risks include:

- Assignment on moonshots: Getting called away at the strike (e.g., $90,000 now or $96,000 next) means forgoing further upside—but at elevated prices, that’s often a favorable exit for long-term holders.

- Downside exposure: We remain fully long BTC as core asset.

## Conclusion

- Volatility crush: Low IV environments reduce premiums.

> As we close 2025 pinned below key levels and reset for 2026, the setup looks optimal: pocket this expiry’s premium clean, then roll higher for the next leg up. For HODLers seeking income without selling core positions, it’s a disciplined way to thrive amid the chaos.
