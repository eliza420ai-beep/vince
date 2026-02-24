# VINCE v4.2.0 — The Genome: One Dream, 29 Tasks, 5 Phases

> **Release date:** 2026-02-24  
> **Codename:** 420 — The Genome  
> **PRD:** [PRD_ONE_DREAM_AGENT_SYNERGY.md](docs/standup/prds/PRD_ONE_DREAM_AGENT_SYNERGY.md)

This is the largest release in VINCE history. Nine agents, five phases, 29 tasks — all implemented. The system went from isolated agents to a **self-evolving trading organism** that observes itself, hypothesizes improvements, tests them against its own history, and deploys the best version of itself every week.

One team, one dream: **$100K/year from on-chain options and perps.**

---

## The Journey: Phase 1 → Phase 5

### Phase 1 — Handoffs & Scorecard (7 tasks)

**Problem:** Every cross-agent handoff required the user to copy/paste between agents. No unified scorecard existed. The user was the bottleneck.

**What we built:**
- **Cross-agent providers** — Solus automatically gets Vince's options data (`vinceOptionsInjector.provider`). Vince automatically gets Echo's sentiment score (`echoSentiment.provider`, 1–10 numeric + bull/bear label) and Oracle's regime indicator (`oracleRegime.provider`, risk-on/risk-off/uncertain). Eliza gets trading performance data for content production (`tradingPerformance.provider`). All dynamic, all cached, all with graceful fallbacks.
- **`KELLY_WEEKLY_REVIEW`** — One chip, one click. Kelly pulls a unified scorecard from all nine agents via in-process ASK_AGENT: Vince paper bot P&L, Solus premium income, Echo sentiment accuracy, Oracle prediction record, Otaku execution history, Sentinel features shipped, Eliza content output. Measured against the $1,923/week target ($100K annualized).
- **Content flywheel kickoff** — `WRITE_ESSAY` and `DRAFT_TWEETS` on Eliza compose with `TRADING_PERFORMANCE` provider when the user asks for weekly results. Content from real numbers, not hypotheticals.

**Result:** Zero copy/paste. Agents share structured data. The user sees one scorecard.

---

### Phase 2 — Intelligence & Learning (6 tasks)

**Problem:** Vince's paper bot traded in a vacuum. Echo knew CT was bearish; Vince didn't care. Losing trades repeated because nobody post-mortemed together.

**What we built:**
- **Sentiment gate** (`vinceSentimentGate.ts`) — Before every trade, the paper bot checks Echo's CT sentiment and Oracle's Polymarket regime. Risk-off regime halves position size. Bearish sentiment skips new longs. Bullish + risk-on gets full size. Every trade records `sentimentScore`, `regime`, and `adjustmentApplied` in the journal.
- **Automated post-mortems** (`postMortem.ts`) — When a trade closes at a loss, Vince asks Echo ("What was CT sentiment on [asset] at entry?"), Oracle ("What was Polymarket pricing?"), and Solus ("Was the sizing correct?") via ASK_AGENT. Aggregated into a structured post-mortem saved to `docs/standup/post-mortems/`.
- **`VINCE_POST_MORTEM` action + chip** — Manual trigger for the last losing trade.
- **`VINCE_SENTIMENT_CHECK` action + chip** — "What does Echo and Oracle say about my next trade?"
- **Sentinel picks up post-mortems** — Weekly task includes recent post-mortems, surfaces patterns, suggests fixes.

**Result:** The paper bot trades with awareness. Losses are diagnosed by the full team. Patterns surface automatically.

---

### Phase 3 — Autonomy (4 tasks)

**Problem:** The system could analyze and learn, but still needed the user to initiate everything. No proactive behavior.

