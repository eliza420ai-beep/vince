# DEXTER

## What this is

**Dexter** is the companion repo to VINCE: a thesis-driven research terminal with real broker execution (tastytrade + Hyperliquid), a 18-agent adversarial challenge layer (AI Hedge Fund), and a portfolio management loop that closes on actual alpha vs BTC, SPY, GLD.

Source: https://github.com/eliza420ai-beep/dexter

This document explains how the two repos fit together, which gaps each fills for the other, and the eight concrete integration surfaces — listed in build order, tied to Forge phases.

**Read this when:** Drafting a v2 PRD, scoping the Echo migration, planning Forge's replay context, or deciding whether a new data source belongs in VINCE or Dexter.

---

## v2 context: why Dexter matters now

The Forge PRD makes three explicit calls about Dexter:

1. **Echo x-researcher → Dexter as a skill** — ECHO's core value (X pulse, WTT, Camillo social arbitrage) is moving to Dexter. Echo becomes a stub in VINCE v2.
2. **The frontend becomes the terminal for a three-repo stack** — VINCE + Dexter + AIHF. Not three independent tools; one recursive stack.
3. **Forge's composite metric will optionally pull Dexter regime + AIHF conviction as replay context** — the autoresearch harness itself depends on Dexter data when the integration lands.

Also from the Forge PRD open questions:

> "SOUL.md expansion for v2 — currently knowledge/teammate/SOUL.md encodes communication style. In v2 it will also encode investment thesis (BTC-core stance, regime preferences, risk tolerance). Forge reads it as thesis context. A separate v2 task should document the new SOUL.md fields before Phase 1."

Dexter's SOUL.md is the model for what VINCE's SOUL.md needs to become. The two files should converge into one shared thesis document.

---

## Gap analysis: what each side brings

### Dexter has; VINCE doesn't

| Dexter capability | Why VINCE needs it |
|---|---|
| Financial Datasets API — fundamentals, filings, insider trades, earnings calendar, P/E | VINCE's HIP-3 signals are pure price/funding. No fundamentals layer exists. |
| Live broker state — tastytrade positions, real P&L, actual options book | Paper stays paper forever without an execution gateway. |
| Hyperliquid account reads (actual holdings, withdrawable balance) | `VinceHIP3Service` only has prices; can't reconcile real positions. |
| SOUL.md investment thesis (conviction tiers, sizing rules, AI infra supply chain layers) | VINCE's SOUL.md currently encodes communication style only. |
| AIHF — 18 analyst agents (Buffett/Munger/Ackman + quant frameworks) challenging positions | VINCE has Thompson Sampling for weight adaptation but zero adversarial challenge. |
| Quarterly attribution vs BTC, SPY, GLD (benchmarks) | VINCE has `data/trade-attribution.jsonl` and post-mortems, but no benchmark comparison layer. |
| Theta engine (scan → preview → roll → repair, policy-gated, venue-split) | Solus does the strike ritual; there's no data-driven scan for optimal entry timing. |
| AutoResearch-MLX for portfolio logic (alpha metric, overnight parameter search) | Forge is the VINCE-side autoresearch; Dexter is the portfolio-side autoresearch. Both need to share winning patterns. |
| Regime labeling with BTC temp-check + IBIT proxy | VINCE's `MarketRegimeService` is derived from price/sentiment; no benchmark-anchored regime signal. |
| THETA-POLICY hard block with venue split enforcement | VINCE has no formal policy document that Forge can mutate and auto-revert. `policies/trading-policy.yaml` is the equivalent but doesn't cover options sizing or no-call rules. |

### VINCE has; Dexter doesn't

