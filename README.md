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

**Unified data intelligence** for options · perps · memes · DeFi · lifestyle · NFT floors — with a **self-improving paper trading bot** at the core. Battle-tested signal from the trenches; no hype, no shilling, no timing the market.

---

<p>
  <strong>ALOHA</strong> → vibe check · <strong>PERPS</strong> → signals · <strong>OPTIONS</strong> → posture · <strong>PAPER BOT</strong> → ML loop
</p>

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  elizaos dev     │  bun run deploy:cloud     │  bun run sync:supabase             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

</div>

---

## What's New in V3.0 — Renaissance Fund 3.0

Every trade expressible onchain. The daily **What's the Trade** thesis now constrains picks to Hyperliquid perps (4 core + 34 HIP-3 assets). The full WTT → Paper Bot → Feature Store → ML loop is live.

| Focus | Summary |
|:---|:---|
| **HIP-3 only picks** | Thesis, narrative, and extraction prompts enforce onchain-only tickers. Hard gate rejects non-HIP-3 primary picks (falls back to alt). `ECHO_WTT_HIP3_ONLY=true` (default). |
| **WTT → Paper Bot** | Daily thesis generates a structured JSON pick; paper bot auto-evaluates, opens trades with WTT rubric metadata (alignment, edge, payoff, timing). |
| **Feature store + ML** | WTT rubric ordinals stored per trade. `invalidateHit` computed on close. `wtt_*` columns in ML training; improvement report includes `wtt_performance` when 5+ WTT trades. |
| **Robinhood as context** | Offchain stock data stays (gated by `ECHO_WTT_ROBINHOOD_ENABLED=true`) but labeled "context only" — LLM sees IREN is hot, expresses the thesis via SEMIS or AMD. |
| **Hyperliquid adapter** | Expanded from 3 tickers to full 38-asset universe (live funding, OI, volume for all HIP-3 + core). |
| **Env vars** | `ECHO_WTT_HIP3_ONLY`, `ECHO_WTT_ROBINHOOD_ENABLED`, `VINCE_PAPER_WTT_ENABLED`. |

**Previous releases:** [v2.8](docs/RELEASE_v2.8.md) · [v2.7](docs/RELEASE_v2.7.md) · [v2.5.0](docs/RELEASE_v2.5.0.md) · [Changelog](CHANGELOG.md)

---

## One team, one dream

Clear lanes, no overlap: data → plan → call → lifestyle → infra.

| Agent | Lane |
|:---|:---|
| **Eliza** | Knowledge, research, brainstorm — the base everything builds on. |
| **VINCE** | Objective data: options, perps, memes, news, paper bot. Push, not pull. |
| **ECHO** | CT sentiment, X research, social alpha. Your ears on X. |
| **Oracle** | Prediction markets: Polymarket (read-only). Priority markets; handoffs to VINCE and Solus. |
| **Solus** | Plan and call. Size/skip/watch, invalidation, rebalance. Execution architect for the $100K stack. |
| **Otaku** | **Only agent with a funded wallet.** DeFi: Morpho, yield, CDP; mints NFTs when Sentinel creates gen art. |
| **Kelly** | Touch grass: hotels, fine dining, wine, health, fitness. No trading. |
| **Sentinel** | Ops, cost steward, ONNX, ART, clawdbot, task briefs for Claude. |

→ [MULTI_AGENT.md](docs/MULTI_AGENT.md) — One conversation, ask any teammate by name; standups 2×/day; policy and Discord.

---

## TL;DR

**VINCE** pushes daily intel (options, perps, memes, DeFi) to Discord/Slack. One command, **ALOHA**, gives you vibe check + PERPS + OPTIONS + "trade today?". Under the hood: a **self-improving paper trading bot** (ML loop, feature store, ONNX) that trains in prod and stores models in Supabase — no redeploy to improve. **Kelly** is the lifestyle concierge (travel, wine, dining, health, fitness); she never gives trading advice. **Run:** `elizaos dev` · **Deploy:** `bun run deploy:cloud` · **Backfill:** `bun run sync:supabase`.

---

## Quick Links