**What we built:**
- **Kelly scheduled daily briefing** — `STANDUP_ENABLED=true` triggers `buildAndSaveSharedDailyInsights` + `runStandupRoundRobin`. Every morning: coordinated insights from all agents, saved to `docs/standup/daily-insights/`.
- **Sentinel auto-PRD from post-mortem patterns** — Weekly task reads recent post-mortems, LLM extracts recurring patterns, generates suggested PRD stub when `SENTINEL_POST_MORTEM_PRD_WRITE=true`.
- **Otaku opt-in auto-execute** — `OTAKU_AUTO_EXECUTE_ENABLED=true` + confidence threshold. Every 15 minutes, checks if Vince has written a high-confidence signal to cache. When confidence and strength exceed threshold, appends a `vince_signal_ready` notification.
- **Echo watchlist → Vince signal pipeline** — `VINCE_PAPER_WATCHLIST_ENABLED=true` merges Echo's watchlist tokens into the paper bot's trading universe and signal aggregator. New tokens auto-monitored.

**Result:** The system proactively finds trades, sizes them with sentiment, executes on paper, measures results, and fixes its own bugs — with minimal user intervention.

---

### Phase 4 — Measurement, Readiness & Content (6 tasks)

**Problem:** No way to measure "$100K pace" at a glance. No structured go-live checklist. Content production disconnected from numbers.

**What we built:**
- **`KELLY_100K_PACE` action + chip** — Single number: are we on track? Target $1,923/wk, this week actual, YTD annualized, yes/no. Queries Vince and Solus.
- **Vince → Solus strike handoff** — Cache `vince:strike_suggestion` (underlying, direction, expiry hint). Solus strike ritual and optimal strike provider read it automatically. Zero copy/paste for options.
- **Confidence in signal cache** — `setVinceSignalCache()` writes `confidence`/`strength` (0–100) so Otaku's auto-execute can fire on high-confidence signals.
- **`KELLY_DRAFT_WEEKLY_PERFORMANCE`** — One chip produces a weekly Substack draft + 3–5 tweets from real trading numbers via Eliza.
- **Sentiment accuracy tracking** — At trade close: `sentimentCorrect` computed from sentiment-at-entry vs outcome. `getSentimentAccuracy()` on journal for reporting. Feeds weekly review.
- **`OTAKU_READY_TO_EXECUTE` + chip** — Go-live readiness checklist: paper bot stats + Echo sentiment + Vince signal + explicit confirm before real execution.

**Result:** One glance tells you if you're on track. Content writes itself from real data. Going live requires proving it on paper first.

---

### Phase 5 — The Genome: Self-Evolving Trading System (8 tasks) ← NEW

**Problem:** All the data exists — feature store with 40+ fields per decision, VinceBench scores, Thompson Sampling weights, training reports, post-mortems, sentiment accuracy — but nobody acts on it automatically. The system learns but doesn't evolve.

**Core insight:** Close the final loop. The system observes itself, hypothesizes improvements, tests them against its own history, and deploys the best version of itself.

#### #22 Counterfactual Engine (`vinceCounterfactual.service.ts`)
For every avoided decision in the feature store, what happened to that asset in the next 24–48 hours? Weekly report quantifies missed opportunity cost by skip-reason. "You were right to skip 73% — but missed 4 winners worth +$840. `minStrength` is 6 pts too high in trending-bull regimes." Feeds the Strategy Genome with direction to mutate.

#### #23 Strategy Genome + Auto-Tuning (`vinceGenome.service.ts`)
All 15+ tunable parameters (minStrength, minConfidence, sentimentGate thresholds, TP/SL ratios, size multipliers, session/regime multipliers, maxLeverage, maxSimultaneousPositions) represented as a JSON genome with defined bounds and mutation scales. Weekly cycle:
1. Load feature store history (closed trades + counterfactual data)
2. Evaluate current genome fitness (Sharpe × win-rate / max-drawdown)
3. Generate 8 mutations (randomly perturb 2–4 parameters, occasionally mutate TP ratios)
4. Replay each candidate against history
5. Rank by fitness, promote if top variant beats current by >5%
6. Persist to `genome-state.json`, append generation record to `genome_history.jsonl`

