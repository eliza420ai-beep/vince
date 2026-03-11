---
tags: [trading, derivatives, perps]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# 181176630.Liquidation Engines

## Metadata

**Source**: Substack Essay
**Category**: perps-trading
**Word Count**: 808
**Tags**: #eth #sol #trading #substack

---

At 21:15 UTC on October 10, the crypto perpetuals market did not explode. It was rescued. The price of that rescue was roughly $650 million forcibly extracted from profitable positions, almost all of them delta-neutral market makers and liquidity providers who had broken no rules. In twelve frantic minutes, thirty-five thousand deleveraging orders fired.

Hyperliquid’s queue-based auto-deleveraging engine, a mechanism lifted nearly unchanged from 2015 centralized exchanges, ranked every account by unrealized profit multiplied by leverage and began liquidating the highest scores first. Deep-in-the-money shorts were closed at the exact bottom to fund bankrupt longs.

## Context

By 21:27 the cascade halted. No bad debt remained. The chain stayed up.

On paper, the system performed perfectly.

> On-chain, it resembled a public execution of the very addresses that supply ninety percent of visible depth.

Two months on, the market has rendered its verdict with open interest, leverage, and feet. Lighter, built by the same team that once operated Orderly Network, surged from nothing to briefly eclipsing Hyperliquid in daily volume.

## Main

Under the hood it runs the same antique queue, yet it cloaks the mechanism in zero-knowledge proofs, partial liquidation stages, hourly batch auctions, zero trading fees, and a points vault yielding forty to sixty percent.

The recoil no longer arrives as a single broadside; it is delivered in polite, scheduled drips. Traders adore the sensation. Dopamine remains undefeated.

The physics, however, have not changed. When the next trillion-dollar move arrives, the same ranking algorithm will still place the rescuers at the front of the firing line. Batching merely alters the tempo of the spray.

Other builders watched the October footage and simply discarded the cannon. Paradex waits until the insurance fund is entirely exhausted before triggering deleveraging, then automatically refunds every affected user if price recovers before the fund reaches zero. Drift v3 dispatches heat-seeking keeper bots that touch only truly insolvent accounts, almost never healthy opposing positions. Aevo operates a fully transparent off-chain orderbook with on-chain settlement and mathematically provable liquidation paths. Aster absorbs shocks inside deep liquidity pools, unified cross-margining, and strict per-market leverage caps, so the book itself digests turbulence without ever reaching for the queue.

These are not experiments. They are live, shipping protocols that have already spared hundreds of millions in needless haircuts during the smaller convulsions that followed October.

> Hyperliquid has hardly stood still. Since the incident it has shipped dynamic deleveraging thresholds, stricter vault isolation, preemptive leverage caps on majors, real-time systemic-exposure scoring, live user dashboards revealing personal ADL priority, ninety-percent fee reductions to fund risk research, and public commitments to explore partial offsets of correlated positions. These are serious, adult refinements. They make auto-deleveraging rarer, fairer, and far more transparent, rightly hailed by some analysts as a maturity.

The co-founder has stressed, correctly, that the October event ultimately delivered net-positive realized profit to most deleveraged traders by locking in shorts at the bottom, and that the mechanism treats users and the vault symmetrically. Yet a fresh December paper by Tarun Chitra demonstrates that Hyperliquid’s production queue overused ADL by roughly eight times relative to an optimal policy, imposing some $630 million of unnecessary losses on winning traders while preserving solvency.

The core heuristic remains a blunt profit-times-leverage sort, simple, robust, and solvency-guaranteeing. It is also, inevitably, aimed at the very participants who keep the market liquid. Every patch makes the cannon more ergonomic, more polished, more humane, but it remains a cannon.

Lighter has shown that one can chrome the barrel, wrap the grip in leather, and fit a silencer. Traders will still flock to it, until the day the silencer fails.

The industry no longer needs to debate whether queue-based ADL belongs in a museum. Superior alternatives already exist, battle-tested and orders of magnitude less destructive when pressure spikes. Hyperliquid’s rapid iteration, stress-tested architecture, and obsessive transparency remain elite. Monitor those dashboards closely.

Yet as Chitra warns, when the fire next reaches trillion-dollar scale, heuristics tuned on a half-billion-dollar rehearsal will not suffice. There is always another fire. The next one will not be measured in billions.

## Conclusion

Choose your venue the way you would choose an airline seat: admire the legroom and complimentary drinks by all means, but first confirm where the emergency exits are and whether the oxygen masks actually drop.

Hyperliquid’s cannon still works.

> In live billion-dollar clearing, a stable deterministic heuristic beats a complex, high-variance policy that can hallucinate or blow up during black swans. Hyperliquid’s simple “first-come, first-liquidated” queue isn’t mathematically perfect, but the Gauntlet/Tarun “fix it with fancy optimal math” paper is naïve. It’s built on hindsight cheating, pretends the crash was predictable and contained inside Hyperliquid (it wasn’t, it came from hidden chaos on Binance + USDe peg panic), and no local tweak can stop a global meltdown anyway. A boring, predictable queue is safer than complex math that can explode when the world goes crazy.
