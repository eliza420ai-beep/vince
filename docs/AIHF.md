# AI Hedge Fund (AIHF)

## What this is

**AI Hedge Fund** is the adversarial committee layer in the three-repo stack (VINCE → Dexter → AIHF). 18 analyst agents modeled after real investing legends (Buffett, Munger, Burry, Ackman, Druckenmiller, Damodaran, + 12 more), each running their own framework against the same tickers. A Risk Manager computes volatility-adjusted position limits. A Portfolio Manager synthesizes a final BUY / SELL / HOLD with confidence and reasoning.

Source: https://github.com/eliza420ai-beep/ai-hedge-fund

This document explains why AIHF is not a "nice addition" — it's the missing structural check that today's losses prove we need — and how to integrate it into VINCE's signal aggregator, Forge, and the paper-to-live gate.

**Read this when:** Scoping the next signal source, designing the pre-trade veto gate, planning Forge's policy candidates, or reviewing why today's paper bot went 0/7.

---

## The burning evidence: why AIHF matters right now

Today (2026-03-11) the paper bot hit 30% accuracy, down 83% on paper. Every trade was a stop-loss. Here's the pattern across all four post-mortems:

| Trade | Leverage | Hold | P&L | Regime | Echo conf | Primary cause |
|---|---|---|---|---|---|---|
| AMZN long | 5x | 114 min | -$50.73 | uncertain | 30% | regime_conflict |
| MSTR long | 5x | 14 min | -$64.69 | uncertain | 40% | regime_conflict |
| BTC long | 10x | 12 min | -$83.12 | uncertain | 40% | sizing_too_aggressive |
| CRCL long | 5x | 93 min | -$75.62 | uncertain | 40% | regime_conflict |

Every single trade: `regime: uncertain`. Every single trade: Echo at 30-40% confidence (barely above floor). Every single trade: budget breach (realized > planned). The day report captures the outcome: "wait for ADX break above 20 — range-bound until conviction returns."

This is not a coincidence. VINCE's signal aggregator fired longs because crypto micro-signals (CoinGlass funding, Binance taker flow, fear index 15 = extreme fear bounce setup) gave a directional edge. But there was no external macro-level gate asking: "Is this actually a conviction environment, or are we longing into chop?"

AIHF autoresearch's first session finding was literally: "Disable longing/shorting in unfavorable regimes is the single biggest Sharpe improvement (+1.68 from baseline)." VINCE opened 4 longs in unfavorable regime. AIHF would have been the veto gate.

---

## What AIHF does

### Layer 1: The Committee

18 analysts run in parallel via LangGraph on any ticker you give them. Each has a distinct philosophy:

**Legend agents (12):** Buffett (moats + fair value), Munger (quality compounders), Burry (contrarian deep value), Ackman (catalyst-driven), Damodaran (story + disciplined DCF), Graham (margin of safety), Cathie Wood (disruptive growth), Lynch (ten-baggers), Fisher (scuttlebutt), Pabrai (asymmetric bets), Druckenmiller (global macro), Jhunjhunwala (emerging macro).

**Quant agents (6):** Technical Analyst (trend, momentum, mean reversion), Fundamentals Analyst (profitability, health, ratios), Growth Analyst (revenue acceleration), Valuation Analyst (DCF, comparables), Sentiment Analyst (insider trades, institutional flows), News Sentiment Analyst (news-driven shifts).

Each outputs `bullish / bearish / neutral` with a confidence score and explicit reasoning. Risk Manager computes volatility-adjusted position limits and correlation penalties. Portfolio Manager synthesizes BUY / SELL / SHORT / COVER / HOLD with quantity recommendation.