| | |
|:---|:---|
| [FEATURE-STORE](docs/FEATURE-STORE.md) | ML & paper bot · feature store |
| [PAPER-BOT-AND-ML](docs/PAPER-BOT-AND-ML.md) | Heart of VINCE · signals → trades → learning · MandoMinutes · train_models |
| [ONNX](docs/ONNX.md) | Train → export → deploy · recent train_models.py improvements |
| [MULTI_AGENT](docs/MULTI_AGENT.md) | ASK_AGENT · standups |
| [Release v2.8](docs/RELEASE_v2.8.md) | OpenClaw orientation · standup reorg · docs cleanup |
| [OTAKU](docs/OTAKU.md) | The executor agent · dev section |
| [SUPABASE_MIGRATION](docs/SUPABASE_MIGRATION.md) | Production persistence |
| [DEPLOY](docs/DEPLOY.md) | Eliza Cloud · env · troubleshooting |
| [CLAUDE](CLAUDE.md) | Dev guide (character, plugins, tests) |
| [plugin-vince](src/plugins/plugin-vince/) | README · WHAT · WHY · HOW |
| [plugin-kelly](src/plugins/plugin-kelly/) | Lifestyle concierge |
| [BRANDING](docs/BRANDING.md) | Voice · positioning · LIVETHELIFETV |