| VINCE capability | Why Dexter needs it |
|---|---|
| Multi-agent swarm (ElizaOS, Discord, ASK_AGENT) | Dexter is a terminal — no continuous agent runtime, no inter-agent coordination. |
| Crypto perps signal stack (CoinGlass, Binance, Deribit, liquidations, X sentiment) | Dexter has no crypto perps signal layer; its thesis is equity/BTC. |
| Paper bot with ML feature store (40+ features, Thompson Sampling, ONNX path, VinceBench) | No equivalent decision-quality benchmark in Dexter. |
| Polymarket sentiment as a signal source | Dexter has no prediction market feed. |
| Solus Hypersurface strike ritual (calibration score, Brier tracking) | Dexter's `/hypersurface` is strike advice; it doesn't track calibration over time. |
| StandupSignal (daily agent-generated directional signals feeding the algo) | No equivalent continuous signal generation loop in Dexter. |
| Forge autoresearch on agent prompts, policy thresholds, swarm rules | Dexter's AutoResearch-MLX works on portfolio logic; doesn't touch agent reasoning. |
| VinceBench (decision-quality benchmark scoring process, not just PnL) | Dexter measures only alpha vs benchmarks; no process quality score. |
| Feature store → ONNX training pipeline (signal quality, sizing, TP optimizer) | Dexter has no equivalent ML training pipeline. |
| Camillo social arbitrage lens (behavioral signals before Wall Street prices them) | Dexter's SOUL.md is thesis-first but doesn't have a structured pre-price-in detection layer. |

---

## SOUL.md: the shared thesis primitive

**Current state:** `knowledge/teammate/SOUL.md` in VINCE encodes communication style (brand voice, no-slop rules, tone). Forge reads it for "thesis context" but the thesis isn't actually there yet.

**Dexter's SOUL.md** encodes:
- Investment thesis (AI infrastructure supply chain — 7 layers: chip → foundry → equipment → EDA → power → memory → networking)
- Conviction tiers (Core Compounders vs Cyclical vs Speculative vs Avoid)
- Sizing rules (regime, layer durability, catalyst timing)
- Portfolio architecture (80% BTC core / 10% tastytrade sleeve / 10% Hyperliquid sleeve)
- Recursive rule: "When the evidence conflicts with doctrine, I follow the evidence"

**v2 task:** Merge these. VINCE's SOUL.md should adopt Dexter's investment-thesis fields while keeping VINCE's brand voice fields. One file, one source of truth, read by both repos.

**Fields to add to VINCE's SOUL.md for v2:**

```markdown
## Investment Thesis
[AI infra seven layers — chip, foundry, equipment, EDA, power, memory, networking]

## Conviction Tiers
[Core Compounders: NVDA, ASML, AMAT, LRCX, TSM, ANET, CEG, VRT]
[Cyclical: KLAC, PLTR, CRCL, HOOD, COIN]
[Speculative: MSTR, RIVN]
[Avoid: consumer hardware, ad-driven platforms without AI moat]

## BTC Core Stance
[80% BTC as the primary store. Left curve = perps casino. Mid = stack sats + HIP-3 spot. Right = options income + code.]

## Portfolio Architecture (Three Repos)
[VINCE: paper signals, perps paper bot, signal quality]
[Dexter: real execution (tastytrade + HL), quarterly attribution, AIHF challenge]
[AIHF: adversarial challenge (18 analysts), Sharpe-optimized autoresearch]

## Regime Preferences
[Bull: full size, lean long bias, Core Compounders with covered calls]
[Bear: reduce size, no new longs on speculative, no-call list enforced]
[Volatile: cap position size, avoid Cyclicals until vol drops]

## Sizing Rules
[Regime × layer durability × catalyst timing]
[Hard cap: Core Compounders never sold via covered call (no-call list)]
```

Forge reads this before each overnight run. Dexter reads this before each portfolio suggestion. VINCE agents read this via RAG. Same file, same doctrine.

**Immediate action:** Copy Dexter's SOUL.md to `knowledge/teammate/SOUL.md`. Keep VINCE's brand voice section. Merge both. This is a zero-code change that immediately improves every agent's thesis awareness.

---

## Eight integration surfaces

### Surface 1: SOUL.md sync (Phase 0 — right now)

