---
tags: [trading, risk-management, strategy]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Market Regime Detection

## Methodology & Framework

### Core Concepts

Markets cycle through three primary regimes: **trending up (bull)**, **trending down (bear)**, and **range-bound (chop)**. Each regime demands a different strategy. Applying a bull market strategy in a bear market is the fastest way to lose capital. Regime detection isn't about predicting — it's about recognizing what's already happening and adapting. The goal is to be approximately right, not precisely wrong.

### Analytical Approach

**Moving Average Framework:**

- **20W SMA (Weekly)** — BTC above = bullish bias, below = bearish bias. Simple but effective as a macro filter.
- **200D SMA (Daily)** — The institutional line. BTC reclaiming it from below is a regime shift signal; losing it from above is the same.
- **50/200 Cross (Golden/Death Cross)** — Lagging but useful for confirmation. Don't front-run it; use it to validate what other signals suggest.
- **MA Slope** — More important than price relative to MA. A flattening 200D after a downtrend suggests regime transition, not immediate bull.

**Volatility Signals:**

- **Bollinger Band Width** — Compression (narrow bands) precedes expansion. Doesn't predict direction but signals that a move is coming. Prepare, don't predict.
- **BVOL / Realized Volatility** — Compare implied vs realized. When implied spikes above realized, market is pricing in fear (potential bottom). When realized exceeds implied, moves are surprising participants.
- **ATR Expansion** — Rising ATR on daily confirms trend strength. Declining ATR in a trend warns of exhaustion.

### Pattern Recognition

**On-Chain Signals (BTC-specific):**

- **MVRV Z-Score** — Above 7 = historically overheated (late bull). Below 0 = historically undervalued (accumulation zone).
- **Exchange Flows** — Sustained net outflows = accumulation. Sudden large inflows = distribution or panic selling.
- **Long-Term Holder Supply** — When LTH supply starts decreasing after prolonged accumulation, it signals cycle distribution phase.
- **Stablecoin Supply** — Growing stablecoin market cap = dry powder on sidelines. Declining = capital leaving crypto entirely (bearish).

**Funding Rates & Derivatives:**

- **Perpetual Funding** — Persistently positive (>0.03%) = overleveraged longs, vulnerable to squeezes. Persistently negative = overcrowded shorts, squeeze potential to upside.
- **Open Interest vs Price** — OI rising with price = new money entering (healthy trend). OI rising while price flat = leverage building (fragile). OI dropping with price = forced liquidation cascade.
- **Basis (Futures Premium)** — >10% annualized = euphoria territory. Negative basis = extreme fear.

### Decision Framework

**Regime Classification:**

| Signal            | Bull              | Bear              | Range              |
| ----------------- | ----------------- | ----------------- | ------------------ |
| Price vs 200D SMA | Above, slope up   | Below, slope down | Oscillating around |
| Funding Rates     | Moderate positive | Negative/flat     | Mixed              |
| On-chain MVRV     | Rising, 2-5 zone  | Below 1           | 1-2 zone           |
| Volatility        | Expanding up      | Expanding down    | Compressing        |

**Strategy Mapping:**

- **Bull confirmed** → Full allocation per portfolio framework. Trend-follow longs, buy dips, run winners. Satellites can be aggressive.
- **Bear confirmed** → Defensive allocation. Reduce to core only, raise cash to 30-50%, short rallies only with tight stops. Capital preservation mode.
- **Range/Chop** → Most dangerous regime for trend traders. Reduce size by 50%, mean-revert between range boundaries, or sit in cash. Chop eats accounts through a thousand small losses.

**Regime Transition Signals (when to reassess):**

- 200D SMA slope changes direction after 30+ days
- Funding rates flip sign for >2 weeks
- On-chain metrics cross key thresholds (MVRV crossing 1 from below = potential bull, crossing 5 from below = caution)
- Weekly close above/below multi-month range

Never fight the regime. Adapt or sit out. The best trade in a bear market is often no trade at all.

_Last updated: 2026-02-15_
