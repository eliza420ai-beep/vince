<div align="center">

# VINCE

```
  ██╗   ██╗██╗███╗   ██╗ ██████╗███████╗
  ██║   ██║██║████╗  ██║██╔════╝██╔════╝
  ██║   ██║██║██╔██╗ ██║██║     █████╗
  ╚██╗ ██╔╝██║██║╚██╗██║██║     ██╔══╝
   ╚████╔╝ ██║██║ ╚████║╚██████╗███████╗
    ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
```

### _Push, not pull._

**Unified data intelligence** for options, perps, memes, DeFi, lifestyle, and NFT floors, with a **self-improving paper trading bot** at the core. Ten agents, one team, one dream. No hype, no shilling, no timing the market.

</div>

---

## What We Built: The One-Month Hackathon

**V4.2.0 — The Genome.** One month, one PRD, the first 5 phases shipped end‑to‑end. Since then we executed the full **12‑phase One Dream roadmap (80 tasks)**: a self-evolving trading system that observes its own performance, rewrites its own parameters, and earns the right to trade real money through sustained results. The hackathon is closed. Here's what shipped.

### The problem we solved

Every agent was strong solo — Vince had 13 quick actions, Solus had 16, Echo had 11, Otaku was ready to execute — but every cross-agent handoff required copy/paste. Echo knew CT was bearish; Vince didn't care. Losing trades repeated because nobody post-mortemed together. No unified scorecard, no sentiment-adjusted sizing, no learning loop. The user was the bottleneck.

### Phase 1 — Handoffs & Scorecard (7 tasks)

Eliminated copy/paste between agents. Solus gets Vince's options data automatically. Vince gets Echo's sentiment score (1–10 numeric) and Oracle's regime indicator (risk-on/risk-off/uncertain). Eliza gets trading performance for content production. Kelly's `WEEKLY_REVIEW` pulls a unified scorecard from all nine agents — paper bot P&L, premium income, sentiment accuracy, execution history, features shipped, content output — measured against $1,923/week ($100K annualized).

### Phase 2 — Intelligence & Learning (6 tasks)

The paper bot stopped trading in a vacuum. A **sentiment gate** checks Echo and Oracle before every trade: risk-off halves position size, bearish sentiment skips new longs, full size only on bullish + risk-on. Automated **post-mortems** on every losing trade — Vince asks Echo, Oracle, and Solus what they saw, aggregates into structured analysis, Sentinel surfaces patterns weekly. Every trade now records `sentimentScore`, `regime`, and `adjustmentApplied`.

### Phase 3 — Autonomy (4 tasks)

Scheduled daily briefings with real data from all agents. Sentinel auto-generates PRD stubs from recurring post-mortem patterns. Otaku opt-in auto-execute when paper bot confidence exceeds threshold. Echo's watchlist tokens merge into the paper bot's trading universe automatically. The system proactively finds, sizes, and evaluates trades with minimal user intervention.

### Phase 4 — Measurement & Readiness (6 tasks)

`$100K PACE` — one number: on track or behind. Vince → Solus strike handoff via cache (no more copy/paste for options). Confidence scores (0–100) in the signal cache so Otaku's auto-execute fires on high-conviction signals. One-tap weekly Substack draft + tweets from real trading numbers. Sentiment accuracy tracking: did Echo's call match the outcome? Go-live readiness checklist: paper stats + sentiment + explicit confirm before real execution.

### Phase 5 — The Genome (8 tasks)

The system became self-evolving:

- **Counterfactual engine** — Replays every avoided decision. "You were right to skip 73% — but missed 4 winners worth +$840. `minStrength` is 6 pts too high in trending-bull regimes."
- **Strategy genome** — 15+ tunable parameters as a JSON genome. Weekly: mutate → replay against feature store history → rank by Sharpe × win-rate / drawdown → auto-promote the best variant.
- **Regime profiles** — Five market personalities (TRENDING_BULL, CHOPPY, CAPITULATION, EUPHORIA, RECOVERY) auto-switch from Oracle + Echo + technicals. Per-profile performance tracked separately.
- **Grok intelligence** — Daily Grok sub-agent reports parsed into structured signals, registered as a Thompson Sampling arm. Research becomes alpha.
- **Portfolio construction** — Rolling correlation matrix, portfolio heat caps, Kelly-criterion sizing, opportunity cost analysis (new trade vs weakest open position).
- **Execution graduation** — Four trust levels (L0 paper-only → L1 notify → L2 confirm-execute → L3 auto-execute), earned through sustained weekly performance, automatic demotion on drawdown, circuit breaker on 3%+ daily loss.
- **Collective memory** — Weekly intelligence brief synthesized from all agents, stored as shared knowledge. Institutional memory compounds.
- **Flywheel score** — Composite 0–100 health metric: signal quality (25%), trade performance (25%), sentiment accuracy (15%), content output (10%), knowledge growth (10%), engineering velocity (10%), genome improvement (5%). One number that answers "is the system getting better?"