**For today's trades, this is what the committee would have said:**
- **AMZN at $215 in uncertain macro:** Damodaran DCF says fair value, Graham says P/E stretched, Druckenmiller says macro regime uncertain = wait, Technical Analyst says ADX < 20 = no trend. Likely result: HOLD or mixed signal = no trade.
- **MSTR at $140:** This is leveraged BTC exposure. Munger and Burry would flag the "leverage on leverage" risk, the Valuation Analyst would struggle to compute intrinsic value for a Bitcoin proxy. Result: likely neutral or sell from most agents.
- **CRCL at $115:** Semi-cap, lower liquidity. Graham would require higher margin of safety. Sentiment Analyst would flag sparse institutional activity. Result: likely neutral with high uncertainty flag.
- **BTC via 10x perps:** No direct fundamental analysis (AIHF is equity-focused), but IBIT proxy + Druckenmiller macro + Technical Analyst would contribute regime context. ADX < 20 = no trend confirmation = no 10x perps.

### Layer 2: Autoresearch (Autonomous Parameter Optimization)

The same Karpathy-style loop as Forge, but applied to portfolio logic instead of paper bot weights.

First session results: 27 experiments in ~7 minutes, zero LLM calls, zero API cost after the initial signal cache.

| Metric | Baseline | After 27 experiments | Change |
|---|---|---|---|
| Sharpe | -0.79 | +2.22 | +3.01 |
| Sortino | -1.11 | +3.78 | +4.89 |
| Max Drawdown | -18.93% | -5.15% | 13.8pp better |
| Total Return | -6.35% | +49.9% | +56.3pp |

What the AI discovered (in order of impact):
1. **Disable shorting in bull market** — single biggest improvement, Sharpe -0.79 → +1.68
2. **Heavy trend weighting** (0.25 → 0.45) over mean reversion — trend-following dominates in bull regimes
3. **Shorter EMA windows** (8/21/55 → 5/13/34) — faster trend detection for volatile tech
4. **Larger position sizes in confirmed trend** (0.5 → 1.0 POSITION_SIZE_FRACTION)
5. **Boosted low-vol position multiplier** (1.25 → 1.50) — size up in calm, confirmed markets
6. **Shorter ADX period** (14 → 10) — faster trend-strength detection

The deep lesson for VINCE: every autoresearch winner is a regime-aware principle. "Disable shorting in bull" = "don't trade against confirmed regime." The inverse is exactly today's failure mode: opening longs in uncertain/bearish regime without a confirmation gate.

### Layer 3: Hyperliquid Integration (Planned)

Architecture designed for crypto perp integration alongside equities. Scenarios from AIHF's README:

| Regime detected | Equity action | Hyperliquid action |
|---|---|---|
| Capitulation | Reduce equity exposure 20% | Open BTC/ETH short perp as portfolio hedge |
| BTC miner thesis (CORZ, HUT) | Small equity positions | Express conviction via BTC long perp |
| High funding rates on ETH | — | Earn funding by shorting perp while holding spot |
| Strong bearish committee consensus | — | Open short perps with defined stop |

This is the bridge between AIHF's equity framework and VINCE's perps world. When it lands, it closes the crypto coverage gap.

### Layer 4: Tastytrade Daily Options (Experimental)

Maps committee consensus to options strategy selection. When ≥90% confidence bullish → sell put spreads. Mixed → iron condors. High vol regime → widen strikes, reduce size. This connects directly to Solus's strike ritual and theta engine in Dexter — the same conviction thresholds apply.

---

## The structural argument

VINCE self-improves within a closed loop. Thompson Sampling adapts source weights. Bayesian tuning tightens thresholds. ONNX trains on closed trades. Forge mutates policy parameters and keeps winners.

This is powerful — but there's a fundamental risk: the system can self-reinforce its own biases. If VINCE's crypto-native sources consistently say "long" in certain market structures, Thompson Sampling learns those sources are reliable in those structures, and increases their weight. The system becomes more confident, not more correct.

AIHF breaks this loop. It knows nothing about VINCE's signal history. It runs pure fundamental, technical, and quantitative analysis on the same assets from completely independent data (Financial Datasets API, yfinance, earnings, balance sheets, insider activity). When AIHF and VINCE agree, the conviction is externally validated. When they disagree, that gap is where the real signal lives.

The deeper point: VINCE optimizes execution quality. AIHF validates conviction quality. Together they cover both surfaces. Neither alone is sufficient.

---

## Seven integration surfaces

These are ordered by build complexity and Forge phase alignment. Start with surface 1 (zero code) and surface 2 (FastAPI test). Everything else follows.

