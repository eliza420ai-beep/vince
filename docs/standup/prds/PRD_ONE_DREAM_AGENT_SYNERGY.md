# PRD: One Dream — Agent Synergy & the $100K Trading System

**Status:** Draft  
**Scope:** Close the remaining gaps between agents so the team operates as a single system: data flows into decisions, decisions flow into execution, execution flows into learning, learning flows into better data. Every agent has a clear role; every handoff is one click.

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
