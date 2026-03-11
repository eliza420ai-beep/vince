# Options Trading Wisdom

*The art of defined risk, defined reward*

---

## Core Principles

### The Options Advantage

> "Options are tools, not gambling."

**Why trade options?**
1. **Defined risk** — Know max loss upfront
2. **Leverage** — More bang for buck
3. **Income** — Sell premium
4. **Asymmetry** — Small risk, big reward potential

---

## The 4 Basic Strategies

### 1. Long Call (Bullish)

```
Buy Call Strike $100, Premium $5
```

| If Stock At Expiry | Profit/Loss |
|--------------------|-------------|
| $90 | -$500 (lose premium) |
| $100 | -$500 (breakeven) |
| $110 | +$500 (50% gain) |
| $120 | +$1,500 (200% gain) |

**Max Risk:** Premium paid
**Max Reward:** Unlimited

---

### 2. Long Put (Bearish)

```
Buy Put Strike $100, Premium $5
```

| If Stock At Expiry | Profit/Loss |
|--------------------|-------------|
| $110 | -$500 |
| $100 | -$500 |
| $90 | +$500 |
| $80 | +$1,500 |

**Max Risk:** Premium paid
**Max Reward:** Strike - Premium

---

### 3. Covered Call (Neutral/Bullish)

```
Own Stock + Sell Call $105 for $3
```

| If Stock At Expiry | Stock P/L | Option P/L | Total |
|--------------------|-----------|------------|-------|
| $90 | -$1,000 | +$300 | -$700 |
| $100 | $0 | +$300 | +$300 |
| $110 | +$1,000 | -$200 | +$800 |

**Income generation:** Get paid to sell upside

---

### 4. Cash-Secured Put (Bullish)

```
Sell Put Strike $100, Receive $3 credit
```

| If Stock At Expiry | P/L |
|--------------------|-----|
| $110 | +$300 |
| $100 | +$300 |
| $90 | -$700 |

**Assignment risk:** Must buy stock at strike if below

---

## The Greeks (Simplified)

### Delta — Direction
- How much option moves per $1 stock move
- Call: 0 to 1 (higher = more in-the-money)
- Put: 0 to -1

### Theta — Time Decay
- Daily premium erosion
- **Theta burns:** Options lose value daily
- **Sell theta:** Income strategies benefit

### Vega — Volatility
- Option sensitivity to IV changes
- **IV up = Options up** (good for buyers)
- **IV down = Options down** (good for sellers)

### Gamma — Acceleration
- How fast Delta changes
- High gamma = high risk/reward

---

## Implied Volatility (IV)

### IV Percentiles

| IV Rank | Meaning | Strategy |
|---------|---------|----------|
| 0-20% | Historically low | Buy options |
| 20-50% | Normal | Neutral |
| 50-80% | High | Sell options |
| 80-100% | Historically high | Sell premium |

> "Buy low IV, sell high IV."

---

## The Iron Condor (Neutral)

**Setup:**
- Sell OTM Put (lower strike)
- Buy further OTM Put (protection)
- Sell OTM Call (higher strike)
- Buy further OTM Call (protection)

**Profit:** If stock stays between strikes
**Loss:** If stock breaks either side

**Best when:**
- IV is high
- Stock is range-bound
- You have a directional opinion

---

## The Iron Butterfly (Directional)

**Setup:**
- Sell ATM Call + Put
- Buy OTM Call + Put (wings)

**Profit:** If stock lands at exact strike
**Max loss:** Width of wings

---

## Vertical Spreads

### Bull Call Spread
```
Buy $100 Call $5
Sell $105 Call $2
Net Debit: $3
```

**Max Risk:** $3 (net paid)
**Max Reward:** $5 - $3 = $2 per share

### Bear Put Spread
```
Buy $100 Put $5
Sell $95 Put $2
Net Debit: $3
```

**Max Risk:** $3
**Max Reward:** $5 - $3 = $2 per share

---

## The Wheel Strategy

### Step-by-Step

1. **Sell CSP** (Cash Secured Put) on stock you want to own
2. **If assigned:** You own the stock → go to step 3
3. **Sell CC** (Covered Call) above cost basis
4. **If called away:** You have profit → go back to step 1
5. **If not called:** Collect premium → roll or let expire

**Cycle repeats**

---

## Options on BTC/ETH

### Key Differences from Stocks

1. **Settlement** — Crypto options settle in crypto
2. **Expiry** — Weekly, monthly, quarterly
3. **Style** — European (exercise at expiry only)
4. **Expiration** — Friday 4PM ET
5. **Sizing** — Always calculate in notional value

### Solus Focus: Weekly BTC Options

> "Hypersurface weekly BTC options — strike/direction/invalidation"

**Typical trade:**
- Directional bet on BTC
- 7-day expiry
- Strike selection based on technicals
- Invalidation = stop loss level

---

## Risk Management for Options

### Position Sizing

| Strategy | Risk per Trade |
|----------|---------------|
| Long Options | Max 1-2% of portfolio |
| Spreads | Max 3-5% |
| Wheel | 10-20% (in stock if assigned) |

### Never Do

❌ Buy far OTM options (lottery tickets)
❌ Sell naked options (unlimited risk)
❌ Ignore assignment risk
❌ Trade size based on emotion

---

## Key Rules

1. **Never risk more than you can afford to lose**
2. **Buy premium when IV is low**
3. **Sell premium when IV is high**
4. **Define max loss before entering**
5. **Theta is your friend (if selling)**
6. **Gamma is your enemy (if buying)**
7. **Don't fight the trend**
8. **Respect technical levels**

---

## The Options Mindset

> "It's not about being right. It's about making money with defined risk."

- **Defined risk > undefined reward**
- **Consistency > home runs**
- **Survival > performance**
- **Process > outcome**

---

*Options are power. Use them wisely.*