#### #24 Regime Profiles (`vinceRegimeProfiles.service.ts`)
Five named strategy personalities:
| Profile | Trigger | Behavior |
|---------|---------|----------|
| **TRENDING_BULL** | Oracle risk-on + Echo bullish + tech trending | Full size, wider TP, favor longs |
| **CHOPPY** | Any sentiment + tech ranging | Half size, tight TP, higher minConfidence |
| **CAPITULATION** | Oracle risk-off + Echo bearish + DVOL > 80 | Skip longs, minimal size, accumulation mode |
| **EUPHORIA** | Oracle risk-on + Echo strongly bullish (>8) | Contrarian: reduce longs, tighten stops |
| **RECOVERY** | Oracle risk-on + Echo neutral + tech trending | Gradual re-entry, conservative sizing |

Auto-selected from Oracle regime + Echo sentiment + technical regime (ADX/DVOL). Per-profile performance tracked separately.

#### #25 Intelligence → Signal Source (`grokSignalExtractor.service.ts`)
After each daily Grok sub-agent run, extracts structured recommendations (asset, direction, confidence, thesis) from "Today's Recommendations" in daily insight reports. Registers as a new Thompson Sampling arm `GrokIntelligence`. When Grok-sourced signals outperform, the weight bandit auto-promotes. Research becomes alpha.

#### #26 Portfolio Construction (`vincePortfolioConstruction.service.ts`)
Moves from per-asset decisions to portfolio-level risk management:
- **Rolling correlation matrix** across open positions (30-day window)
- **Portfolio heat** — sum of position risk as % of equity
- **Kelly criterion sizing** from per-source win rate + avg win/loss
- **Opportunity cost** — new trade's expected Sharpe vs weakest open position; replace if strictly better
- Max simultaneous positions based on regime profile

#### #27 Execution Graduation (`executionGraduation.service.ts`)
Four trust levels earned through sustained performance:

```
L0 PAPER_ONLY  (default)
    → L1 NOTIFY          (WR > 50% for 2 consecutive weeks)
    → L2 CONFIRM_EXECUTE  (WR > 55% + Sharpe > 0.5 for 4 weeks)
    → L3 AUTO_EXECUTE     (WR > 58% + Sharpe > 1.0 + DD < 10% for 8 weeks)
```

**Demotion:** Live WR < 45% for 2 weeks → drop one level.  
**Circuit breaker:** Single-day loss > 3% of funded wallet → immediate drop to L0 + user notification.  
**No gaming:** Rolling windows, not cumulative. One exceptional week can't skip levels. Demotion is automatic and faster than promotion.

#### #28 Agent Collective Memory (`collectiveMemory.tasks.ts`)
Weekly Sentinel task:
1. Query all 7 agents for "What did you learn this week?" via ASK_AGENT
2. LLM synthesizes responses into a 500-word Weekly Intelligence Brief
3. Saved to `knowledge/teammate/weekly-briefs/YYYY-WW.md`
4. All agents load via shared knowledge directory
5. Institutional memory compounds over time

#### #29 Flywheel Score (`flywheelScore.service.ts` + `kellyFlywheelScore.action.ts`)
One composite number (0–100) measuring total system health:

| Component | Weight | Source |
|-----------|--------|--------|
| Signal quality (VinceBench) | 25% | Vince |
| Trade performance (4-week rolling Sharpe) | 25% | Vince |
| Sentiment accuracy (Echo/Oracle vs outcome) | 15% | Vince journal |
| Content output (drafts + uploads/week) | 10% | Eliza |
| Knowledge growth (new items/week) | 10% | Eliza |
| Engineering velocity (features shipped) | 10% | Sentinel |
| Genome improvement (gen-over-gen Sharpe delta) | 5% | Genome history |

Kelly reports: "Flywheel Score: 72 (+4). Signal quality and genome driving gains; content output is the bottleneck." Trend analysis shows momentum. Narrative explains what's working and what needs attention.

---

## The Architecture — The Genome Loop

