# PRD: One Dream — Agent Synergy & the $100K Trading System

**Status:** Phase 1–5 Implemented (V4.2.0) — Phase 6 Implemented (V4.3.0) — Phase 7 Implemented (V4.3.1) — Phase 8 Planned (Gated) — Phase 9 Planned (Skills-Focused) — Phase 10–12 Planned  
**Scope:** Close the remaining gaps between agents so the team operates as a single system: data flows into decisions, decisions flow into execution, execution flows into learning, learning flows into better data. Every agent has a clear role; every handoff is one click. **Phase 5** closes the final loop: the system observes itself, evolves its own parameters, and earns the right to trade real money. **Phase 6** turns the system from smart to unkillable: forward simulation, adversarial challenge, narrative intelligence, and prediction accountability. **Phase 7** makes calibration visible everywhere so confidence is earned, measured, and reported system-wide.

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
| 30 | Pre-Mortem Engine | ✅ | `vincePreMortem.service.ts` + tests; trade entry survival scoring and block path wired into paper trading loop. |
| 31 | War Room: Monte Carlo Forward Simulation | ✅ | `vinceWarRoom.service.ts` + tests; genome promotion tail-risk gate in `vinceGenome.service.ts` (5th percentile survival check). |
| 32 | Internal Prediction Market | ✅ | `predictionTracker.service.ts` + `predictionValidation.tasks.ts`; prediction registration, expiry validation, per-agent Brier snapshots. |
| 33 | Devil's Advocate Protocol | ✅ | `vinceDevilsAdvocate.service.ts`; counter-thesis scoring integrated in trade/genome decision path. |
| 34 | Narrative Radar | ✅ | `vinceNarrativeRadar.service.ts`; narrative phase classification wired into regime/risk overlays. |
| 35 | Temporal Coherence Engine | ✅ | `vinceTemporalCoherence.service.ts`; multi-timeframe alignment score integrated before entry. |
| 36 | Immune System: Attack Pattern Recognition | ✅ | `vinceImmuneSystem.service.ts` + curated `knowledge/teammate/attack-patterns/*.json`; pattern match can block risky setups. |
| 37 | Dead End Elimination | ✅ | Grok sub-agent signal arms in bandit flow, flywheel/bandit wiring, collective memory ingestion checks, trust-level awareness in risk flow. |

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

## Phase 7 — Calibration Everywhere (V4.3.1)

**Theme:** Phase 6 made predictions explicit. Phase 7 makes prediction quality visible across the entire operating system.

**Core insight:** PnL can hide bad calibration. A system can be profitable and still be dangerously overconfident. The operating metric is no longer only "did we win?" but also "when we said 80%, were we right 80% of the time?" Phase 7 turns calibration into a first-class metric for Vince, Kelly, and Sentinel.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 38 | **Prediction Calibration API + Action** | Vince | P0 | Add a dedicated calibration read path: `VINCE_PREDICTION_CALIBRATION` action and `/vince/prediction-calibration` route. Return overall and by-agent Brier metrics over configurable windows. |
| 39 | **Cross-Agent Calibration Reporting** | Kelly + Sentinel | P0 | Kelly flywheel and Sentinel weekly/investor reporting include Vince calibration (`predictionBrier`, `predictionCount`) so weekly reviews track calibration drift, not only PnL. |
| 40 | **Closed Accountability Loop** | Vince + Kelly + Sentinel | P1 | Ensure a complete loop: predictions are registered, validated at expiry, scored, and surfaced in reporting. Accuracy now changes visibility and downstream confidence in agent outputs. |

**Success criteria for Phase 7**

- `VINCE_PREDICTION_CALIBRATION` returns usable calibration summaries on demand.
- `/vince/prediction-calibration` is available through agent-scoped plugin routes for ops dashboards and reporting consumers.
- Kelly and Sentinel weekly outputs include calibration line-items alongside performance.
- Calibration trend is visible week-over-week and becomes part of operating conversations.

**Out of scope for Phase 7**

- New strategy classes or extra execution venues.
- Phase 8 expansion before Phase 6/7 stability and measurement quality are validated.

### Implementation status (Phase 7)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 38 | Prediction Calibration API + Action | ✅ | `predictionCalibration.action.ts` + `/vince/prediction-calibration` route in plugin-vince index; windowed snapshot support. |
| 39 | Cross-Agent Calibration Reporting | ✅ | Kelly flywheel action and Sentinel "how did we do"/investor/weekly task now ask Vince for calibration and include it in output. |
| 40 | Closed Accountability Loop | ✅ | Prediction tracker + validation task + reporting integration complete end-to-end prediction accountability loop. |

### Suggested file map (Phase 7)

| File | Agent | New/Modify |
|------|-------|------------|
| `src/plugins/plugin-vince/src/actions/predictionCalibration.action.ts` | Vince | New |
| `src/plugins/plugin-vince/src/index.ts` | Vince | Modify (add `/vince/prediction-calibration` route) |
| `src/plugins/plugin-kelly/src/actions/kellyFlywheelScore.action.ts` | Kelly | Modify (surface `predictionBrier` / `predictionCount`) |
| `src/plugins/plugin-sentinel/src/actions/sentinelHowDidWeDo.action.ts` | Sentinel | Modify |
| `src/plugins/plugin-sentinel/src/actions/sentinelInvestorReport.action.ts` | Sentinel | Modify |
| `src/plugins/plugin-sentinel/src/tasks/sentinelWeekly.tasks.ts` | Sentinel | Modify |