---

### Surface 1: SOUL.md thesis injection (zero cost, start today)

AIHF already supports `~/.ai-hedge-fund/SOUL.md` and `--thesis /path/to/SOUL.md`. All 18 agents receive the thesis as context before analyzing any ticker.

The moment VINCE's SOUL.md (as expanded in DEXTER.md Surface 1) is written, copy it to `~/.ai-hedge-fund/SOUL.md` and AIHF's committee reasons within the AI infrastructure supply chain thesis — not in a generic vacuum.

Buffett doesn't just look for moats; he looks for moats within the "AI picks-and-shovels" frame. Druckenmiller reads the macro regime against the AI capex cycle. This changes the committee's output from generic investing signals to thesis-aligned signals.

**Action:** After SOUL.md v2 is written (Forge Phase 0), symlink or copy to `~/.ai-hedge-fund/SOUL.md`.

---

### Surface 2: Manual pre-trade AIHF challenge (research habit, start today)

Before the next HIP-3 long, run AIHF manually and record what the committee says. No integration code required.

```bash
# From the AIHF repo
poetry run python src/main.py \
  --tickers AMZN,MSTR,CRCL \
  --analysts-all \
  --show-reasoning \
  --thesis ~/.ai-hedge-fund/SOUL.md
```

Interpret the output by the AIHF README's suggested workflow:
- **Dexter/VINCE includes a name + AIHF is also positive:** good confirmation
- **VINCE signals long + AIHF is strongly negative:** possible problem, investigate
- **VINCE excluded a name + AIHF comes back strongly positive:** most valuable signal — missed opportunity

Post findings to the daily standup signal file as an "AIHF note" comment.

For today's four losses, run this retroactively on AMZN, MSTR, CRCL with historical data pinned to the entry dates. The committee's reading at those times would have told the story clearly.

---

### Surface 3: `AIHFEquity` as a signal source in the aggregator

This is the structural integration: AIHF becomes the 20th named source in VINCE's signal aggregator, alongside CoinGlass, Binance, Deribit, and MarketRegime.

**Why it fits:** `VinceHIP3Service` already exists and returns tokenized equity prices. It just doesn't feed the aggregator. AIHF fills in what HIP-3 needs most: fundamental conviction on the underlying equities.

**Signal source spec:**

```typescript
interface AIHFEquitySignal {
  ticker: string;                    // e.g. "AMZN", "MSTR", "CRCL"
  direction: 'long' | 'short' | 'neutral';
  confidence: number;                // 0-100 (% of committee agreement × avg confidence)
  agreementRate: number;             // 0-1 (fraction of 18 agents in majority direction)
  riskManagerNote: string;           // position size modifier from AIHF Risk Manager
  dominantAgents: string[];          // which agents drove the consensus
  disagreements: string[];           // agents explicitly in minority (signal quality)
  cachedAt: number;                  // timestamp, refresh every 4h
}
```

**Aggregator integration:**
- Source name: `AIHFEquity`
- Default weight: `1.8` — higher than CoinGlass (1.0) because fundamentals are slow-moving and high-conviction when they fire
- Contribution threshold: `agreementRate >= 0.60` (≥ 11 of 18 agents agree)
- Direction mapping: BUY → `long`, SELL → `short`, HOLD / mixed → no signal (neutral)
- Veto gate: if `direction === 'short'` and `agreementRate >= 0.72` and VINCE signal is `long`, append a `bearish` factor with weight `-2.0` (explicit contradiction signal)
- Cache: 4h TTL — fundamentals don't change per-tick; a single API call per 4h per ticker is correct cadence

**FastAPI trigger:** AIHF exposes `POST /api/analyze` via its FastAPI backend. VINCE's `AIHFEquityService` calls this endpoint on cache miss, deserializes the response, and maps to the signal shape above.