### Phase 6 — The Adversary (8 tasks)

Phase 6 made one core change: confidence alone is not enough. Every trade now has to earn execution.

- **Pre-mortem engine** — Before entry, VINCE scores likely failure scenarios, computes survival probability, and blocks trades below threshold.
- **War Room Monte Carlo** — 1000-run bootstrap tail simulation compares incumbent vs candidate genomes and blocks promotions that worsen downside (`p05`).
- **Internal prediction market** — VINCE registers and validates trade/genome predictions, scores outcomes with Brier calibration, and tracks calibration by agent.
- **Devil's Advocate protocol** — Counter-thesis risk scoring can downgrade or block fragile trade ideas and weak genome promotions.
- **Narrative radar** — Classifies narrative phase (`inception`, `growth`, `peak`, `decline`, `uncertain`) and blocks phase-mismatched entries.
- **Temporal coherence** — Multi-timeframe alignment gate scores setup quality before entry.
- **Immune system** — Attack-pattern matcher loads known trap regimes and blocks high-loss setups.
- **Wired into runtime** — Daily prediction validation and weekly counterfactual reporting are live, with adversarial metadata persisted in the trading loop.

### Phase 7 — Calibration Everywhere

Phase 7 turned calibration into a first-class operating metric across the team:

- **Prediction calibration API + action** — `/vince/prediction-calibration` endpoint and `VINCE_PREDICTION_CALIBRATION` action expose real calibration status on demand.
- **Cross-agent reporting** — Sentinel and Kelly reporting now surface VINCE prediction calibration so weekly reviews cover calibration drift, not just PnL.
- **Closed accountability loop** — Predictions are made, resolved, scored, and reported in one system-wide path.

### Phase 8 — The Compounding Edge: Research → Alpha → Distribution

Phase 8 wired **X research, trading, and publishing into a single compounding loop**.

- **X source quality & narrative lag**: score signal accounts, measure narrative-to-price lag, and feed `lagAdjustedConfidence` into the paper bot.
- **Research-to-trade attribution**: every trade now carries lineage back to source threads, accounts, and prompts so alpha is auditable.
- **Execution quality lens**: track when a good thesis was hurt by late entries, bad exits, or size errors instead of blaming the idea.
- **Content performance feedback**: Substack posts and tweets are scored back to their source inputs; high-performing sources get more weight in future research.
- **Alpha memos + X-Research command center**: weekly auto-drafted alpha memos and a command chip that turns saved research into a live routing surface.

### Phase 9 — Skills Operating System: Skill-First Execution

Phase 9 treated **skills as first-class citizens**, not hidden prompts.

- **Skill registry + router**: a typed index of skills (research, trading, content, ops) with routing rules for ASK_AGENT.
- **Skill telemetry + scoreboard**: per-skill success rates, latencies, and drift so we know which skills actually earn their keep.
- **Skill QA harness**: repeatable tests that keep high-risk skills honest before they touch trading or capital.
- **Skill-to-content pipeline**: the `ELIZA_SKILL_CONTENT` path turns X research skills into ready-to-publish briefs instead of starting from a blank page.
- **Skill governance**: promotion and deprecation rules so the system keeps a sharp, small set of trusted skills.

### Phase 10 — Live Capital Pilot: Earned Risk, Not Assumed Risk

Phase 10 built the **bridge from paper to live** without crossing the risk line.

