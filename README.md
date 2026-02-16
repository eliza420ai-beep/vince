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

### *Push, not pull.*

**Unified data intelligence** for options · perps · memes · airdrops · DeFi · lifestyle · NFT floors

*with a **self-improving paper trading bot** at the core*

---

<p>
  <strong>⚡ ALOHA</strong> → vibe check · <strong>📊 PERPS</strong> → signals · <strong>📈 OPTIONS</strong> → posture · <strong>🤖 PAPER BOT</strong> → ML loop
</p>

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🚀 elizaos dev     │  📦 bun run deploy:cloud     │  💾 bun run sync:supabase    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

</div>

---

## What's New in v2.7

**Otaku** is the only agent with a funded wallet and onchain execution. This release doubles down on that story: docs, grant application, and a clear path to testnet MVP.

| Focus | Summary |
|:---|:---|
| **Otaku** | 13 actions (swap, DCA, bridge, Morpho, stop-loss, NFT mint, execute Vince signal, etc.). Free API: health, config, alerts, notifications. Paid (x402): positions, quote, yields, history, portfolio. Degen vs Normies mode; DB-backed completion events and socket-driven UI. |
| **Docs** | [OTAKU.md](docs/OTAKU.md) updated with a **For Developers** section (what it can/cannot do, key files, how to run, suggested issues for MVP). [Base Builder Grant](docs/grants/BASE-BUILDER-GRANT-APPLICATION.md) rewritten with Otaku as the core agent for VC/grant attention. |
| **Next** | We're grinding hard on **Kelly** (personal lifestyle agent as good as it gets—deeper knowledge on topics that matter most) and **Sentinel**'s passion for **gen art** (QQL derivative passion project). |

**Previous releases:** [v2.5.0](docs/RELEASE_v2.5.0.md) (Clawterm, OpenClaw, standups, DefiLlama, ERC-8004) · [Changelog](CHANGELOG.md)

---

## One team, one dream

<div align="center">

**We assembled a dream team.** Clear lanes, no overlap—data → plan → call → lifestyle → infra.

</div>

| Agent | Lane |
|:---|:---|
| **Eliza** | Full knowledge, research, brainstorm—the base everything else builds on. **Heavy focus: improve and expand the knowledge base** (quality, gaps, new categories). Her own Discord + #knowledge for ingestion; Leaderboard **Knowledge** tab tracks the corpus. |
| **VINCE** | Objective data: options chains, perps, memes, news, paper bot status, yield. Push, not pull. Data only—no marketing or GTM. |
| **ECHO** | CT sentiment, X research, social alpha. Echoes what Crypto Twitter is saying—threads, whale takes, contrarian warnings. Your ears on X. |
| **Oracle** | Prediction markets: Polymarket (read-only). Discovery, odds, portfolio; priority markets; handoffs to VINCE (live data) and Solus (strike/execution). |
| **Solus** | Plan and call. You paste context (or get it from VINCE); he gives size/skip/watch, invalidation, rebalance. Execution architect for the $100K stack. |
| **Otaku** | **Only agent with a funded wallet.** DeFi wiz: token discovery, Morpho, yield, smart money flows, CDP. Mints NFTs when Sentinel creates gen art; full onchain exploration. When you need DeFi edge. |
| **Kelly** | Touch grass, live the good life. Hotels, fine dining, wine, health, fitness—no trading. |
| **Sentinel** | Keeps the ElizaOS project running smooth, profitable, and well coded. Ops, cost steward, ONNX, ART, clawdbot, task briefs for Claude. |

**Startup analogy** — who’s CEO, CDO, CFO, COO, CHRO, CTO?

| Role | Agent | Why |
|:---|:---|:---|
| **CEO** | Eliza | Strategy, knowledge base, research—the base everything builds on. **Improve and expand knowledge** (quality, gaps, categories). Extends to GTM/PR, community, Discord #knowledge, positioning, Substack. |
| **CDO** | VINCE | Objective data: options, perps, memes, news, paper bot. Push intel only—no marketing or external promo. |
| **CSO** | ECHO | Subjective sentiment: CT vibes, X research, social alpha, contrarian warnings. Your ears on Crypto Twitter. |
| **CPO** | Oracle | Prediction markets: Polymarket discovery, odds, portfolio (read-only). Priority markets; feeds paper bot and strike selection. |
| **CFO** | Solus | Capital and risk: size/skip/watch, invalidation, rebalance. Execution architect for the $100K stack. |
| **COO** | Otaku | **Only agent with funded wallet.** DeFi ops: token discovery, Morpho, yield, CDP; mints NFTs (e.g. Sentinel gen art); full onchain. Keeps daily operations seamless. |
| **CVO** | Kelly | People and balance: touch grass, hotels, dining, wine, health, fitness. Culture where humans recharge; no burnout. |
| **CTO** | Sentinel | Systems, cost, code: ops, ONNX, clawdbot, task briefs. Keeps the stack running and profitable. |

One team, one dream.

---

## Multi-agent: one conversation, full team

You talk to one agent. That agent asks any teammate by name and brings the answer back—in the same thread. No app-switching, no copy-paste. Ask Kelly for a wine pick; she can ask Vince for the market vibe and Solus for size in one flow. You get one reply that’s already wired through the right specialist.

**Standups run without you.** Twice a day (configurable), the team meets in a dedicated standup: crypto pulse, recent code, ideas. The run produces lessons (stored per agent), action items (reminders to the right agent), and relationship signals (e.g. disagreement tracked). When it’s done, a short summary lands in **#daily-standup**. Invite the coordinator bot (default: Kelly) and the agents you want in the channel.

**You control who can ask whom.** An allowlist limits which agents are askable; optional rules (e.g. only Kelly can ask anyone) give fine-grained policy without code. Each agent keeps its own runtime; routing is by name.

→ [MULTI_AGENT.md](docs/MULTI_AGENT.md) — ASK_AGENT resolution, Discord Option C, policy, plugin-inter-agent vs orchestrator.

---

## TL;DR