---

## Phase 8 — The Compounding Edge: Research → Alpha → Distribution (Planned)

**Theme:** Convert X research into measurable trading edge, and convert realized edge into higher-signal content that improves the next research cycle.

**Core insight:** Phase 6 made the system survive; Phase 7 made confidence measurable. Phase 8 is about compounding speed and quality. The priority is not adding more features, but increasing edge velocity: discover faster, attribute better, size cleaner, and publish sharper outputs from real system data.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 41 | **X Source Quality Engine** | Echo + Vince | P0 | Score X accounts by predictive contribution (precision/recall, calibration, time-to-resolution). Feed source quality into signal weighting so low-quality noise is downranked automatically. |
| 42 | **Narrative-to-Price Lag Model** | Echo + Vince | P0 | Quantify lag between narrative phase transitions and realized price movement by asset and timeframe. Emit `lagAdjustedConfidence` into pre-trade scoring and sizing. |
| 43 | **Research-to-Trade Attribution** | Vince | P0 | Persist source lineage on every trade decision, then attribute post-close outcome back to source clusters. Improve bandit updates using contribution quality, not only final trade PnL. |
| 44 | **Execution Quality Model** | Otaku + Vince | P1 | Separate thesis quality from execution quality (slippage, route, timing, fill drift). Apply execution penalty to sizing and readiness to avoid false confidence from good ideas with poor execution. |
| 45 | **Regime Transition Forecaster** | Vince + Oracle + Echo | P1 | Add transition probability between regimes, not just current regime label. Reduce heat/sizing when transition risk is elevated; restore conviction when stable and aligned. |
| 46 | **Content Performance Feedback Loop** | Eliza + Kelly | P1 | Track output quality (engagement quality, retention, follow-through) and tie performance to narrative/source inputs. Promote content patterns that improve research quality and user decisions. |
| 47 | **Weekly Alpha Memo (Auto-Draft)** | Eliza + Sentinel | P2 | Generate a publish-ready memo from logs: what worked, what failed, what changed in source weights, where narratives are early/late. Real metrics only; no generic commentary. |
| 48 | **X-Research Command Center** | Echo + Kelly | P2 | Single action/chip for top predictive X sources, emerging narratives, expected lag windows, and recommendation split: trade now vs watchlist only. |

**Success criteria for Phase 8**

- X-driven signals show improved hit-rate or expectancy versus non-X baseline over rolling 4-week windows.
- At least 80% of closed trades include source attribution with contribution scoring.
- Execution quality drag is measured weekly and trends downward month-over-month.
- Regime transition warnings reduce drawdown during high-transition periods.
- Weekly content cadence is maintained and includes concrete numbers sourced from runtime logs.
- A weekly alpha memo can be generated end-to-end without manual spreadsheet stitching.

**Out of scope for Phase 8**

- New exchanges/chains or venue expansion.
- Fully autonomous publishing without human final approval.
- Broad UI redesigns beyond minimal command center/chip additions.
- Any task that does not directly improve (1) trading algorithm quality, (2) content output quality/throughput, or (3) X-research insight quality.

### Implementation status (Phase 8)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 41 | X Source Quality Engine | ⬜ | Planned, gated by Phase 6/7 validation |
| 42 | Narrative-to-Price Lag Model | ⬜ | Planned, gated by Phase 6/7 validation |
| 43 | Research-to-Trade Attribution | ⬜ | Planned, gated by Phase 6/7 validation |
| 44 | Execution Quality Model | ⬜ | Planned, gated by Phase 6/7 validation |
| 45 | Regime Transition Forecaster | ⬜ | Planned, gated by Phase 6/7 validation |
| 46 | Content Performance Feedback Loop | ⬜ | Planned, gated by Phase 6/7 validation |
| 47 | Weekly Alpha Memo (Auto-Draft) | ⬜ | Planned, gated by Phase 6/7 validation |
| 48 | X-Research Command Center | ⬜ | Planned, gated by Phase 6/7 validation |

### Suggested file map (Phase 8)

| File | Agent | New/Modify |
|------|-------|------------|
| `src/plugins/plugin-x-research/src/services/xSourceQuality.service.ts` | Echo | New |
| `src/plugins/plugin-vince/src/services/vinceXSourceAttribution.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceNarrativeLag.service.ts` | Vince + Echo | New |
| `src/plugins/plugin-vince/src/services/vinceSignalAggregator.service.ts` | Vince | Modify (consume `lagAdjustedConfidence` and source-quality weights) |
| `src/plugins/plugin-vince/src/services/vinceFeatureStore.service.ts` | Vince | Modify (persist source lineage, lag features, execution attribution) |
| `src/plugins/plugin-vince/src/services/vinceRegimeProfiles.service.ts` | Vince + Oracle + Echo | Modify (transition probability overlay) |
| `src/plugins/plugin-otaku/src/services/executionGraduation.service.ts` | Otaku | Modify (execution quality penalty integration) |
| `src/plugins/plugin-eliza/src/actions/writeEssay.action.ts` | Eliza | Modify (alpha memo mode from runtime metrics) |
| `src/plugins/plugin-sentinel/src/actions/sentinelInvestorReport.action.ts` | Sentinel | Modify (include weekly alpha memo linkage) |
| `src/plugins/plugin-kelly/src/actions/kellyWeeklyReview.action.ts` | Kelly | Modify (surface X-research command center summary) |
| `src/frontend/components/chat/chat-interface.tsx` | Kelly + Echo | Modify (add "X-Research Command Center" chip) |