- **Capital buckets + risk budgets**: explicit sleeves and limits for different strategies instead of one undifferentiated pool.
- **Live/paper drift sentinel**: continuous checks that live execution tracks paper decisions; automatic downshift when drift widens.
- **Execution audit trail + hard circuit stack**: every live trade logged with policy context and a multi-layer circuit breaker that can halt execution instantly.
- **Operator console**: Kelly + Sentinel surfaces a single live safety view so humans can see, in plain language, whether the pilot is safe to keep running.
- **Promotion ladder v2**: live capital size is earned through sustained performance, not a one-time decision.

### Phase 11 — Portfolio Intelligence + Distribution Moat

Phase 11 focused on **portfolio quality and truth in output**.

- **Strategy sleeve allocator**: capital flows into sleeves based on their current edge, not equal-weight habits.
- **Cross-asset contagion + opportunity cost**: detect correlated stress, cut crowded risk, and reallocate from weakest sleeve to strongest alternative.
- **Narrative shelf-life & decay**: track how long a story stays investable before edge decays and position sizing should shrink.
- **Content truth + insight packaging**: a truth layer that forces performance claims to cite metrics/sources, plus an insight packager that turns research into repeatable formats.
- **Source reputation + feedback loop**: persistent reputation scores for signal sources and audience feedback flowing straight into the research queue.

### Phase 12 — Autonomous Compounding Governance (Final Phase)

Phase 12 closed the loop: **the system governs itself, with clear policy and rollback paths**.

- **Policy engine as code**: YAML policies parsed into a runtime engine with audit refs on every decision.
- **Automatic rollback orchestrator**: tested rollback paths for models, policies, and configurations with drills baked in.
- **Shadow challenger framework + forecast merge**: live strategies constantly challenged by shadow variants, with forecasts merged into promotion decisions.
- **Institutional memory graph**: key decisions, incidents, and improvements persisted as a graph so new work builds on real history.
- **Trust transparency dashboard + SLA**: Kelly’s dashboard and Sentinel’s SLA document make system trust, health, and obligations visible at a glance.
- **Final graduation gate**: a formal gate that proves autonomy, policy compliance, and rollback readiness before calling the system “done”.

### By the numbers

| | |
|---|---|
| Tasks implemented | 80 (One Dream Phases 1–12) |
| Phases completed | 12 (through autonomous governance) |
| Agents involved | 9 |
| New services (Phase 6) | 8 |
| Tunable genome parameters | 15+ |
| Regime profiles | 5 |
| Trust levels | 4 (L0 → L3) |
| Flywheel score components | 7 |
| TypeScript errors | 0 |

### Phase 13 — Swarm Intelligence (2026-02-26 → now)

