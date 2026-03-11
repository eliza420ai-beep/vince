---
tags: [trading, options, derivatives]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# 181099567.The Wheel

## Metadata

**Source**: Substack Essay
**Category**: options
**Word Count**: 784
**Tags**: #bitcoin #btc #defi #options #substack
--->
I’m done overcomplicating things. After years of blowing up on leverage, chasing 100× alts, and watching perfect entries evaporate in two-minute wicks, I finally found the one strategy that actually works when you already believe Bitcoin is going to a million dollars someday… but you still want to get paid every single week while you wait. It’s called the Wheel.

It is boring. It is beautiful. And right now, on Hypersurface, it is printing money with less than one BTC of play capital.

## Context

Here’s how it actually works in real life.

You start with cash (USDT0). You sell a cash-secured put at a strike you would be ecstatic to buy Bitcoin at. You collect fat premium upfront. Friday comes.

Two things can happen, and both are good. Bitcoin closes above your strike.
The put expires worthless. You keep the entire premium – free money – and you sell another put next week. Rinse, repeat, get rich on theta. Or … Bitcoin closes below your strike. You get assigned. Congratulations, you just bought Bitcoin at a price you already decided you loved – and because you already collected premium, your real cost basis is even lower. Now you own the BTC.

## Main

The moment you own the BTC, you flip the wheel. You sell a covered call against it at a strike you would be thrilled to sell at. You collect another fat premium. Next Friday comes. Again, only two outcomes, and both are good. Bitcoin stays below your call strike. The call expires worthless. You keep the premium and you still own your Bitcoin. Sell another call next week. Or … Bitcoin rips past your strike. Your BTC gets called away at the higher price. You keep the premium, you keep all the upside to the strike, and you walk away with a stack of fresh USDC. Guess what? You’re back to cash. Start the wheel again by selling another put. That’s it. That is literally the whole strategy.

> You never fight the trend.
> You never use leverage.
> You never get liquidated.

You just let time decay and volatility pay you while you slowly accumulate Bitcoin on dips and distribute it on rips – always at prices you pre-approved while sipping coffee. Right now, with Bitcoin floating around $90-91k and Hypersurface’s weekly pools showing 80-140% annualized yields on 4-6% out-of-the-money options, a single BTC of rotating capital is spitting out $1,000–$2,000 every single week like clockwork. And the best part? Your downside is capped at a price you already decided you’re happy to own forever. If Bitcoin ever goes to your “pain threshold”, you simply stop selling puts and ride. Until then, the wheel keeps turning and the premiums keep stacking.

This isn’t gambling. This is farming volatility on an asset you were going to hold anyway. I spent years looking for the holy grail. Turns out it was a boring, repeatable, cash-secured loop that’s been working since 1920.
[
![](https://substack-post-media.s3.amazonaws.com/public/images/5559db3d-d2b7-4f7f-870c-a0a1ef4bb4a2_2672x1912.jpeg)

](https://substackcdn.com/image/fetch/$s_!79ki!,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F5559db3d-d2b7-4f7f-870c-a0a1ef4bb4a2_2672x1912.jpeg)
Hypersurface has quietly made traditional LP-ing look like a part-time job from hell. When you provide liquidity in an AMM pool you’re chained to the chart: constantly rebalancing, chasing the price as it runs, bleeding impermanent loss every time it actually moves, and praying it stays perfectly in your range so your yield doesn’t evaporate overnight. A Hypersurface covered call? You do one click and you’re done. You pick the exact price you’d love to sell your BTC and the moment the option settles you get the entire premium wired to your wallet upfront. Full stop. Price moons? You still keep the premium. Price dumps? You still keep the premium. Price crabs sideways for weeks? You still keep the premium. No rebalancing, no range anxiety, no IL, no babysitting. That’s the cheat code Hypersurface shipped: it turned a 100-year-old Wall Street income strategy into the simplest, highest-convexity yield farm in all of DeFi.

> Set the strike.
> Spin the wheel.
> Collect the bag.
> Go touch grass.

See you at a million.

Oh, and one more thing … Optimal BTC Wheel Strikes?

BTC weekly history since 2019: average +1.3% move

So the boring-but-perfect sweet spot right now (spot ~$90–91k):

- Cash-secured puts → sell 4–6% OTM → $86–87k strike
  → ~75% chance you keep the premium and never get assigned
  → 1.0–1.5% weekly yield in USDT (80–120% annualized)

## Conclusion

- Covered calls → sell 4–6% OTM → $95–96k strike
  → ~70–75% chance you keep your BTC + premium
  → same 1–1.5% weekly paycheck

> 2% OTM is safer but thinner (0.7–0.9%). 8%+ OTM feels clever until the premium shrinks to nothing. Set it once at 4–6% OTM, collect every Friday, lower your basis on dips, get called away smiling on rips. No leverage, no liquidation, no babysitting. That’s the entire cheat code.