```typescript
class AIHFEquityService {
  private cache: Map<string, { signal: AIHFEquitySignal; cachedAt: number }>;
  private readonly TTL = 4 * 60 * 60 * 1000; // 4h

  async getSignal(ticker: string): Promise<AIHFEquitySignal | null> {
    const cached = this.cache.get(ticker);
    if (cached && Date.now() - cached.cachedAt < this.TTL) return cached.signal;
    
    const response = await fetch('http://localhost:8000/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ 
        tickers: [ticker],
        analysts: 'all',
        thesis_path: process.env.AIHF_SOUL_PATH // ~/.ai-hedge-fund/SOUL.md
      })
    });
    // parse and cache
  }
}
```

**Coverage:**
- HIP-3 equities: AMZN, MSTR, CRCL, NVDA, TSLA, PLTR, META, ORCL, COIN, HOOD — full 18-agent analysis
- BTC, ETH, SOL (crypto): partial coverage — Technical Analyst + Sentiment Analyst + News Sentiment Analyst + Druckenmiller macro only (3-4 agents), using IBIT/BITO as proxy for BTC macro analysis
- Hyperliquid (HYPE): no coverage — AIHF doesn't model L1/DEX tokens fundamentally
- Perps-only assets: no coverage — AIHF is equity fundamentals, not crypto micro-structure

**The explicit gap** (document this clearly in code): `AIHFEquity` is silent on crypto-native assets. For BTC/ETH perps, the existing aggregator sources (CoinGlass, Binance, Deribit, liquidation data) remain the primary decision inputs. AIHF is an *additional* signal for equities and equity-adjacent crypto (MSTR, COIN, HOOD).

---

### Surface 4: `AIHFRegimeGate` — daily macro regime read

Separate from the per-ticker signal, run a daily macro regime check using AIHF's Druckenmiller agent + Technical Analyst + Fundamentals Analyst on the broad market (SPY, QQQ, BTC, IBIT).

Output: `{ regime: 'bull' | 'bear' | 'uncertain' | 'capitulation', confidence: number, rationale: string }`

Map to `policies/trading-policy.yaml`:
- `regime: bull` → `risk_size_multiplier: 1.0` (normal sizing)
- `regime: uncertain` → `risk_size_multiplier: 0.5` (half sizing, confirmed trades only)
- `regime: bear` → `risk_size_multiplier: 0.25` (minimal, defensive)
- `regime: capitulation` → `risk_size_multiplier: 0.0` (no new positions, exits only)

This would have prevented all four of today's losses. `regime: uncertain` → half sizing → even if stops hit, the losses would have been $25-40 instead of $50-83. The policy mutation is the downstream effect of what VINCE's existing post-mortems already call for.

Cache: refresh once at 7:00 UTC (before US open). The regime read is a daily input, not a tick input.

---

### Surface 5: AIHF autoresearch winners → Forge policy candidates

This is the most intellectually interesting surface: using AIHF's autoresearch loop to generate policy mutation candidates for Forge.

**The insight:** AIHF autoresearch runs experiments against equity portfolio performance. When it finds a winner — like "disable longing in uncertain regime" or "heavy trend weighting in bull market" — that principle is often regime-aware and generalizes across asset classes.

**The flow:**
1. AIHF autoresearch runs overnight on a basket of HIP-3 names
2. `autoresearch/results.tsv` accumulates winning parameter changes
3. A script parses the winners and extracts regime-aware principles
4. Those principles are formatted as Forge policy candidates in `policies/trading-policy.yaml`
5. Forge tests them against VINCE's closed paper trades (replay loop)
6. Winners are committed, losers are reverted — same ratchet as AIHF itself

**Mapping AIHF parameters to VINCE policy surfaces:**

| AIHF autoresearch finding | VINCE Forge equivalent | Policy file field |
|---|---|---|
| Disable shorting in bull market | Disable new longs when `AIHFRegime = bear/uncertain` | `regime_short_enabled` |
| Heavy trend weighting (0.25→0.45) | Increase `MarketRegime` source weight when ADX > 20 | `source_weight_overrides.MarketRegime` |
| Shorter EMA windows (8/21→5/13) | Reduce recency_decay_halflife when regime is confirmed | `recency_decay_halflife_confirmed` |
| Larger position sizes in confirmed trend | Increase `base_risk_fraction` when `AIHFRegime = bull` | `base_risk_fraction_bull` |
| Boosted low-vol multiplier (1.25→1.50) | Scale position size when `DeribitDVOL < 50` | `low_vol_size_multiplier` |
| Shorter ADX period (14→10) | Add `atr_period` parameter to signal aggregator | `atr_period` |