**What:** Copy Dexter's SOUL.md to `knowledge/teammate/SOUL.md`. Merge with existing VINCE brand voice content. Both repos point at the same thesis.

**Why it matters:** Forge Phase 1 requires SOUL.md to have investment-thesis content. Every VINCE agent (VINCE, Solus, Otaku) gets conviction tier awareness via RAG. WTT alignment improves because Solus's strike ritual now has a thesis filter: "Is this a Core Compounder, Cyclical, or Speculative?" Dexter's portfolio builder and VINCE's paper bot use the same conviction framework.

**How:** One file copy. No plugin, no code. Then add the investment-thesis fields documented above.

**Unlocks:** Forge Phase 1 (reads SOUL.md as thesis context before experiments), Solus calibration improvement (knows no-call list), VINCE WTT framing improvement (Camillo pure-play filter now has conviction tiers).

---

### Surface 2: Echo → Dexter skill migration (Phase 0–1)

**What:** Echo's core value is X pulse, "What's the Trade" generation, Camillo social arbitrage lens, and watchlist research. In v2, Echo is a stub. Dexter is the designated destination for these capabilities.

**Current Echo deliverables that need a home:**
- `EchoXSignal` — daily WTT pick written to `docs/standup/signals/YYYY-MM-DD-echo-x.json`, feeds paper bot at weight 0.5
- X pulse / vibe / account research
- Camillo behavioral signal detection (enabled via `ECHO_WTT_CAMILLO_STYLE=true`)
- Social arbitrage framing: "what observable behavior hasn't been priced in yet?"

**Why Dexter is the right home:** Dexter already has X research via `plugin-x-research` (planned as a Dexter skill in the Forge PRD). The Camillo lens maps perfectly to Dexter's SOUL.md constraint layer: "Is this a meaningful behavioral shift that the AI infra supply chain benefits from before Wall Street prices it?" Dexter's regime-aware portfolio builder + Camillo's pre-price-in detection = the full signal loop.

**How to migrate:**
1. Extract Echo's WTT generation logic into a Dexter skill (`src/skills/echo-wtt/`)
2. Dexter's WTT skill reads SOUL.md for thesis alignment, applies Camillo filter, outputs structured signal
3. Signal is written to `docs/standup/signals/YYYY-MM-DD-echo-x.json` same as before — paper bot consumes unchanged
4. `EchoXSignal` source weight remains 0.5; over time AIHF validation can scale it up/down

**Unlocks:** Echo can safely be stubbed/removed from VINCE's agent roster without losing WTT. The signal pipeline continues. Camillo lens becomes thesis-aware (checks conviction tiers from SOUL.md before flagging a behavioral signal).

---

### Surface 3: DexterFundamentals as signal source (Phase 1)

**What:** New signal aggregator source `DexterFundamentals` that calls Dexter's Financial Datasets integration for HIP-3 assets and returns earnings-aware, insider-activity-aware signals.

**The gap:** `VinceHIP3Service` knows NVDA funding rate on Hyperliquid. It does not know that NVDA reports earnings in 6 days, that insiders bought $50M last week, or that P/E just expanded from 28x to 35x on a consensus beat. Dexter has all of this via Financial Datasets API.

**Signal shape:**
```typescript
interface DexterFundamentalsSignal {
  source: 'DexterFundamentals';
  asset: string;          // e.g. 'NVDA', 'TSLA', 'AMZN'
  direction: 'long' | 'short' | 'hold';
  confidence: number;     // 0–100
  factors: string[];      // e.g. ['earnings_beat_7d', 'insider_buy_net_positive', 'pe_expansion_moderate']
  earningsInNDays?: number;
  insiderNetBuy: boolean;
  peZscore: number;       // standard deviations from 3-year mean
}
```

**When it contributes:** Only when a HIP-3 asset is in the paper bot's asset list and at least one factor crosses threshold (e.g. insider net buying, earnings surprise within 14 days, P/E zscore > 2.0).