---

## Phase 9 — Skills Operating System: Skill-First Execution (Planned)

**Theme:** Make `skills/` a first-class operating layer for trading research, execution runbooks, and content intelligence.

**Core insight:** The repo has high-value capabilities in `skills/x-research` and `skills/trading-agent`, but they are mostly used manually. Phase 9 productizes skills into a governed system: discoverable, measurable, testable, and directly wired to trading quality and content quality outcomes.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 49 | **Skill Registry + Metadata Index** | Sentinel + Kelly | P0 | Build a registry from `skills/*/SKILL.md` with capabilities, triggers, owners, required env, and risk level. Expose "which skill should run now?" for operators and agents. |
| 50 | **Skill Router for ASK_AGENT** | Sentinel + plugin-inter-agent | P0 | Add deterministic routing hints so queries mentioning "x research", "trading agent", EVClaw, Hyperliquid live ops, etc. route to the right skill context first. |
| 51 | **X-Research Skill Hardening** | Echo | P0 | Upgrade `skills/x-research` with saved query packs, benchmark queries, source-tiering, and output templates that map directly to trade/no-trade/watchlist decisions. |
| 52 | **Trading-Agent Skill Runbook Hardening** | Otaku + Vince | P1 | Expand `skills/trading-agent` into operator-grade runbooks: bootstrap checks, delegated-signer validation, safety preflight, rollback/kill-switch checklists, and mode-change SOPs. |
| 53 | **Skill Telemetry + Scoreboard** | Sentinel + Kelly | P1 | Track skill usage, latency, successful outcomes, and downstream impact (trade quality, content quality, X insight quality). Add weekly skill scoreboard to Sentinel/Kelly reports. |
| 54 | **Skill QA Harness** | Sentinel | P1 | Add reproducible tests for skill triggers, expected outputs, and stale-doc detection (`SKILL.md` drift checks vs actual scripts/files). |
| 55 | **Skill-to-Content Pipeline** | Eliza + Echo | P2 | Convert high-signal `x-research` outputs into reusable content briefs (Substack/Tweets) with provenance links and confidence tags. |
| 56 | **Skill Governance + Promotion Rules** | Sentinel + Kelly | P2 | Define lifecycle: draft → validated → promoted → deprecated. A skill can only be promoted if it improves at least one KPI (trading algo, content output, or X insight quality). |

**Success criteria for Phase 9**

- 100% of skills under `skills/` are indexed in a registry with owner, trigger map, and risk class.
- Skill routing accuracy for skill-intent queries reaches a target threshold (e.g. >90% in eval prompts).
- `x-research` skill outputs include actionable decision buckets (trade now / monitor / ignore) with source provenance.
- `trading-agent` skill includes complete safety preflight + rollback checklists for live ops.
- Weekly reports include a skill scoreboard with adoption and impact metrics.
- New skills can be validated via the QA harness before operational use.

**Out of scope for Phase 9**

- Replacing core plugin logic with skills.
- Live key custody changes or relaxing execution safety controls.
- Skill sprawl without measurable KPI impact.

### Implementation status (Phase 9)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 49 | Skill Registry + Metadata Index | ⬜ | Planned |
| 50 | Skill Router for ASK_AGENT | ⬜ | Planned |
| 51 | X-Research Skill Hardening | ⬜ | Planned |
| 52 | Trading-Agent Skill Runbook Hardening | ⬜ | Planned |
| 53 | Skill Telemetry + Scoreboard | ⬜ | Planned |
| 54 | Skill QA Harness | ⬜ | Planned |
| 55 | Skill-to-Content Pipeline | ⬜ | Planned |
| 56 | Skill Governance + Promotion Rules | ⬜ | Planned |

### Suggested file map (Phase 9)

| File | Agent | New/Modify |
|------|-------|------------|
| `skills/README.md` | Shared | New (skills index and conventions) |
| `skills/registry.json` | Shared | New (generated metadata registry) |
| `skills/x-research/SKILL.md` | Echo | Modify (decision templates + benchmark query packs) |
| `skills/x-research/README.md` | Echo | Modify |
| `skills/trading-agent/SKILL.md` | Otaku + Vince | Modify (live ops runbook sections) |
| `skills/trading-agent/README.md` | Otaku + Vince | Modify |
| `src/plugins/plugin-inter-agent/src/actions/askAgent.action.ts` | Sentinel | Modify (skill routing hints) |
| `src/plugins/plugin-sentinel/src/tasks/sentinelWeekly.tasks.ts` | Sentinel | Modify (skill scoreboard section) |
| `src/plugins/plugin-kelly/src/actions/kellyWeeklyReview.action.ts` | Kelly | Modify (skills impact snapshot) |
| `scripts/skills/build-registry.ts` | Sentinel | New |
| `scripts/skills/check-skill-drift.ts` | Sentinel | New |
| `scripts/skills/eval-skill-routing.ts` | Sentinel | New |