This is not about copying parameters verbatim. It's about using AIHF's autoresearch as a hypothesis generator and Forge as the validator on VINCE-specific data.

---

### Surface 6: Post-mortem AIHF enrichment

Every post-mortem currently has three agent sections (Echo, Oracle, Solus). Add a fourth: `AIHFCommittee`.

```markdown
### AIHFCommittee

- Lane: 18-agent fundamental + technical challenge
- Run at: [entry timestamp, retroactive]
- Committee result: [BUY/SELL/HOLD] at [agreementRate]% agreement
- Risk Manager note: [position sizing recommendation]
- Divergence from VINCE signal: [agreed/disagreed/neutral]
- Key dissenting agents: [e.g. "Druckenmiller: bearish macro regime; Munger: no quality criteria met"]
```

For today's trades, this can be run retroactively: pin the historical date in AIHF, run the analysis, record the committee's reading. Over 30+ trades, this creates a labeled dataset:
- `aihfAgreementRate` → feature in the feature store
- `aihfDivergence` → `postMortemPrimaryCause` correlates with this
- If `aihfAgreementRate < 0.40` AND `vinceSignal = long` AND `outcome = stop_loss`, that's a training signal: "low AIHF agreement predicts regime_conflict outcome"

After 50+ enriched post-mortems, Forge can use `aihfAgreementRate` as a feature in the ONNX model. This closes the loop: AIHF doesn't just gate trades pre-entry — it generates labels that improve the ML model's predictive accuracy.

---

### Surface 7: Paper-to-live gate with AIHF Risk Manager sizing

From DEXTER.md Surface 7 (paper-to-live execution gate), AIHF is the final confirmation layer before any VINCE paper signal becomes a real Dexter trade.

**Gate requirements for live execution:**
1. `VinceBench >= 4.0` — VINCE's process quality (correct procedure, no missing data)
2. `AIHFAgreementRate >= 0.67` (≥ 12/18 committee majority) in same direction as VINCE signal
3. `AIHFRegime != 'bear'` and `AIHFRegime != 'capitulation'`
4. Human-in-the-loop review for the first 20 live trades (machine preview, human approve)

**Position sizing:** Use AIHF's Risk Manager recommendation for the live trade size, not VINCE's Kelly criterion. VINCE's Kelly is calibrated on paper (where there's no slippage, no real liquidity constraints, no funding cost). AIHF's Risk Manager accounts for volatility-adjusted limits and correlation exposure.

The principle: VINCE sizes for learning velocity (smaller positions to maximize trade count for training). AIHF sizes for real capital preservation.

---

## What AIHF cannot do

Document this explicitly to avoid misuse.

**AIHF is blind to:**
- Crypto micro-structure: funding rates, liquidation cascades, OI builds, taker flow — CoinGlass, Binance, and Deribit remain the primary sources for crypto perps
- Hyperliquid-specific dynamics: whale positioning via HL, crowding signals, cross-venue funding arb
- Intraday perps timing: AIHF is 4h+ cadence; it cannot tell you whether to long BTC at 14:44 or 14:52 UTC
- Sentiment dynamics on CT: real-time X pulse, WTT, Camillo social arbitrage — these stay in Echo/Dexter
- Polymarket odds: prediction market edges on near-term events are Oracle's lane
- HYPE and DEX-native tokens: no fundamental framework exists for L1 tokens that aren't equity proxies

**For pure crypto perps (BTC, ETH, SOL, HYPE):** AIHF adds a macro regime sanity check (Druckenmiller via IBIT proxy) but cannot replace the existing signal aggregator. CoinGlass + Binance + Deribit + LiquidationData remain the primary edge.

**For HIP-3 equities (AMZN, MSTR, CRCL, NVDA, TSLA, PLTR):** AIHF is the primary missing layer. The existing aggregator lacks fundamentals entirely for these assets. This is where AIHF's ROI is highest.