**Weight:** 0.8 (same tier as NewsSentiment — concrete data, short lag, but equity-specific so crypto-only trades get no vote from it).

**How:** New service `VinceDexterFundamentalsService` calls Dexter's local HTTP gateway or directly calls Financial Datasets with the same API key. Registered in `plugin-vince/src/index.ts` alongside existing services.

**Unlocks:** VINCE's HIP-3 signals become thesis-aware. The paper bot can distinguish "NVDA is strong on Hyperliquid because earnings are 3 days away and insiders have been buying" vs "NVDA is strong because there's a random pump." The former is a Core Compounder catalyst; the latter is noise. The distinction changes position size and the strike ritual for Solus.

---

### Surface 4: AIHF as adversarial signal filter (Phase 1)

**What:** Add `AIHFChallenge` as a high-weight signal aggregator source. For any asset where VINCE has an open or pending paper trade, AIHF runs 18 analysts in adversarial mode. The agreement rate (0–18 out of 18) becomes a confidence modifier.

**Why it matters:** VINCE's paper bot self-reinforces. Thompson Sampling rewards sources that agree with past winners — but past winners are just past price action. There is no external, fundamentals-grounded challenge. AIHF is exactly that: it doesn't care what X sentiment said or what Hyperliquid funding shows. It runs DCF, insider analysis, macro regime, and systematic quant on the same trade thesis. When AIHF and VINCE agree, the conviction is load-bearing. When they fight, the conflict is the signal.

**Signal shape:**
```typescript
interface AIHFChallengeSignal {
  source: 'AIHFChallenge';
  asset: string;
  direction: 'long' | 'short' | 'neutral';
  agreementRate: number;    // 0.0–1.0 (14/18 = 0.78)
  disagreements: string[];  // e.g. ['valuation_stretched', 'insider_selling']
  consensusThesis: string;
}
```

**Weight:** Asymmetric. When AIHF agrees: scale existing signal strength up by `1 + (agreementRate × 0.5)`. When AIHF disagrees strongly (< 0.4 agreement): cap signal confidence at 50 regardless of other sources. This is a soft veto, not a hard block — human can override via `VINCE_BOT_TRADE` manual trigger.

**How:** Dexter's AIHF is invoked via the existing `/double-check` command against VINCE's current open/pending paper positions. Response is structured and cached for 4h (AIHF is expensive; not run on every tick). Only runs on HIP-3 equity assets — not BTC/ETH/SOL perps (where AIHF has less edge over perps-specific signals).

**Unlocks:** The paper bot now has an adversarial challenge it cannot self-reinforce away. A trade can have high X sentiment, strong CoinGlass funding, and good MarketRegime — but if 14 AIHF analysts flag valuation risk, the net signal gets dampened before Otaku is ever asked to execute.

---

### Surface 5: Forge ↔ Dexter regime context in replay harness (Phase 1)

**What:** Forge's evaluation harness (`forgeExperiment.service.ts`) replays the feature-store JSONL against mutations of `policies/trading-policy.yaml` and prompts. Currently it only sees VINCE-internal context. Adding Dexter's regime signal and AIHF conviction score as replay metadata makes the harness more precise.

**The problem without it:** Forge might conclude that lowering `bearish_threshold` from 4.0 to 3.5 improved the composite metric — but that period happened to be a bull run where most signals were easy to get right. If Dexter's regime data says "regime was bullish in 80% of the replay window," the threshold mutation looks less robust than it appears.

**What Forge needs from Dexter:**
- Regime label per day for the replay window (bullish / bearish / volatile / neutral, anchored to SPY + BTC vs 200d SMA)
- AIHF conviction score per HIP-3 trade in the replay window (was AIHF right about the outcome?)
- Benchmark performance of the replay window (did the replay period beat BTC? Was it easy alpha or real edge?)

**Implementation:** Dexter runs a pre-computed `regime_context.jsonl` file written to `docs/dexter/regime-context.jsonl` on a weekly schedule. Forge reads this file before each overnight experiment. Lines: `{ date, regimeLabel, benchmarkReturn, aihfAccuracy }`. If the file is missing or stale, Forge runs without regime context (graceful degradation).