---

## Phase 10 — Live Capital Pilot: Earned Risk, Not Assumed Risk (Planned)

**Theme:** Move from paper excellence to tightly controlled live deployment with hard downside protection.

**Core insight:** A calibrated paper system is necessary but not sufficient. Real capital introduces new failure modes: fill quality drift, route degradation, liquidity slippage, and operational errors. Phase 10 ensures live exposure is earned through policy gates and reduced automatically when edge quality degrades.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 57 | **Capital Buckets + Risk Budgets** | Vince + Otaku | P0 | Allocate capital into policy buckets (core/tactical/experimental) with fixed heat and max-DD budgets per bucket. |
| 58 | **Live/Paper Drift Sentinel** | Vince | P0 | Detect expectation drift between paper and live outcomes (fill, slippage, R multiple) and auto-tighten sizing on divergence. |
| 59 | **Execution Audit Trail** | Otaku + Sentinel | P0 | Full per-trade trace: thesis, route, latency, slippage, expected vs realized R, and policy checks passed/failed. |
| 60 | **Hard Circuit Stack** | Otaku | P0 | Multi-layer kill switches (daily loss cap, execution anomaly, venue health failure, route failure) with immediate downshift. |
| 61 | **Capital Promotion Ladder v2** | Otaku + Kelly | P1 | Expand trust ladder with stricter live-capital gates based on rolling Sharpe, DD, calibration, and execution quality. |
| 62 | **Post-Trade Causal Labels** | Vince | P1 | Classify each loss/win by cause (signal, sizing, execution, regime, narrative timing) for weekly policy updates. |
| 63 | **Operator Console: Live Safety State** | Kelly + Sentinel | P1 | One action/chip for `safe` / `caution` / `halt` with exact policy blockers and recommended next action. |
| 64 | **Live Pilot Weekly Committee** | Kelly + Sentinel + Otaku + Vince | P2 | Formal weekly go/no-go process with immutable logs; no discretionary scale-up without checklist pass. |

**Success criteria for Phase 10**

- Live pilot runs 8 consecutive weeks without hard-circuit breach.
- Live max drawdown remains inside declared policy range.
- Drift sentinel catches degradation before major weekly PnL damage.
- Capital scale-up only happens through policy gates (no ad hoc increases).
- 100% of live trades have complete execution audit records.

**Out of scope for Phase 10**

- Multi-venue expansion.
- Removing human approval from high-risk capital changes.
- Strategy proliferation beyond existing sleeves/profiles.

### Implementation status (Phase 10)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 57 | Capital Buckets + Risk Budgets | ⬜ | Planned |
| 58 | Live/Paper Drift Sentinel | ⬜ | Planned |
| 59 | Execution Audit Trail | ⬜ | Planned |
| 60 | Hard Circuit Stack | ⬜ | Planned |
| 61 | Capital Promotion Ladder v2 | ⬜ | Planned |
| 62 | Post-Trade Causal Labels | ⬜ | Planned |
| 63 | Operator Console: Live Safety State | ⬜ | Planned |
| 64 | Live Pilot Weekly Committee | ⬜ | Planned |

### Suggested file map (Phase 10)

| File | Agent | New/Modify |
|------|-------|------------|
| `src/plugins/plugin-vince/src/services/vinceLivePaperDrift.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceTradeCausality.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceRiskManager.service.ts` | Vince | Modify (bucketed risk budgets + drift response) |
| `src/plugins/plugin-otaku/src/services/executionGraduation.service.ts` | Otaku | Modify (capital ladder v2 integration) |
| `src/plugins/plugin-otaku/src/services/liveCircuitBreaker.service.ts` | Otaku | New |
| `src/plugins/plugin-otaku/src/actions/otakuReadyToExecute.action.ts` | Otaku | Modify (live policy gate visibility) |
| `src/plugins/plugin-kelly/src/actions/kellyWeeklyReview.action.ts` | Kelly | Modify (live pilot committee block) |
| `src/plugins/plugin-sentinel/src/actions/sentinelHowDidWeDo.action.ts` | Sentinel | Modify (live safety and execution quality section) |
| `docs/standup/live-pilot/` | Shared | New directory (weekly committee logs) |

---

## Phase 11 — Portfolio Intelligence + Distribution Moat (Planned)

**Theme:** Improve portfolio-level capital efficiency and turn verified edge into high-trust distribution.

**Core insight:** Strategy quality alone does not maximize returns. The system must reallocate dynamically across sleeves, control contagion risk, and transform validated insights into content that compounds research quality and audience trust.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 65 | **Strategy Sleeve Allocation Engine** | Vince | P0 | Allocate risk across sleeves (trend, mean-reversion, event, narrative) with dynamic caps from rolling risk-adjusted performance. |
| 66 | **Cross-Asset Contagion Model** | Vince + Oracle | P0 | Estimate stress propagation and reduce correlated exposure before cascade regimes. |
| 67 | **Opportunity Cost Reallocator** | Vince | P1 | Replace weakest open exposure when a superior setup appears under portfolio constraints. |
| 68 | **Narrative Shelf-Life Decay** | Echo + Vince | P1 | Degrade narrative conviction over time when reinforcement signals weaken; prevent stale-thesis persistence. |
| 69 | **Content Truth Layer** | Eliza + Sentinel | P1 | Every performance claim in content references logs/metrics/source IDs to keep outputs verifiable. |
| 70 | **Insight Packaging System** | Eliza + Kelly + Echo | P1 | Standardized outputs: daily signal brief, weekly alpha memo, monthly thesis letter with consistent scorecard sections. |
| 71 | **Audience Feedback → Research Queue** | Kelly + Echo | P2 | Convert high-signal audience/operator questions into structured research tasks for X and strategy loops. |
| 72 | **Persistent Source Reputation Score** | Echo + Vince | P2 | Long-horizon reliability score for accounts/sources to improve routing, weighting, and narrative trust decisions. |

