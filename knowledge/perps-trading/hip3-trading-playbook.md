---
tags: [trading, derivatives, perps, hip3]
agents: [vince, solus, eliza]
last_reviewed: 2026-02-17
---

# HIP-3 Trading Playbook — How to Trade Every Asset

> This is the execution manual. For asset profiles see `hip3-assets-deep-reference.md`.
> For perps mechanics see `hyperliquid-perps-deep-reference.md`.

---

## Universal HIP-3 Trading Rules

### The Structural Edge

1. **24/7 access to stocks and commodities** — trade NVDA at 3am when news drops, trade GOLD on weekends when geopolitics shift. TradFi can't do this
2. **Funding as alpha** — HIP-3 funding rates reveal positioning that's invisible in TradFi. When xyz:TSLA funding spikes to 0.1%/8h, retail is FOMO-ing in. Fade it
3. **Isolated margin = risk containment** — each HIP-3 position is isolated. A bad NATGAS trade can't blow up your BTC position. Use this to your advantage: take higher-conviction bets knowing the blast radius is contained
4. **Thinner books = wider stops** — HIP-3 liquidity is 10-100x thinner than native HL perps. Spreads wider, slippage real. Size accordingly (1/3 to 1/5 of what you'd do on native BTC perp)

### Position Sizing Rules

- **Stock perps (xyz)**: Max 5% of portfolio per single name. Max 15% total xyz exposure
- **Commodity perps (flx)**: Max 3% per commodity. NATGAS max 1% (it will wreck you)
- **Pre-IPO hyperps (vntl)**: Max 2% per name. These are speculative — treat them like venture bets
- **Index perps**: Max 10% per index (these are diversified by nature)
- **Remember**: 2x fees on HIP-3. Factor this into your edge calculation. A 0.5% scalp after fees might be 0.3%

### Funding Rate Playbook for HIP-3

HIP-3 funding can be WILD compared to native perps:

- **Stock perps**: Funding tends to be positive (longs pay) during US market hours and earnings hype. Can go extreme before earnings
- **Commodity perps**: Funding follows macro fear cycles. GOLD funding spikes during war/crisis
- **Pre-IPO hyperps**: Funding is the #1 risk. OPENAI funding can hit 1%+/8h during AI hype. That's 1,095% annualized. Your position melts if you're wrong on timing
- **Rule**: If annualized funding >100%, you're paying more in funding than most trades will give you. Either the move happens fast or you lose to carry

---

## Stock Perps Trading Setups (xyz DEX)

### Earnings Season Playbook

The #1 alpha in stock perps. Earnings create 5-15% moves in a single session.

**Pre-earnings (1-3 days before):**

- Funding rises as directional bets pile in
- IV equivalent (visible through funding + spread widening) increases
- Strategy: If you have a conviction view, enter BEFORE funding spikes. The cheap entry is Tuesday/Wednesday for a Thursday after-close earnings
- Alternative: Sell the hype — short elevated funding by taking the other side (if funding >0.05%/8h, short for the funding income + mean reversion)

**Post-earnings (first 1-4 hours):**

- 24/7 advantage: earnings drop after US close (4pm ET) → you can trade the reaction immediately while stock market is closed
- Strategy: Trade the first move. Guidance matters more than beat/miss. Read the headline, trade the direction, tight stop
- Size: Half normal position. Gaps are violent

**Earnings Calendar Priority (these move markets):**

- NVDA (May, Aug, Nov, Feb) — moves SEMIS index, AMD, MU, entire AI narrative
- TSLA (Jan, Apr, Jul, Oct) — moves DOGE, Musk-related assets
- META, GOOGL, MSFT, AMZN, AAPL — MAG7 movers, report in waves (late Jan, late Apr, late Jul, late Oct)
- COIN — crypto bellwether earnings

### Correlation Trades

**MSTR as BTC leverage:**

- When BTC moves +5%, MSTR typically moves +10-15%
- Trade: Long xyz:MSTR as leveraged BTC play (or short for leveraged BTC short)
- Edge: During weekend BTC moves, MSTR perp on Hyperliquid moves while real MSTR stock is closed. The Monday open gap creates a catch-up trade
- Monitor: MSTR premium to BTC NAV. When premium compresses, MSTR underperforms BTC. When it expands, MSTR outperforms

**COIN as crypto market beta:**

- COIN trades as 1.5-2x levered play on crypto trading volume
- When BTC rips + alts rip + funding is positive everywhere = COIN outperforms
- When volumes dry up, COIN underperforms even if BTC is flat
- Trade: Long COIN during volume expansion phases, short during volume contraction

**NVDA → AI complex cascade:**

- NVDA earnings/news moves: AMD, MU, SEMIS index, and even OPENAI/ANTHROPIC sentiment
- Trade: If NVDA gaps up on earnings, the second-order trade is long AMD or SEMIS (they follow with lag)
- If NVDA warns on data center spend, short the whole complex

**TSLA → Musk universe:**

- TSLA sentiment bleeds into DOGE, SPACEX, and even political narratives
- Musk tweets/controversy → TSLA moves first, DOGE follows, SPACEX perp follows
- Trade: TSLA as lead indicator for Musk-correlated assets

### Sector Rotation Signals

- When SMALL2000 outperforms US500: risk-on, rate cuts priced in, buy growth
- When US500 outperforms SMALL2000: flight to quality, defensive positioning
- When SEMIS outperforms INFOTECH: AI capex cycle accelerating
- When MAG7 underperforms US500: rotation into broader market, mega-cap derating

### Weekend & After-Hours Edge

- US stocks are closed Sat-Sun + 8pm-4am ET weekdays
- HIP-3 stock perps trade 24/7 on Hyperliquid
- Weekend catalyst (war, regulation, Musk tweet) → stock perps move while real stocks can't
- Trade: Position in HIP-3 on the weekend, take profit on the Monday open gap convergence
- Risk: Thin weekend liquidity means wider spreads and potential for manipulation

---

## Commodity Perps Trading Setups (flx DEX)

### REMEMBER: USDH collateral, not USDC

**GOLD Trading:**

- Primary driver: Real interest rates (TIPS yields). When real rates fall, GOLD rises
- Secondary: DXY (dollar strength). Strong dollar = gold weakness. Weak dollar = gold strength
- Crisis trade: War/banking crisis/sovereign debt → GOLD spikes immediately. This is the 3am edge — be first
- Setup: Long GOLD when Fed pivots dovish, DXY breaks down, or geopolitical escalation
- Funding: Usually low/negative (shorts pay) in calm markets. Spikes positive during rallies
- Size: 2-3% max. Gold moves 1-2%/day normally, but can gap 3-5% on black swans

**SILVER Trading:**

- Trade the gold/silver ratio: >80 = long silver/short gold (ratio mean reverts). <65 = short silver/long gold
- Silver amplifies gold moves 2-3x — if you're bullish gold but want more juice, use silver
- Industrial demand adds a wrinkle: strong manufacturing PMI is extra bullish for silver vs gold
- Warning: Silver can gap violently. More volatile than gold, thinner books

**COPPER Trading:**

- THE macro indicator. Long copper = long global growth
- China stimulus → long copper. China slowdown → short copper
- Monthly catalysts: Chinese PMI (1st of month), US ISM manufacturing
- Green transition structural bid: EV adoption, renewable energy grid buildout
- Trade: Swing trade copper around macro data releases. Hold times: days to weeks

**NATGAS Trading:**

- ⚠️ DANGER ZONE ⚠️ — This is the most volatile commodity perp. 10-20% daily moves happen
- Weather is king: cold snap forecast → NATGAS spikes. Warm winter → NATGAS collapses
- Weekly EIA storage report (Thursday 10:30am ET) is the catalyst
- LNG export capacity additions = structural demand shifts
- Max 1% position size. Use tight stops. This is a pure volatility trade, not a hold
- If you're not actively watching, don't be in NATGAS

**OIL/USOIL Trading:**

- OPEC+ meeting dates (monthly) are the #1 catalyst. Production cuts = bullish, increases = bearish
- Weekly EIA inventory data (Wednesday 10:30am ET) moves price
- Geopolitics: Middle East conflict → oil spikes. Ceasefire → oil drops
- Brent (flx:OIL) vs WTI (km:USOIL): trade the spread when it widens beyond historical norms ($2-5 normal, >$8 = trade the convergence)

---

## Index Perps Trading Setups

**US500 (km:US500) — The Macro Trade:**

- Long US500 = long the US economy. Short = recession bet
- Key data: NFP (first Friday), CPI (monthly), FOMC (8x/year), GDP (quarterly)
- Fed day playbook: Position BEFORE the announcement if you have conviction. Volatility spikes during presser. The real move often comes the next day as market digests
- Pairs trade: Long US500 / Short SMALL2000 = quality flight. Reverse for risk-on

**MAG7 (vntl:MAG7) — Concentrated Tech:**

- 7 stocks, equal weight (roughly). Any single name's earnings moves it
- Trade: Express a "big tech will outperform" view without picking a single name
- Hedge: Short MAG7 to hedge a long NVDA/TSLA portfolio (beta reduction)

**SEMIS (vntl:SEMIS) — The AI Capex Cycle:**

- SEMIS is the purest AI capex play
- Lead indicator: NVDA orders/guidance → SEMIS direction for next 3-6 months
- Book-to-bill ratio in semis industry reports = forward indicator
- Cyclical: memory pricing (MU) and equipment orders (ASML) signal tops/bottoms

---

## Pre-IPO Hyperps (vntl DEX)

### Critical: These are HYPERPS, not regular perps

- No spot oracle → funding based on 8h EMA of mark price
- This means: if the market trends one direction, funding CRUSHES the other side
- OPENAI at $300 with mark trending up → longs pay MASSIVE funding → your long melts even if price doesn't drop
- Rule: Only hold hyperps for SHORT durations (hours to days, not weeks) unless you're confident the move outpaces funding

**OPENAI Trading:**

- Catalysts: GPT model releases, revenue milestones ($10B ARR), partnership announcements, IPO filing rumors, regulatory news
- Funding: Structurally positive (everyone wants to be long AI). Typical: 0.03-0.10%/8h. During AI hype: 0.5%+/8h
- Strategy: Buy OPENAI on pullbacks when funding resets. Short OPENAI when funding is extreme and AI narrative fatigues
- Size: 2% MAX. This is pre-IPO speculation, not investment

**ANTHROPIC Trading:**

- Follows OPENAI directionally but lower volume, wider spreads
- Catalysts: Claude releases, Amazon partnership news, funding rounds, enterprise wins
- Lower liquidity than OPENAI → more slippage, harder to exit
- Trade: If you want AI exposure with slightly less crowding, ANTHROPIC over OPENAI (but accept the liquidity cost)

**SPACEX Trading:**

- Catalysts: Starship test flights (binary events — success = pump, failure = dump), Starlink subscriber numbers, Starlink IPO rumors
- Musk correlation: SPACEX moves with TSLA/DOGE on Musk-specific news
- Trade: Position before Starship launches. The success/failure reaction is fast and violent
- Unique: Starlink revenue is real and growing → gives SPACEX more fundamental backing than pure hype tokens

---

## Cross-Asset Correlation Matrix for VINCE

Understanding how assets move together is the real edge:

| Lead Asset        | Follows With Lag                  | Inverse/Hedge            |
| ----------------- | --------------------------------- | ------------------------ |
| BTC               | MSTR (+2-3x), COIN (+1.5x), HOOD  | GOLD (sometimes)         |
| NVDA              | AMD, MU, SEMIS, INFOTECH          | —                        |
| TSLA              | SPACEX, DOGE                      | —                        |
| GOLD              | SILVER (2-3x beta)                | DXY, real rates          |
| US500             | SMALL2000 (higher beta)           | VIX (not tradeable here) |
| Fed rate cut      | SMALL2000 ↑, GOLD ↑, BTC ↑        | USD ↓                    |
| Fed hawkish       | USD ↑, GOLD ↓                     | Growth stocks ↓          |
| Oil spike         | NATGAS (sympathy), inflation fear | Consumer discretionary ↓ |
| AI narrative peak | OPENAI, ANTHROPIC, NVDA, SEMIS    | —                        |

## Risk Management Rules

### Stop Loss Rules by Asset Class

- **Stock perps**: 3-5% stop on single names, 2-3% on indices
- **Commodities**: 2-3% on gold/copper, 5% on natgas/oil (they gap)
- **Pre-IPO hyperps**: 5-8% stops (these are volatile). Mental stop + actual stop
- **All HIP-3**: Set stops WIDER than you would on native perps (thinner books = more wicks)

### When to NOT Trade HIP-3

- When you can't monitor positions (HIP-3 can gap hard on thin liquidity)
- When funding annualized >200% against you (you're paying more than the expected move)
- NATGAS during shoulder season (spring/fall) — no directional edge, just chop
- Pre-IPO hyperps when there's no catalyst in sight — you're just paying funding to hold

### The Kill Switch

If you're down 10% on total HIP-3 allocation in a week: close everything, reassess. HIP-3 is supplementary alpha, not the core stack. The core stack (BTC, ETH, SOL, HYPE native perps + Hypersurface options) comes first.