**Unlocks:** Forge stops committing threshold mutations that only work in specific regimes. A winner has to beat the baseline in at least two different regime types before it's committed. This directly reduces false-positive wins and makes the composite metric more robust.

---

### Surface 6: StandupSignal enhanced with fundamentals (Phase 2)

**What:** After the standup day report generates directional signals (currently Solus-driven TA + regime), an additional pass runs Dexter's fundamentals check on the same assets and writes a supplemental section to the signals file.

**Current `StandupSignal` source:** Reads `docs/standup/signals/YYYY-MM-DD-signals.json`, weight 0.6. One direction per asset (long/short). No fundamentals, no earnings awareness.

**Enhanced signals file shape:**
```json
{
  "date": "2026-03-11",
  "signals": [
    {
      "asset": "CRCL",
      "direction": "long",
      "confidence": 72,
      "source": "solus",
      "dexter": {
        "earningsInDays": null,
        "insiderNetBuy": true,
        "aihfAgreement": 0.78,
        "peZscore": 1.2,
        "fundamentalsBias": "supportive"
      }
    }
  ]
}
```

The aggregator reads `dexter.aihfAgreement` and `dexter.fundamentalsBias`. When both are supportive, `StandupSignal` weight scales from 0.6 to 0.85. When AIHF disagrees (`aihfAgreement < 0.4`), weight drops to 0.3.

**How:** The standup plugin (plugin-inter-agent) calls a new `DexterStandupService` after Solus writes initial signals. Dexter enrichment is written to the same signals file as a `dexter` field per asset. Takes ~15 seconds; non-blocking (standup completes first, enrichment appended after).

**Unlocks:** `StandupSignal` becomes the highest-quality source in the aggregator for HIP-3 assets — not just because Solus said long, but because Solus said long AND AIHF agreed AND insiders are buying. This is the Camillo loop: behavioral signal (VINCE/ECHO) + fundamental confirmation (Dexter/AIHF) + thesis alignment (SOUL.md) = high-conviction trade.

---

### Surface 7: Paper-to-live execution gate (Phase 2–3)

**What:** A gate that converts VINCE paper trades into real Dexter-executed trades when conviction criteria are met. The gate lives between `VincePaperTradingService` and Otaku; Dexter is the execution layer.

**Gate criteria (all four must pass):**
1. **VinceBench score ≥ 4.0** — good process, not just good PnL
2. **Causal uplift ≥ 1.2** — the signal caused the outcome, not regime luck
3. **AIHF agreement ≥ 0.67** (12/18 analysts agree on the direction)
4. **Asset maps to an executable venue** — tastytrade for equity options (NVDA, TSLA, AMZN); Hyperliquid for HIP-3 spot (CRCL, COIN, PLTR)

**When the gate fires:**
1. Otaku posts a Discord alert: "Paper bot candidate. VinceBench 4.2. AIHF: 14/18. Asset: CRCL long. Dexter dry-run?"
2. Human replies "preview" → Dexter runs `hyperliquid_order_preview_tool` (for HL assets) or `tastytrade_strategy_preview` (for equity options)
3. Dry-run result posted back to Discord
4. Human confirms → Dexter executes
5. Real outcome written back to `data/trade-attribution.jsonl` with `source: "paper_to_live_gate"`

**This is never automatic.** The gate fires and previews. Human always confirms before execution. The `openTrade()` rule from the Trading Runtime Contract applies: live execution is Otaku/Dexter only, not a scheduled task.

**Why this is the durable edge:** Paper wins that survive adversarial challenge are the real signal. Every realized trade produces a real outcome — not a simulated one — which feeds back into ONNX training as the highest-quality label. Over time the feature store has both paper and live outcomes for the same signal types. The model learns the gap between "this looked good on paper" and "this worked with real money and real fees."

