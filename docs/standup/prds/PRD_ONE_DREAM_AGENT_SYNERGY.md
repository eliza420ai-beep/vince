# PRD: One Dream — Agent Synergy & the $100K Trading System

**Status:** Phase 1–5 Implemented (V4.2.0) — Phase 6 Spec'd (V4.3.0)  
**Scope:** Close the remaining gaps between agents so the team operates as a single system: data flows into decisions, decisions flow into execution, execution flows into learning, learning flows into better data. Every agent has a clear role; every handoff is one click. **Phase 5** closes the final loop: the system observes itself, evolves its own parameters, and earns the right to trade real money. **Phase 6** turns the system from smart to unkillable: forward simulation, adversarial challenge, narrative intelligence, and prediction accountability.

### Implementation status (Phase 1)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | `vinceOptionsInjector.provider.ts` (Solus) | ✅ | Dynamic provider; strike ritual & optimal strike include it |
| 2 | `echoSentiment.provider.ts` (Vince) | ✅ | Dynamic; 1–10 score + label, 15 min cache |
| 3 | `oracleRegime.provider.ts` (Vince) | ✅ | Dynamic; risk-on/risk-off/uncertain, 15 min cache |
| 4 | `KELLY_WEEKLY_REVIEW` action + chip | ✅ | Unified scorecard via in-process ASK_AGENT; "Weekly Scorecard" chip |
| 5 | `tradingPerformance.provider.ts` (Eliza) | ✅ | Dynamic; Vince P&L + Solus premium, 1 hr cache |
| 6 | WRITE_ESSAY / DRAFT_TWEETS use trading data | ✅ | Compose with TRADING_PERFORMANCE when user asks for weekly/results |
| 7 | Quick-action validation (Kelly) | ✅ | KELLY_WEEKLY_REVIEW in quickActions.test.ts |

### Implementation status (Phase 2)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Sentiment gate | ✅ | `vinceSentimentGate.ts`: size multiplier, skip longs/shorts from Echo/Oracle cache |
| 2 | Wire gate into paper trading | ✅ | `evaluateAndTrade()`: skip when skipLongs/skipShorts; apply sizeMultiplier; pass sentimentMeta to openTrade/journal |
| 3 | Post-mortem on loss | ✅ | `postMortem.ts`: ask Echo, Oracle, Solus via getElizaOS; write `docs/standup/post-mortems/YYYY-MM-DD-{asset}-post-mortem.md`; triggered from `closeTrade()` when pnl < 0 |
| 4 | VINCE_POST_MORTEM action + chip | ✅ | Manual post-mortem for last losing trade; "Post-mortem (last loss)" chip |
| 5 | VINCE_SENTIMENT_CHECK action + chip | ✅ | "What does Echo and Oracle say about my next trade?"; "Sentiment check" chip |
| 6 | Sentinel weekly + post-mortems | ✅ | Weekly task includes recent `post-mortems/*.md` in message; suggest reviewing for patterns |

### Implementation status (Phase 3)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 12 | Kelly scheduled daily briefing with real data | ✅ | Existing standup: `STANDUP_ENABLED=true`, `STANDUP_UTC_HOURS` (default 9 UTC). `buildAndSaveSharedDailyInsights` + `runStandupRoundRobin` + day report. |
| 13 | Sentinel auto-PRD from post-mortem patterns | ✅ | Weekly task calls `buildPostMortemPatternSummary()`: reads recent post-mortems, LLM extracts patterns + suggested PRD; optional `SENTINEL_POST_MORTEM_PRD_WRITE=true` writes stub to `docs/standup/prds/PRD_POST_MORTEM_PATTERNS_YYYY-MM-DD.md`. |
| 14 | Otaku opt-in auto-execute when paper confidence > threshold | ✅ | `OTAKU_AUTO_EXECUTE_ENABLED`, `OTAKU_AUTO_EXECUTE_MIN_CONFIDENCE` (default 75). Task `OTAKU_AUTO_EXECUTE_CHECK` every 15 min; when cache has `confidence`/`strength` ≥ threshold, appends `vince_signal_ready` notification (execute when ready). |
| 15 | Echo watchlist → Vince signal pipeline | ✅ | `getPaperTradeAssetsWithWatchlist(runtime)`; `VINCE_PAPER_WATCHLIST_ENABLED=true` merges watchlist tokens (in ALL_TRACKED_ASSETS) into paper bot universe and signal aggregator. |

---

## Phase 4 — Measurement, Readiness & Content

**Theme:** Make the $100K goal measurable at a glance, make “go live” a clear checklist, and close the content flywheel with one-tap drafts.

