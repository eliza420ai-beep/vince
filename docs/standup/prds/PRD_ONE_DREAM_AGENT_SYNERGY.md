# PRD: One Dream — Agent Synergy & the $100K Trading System

**Status:** Phase 1–5 Implemented (V4.2.0)  
**Scope:** Close the remaining gaps between agents so the team operates as a single system: data flows into decisions, decisions flow into execution, execution flows into learning, learning flows into better data. Every agent has a clear role; every handoff is one click. **Phase 5** closes the final loop: the system observes itself, evolves its own parameters, and earns the right to trade real money.

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

---

## 9. Non-Goals

- **Not replacing ASK_AGENT** — providers build on top of ASK_AGENT, not around it
- **Not adding live execution to Vince** — Vince stays paper-only; Otaku is the only funded executor
- **Not changing the trading runtime contract** — producer/executor separation is preserved
- **Not building a new UI** — quick-action chips and existing chat interface are sufficient
- **Not automating Kelly's lifestyle recommendations** — Kelly stays human-triggered, not scheduled

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