---

## Technical implementation guide

### Prerequisites
- Python 3.11+
- Poetry
- Node.js 18+ (for FastAPI backend)
- At least one LLM API key (ANTHROPIC_API_KEY or OPENAI_API_KEY)
- FINANCIAL_DATASETS_API_KEY (required for tickers beyond the free five: AAPL, GOOGL, MSFT, NVDA, TSLA)

### Setup

```bash
git clone https://github.com/eliza420ai-beep/ai-hedge-fund.git
cd ai-hedge-fund
poetry install
cp .env.example .env
# Add LLM key and FINANCIAL_DATASETS_API_KEY
mkdir -p ~/.ai-hedge-fund
cp /Users/macbookpro16/vince/knowledge/teammate/SOUL.md ~/.ai-hedge-fund/SOUL.md
```

### Run AIHF against today's post-mortem tickers

```bash
# Second-opinion on today's losses
poetry run python src/main.py \
  --tickers AMZN,MSTR,CRCL \
  --analysts-all \
  --show-reasoning \
  --start-date 2026-03-10 \
  --end-date 2026-03-11

# HIP-3 Hyperliquid sleeve validation (from AIHF README workflow 2)
poetry run python src/main.py \
  --tickers TSM,NVDA,PLTR,ORCL,COIN,HOOD,CRCL,TSLA,META,MSFT,AMZN,GOOGL,GLD,SLV,SPY,SMH \
  --analysts-all --show-reasoning

# Excluded names check — which names did AIHF like that VINCE didn't trade?
poetry run python src/main.py \
  --tickers NVDA,AVGO,MRVL,ARM,AAPL,MU,NFLX,AMD,MSTR \
  --analysts-all --show-reasoning
```

### Start AIHF's FastAPI backend (for service integration)

```bash
cd app && bash run.sh
# FastAPI available at http://localhost:8000
```

### Run autoresearch (overnight, Forge Phase 2)

```bash
# Cache price data first (one-time, ~30 seconds)
poetry run python -m autoresearch.cache_signals --prices-only

# Run baseline
poetry run python -m autoresearch.evaluate

# Point Claude Code or Cursor Agent at autoresearch/program.md
# "Open autoresearch/program.md and follow the instructions"
# Let it run overnight. Git log shows all committed improvements.
```

---

## Metric alignment

The three optimization surfaces in the stack each optimize a different metric. They are complementary, not competing.

| Layer | Metric | Surface | Cadence |
|---|---|---|---|
| VINCE Forge | `causal_uplift × sharpe × brier_calibration` | Paper bot source weights, policy thresholds | 48h replay cycle |
| AIHF autoresearch | `val_sharpe` on equity backtester | Portfolio logic: indicator windows, strategy weights, risk bands | Overnight, continuous |
| Paper-to-live gate | `alpha vs BTC, SPY, GLD` (via Dexter) | Real broker execution sizing | Quarterly attribution |

The meta-metric that ties all three: **conviction quality × execution quality**. VINCE measures execution quality (VinceBench, feature store, ONNX). AIHF measures conviction quality (committee agreement rate, Risk Manager approval). The paper-to-live gate requires both to be high before real capital moves.

---

## Implementation roadmap (Forge phase alignment)

### Phase 0 (now — before Forge PR)

1. Set up AIHF repo locally, confirm FastAPI backend starts
2. Run manual AIHF analysis on today's four post-mortem tickers with historical dates
3. Record committee findings as retroactive "AIHF notes" in each post-mortem
4. Write SOUL.md v2 (separate task, see DEXTER.md); symlink to `~/.ai-hedge-fund/SOUL.md`
5. Run the AIHF README's three suggested workflows on the current VINCE watchlist

### Phase 1 (Forge Phase 0-1: policies live, basic Forge loop)

6. Add `AIHF_API_URL` and `AIHF_SOUL_PATH` to `.env.example`
7. Build `AIHFEquityService` with 4h cache and FastAPI client
8. Register `AIHFEquity` as aggregator source (weight 1.8, threshold 0.60 agreement)
9. Add `AIHFRegimeGate` daily policy check (refresh 07:00 UTC)
10. Add AIHF section to post-mortem template (retroactive + live)