**Unlocks:** VINCE becomes self-funding over time. The paper bot is no longer academic. The three-repo stack produces a closed loop: SOUL.md thesis → VINCE signals → AIHF challenge → Dexter execution → real attribution → feature store → ONNX retrain → better signals → tighter gates.

---

### Surface 8: Quarterly attribution merger (Phase 2–3)

**What:** VINCE generates `data/trade-attribution.jsonl` and individual post-mortems (`docs/standup/post-mortems/YYYY-MM-DD-ASSET-post-mortem.md`). Dexter generates quarterly reports vs BTC, SPY, GLD. These should converge.

**The gap now:** VINCE knows it lost on CRCL on March 11 and has a post-mortem explaining why (from git status: `2026-03-11-CRCL-post-mortem.md` is a new untracked file today). Dexter would know whether CRCL underperformed SPY that week and what the AIHF conviction was before the trade. The post-mortem without the benchmark context is incomplete; the benchmark without the process context is incomplete.

**Quarterly report structure (merged):**

```markdown
# Q1 2026 — VINCE Paper Bot + Dexter Portfolio

## Benchmark comparison
Paper bot return vs BTC, SPY, GLD (Dexter-generated)

## Attribution by thesis layer
[Left curve: perps paper] — causal uplift, Sharpe, Brier
[Mid curve: HIP-3 spot] — vs SPY benchmark, AIHF accuracy
[Right curve: Solus options] — premium captured, calibration score

## Post-mortem summary
[Asset-by-asset: process score (VinceBench), AIHF agreement at trade time, actual vs expected outcome]
[Root cause distribution: sizing_too_aggressive, regime_conflict, information_too_universal, etc.]

## SOUL.md validation
[Did the conviction tiers hold up? Which layer of the AI infra thesis was the edge?]
[Update candidates for SOUL.md (via THESIS-DELTA-*.md, not direct edit)]

## Next-quarter falsifiable tests
[3-5 tests that would prove or disprove a thesis change]
```

**Unlocks:** The quarterly report becomes machine-readable learning. Post-mortems get benchmark context. SOUL.md updates are now evidence-based, not reaction-based. Forge's composite metric can be tracked quarter-over-quarter against real benchmarks, not just internal replay.

---

## Three-machine stack

From the Forge PRD:

```
Perplexity (always on)
  └─ researches regime shifts, feeds Dexter thesis layer

Claude Cowork (laptop open)
  └─ reads Forge nightly Telegram summary
  └─ proposes next-night mutations to FORGE_PROGRAM.md
  └─ interprets winning diffs, decides whether to expand scope

OpenClaw (always-on daemon, $5/month server)
  └─ Forge watcher: polls docs/forge-leaderboard.md nightly
  └─ pushes Telegram summary (N experiments / Y committed / Δmetric)
  └─ Forge is why OpenClaw needs to stay running even when laptop is closed
```

Dexter is the "Perplexity → thesis layer" and the "execution gateway" in this stack. Perplexity surfaces regime information; Dexter's SOUL.md and AIHF structure it into conviction scores that feed Forge's replay context (Surface 5) and VINCE's signal weights (Surface 4).

In practice, the machine stack with Dexter fully integrated looks like:

```
night:
  Forge runs 150 experiments on policies/ and prompts/
  Uses Dexter regime_context.jsonl as replay metadata
  Commits 3 winners to forge/experiment branch
  Pushes: "Δ causal_uplift +0.04 | Δ sharpe +0.11 | safety ✓"

morning:
  Dexter runs /btc-temp-check and regime label for the day
  Writes to docs/dexter/regime-context.jsonl
  AIHF challenges current paper positions (runs silently)

standup:
  Solus writes directional signals per asset
  DexterStandupService enriches with AIHF agreement + fundamentals
  Paper bot reads final signals file for the day's evaluation cycles

quarterly:
  VinceBench run across all closed trades
  Dexter generates attribution report vs BTC/SPY/GLD
  Post-mortems merged with benchmark comparison
  THESIS-DELTA-*.md written (proposed SOUL.md updates)
  Forge Phase 3: proposed mutations based on losing thesis layers
```