**For OpenClaw:** Working on this repo or the fork? See [OPENCLAW.md](OPENCLAW.md) for **openclaw-agents/**, **vault/**, **skills/**, **tasks/**.

---

## North Star

You never have to "chat" with VINCE — he pings you. Proactive agent: day report (ALOHA), trades and reasoning, close results and PnL. Chat remains for deep dives. Stay in the game without 12+ hours on screens.

→ [Vision & gap](knowledge/internal-docs/vince-north-star.md)

---

## The Dawn of Renaissance Fund 3.0

**TL;DR: Why the OG Renaissance Medallion Fund is legendary.** Jim Simons’ Medallion Fund (1988–present) is widely considered the greatest money-making machine in history: ~66% gross / ~39% net annual returns for over three decades—$1 in 1988 → tens of millions net of fees, almost no down years, massive profits even in 2008. It did this with a pure-quant approach: mathematicians, physicists, and computer scientists (not Wall Street traders) building statistical models that detected hidden patterns and executed high-frequency trades with ruthless precision. Unprecedented consistent alpha + extreme secrecy (closed to outsiders since the 1990s) created a mythic status that still defines the pinnacle of quantitative investing.

Renaissance Fund has always been about one thing: **translating raw conviction into asymmetric edge.**

- **1.0** — Pure human discretion: gut feel, late nights, manual structuring of trades from scattered insights.
- **2.0** — Systematic screening and human-guided routing; scaled the process but still bottlenecked by human bandwidth.
- **3.0** — The AI-native layer we have been building toward: an **autonomous belief-router** that takes any qualitative market narrative—tweets, transcripts, cultural observations, earnings calls—and systematically extracts the directional thesis, detects the deeper claim, sweeps instruments across traditional and crypto markets, and outputs the single highest-upside expression in a precise, scannable format: P&L card, invalidate conditions, and cleaner alternatives.

**How it works** is now mechanical. The system validates the thesis, reframes implied beliefs, researches autonomously (grounding claims in data, checking priced-in status, catalyst timing), then scores candidates on a structured rubric: thesis alignment, payoff asymmetry, edge (how undiscovered the angle is), and timing forgiveness. It enforces hard gates—no diluted indexes, no surface-level trades when a deeper one exists—and always cross-checks across instrument classes (options, perps, prediction markets, equities). The output is ruthless: one primary expression, one alt, clear risk framing, and the exact conviction breakeven.

**Why we are shipping it now.** The market has already voted. Sophisticated participants are organically converging on this archetype because it solves the core pain: most market commentary is noise, most trade ideas are obvious or symmetric, and almost nothing gives you the single highest-edge way to express a belief with clear downside and invalidate logic. The standard we set internally—turning qualitative narratives into precise, high-edge trade expressions—is already recognized as elite alpha delivery.

---

## Current Focus

- **ALOHA** — Primary action. One command: vibe check + PERPS + OPTIONS + "should we trade today?"
- **Paper bot & ML** — More signal coverage, cleaner features, better ONNX. Supabase Postgres, retrain + improvement weights, getVibeCheck → paper bot, NASDAQ 24h + macro. Avoided decisions now stored for ML.

*ALOHA in, better ML out.*

---

## Paper bot & ML (the loop)

Signals → trades → feature store → Python train → ONNX deploy. Four models: signal quality, position sizing, TP optimizer, SL optimizer. When they’re missing, rules keep the bot running.

**Recent pipeline:** Optuna tuning, walk-forward validation, SHAP explainability, lag features, Platt calibration, feature manifests, ONNX hashing, parallel training; retrain when win rate &lt; 45%. No train/serve skew; no holdout leakage.

Full loop, MandoMinutes, and improvements we claim → [PAPER-BOT-AND-ML.md](docs/PAPER-BOT-AND-ML.md). Pipeline and ONNX details → [ONNX.md](docs/ONNX.md). Feature store and Supabase → [FEATURE-STORE.md](docs/FEATURE-STORE.md).

---

## X research & sentiment

X (Twitter) sentiment feeds the **paper algo** (signal source), a **Cursor skill** (CLI: search, watchlist, save to file), and **VINCE in-chat** (single-shot "what are people saying about X?"). Same X API Bearer token; read-only. → [X-RESEARCH.md](docs/X-RESEARCH.md) · [X-API.md](docs/X-API.md)

---

## Features

- **Multi-agent** — Ask any teammate by name; standups 2×/day; one thread, full team. → [MULTI_AGENT.md](docs/MULTI_AGENT.md)
- **ALOHA** — One command → vibe check + PERPS + OPTIONS + "trade today?"
- **Self-improving paper bot** — ML loop; every trade stored and learnt from; ONNX in prod.
- **Leaderboard** — One dashboard (Markets, Memetics, News, Digital Art, More, Trading Bot, Knowledge). No chat required. → [LEADERBOARD.md](docs/LEADERBOARD.md)
- **Kelly** — Lifestyle concierge only; daily briefing to channels with "kelly" or "lifestyle". Optional self-modification → [KELLY.md](docs/KELLY.md)
- **Knowledge ingestion** — VINCE_UPLOAD, ingest-urls; summarize → knowledge/
- **X research** — Paper algo signal + Cursor skill + VINCE_X_RESEARCH in-chat

---

## Getting Started

```bash
bun install
bun run build
cp .env.example .env   # add API keys

elizaos dev            # hot-reload
# or
bun start              # production (Postgres when POSTGRES_URL set)
```

**Web UI:** `bun start` → API on 3000, frontend on **5173**. Open http://localhost:5173 for chat and dashboard.

---

## Scripts

| Script | Purpose |
|:---|:---|
| `elizaos dev` | Hot-reload development |
| `bun start` | Production start (migration bootstrap when POSTGRES_URL set) |
| `bun run deploy:cloud` | Deploy to Eliza Cloud |
| `bun run sync:supabase` | Backfill features to Supabase |
| `bun run db:check` | Verify DB migrations |
| `bun run train-models` | Train ML models (see [plugin-vince/scripts](src/plugins/plugin-vince/scripts/README.md)) |

---

## Production · Config · Docs

- **Production:** Supabase Postgres + optional ML bucket. Data persists across redeploys. → [SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) · [DEPLOY.md](docs/DEPLOY.md)
- **Configuration:** Push schedule, Discord, env vars → [CONFIGURATION.md](docs/CONFIGURATION.md)
- **Troubleshooting:** DB migration, Discord audit log, known limits → [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Documentation:** [FEATURE-STORE](docs/FEATURE-STORE.md) · [DISCORD](docs/DISCORD.md) · [TREASURY](docs/TREASURY.md) · [LOCALSONLY](docs/LOCALSONLY.md) · [ALTERNATIVES](docs/ALTERNATIVES.md) (Honcho, OpenClaw) · [plugin-vince README](src/plugins/plugin-vince/README.md) · [skills/x-research](skills/x-research/README.md)

---

## Quick Reference

| | | |
|:---|:---|:---|
| **Run** | `elizaos dev` | `bun start` |
| **Deploy** | `bun run deploy:cloud` | |
| **Backfill** | `bun run sync:supabase` | |
| **DB** | `bun run db:check` | `bun run db:bootstrap` |
| **Feature store** | `vince_paper_bot_features` | `plugin_vince.paper_bot_features` |
| **ML bucket** | `vince-ml-models` | |
| **Train** | `bun run train-models` | Holdout metrics in report |

---

<div align="center">

*Built with [ElizaOS](https://github.com/elizaos/eliza). No hype. No permission. No exit.*

</div>