**Success criteria for Phase 11**

- Portfolio Sharpe improves without increasing max drawdown.
- Exposure concentration drops across sleeves and correlated clusters.
- Opportunity-cost reallocation improves capital efficiency metrics.
- Content output has near-zero unverifiable claims.
- Audience feedback yields measurable lift in research conversion quality.

**Out of scope for Phase 11**

- Marketing growth loops disconnected from measured edge.
- Vanity metrics without trading/content quality linkage.
- New execution venues unrelated to core portfolio objectives.

### Implementation status (Phase 11)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 65 | Strategy Sleeve Allocation Engine | ⬜ | Planned |
| 66 | Cross-Asset Contagion Model | ⬜ | Planned |
| 67 | Opportunity Cost Reallocator | ⬜ | Planned |
| 68 | Narrative Shelf-Life Decay | ⬜ | Planned |
| 69 | Content Truth Layer | ⬜ | Planned |
| 70 | Insight Packaging System | ⬜ | Planned |
| 71 | Audience Feedback → Research Queue | ⬜ | Planned |
| 72 | Persistent Source Reputation Score | ⬜ | Planned |

### Suggested file map (Phase 11)

| File | Agent | New/Modify |
|------|-------|------------|
| `src/plugins/plugin-vince/src/services/vinceSleeveAllocator.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceContagionModel.service.ts` | Vince + Oracle | New |
| `src/plugins/plugin-vince/src/services/vinceOpportunityCost.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceNarrativeRadar.service.ts` | Vince + Echo | Modify (shelf-life decay fields) |
| `src/plugins/plugin-eliza/src/actions/writeEssay.action.ts` | Eliza | Modify (truth-layer citations and metric IDs) |
| `src/plugins/plugin-eliza/src/actions/draftTweets.action.ts` | Eliza | Modify (claims validation checks) |
| `src/plugins/plugin-kelly/src/actions/kellyWeeklyReview.action.ts` | Kelly | Modify (packaged distribution outputs) |
| `src/plugins/plugin-x-research/src/services/sourceReputation.service.ts` | Echo | New |
| `docs/standup/alpha-memos/` | Shared | New directory |

---

## Phase 12 — Autonomous Compounding Governance (Final Phase, Planned)

**Theme:** Full autonomy with explicit governance, reversibility, and trust transparency.

**Core insight:** The finish line is not “fully automatic trading.” The finish line is an autonomous system that can explain itself, prove policy compliance, and recover safely from failure without heroics. Phase 12 codifies this as operating law.

| # | Task | Agent(s) | Priority | Notes |
|---|------|----------|----------|-------|
| 73 | **Policy Engine as Code** | Sentinel + Vince + Otaku | P0 | Versioned policy files for risk, execution, promotion, and rollback. Runtime decisions must cite policy IDs. |
| 74 | **Automatic Rollback Orchestrator** | Sentinel | P0 | Triggered rollback for strategy/profile/parameter regressions with safe restore and incident log generation. |
| 75 | **Shadow Challenger Framework** | Vince | P0 | Challenger variants run in shadow; promotion requires statistically significant outperformance and robustness. |
| 76 | **Counterfactual + Forecast Merge Layer** | Vince | P1 | Unified evaluation engine combining hindsight replay and forward stress simulation for every major change. |
| 77 | **Institutional Memory Graph** | Sentinel + all | P1 | Link predictions, post-mortems, PRDs, policy changes, and outcomes into a queryable decision graph. |
| 78 | **Trust Transparency Dashboard** | Kelly + Sentinel | P1 | Human-readable trust status: calibration, policy compliance, incidents, rollback history, and current risk posture. |
| 79 | **Autonomous Operations SLA** | Sentinel | P2 | Define and track service SLOs: uptime, recovery time, incident response, and reporting completeness. |
| 80 | **Final Graduation Gate** | Kelly + Sentinel + Vince + Otaku | P2 | Formal final gate for sustained scaled capital operations under policy with recurring audit cadence. |

**Success criteria for Phase 12**

- All critical runtime decisions reference explicit policy IDs.
- Regression triggers automatic rollback with complete incident records.
- Challenger framework governs promotions with objective evidence.
- Trust dashboard can explain current system posture in one view.
- Ops SLA targets are met for a sustained evaluation window.
- Final graduation gate passes only with auditable compliance.

**Out of scope for Phase 12**

- Opaque autonomous behavior without policy traceability.
- One-off exceptions that bypass governance controls.
- Scaling capital without rollback-tested failure containment.