### Phase 2 (Forge Phase 1-2: Forge replay loop, ONNX training)

11. Add `aihfAgreementRate` and `aihfDirection` to feature store schema
12. Run AIHF autoresearch overnight on HIP-3 sleeve; parse `results.tsv` for regime-aware winners
13. Map 3-5 AIHF autoresearch winners to Forge policy candidates in `policies/trading-policy.yaml`
14. Forge tests those candidates in replay loop; commit winners
15. ONNX model retrains with `aihfAgreementRate` as feature; validate improvement

### Phase 3 (Forge Phase 2-3: paper-to-live gate)

16. Implement AIHF Risk Manager sizing as live position size calculator
17. Build paper-to-live gate: VinceBench ≥ 4.0 + AIHF ≥ 12/18 + not bear/capitulation regime
18. Human-in-the-loop review interface (Discord DM to Otaku with approve/reject)
19. First 20 live trades: machine preview → human approve → Otaku executes
20. Quarterly: run AIHF backtester on same assets VINCE traded; compare vs Dexter real portfolio

---

## Open questions

**AIHF coverage for HIP-3 assets beyond the free five:** FINANCIAL_DATASETS_API_KEY unlocks arbitrary tickers. Cost to run AIHF on 20 HIP-3 assets daily: ~20 tickers × 18 agents × ~$0.01/call ≈ $3.60/day. At 4h cache, this is $0.90/day for live VINCE use. Acceptable.

**AIHF and Hyperliquid timing mismatch:** HIP-3 equities on Hyperliquid trade ~24h with varying liquidity. AIHF's signal is daily-cadence (not session-aware). For now, the 4h cache is appropriate — don't treat AIHF as an intraday signal.

**How to weight AIHF disagreement vs VINCE signal:** If VINCE says long with 75% confidence and AIHF says short with 67% agreement, the trade should be gated or sized down, not simply added together. The veto gate (-2.0 weight for strong AIHF contradiction) is the right mechanism, but the threshold needs calibration against 50+ trades.

**Autoresearch parameter transfer validity:** AIHF autoresearch optimizes for a US equity backtesting window (Jan 2025 – Mar 2026, AAPL/NVDA/MSFT/GOOGL/TSLA). VINCE's paper bot trades crypto-adjacent equities on Hyperliquid with different liquidity profiles. The principles transfer; the exact parameter values may not. Forge validates each transferred candidate before committing.

**Tastytrade options vs Solus strike ritual:** AIHF's options module maps committee consensus to strategy selection. Solus's strike ritual maps vol surface + regime to entry point. These are complementary: AIHF decides *which* strategy (credit spread, iron condor), Solus decides *which* strike. A Dexter orchestration layer that calls both before any options entry is the correct architecture.

---

## Related docs

- [DEXTER.md](./DEXTER.md) — Dexter integration overview; AIHF is DEXTER.md's "AIHF as adversarial signal filter" surface (Surface 4) plus expanded
- [docs/VINCE.md](./VINCE.md) — VINCE agent brief; signal aggregator capabilities and gaps
- [src/plugins/plugin-vince/SIGNAL_SOURCES.md](../src/plugins/plugin-vince/SIGNAL_SOURCES.md) — All current signal sources; `AIHFEquity` will be added here
- [.cursor/plans/forge_prd_6613d167.plan.md](../.cursor/plans/forge_prd_6613d167.plan.md) — Forge PRD; AIHF autoresearch winners feed Forge policy candidates in Phase 2
- [docs/FEATURE-STORE.md](./FEATURE-STORE.md) — Feature store schema; `aihfAgreementRate` and `aihfDirection` are new columns
- [docs/TRADING_RUNTIME_CONTRACT.md](./TRADING_RUNTIME_CONTRACT.md) — Runtime contract; AIHF is a producer (signal source), never an executor
- AIHF repo: https://github.com/eliza420ai-beep/ai-hedge-fund

---

*One team, one dream. VINCE executes the process. AIHF challenges the conviction. Forge learns from both.*
