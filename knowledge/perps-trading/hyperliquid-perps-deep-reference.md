# Hyperliquid Perpetuals — Deep Reference

> Vince's definitive perps mechanics reference. Sourced from official Hyperliquid documentation.
> Last updated: 2026-02-17

---

## Platform Architecture

- **Hyperliquid L1**: Custom blockchain, HyperBFT consensus (Hotstuff-derived)
- **HyperCore**: Fully onchain perps + spot order books. Every order, cancel, trade, liquidation settled onchain with one-block finality
- **Throughput**: 200k orders/second (actively improving)
- **HyperEVM**: General-purpose EVM smart contracts on the same chain
- **Markets**: 100+ perpetual contracts, 3x–40x max leverage depending on asset

---

## Contract Specifications

| Parameter           | Value                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| Instrument          | Linear perpetual (no expiration)                                        |
| Contract size       | 1 unit of underlying spot asset                                         |
| Collateral          | USDC                                                                    |
| Oracle denomination | USDT (technically quanto)                                               |
| Exceptions          | PURR-USD, HYPE-USD use USDC oracle (Hyperliquid spot as primary source) |
| Funding interval    | **Hourly** (not 8h like CEXs)                                           |
| Position limits     | None                                                                    |
| Account model       | Per-wallet, cross or isolated margin                                    |

### Maximum Order Values

| Max Leverage | Max Market Order | Max Limit Order |
| ------------ | ---------------- | --------------- |
| ≥25x         | $15,000,000      | $150,000,000    |
| 20–24x       | $5,000,000       | $50,000,000     |
| 10–19x       | $2,000,000       | $20,000,000     |
| <10x         | $500,000         | $5,000,000      |

---

## Margin System

### Cross vs Isolated

- **Cross margin** (default): Shares collateral across all cross positions. Maximum capital efficiency. If one position liquidates, ALL cross positions are at risk
- **Isolated margin**: Collateral constrained to single asset. Liquidation doesn't affect other positions. Can add/remove margin after opening
- **Isolated-only**: Some assets (including all HIP-3). Margin cannot be removed; proportionally returned as position closes

### Initial Margin & Leverage

- Leverage: any integer from 1 to asset max
- Required margin: `position_size × mark_price / leverage`
- Leverage can be **increased** without closing (cannot decrease without reducing position)
- Unrealized PnL automatically becomes available margin for cross positions

### Maintenance Margin

Maintenance margin = half of initial margin at max leverage:

| Max Leverage | Maintenance Margin |
| ------------ | ------------------ |
| 40x          | 1.25%              |
| 20x          | 2.5%               |
| 10x          | 5%                 |
| 3x           | 16.7%              |

### Transfer Margin Requirements

Can withdraw unrealized PnL, but remaining margin must satisfy:

```
transfer_margin_required = max(initial_margin_required, 0.1 × total_position_value)
```

Remaining margin must be ≥10% of total notional AND meet initial margin requirement.

### Margin Tiers (Mainnet)

| Asset                              | Tier 1 Notional | Max Lev | Tier 2 Notional | Max Lev |
| ---------------------------------- | --------------- | ------- | --------------- | ------- |
| BTC                                | 0–150M          | 40x     | >150M           | 20x     |
| ETH                                | 0–100M          | 25x     | >100M           | 15x     |
| SOL                                | 0–70M           | 20x     | >70M            | 10x     |
| XRP                                | 0–40M           | 20x     | >40M            | 10x     |
| HYPE, DOGE, PEPE, SUI, TRUMP, etc. | 0–20M           | 10x     | >20M            | 5x      |
| OP, ARB, LDO, TON, MKR, etc.       | 0–3M            | 10x     | >3M             | 5x      |

---

## Funding Rate Mechanics

### Core Formula

Funding paid **every hour** (1/8 of computed 8h rate per hour):

```
F = avg_premium_index(P) + clamp(interest_rate - P, -0.0005, 0.0005)
```

- **Interest rate**: Fixed 0.01% per 8h → 0.00125%/hour → 11.6% APR (paid to shorts)
- **Premium**: Sampled every 5 seconds, averaged over the hour
- **Premium formula**: `impact_price_difference / oracle_price`
- **Impact price difference**: `max(impact_bid - oracle, 0) - max(oracle - impact_ask, 0)`
- **Impact bid/ask**: Average execution price to trade `impact_notional_usd`
  - BTC/ETH: $20,000
  - All others: $6,000
- **Funding cap**: ±4%/hour (much less aggressive than CEX caps)
- **Payment**: `position_size × oracle_price × funding_rate` (uses oracle price, NOT mark price)

### Funding Interpretation for Trading

| Signal           | Meaning                                     |
| ---------------- | ------------------------------------------- |
| Positive funding | Longs pay shorts → market net long/bullish  |
| Negative funding | Shorts pay longs → market net short/bearish |
| Spike >0.05%/8h  | Crowded trade signal                        |
| Sustained high   | Strong trend OR imminent reversal           |