### Implementation status (Phase 12)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 73 | Policy Engine as Code | ⬜ | Planned |
| 74 | Automatic Rollback Orchestrator | ⬜ | Planned |
| 75 | Shadow Challenger Framework | ⬜ | Planned |
| 76 | Counterfactual + Forecast Merge Layer | ⬜ | Planned |
| 77 | Institutional Memory Graph | ⬜ | Planned |
| 78 | Trust Transparency Dashboard | ⬜ | Planned |
| 79 | Autonomous Operations SLA | ⬜ | Planned |
| 80 | Final Graduation Gate | ⬜ | Planned |

### Suggested file map (Phase 12)

| File | Agent | New/Modify |
|------|-------|------------|
| `policies/trading-policy.v1.yaml` | Shared | New |
| `policies/execution-policy.v1.yaml` | Shared | New |
| `policies/promotion-policy.v1.yaml` | Shared | New |
| `src/plugins/plugin-sentinel/src/services/policyEngine.service.ts` | Sentinel | New |
| `src/plugins/plugin-sentinel/src/services/rollbackOrchestrator.service.ts` | Sentinel | New |
| `src/plugins/plugin-vince/src/services/vinceShadowChallenger.service.ts` | Vince | New |
| `src/plugins/plugin-vince/src/services/vinceEvaluationMerge.service.ts` | Vince | New |
| `src/plugins/plugin-sentinel/src/tasks/collectiveMemory.tasks.ts` | Sentinel | Modify (memory graph edges) |
| `src/plugins/plugin-kelly/src/actions/kellyFlywheelScore.action.ts` | Kelly | Modify (trust transparency summary) |
| `src/frontend/components/dashboard/` | Shared | Modify/Add (trust transparency view) |
| `docs/ops/AUTONOMOUS_SLA.md` | Sentinel | New |
| `docs/standup/governance-audits/` | Shared | New directory |

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

### Phase 7 — Calibration Everywhere (1–2 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 38 | `VINCE_PREDICTION_CALIBRATION` action + `/vince/prediction-calibration` route | Vince | P0 |
| 39 | Include calibration in Kelly flywheel and Sentinel weekly/investor reporting | Kelly + Sentinel | P0 |
| 40 | Keep prediction accountability loop closed (register → validate → Brier → report) | Vince + Kelly + Sentinel | P1 |

**Success criteria:** Calibration is visible across daily and weekly reporting, and prediction quality is discussed alongside PnL and drawdown.

### Phase 8 — The Compounding Edge: Research → Alpha → Distribution (4 weeks, gated)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 41 | X Source Quality Engine (predictive account scoring) | Echo + Vince | P0 |
| 42 | Narrative-to-Price Lag Model (`lagAdjustedConfidence`) | Echo + Vince | P0 |
| 43 | Research-to-Trade Attribution (source lineage + contribution) | Vince | P0 |
| 44 | Execution Quality Model (thesis vs execution drag) | Otaku + Vince | P1 |
| 45 | Regime Transition Forecaster (transition probability overlay) | Vince + Oracle + Echo | P1 |
| 46 | Content Performance Feedback Loop (output quality tied to sources) | Eliza + Kelly | P1 |
| 47 | Weekly Alpha Memo (auto-draft from logs) | Eliza + Sentinel | P2 |
| 48 | X-Research Command Center chip/action | Echo + Kelly | P2 |

**Success criteria:** X research improves measured signal quality, trade attribution is auditable, execution drag is reduced, and content quality compounds from real system data.

**Phase 8 gate:** Start only after Phase 6/7 metrics are stable in production. Every Phase 8 task must directly improve at least one of: (1) trading algorithm quality, (2) content output quality/throughput, or (3) X-research insight quality.

### Phase 9 — Skills Operating System: Skill-First Execution (3–4 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 49 | Skill Registry + Metadata Index | Sentinel + Kelly | P0 |
| 50 | Skill Router for ASK_AGENT | Sentinel + plugin-inter-agent | P0 |
| 51 | X-Research Skill Hardening | Echo | P0 |
| 52 | Trading-Agent Skill Runbook Hardening | Otaku + Vince | P1 |
| 53 | Skill Telemetry + Scoreboard | Sentinel + Kelly | P1 |
| 54 | Skill QA Harness | Sentinel | P1 |
| 55 | Skill-to-Content Pipeline | Eliza + Echo | P2 |
| 56 | Skill Governance + Promotion Rules | Sentinel + Kelly | P2 |

**Success criteria:** Skills are discoverable, routed correctly, measured weekly, and demonstrably improve trading quality, content quality, or X-research insight quality.

### Phase 10 — Live Capital Pilot: Earned Risk, Not Assumed Risk (4–6 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 57 | Capital Buckets + Risk Budgets | Vince + Otaku | P0 |
| 58 | Live/Paper Drift Sentinel | Vince | P0 |
| 59 | Execution Audit Trail | Otaku + Sentinel | P0 |
| 60 | Hard Circuit Stack | Otaku | P0 |
| 61 | Capital Promotion Ladder v2 | Otaku + Kelly | P1 |
| 62 | Post-Trade Causal Labels | Vince | P1 |
| 63 | Operator Console: Live Safety State | Kelly + Sentinel | P1 |
| 64 | Live Pilot Weekly Committee | Kelly + Sentinel + Otaku + Vince | P2 |

**Success criteria:** Live pilot remains policy-safe, drift-aware, and fully auditable before any material capital scaling.

