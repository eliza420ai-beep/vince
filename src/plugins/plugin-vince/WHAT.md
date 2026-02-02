# WHAT.md — The Trader's Compass in a Chaotic World

VINCE started as a personal itch.

I was paper trading BTC perps on Hyperliquid, scanning Solana memes on DexScreener, and occasionally dipping into options on Deribit—all while trying to remember if it was Thursday (pool day) or Friday (ritual vibes). The data was everywhere, but the context was missing.

Why chase a signal if it's off-hours and your head's not in it? Why ignore a hot meme if it aligns with whale moves but tanks your work-life flow?

I wanted something that pulled it all together—not as a dashboard of doom-scrolling stats, but as a coherent voice saying, "Here's the play, and here's why it fits your life."

---

## What VINCE Actually Does

At its core, VINCE is a trading assistant that blends six worlds into one seamless feed:

- **Options** — covered calls on BTC via HYPERSURFACE
- **Perps** — signals for longs/shorts with paper execution
- **TradFi** — gold, NVDA, SPX via Hyperliquid HIP-3
- **Memes** — AI tokens in that juicy $1M-$20M sweet spot
- **Lifestyle** — day-of-week aware, because who trades well on an empty stomach
- **Art** — NFT floors for thin-buy opportunities

Primary assets: BTC, ETH, SOL, HYPE. Plus 34 HIP-3 assets for diversification.

Imagine waking up and saying "gm" to your bot. VINCE hits back with a briefing:

> IV skew on options looks put-heavy—maybe a 95K strike for covered calls. Perps funding is neutral, but top traders are mixed; no edge there. Three AI memes are bubbling—$MOLT's got traction, but watch the liquidity. Oh, and it's Thursday: hit the pool, grab sushi. CryptoPunks floor at 28.5 ETH—thin gap, could flip.

Not overwhelming. Curated. Signals aggregated from 15+ sources, weighted by what's proven to work.

Then there's the paper trading bot. It follows those signals automatically, with built-in guards:
- Kelly Criterion for sizing positions
- Circuit breakers at $200 daily loss
- Goals like $420/day (because why not meme the targets)

It learns from its trades—adjusting what signals to trust, spotting patterns in wins/losses—without needing you to babysit. You can deep-dive a meme, check bot status, or get "Grok Expert" prompts for daily research.

A quant desk in your pocket, but one that remembers you're human.

---

## But Why Build This?

Here's where it gets personal.

VINCE isn't about cramming more tech into trading. It's about reclaiming sanity in a market that never sleeps.

Crypto's a beast—it lures you with moonshots but chews through your time, health, and perspective. I was tired of the silos. Why track perps in one tab and memes in another when they influence each other? A funding flip on BTC might signal a meme rotation. A whale dump on NVDA could ripple to AI tokens. Consolidation isn't lazy—it's essential for seeing the big picture.

**Balance matters.** Trading's seductive, but it's not life. VINCE weaves in lifestyle because Fridays aren't just expiry days—they're ritual days. Thursdays? Lighter vibes, maybe dining out. It's day-of-week aware, pulling from a simple rules engine that says, "Hey, market's choppy, session's Asia—scale down and go live a bit."

Art's in there too, because NFTs aren't just flips; they're cultural bets, reminders that value's more than charts.

I've burned out chasing pure alpha, ignoring the "why" of it all. VINCE forces the question: Is this trade worth the energy? Does it align with your goals, or is it just FOMO?

---

## The Self-Improving Angle

Markets evolve, so should your edge.

But I didn't want some Frankenstein agent rewriting code on the fly—that's a recipe for headaches. Instead, VINCE learns parametrically:

- **Thompson Sampling** tweaks signal weights based on real wins/losses
- **Embeddings** spot similar past trades
- **Offline models** (exported to ONNX) refine sizing and quality checks

It starts rule-based (day one: solid but basic), gets smarter online (after 30 days: adaptive weights), and hits peak after enough data (90+ days: full ML inference).

Why this way? Because complexity kills. I wanted 80% of the smarts with 20% of the risk—no external deps, no auto-code edits, just graceful growth. If the ML hiccups, rules take over. No drama.

---

## Free-First Was Non-Negotiable

Premium APIs like CoinGlass or Nansen are nice, but why gatekeep edge behind paywalls?

VINCE leans on free sources (Binance, Deribit, DexScreener) with paid as optional boosts. It's hobbyist-friendly—$0 to start, upgrade if you scale.

Trading's already unequal; tools shouldn't widen the gap. Plus, ensembles beat single sources: 15 voices outvote the noise, historical tracking culls the weak.

---

## The Philosophy

VINCE is my manifesto against fragmented, soul-sucking trading.

It's for the trader who wants edge **and** equilibrium—who sees crypto as a game, not a jail. Goals like $10K/month aren't endpoints; they're enablers for better living.

Trade well, live well. That's the why.

---