One month after closing the One Dream PRD, the swarm got a **paper-traded brain upgrade**. The current system matches the architecture described in *[The Day the Swarm Woke Up](https://ikigaistudio.substack.com/p/the-day-the-swarm-woke-up)* where we have real code and tests, and stays quiet everywhere else.

- **Shared Thompson-sampling bandit (paper only)** — `SwarmCoordinationService` maintains a shared `SwarmBanditState` across signal sources and agents, with regime-aware pools, agent reliability, signal correlations, and `consensusHistory` persisted to JSON + optional DB. All learning today happens in the paper bot, not on live capital.
- **Swarm coordination + orchestrator** — VINCE contributes a canonical `AgentVote` every time the paper bot considers a trade. `VinceSwarmOrchestratorService` can add Echo, Oracle, Solus, Otaku, Kelly, Sentinel, Eliza, Clawterm, and Naval votes when their `SWARM_INCLUDE_*` flags are enabled; agents without real data wired in return neutral, low-confidence votes instead of hallucinated opinions.
- **Consensus-driven gating in the trade loop** — `VincePaperTradingService` calls `getSwarmConsensus` when `VINCE_SWARM_ENABLED=true` and uses multi-agent consensus to veto trades or shrink size based on confidence and dissent. Otaku remains **observe-only** for swarm output; no live execution is driven directly by consensus.
- **Dashboards and explanations wired to real stats** — `/vince/paper` surfaces `swarmSummary` (per-agent reliability, regime performance, total outcomes). `VINCE_WHY_TRADE` includes a `SWARM SNAPSHOT` paragraph only when swarm is enabled and real consensus exists, and never claims “all ten agents” unless ten distinct agents actually voted.
- **Swarm learning architecture + test plan** — [SWARM_LEARNING_ARCHITECTURE.md](docs/SWARM_LEARNING_ARCHITECTURE.md) describes the design; [SWARM_E2E_CHECKLIST.md](docs/SWARM_E2E_CHECKLIST.md) documents exactly how to test VINCE-only, limited, and full-swarm-capable modes after `bun start` without overpromising.
- **Phases 1–12 unchanged, flags as escape hatch** — All existing paper/live logic from earlier phases (sentiment gate, genome, adversary, policy engine, execution ladder) still behaves as before. Setting `VINCE_SWARM_ENABLED=false` cleanly reverts the runtime to the pre‑swarm behavior for both paper and live capital paths.

| Stat | Value (Phase 13) |
|------|------------------|
| Lines shipped on 2026-02-26 | 7,555 |
| New scripts that day | 11 |
| New services | 2 (`swarm-coordination`, `dailyStandup`) |
| Assets post-mortemed (launch day) | 10 |
| Agents wired for swarm votes | 10 (VINCE always on; others flag-gated) |
| Test coverage | Unit + integration (swarm core, orchestrator, paper bot, dashboard, WHY_THIS_TRADE) |

### How the 12 phases became the paper bot and ML loop

The 80 tasks across 12 phases produced the **paper trading algo** (signals → aggregator with ML quality → evaluateAndTrade gates → open/skip → position management → close → feature store) and the **ML pipeline** (feature store → train_models.py → ONNX + improvement report + Sentinel tasks → ML inference and suggested thresholds back into the bot). Phases 2–5 and 12 are where this lives in code: Phase 2 (sentiment gate, post-mortems), Phase 5 (genome, counterfactual, improvement-report weights), Phase 12 (policy engine in the trade path). Phase 10 is the bridge from paper to live (readiness, capital pilot). Full algo and pipeline: [PRD: Paper Trading Algo and How ML Improves It](docs/standup/prds/PRD_PAPER_TRADING_ALGO_AND_ML.md), [PRD: ML Training Pipeline](docs/standup/prds/PRD_ML_TRAINING_PIPELINE.md).

### What's next

Phase 7 is heads-down compounding: more historical depth for calibration, tighter Brier distributions, and stricter promotion gates so the system gets harder to kill each cycle.

### Prior releases

Earlier versions shipped the paper bot ML loop (feature store, ONNX, VinceBench), HIP-3 spot tokens alongside Hyperliquid perps, the Polymarket edge engine (three strategies, Kelly-sized), zero AI slop across all ten agents, the leaderboard with cost transparency, and the content flywheel (Eliza publishing real results to Substack).

Releases: [v4.2.0](https://github.com/IkigaiLabsETH/vince/releases/tag/v4.2.0) · [v4.0.0](https://github.com/IkigaiLabsETH/vince/releases/tag/v4.0.0) · [v3.7](https://github.com/IkigaiLabsETH/vince/releases/tag/v3.7) · [v3.6](https://github.com/IkigaiLabsETH/vince/releases/tag/v3.6.0) · [v3.4](https://github.com/IkigaiLabsETH/vince/releases/tag/v3.4.0) · [v3.3](https://github.com/IkigaiLabsETH/vince/releases/tag/v3.3.0) · [Tags](https://github.com/IkigaiLabsETH/vince/tags) · [Changelog](CHANGELOG.md)

---

## Why

Humans are not wired to win in modern markets.

For most of history, investing rewarded relationships, judgment, and conviction. That edge worked when information was scarce and markets moved slowly enough for humans to process them.

Today, public and private information is priced in within milliseconds. Strategies that depend on reading filings, reacting to news, or "having an opinion" compete in a game where the half-life of new information approaches zero. No human, no matter how smart, experienced, or well-connected, can manually process that volume of data in real time and execute with perfect discipline across thousands of instruments.

The best long-term returns in modern investing come from code, not from humans.

Renaissance Technologies' Medallion Fund has earned roughly 39% annual returns since the late 1980s, about double the S&P 500, sustained for decades. The fund closed to outside investors in 1993 because additional capital would dilute returns by pushing trades into less liquid, lower-edge opportunities. By comparison, Berkshire Hathaway's audited record shows roughly 19.9% annualized over the same period.

Medallion's edge came from repeating small statistical advantages across thousands of instruments simultaneously. Tiny edges, captured over and over through rapid trades in highly liquid assets. Human investors can closely track a handful of positions. Code can monitor thousands in parallel, spot micro-opportunities in milliseconds, and execute that process with zero emotional drift.

### The foundations

Three breakthroughs between 1952 and 1973 made automation inevitable:

1. **1952** — Harry Markowitz proved portfolio construction could be mathematical.
2. **1964** — William Sharpe introduced CAPM: a way to measure risk, compare returns to a benchmark, and quantify performance.
3. **1973** — Fischer Black and Myron Scholes published the Black-Scholes equation for pricing options, replacing human estimation with formulas.

To automate investing, you need clear input data, predictable output results, rules that don't rely on human guesses, and the ability to adjust using formulas alone. Black-Scholes provided all four.

Edward Thorp turned these frameworks into live returns at Princeton/Newport Partners. Jim Simons scaled them at Renaissance into what is often considered the greatest fund of all time by annual returns.

### Five levels of autonomous investing

| Level | Name | Edge |
| :--- | :--- | :--- |
| **1** | Manual | Information scarcity. Who you knew, what you believed, whether you had the conviction to act. |
| **2** | Algorithmic | Pre-defined rules execute automatically. Speed and discipline, no learning. |
| **3** | Automated | Integrated workflows: data feeds, portfolio models, execution. Reduced friction, no intelligence added. |
| **4** | Autonomous | ML models that update on new data without explicit reprogramming. |
| **5** | Agentic AI | Plans, chooses actions, uses tools, monitors outcomes, and self-corrects across multi-step workflows. |

### Where VINCE sits

VINCE is built at **Level 5**. Ten agents that research, analyze, paper-trade, evaluate outcomes, and improve their own models. No human in the loop for signal generation, position sizing, or risk management. The self-improving paper trading bot trains in production, stores features in a feature store, and deploys ONNX models back into the decision loop.

The shift from Level 1 to Level 5 is not about replacing human judgment. It is about recognizing that the primary source of competitive advantage has moved from information access to integrated, code-driven research, risk, and execution, running 24/7 with zero emotional drift.

The goal: stay in the game without 12+ hours on screens. Push, not pull.

---

## The Team

Clear lanes, no overlap: data, plan, call, lifestyle, infra.

| Agent | Lane |
| :--- | :--- |
| **Eliza** | Knowledge, research, brainstorm, Substack content. The base everything builds on. |
| **VINCE** | Objective data: options, perps, memes, news, paper bot, 15+ signal sources. Push, not pull. |
| **ECHO** | CT sentiment, X research, social alpha, contrarian flags. Your ears on X. |
| **Oracle** | Prediction markets: Polymarket discovery, odds, portfolio (read-only). |
| **Solus** | Plan and call. Weekly BTC options on Hypersurface, strike/direction/invalidation. |
| **Otaku** | **Only agent with a wallet.** Morpho, CDP, Bankr, Biconomy, Clanker, DefiLlama. Execution graduation (L0→L3). |
| **Kelly** | Touch grass: hotels, fine dining, wine, health, fitness. Standup facilitator. Flywheel score. No trading. |
| **Sentinel** | Ops, cost steward, ONNX, ART, PRDs, OpenClaw guide, collective memory, repo improvements. |
| **Naval** | Philosophy, mental models, standup conclusions. One thesis, one signal, one team one dream. |
| **Clawterm** | AI agents terminal: OpenClaw skills, Milaidy, ElizaOS, setup tips, trending. |

One conversation, ask any teammate by name; standups 2x/day. [MULTI_AGENT.md](docs/MULTI_AGENT.md)

---

### Trading Bot: No Tilt. Every decision explained. Every outcome learned.

The paper bot runs 24/7 on the **Leaderboard** (Trading Bot tab): 15+ signal sources, 38 onchain assets (crypto, stocks, commodities, indices) as Hyperliquid perps. Zero tilt. Every open position shows strength, confidence, sources, and R:R; every close feeds the feature store and ML loop. Goal progress ($420/day, $10K/mo), open positions, recent trades, and signal source status—all in one place. No chat required. [LEADERBOARD.md](docs/LEADERBOARD.md)

**HIP-3 assets** (stocks, commodities, indices on Hyperliquid) are capped at 5x leverage in code; max leverage can be read from the Hyperliquid API when available. New HIP-3 markets are **discovered automatically**: a daily task scans all HIP-3 DEXes, keeps symbols with 24h volume above threshold, and adds new candidates (e.g. RIVN) to [targetAssets.ts](src/plugins/plugin-vince/src/constants/targetAssets.ts) so the bot can trade them. **Beware of low liquidity, high volatility, and increased liquidation risk** on HIP-3 perps (same notice as on Hyperliquid).

---

### Polymarket: paper trading that proves the edge

When spot moves, prediction markets often lag. Oracle runs a **latency arb engine**: Binance spot and Polymarket CLOB in real time, implied probability from the option-like payoff of binary contracts, edge above a threshold, Kelly-sized paper trades. No execution by default—only logs and learns. The goal is to show that the edge is real before a single dollar is at risk. You see whether it's running or paused on the leaderboard Polymarket tab; chat with Oracle for status, pause, or resume. Small edges, captured in code, 24/7.

---

## TL;DR

VINCE pushes daily intel (options, perps, memes, DeFi) to Discord/Slack. One command, **ALOHA**, gives you vibe check + PERPS + OPTIONS + "trade today?". Under the hood: a **self-evolving paper trading bot** — ML loop, feature store, ONNX, strategy genome, regime profiles, portfolio construction, execution graduation — that trains in prod and improves its own parameters weekly. Kelly is the lifestyle concierge (travel, wine, dining, health, fitness); she tracks the flywheel score but never gives trading advice.

Every losing trade gets an automated, multi‑agent post‑mortem in `docs/standup/post-mortems/`, and `bun run postmortems:ingest` turns those write‑ups into a recursive loop—structured stats, guardrail suggestions, and RAG knowledge that Vince/Sentinel use so each loss tightens the rules for the next trade.

---

## Getting Started

```bash
bun install
cp .env.example .env   # add API keys
bun run build

elizaos dev            # hot-reload
# or
bun start              # production (Postgres when POSTGRES_URL set)
```

**Web UI:** `bun start` serves the API on port 3000 and the frontend on **5173**. Open http://localhost:5173 for chat and dashboard.

---

## Features

- **ALOHA** — One command: vibe check + PERPS + OPTIONS + "trade today?"
- **Self-evolving paper bot** — Signals, trades, feature store, Python train, ONNX deploy (export + smoke test fixed), genome mutation, regime-aware sizing. Four models: signal quality, position sizing, TP optimizer, SL optimizer. Rules keep the bot running when models are missing. **Env tuning:** ML threshold, swarm min confidence, aggressive margin/size (see Paper Bot & ML).
- **Strategy genome** — 15+ tunable parameters mutate weekly, replay against history, auto-promote the best variant by Sharpe and drawdown.
- **Regime profiles** — Five market personalities auto-switch risk limits, sizing, and signal thresholds based on Oracle regime, Echo sentiment, and technicals.
- **Execution graduation** — Otaku earns trust through four levels (paper → notify → confirm → auto), demoted by circuit breakers.
- **Portfolio construction** — Correlation matrix, total heat caps, Kelly-criterion sizing, opportunity cost analysis.
- **Flywheel score** — Composite 0–100 health metric across signal quality, trade performance, sentiment, content, knowledge, and engineering.
- **Multi-agent** — Ask any teammate by name; standups 2x/day; one thread, full team.
- **Leaderboard** — Single dashboard: Markets, Memetics, News, Digital Art, Trading Bot, Knowledge. No chat required. [LEADERBOARD.md](docs/LEADERBOARD.md)
- **Kelly** — Lifestyle concierge only; daily briefing to channels with "kelly" or "lifestyle". Optional self-modification. [KELLY.md](docs/KELLY.md)
- **Knowledge ingestion** — VINCE_UPLOAD, ingest-urls; summarize into knowledge/
- **X research** — Paper algo signal + Cursor skill + VINCE_X_RESEARCH in-chat. [X-RESEARCH.md](docs/X-RESEARCH.md)

---

## Paper Bot & ML

The 12-phase roadmap built this loop; the algo (gates, open/skip, feature store) and the ML pipeline (train → ONNX → report → Sentinel) are documented in [PRD: Paper Trading Algo and ML](docs/standup/prds/PRD_PAPER_TRADING_ALGO_AND_ML.md) and [PRD: ML Training Pipeline](docs/standup/prds/PRD_ML_TRAINING_PIPELINE.md). Signals flow into trades, trades flow into the feature store, the feature store feeds Python training, and ONNX models deploy back to the bot. Four models: signal quality, position sizing, TP optimizer, SL optimizer. When models are missing, **rule-based fallbacks** keep it running (e.g. 60% signal-quality threshold, 0.5–2× position size). The dashboard’s “100 trades processed” is the **Weight Bandit** (Thompson Sampling) count of **closed** trades; ONNX stays “None loaded” until you run training and place the `.onnx` files (and `training_metadata.json`) in `.elizadb/vince-paper-bot/models/` (or the configured models dir).

**VinceBench** scores every closed trade on process quality (signal, risk, timing, regime). The score trains the signal-quality model to learn more from high-quality decisions.

### Recent improvements

- **ONNX export fixed** — Graph and node I/O are renamed to `input`/`output` so onnxruntime loads models reliably; smoke tests run after every export so you see “ONNX smoke test passed” for all four models.
- **Env tuning** — No code changes needed to adjust trade frequency or size: ML threshold, swarm confidence, aggressive margin/size (see table below).
- **Training pipeline** — Sentinel improvement tasks write to `docs/standup/openclaw-queue/` with safe filenames (slashes in feature names no longer break writes). Feature prep uses a single concat for derived columns to avoid DataFrame fragmentation warnings.

### Paper bot tuning (env)

Tune no-trades vs margin/size without code changes. In `.env` (see `.env.example`):

| Env var | Purpose |
|--------|--------|
| `VINCE_ML_SIGNAL_QUALITY_THRESHOLD` | 0–1. Override ML signal-quality threshold; lower = more trades (e.g. `0.5` when rule-based 60% is too strict). |
| `VINCE_SWARM_ENABLED` | `true` / `false`. Enable swarm consensus gating in the trade loop. |
| `VINCE_SWARM_MIN_CONFIDENCE` | 0–1 (default `0.5`). Min swarm consensus to allow a trade; lower = more trades. |
| `VINCE_AGGRESSIVE_MARGIN_USD` | Fixed margin per trade in aggressive mode (default `1000`). Increase for larger paper size. |
| `VINCE_AGGRESSIVE_BASE_SIZE_PCT` | Base size as % of portfolio when portfolio &lt; margin (default `12`). |
| `VINCE_PAPER_MAX_SINGLE_TRADE_USD` | Paper bucket + policy cap per trade (default `10000`). High-notional assets (e.g. BTC, index products) often hit this; increase or leave unset to use default. |

**Single-trade cap:** The paper bucket and policy rule **max-single-trade-usd** cap each trade at **$10k** by default (see [policies/trading-policy.yaml](policies/trading-policy.yaml) and the paper bucket in [vinceCapitalBuckets.service.ts](src/plugins/plugin-vince/src/services/vinceCapitalBuckets.service.ts), or `capital-buckets.json` when present). If you see "blocked by policy engine: max-single-trade-usd" in logs, the requested size exceeded this cap; set `VINCE_PAPER_MAX_SINGLE_TRADE_USD` to raise it.

Many “no trade” outcomes come from ML quality below threshold, X sentiment not meeting 40% or neutral, confidence/strength below min, or swarm consensus below the min. Use these vars to relax gates for more paper volume or raise margin/size when you want larger positions.

The **strategy genome** adds a second improvement loop: every week, the genome mutates 15+ parameters, replays against historical feature-store data, ranks variants by Sharpe ratio and max drawdown, and promotes the winner. Regime profiles shift the genome's risk limits and sizing multipliers based on the current market personality.

### Re-run training

```bash
bun run train-models -- --bench-score-weight
```

Or with recency weighting: `bun run train-models:recency`. Output goes to `.elizadb/vince-paper-bot/models/` by default; restart the agent so the inference service loads the new ONNX and `training_metadata.json`.

### Validate ML improvement

After training, validate that ML-derived thresholds (min strength / min confidence) would have improved selectivity on historical data:

```bash
bun run validate-ml
```

Or directly:

```bash
python3 src/plugins/plugin-vince/scripts/validate_ml_improvement.py \
  --data .elizadb/vince-paper-bot/features
```

The script loads the same feature-store data, computes suggested tuning (Q0.25 of profitable trades), and reports baseline win rate vs filtered win rate and % of skipped trades that were losers.

**Example run (Feb 2026, 158 closed trades):**

| Metric | Value |
|--------|--------|
| Total trades with outcome | 158 |
| Baseline win rate (all trades) | 23.4% (37 wins) |
| Suggested tuning (Q0.25 profitable) | min_strength=56, min_confidence=50 |
| If we had used suggested_tuning | 121 trades taken (20.7% win rate), 37 skipped (68% of skipped were losers) |
| Result | On this dataset, suggested_tuning did not improve win rate (filtered 20.7% vs baseline 23.4%). Small samples or weak strength/confidence signal; re-run after more trades. |

Conclusion: the ML logic can adjust parameters from data; improvement on live data depends on regime and data quality. Re-run after more closed trades.

Full loop: [PAPER-BOT-AND-ML.md](docs/PAPER-BOT-AND-ML.md). ONNX details: [ONNX.md](docs/ONNX.md). Feature store: [FEATURE-STORE.md](docs/FEATURE-STORE.md).

---

## North Star

You never have to "chat" with VINCE. He pings you. Proactive agent: day report (ALOHA), trades and reasoning, close results and PnL. Chat remains for deep dives. Stay in the game without 12+ hours on screens.

[Vision & gap](knowledge/internal-docs/vince-north-star.md)

---

## Scripts

| Script | Purpose |
| :--- | :--- |
| `elizaos dev` | Hot-reload development |
| `bun start` | Production start |
| `bun run deploy:cloud` | Deploy to Eliza Cloud |
| `bun run sync:supabase` | Backfill features to Supabase |
| `bun run db:check` | Verify DB migrations |
| `bun run train-models` | Train ML models (min 90 closed trades) |
| `bun run train-models:recency` | Train with recency decay (upweight recent trades) |
| `bun run validate-ml` | Validate ML thresholds on feature-store data |
| `bun run type-check` | TypeScript check (no emit) |
| `bun run check-all` | type-check + format + tests |

---

## Docs

| Doc | What |
| :--- | :--- |
| **[PRD: One Dream — Agent Synergy](docs/standup/prds/PRD_ONE_DREAM_AGENT_SYNERGY.md)** | **Core focus:** $100K trading system, 6 phases (37 tasks), self-evolving genome, adversarial intelligence |
| [PRD: Paper Trading Algo and ML](docs/standup/prds/PRD_PAPER_TRADING_ALGO_AND_ML.md) | Decision flow, gates, how ML improves the algo |
| [PRD: ML Training Pipeline](docs/standup/prds/PRD_ML_TRAINING_PIPELINE.md) | Feature store → train → ONNX → report → Sentinel, end-to-end |
| [CLAUDE.md](CLAUDE.md) | Dev guide (character, plugins, tests) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, priorities, what we merge |
| [FEATURE-STORE.md](docs/FEATURE-STORE.md) | ML, paper bot, feature store |
| [PAPER-BOT-AND-ML.md](docs/PAPER-BOT-AND-ML.md) | Signal loop, MandoMinutes, train |
| [ONNX.md](docs/ONNX.md) | Train, export, deploy |
| [RELEASE_v4.2.0.md](docs/RELEASE_v4.2.0.md) | V4.2.0 — The Genome (Phases 1–5 complete) |
| [RELEASE_v4.0.0.md](docs/RELEASE_v4.0.0.md) | v4.0.0 release notes (Paper Bot ML docs, validate-ml) |
| [MULTI_AGENT.md](docs/MULTI_AGENT.md) | ASK_AGENT, standups, Discord |
| [OTAKU.md](docs/OTAKU.md) | Executor agent, DeFi, execution graduation |
| [DEPLOY.md](docs/DEPLOY.md) | Eliza Cloud, env, troubleshooting |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Push schedule, Discord, env vars |
| [SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) | Production persistence |
| [BRANDING.md](docs/BRANDING.md) | Voice, positioning, LIVETHELIFETV |
| [plugin-vince](src/plugins/plugin-vince/) | WHAT, WHY, HOW, README |
| [plugin-kelly](src/plugins/plugin-kelly/) | Lifestyle concierge, flywheel score |
| [OPENCLAW.md](OPENCLAW.md) | OpenClaw agents, vault, skills, tasks |

---

<div align="center">

_Built with [ElizaOS](https://github.com/elizaos/eliza). No hype. No permission. No exit._

</div>