---

## Metric alignment: how VINCE and Dexter converge

| System | Metric | What it measures |
|---|---|---|
| Forge (VINCE) | `causal_uplift × sharpe × brier_calibration` | Signal causality, return quality, options prediction accuracy |
| AutoResearch-MLX (Dexter) | `alpha vs BTC/SPY/GLD` | Portfolio return quality vs benchmarks |
| Paper-to-live gate | Real outcome in `trade-attribution.jsonl` | Did the paper signal work with real money? |

These converge when the paper-to-live gate runs long enough. The feature store accumulates both paper and live outcomes for similar signal configurations. The ONNX signal-quality model learns to predict: "this signal type, in this regime, with this AIHF conviction, produces X% probability of outperforming BTC over the next N days." That's not signal quality anymore — that's alpha prediction. The three metrics collapse into one.

---

## Implementation phases (tied to Forge phases)

### Phase 0 — right now (no Forge dependency)

| Task | What | Effort |
|---|---|---|
| SOUL.md merge | Copy Dexter SOUL.md to `knowledge/teammate/SOUL.md`, merge investment thesis fields | 1h |
| `docs/dexter/` directory | Create `docs/dexter/` for Dexter-generated context files | 5 min |
| Echo stub with forwarding note | Update Echo agent brief to say "x-researcher moving to Dexter skill" | 30 min |

### Phase 1 — after 300 closed paper trades (Forge Phase 1 prerequisite)

| Task | What | Effort |
|---|---|---|
| `VinceDexterFundamentalsService` | New service, `DexterFundamentals` source, weight 0.8 | 2–3 days |
| Dexter `regime_context.jsonl` writer | Weekly cron in Dexter writes regime labels, benchmark returns, AIHF accuracy | 1 day |
| Forge replay reads `regime_context.jsonl` | `forgeExperiment.service.ts` loads regime metadata before each experiment batch | 1 day |
| `AIHFChallenge` signal source stub | Stub the source with mock data; wire real AIHF call when HTTP gateway is live | 2 days |

### Phase 2 — after 50 Forge committed wins (Forge Phase 2)

| Task | What | Effort |
|---|---|---|
| Echo → Dexter WTT skill migration | Extract WTT generation to `src/skills/echo-wtt/` in Dexter | 3–4 days |
| `DexterStandupService` | Enriches signals file with AIHF + fundamentals after Solus writes | 2 days |
| `StandupSignal` dynamic weight modifier | Reads `dexter.aihfAgreement` from signals file, scales weight 0.3–0.85 | 1 day |
| Paper-to-live gate (monitoring only) | Log when gate criteria are met; no execution yet; validate criteria frequency | 1–2 days |

### Phase 3 — after execution layer decision (Forge Phase 3)

| Task | What | Effort |
|---|---|---|
| Paper-to-live gate (execution enabled) | Otaku Discord alert → Dexter dry-run → human confirm → Dexter execute | 4–5 days |
| Quarterly attribution merger | Merge VinceBench output + post-mortems + Dexter benchmark report | 2–3 days |
| THESIS-DELTA workflow | Semi-automated SOUL.md update proposals from quarterly attribution | 2 days |
| Forge Phase 3 surfaces include Dexter policy files | Forge can propose mutations to `THETA-POLICY.md` and HL execution policy | Depends on Forge Phase 3 scope |

---

## Open questions

**1. How does Dexter run alongside VINCE?**
Two options: (a) same machine, separate port — Dexter as an HTTP gateway at `:3001`, VINCE calls it for fundamentals/AIHF; (b) Dexter as a Bun subprocess spawned by `plugin-forge` or a new `plugin-dexter`. Option (a) is simpler and more resilient to VINCE restarts. Decide before Phase 1 implementation.