**VINCE** = ElizaOS agent that **pushes** daily intel (options, perps, memes, DeFi) to Discord/Slack instead of you asking. One command, **ALOHA**, gives you vibe check + PERPS + OPTIONS + “trade today?”. Under the hood: a **self-improving paper trading bot** (ML loop, feature store, ONNX) that trains in prod and stores models in Supabase—no redeploy to improve. **Kelly** is a separate **lifestyle-only concierge** agent: travel advisor, private sommelier, Michelin guide for fine dining, health guru, and fitness coach—and the one who motivates you to touch grass and rebalance. She uses **plugin-kelly** only (no vincePlugin) and can push a daily concierge briefing to channels with "kelly" or "lifestyle" in the name; no trading actions. She knows your context (paper perps, options income) but never gives trading advice. **Run:** `elizaos dev` · **Deploy:** `bun run deploy:cloud` · **Backfill features:** `bun run sync:supabase`.

**Multi-agent strategy (priority):** (1) **First:** Implement feedback-from-testing → Sentinel triages → PRD or Eliza task to `standup-deliverables/`; keep implementation in Cursor/human. (2) **If bottleneck:** Add a dev worker to apply PRDs; prefer **Milaidy** (ElizaOS, existing Gateway hook) over OpenClaw. (3) Full rationale, limitations, and options → [MULTI_AGENT.md](docs/MULTI_AGENT.md).

---

## 📑 Quick Links

