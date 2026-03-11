# Paper Trading Bot Algorithm — Deep Reference

> **Definitive reference** for how the Sentinel paper trading bot makes decisions.
> Covers architecture, signal aggregation, risk management, position sizing, exits, ML integration, and every threshold/weight in the system.

---

## Table of Contents

1. [Paper Bot Architecture](#1-paper-bot-architecture)
2. [Signal Aggregation Logic](#2-signal-aggregation-logic)
3. [Signal Thresholds](#3-signal-thresholds)
4. [Risk Management](#4-risk-management)
5. [Position Sizing](#5-position-sizing)
6. [Aggressive Mode](#6-aggressive-mode)
7. [Trading Goals / KPI System](#7-trading-goals--kpi-system)
8. [Exit Logic](#8-exit-logic)
9. [Fee Model](#9-fee-model)
10. [Slippage Model](#10-slippage-model)
11. [Session Awareness](#11-session-awareness)
12. [WTT Integration](#12-wtt-whats-the-trade-integration)
13. [Signal Similarity](#13-signal-similarity)
14. [ML-Enhanced Decision Flow](#14-ml-enhanced-decision-flow)

---

## 1. Paper Bot Architecture

### Core Services

| Service File | Responsibility |
|---|---|
| `vincePaperTrading.service.ts` | **Main loop** — orchestrates the entire trading cycle on a 60-second interval |
| `vincePositionManager.service.ts` | **Position lifecycle** — entry execution, position tracking, exit execution, partial closes |
| `vinceRiskManager.service.ts` | **Risk gates** — pre-trade checks, exposure limits, circuit breakers, cooldowns |
| `signalAggregator.service.ts` | **Signal collection** — gathers 15+ signal sources, weights them, produces aggregated signal |
| `vinceFeatureStore.service.ts` | **ML data pipeline** — records features at entry/exit for model training |
| `vinceTradeJournal.service.ts` | **Trade logging** — records every trade with full context for review and improvement |

### Main Loop Flow (every 60 seconds)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN LOOP (60s interval)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SIGNAL CHECK                                                 │
│     └─ Collect signals from 15+ sources (12s timeout each)      │
│                                                                  │
│  2. SIGNAL AGGREGATION                                           │
│     └─ Weight sources → produce AggregatedTradeSignal            │
│     └─ direction, strength, confidence, confirming/conflicting   │
│                                                                  │
│  3. RISK GATES                                                   │
│     └─ Check exposure limits, daily loss, drawdown               │
│     └─ Check cooldown timers                                     │
│     └─ Circuit breaker evaluation                                │
│                                                                  │
│  4. ML QUALITY CHECK                                             │
│     └─ ONNX model predicts profitable probability                │
│     └─ Below 0.4 → skip trade                                   │
│     └─ Above 0.7 → boost confidence +10                         │
│                                                                  │
│  5. SIGNAL SIMILARITY CHECK                                      │
│     └─ Reject if too similar to a recent signal                  │
│                                                                  │
│  6. POSITION SIZING                                              │
│     └─ Kelly Criterion (half-Kelly)                              │
│     └─ Drawdown, volatility, session adjustments                 │
│                                                                  │
│  7. ENTRY                                                        │
│     └─ Execute paper trade with calculated size & leverage       │
│     └─ Set SL/TP levels                                         │
│                                                                  │
│  8. POSITION MANAGEMENT (ongoing)                                │
│     └─ Monitor SL/TP hits                                        │
│     └─ Trailing stop activation                                  │
│     └─ Partial profit taking                                     │
│     └─ Max age expiry (48h)                                      │
│     └─ Signal flip detection                                     │
│                                                                  │
│  9. EXIT                                                         │
│     └─ Close position, calculate PnL (net of fees + slippage)   │
│                                                                  │
│ 10. FEATURE STORE                                                │
│     └─ Record entry/exit features for ML training                │
│                                                                  │
│ 11. JOURNAL                                                      │
│     └─ Log trade with full context, reasons, outcome             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Signal Aggregation Logic

### Collection

- **15+ signal sources** are collected each cycle
- Each source has a **12-second timeout** — if it doesn't respond, it's skipped
- Each source produces:
  - `direction`: `long` | `short` | `neutral`
  - `strength`: 0–100 (how strong the signal is)
  - `confidence`: 0–100 (how confident the source is in its reading)

### DEFAULT_SOURCE_WEIGHTS

These weights are defined in the dynamic config and determine how much each source contributes to the final aggregated signal:

| Source | Weight | Category |
|---|---|---|
| `technical` | **1.5** | Technical Analysis |
| `orderflow` | **1.8** | Order Flow / Market Microstructure |
| `momentum` | **1.2** | Momentum Indicators |
| `volatility` | **1.0** | Volatility Regime |
| `sentiment` | **0.8** | Market Sentiment |
| `funding` | **1.3** | Funding Rate |
| `liquidation` | **1.4** | Liquidation Levels |
| `correlation` | **0.7** | Cross-Asset Correlation |
| `onchain` | **0.6** | On-Chain Metrics |
| `news` | **0.5** | News / Headlines |
| `whale` | **1.1** | Whale Activity |
| `options` | **1.2** | Options Flow (GEX/DEX/Skew) |
| `regime` | **1.0** | Market Regime Detection |
| `microstructure` | **1.3** | Microstructure (spread, depth) |
| `ml_forecast` | **1.5** | ML Price Forecast |
| `wtt` | **1.6** | WTT (What's the Trade) Pick |

**Key observations:**
- **Order flow (1.8)** is the heaviest weight — the bot trusts actual market flow most
- **WTT (1.6)**, **technical (1.5)**, and **ML forecast (1.5)** are next highest
- **News (0.5)** and **on-chain (0.6)** are lowest — too noisy/lagging for short-term trades
- **Liquidation (1.4)**, **funding (1.3)**, and **microstructure (1.3)** are high — these are direct market-mechanics signals

### Aggregation Process

```
For each source that responded:
  1. Multiply source strength × source weight
  2. Multiply source confidence × source weight
  3. Track direction votes (long/short/neutral)

Final AggregatedTradeSignal:
  direction    = majority vote (weighted by strength × weight)
  strength     = weighted average of all source strengths
  confidence   = weighted average of all source confidences
  confirmingCount   = # sources agreeing with majority direction
  conflictingCount  = # sources disagreeing
  supportingReasons = list of reasons from confirming sources
  conflictingReasons = list of reasons from conflicting sources
```

### Source Breakdown

The `sourceBreakdown` field tracks per-category statistics:
- Which sources fired and what they said
- Per-source strength, confidence, direction
- Used for post-trade analysis and weight bandit optimization

---

## 3. Signal Thresholds

From `paperTradingDefaults.ts` — the `SIGNAL_THRESHOLDS` configuration:

### Standard Thresholds (Learning Mode)

| Threshold | Value | Description |
|---|---|---|
| `MIN_STRENGTH` | **40** | Minimum aggregated signal strength to consider a trade |
| `MIN_CONFIDENCE` | **35** | Minimum aggregated confidence to consider a trade |
| `MIN_CONFIRMING` | **3** | Minimum number of sources that must agree on direction |

### Strong Signal Override

| Threshold | Value | Description |
|---|---|---|
| `STRONG_STRENGTH` | **55** | If strength ≥ 55 AND confidence ≥ HIGH_CONFIDENCE... |
| `HIGH_CONFIDENCE` | **55** | ...then only 2 confirming sources are needed |
| `MIN_CONFIRMING_WHEN_STRONG` | **2** | Reduced confirming requirement for strong signals |

### Decision Logic

```
IF strength >= 40 AND confidence >= 35:
    IF confirmingCount >= 3:
        → TRADE ELIGIBLE
    ELIF strength >= 55 AND confidence >= 55 AND confirmingCount >= 2:
        → TRADE ELIGIBLE (strong signal override)
    ELSE:
        → SKIP (insufficient confirmation)
ELSE:
    → SKIP (below minimum thresholds)
```

**Why "Learning Mode"?** These thresholds are intentionally lower than production would use. The goal is to take more trades to generate ML training data, then tighten thresholds as the model improves.

---

## 4. Risk Management

From `DEFAULT_RISK_LIMITS` in the risk manager configuration:

### Position Limits

| Parameter | Normal Mode | Aggressive Mode |
|---|---|---|
| `maxPositionSizePct` | **10%** of portfolio | **50%** of portfolio |
| `maxTotalExposurePct` | **30%** total across all positions | **60%** total |
| `maxLeverage` | **5x** | **40x** |

### Circuit Breakers

| Parameter | Value | Behavior |
|---|---|---|
| `maxDailyLossPct` | **5%** | Stop trading for the day if daily loss exceeds 5% of portfolio |
| `maxDrawdownPct` | **15%** | Stop trading entirely if drawdown from peak exceeds 15% |
| `cooldownAfterLossMs` | **1,800,000** (30 min) | Wait 30 minutes after a losing trade before entering again |

**Aggressive mode exception:** `cooldownAfterLossMs` = **0** (no cooldown). Rationale: more trades = more ML training data, and paper money isn't real.

### Pre-Trade Risk Gate Checks

Before every trade entry, the risk manager validates:

1. **Exposure check** — would this trade push total exposure above maxTotalExposurePct?
2. **Position size check** — is this position larger than maxPositionSizePct?
3. **Leverage check** — does calculated leverage exceed maxLeverage?
4. **Daily loss check** — has daily loss already hit the circuit breaker?
5. **Drawdown check** — has drawdown hit the circuit breaker?
6. **Cooldown check** — are we still in cooldown from a recent loss?

If ANY gate fails, the trade is rejected with a reason logged.

---

## 5. Position Sizing

### Kelly Criterion (Primary Method)

The bot uses **half-Kelly** (Kelly fraction × 0.5) for position sizing:

```
Kelly % = (win_rate × avg_win / avg_loss - (1 - win_rate)) / (avg_win / avg_loss)
Half-Kelly = Kelly% × 0.5
```

| Parameter | Value |
|---|---|
| Kelly fraction | **0.5** (half-Kelly) |
| Minimum trades for reliable Kelly | **10** |
| Max Kelly leverage | **5x** |
| Min Kelly leverage | **1x** |

### Fallback (< 10 trades)

When insufficient trade history exists:

| Parameter | Value |
|---|---|
| Assumed win rate | **50%** |
| Assumed W/L ratio | **1.2** |

### Leverage Adjustments

#### By Drawdown

| Current Drawdown | Leverage Multiplier |
|---|---|
| ≥ 15% | **0.25x** (minimal sizing) |
| ≥ 10% | **0.5x** |
| ≥ 5% | **0.75x** |
| < 5% | **1.0x** (full sizing) |

#### By Volatility (DVOL Index)

| DVOL Level | Leverage Multiplier | Rationale |
|---|---|---|
| > 80 | **0.7x** | Extreme vol — reduce size significantly |
| > 60 | **0.85x** | High vol — reduce modestly |
| ≤ 40 | **1.0x** | Normal/low vol — full size |

#### By Trading Session

| Session | Leverage Adjustment |
|---|---|
| Off-hours | **Max 2x** leverage cap |
| EU/US overlap | **1.2x** boost |
| Weekend | **0.8x** reduction |
| Asia / Europe / US (normal hours) | **1.0x** (no adjustment) |

#### By Progress Toward Daily Target

| Progress Status | Leverage Adjustment |
|---|---|
| Behind daily target | **1.1x** boost (try to catch up) |
| Far ahead (> 150% of daily target) | **0.8x** reduction (protect gains) |
| On track | **1.0x** (no adjustment) |

### Final Position Size Calculation

```
base_leverage = half_kelly_leverage
adjusted = base_leverage
         × drawdown_multiplier
         × volatility_multiplier
         × session_multiplier
         × progress_multiplier

final_leverage = clamp(adjusted, 1.0, maxLeverage)
position_size = portfolio_value × maxPositionSizePct × final_leverage
```

---

## 6. Aggressive Mode

Activated by environment variable: `VINCE_PAPER_AGGRESSIVE=true`

### Purpose

Maximize trade count and PnL for ML data collection while testing high-leverage strategies. Paper money only.

### Leverage by Asset

| Asset | Leverage |
|---|---|
| BTC | **40x** |
| ETH | **10x** |
| SOL | **10x** |
| HYPE | **10x** |

### Trade Parameters

| Parameter | Value |
|---|---|
| Margin per trade | **$1,000** |
| Notional (BTC) | **$40,000** (= $1K × 40x) |
| Take profit target | **$280** per trade |
| Target R:R | **2.5:1** |

### Stop Loss (Dynamic)

| Parameter | Value |
|---|---|
| Minimum SL distance | **0.28%** |
| Maximum SL distance | **0.65%** |
| Minimum ATR multiplier | **0.5** |

The stop loss is dynamically calculated to maintain the target 2.5:1 R:R ratio:
```
SL distance = TP distance / target_RR
SL = clamp(calculated_SL, 0.28%, 0.65%)
```

### Risk Limits (Aggressive)

| Parameter | Value |
|---|---|
| maxPositionSizePct | **50%** |
| maxTotalExposurePct | **60%** |
| maxLeverage | **40x** |
| cooldownAfterLossMs | **0** (no cooldown) |

### Rationale

- No cooldown → more trades → more ML training data
- Higher leverage → larger PnL swings → clearer signal in feature data
- This is paper trading — the risk is to virtual capital only

---

## 7. Trading Goals / KPI System

### Core Targets

| KPI | Target | Derivation |
|---|---|---|
| Monthly profit target | **$10,000** | Business goal |
| Trading days per month | **24** | ~5 days/week × ~5 weeks |
| **Daily target** | **$420** | $10,000 / 24 days |
| Risk per trade | **1.5%** of capital | Conservative enough for longevity |
| Max daily drawdown | **5%** | Circuit breaker threshold |
| Target win rate | **55%** | Achievable with good signals |
| Target R:R ratio | **1.5:1** | Risk $1 to make $1.50 |
| Expected trades/day | **2.5** | ~2-3 trades to hit daily target |

### How KPIs Drive Behavior

- **Progress tracking**: The bot tracks cumulative daily PnL against the $420 target
- **Position sizing adjusts**: Behind target → slight boost (1.1x), far ahead → reduce (0.8x)
- **Circuit breaker**: If daily loss hits 5%, stop trading — tomorrow is another day
- **Trade frequency**: The system aims for 2-3 quality trades, not dozens of marginal ones

### Math Check

```
At $420/day target with 2.5 trades/day:
  → Need ~$168 average profit per trade
  → At 55% win rate and 1.5:1 R:R:
    Winners: 55% × $168 × 1.5 = ~$139 avg contribution
    Losers: 45% × $112 = ~$50 avg loss
    Net per cycle: ~$89 per trade → $222/day
  → Aggressive mode ($280 TP) bridges the gap
```

---

## 8. Exit Logic

### Stop Loss

| Mode | Default SL | Notes |
|---|---|---|
| Normal | **2%** from entry | Standard percentage-based |
| Aggressive | **Dynamic** | Calculated for target R:R (2.5:1) |
| Aggressive range | **0.28% – 0.65%** | Clamped to prevent too tight/wide stops |
| Aggressive ATR min | **0.5 × ATR** | Minimum stop distance in ATR terms |

### Take Profit Targets

#### Normal Mode (Tiered)

| Level | Target | Action |
|---|---|---|
| TP1 | **1.5R** | Take partial profit |
| TP2 | **3.0R** | Take more partial profit |
| TP3 | **5.0R** | Close remaining position |

#### Aggressive Mode

| Level | Target | Action |
|---|---|---|
| TP1 | **$280** | Close full position |

### Trailing Stop

| Parameter | Value |
|---|---|
| Activation | After **1.5R** profit reached |
| Distance | **ATR-based** (dynamic) |
| Behavior | Ratchets up — never moves down |

Once price moves 1.5R in profit, the trailing stop activates. It follows price at an ATR-based distance, locking in profits while allowing the trade room to run.

### Partial Profit Taking

```
At TP1 (1.5R): Close a portion of the position, move SL to breakeven
At TP2 (3.0R): Close another portion, trailing stop on remainder
At TP3 (5.0R): Close everything
```

### Other Exit Conditions

| Condition | Behavior |
|---|---|
| **Max position age** | **48 hours** — force close regardless of PnL |
| **Signal flip** | If aggregated signal flips direction (long→short or vice versa), exit |
| **Liquidation tracking** | Monitor if price approaches theoretical liquidation price |
| **Circuit breaker** | If daily loss limit hit while position is open, close immediately |

---

## 9. Fee Model

All fees simulate realistic exchange costs (modeled on Hyperliquid/Bybit taker fees):

| Parameter | Value |
|---|---|
| Taker fee (per side) | **2.5 basis points** (0.025%) |
| Round-trip fee | **5 basis points** (0.05%) |
| Applied to | **Notional value** of the trade |

### Fee Calculation Example

```
Entry: $40,000 notional × 0.025% = $10.00 fee
Exit:  $40,000 notional × 0.025% = $10.00 fee
Total round-trip: $20.00

For $280 gross profit:
  Net profit = $280 - $20 = $260
```

**All PnL is reported NET of fees.** No trade result in the journal or dashboard shows gross PnL — it's always after fees.

---

## 10. Slippage Model

Simulates realistic execution slippage based on order size:

| Parameter | Value |
|---|---|
| Base slippage | **2 basis points** (0.02%) |
| Size impact | **+2 bps per $10,000** notional |
| Maximum slippage | **20 basis points** (0.20%) |

### Slippage Calculation

```
slippage_bps = base_bps + (notional_size / 10000) × size_impact_bps
slippage_bps = min(slippage_bps, max_slippage_bps)

Example ($40K notional):
  slippage = 2 + (40000/10000) × 2 = 2 + 8 = 10 bps
  slippage cost = $40,000 × 0.10% = $40.00
```

### Total Execution Cost Example ($40K notional)

```
Fees (round-trip):  $20.00 (5 bps)
Slippage (entry):   $20.00 (5 bps estimated, one-way ~10 bps / 2 sides)
Slippage (exit):    $20.00
─────────────────────────────
Total cost:         ~$60.00

Net $280 TP: $280 - $60 = $220 actual profit
```

---

## 11. Session Awareness

### Trading Sessions

| Session | Hours (UTC) | Characteristics |
|---|---|---|
| **Asia** | 00:00 – 08:00 | Lower volume, range-bound |
| **Europe** | 07:00 – 16:00 | Increasing volume, trend starts |
| **US** | 13:00 – 22:00 | Highest volume, biggest moves |
| **EU/US Overlap** | 13:00 – 16:00 | Peak liquidity, strongest trends |
| **Off-hours** | 22:00 – 00:00 | Low volume, choppy |
| **Weekend** | Sat-Sun | Reduced confidence, thin books |

### Session-Based Adjustments

| Condition | Adjustment |
|---|---|
| **EU/US Overlap** | Leverage boost **1.2x** — best conditions for trend following |
| **Off-hours** | Leverage cap **2x** — too thin for high leverage |
| **Weekend** | Confidence reduction **0.8x** — unreliable signals |
| **Major market open** | Boost if trend aligns with open direction |

### Open Window Logic

When a major market opens (London 07:00 UTC, New York 13:00 UTC):
- If the aggregated signal direction aligns with the opening move
- Confidence gets a boost (treated as confirmation)
- This captures the common "open drive" pattern

---

## 12. WTT (What's the Trade) Integration

### WTT Rubric

The WTT system scores trade ideas on four dimensions:

| Dimension | Range | Description |
|---|---|---|
| **Alignment** | 1–5 | How well does this trade align with the macro/regime context? |
| **Edge** | 1–4 | How clear and quantifiable is the edge? |
| **Payoff Shape** | 1–5 | Asymmetry of the risk/reward profile |
| **Timing Forgiveness** | 1–4 | How forgiving is the entry timing? (wide SL = more forgiving) |

### Mapping to Paper Bot Signals

```
WTT Score → Signal Strength:
  total_score = alignment + edge + payoff + timing
  max_possible = 5 + 4 + 5 + 4 = 18
  signal_strength = (total_score / max_possible) × 100

WTT Score → Signal Confidence:
  Based on edge + alignment subscores primarily
  High edge (3-4) + High alignment (4-5) → confidence 70+
```

### Priority System

- The **primary WTT pick** receives priority in signal aggregation
- WTT source weight is **1.6** — one of the highest weights
- If WTT says "BTC long" and other signals are mixed, WTT tips the balance

### Invalidation Tracking

Each WTT pick includes invalidation conditions:
- Price level that would invalidate the thesis
- Time-based expiry for the trade idea
- Condition changes (e.g., "invalid if BTC breaks below $X")

When invalidation triggers, the WTT signal flips to neutral.

### Performance Tracking

WTT performance is tracked separately in the improvement report:
- Win rate of WTT-sourced trades vs. non-WTT
- Average R:R of WTT trades
- How often WTT invalidation conditions save from losses

---

## 13. Signal Similarity

### Purpose

`signalSimilarity.service.ts` prevents the bot from entering multiple trades based on essentially the same market signal. Without this, correlated signals could cause the bot to stack identical bets.

### How It Works

1. **Record**: Every signal that leads to a trade entry is stored with its key features:
   - Asset, direction, source breakdown, strength, confidence
   - Market context (price level, volatility regime, session)

2. **Compare**: Before entering a new trade, the new signal is compared against recent signals:
   - Cosine similarity or feature-distance metric
   - If similarity exceeds threshold → reject as duplicate

3. **Decay**: Older signals have less blocking power — a similar signal from 4 hours ago shouldn't block a fresh one

### Effect

- Prevents correlated double-entries (e.g., "technical says long" + "momentum says long" triggering two separate entries for the same move)
- Forces the bot to wait for genuinely new information before adding exposure
- Reduces overconcentration risk

---

## 14. ML-Enhanced Decision Flow

### Weight Bandit (Multi-Armed Bandit for Source Weights)

The default source weights (Section 2) are starting points. The **weight bandit** optimizes them over time:

```
For each completed trade:
  1. Record which sources contributed and their weights
  2. Record trade outcome (profit/loss, R multiple)
  3. Update bandit arms:
     - Sources that contributed to winning trades → increase weight
     - Sources that contributed to losing trades → decrease weight
  4. Use UCB (Upper Confidence Bound) for exploration vs exploitation
```

This means the bot's source weights **evolve** based on actual performance. A source that consistently leads to winners gets more influence; one that leads to losers gets downweighted.

### ML Signal Quality (ONNX Model)

Before every trade entry, an ONNX model predicts the probability of profitability:

| Parameter | Value | Effect |
|---|---|---|
| `minMLQualityScore` | **0.4** | Below this → **skip trade entirely** |
| `boostMLQualityScore` | **0.7** | Above this → **confidence +10** |
| `mlConfidencePenalty` | **-15** | Applied when score is low but above min |

### ML Decision Flow

```
signal = aggregate_signals()

IF signal passes threshold checks:
    ml_score = onnx_model.predict(signal_features)
    
    IF ml_score < 0.4:
        → SKIP (ML says too risky)
    ELIF ml_score >= 0.7:
        signal.confidence += 10  (ML boost)
    ELIF ml_score < 0.5:
        signal.confidence -= 15  (ML penalty)
    
    IF signal still passes thresholds after ML adjustment:
        → CHECK SIMILARITY → SIZE POSITION → ENTER TRADE
```

### Feature Store Integration

At every trade entry AND exit, the feature store records:

**Entry features:**
- All source signals (direction, strength, confidence)
- Aggregated signal metrics
- Market context (price, volume, volatility, DVOL, funding rate)
- Session info
- Position size and leverage used

**Exit features:**
- PnL (gross and net)
- R-multiple achieved
- Time in position
- Exit reason (TP, SL, trailing, signal flip, max age, etc.)
- Price action during trade

This data feeds back into:
1. Weight bandit optimization
2. ONNX model retraining
3. Similarity prediction

### Similarity Prediction

Using historical trade data, the system can predict expected outcomes for similar signals:

```
new_signal → find K most similar historical signals
           → compute weighted average outcome
           → use as additional input to entry decision

If similar signals historically lost money → reduce confidence
If similar signals historically won → increase confidence
```

---

## Appendix: Complete Decision Flow (End-to-End)

```
Every 60 seconds:
│
├─ 1. Collect signals (15+ sources, 12s timeout each)
│
├─ 2. Aggregate (weighted average using DEFAULT_SOURCE_WEIGHTS)
│      Output: direction, strength, confidence, confirming/conflicting counts
│
├─ 3. Threshold check
│      ├─ strength >= 40? confidence >= 35?
│      ├─ confirming >= 3? (or >= 2 if strong signal)
│      └─ FAIL → skip this cycle
│
├─ 4. Risk gate check
│      ├─ Daily loss < 5%? Drawdown < 15%?
│      ├─ Total exposure < 30% (or 60% aggressive)?
│      ├─ Cooldown expired? (30 min, or 0 in aggressive)
│      └─ FAIL → skip this cycle
│
├─ 5. ML quality check
│      ├─ ONNX predict → probability score
│      ├─ < 0.4 → SKIP
│      ├─ >= 0.7 → confidence +10
│      ├─ < 0.5 → confidence -15
│      └─ Re-check thresholds after adjustment
│
├─ 6. Signal similarity check
│      ├─ Compare against recent trade signals
│      └─ Too similar → SKIP (avoid duplicate bets)
│
├─ 7. Position sizing
│      ├─ Half-Kelly leverage (or fallback)
│      ├─ × drawdown multiplier (0.25x – 1.0x)
│      ├─ × volatility multiplier (0.7x – 1.0x)
│      ├─ × session multiplier (0.8x – 1.2x)
│      ├─ × progress multiplier (0.8x – 1.1x)
│      └─ Clamp to [1x, maxLeverage]
│
├─ 8. Calculate entry levels
│      ├─ Entry price (current + slippage)
│      ├─ Stop loss (2% or dynamic for aggressive R:R)
│      ├─ Take profit (1.5R/3R/5R or $280 aggressive)
│      └─ Apply fee estimates
│
├─ 9. ENTER TRADE
│      ├─ Record in position manager
│      ├─ Log entry features to feature store
│      └─ Journal entry with full context
│
├─ 10. MANAGE POSITION (ongoing, checked each cycle)
│       ├─ Check SL hit → exit at loss
│       ├─ Check TP1 hit → partial close, move SL to breakeven
│       ├─ Check TP2 hit → partial close, activate trailing stop
│       ├─ Check TP3 hit → full close
│       ├─ Trailing stop hit → close remainder
│       ├─ Signal flip → exit
│       ├─ Max age (48h) → force close
│       └─ Liquidation proximity → emergency exit
│
└─ 11. ON EXIT
        ├─ Calculate final PnL (net of fees + slippage)
        ├─ Record exit features to feature store
        ├─ Update weight bandit with trade outcome
        ├─ Journal the complete trade
        ├─ Update daily PnL tracking
        └─ Start cooldown if loss (30 min, 0 aggressive)
```

---

*Last updated: 2026-02-17*
*Source: Sentinel codebase — vincePaperTrading, signalAggregator, vinceRiskManager, vincePositionManager, paperTradingDefaults*