**2. SOUL.md authority and sync**
When SOUL.md gets thesis updates (via THESIS-DELTA-*.md workflow), who applies them? In Dexter, edits are manual and discipline-gated. In VINCE, Forge reads SOUL.md but doesn't edit it. A shared SOUL.md in `knowledge/teammate/` needs a clear "edit authority" rule: human only, after quarterly review, never from an automated agent.

**3. AIHF call frequency and cost**
AIHF (18 analyst agents) is expensive per run. Running it on every paper signal is not feasible. Proposed rule: run AIHF only when (a) a paper trade passes the VinceBench threshold and (b) the asset is a HIP-3 equity (not BTC/ETH/SOL perps). Cache result for 4h per asset. Estimate: 2–4 AIHF runs per day on active HIP-3 trades.

**4. Venue split enforcement**
Dexter has a hard rule: tastytrade sleeve = no HL-tradable tickers; HL sleeve = HIP-3 only, no crypto. VINCE's paper bot runs on BTC, ETH, SOL, HYPE (perps) and some HIP-3. The paper-to-live gate needs to respect Dexter's venue split. Implementation: `DexterVenueSplit.isEligible(asset, signal)` checks both the SOUL.md conviction tier and whether the asset is in the right sleeve before triggering a Dexter execution preview.

**5. VinceBench and Dexter attribution: shared definition of quality?**
VinceBench scores process (signal quality, risk discipline, timing, regime alignment). Dexter measures alpha vs benchmarks. A trade can have high VinceBench score and poor alpha (correct process, bad luck) or low VinceBench score and high alpha (sloppy process, lucky entry). Phase 3 should define how these combine in the paper-to-live gate — current proposal: VinceBench ≥ 4.0 AND positive alpha expectation from AIHF, not OR.

**6. Camillo lens in Dexter**
`CAMILLO_TRADING_MINDSET.md` lives in `knowledge/teammate/` — it's already shared across all VINCE agents via RAG. The question is whether Dexter's SOUL.md should adopt the Camillo framework as a formal thesis layer: "information imbalance before Wall Street prices it" as a signal filter for HIP-3 equity entries. Proposed: yes, add Camillo's four tests (information imbalance, durable behavioral shift, pure play, thesis still valid at exit) to SOUL.md's `## Signal Filter` section. Dexter's WTT skill runs these tests before flagging a behavioral signal.

---

## References

| Doc | What it is |
|---|---|
| [knowledge/teammate/THREE-CURVES.md](../knowledge/teammate/THREE-CURVES.md) | Left/mid/right routing. Dexter is mid+right execution. |
| [.cursor/plans/forge_prd_6613d167.plan.md](../.cursor/plans/forge_prd_6613d167.plan.md) | Forge PRD with v2 roster, three-machine stack, explicit Dexter integration call |
| [docs/VINCE.md](VINCE.md) | VINCE agent brief — gaps section maps to Dexter's contributions |
| [docs/FEATURE-STORE.md](FEATURE-STORE.md) | Feature store → ONNX training pipeline (Surface 7 destination for real outcomes) |
| [src/plugins/plugin-vince/SIGNAL_SOURCES.md](../src/plugins/plugin-vince/SIGNAL_SOURCES.md) | All signal aggregator sources — new sources from Surfaces 3 and 4 register here |
| [docs/TRADING_RUNTIME_CONTRACT.md](TRADING_RUNTIME_CONTRACT.md) | Producer vs executor rule — paper-to-live gate (Surface 7) must not violate this |
| [knowledge/teammate/CAMILLO_TRADING_MINDSET.md](../knowledge/teammate/CAMILLO_TRADING_MINDSET.md) | Camillo social arbitrage framework — inform Dexter WTT skill |
| https://github.com/eliza420ai-beep/dexter | Dexter source (includes SOUL.md, VINCE section in README, three-repo architecture) |
| https://github.com/eliza420ai-beep/ai-hedge-fund | AIHF source (18 analyst agents, Sharpe autoresearch, Dexter integration planned) |