```
                 ┌──────────────────────────────────────────────────┐
                 │            FLYWHEEL SCORE (Kelly)                 │
                 │  One number: is the system getting better?        │
                 └──────┬───────────────────────────┬───────────────┘
                        │                           │
                 ┌──────▼──────┐             ┌──────▼──────┐
                 │  COLLECTIVE │             │  CONTENT    │
                 │  MEMORY     │             │  FLYWHEEL   │
                 │  (Sentinel) │             │  (Eliza)    │
                 └──────┬──────┘             └──────┬──────┘
                        │                           │
     ┌──────────────────▼───────────────────────────▼──────────────┐
     │                     VINCE (The Genome)                       │
     │                                                              │
     │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
     │  │ Counterfact. │→ │   Genome     │→ │  Portfolio        │   │
     │  │ Engine (#22) │  │   Evolve     │  │  Construction     │   │
     │  │              │  │   (#23)      │  │  (#26)            │   │
     │  └──────────────┘  └──────┬───────┘  └───────────────────┘   │
     │                           │                                   │
     │  ┌─────────────┐  ┌──────▼───────┐  ┌───────────────────┐   │
     │  │ Grok Intel  │→ │   Regime     │→ │  Sentiment Gate   │   │
     │  │ → Signal    │  │   Profiles   │  │  (Phase 2)        │   │
     │  │ Source (#25) │  │   (#24)      │  │  + regime-aware   │   │
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

## By the Numbers

| Metric | Value |
|--------|-------|
| Total tasks implemented | **29** |
| Phases completed | **5** |
| New services created (Phase 5) | **8** |
| New tasks/cron jobs (Phase 5) | **4** |
| New actions (Phase 5) | **1** |
| Plugins touched | **4** (plugin-vince, plugin-otaku, plugin-kelly, plugin-sentinel) |
| Agents involved | **9** (Vince, Solus, Echo, Oracle, Otaku, Sentinel, Eliza, Kelly, Naval) |
| Tunable parameters in genome | **15+** |
| Regime profiles | **5** |
| Trust levels | **4** (L0 → L3) |
| Flywheel score components | **7** |
| TypeScript errors | **0** |

---

## New Files (Phase 5)

| File | Plugin | Purpose |
|------|--------|---------|
| `vinceCounterfactual.service.ts` | plugin-vince | Replay avoided decisions, quantify missed PnL |
| `counterfactualWeekly.tasks.ts` | plugin-vince | Weekly counterfactual report + ops push |
| `vinceGenome.service.ts` | plugin-vince | Genome params, mutation, replay, fitness, promotion |
| `genomeEvolution.tasks.ts` | plugin-vince | Weekly genome evolution cycle |
| `vinceRegimeProfiles.service.ts` | plugin-vince | 5 market regime profiles with auto-switch |
| `grokSignalExtractor.service.ts` | plugin-vince | Grok daily intel → structured signal source |
| `vincePortfolioConstruction.service.ts` | plugin-vince | Correlation, heat, Kelly sizing, opportunity cost |
| `executionGraduation.service.ts` | plugin-otaku | L0→L3 trust levels with demotion + circuit breaker |
| `collectiveMemory.tasks.ts` | plugin-sentinel | Weekly intelligence brief from all agents |
| `flywheelScore.service.ts` | plugin-kelly | Composite 0–100 system health metric |
| `kellyFlywheelScore.action.ts` | plugin-kelly | "Flywheel Score" action querying all agents |

---

## What This Means

Phases 1–4 connected nine agents into a team. Phase 5 makes the team self-evolving.

The paper bot no longer just trades — it **observes** which trades it skipped and whether it should have taken them, **mutates** its own parameters, **tests** mutations against its own history, **promotes** the best variant, and **repeats** every week. The system knows which market regime it's in and adapts its strategy. Portfolio construction prevents correlated blowups. Execution graduation earns the right to trade real money through sustained performance, not a config flag.

Meanwhile, Sentinel collects what every agent learned into shared institutional memory that compounds. Kelly measures the health of the entire flywheel with one number.

The loop is closed. Data → Thesis → Plan → Execute → Measure → Learn → Better Data → repeat.

---

## Running

```bash
bun install
bun start
```

All Phase 5 services and tasks register automatically when the respective agents start. No additional configuration required beyond existing env vars.

---

## Create this release on GitHub

```bash
gh release create v4.2.0 --title "v4.2.0 — The Genome: One Dream, 29 Tasks, 5 Phases" --notes-file docs/RELEASE_v4.2.0.md
```

Or edit the release at: https://github.com/IkigaiLabsETH/vince/releases/new?tag=v4.2.0 and paste the contents of this file.
