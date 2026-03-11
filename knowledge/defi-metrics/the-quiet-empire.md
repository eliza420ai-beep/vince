---
tags: [defi, protocols, metrics]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# 180139813.The Quiet Empire

## Metadata

**Source**: Substack Essay
**Category**: defi-metrics
**Word Count**: 1,226
**Tags**: #btc #ethereum #eth #solana #sol #perps #futures #trading #substack

---

Six months ago almost no one had heard of [Felix](https://www.usefelix.xyz?ref=F21049C1). Today it is the second-largest protocol on HyperEVM, the borrowing hub for every serious trader on Hyperliquid, and the single biggest sink for USDH outside the exchange itself. It did all of this without a token, without a pre-mine, and without ever paying for a single sponsored tweet. The rise feels accidental only if you weren’t paying attention.

[Felix](https://www.usefelix.xyz?ref=F21049C1) began as something deceptively simple: an authorized fork of Liquity V2, dropped on April 8, 2025, with three collateral types (ETH, BTC, HYPE) and a stablecoin called feUSD that charges no recurring interest. That alone would have been useful on a chain obsessed with perpetual futures, where traders routinely need spot margin but hate bleeding basis points to Aave-style rates. But the Felix team (small, anonymous, and relentlessly product-focused) understood something deeper about Hyperliquid: the chain already had the best order book in crypto; what it lacked was a native balance sheet.

## Context

So they built one.

The CDP product was the trojan horse. Mint feUSD at 110 % collateral ratio, redeem it for collateral at par, let the stability pool eat the liquidations. Classic Liquity. Yet every trader on Hyperliquid already understood the game because they were already overcollateralizing spot margin with the exchange. Felix simply moved that loop on-chain and removed the interest fee. Within weeks the borrow volume crossed a hundred million dollars and never looked back.

Then came Vanilla.

## Main

On May 14 they shipped an isolated lending layer on top of Morpho Blue. Same assets, same risk engine, but now you could supply USDT0 or USDH and let other people borrow against HYPE at floating rates that rarely exceed single digits. The beauty was symmetry: the same HYPE that people were depositing into CDPs to mint feUSD could now had a second use as loan collateral in Vanilla. Borrowers paid 4–8 %, suppliers earned most of it, Felix took almost nothing. The flywheel spun faster.

By midsummer the protocol had captured roughly one sixth of all capital sitting on HyperEVM. People stopped calling it a Liquity fork. They started calling it “Hyperliquid’s money market,” the same way they once called Maker “Ethereum’s money market.” The label stuck because it was true.

The real phase change arrived in November with HIP-3.

Hyperliquid’s permissionless perpetuals upgrade let anyone spin up a new futures market in a few lines of lines of code. Most teams used it to list memecoins. Felix used it to list Tesla stock. Then Circle. Then Coinbase. All denominated in USDH, all running on HyperStone oracles, all capped at modest open interest so the funding rates stayed sane. The message was subtle but unmistakable: if you want leveraged exposure to anything (blue-chip crypto, liquid staked tokens, or actual equities), you can now get it without leaving the Hyperliquid ecosystem, and Felix will supply the margin.

Suddenly the lending pools weren’t just earning 8–10 %. They were earning 8–10 % plus whatever carry you could extract by borrowing USDH, longing TSLA-perp with 3× leverage, and collecting a funding rate that occasionally prints triple-digit annualized yields when traditional markets get jumpy. The traders understood immediately. The TVL curve bent upward again.

What makes the entire machine hum is the absence of rent-seeking. There is still no Felix token six months in, only a points program that rewards every action proportionally: minting, redeeming, supplying, borrowing, depositing in the stability pool, even trading the new equity perps. The lack of immediate token speculation has kept the community strangely pure. People are here to make money with money, not to flip a governance coin. The vibe is closer to early Alameda than to the average 2024 farm-and-dump.

Risks, of course, remain. A sharp drawdown in HYPE price would cascade through looped CDP positions the same way it once cascaded through LUNA-UST. The oracles can lag, funding rates can turn negative, and the entire experiment is still less than a year old. But the design margins are conservative (minimum collateral ratios at 110 %, most users running 200–300 %, liquidations distributed to a deep stability pool), and the chain itself has never skipped a block.

More interesting than the cultural shift. Hyperliquid began as a derivatives venue for degens who wanted sub-millisecond execution. It is quietly becoming something broader: a full-stack financial venue where you can borrow, lend, hedge, and earn yield without ever bridging back to Ethereum or Solana. Felix is not the only protocol in that stack, but it is the central bank. Every other application (KittenSwap, HypurrFi, the new perp issuers) routes liquidity through its pools or borrows against its collateral types.

In an industry that rewards noise, Felix has grown through competence and restraint. No roadmap theatrics, no tokenomics teasers, just iterative product shipped at a pace that feels almost boring until you zoom out and realize the borrowing depth now rivals chains ten times its age.

The empire is still quiet. Most people outside the Hyperliquid circle have never heard of it. That probably won’t last another six months. When the wider market eventually notices that there is now an on-chain venue where you can borrow USDH at 5 %, deposit it for 9 %, and simultaneously collect 150 % annualized funding by shorting Tesla stock against it, all with finality under a second and fees under a cent, the capital will arrive quickly.

Until then the traders keep trading, the lenders keep lending and Felix keeps doing what it was built to do: serve the trader, without asking for much in return.

That, it turns out, is an extremely loud signal in a very noisy industry.

**You already have USDH + USDT0 earning ~10 % in Felix? **

Here’s what to do next, from easiest to spicier:

- Do nothing → Keep the 10 % + free Felix points. Totally fine.

- One-click upgrade (2 minutes)
  Go to Felix app → Vanilla → “Vaults” → Move your deposit into the top USDT0/USDH vault.
  You now get 12–14 % instead of 10 %, still super safe, still earning points. Done.

Slightly more juice (5 minutes)
In the same Felix app:

- Borrow a bit of HYPE against your deposit (safe at 50–60 % loan-to-value)

- Mint feUSD with that HYPE (0 % interest)

- Swap feUSD back to USDH/USDT0 and put it back in the lending pool
  → You now earn 16–20 % on the same money + way more points.
  (Just never go below 160 % collateral ratio and you’re safe.)

- Fun mode (optional)
  Take 10–20 % of your stack, swap half to feUSD, add liquidity on KittenSwap (USDH–feUSD pool) → 15–25 % APY + extra partner points.

Pick 1, 2, 3, or 4. Most people just do step 2 or 3 and chill.

That’s literally it — no spreadsheets required.

Eight months in, Felix is no longer quiet:

- Total deposits > $1.5B, second-largest protocol on HyperEVM

- USDH fully integrated as the chain’s fiat-backed stable (4%+ base yield now passes through to lenders)

- Vanilla lending vaults boosted to 12–25%+ APR with fresh Merkl incentives

- Borrowing rates still sub-5%: HYPE 3.3%, kHYPE 2.6%, UBTC 1.98%

- HIP-3 equity perps live (TSLA-USDH, CRCL-USDH, COIN-USDH) – borrow USDH cheap, go long/short real stocks at 3× with occasional 100%+ annualized funding

## Conclusion

- Still no token, still just points, still zero paid marketing

The empire has started speaking and the rest of crypto is finally listening.

## Related

- [181038627Reluctant Renaissance](181038627reluctant-renaissance.md)
- [182311278Upgrade The Pipes](182311278upgrade-the-pipes.md)
- [On Chain Fundamentals](on-chain-fundamentals.md)
- [Global Regulatory Map](../regulation/global-regulatory-map.md)
- [Us Regulatory Landscape 2026](../regulation/us-regulatory-landscape-2026.md)