### Phase 11 — Portfolio Intelligence + Distribution Moat (4 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 65 | Strategy Sleeve Allocation Engine | Vince | P0 |
| 66 | Cross-Asset Contagion Model | Vince + Oracle | P0 |
| 67 | Opportunity Cost Reallocator | Vince | P1 |
| 68 | Narrative Shelf-Life Decay | Echo + Vince | P1 |
| 69 | Content Truth Layer | Eliza + Sentinel | P1 |
| 70 | Insight Packaging System | Eliza + Kelly + Echo | P1 |
| 71 | Audience Feedback → Research Queue | Kelly + Echo | P2 |
| 72 | Persistent Source Reputation Score | Echo + Vince | P2 |

**Success criteria:** Portfolio efficiency improves while content stays verifiable and research-conversion quality compounds.

### Phase 12 — Autonomous Compounding Governance (Final Phase, 4–6 weeks)

| # | Task | Agent | Priority |
|---|------|-------|----------|
| 73 | Policy Engine as Code | Sentinel + Vince + Otaku | P0 |
| 74 | Automatic Rollback Orchestrator | Sentinel | P0 |
| 75 | Shadow Challenger Framework | Vince | P0 |
| 76 | Counterfactual + Forecast Merge Layer | Vince | P1 |
| 77 | Institutional Memory Graph | Sentinel + all | P1 |
| 78 | Trust Transparency Dashboard | Kelly + Sentinel | P1 |
| 79 | Autonomous Operations SLA | Sentinel | P2 |
| 80 | Final Graduation Gate | Kelly + Sentinel + Vince + Otaku | P2 |

**Success criteria:** The system is autonomous, policy-traceable, rollback-safe, and auditable under sustained operation.

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
| Calibration noise from small sample sizes (Phase 7) | Report Brier with sample count (`n`) and window size; avoid overreacting to low-`n` swings; use rolling windows for trend interpretation |
| Live/paper divergence during pilot (Phase 10) | Drift sentinel enforces automatic downshift; capital promotions freeze when divergence exceeds threshold until recovery window passes |
| Execution stack failures in live mode (Phase 10) | Hard circuit stack and route health checks trigger immediate halt and incident log; resume requires checklist pass |
| Portfolio contagion under correlated stress (Phase 11) | Cross-asset contagion model reduces correlated heat proactively and enforces sleeve exposure caps |
| Content credibility erosion from unverifiable claims (Phase 11) | Content truth layer requires metric/source references for performance claims; invalid claims blocked pre-publish |
| Governance bypass risk in autonomous mode (Phase 12) | Policy-engine-as-code with immutable audit logs; decisions without policy reference are rejected |
| Slow recovery from model or policy regressions (Phase 12) | Automatic rollback orchestrator with tested restore paths and weekly recovery drills |

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
| Calibration visibility | Weekly Kelly/Sentinel reports include `predictionBrier` and `predictionCount` | `kellyFlywheelScore.action.ts`, Sentinel report actions/tasks |
| Calibration API health | On-demand calibration snapshot available via action and route | `predictionCalibration.action.ts`, `/vince/prediction-calibration` |
| Live pilot policy compliance | 100% of live trades pass or log policy checks with traceable audit records | Phase 10 execution audit + policy logs |
| Live/paper drift control | Drift sentinel triggers downshift before weekly loss breaches | `vinceLivePaperDrift.service.ts` |
| Portfolio sleeve efficiency | Improved risk-adjusted return with lower concentration | Phase 11 sleeve allocator + contagion model |
| Content verifiability | Near-zero published claims without metric/source reference | Phase 11 content truth layer |
| Policy traceability | Runtime decisions include policy ID references | Phase 12 policy engine |
| Rollback readiness | Regression rollback completes within SLA target window | Phase 12 rollback orchestrator |
| Final governance graduation | Final gate passes with sustained policy and SLA compliance | Phase 12 graduation audit |
| Devil's Advocate accuracy | Counter-thesis correct > 30% of the time | `vinceDevilsAdvocate.service.ts` |
| Narrative phase detection | ≥ 1 phase transition detected/month before price peak | `vinceNarrativeRadar.service.ts` |
| Temporal coherence lift | Win rate +3 pp vs single-timeframe baseline | Feature store A/B comparison |
| Immune system catches | ≥ 1 attack pattern caught/quarter; library grows with losses | `vinceImmuneSystem.service.ts` |
| Information dead ends | Zero remaining; every data point has ≥ 1 consumer | System audit |
| Antifragility ratio | System performs better in high-volatility months than low-vol | Monthly Sharpe comparison by DVOL regime |

---

## Final Note — Leveraging `.clawdbot` for Phase Execution

`.clawdbot` should be treated as the PRD execution orchestrator for Phases 9–12, not just an ops helper. The key value is worktree isolation, parallel specialist agents, and deterministic task routing so strategic phases ship without context collisions.

**How to use `.clawdbot` against this PRD**