| | |
|:---|:---|
| [**FEATURE-STORE**](docs/FEATURE-STORE.md) | ML & paper bot · feature store |
| [**MULTI_AGENT**](docs/MULTI_AGENT.md) | ASK_AGENT · standups · one conversation, full team |
| [**Release v2.7**](docs/RELEASE_v2.7.md) | Otaku star · grant · Kelly & Sentinel grind |
| [**SUPABASE_MIGRATION**](docs/SUPABASE_MIGRATION.md) | Production persistence checklist |
| [**DEPLOY**](docs/DEPLOY.md) | Eliza Cloud · env · troubleshooting |
| [**DISCORD**](docs/DISCORD.md) | Channel structure for VINCE + Eliza (IKIGAI, LiveTheLifeTV, Slack) |
| [**CLAUDE**](CLAUDE.md) | Dev guide (character, plugins, tests) |
| [**plugin-vince/**](src/plugins/plugin-vince/) | README · WHAT · WHY · HOW |
| [**plugin-kelly/**](src/plugins/plugin-kelly/) | Lifestyle-only concierge (daily briefing, no trading) |
| [**plugin-personality**](https://github.com/elizaos-plugins/plugin-personality/blob/next/README.md) | Kelly only: character evolution, MODIFY_CHARACTER, self-reflection (experimental) |
| [**progress.txt**](src/plugins/plugin-vince/progress.txt) | Tracker · backlog |
| [**CLAUDE_CODE_CONTROLLER**](docs/CLAUDE_CODE_CONTROLLER.md) | Code/repo tasks via Claude Code (optional) |
| [**skills/x-research**](skills/x-research/README.md) | X (Twitter) read-only research · sentiment on X · Cursor/Claude skill + VINCE in-chat |
| [**LOCALSONLY**](docs/LOCALSONLY.md) | Local inference cluster (EXO) · cost and WHY |
| [**OPENCLAW_VISION**](docs/OPENCLAW_VISION.md) | First use case (fork vince), ClawdBot → OpenClaw lore, Jan 2024 vision |

---

## 📖 Contents

| Section | |
|:---|:---|
| [One team, one dream](#one-team-one-dream) | The dream team: Eliza, VINCE, Solus, Otaku, Kelly, Sentinel |
| [Multi-agent: one conversation, full team](#multi-agent-one-conversation-full-team) | ASK_AGENT, standups, policy—one thread, full team |
| [North Star](#-north-star) | Proactive agent, push not pull |
| [Current Focus](#-current-focus-feb-2026) | ALOHA, ML paper trading |
| [X research & sentiment](#-x-research--sentiment-on-x) | Paper algo signal + Cursor skill + VINCE in-chat |
| [Milestone](#-milestone-full-ml-loop) | Shipped · no redeploy tax |
| [Heart of VINCE](#-heart-of-vince) | signals → trades → learning |
| [Star Feature](#-star-feature) | Self-improving paper bot |
| [Features](#-features) | What matters + actions |
| [Kelly: Self-modification](#kelly-self-modification-plugin-personality-experimental) | plugin-personality (experimental) |
| [Leaderboard page](#leaderboard-page-dashboard-hub) | Dashboard hub · no chat required |
| [Getting Started](#-getting-started) | Install · dev · production |
| [Production](#-production) | Supabase · ML on Cloud |
| [Configuration](#-configuration) | Env · keys · paths |
| [Documentation](#-documentation) | Doc index |
| [Differentiation](#differentiation--competitor-lessons) | How we compare · what we're learning |
| [Troubleshooting](#-troubleshooting) | DB · SSL · limits |

> **At a glance:** One command (**ALOHA**) → daily vibe check + PERPS + OPTIONS + "trade today?". Paper bot runs in prod, trains when ready, stores models in Supabase — **no redeploy to improve ML.** Supabase Postgres for production persistence.

---

## ◆ North Star

<div align="center">

*You never have to "chat" with VINCE — he pings you.*

</div>

The goal is a **proactive agent** that sends what you need on **Discord or Slack**: day report (ALOHA), trades and reasoning, close results and PnL, optionally thin-floor NFT alerts. Chat remains for deep dives; the default experience is **push, not pull**.

**Why we built this:** Stay in the game without 12+ hours on screens—treat crypto to live well, not be consumed.

→ [Full vision & gap](knowledge/internal-docs/vince-north-star.md) · [Mindset (VINCE + Eliza)](knowledge/internal-docs/why-vince-eliza-mindset.md)

---

## 🎯 Current Focus (Feb 2026)

<table>
<tr>
<td width="50%">

**☀️ ALOHA day report**

Our primary action. One command delivers the daily "vibe check": market temperature, PERPS posture, OPTIONS positioning, and whether the bot should even be trading.

</td>
<td width="50%">

**🤖 Machine-learning paper trading**

Every sprint feeds the paper bot more signal coverage, cleaner features, faster training, better ONNX. **Shipped:** Supabase Postgres migration, retrain + improvement weights, getVibeCheck → paper bot, NASDAQ 24h + macro, relaxed real-time thresholds.

</td>
</tr>
</table>

- **Other actions** — still present, supporting cast. If it doesn't improve the paper strategy or ALOHA briefing, it's deliberately low priority.

<div align="center">

> ***If you only remember one thing:*** *ALOHA in, better ML out.*

</div>

---

## ◆ X research & sentiment on X

We **search X (Twitter) for sentiment** and use it in **three** places:

| | What | Where |
|:---:|---|:---|
| 🤖 | **Paper trading algo** | **XSentiment** is a signal source in the aggregator (weight 0.5). Staggered one asset per hour (no burst); rate-limit aware. When confidence ≥ 40%, it votes long/short/neutral and appears in **WHY THIS TRADE**. Feature store records `signal_xSentimentScore` for ML. → [SIGNAL_SOURCES](src/plugins/plugin-vince/SIGNAL_SOURCES.md) |
| 🔍 | **Cursor / Claude skill** | **skills/x-research/** — CLI (`bun run x-search.ts search "BNKR"`), watchlist, thread/profile, 15min cache. Use from the IDE for deep dives; paste results into VINCE or knowledge. |
| 💬 | **VINCE in-chat** | When `X_BEARER_TOKEN` is set, ask *"what are people saying about BNKR?"* or *"search X for …"* → **VINCE_X_RESEARCH** returns an **ALOHA-style narrative** (vibe, themes, standout take) then sample posts (read-only). |
| ✅ | **Tests** | `bun test skills/x-research/sentiment.test.ts` (skill) and `bun test src/plugins/plugin-vince/src/__tests__/xSentiment.service.test.ts` (paper algo: cache, rate limit, sentiment). |

Same **X API Bearer token** (Basic tier or higher); read-only, no posting. See [skills/x-research/README.md](skills/x-research/README.md) for setup and [skills/x-research/SKILL.md](skills/x-research/SKILL.md) for the research loop.

**Recent (Feb 2026):** X research search now returns an **ALOHA-style briefing** (TEXT_LARGE): one narrative block (vibe, themes, standout/viral take, clear opinion) in VINCE's voice, then sample posts — no dry "Conclusion:" label. **Quality accounts:** set **X_RESEARCH_QUALITY_LIST_ID** to a curated X List ID (from x.com/i/lists/…) so we rank tweets from that list first (list members fetched and cached 24h); **SOLUS_X_VIP_HANDLES** can add one-offs. Same X API; list feed and **official XDK** when installed; **X_LIST_ID** for list sentiment in CT Vibe and leaderboard. Tuning: **X_SENTIMENT_ASSETS**, **X_SENTIMENT_STAGGER_INTERVAL_MS**, **X_SENTIMENT_LIST_ENABLED**. Quota and tiers: [docs/X-API.md](docs/X-API.md).

---

## 🚀 Milestone: Full ML Loop

<div align="center">

**We shipped it.** The paper bot runs a **complete ML lifecycle in production** without paying $15 per model update.

</div>

| | What | How |
|:---:|---|---|
| 🗄️ | **Supabase Postgres** | Set `POSTGRES_URL` in `.env`; ElizaOS tables + `plugin_vince.paper_bot_features` live in one DB. Data **persists across redeploys**. → [SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) |
| 📦 | **Feature store** | Dual-write to `vince_paper_bot_features` (Supabase) and `plugin_vince.paper_bot_features` (Postgres). JSONL backup always kept. Backfill: `bun run sync:supabase` |
| 🐍 | **Training in prod** | At 90+ complete trades, **TRAIN_ONNX_WHEN_READY** runs the Python pipeline **inside the container**. No local train-and-copy. |
| ☁️ | **Models in Supabase Storage** | Trained `.onnx` + `training_metadata.json` upload to bucket **`vince-ml-models`**. ML service **reloads** immediately. Next redeploy: app pulls latest — **updated ML without another deploy**. |
| ⚖️ | **Improvement weights** | `run-improvement-weights.ts` (with `VINCE_APPLY_IMPROVEMENT_WEIGHTS=true`) aligns aggregator source weights with `training_metadata.json`. Weights in `tuned-config.json`. |
| 🔧 | **One-time setup** | Run `scripts/supabase-migrations-bootstrap.sql` and `scripts/supabase-feature-store-bootstrap.sql`; create bucket `vince-ml-models`; set `POSTGRES_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in `.env`. → [DEPLOY.md](docs/DEPLOY.md) · [FEATURE-STORE.md](docs/FEATURE-STORE.md) |

<div align="center">

**TL;DR** · One deploy. Features and models live in Supabase. Training runs on Cloud. New models take effect **without** another $15 redeploy.

</div>

**V4.30 (Feb 2026):** Paper bot now records **avoided decisions** (evaluated but no trade) in the feature store so ML keeps learning when no trades are taken (e.g. extreme vol days). See [FEATURE-STORE.md](docs/FEATURE-STORE.md) — "Avoided decisions" and "Collecting more training data". Use `VINCE_PAPER_AGGRESSIVE=true` and `VINCE_PAPER_ASSETS=BTC` for a faster path to 90+ trades.

---

## ═══ Heart of VINCE

```
  signals  ──►  trades  ──►  learning  ──►  (repeat)
```

The core is a **multi-factor paper trading pipeline**:

- **15+ signal sources** — CoinGlass, Binance, MarketRegime, News, **X (Twitter) sentiment**, Deribit, liquidations, Sanbase, Hyperliquid OI cap/funding extreme
- **50+ features per decision** — stored with **decision drivers** ("WHY THIS TRADE")
- **Python training pipeline** — `train_models.py` → ONNX + improvement report (feature importances, holdout metrics AUC/MAE/quantile, suggested signal factors). Optional: `--recency-decay`, `--balance-assets`, `--tune-hyperparams`.

Feature store and training script aligned: **hasFundingExtreme** (Binance + Hyperliquid), **hasOICap** (Hyperliquid perps-at-OI-cap); synthetic data uses a 10-source pool so ML sees production variety.

```mermaid
flowchart LR
    subgraph Inputs
        MM[MandoMinutes]
        HIP[HIP-3 / Macro]
        HL[Hyperliquid]
    end
    subgraph Agg
        SA[Signal Aggregator]
    end
    subgraph Output
        PB[Paper Bot]
        FS[Feature Store]
    end
    MM --> SA
    HIP --> SA
    HL --> SA
    SA --> PB
    SA --> FS
```

### MandoMinutes · News Sentiment

| | Capability |
|---|:---|
| ✅ | Asset-specific sentiment ("Vitalik sells ETH" affects ETH more than BTC) |
| ✅ | Risk-event dampening (block bullish when critical/warning, boost bearish) |
| ✅ | Price-embedded headlines ("BTC: 75.2k (-4%)") |
| ✅ | Category weighting, headcount-calibrated confidence |
| ✅ | **getVibeCheck()** — 1–2 line vibe (Risk-off/Risk-on/Mixed + salient phrases) at top of dashboard and briefing |
| ✅ | Wired into paper bot context and "WHY THIS TRADE" |
| ✅ | "erases gains" and similar → bearish (NEGATIVE_GAINS_PHRASES override) |
| ✅ | **NASDAQ 24h + macro** (HIP-3 primary, Yahoo fallback) — `news_nasdaqChange` top-5 signal-quality feature |
| ✅ | **Real-time thresholds** relaxed — more sources contribute more often |
| ✅ | **Improvement weights** — NewsSentiment↑, CoinGlass↑, MarketRegime↑ |

→ Logs: `[VINCE] 📡 Signal sources available:` · `[VinceSignalAggregator] ASSET: N source(s) → M factors` · [SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md)

---

## Differentiation & competitor lessons

We’re not the only ones building trading bots (Passivbot, Gunbot, 3Commas, Coinrule, Pionex, Cornix, Mizar, Kraken AI, Uniswap ecosystem, etc.). Most are manual-tuned or signal-following; **our differentiator is the self-improving ML loop + multi-source signals + "WHY THIS TRADE" explainability** on Hyperliquid.

**What we’re learning from them:**

| Lesson | From | For VINCE |
|--------|------|-----------|
| Walk-forward optimization | Passivbot, 3Commas | Add to training pipeline to reduce overfitting |
| Fee-aware PnL (net after fees) | Gunbot | ✅ Done — round-trip fees deducted; PnL and improvement report are net. See [FEATURE-STORE.md](docs/FEATURE-STORE.md#fee-aware-pnl-net-of-costs). |
| Dashboard for WHY + PnL | 3Commas | Simple Streamlit/Flask for "WHY THIS TRADE" + PnL + SHAP |
| Backtesting as first-class step | Passivbot, 3Commas | Replay historical features/signals for "backtested + walk-forward" |

**Later / optional:** Grid mode for chop (Passivbot), no-code rule layer (Coinrule), multi-exchange after HL is solid. We’re not copying exchange-locked or scale-first playbooks—we focus on proving alpha in paper then optional real-money.

→ Details: [progress.txt](src/plugins/plugin-vince/progress.txt) — "Competitor landscape & lessons".

---

## ★ Star Feature: Self-Improving Paper Bot

<div align="center">

*The most novel piece in this repo*

</div>

**Plugin-vince:** 27 services · 20 actions · 2 providers · 1 evaluator — 18 data-source services, 7 fallbacks, 4 ML services (feature store, weight bandit, signal similarity, ONNX inference).

### The Loop

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Paper trade │ ─► │ Feature store │ ─► │ Python train │ ─► │ ONNX deploy  │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
       ▲                                                                 │
       └──────────────────── bandit · similarity · tuner ◄───────────────┘
```

| # | Component | Details |
|:---:|---|:---|
| 1 | **Paper trading** | Simulated perpetuals (Hyperliquid-style), risk limits, session filters. Goals: $420/day, $10K/month. Targets: BTC, ETH, SOL, HYPE + 34 HIP-3 tradFi assets. |
| 2 | **Feature store** | **50+ features** per decision: market (price, funding, OI, funding 8h delta, OI 24h change, DVOL, RSI, order-book imbalance, bid-ask spread, price vs SMA20), session, signal (factor-derived sentiment, hasFundingExtreme, hasOICap), regime, news (sentiment, risk events, NASDAQ 24h, macro risk-on/off), execution, outcome. → JSONL + Supabase. [DATA_LEVERAGE.md](src/plugins/plugin-vince/DATA_LEVERAGE.md) |
| 3 | **Online adaptation** | Thompson Sampling gets PnL-weighted updates per source on each closed trade. Signal-similarity k-NN: "avoid" → hard filter (trade skipped). Bayesian parameter tuner. |
| 4 | **Offline ML** | `train_models.py` trains XGBoost for **signal quality**, **position sizing**, **TP optimizer**, **SL optimizer** → exports all four to ONNX. Improvement report includes holdout metrics (drift/sizing). Optional sample weights and GridSearchCV tuning. |
| 5 | **ONNX at runtime** | Bot loads ONNX for signal-quality and sizing; rule-based fallbacks when models aren't trained. |

### Why Knowledge Matters

Actions supply *current* data (prices, signals). The knowledge base supplies *how to think* — frameworks, strike-selection logic, meme lifecycle. `trenchKnowledgeProvider` pulls relevant knowledge so the LLM interprets through proven lenses, not just echoes numbers.

### Data Leverage

Funding history (8h delta) · rolling SMA20 · Binance depth (book imbalance, spread) · Deribit DVOL/ATR/RSI · **MandoMinutes news** (asset-specific sentiment, price-embedded, risk events, category-weighted). → [ALGO_ML_IMPROVEMENTS.md](src/plugins/plugin-vince/ALGO_ML_IMPROVEMENTS.md)

### Improvements We Claim

1. Market data wired: order-book, SMA20, funding 8h delta, DVOL, **NASDAQ 24h + macro**
2. Book-imbalance filter · SMA20/funding confidence boost · DVOL size cap
3. **getVibeCheck()** → "Headlines: {vibe}" in WHY THIS TRADE
4. **Real-time thresholds** relaxed
5. **Improvement weights** from training metadata (run-improvement-weights logs holdout_metrics when present)
6. **Retrain pipeline** — train_models.py (8 tests, holdout metrics, smoke tests for sample-weight/tuning), run-improvement-weights.ts, FEATURE_TO_SOURCE

*We do **not** yet claim improved P&L or win rate—that requires backtest or live results.*

### WHY THIS TRADE Banner

Supporting vs Conflicting factors · "N of M sources agreed (K disagreed)" · ML Quality % · Open window boost · up to 20 factors. News sentiment under Conflicting when going SHORT.

### Resilience

- **Binance 451** — After 3 consecutive 451s, aggregator skips Binance; recovery on 2xx. Use `VINCE_BINANCE_BASE_URL` for proxy.
- **Fetch timeouts** — 12s; one slow source does not block aggregation.

→ Implementation: [src/plugins/plugin-vince/](src/plugins/plugin-vince/)

---

## 📌 Features

| | Feature | |
|:---:|---|:---|
| 👥 | **Multi-agent (ASK_AGENT & standups)** | One conversation: ask any teammate by name, get the answer in-thread. Standups 2×/day (lessons, action items, #daily-standup). Policy: allowlist + who-can-ask-whom. → [MULTI_AGENT.md](docs/MULTI_AGENT.md) |
| ☀️ | **ALOHA** | Single command → vibe check + PERPS pulse + OPTIONS posture + "should we trade today?" |
| 🤖 | **Self-improving paper bot** | ML loop; no live execution; every trade stored and learnt from |
| 📊 | **Leaderboard page** | One dashboard: Markets (HIP-3, HL), Memetics, News, Digital Art, More, Trading Bot, Knowledge. No chat required — data always there. See [Leaderboard page](#leaderboard-page-dashboard-hub). |
| 👤 | **Teammate context** | USER/SOUL/TOOLS/MEMORY keep responses in character |
| 🍷 | **Kelly (concierge agent)** | Separate agent: travel advisor, sommelier, Michelin guide, health guru, fitness coach, touch-grass motivator. Uses **plugin-kelly** only; action **KELLY_DAILY_BRIEFING**; scheduled push to channels with "kelly" or "lifestyle". **Experimental:** [plugin-personality](https://github.com/elizaos-plugins/plugin-personality/blob/next/README.md) for character evolution (MODIFY_CHARACTER, self-reflection). No trading. See [plugin-kelly](src/plugins/plugin-kelly/). |
| 📚 | **Knowledge ingestion** | `VINCE_UPLOAD` + `scripts/ingest-urls.ts` → summarize → `knowledge/` (URLs, YouTube, PDF, podcast). See [scripts/README.md](scripts/README.md) |
| 💬 | **Chat mode** | `chat: <question>` → pulls from `knowledge/` and trench frameworks |
| 📦 | **Other actions** | NEWS, MEMES, TREADFI, LIFESTYLE, NFT, INTEL, BOT, UPLOAD — heritage, lightly maintained |
| 🐦 | **X research & sentiment** | **Paper algo:** X sentiment is a signal source (weight 0.5, staggered one per hour, rate-limit aware). **skills/x-research** (Cursor skill) + **VINCE_X_RESEARCH** in-chat when `X_BEARER_TOKEN` set. → [skills/x-research](skills/x-research/README.md) · [SIGNAL_SOURCES](src/plugins/plugin-vince/SIGNAL_SOURCES.md) |

### Action Status

| Priority | Action |
|:---:|---|
| ⭐ | **ALOHA** (includes PERPS & OPTIONS) — Core value |
| 📊 | **VINCE_PERPS / VINCE_OPTIONS** — Used inside ALOHA; subcomponents |
| 📋 | **Everything else** — Heritage, not product focus |

### Kelly: Self-modification (plugin-personality, experimental)

**Kelly** is the only agent that loads [**@elizaos/plugin-personality**](https://github.com/elizaos-plugins/plugin-personality/blob/next/README.md) (ElizaOS Self-Modification Plugin). It lets her evolve her character over time through conversation analysis, user feedback, and self-reflection—e.g. adjusting bio, style, or topics when users say what worked or didn’t.

| What | Details |
|:---|:---|
| **Scope** | Kelly only (VINCE does not use plugin-personality). |
| **Components** | **CHARACTER_EVOLUTION** evaluator (periodic learning), **MODIFY_CHARACTER** action (user/self-requested changes), **CHARACTER_EVOLUTION** provider (self-reflection context), **CharacterFileManager** (safe file updates + backups). |
| **Safety** | Backups before changes, validation (gradual change, no harmful edits), optional admin approval and confidence thresholds. |
| **Config** | Optional env in `.env.example`: `ENABLE_AUTO_EVOLUTION`, `EVOLUTION_COOLDOWN_MS`, `REQUIRE_ADMIN_APPROVAL`. See [plugin-personality README](https://github.com/elizaos-plugins/plugin-personality/blob/next/README.md) for full options. |

Example: *"You should be more encouraging when suggesting wine"* → Kelly can apply a gradual character update (e.g. style/bio) and confirm; *"That place was too loud—anywhere quieter?"* feeds into the same learning loop. Character file must be writable for persistent changes; SQL plugin is required.

---

## ▶ Getting Started

```bash
bun install
bun run build
cp .env.example .env   # add API keys

# Development (hot-reload)
elizaos dev

# Or start once (uses Postgres when POSTGRES_URL set)
bun start
```

---

## 🛠 Development

```bash
elizaos dev          # Hot-reload (recommended)
bun start            # Production start (migration bootstrap when POSTGRES_URL set)
elizaos test         # Run tests
```

### Key Scripts

| Script | Purpose |
|:---|:---|
| `elizaos dev` | Hot-reload development |
| `bun start` | Production start (runs migration bootstrap when `POSTGRES_URL` set) |
| `bun run deploy:cloud` | Deploy to Eliza Cloud |
| `bun run sync:supabase` | Backfill local JSONL features to Supabase |
| `bun run db:check` | Verify DB migrations |
| `bun run db:bootstrap` | Run DB bootstrap (Postgres) |
| `bun run scripts/ingest-urls.ts --file urls.txt` | Batch ingest URLs/YouTube into `knowledge/` |
| `bun run train-models` | Train ML models (from plugin or repo root); see [scripts/README](src/plugins/plugin-vince/scripts/README.md) |
| `bun test skills/x-research/sentiment.test.ts` | Prove X research → sentiment (unit + optional live with `X_BEARER_TOKEN`) |

### Web UI (Otaku-style frontend)

- **`bun start`** starts the API (port 3000) and the VINCE chat/dashboard UI (port **5173**). **Open http://localhost:5173** for the full UI (sidebar, chat, Quick Start).
- If you see the **"Invite code" / "Gated access"** screen, you're on the default ElizaOS dashboard (e.g. from `elizaos start` or port 3000 before the custom UI is built). Use **http://localhost:5173** after `bun start`, or run `bun run start:static` and use port 3000 after building the frontend.

### Leaderboard page (dashboard hub)

The **Leaderboard** is a single-page dashboard that surfaces “who’s doing best” and market pulse **without chatting**. One URL, seven tabs, all data from plugin-vince (and gamification when enabled).

| Tab | What you get |
|:---|:---|
| **Markets** | HIP-3 (commodities, indices, stocks, AI/Tech) + Hyperliquid Crypto — top movers, volume leaders, full category lists, OI leaders, crowded longs/shorts. Copy: *“Always here. No need to ask VINCE.”* |
| **Memetics** | Memes (hot / ape / watch / avoid), Meteora LP (top pools, meme pools, all by APY), Leftcurve headlines, watchlist. |
| **News** | MandoMinutes headlines + sentiment + one-liner. |
| **Digital Art** | Curated NFT collections — floor prices, thin-floor opportunities, volume leaders, criteria note. |
| **More** | Fear & Greed, Options (BTC/ETH DVOL + TLDR), cross-venue funding, OI cap, regime, Binance intel, CoinGlass extended, Deribit skew. |
| **Trading Bot** | Paper portfolio and open positions from the self-improving bot. |
| **Knowledge** | Knowledge base summary, quality test results, text/YouTube upload. |

**Why we built it:** Push, not pull. You open the page and see live leaderboards and pulse; no “ask VINCE for perps” or “ask for memes.” The backend (`plugin-vince` route `GET …/vince/leaderboards`) aggregates HIP-3, HL, DexScreener, Meteora, News, NFT floor, and “More” in parallel with **per-section timeouts** (`safe()`) so one slow source doesn’t kill the response. Frontend uses React Query (stale time, refetch per tab), a reusable **MarketLeaderboardSection** (top movers, volume leaders, categories in grid or stack), and clear 503/404 handling with hints (patch script, `curl` example). Gamification “Rebels” ranking appears when the gamification plugin is available.

**Where it lives:** `src/frontend/components/dashboard/leaderboard/page.tsx`, `market-leaderboard-section.tsx`, `src/frontend/lib/leaderboardsApi.ts`, `src/plugins/plugin-vince/src/routes/dashboardLeaderboards.ts`. **Polymarket tab:** priority markets from Gamma/CLOB; data is fetch-based (refetch when tab is open every 60s and on Refresh); “Updated” is the last fetch time.

---

## ☁ Production (Supabase / Postgres)

<div align="center">

**Supabase migration is ready.** Set `POSTGRES_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` in `.env`.

Data **persists across redeploys**. → [SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) · Backfill: `bun run sync:supabase`

</div>

1. **`.env`** — `POSTGRES_URL` (port 5432, direct), `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` (required if using pooler)
2. **Bootstrap SQL** — `scripts/supabase-migrations-bootstrap.sql` and `scripts/supabase-feature-store-bootstrap.sql` in Supabase SQL Editor
3. **Verify** — `bun run db:check` (tests the migration query; we've run this successfully)
4. **Run** — `bun start`
5. **Deploy** — `bun run deploy:cloud` passes vars from `.env` → [DEPLOY.md](docs/DEPLOY.md)

### ML on Eliza Cloud

**Recommended:** Train on Cloud, models in Supabase. Bot trains in container at 90+ trades, uploads to `vince-ml-models`, reloads ML. Next redeploy pulls latest — no extra deploy for new models.

**Alternative:** Ship models in repo — copy `.onnx` + `training_metadata.json` into `src/plugins/plugin-vince/models/`, commit, deploy. → [models/README.md](src/plugins/plugin-vince/models/README.md)

### Test Structure

```
src/
  __tests__/              # All tests live inside src
    *.test.ts             # Component tests (Bun)
    e2e/                  # E2E tests (ElizaOS runner)
      project-starter.e2e.ts
      README.md
  index.ts                # Export: tests: [ProjectStarterTestSuite]
```

---

## 🧪 Testing

| Type | Location | Runner |
|:---|:---|:---|
| **Component** | `src/__tests__/*.test.ts` | Bun native · fast · mocks |
| **E2E** | `src/__tests__/e2e/*.e2e.ts` | ElizaOS · real runtime · PGLite |

```bash
elizaos test              # All
elizaos test component    # Component only
elizaos test e2e          # E2E only
```

---

## ⚙ Configuration

| What | Where |
|:---|:---|
| VINCE character & agent | `src/agents/vince.ts` |
| Kelly character & agent | `src/agents/kelly.ts` — lifestyle-only concierge |
| Paper bot, ML, actions | `src/plugins/plugin-vince/` |
| Lifestyle-only (Kelly) | `src/plugins/plugin-kelly/` — daily briefing, no trading |
| Teammate context | `knowledge/teammate/` — USER.md, SOUL.md, TOOLS.md |
| Dynamic config | `dynamicConfig.ts` — tuned via `tuned-config.json` |

### Push schedule & Discord (core objective)

**VINCE = push, not chat.** Daily report (ALOHA + OPTIONS + PERPS + HIP-3), lifestyle, and news are pushed to Discord/Slack on a schedule. No need to "chat" with VINCE for the day report—he pings you.

| Push | Default (UTC) | Channel name must contain |
|:---|:---|:---|
| Daily report (VINCE) | 18:00 | `daily` (e.g. `#vince-daily-reports`) |
| Lifestyle (VINCE) | 08:00 | `lifestyle` (e.g. `#vince-lifestyle`) |
| **Lifestyle (Kelly)** | 08:00 | `kelly` or `lifestyle` (e.g. `#kelly`, `#lifestyle`) — concierge-only, no trading |
| News (MandoMinutes) | 16:00 | `news` (e.g. `#vince-news`) |

Set `VINCE_DAILY_REPORT_ENABLED`, `VINCE_LIFESTYLE_DAILY_ENABLED`, `VINCE_NEWS_DAILY_ENABLED` (default on) and `*_HOUR` in `.env`. For a single lifestyle channel, use Kelly's push and set `VINCE_LIFESTYLE_DAILY_ENABLED=false`. Kelly: `KELLY_LIFESTYLE_DAILY_ENABLED` (default on), `KELLY_LIFESTYLE_HOUR=8`. **Two bots in one server:** Use separate Discord apps for VINCE and Eliza (`VINCE_DISCORD_*` and `ELIZA_DISCORD_*`); no separate "enabled" flag. Optional `DELAY_SECOND_DISCORD_MS=3000` if the second bot fails to connect. → [DISCORD.md](docs/DISCORD.md) · [NOTIFICATIONS.md](docs/NOTIFICATIONS.md)

### Key Env Vars

| Variable | Purpose |
|:---|:---|
| `POSTGRES_URL` | Supabase/Postgres. Empty = PGLite |
| `SUPABASE_SERVICE_ROLE_KEY` | Feature-store dual-write, ML bucket |
| `SUPABASE_URL` | Optional if direct; required if pooler |
| `VINCE_DISCORD_APPLICATION_ID` / `VINCE_DISCORD_API_TOKEN` | VINCE's Discord bot (push to channels with "daily", "lifestyle", "news") |
| `VINCE_DAILY_REPORT_ENABLED` / `VINCE_DAILY_REPORT_HOUR` | Daily report push (default on, 18 UTC) |
| `VINCE_LIFESTYLE_DAILY_ENABLED` / `VINCE_LIFESTYLE_HOUR` | VINCE lifestyle push (default on, 8 UTC). Set to false if using Kelly for lifestyle channel. |
| `KELLY_LIFESTYLE_DAILY_ENABLED` / `KELLY_LIFESTYLE_HOUR` | Kelly concierge daily push (default on, 8 UTC); channels with "kelly" or "lifestyle" in name |
| `VINCE_NEWS_DAILY_ENABLED` / `VINCE_NEWS_HOUR` | News push (default on, 7 UTC) |
| `VINCE_PAPER_AGGRESSIVE` | `true` = higher leverage, $210 TP, 2:1 R:R |
| `VINCE_PAPER_ASSETS` | e.g. `BTC` or `BTC,ETH,SOL` |
| `VINCE_APPLY_IMPROVEMENT_WEIGHTS` | `true` = align weights with training metadata |
| `VINCE_BINANCE_BASE_URL` | Proxy for Binance in 451 regions |
| `VITE_OTAKU_MODE` | Wallet UI: `normies` = simple/Coinbase (balance, activity, add funds, buy & sell); unset = DeFi mode. Build-time only; see `.env.example`. |

---

## 📚 Documentation

| Doc | Purpose |
|:---|:---|
| [FEATURE-STORE.md](docs/FEATURE-STORE.md) | Paper bot feature storage, training |
| [SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) | Production persistence checklist |
| [DEPLOY.md](docs/DEPLOY.md) | Eliza Cloud, env, troubleshooting |
| [DISCORD.md](docs/DISCORD.md) | Channel structure (IKIGAI, LiveTheLifeTV, Slack) |
| [CLAUDE.md](CLAUDE.md) | ElizaOS dev guide |
| [TREASURY.md](docs/TREASURY.md) | Cost coverage, profitability |
| [LOCALSONLY.md](docs/LOCALSONLY.md) | Local inference cluster (EXO), cost and rationale |
| [docs/CLAUDE_CODE_CONTROLLER.md](docs/CLAUDE_CODE_CONTROLLER.md) | Code/repo tasks via Claude Code (optional) |
| [plugin-vince/README](src/plugins/plugin-vince/README.md) | WHAT · WHY · HOW · CLAUDE |
| [plugin-kelly/](src/plugins/plugin-kelly/) | Lifestyle-only concierge (daily briefing, no trading) |
| [plugin-personality](https://github.com/elizaos-plugins/plugin-personality/blob/next/README.md) | Kelly only: character evolution (experimental) |
| [SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md) | Aggregator sources, contribution rules |
| [IMPROVEMENT_WEIGHTS_AND_TUNING.md](src/plugins/plugin-vince/IMPROVEMENT_WEIGHTS_AND_TUNING.md) | Data-driven weights, holdout metrics |
| [ML_IMPROVEMENT_PROOF.md](src/plugins/plugin-vince/ML_IMPROVEMENT_PROOF.md) | How to prove ML improves the algo (validate_ml_improvement, tests) |
| [docs/WORTH_IT_PROOF.md](docs/WORTH_IT_PROOF.md) | Proof that 24/7 research, knowledge extension, and ONNX are worth it |
| [PARAMETER_IMPROVEMENT.md](src/plugins/plugin-vince/scripts/PARAMETER_IMPROVEMENT.md) | What the improvement report identifies (thresholds, TP/SL) |
| [DATA_LEVERAGE.md](src/plugins/plugin-vince/DATA_LEVERAGE.md) | Feature coverage |
| [ALGO_ML_IMPROVEMENTS.md](src/plugins/plugin-vince/ALGO_ML_IMPROVEMENTS.md) | ML roadmap |
| [models/README](src/plugins/plugin-vince/models/README.md) | Ship ONNX |
| [BINANCE_DATA_IMPROVEMENTS](src/plugins/plugin-vince/BINANCE_DATA_IMPROVEMENTS.md) | Binance endpoints, 451 proxy |
| [HYPERLIQUID_ENDPOINTS](src/plugins/plugin-vince/HYPERLIQUID_ENDPOINTS.md) | HL endpoints |
| [progress.txt](src/plugins/plugin-vince/progress.txt) | Tracker, backlog |
| [skills/x-research](skills/x-research/README.md) | X (Twitter) research · sentiment · Cursor skill + VINCE in-chat · `bun test skills/x-research/sentiment.test.ts` |
| [docs/X-API.md](docs/X-API.md) | X API tiers (Basic/Pro), quota usage, optional second token |
| [Frontend docs](src/frontend/docs/README.md) · [progress.txt](src/frontend/progress.txt) | Chat UI, Market Pulse, quick start, reference docs, status |

---

## ◇ Alternatives & related

### Honcho

We evaluated [Honcho](https://docs.honcho.dev) and **do not use it**.

| Honcho | VINCE / ElizaOS |
|:---|:---|
| Peers + Sessions | Entities, rooms, participants |
| Representations (reasoning over messages) | Evaluators (facts, reflection) + memory |
| Managed or self-hosted memory service | DB adapter (Postgres/PGLite) + Supabase feature store |

Eliza gives us memories, embeddings, evaluators, entities. The paper bot uses the **feature store** (Supabase); that's the right place for trading state. Adding Honcho would duplicate what we have without filling a clear gap.

**When Honcho could make sense:** (1) Formal reasoning over conversations beyond evaluators, (2) managed memory for a new product, (3) prototyping a separate agent from scratch. → [Honcho agent skills](https://docs.honcho.dev/v3/documentation/introduction/vibecoding#agent-skills)

### OpenClaw, Pi, and Eliza + Pi patterns

**OpenClaw** is not an agent framework—it's a wrapper around another agent called **Pi** (a coding agent). It started as a relay for agents before becoming Clawd. The killer combo: Pi + Claude Skills. Most of the rest is adapters.

**Our first use case for OpenClaw** has been to fork this repo ([eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince)) and improve what we've built—420+ commits and counting. When we called it **ClawdBot** (later **MoltBot**), we meant the local Mac Mini–resident piece that bridges ElizaOS and analog reality (smart home, biometrics, playlists); OpenClaw is the product that evolved from that vision. Full story: [OpenClaw vision and lore](docs/OPENCLAW_VISION.md).

| OpenClaw / Pi | ElizaOS |
|:---|:---|
| Memory, connectors (APIs, chats), personality | Very similar—different packaging |
| Pi: CLI everything | MCP + plugin tool-calling |

**The big difference:** ElizaOS is heavy on **MCP and tool calling from plugins**. Pi leans into "CLI everything"—simpler, less ceremony. Both are valid.

**OpenClaw Integration →** We now support hybrid mode: VINCE (ElizaOS) for conversation/coordination + OpenClaw sub-agents for parallel deep-dive research. See [`openclaw-agents/`](openclaw-agents/README.md) for:
- Alpha research agent (X sentiment, KOL tracking)
- Market data agent (prices, volume, OI)
- On-chain agent (whale flows, smart money)
- Orchestrator that spawns agents in parallel

If you're looking for more coding-agent simplicity, the target is **Eliza + Pi patterns**, not Eliza with OpenClaw. The ElizaOS maintainers are working on an Eliza code orchestrator in that direction. OpenClaw-on-ElizaOS (swapping Pi for Eliza) exists and may be published—no huge advantages or disadvantages either way.

---

## ⚠ Troubleshooting

### Database migration failed

If you see:

```
Failed query: CREATE SCHEMA IF NOT EXISTS migrations
```

**Verify first:** `bun run db:check` — if it succeeds, migrations are fine; if it fails, it prints the real error (e.g. SSL, wrong port).  
**Fix:** `POSTGRES_URL` to **direct** connection (port 5432, not 6543). Add `?sslmode=verify-full`. With Supabase: use the **direct** connection string from Dashboard → Settings → Database (port 5432), not the pooler (6543). Then `bun start` (runs bootstrap).  
**Local-only:** Leave `POSTGRES_URL` empty → PGLite.  
**SSL error:** `POSTGRES_SSL_REJECT_UNAUTHORIZED=false` (opt-in).

→ [DEPLOY.md](docs/DEPLOY.md)

### Discord "Cannot access audit logs"

If the bot logs `Cannot access audit logs - permission change alerts will not include executor info (error=Missing Permissions)`, grant the bot **View Audit Log** in your Discord server (Server Settings → Integrations → [bot]). See [DEPLOY.md § Discord: audit log warning](docs/DEPLOY.md#discord-audit-log-warning).

### Known Limitations

| | Limitation | Notes |
|:---:|---|:---|
| 🔑 | XAI/Grok | API key required |
| 📊 | Nansen | 100 credits/month |
| 📈 | Sanbase | 1K calls/month |
| 🌐 | Binance 451 | Use `VINCE_BINANCE_BASE_URL` proxy |
| 🤖 | ONNX | Active when `.onnx` present; run `train_models.py` |
| 🛡️ | Circuit breakers | Not validated with live trading |

---

<div align="center">

## ═══════════════════════════════════════
## 📋 QUICK REFERENCE
## ═══════════════════════════════════════

| | | |
|:---|:---|:---|
| **Run** | `elizaos dev` | `bun start` |
| **Deploy** | `bun run deploy:cloud` | |
| **Backfill** | `bun run sync:supabase` | |
| **DB** | `bun run db:check` | `bun run db:bootstrap` |
| **Feature store** | `vince_paper_bot_features` | `plugin_vince.paper_bot_features` |
| **ML bucket** | `vince-ml-models` | |
| **Postgres** | port 5432 (direct) | |
| **Train** | `bun run train-models` or `train_models.py --data .elizadb/.../features --output .../models` | Holdout metrics in report |
| **Weights** | `VINCE_APPLY_IMPROVEMENT_WEIGHTS=true bun run .../run-improvement-weights.ts` | Logs holdout_metrics |

---

*Built with [ElizaOS](https://github.com/elizaos/eliza) · [summarize](https://github.com/IkigaiLabsETH/summarize)*

</div>