- Historical funding informs Solus's options strike selection (Friday ritual)

---

## Order Types

1. **Market** — Immediate execution at current price
2. **Limit** — Execute at limit price or better
3. **Stop Market** — Market order triggered at stop price (long triggers above mid, short below)
4. **Stop Limit** — Limit order triggered at stop price
5. **Take Market** — Market order triggered (long triggers below mid, short above)
6. **Take Limit** — Limit order triggered
7. **Scale** — Multiple limit orders across a price range (grid)
8. **TWAP** — Split into 30-second intervals, max 3% slippage per suborder. Catches up if behind (up to 3x normal suborder size)

### Order Options

- Reduce Only, GTC, Post Only (ALO), IOC
- TP/SL: Auto market orders at trigger price, configurable amount and limit price

---

## Liquidation Mechanics

### Process

1. Account equity falls below maintenance margin
2. **Step 1**: Market orders sent to book for full position size. If filled (or partially) and maintenance met → remaining collateral returned
3. **Step 2**: If equity < 2/3 maintenance margin without successful book liquidation → **backstop liquidation** via Liquidator Vault (part of HLP)

### Backstop Rules

- **Cross backstop**: ALL cross positions + margin transferred to liquidator. User ends with **zero equity**
- **Isolated backstop**: Only that position + margin transferred. Cross positions untouched
- **No clearance fee** (unlike CEXs) — all flow goes to HLP community
- **Partial liquidation**: Positions >$100k → only 20% liquidated per block, 30-second cooldown

### Liquidation Price Formula

```
liq_price = price - side × margin_available / position_size / (1 - l × side)
```

Where `l = 1 / maintenance_leverage`.

### Liquidation Price Gotchas

- **Cross margin**: Leverage setting doesn't change liq price (just allocates more collateral)
- **Isolated margin**: Leverage setting DOES change liq price
- Funding payments shift liq price over time
- Other cross positions' unrealized PnL affects cross liq price

---

## Auto-Deleveraging (ADL)

Last resort solvency guarantee:

- Triggered when account value goes **negative**
- Opposite-side profitable traders are force-closed
- **Ranking**: `(mark_price / entry_price) × (notional_position / account_value)` — most profitable + most leveraged first
- Closed at previous mark price against underwater user
- **Invariant**: Users with no open positions NEVER socialize losses

---

## Hyperps (Pre-Launch Perps)

- Trade like perps but **no underlying spot oracle required**
- Funding based on 8h exponentially-weighted moving average of mark prices (not spot)
- Used for pre-launch tokens before CEX spot listing
- Convert to vanilla perps once listed on Binance/OKX/Bybit spot
- Mark price capped at 3x the 8h EMA (1.5x median external perp price if external listings exist)
- Oracle capped at 4x one-month average mark price (manipulation safeguard)
- **Key**: Funding heavily incentivizes counter-momentum — if price pumps, funding crushes longs

---

## Fee Structure

### Perps Tiers (Base Rate)

| Tier | 14d Volume | Taker  | Maker  |
| ---- | ---------- | ------ | ------ |
| 0    | Any        | 0.045% | 0.015% |
| 1    | >$5M       | 0.040% | 0.012% |
| 2    | >$25M      | 0.035% | 0.008% |
| 3    | >$100M     | 0.030% | 0.004% |
| 4    | >$500M     | 0.028% | 0.000% |
| 5    | >$2B       | 0.026% | 0.000% |
| 6    | >$7B       | 0.024% | 0.000% |

### HYPE Staking Discounts

| HYPE Staked | Discount | Tier     |
| ----------- | -------- | -------- |
| >10         | 5%       | Wood     |
| >100        | 10%      | Bronze   |
| >1,000      | 15%      | Silver   |
| >10,000     | 20%      | Gold     |
| >100,000    | 30%      | Platinum |
| >500,000    | 40%      | Diamond  |

### Fee Destination

- ALL fees → community: HLP, assistance fund, deployers
- Assistance fund converts fees to HYPE and **burns** them (deflationary)
- Zero team/insider fee extraction

---

## Price Indices

- **Oracle**: Weighted median of CEX spot prices, weighted by exchange liquidity
- **Mark price**: Combination of oracle + order book state → more robust than single price
- **Usage**: Liquidations use mark price; funding calculations use oracle price

---

## Vince Context

- **Owns**: Live funding data, OI analysis, volume metrics, funding rate interpretation
- **Paper trading scope**: BTC, ETH, SOL, HYPE on 1h–2d timeframes
- **Solus feed**: Funding/OI/sentiment every Friday for options strike ritual
- **Key signals**: Funding spikes, OI divergence from price, liquidation cascades, order book depth changes