| # | Task | Agent | Priority | Notes |
|---|------|-------|----------|-------|
| 16 | **$100K pace at a glance** | Kelly / Vince | P1 | Single provider or chip: “Are we on track?” — target $1,923/wk, this week actual, YTD annualized, yes/no. Surfaces in Kelly weekly and/or a dedicated “$100K pace” chip. |
| 17 | **Vince → Solus strike handoff (no copy/paste)** | Vince + Solus | P2 | When Vince (report or paper bot) suggests an options trade, write a “vince:strike_suggestion” cache (underlying, direction, expiry hint). Solus strike ritual provider reads it so Solus state includes “Vince suggests …” automatically. |
| 18 | **Confidence in signal cache** | Vince | P1 | Paper bot or daily report, when suggesting swap/bridge, set `confidence` (0–100) on `vince:latest_trade_signal` so Otaku’s auto-execute notification (Phase 3 #14) can fire. |
| 19 | **Weekly performance content (scheduled or one-tap)** | Eliza + Kelly | P2 | Kelly chip “Draft weekly performance post” → triggers Eliza with TRADING_PERFORMANCE; optional scheduled task (e.g. Friday) to auto-draft one Substack + 3–5 tweets from the week’s numbers. |
| 20 | **Sentiment accuracy tracking** | Vince / Echo | P2 | At trade entry, store Echo sentiment score + Oracle regime; at close, compare outcome. Compute “sentiment vs price” accuracy; feed into weekly review and post-mortems. |
| 21 | **Go-live readiness checklist** | Otaku / Kelly | P2 | Before executing Vince signal with real money: show checklist (paper win rate > X%, sentiment check, user confirm). Provider or action “Ready to execute?” that aggregates: bot stats, last sentiment, and requires explicit confirm. |

**Success criteria for Phase 4**

- User sees one number or card: “$100K pace: on track / behind” with weekly and YTD context.
- Solus strike ritual shows “Vince suggests …” when Vince has written a strike suggestion (no copy/paste).
- Otaku’s “Vince signal above threshold” notification fires when the paper bot (or report) writes a high-confidence signal.
- One chip or schedule produces a weekly performance Substack draft + tweets from real numbers.
- Every trade (or sample) has sentiment-at-entry stored and accuracy can be reported in the weekly scorecard.
- “Execute Vince signal” flow can show a readiness checklist (paper performance + sentiment) before proceeding.

**Out of scope for Phase 4**

- Full live execution without user confirm (opt-in and checklist only).
- Replacing or duplicating the weekly review; Phase 4 extends it with pace and accuracy.

### Implementation status (Phase 4)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 16 | $100K pace at a glance | ✅ | `KELLY_100K_PACE` action + "$100K pace" chip; asks Vince + Solus for this week, target $1,923/wk, on-track yes/no. |
| 17 | Vince → Solus strike handoff | ✅ | Cache `vince:strike_suggestion`; `VINCE_STRIKE_SUGGESTION` provider on Solus; strike ritual + optimal strike include it. Vince (or report) can write cache when suggesting options. |
| 18 | Confidence in signal cache | ✅ | `setVinceSignalCache()` in plugin-vince utils; cache shape supports `confidence`/`strength` (0–100). Otaku auto-execute notification uses it. |
| 19 | Weekly performance content | ✅ | `KELLY_DRAFT_WEEKLY_PERFORMANCE` action; asks Eliza to draft Substack + 3–5 tweets from this week's trading (trading performance context). |
| 20 | Sentiment accuracy tracking | ✅ | At close: `sentimentCorrect` computed from sentiment at entry vs outcome; stored on journal exit. `getSentimentAccuracy()` on journal for reporting. |
| 21 | Go-live readiness checklist | ✅ | `OTAKU_READY_TO_EXECUTE` action + "Ready to execute?" chip; aggregates paper bot stats + Echo sentiment + Vince signal; confirm to execute. |

---

## Phase 5 — The Genome: Self-Evolving Trading System (V4.2.0)

**Theme:** The system observes itself, hypothesizes improvements, tests them against its own history, and deploys the best version of itself — every week, automatically. Phases 1–4 connected the agents into a team. Phase 5 makes the team **self-evolving**.

**Core insight:** The feature store has 40+ features per decision including avoided decisions. VinceBench scores decision quality. Thompson Sampling adapts source weights. Training produces ONNX models + improvement reports + suggested tuning. Post-mortems diagnose losses. Sentiment accuracy tracks whether Echo/Oracle help. All the data exists — nobody acts on it automatically. Phase 5 closes that loop.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 22 | **Counterfactual Engine** | Vince | P0 | Weekly task: for every avoided decision, fetch what happened to that asset in the next 24–48h. Compare "trades we took" vs "trades we skipped." Output: "You were right to skip 73% — but missed 4 winners worth +$840. Min_strength is 6 pts too high in trending-bull regimes." Feeds the Strategy Genome (#23) with direction to mutate. |
| 23 | **Strategy Genome + Auto-Tuning** | Vince | P0 | All tunable params (min_strength, min_confidence, sentiment gate thresholds, TP/SL ratios, size multipliers, session/regime multipliers) represented as a JSON genome. Weekly: generate 50–100 mutations, replay each against feature store history (closed trades + counterfactual data), rank by Sharpe/win-rate/drawdown, promote top variant if it beats current by >X%. Track generation history in `genome_history.jsonl`. |
| 24 | **Regime Profiles** | Vince + Oracle + Echo | P1 | Five named strategy profiles — TRENDING_BULL (full size, wider TP, favor longs), CHOPPY (half size, tight TP, mean-reversion), CAPITULATION (pause longs, accumulation mode), EUPHORIA (contrarian: reduce longs, prepare shorts), RECOVERY (gradual re-entry, conservative). Each has its own param set (part of genome). Auto-selected by Oracle regime + Echo sentiment + on-chain signals. Profile-specific performance tracked separately. |
| 25 | **Intelligence → Signal Source** | Vince + Grok sub-agents | P1 | After each daily Grok run, extract structured recommendations (asset, direction, confidence, EV, thesis) from "Today's Recommendations." Register as a new signal aggregator source `GrokIntelligence`. Track accuracy via Thompson Sampling arm. When Grok-sourced signals outperform, weight bandit auto-promotes. Research becomes alpha. |
| 26 | **Portfolio Construction** | Vince | P1 | Move from per-asset decisions to portfolio-level: rolling 24h correlation matrix across open positions, total portfolio heat (sum of position risk as % of equity), true Kelly criterion sizing from per-source win rate + avg win/loss, opportunity cost check (compare new trade's expected Sharpe vs weakest open position). Max simultaneous positions based on regime. |
| 27 | **Execution Graduation** | Otaku | P2 | Four trust levels earned through sustained performance: **L0 PAPER_ONLY** (default) → **L1 NOTIFY** (paper WR > 50% for 2 consecutive weeks) → **L2 CONFIRM_EXECUTE** (WR > 55% + positive Sharpe for 4 weeks) → **L3 AUTO_EXECUTE** (WR > 58% + Sharpe > 1.0 + DD < 10% for 8 weeks). Demotion: live WR < 45% for 2 weeks → drop one level. Circuit breaker: single-day loss > 5% of funded wallet → drop to L0 + notify user. |
| 28 | **Agent Collective Memory** | Sentinel + all | P2 | Weekly Sentinel task: collect learnings from every agent (Vince: trading patterns, source perf, counterfactual; Echo: sentiment accuracy, best accounts; Oracle: prediction record; Solus: premium, strike accuracy; Eliza: content performance, knowledge gaps; Otaku: execution quality, slippage; Kelly: user engagement). LLM synthesizes into a Weekly Intelligence Brief (500 words max), stored in `knowledge/teammate/weekly-briefs/YYYY-WW.md`. All agents load via shared knowledge. Institutional memory compounds. |
| 29 | **Flywheel Score** | Kelly | P1 | One composite number (0–100) measuring system health: signal quality trend (VinceBench, 20%) + trade performance (4-week rolling Sharpe, 25%) + sentiment accuracy (Echo/Oracle vs outcome, 10%) + content output (Eliza drafts+uploads/wk, 10%) + knowledge growth (new items/wk, 10%) + engineering velocity (Sentinel features shipped, 10%) + genome improvement (generation-over-generation Sharpe delta, 15%). Kelly reports: "Flywheel Score: 72 (+4). Signal quality and genome driving gains; content output is the bottleneck." Chip: "Flywheel Score" on Kelly. |

**Success criteria for Phase 5**

- Counterfactual report runs weekly; reveals whether the bot is too selective or not selective enough; quantifies missed opportunity cost.
- Strategy Genome auto-promotes a new parameter set at least once per month; generation-over-generation Sharpe is tracked and trends upward.
- Regime profiles auto-switch; per-regime performance is reported separately in weekly review; CAPITULATION profile prevents losses during drawdowns.
- Grok intelligence appears as a signal source arm in the aggregator; its win rate and weight are tracked alongside all other sources.
- No new trade opens if it would push portfolio heat above the configured max or violate correlation limits.
- Execution graduation level is visible in Otaku's readiness checklist; level transitions are logged and reported in weekly review.
- Weekly Intelligence Brief is generated every Monday and loaded by all agents; quality improves as collective memory grows.
- Flywheel Score is reported weekly by Kelly; a sustained upward trend proves the system is genuinely self-improving.

**Out of scope for Phase 5**

- Full reinforcement learning (RL) agent — genome evolution is simpler and more interpretable.
- Replacing the training pipeline — genome operates on runtime parameters; ONNX models continue to train separately.
- Multi-exchange execution — Otaku stays on Hyperliquid/Hypersurface; adding exchanges is a future phase.
- Automated Substack publishing — Eliza drafts; human publishes.

### Implementation status (Phase 5)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 22 | Counterfactual Engine | ✅ | `vinceCounterfactual.service.ts` + `counterfactualWeekly.tasks.ts`; replays avoided decisions from feature store, quantifies missed PnL by skip-reason, generates tuning recommendations. |
| 23 | Strategy Genome + Auto-Tuning | ✅ | `vinceGenome.service.ts` + `genomeEvolution.tasks.ts`; 15+ tunable params as JSON genome, weekly mutation → replay → fitness rank → auto-promote. |
| 24 | Regime Profiles | ✅ | `vinceRegimeProfiles.service.ts`; 5 profiles (TRENDING_BULL, CHOPPY, CAPITULATION, EUPHORIA, RECOVERY), auto-switch from Oracle + Echo + technical regime. Per-profile performance tracking. |
| 25 | Intelligence → Signal Source | ✅ | `grokSignalExtractor.service.ts`; parses daily Grok reports → structured GrokSignal objects → cached for Thompson Sampling aggregator arm. |
| 26 | Portfolio Construction | ✅ | `vincePortfolioConstruction.service.ts`; rolling correlation matrix, portfolio heat, Kelly-criterion sizing, opportunity cost vs weakest position. |
| 27 | Execution Graduation | ✅ | `executionGraduation.service.ts` (plugin-otaku); L0→L3 trust levels, earned by sustained weekly performance, automatic demotion + circuit breaker on 3%+ daily loss. |
| 28 | Agent Collective Memory | ✅ | `collectiveMemory.tasks.ts` (plugin-sentinel); weekly brief from all 7 agents, LLM synthesis → `knowledge/teammate/weekly-briefs/YYYY-WW.md`. |
| 29 | Flywheel Score | ✅ | `flywheelScore.service.ts` + `kellyFlywheelScore.action.ts` (plugin-kelly); composite 0–100 health metric, 7 weighted components, trend + narrative. |

### Suggested file map (Phase 5)

| File | Agent | New/Modify |
|------|-------|------------|
| `src/plugins/plugin-vince/src/services/vinceCounterfactual.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/tasks/counterfactualWeekly.tasks.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceGenome.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/tasks/genomeEvolution.tasks.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceRegimeProfiles.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vincePaperTrading.service.ts` | Vince | Modify (load active profile, portfolio constraints) |
| `src/plugins/plugin-vince/src/services/grokSignalExtractor.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/signalAggregator.service.ts` | Vince | Modify (add GrokIntelligence arm) |
| `src/plugins/plugin-vince/src/services/vincePortfolioConstruction.service.ts` | Vince | New |
| `src/plugins/plugin-otaku/src/services/executionGraduation.service.ts` | Otaku | New |
| `src/plugins/plugin-otaku/src/tasks/otakuAutoExecute.tasks.ts` | Otaku | Modify (respect trust level) |
| `src/plugins/plugin-sentinel/src/tasks/collectiveMemory.tasks.ts` | Sentinel | New |
| `src/plugins/plugin-kelly/src/services/flywheelScore.service.ts` | Kelly | New |
| `src/plugins/plugin-kelly/src/actions/kellyFlywheelScore.action.ts` | Kelly | New |
| `src/frontend/components/chat/chat-interface.tsx` | Kelly | Modify (add "Flywheel Score" chip) |
| `knowledge/teammate/weekly-briefs/` | Shared | New directory |

### Architecture — The Genome Loop

```
                 ┌──────────────────────────────────────────────────┐
                 │            FLYWHEEL SCORE (Kelly)                 │
                 │  One number: is the system getting better?        │
                 │  Components: signal + trade + sentiment +         │
                 │    content + knowledge + engineering + genome      │
                 └──────┬───────────────────────────┬───────────────┘
                        │                           │
                 ┌──────▼──────┐             ┌──────▼──────┐
                 │  COLLECTIVE │             │  CONTENT    │
                 │  MEMORY     │             │  FLYWHEEL   │
                 │  (Sentinel) │             │  (Eliza)    │
                 │  All agents │             │  Real data  │
                 │  → shared   │             │  → publish  │
                 │  knowledge  │             │             │
                 └──────┬──────┘             └──────┬──────┘
                        │                           │
     ┌──────────────────▼───────────────────────────▼──────────────┐
     │                     VINCE (The Genome)                       │
     │                                                              │
     │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
     │  │ Counterfact. │  │   Genome     │  │  Portfolio        │   │
     │  │ Engine (#22) │→ │   Evolve     │→ │  Construction     │   │
     │  │ "What if we  │  │   (#23)      │  │  (#26)            │   │
     │  │  had traded?" │  │ 100 variants │  │ Correlation,      │   │
     │  │              │  │ → best wins  │  │ heat, Kelly size  │   │
     │  └──────────────┘  └──────┬───────┘  └───────────────────┘   │
     │                           │                                   │
     │  ┌─────────────┐  ┌──────▼───────┐  ┌───────────────────┐   │
     │  │ Grok Intel  │  │   Regime     │  │  Sentiment Gate   │   │
     │  │ → Signal    │→ │   Profiles   │→ │  (Phase 2)        │   │
     │  │ Source (#25) │  │   (#24)      │  │  + regime-aware   │   │
     │  │ 6 sub-agents │  │ 5 strategies │  │  sizing           │   │
     │  └──────────────┘  └──────────────┘  └───────────────────┘   │
     │                                                              │
     └───────────┬──────────────────────────────┬───────────────────┘
                 │                              │
          ┌──────▼──────┐                ┌──────▼──────┐
          │   SOLUS     │                │   OTAKU     │
          │ Strike Plan │                │  Execution  │
          │ Premium P&L │                │  Graduation │
          │             │                │  (#27)      │
          │             │                │  L0→L1→L2→L3│
          └─────────────┘                └─────────────┘
                 ▲                              ▲
          ┌──────┴──────┐                ┌──────┴──────┐
          │   ECHO      │                │  ORACLE     │
          │ CT Sentiment│                │ Polymarket  │
          │ → profiles  │                │ → profiles  │
          └─────────────┘                └─────────────┘
```

---

## Phase 6 — The Adversary: Antifragile Intelligence (V4.3.0)

**Theme:** Phases 1–5 optimized for making money. Phase 6 optimizes for **not dying**. Markets are adversarial environments. The best trading system isn't the most profitable — it's the one that can't be killed. Phase 5 taught the system to learn from its past. Phase 6 teaches it to **survive its future**.

**Core insight:** Every learning mechanism built so far is reactive — counterfactual replays history, genome evolves from past trades, post-mortems diagnose losses after they happen. The system never asks "what happens to my portfolio in 1000 parallel universes?" No trade entry, genome promotion, or regime classification is ever challenged. Echo says "bullish" and Oracle says "risk-on" but nobody ever checks if they were right. Grok sub-agents produce intelligence that dies on arrival. Collective memory writes briefs nobody reads. Sentiment measures how people feel right now; narrative measures what story the market is telling itself — and where that story is in its lifecycle. Phase 6 flips the system's orientation from **reactive** to **anticipatory**, from **trusting** to **adversarial**, from **optimizing the median** to **optimizing the tail**.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 30 | **Pre-Mortem Engine** | Vince | P0 | The inverse of post-mortem. Before entering any trade, generate 3–5 plausible failure scenarios from current market context (regime, sentiment, funding rate, OI, recent liquidations). Check each scenario against present conditions. Score a **survival probability** (0–100): below threshold → block the trade with the specific death scenario logged. Feature store records pre-mortem output so the genome can learn which death scenarios actually materialized. Unlike static gates (minStrength, DVOL), pre-mortems detect **narratively coherent failure modes** — the kind that kill you when all the indicators look fine. |
| 31 | **War Room: Monte Carlo Forward Simulation** | Vince | P0 | Before any genome promotion and before large position entries, sample from feature store distribution to generate 500–1000 synthetic future scenarios. For each: apply the candidate genome's parameters, simulate entries/exits, compute portfolio P&L. Compute tail risk: 5th-percentile and 1st-percentile outcomes. **Genome gate:** a variant can't promote unless its 5th-percentile scenario beats the incumbent's 5th-percentile — optimizing for the tail, not the median. **Position gate:** a new trade can't open if the portfolio's 1st-percentile scenario (including the new position) exceeds the max drawdown limit. The system currently replays history; the War Room generates **plausible futures** and tests whether the system survives them. |
| 32 | **Internal Prediction Market** | All agents | P0 | Every agent makes implicit predictions. This task makes them explicit, trackable, and consequential. **Echo:** every sentiment score is a prediction ("bullish = price goes up in 24h") — track outcome. **Oracle:** every regime call is a prediction ("risk-on = market doesn't crash in 48h") — track outcome. **Grok sub-agents:** every recommendation tracked via feature store. **Vince genome:** every promotion is a prediction ("this param set outperforms") — track next-week live vs replay. **Solus:** every strike selection tracked to expiry. A new `PredictionTracker` service registers predictions (asset, direction, confidence, expiry), validates at expiry, computes per-agent Brier score (calibration). Agent influence dynamically weighted by prediction accuracy — not hardcoded. Kelly's flywheel score gains a new component: **prediction calibration** (15% weight). Closes the biggest feedback loop: predictions → outcomes → accuracy → influence. |
| 33 | **The Devil's Advocate Protocol** | Vince + Sentinel | P1 | A dedicated adversarial service that argues against the system's own conclusions. **Trade-level:** before entry, generate a counter-thesis from feature store analogues. "The bullish signal is funding rate + sentiment, but OI is declining and DVOL rising — classic bull trap. Accuracy of this combination in CHOPPY: 38%." **Genome-level:** before promotion, challenge the result. "This variant outperforms because it includes the one 10x trade on Feb 12. Without that outlier, it's 3% worse. Robustness: 0.4/1.0." **Regime-level:** before transition, challenge classification. "You're switching to TRENDING_BULL but DVOL is 72 and rising. In 8/12 historical cases with this profile, the regime was actually EUPHORIA." If the counter-thesis's historical base rate > 60%, the trade is downgraded (reduced size) or blocked. The system currently has one voice saying "yes." This adds a second voice saying "here's specifically why you're wrong, with receipts." |
| 34 | **Narrative Radar** | Echo + Vince | P1 | Goes beyond sentiment (how people feel) to narrative (what story the market tells itself). **Narrative arc detection** from Echo's X data: Inception (new narrative, low volume, high-signal accounts only) → Growth (spreading, increasing volume, mainstream accounts) → Peak (everywhere, retail saturated, "everyone knows this") → Decline (counter-narratives, fatigue, attention shifting). **Per-asset classification:** "BTC: institutional accumulation (Growth)." "SOL: AI narrative (Peak — caution)." "ETH: scaling narrative (Inception)." **Trading integration:** regime profiles get a narrative overlay. TRENDING_BULL + Growth = full conviction. TRENDING_BULL + Peak = reduce size (smart money exits at peak narrative, not peak price). **Content integration:** Eliza drafts include narrative context — "The AI-on-Solana narrative is entering peak phase — here's what historically happens next." Turns Echo from a thermometer (reads the temperature) into a barometer (predicts the weather). |
| 35 | **Temporal Coherence Engine** | Vince | P1 | The system currently operates on a single timeframe. This adds multi-timeframe alignment. Track regime and signal direction across 4H, daily, and weekly. **Alignment score** (0–3): 3/3 aligned = full size, highest conviction; 2/3 = reduced size; 1/3 = minimum size or skip; 0/3 = skip (timeframes in conflict). The genome can evolve the alignment threshold (require 2/3 vs 3/3). Feature store records alignment score for every decision so the genome learns whether multi-timeframe coherence improves outcomes. Prevents the most common retail mistake: trading a 4H signal that's running into weekly resistance. |
| 36 | **The Immune System: Attack Pattern Recognition** | Vince | P2 | Markets are actively adversarial. A curated library of 15–20 known attack patterns: rug pull (sudden liquidity withdrawal, insider selling, hype → dump), stop hunt (price through dense stop zone then reversal), funding rate squeeze (extreme funding → forced liquidations → cascade), whale trap (large order attracts momentum, then pulled), exchange manipulation (price divergence, unusual spread). Before entry, match current asset microstructure against pattern library; similarity > threshold → block with "Immune system: looks like [pattern]. Historical loss rate: 87%." **Pattern evolution:** when the system loses, check if loss matches known or unknown patterns. Unknown → add to library. Known but not triggered → lower detection threshold. The immune system gets stronger with every attack it survives. |
| 37 | **Dead End Elimination** | All agents | P1 | Close every information dead end in the system. **Grok sub-agents → signal aggregator:** Plumber (market structure) + Rat (alpha) + Paranoid (risk) → distinct Thompson Sampling arms. **Bandit stats → flywheel score:** Kelly queries `getTopSources()` + `getUnderperformingSources()` for signal quality component. **Collective memory → RAG:** verify weekly briefs are loaded by all agents via shared knowledge directory; add ingestion check. **Execution graduation → paper bot:** Vince knows Otaku's trust level; adjusts risk (higher conviction at L2+, more conservative at L0). **Prediction validation → agent weights:** prediction market accuracy feeds into ASK_AGENT response weighting (more accurate agents get more influence). Not glamorous — but the highest-ROI task. Every dead end is wasted intelligence. |

**Success criteria for Phase 6**

- Pre-mortem blocks at least 1 trade per week that would have lost money (validated by next-day counterfactual check).
- War Room 5th-percentile survival test rejects at least 1 genome variant per month that looked good on median replay but fragile in the tail.
- Prediction market Brier score computed for each agent; calibration improves month-over-month. Flywheel score includes prediction calibration as a 15% component.
- Devil's Advocate counter-thesis is correct > 30% of the time — proves it's not just noise but catches real traps.
- Narrative Radar detects at least one narrative phase transition per month before the price peak or trough.
- Temporal coherence improves win rate by 3+ percentage points vs single-timeframe baseline (measured via feature store A/B).
- Immune system catches at least one attack pattern per quarter; pattern library grows with every loss.
- Zero information dead ends remain — every generated data point flows to at least one consumer.

**Out of scope for Phase 6**

- Full adversarial RL (adversarial training against synthetic opponents) — Devil's Advocate is rule-based + retrieval, not a trained adversary.
- Cross-exchange arbitrage execution — immune system detects exchange manipulation, doesn't arbitrage it.
- Real-time tick-by-tick order flow — temporal coherence uses OHLC candles, not trade-by-trade.
- Automated narrative generation (writing our own narratives to influence CT) — we read narratives, we don't manufacture them.
- Prediction market with real stakes — reputation only, no on-chain betting between agents.

### Implementation status (Phase 6)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 30 | Pre-Mortem Engine | ⬜ | |
| 31 | War Room: Monte Carlo Forward Simulation | ⬜ | |
| 32 | Internal Prediction Market | ⬜ | |
| 33 | Devil's Advocate Protocol | ⬜ | |
| 34 | Narrative Radar | ⬜ | |
| 35 | Temporal Coherence Engine | ⬜ | |
| 36 | Immune System: Attack Pattern Recognition | ⬜ | |
| 37 | Dead End Elimination | ⬜ | |

### Suggested file map (Phase 6)

| File | Agent | New/Modify |
|------|-------|------------|
| `src/plugins/plugin-vince/src/services/vincePreMortem.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceWarRoom.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceGenome.service.ts` | Vince | Modify (add War Room tail-risk gate to promotion logic) |
| `src/plugins/plugin-vince/src/services/vincePaperTrading.service.ts` | Vince | Modify (add pre-mortem gate + temporal coherence gate before entry) |
| `src/plugins/plugin-vince/src/services/vinceDevilsAdvocate.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceTemporalCoherence.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceImmuneSystem.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceNarrativeRadar.service.ts` | Vince + Echo | New |
| `src/plugins/plugin-vince/src/services/predictionTracker.service.ts` | All | New |
| `src/plugins/plugin-vince/src/tasks/predictionValidation.tasks.ts` | Vince | New (daily: validate expired predictions) |
| `src/plugins/plugin-vince/src/services/vinceRegimeProfiles.service.ts` | Vince | Modify (add narrative overlay to regime selection) |
| `src/plugins/plugin-vince/src/services/vinceFeatureStore.service.ts` | Vince | Modify (add preMortemScore, alignmentScore, narrativePhase, devilScore fields) |
| `src/plugins/plugin-vince/src/services/weightBandit.service.ts` | Vince | Modify (add Grok sub-agent arms: Plumber, Rat, Paranoid) |
| `src/plugins/plugin-kelly/src/services/flywheelScore.service.ts` | Kelly | Modify (add predictionCalibration component at 15%; rebalance weights) |
| `src/plugins/plugin-kelly/src/actions/kellyFlywheelScore.action.ts` | Kelly | Modify (query bandit stats, prediction calibration) |
| `src/plugins/plugin-sentinel/src/tasks/collectiveMemory.tasks.ts` | Sentinel | Modify (verify RAG ingestion of weekly briefs) |
| `src/plugins/plugin-otaku/src/services/executionGraduation.service.ts` | Otaku | Modify (expose trust level to Vince via cache) |
| `knowledge/teammate/attack-patterns/` | Shared | New directory (curated pattern library) |
| `data/predictions/` | Shared | New directory (prediction registry JSONL) |

### Architecture — The Adversary Loop

```
                        ┌──────────────────────────────────────────┐
                        │         PREDICTION MARKET (#32)           │
                        │  Every prediction tracked.                │
                        │  Every outcome validated.                 │
                        │  Brier score → influence weight.          │
                        │                                           │
                        │  Echo: sentiment → did price follow?      │
                        │  Oracle: regime → did market behave?      │
                        │  Grok: recommendation → did it profit?    │
                        │  Genome: promotion → did it outperform?   │
                        │  Solus: strike → did it expire OTM?       │
                        └─────┬──────────────────────┬──────────────┘
                              │                      │
              ┌───────────────▼──────┐        ┌──────▼──────────────┐
              │  NARRATIVE RADAR     │        │  FLYWHEEL SCORE     │
              │  (#34)               │        │  + prediction       │
              │                      │        │  calibration (15%)  │
              │  Inception           │        │  + bandit stats     │
              │    → Growth          │        │  + dead ends closed │
              │      → Peak          │        │                     │
              │        → Decline     │        │  "Flywheel: 78 (+6) │
              │                      │        │   Predictions are   │
              │  "SOL AI narrative   │        │   well-calibrated;  │
              │   entering Peak —    │        │   narrative radar   │
              │   reduce exposure"   │        │   is the edge"      │
              └───────┬──────────────┘        └─────────────────────┘
                      │
     ┌────────────────▼──────────────────────────────────────────────┐
     │                     VINCE (The Adversary)                      │
     │                                                                │
     │  ┌────────────────────────────────────────────────────────┐    │
     │  │              ENTRY GAUNTLET (sequential)               │    │
     │  │                                                        │    │
     │  │  1. Existing 15+ gates (Phase 1–5)                     │    │
     │  │         ↓                                              │    │
     │  │  2. TEMPORAL COHERENCE (#35)                           │    │
     │  │     "Do 4H + daily + weekly agree?"                    │    │
     │  │     Alignment 0/3 → blocked. 1/3 → min size.          │    │
     │  │         ↓                                              │    │
     │  │  3. IMMUNE SYSTEM (#36)                                │    │
     │  │     "Does this match a known attack pattern?"          │    │
     │  │     Rug pull / stop hunt / funding squeeze → blocked.  │    │
     │  │         ↓                                              │    │
     │  │  4. PRE-MORTEM (#30)                                   │    │
     │  │     "This trade just lost 100%. What killed it?"       │    │
     │  │     3–5 death scenarios. Survival < threshold → block. │    │
     │  │         ↓                                              │    │
     │  │  5. DEVIL'S ADVOCATE (#33)                             │    │
     │  │     "Here's why you're wrong, with receipts."          │    │
     │  │     Counter-thesis base rate > 60% → downgrade/block.  │    │
     │  │         ↓                                              │    │
     │  │  ✅ ENTRY                                              │    │
     │  └────────────────────────────────────────────────────────┘    │
     │                                                                │
     │  ┌────────────────────────────────────────────────────────┐    │
     │  │              GENOME PROMOTION GAUNTLET                 │    │
     │  │                                                        │    │
     │  │  1. Fitness ranking (Phase 5: Sharpe × WR / DD)        │    │
     │  │         ↓                                              │    │
     │  │  2. WAR ROOM (#31)                                     │    │
     │  │     1000 Monte Carlo futures.                          │    │
     │  │     5th-percentile must beat incumbent's 5th-pctl.     │    │
     │  │     Optimize for the tail, not the median.             │    │
     │  │         ↓                                              │    │
     │  │  3. DEVIL'S ADVOCATE (#33)                             │    │
     │  │     "Remove the top outlier trade — still better?"     │    │
     │  │     Robustness score < 0.6 → reject.                  │    │
     │  │         ↓                                              │    │
     │  │  ✅ PROMOTE                                            │    │
     │  └────────────────────────────────────────────────────────┘    │
     │                                                                │
     └─────────────┬──────────────────────────┬───────────────────────┘
                   │                          │
     ┌─────────────▼────────┐     ┌───────────▼─────────────┐
     │  DEAD END WIRING     │     │  IMMUNE SYSTEM (#36)    │
     │  (#37)               │     │  15+ attack patterns    │
     │                      │     │  Gets stronger with     │
     │  Grok → aggregator   │     │  every loss             │
     │  Bandit → flywheel   │     │                         │
     │  Memory → RAG        │     │  Curated library:       │
     │  Graduation → risk   │     │  knowledge/teammate/    │
     │  Predictions → weight│     │  attack-patterns/       │
     └──────────────────────┘     └─────────────────────────┘
```

### Phase 5 vs Phase 6 — The Shift

| Dimension | Phase 5 (The Genome) | Phase 6 (The Adversary) |
|-----------|---------------------|------------------------|
| **Time orientation** | Learns from the past | Simulates the future |
| **Optimization target** | Median outcome | Tail outcome (5th percentile) |
| **Decision process** | One voice saying "trade" | Two voices — thesis vs counter-thesis |
| **Sentiment use** | What people feel now | What story the market tells + where in lifecycle |
| **Timeframe** | Single | Multi-timeframe coherence (4H + daily + weekly) |
| **Market model** | Noisy but fair | Actively adversarial (attacks, traps, manipulation) |
| **Information flow** | Dead ends tolerated | Every dead end wired shut |
| **Predictions** | Implicit and untracked | Explicit, tracked, and consequential |
| **Self-assessment** | "Am I getting better?" (Flywheel) | "Can I survive the worst case?" (War Room) |

---

## 1. Goal

Make $100K/year from on-chain options (Hypersurface) and perps (Hyperliquid) by turning nine agents into a compounding loop:

**Data → Thesis → Plan → Execute → Measure → Learn → Better Data**

Today each agent is strong in isolation. This PRD eliminates the seams between them so the system is greater than the sum of its parts (1+1=3).

---

## 2. The Vision (Per Agent)

| Agent | Role | North Star |
|-------|------|------------|
| **Vince** | CDO | Paper bot so good we can't resist going live. ALOHA, perps, options, memes, HIP-3 — all data, all the time. |
| **Solus** | CFO | $100K/yr premium income via Hypersurface. Weekly strike ritual, P&L tracking, position assessment. |
| **Echo** | CSO | CT sentiment layer. "What's the vibe?" before every trade. Watchlist that feeds Vince signals. |
| **Oracle** | CPO | Polymarket odds as a regime indicator. "Is the market pricing a crash?" feeds risk sizing. |
| **Otaku** | COO | Only agent with a funded wallet. Executes Vince signals. DCA, bridge, Morpho yield, stop-loss. |
| **Sentinel** | CTO | Self-improving code. Finds bugs, tech debt, blockers. Proactive PRDs. Ships features 24/7. |
| **Clawterm** | — | OpenClaw research terminal. AI/AGI research, HIP-3 AI assets, gateway status. |
| **Eliza** | CEO | Knowledge expansion, Substack gold, viral tweet drafts, research 24/7. |
| **Kelly** | CVO | Lifestyle concierge. Daily inspiration. Live the life while the agents work. |
| **Naval** | — | Mindset and life goals. Grounding. "Paper before live." "Thesis first." |

---

## 3. Current State — What Works

### Strong Solo Capabilities

- **Vince:** ALOHA, report, options, perps, bot status, news, HIP-3, memes, intel — 13 quick actions. Paper bot evaluates, trades, and tracks KPIs.
- **Solus:** Strike ritual, optimal strike, position assess, $100K plan, stock analysis, earnings calendar — 16 quick actions. Hypersurface expertise is deep.
- **Echo:** X Pulse, vibe (BTC/ETH/SOL), threads, account analysis, headlines — 11 quick actions. CT sentiment layer is solid.
- **Oracle:** Focus markets, trending, search, edge check, desk report, categories — 8 quick actions. Polymarket discovery works.
- **Otaku:** Swap, bridge, DCA, Morpho, stop-loss, NFT mint, Bankr integration, execute Vince signal — 16 quick actions. Execution is ready.
- **Sentinel:** Project radar, task brief, cost status, ONNX, ship priorities, security, docs, "what should we fix" — 14 quick actions.
- **Eliza:** Upload, knowledge status, research briefs, Substack, tweets, brainstorm, research→Substack — 13 quick actions.
- **Kelly:** 15 lifestyle quick actions. Complete.
- **Naval:** 15 mindset quick actions. Complete.
- **Clawterm:** 14 OpenClaw/AI quick actions. Complete.

### Working Handoffs (1+1=3 Today)

| Flow | How |
|------|-----|
| Vince → Solus | User copies ALOHA/options output, pastes into Solus for strike call |
| Echo → Vince | User reads Echo's vibe, then asks Vince for data to confirm |
| Vince → Otaku | "Execute Vince Signal" chip on Otaku (just shipped) |
| Sentinel → Clawterm | Sentinel writes PRDs; Clawterm guides OpenClaw implementation |
| ASK_AGENT | Any agent can ask any other agent and relay the answer |

---

## 4. Where 1+1 Still Equals 2 (Gaps)

### 4.1 No Automated Agent-to-Agent Data Flow

Today, every cross-agent handoff requires the user to copy/paste between agents. There's no way for Vince's paper bot to automatically feed its signal to Solus for strike sizing, or for Echo's sentiment to automatically adjust Vince's risk parameters.

**Impact:** The user is the bottleneck. The system can't compound faster than the user can context-switch.

### 4.2 No Unified Weekly Review

There's no single command that pulls: Vince's bot performance + Solus's premium P&L + Echo's sentiment accuracy + Oracle's prediction record + Otaku's execution history + Sentinel's shipped features + Eliza's published content. The user has to visit each agent individually.

**Impact:** No consolidated scorecard. No way to measure "are we on track for $100K?"

### 4.3 No Sentiment → Risk Pipeline

Echo knows CT is bearish. Vince's bot doesn't care. Oracle sees Polymarket pricing a 70% chance of rate hike. Vince's risk model ignores it.

**Impact:** The paper bot trades in a vacuum. Sentiment and regime awareness stay in the user's head.

### 4.4 No Learning Loop

When Vince's bot loses on a trade, there's no structured flow where Sentinel analyzes the code, Echo checks if sentiment warned us, and Solus asks "did we size correctly?" The agents don't post-mortem together.

**Impact:** Same mistakes repeat. The system doesn't improve itself.

### 4.5 No Content Flywheel

Eliza can draft Substack essays and tweets, but she doesn't know what Vince traded this week, what Echo saw on CT, or what Solus's premium income was. Content is disconnected from trading performance.

**Impact:** Content is generic instead of showing real results ("we made $2,140 in premium this week — here's how").

---

## 5. Solution — Five Workstreams

### 5.1 Automated Cross-Agent Signals (Phase 1)

**What:** Use ASK_AGENT and provider injection so agents share structured data without user copy/paste.

| Signal | Source | Target | Mechanism |
|--------|--------|--------|-----------|
| Options view | Vince | Solus | Provider: `vinceOptionsProvider` injected into Solus state when available |
| Sentiment score | Echo | Vince | Provider: `echoSentimentProvider` — numeric bull/bear score injected into Vince's signal aggregator |
| Regime indicator | Oracle | Vince | Provider: `oracleRegimeProvider` — Polymarket-derived risk regime (risk-on/risk-off/uncertain) |
| Trade signal | Vince | Otaku | Already exists via `VINCE_SIGNAL_CACHE_KEY` + `OTAKU_EXECUTE_VINCE_SIGNAL` |
| Premium P&L | Solus | Eliza | Provider: `solusPremiumProvider` — weekly premium data for content |

**Implementation:**
- Each provider uses ASK_AGENT internally (or cache) to fetch data from the source agent
- Providers are `dynamic: true` — only included when the target agent composes state for relevant actions
- Cache TTL: 15 minutes for market data, 1 hour for P&L/performance
- Fallback: if source agent is unavailable, provider returns empty (action proceeds without cross-agent data)

**Files:**
- `src/plugins/plugin-solus/src/providers/vinceOptionsInjector.provider.ts` (new)
- `src/plugins/plugin-vince/src/providers/echoSentiment.provider.ts` (new)
- `src/plugins/plugin-vince/src/providers/oracleRegime.provider.ts` (new)
- `src/plugins/plugin-eliza/src/providers/tradingPerformance.provider.ts` (new)

### 5.2 Weekly Review Action (Phase 1)

**What:** A new action on Kelly (the orchestrator) that pulls a unified weekly scorecard from all agents via ASK_AGENT.

**Name:** `KELLY_WEEKLY_REVIEW`

**Triggers:** "weekly review", "how did we do this week", "scorecard", "weekly scorecard"

**Output structure:**

```
## Weekly Scorecard — Week of [date]

### Trading ($100K Target: $1,923/wk)
- Paper bot P&L: [Vince] +$X / -$Y (win rate Z%)
- Premium income: [Solus] $X collected (YTD pace: $X annualized)
- Execution: [Otaku] X signals executed, Y skipped

### Intelligence
- Echo: CT sentiment was [bullish/bearish/mixed] — accuracy vs price: X%
- Oracle: [N] Polymarket calls, [M] correct

### Knowledge & Content
- Eliza: [N] uploads, [M] essays drafted, [K] tweets drafted
- Knowledge base: [X] items (+Y this week)

### Engineering
- Sentinel: [N] features shipped, [M] bugs fixed, [K] PRDs written

### Lifestyle
- Kelly: [summary of the week's picks and moments]

### $100K Pace
- Weekly target: $1,923 | This week: $X | YTD: $X | On track: [yes/no]
```

**Files:**
- `src/plugins/plugin-kelly/src/actions/kellyWeeklyReview.action.ts` (new)

### 5.3 Sentiment → Risk Integration (Phase 2)

**What:** Vince's signal aggregator weights are adjusted by Echo sentiment and Oracle regime.

**Mechanism:**
1. Before `evaluateAndTrade()`, Vince's signal aggregator calls `echoSentimentProvider` and `oracleRegimeProvider`
2. Sentiment score (1-10) and regime (risk-on/risk-off/uncertain) adjust position sizing:
   - Risk-off regime: max position size halved
   - Bearish sentiment (< 4): skip new longs, tighten stop-losses
   - Bullish sentiment (> 7) + risk-on: full size
3. All adjustments logged in trade journal with the sentiment/regime that influenced them

**Risk controls:**
- Sentiment is an input, not a veto — the deterministic risk engine makes the final call
- If Echo or Oracle are unreachable, default to neutral (no adjustment)
- Every trade journal entry records `sentimentScore`, `regime`, `adjustmentApplied`

**Files:**
- `src/plugins/plugin-vince/src/services/vinceSentimentGate.ts` (new)
- Modify: `src/plugins/plugin-vince/src/services/vinceSignalAggregator.service.ts`

### 5.4 Post-Mortem Loop (Phase 2)

**What:** After every losing trade (or weekly), Vince triggers a structured post-mortem that asks each relevant agent for their perspective.

**Flow:**
1. Trade closes at a loss → `VINCE_POST_MORTEM` evaluator fires
2. Evaluator asks (via ASK_AGENT):
   - **Echo:** "What was CT sentiment on [asset] when we entered on [date]?"
   - **Oracle:** "What was Polymarket pricing for [relevant market] on [date]?"
   - **Solus:** "Given [entry, exit, size], was the sizing correct?"
3. Aggregates responses into a structured post-mortem stored in `docs/standup/post-mortems/`
4. Sentinel picks up post-mortems in weekly suggestions → surfaces patterns → generates PRDs for fixes

**Files:**
- `src/plugins/plugin-vince/src/evaluators/postMortem.evaluator.ts` (new)
- `docs/standup/post-mortems/` (new directory)

### 5.5 Content Flywheel (Phase 2)

**What:** Eliza's `WRITE_ESSAY` and `DRAFT_TWEETS` actions automatically pull trading performance, sentiment, and premium data when composing content.

**Mechanism:**
- `tradingPerformanceProvider` (from 5.1) injects: Vince bot P&L, Solus premium, Echo accuracy, Oracle predictions
- `WRITE_ESSAY` prompt includes: "If the user says 'from this week's research' or 'from this week's trading', use the trading performance data in your context to write about real results"
- `DRAFT_TWEETS` prompt includes: "When performance data is available, incorporate concrete numbers (not hypothetical) — '$2,140 in premium this week' beats 'options trading is profitable'"

**Files:**
- Modify: `src/plugins/plugin-eliza/src/actions/writeEssay.action.ts` (add provider reference)
- Modify: `src/plugins/plugin-eliza/src/actions/draftTweets.action.ts` (add provider reference)

---

## 6. Quick Actions to Add (Beyond the 5 Just Shipped)

| Agent | New Chip | Message | Validates Against |
|-------|----------|---------|-------------------|
| Kelly | "Weekly Scorecard" | "Weekly review — how did we do?" | `KELLY_WEEKLY_REVIEW` (new) |
| Vince | "Post-Mortem" | "Post-mortem on the last losing trade" | `VINCE_POST_MORTEM` (new) |
| Vince | "Sentiment Gate" | "What does Echo and Oracle say about my next trade?" | `VINCE_SENTIMENT_CHECK` (new) |
| Echo | "Feed Vince" | "Push sentiment to Vince's risk model" | `ECHO_PUSH_SENTIMENT` (new) |
| Eliza | "Weekly Performance Post" | "Write a Substack about this week's trading results" | `WRITE_ESSAY` (existing, enhanced) |

---

## 7. Architecture — The Loop

```
                    ┌─────────────────────────────────────────────┐
                    │              WEEKLY REVIEW (Kelly)           │
                    │  Pulls from all agents, measures $100K pace  │
                    └──────┬──────────────────────────┬────────────┘
                           │                          │
                    ┌──────▼──────┐           ┌───────▼───────┐
                    │  SENTINEL   │           │    ELIZA      │
                    │  Fix + Ship │           │ Publish + Grow│
                    │  PRDs, code │           │ Substack, X   │
                    └──────┬──────┘           └───────┬───────┘
                           │ post-mortem insights      │ trading data
                           │                          │
    ┌──────────┐    ┌──────▼──────────────────────────▼───────┐
    │  NAVAL   │    │              VINCE (Paper Bot)           │
    │ Mindset  ├───►│  Signals + Data + Bot + Risk Engine      │
    │ Grounding│    │  ← Echo sentiment  ← Oracle regime       │
    └──────────┘    └──────┬──────────────┬───────────────────┘
                           │              │
                    ┌──────▼──────┐ ┌─────▼──────┐
                    │   SOLUS     │ │   OTAKU    │
                    │ Strike Plan │ │  Execute   │
                    │ Premium P&L │ │  Funded $  │
                    └─────────────┘ └────────────┘
                           ▲              ▲
                    ┌──────┴──────┐ ┌─────┴──────┐
                    │   ECHO      │ │  ORACLE    │
                    │ CT Sentiment│ │ Polymarket │
                    │ Vibe + Pulse│ │ Odds/Regime│
                    └─────────────┘ └────────────┘
```

---

## 8. Phased Rollout

### Phase 1 — Handoffs & Scorecard (2 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 1 | `vinceOptionsInjector.provider.ts` — Solus gets Vince options data automatically | Solus | P0 |
| 2 | `echoSentiment.provider.ts` — Vince gets Echo sentiment score | Vince | P0 |
| 3 | `oracleRegime.provider.ts` — Vince gets Oracle regime indicator | Vince | P1 |
| 4 | `KELLY_WEEKLY_REVIEW` action + quick-action chip | Kelly | P0 |
| 5 | `tradingPerformance.provider.ts` — Eliza gets trading data for content | Eliza | P1 |
| 6 | Quick-action validation tests for all new actions | All | P0 |

**Success criteria:** User clicks "Weekly Scorecard" on Kelly and gets a unified report from all agents. Solus's strike ritual includes Vince's options data without copy/paste.

### Phase 2 — Intelligence & Learning (3 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 7 | `vinceSentimentGate.ts` — sentiment adjusts position sizing | Vince | P0 |
| 8 | `postMortem.evaluator.ts` — automated loss analysis | Vince | P1 |
| 9 | Enhance `WRITE_ESSAY` to use `tradingPerformanceProvider` | Eliza | P1 |
| 10 | Enhance `DRAFT_TWEETS` to use concrete trading numbers | Eliza | P1 |
| 11 | Sentinel auto-picks up post-mortems in weekly suggestions | Sentinel | P2 |

**Success criteria:** Paper bot adjusts sizing based on CT sentiment. Losing trades generate structured post-mortems. Eliza's Substack drafts include real performance numbers.

### Phase 3 — Autonomy (4 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 12 | Scheduled daily briefing: Kelly coordinates morning standup with real data | Kelly | P1 |
| 13 | Sentinel auto-PRD from post-mortem patterns | Sentinel | P2 |
| 14 | Otaku auto-execute (opt-in): when paper bot confidence > threshold, Otaku executes live | Otaku | P2 |
| 15 | Echo watchlist → Vince signal pipeline (new tokens auto-monitored) | Echo→Vince | P2 |

**Success criteria:** The system proactively finds trades, sizes them with sentiment, executes on paper, measures results, writes about them, and fixes its own bugs — with minimal user intervention.

### Phase 4 — Measurement, Readiness & Content (2 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 16 | $100K pace at a glance — single card: on track / behind | Kelly / Vince | P1 |
| 17 | Vince → Solus strike handoff (cache `vince:strike_suggestion`) | Vince + Solus | P2 |
| 18 | Confidence in signal cache (0–100 for Otaku auto-execute) | Vince | P1 |
| 19 | Weekly performance content (one-tap Substack + tweets) | Eliza + Kelly | P2 |
| 20 | Sentiment accuracy tracking (entry sentiment vs outcome) | Vince / Echo | P2 |
| 21 | Go-live readiness checklist (paper stats + sentiment + confirm) | Otaku / Kelly | P2 |

**Success criteria:** One glance tells you $100K pace. Content writes itself from real data. Going live requires proving it on paper first.

### Phase 5 — The Genome: Self-Evolving Trading System (4 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 22 | Counterfactual Engine — replay avoided decisions, quantify missed PnL | Vince | P0 |
| 23 | Strategy Genome + Auto-Tuning — mutation, replay, fitness, auto-promote | Vince | P0 |
| 24 | Regime Profiles — 5 market personalities, auto-switch | Vince + Oracle + Echo | P1 |
| 25 | Intelligence → Signal Source — Grok daily intel as aggregator arm | Vince + Grok | P1 |
| 26 | Portfolio Construction — correlation, heat, Kelly sizing, opportunity cost | Vince | P1 |
| 27 | Execution Graduation — L0→L3 trust levels, demotion, circuit breaker | Otaku | P2 |
| 28 | Agent Collective Memory — weekly intelligence brief from all agents | Sentinel + all | P2 |
| 29 | Flywheel Score — composite 0–100 system health metric | Kelly | P1 |

**Success criteria:** The system observes itself, evolves its own parameters, and earns the right to trade real money. Genome promotes at least 1 variant/month. Flywheel Score trends upward.

### Phase 6 — The Adversary: Antifragile Intelligence (6 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 30 | Pre-Mortem Engine — "this trade just died; what killed it?" before entry | Vince | P0 |
| 31 | War Room: Monte Carlo Forward Simulation — 1000 futures, optimize the tail | Vince | P0 |
| 32 | Internal Prediction Market — track every agent prediction, validate, Brier score | All | P0 |
| 33 | Devil's Advocate Protocol — argue against every trade, genome, and regime call | Vince + Sentinel | P1 |
| 34 | Narrative Radar — narrative arcs (inception→growth→peak→decline) per asset | Echo + Vince | P1 |
| 35 | Temporal Coherence Engine — multi-timeframe alignment (4H + daily + weekly) | Vince | P1 |
| 36 | Immune System: Attack Pattern Recognition — 15+ patterns, evolves with losses | Vince | P2 |
| 37 | Dead End Elimination — wire every information dead end shut | All | P1 |

**Success criteria:** The system gets stronger from attacks. Pre-mortem saves money weekly. War Room prevents tail-risk genome promotions. Every prediction is tracked and validated. The system has two voices — thesis and counter-thesis — for every decision.

---

## 9. Non-Goals

- **Not replacing ASK_AGENT** — providers build on top of ASK_AGENT, not around it
- **Not adding live execution to Vince** — Vince stays paper-only; Otaku is the only funded executor
- **Not changing the trading runtime contract** — producer/executor separation is preserved
- **Not building a new UI** — quick-action chips and existing chat interface are sufficient
- **Not automating Kelly's lifestyle recommendations** — Kelly stays human-triggered, not scheduled
- **Not training an adversarial RL agent** — Devil's Advocate is retrieval + rule-based, not a trained adversary
- **Not adding cross-exchange arbitrage** — immune system detects manipulation, doesn't arbitrage it
- **Not using tick-by-tick order flow** — temporal coherence uses OHLC candles, not trade-by-trade
- **Not manufacturing narratives** — we read narrative arcs, we don't create them to influence CT
- **Not adding real stakes to the prediction market** — reputation and influence weight only, no on-chain betting

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| ASK_AGENT latency for multi-agent queries (weekly review) | Parallel ASK_AGENT calls; 30s timeout per agent; partial results if one agent is slow |
| Sentiment data quality (Echo depends on X API) | Sentiment is advisory, not a veto; if unavailable, default to neutral |
| Over-reliance on automation | Phase 3 auto-execute is opt-in with hard spending limits; paper bot must prove itself first |
| Context bloat from cross-agent providers | All providers are `dynamic: true` and cached; only activated for relevant actions |
| Post-mortem overload | Throttle to one post-mortem per day max; batch weekly for Sentinel review |
| Genome drift / overfitting (Phase 5) | Genome variants tested on held-out data (not just training set); promotion requires beating current by >X% on Sharpe; rollback to previous generation if live performance degrades |
| Counterfactual data quality (Phase 5) | Price-after-avoid uses feature store or cached prices, not live re-fetch; results are directional (did it go our way?) not exact PnL; clearly labeled as estimates |
| Collective memory staleness (Phase 5) | Weekly briefs are date-stamped; agents weight recent briefs higher; briefs older than 8 weeks are archived, not loaded |
| Execution graduation gaming (Phase 5) | Trust levels use rolling windows, not cumulative; a single exceptional week can't skip levels; demotion is automatic and faster than promotion |
| Pre-mortem false positives blocking good trades (Phase 6) | Survival probability threshold is tunable (genome can evolve it); counterfactual tracks blocked trades to measure missed opportunity; start conservative (threshold 30), tighten over time |
| War Room overfitting to synthetic scenarios (Phase 6) | Monte Carlo samples from actual feature store distributions (not parametric); scenario generation uses bootstrap resampling; validate by comparing simulated tail to actual realized tail quarterly |
| Devil's Advocate over-blocking (Phase 6) | Counter-thesis only triggers downgrade when base rate > 60% (not 50%); tracked separately so we can measure "advocate was right" vs "advocate blocked a winner"; threshold is genome-evolvable |
| Narrative Radar misclassifying narrative phase (Phase 6) | Narrative phases use multiple confirming signals (volume + account quality + counter-narrative emergence); classification errors tracked and fed back; "uncertain" phase is a valid output (no action taken) |
| Temporal coherence reducing trade frequency too much (Phase 6) | Alignment threshold (2/3 vs 3/3) is genome-evolvable; A/B tracked via feature store; if win rate doesn't improve, genome relaxes threshold; minimum 1/week trade floor regardless |
| Prediction market penalizing inherently uncertain predictions (Phase 6) | Brier score rewards calibration (saying 60% when right 60% of the time) not just accuracy; agents aren't penalized for honest uncertainty; only penalized for confident-and-wrong |
| Immune system pattern library staleness (Phase 6) | Patterns date-stamped; effectiveness tracked (true positive rate); patterns with < 20% trigger rate over 6 months are reviewed; new patterns added from post-mortems automatically |
| Dead end wiring increasing context bloat (Phase 6) | New data flows are cached with TTL, not injected into every context; dynamic providers only, activated for relevant actions; total context budget enforced |

---

## 11. Success Criteria (System-Level)

| Metric | Target | Measured By |
|--------|--------|-------------|
| Weekly premium income | $1,923/wk ($100K/yr pace) | Solus `SOLUS_PREMIUM_PNL` |
| Paper bot win rate | > 55% | Vince `VINCE_BOT_STATUS` |
| Paper bot max drawdown | < 15% | Vince bot risk engine |
| Sentiment integration | 100% of trades have sentiment metadata | Trade journal |
| Post-mortem coverage | Every losing trade analyzed within 24h | `docs/standup/post-mortems/` |
| Weekly review | Generated every Monday | Kelly `KELLY_WEEKLY_REVIEW` |
| Content output | 1 Substack + 5 tweets per week | Eliza action logs |
| Engineering velocity | 3+ features shipped per week | Sentinel weekly suggestions |
| Knowledge expansion | 10+ uploads per week | Eliza `KNOWLEDGE_STATUS` |
| User intervention needed | < 30 min/day for trading operations | Qualitative |
| Flywheel Score | Trending upward month-over-month | Kelly `KELLY_FLYWHEEL_SCORE` |
| Genome generations | 1+ promoted variants per month | `genome_history.jsonl` |
| Counterfactual accuracy | Weekly report generated; informs genome | `vinceCounterfactual.service.ts` |
| Execution graduation | Reach L2 (CONFIRM_EXECUTE) within 8 weeks of paper profitability | `executionGraduation.service.ts` |
| Collective memory | Weekly brief generated every Monday; loaded by all agents | `knowledge/teammate/weekly-briefs/` |
| Pre-mortem saves | ≥ 1 blocked trade/week validated as correct by counterfactual | `vincePreMortem.service.ts` |
| War Room tail survival | ≥ 1 genome rejection/month that looked good on median but fragile in 5th-pctl | `vinceWarRoom.service.ts` |
| Prediction calibration | Per-agent Brier score improving month-over-month | `predictionTracker.service.ts` |
| Devil's Advocate accuracy | Counter-thesis correct > 30% of the time | `vinceDevilsAdvocate.service.ts` |
| Narrative phase detection | ≥ 1 phase transition detected/month before price peak | `vinceNarrativeRadar.service.ts` |
| Temporal coherence lift | Win rate +3 pp vs single-timeframe baseline | Feature store A/B comparison |
| Immune system catches | ≥ 1 attack pattern caught/quarter; library grows with losses | `vinceImmuneSystem.service.ts` |
| Information dead ends | Zero remaining; every data point has ≥ 1 consumer | System audit |
| Antifragility ratio | System performs better in high-volatility months than low-vol | Monthly Sharpe comparison by DVOL regime |

---

## 12. References

- [AGENTS_INDEX.md](../../docs/AGENTS_INDEX.md) — per-agent capabilities and PRD focus
- [MULTI_AGENT.md](../../docs/MULTI_AGENT.md) — ASK_AGENT, Discord, A2A
- [TRADING_RUNTIME_CONTRACT.md](../../docs/TRADING_RUNTIME_CONTRACT.md) — producer/executor flow
- [FEATURE-STORE.md](../../docs/FEATURE-STORE.md) — ML feature storage for paper bot
- [SOLUS_NORTH_STAR.md](../../docs/SOLUS_NORTH_STAR.md) — Solus vision and roadmap
- [THREE-CURVES.md](../../knowledge/teammate/THREE-CURVES.md) — Left/mid/right curve strategy
- `src/frontend/components/chat/chat-interface.tsx` — Quick-action definitions (source of truth)
- `src/plugins/plugin-inter-agent/` — ASK_AGENT implementation
- `src/plugins/plugin-vince/` — Paper bot, signal aggregator, risk engine
- `src/plugins/plugin-solus/src/actions/solusPremiumPnl.action.ts` — Premium P&L tracker (just shipped)