- **PRD-to-task decomposition:** Convert each phase task ID (`#49`–`#80`) into a `.clawdbot` task brief with explicit acceptance criteria and one owner agent lane.
- **One-task-per-agent discipline:** Spawn isolated agents per task/worktree so high-risk changes (risk engine, execution policy, rollback logic) do not share mutable state.
- **Policy-gated merges (Phases 10–12):** Require checklist pass in task brief before merge for anything touching live execution, policy engine, or rollback paths.
- **Weekly orchestration cadence:** Sentinel weekly task should pull `.clawdbot` queue status, blocked tasks, and merged tasks into the same report as Flywheel + calibration.
- **Skills integration (Phase 9):** Route skill-hardening work (`skills/x-research`, `skills/trading-agent`) through `.clawdbot` with drift checks and skill QA harness outputs attached to each task.
- **Auditability by default:** Persist task lineage (brief → branch/worktree → PR/commit → rollout note) so governance and post-mortems can trace why and how a change shipped.

**Guardrails**

- `.clawdbot` executes implementation tasks; it does not override trading runtime policy or execution approvals.
- High-impact changes require explicit rollback instructions in the task brief.
- No task is “done” without verification evidence (tests, logs, or metric deltas) attached to the brief.

### Phase Execution Contract (for `.clawdbot`)

Use this contract for every Phase 8–12 task. A task is valid only if all fields are present.

```json
{
  "id": "phase10-live-drift-sentinel",
  "phase": 10,
  "taskNumber": 58,
  "title": "Live/Paper Drift Sentinel",
  "ownerAgent": "codex|claude|gemini",
  "riskLevel": "low|medium|high|critical",
  "policyImpact": true,
  "filesExpected": [
    "src/plugins/plugin-vince/src/services/vinceLivePaperDrift.service.ts"
  ],
  "acceptanceCriteria": [
    "Drift metric computed and logged",
    "Auto-downshift policy path tested"
  ],
  "verification": [
    "bun run type-check",
    "targeted tests",
    "before/after metric snapshot"
  ],
  "rollbackPlan": "Disable drift gate and restore previous sizing policy via policy version rollback",
  "evidencePath": "docs/standup/governance-audits/phase10-task58-YYYY-MM-DD.md"
}
```

### Reusable Phase Gate Template

Apply this template to each new phase section before execution starts.

- **Entry gate**
  - Required baseline metrics and minimum sample sizes are present.
  - Upstream dependencies from prior phase are green for at least one full review window.
  - `.clawdbot` task briefs exist for all P0/P1 tasks with rollback plans.
- **Execution gate**
  - High/critical risk tasks run in isolated worktrees only.
  - Any policy-impact change requires one additional reviewer and explicit checklist pass.
  - No parallel tasks may touch the same protected file group.
- **Exit gate**
  - Success criteria are measured and attached as artifacts.
  - Regression checks pass against prior phase baseline.
  - Rollback drill executed at least once for high-risk runtime changes.
- **Promotion gate**
  - Phase can only advance when all P0 tasks are complete and KPIs stay stable through one full cadence cycle.

### High-Risk File Protection Matrix (Phases 10–12)

These files are concurrency-protected in `.clawdbot`: only one running task may modify a protected group at a time.

| Protected Group | Files/Paths | Why | Required Controls |
|---|---|---|---|
| **Execution policy path** | `src/plugins/plugin-otaku/src/services/`, `src/plugins/plugin-otaku/src/actions/otakuReadyToExecute.action.ts` | Direct live-capital impact | Single-task lock, policy checklist, rollback instructions mandatory |
| **Core risk path** | `src/plugins/plugin-vince/src/services/vinceRiskManager.service.ts`, `src/plugins/plugin-vince/src/services/vincePaperTrading.service.ts` | Affects sizing/entry/heat globally | Single-task lock, regression suite + drift checks |
| **Promotion/governance path** | `src/plugins/plugin-vince/src/services/vinceGenome.service.ts`, `src/plugins/plugin-sentinel/src/services/` | Strategy promotion + rollback authority | Single-task lock, challenger evidence, manual review required |
| **Policy definitions** | `policies/*.yaml` | Source of truth for runtime decisions | Single-task lock, immutable change log, policy ID bump required |
| **Audit/trust reporting** | `src/plugins/plugin-sentinel/src/actions/`, `src/plugins/plugin-kelly/src/actions/` | Operator trust and go/no-go decisions | Dual review, evidence link required in PR/body |

---

## 12. References

- [AGENTS_INDEX.md](../../docs/AGENTS_INDEX.md) — per-agent capabilities and PRD focus
- [MULTI_AGENT.md](../../docs/MULTI_AGENT.md) — ASK_AGENT, Discord, A2A
- [TRADING_RUNTIME_CONTRACT.md](../../docs/TRADING_RUNTIME_CONTRACT.md) — producer/executor flow
- `.clawdbot/README.md` — agent swarm orchestration (worktrees, tmux, task routing)
- [FEATURE-STORE.md](../../docs/FEATURE-STORE.md) — ML feature storage for paper bot
- [SOLUS_NORTH_STAR.md](../../docs/SOLUS_NORTH_STAR.md) — Solus vision and roadmap
- [THREE-CURVES.md](../../knowledge/teammate/THREE-CURVES.md) — Left/mid/right curve strategy
- `src/frontend/components/chat/chat-interface.tsx` — Quick-action definitions (source of truth)
- `src/plugins/plugin-inter-agent/` — ASK_AGENT implementation
- `src/plugins/plugin-vince/` — Paper bot, signal aggregator, risk engine
- `src/plugins/plugin-solus/src/actions/solusPremiumPnl.action.ts` — Premium P&L tracker (just shipped)
