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

## What's New in v3.3

**102 tests pass, 0 fail. Build clean. Type check clean.**

| Change | Detail |
| :--- | :--- |
| **Day Report = Report of the Day** | Kelly's daily standup is now an 800-1200 word narrative (trading desk letter, cross-agent data, opinionated take) followed by a Daily TODO table (5-7 items with @Owner). |
| **Team priorities baked in** | 11 strategic priorities wired into every standup so TODO items always move the needle. |
| **Duplicate WTT trade fix** | Paper bot no longer opens the same What's-the-Trade pick twice; pick file renamed to `.traded.json` after opening. |
| **TypeScript declarations fixed** | Clean build output; module declarations for `@elizaos/plugin-x402`, `elizaos-plugins.d.ts` in build config. |
| **Single Oracle for Polymarket** | Oracle runs all three desk workers (analyst, risk, perf). Polymarket Risk and Performance agents removed. |
| **Quick actions + About** | Agent-specific quick actions and About modals refined for all 10 agents. |

Previous: [v3.2](docs/RELEASE_v3.2.md) · [v3.1](docs/RELEASE_v3.1.md) · [v2.8](docs/RELEASE_v2.8.md) · [v2.7](docs/RELEASE_v2.7.md) · [v2.5](docs/RELEASE_v2.5.0.md) · [Changelog](CHANGELOG.md)

---

## The Team

Clear lanes, no overlap: data, plan, call, lifestyle, infra.

| Agent | Lane |
| :--- | :--- |
| **Eliza** | Knowledge, research, brainstorm, Substack content. The base everything builds on. |
| **VINCE** | Objective data: options, perps, memes, news, paper bot, 13+ sources. Push, not pull. |
| **ECHO** | CT sentiment, X research, social alpha, contrarian flags. Your ears on X. |
| **Oracle** | Prediction markets: Polymarket discovery, odds, portfolio (read-only). |
| **Solus** | Plan and call. Weekly BTC options on Hypersurface, strike/direction/invalidation. |
| **Otaku** | **Only agent with a wallet.** Morpho, CDP, Bankr, Biconomy, Clanker, DefiLlama. Web4 path. |
| **Kelly** | Touch grass: hotels, fine dining, wine, health, fitness. Standup facilitator. No trading. |
| **Sentinel** | Ops, cost steward, ONNX, ART, PRDs, OpenClaw guide, repo improvements. |
| **Naval** | Philosophy, mental models, standup conclusions. One thesis, one signal, one team one dream. |
| **Clawterm** | AI agents terminal: OpenClaw skills, Milaidy, ElizaOS, setup tips, trending. |

One conversation, ask any teammate by name; standups 2x/day. [MULTI_AGENT.md](docs/MULTI_AGENT.md)

---

### Polymarket: paper trading that proves the edge

When spot moves, prediction markets often lag. Oracle runs a **latency arb engine**: Binance spot and Polymarket CLOB in real time, implied probability from the option-like payoff of binary contracts, edge above a threshold, Kelly-sized paper trades. No execution by default—only logs and learns. The goal is to show that the edge is real before a single dollar is at risk. You see whether it’s running or paused on the leaderboard Polymarket tab; chat with Oracle for status, pause, or resume. Small edges, captured in code, 24/7.

---

## TL;DR

VINCE pushes daily intel (options, perps, memes, DeFi) to Discord/Slack. One command, **ALOHA**, gives you vibe check + PERPS + OPTIONS + "trade today?". Under the hood: a **self-improving paper trading bot** (ML loop, feature store, ONNX) that trains in prod and stores models in Supabase. Kelly is the lifestyle concierge (travel, wine, dining, health, fitness); she never gives trading advice.

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
- **Self-improving paper bot** — Signals, trades, feature store, Python train, ONNX deploy. Four models: signal quality, position sizing, TP optimizer, SL optimizer. Rules keep the bot running when models are missing.
- **Multi-agent** — Ask any teammate by name; standups 2x/day; one thread, full team.
- **Leaderboard** — Single dashboard: Markets, Memetics, News, Digital Art, Trading Bot, Knowledge. No chat required. [LEADERBOARD.md](docs/LEADERBOARD.md)
- **Kelly** — Lifestyle concierge only; daily briefing to channels with "kelly" or "lifestyle". Optional self-modification. [KELLY.md](docs/KELLY.md)
- **Knowledge ingestion** — VINCE_UPLOAD, ingest-urls; summarize into knowledge/
- **X research** — Paper algo signal + Cursor skill + VINCE_X_RESEARCH in-chat. [X-RESEARCH.md](docs/X-RESEARCH.md)

---

## Paper Bot & ML

Signals flow into trades, trades flow into the feature store, the feature store feeds Python training, and ONNX models deploy back to the bot. Four models: signal quality, position sizing, TP optimizer, SL optimizer. When models are missing, rules keep it running.

**VinceBench** scores every closed trade on process quality (signal, risk, timing, regime). The score trains the signal-quality model to learn more from high-quality decisions.

**Re-run training:**

```bash
python3 src/plugins/plugin-vince/scripts/train_models.py \
  --data .elizadb/vince-paper-bot/features \
  --output .elizadb/vince-paper-bot/models \
  --min-samples 90 \
  --bench-score-weight
```

Or: `bun run train-models -- --bench-score-weight`. Restart the agent after training.

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
| `bun run train-models` | Train ML models |
| `bun run type-check` | TypeScript check (no emit) |
| `bun run check-all` | type-check + format + tests |

---

## Docs

| Doc | What |
| :--- | :--- |
| [CLAUDE.md](CLAUDE.md) | Dev guide (character, plugins, tests) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, priorities, what we merge |
| [FEATURE-STORE.md](docs/FEATURE-STORE.md) | ML, paper bot, feature store |
| [PAPER-BOT-AND-ML.md](docs/PAPER-BOT-AND-ML.md) | Signal loop, MandoMinutes, train |
| [ONNX.md](docs/ONNX.md) | Train, export, deploy |
| [MULTI_AGENT.md](docs/MULTI_AGENT.md) | ASK_AGENT, standups, Discord |
| [OTAKU.md](docs/OTAKU.md) | Executor agent, DeFi |
| [DEPLOY.md](docs/DEPLOY.md) | Eliza Cloud, env, troubleshooting |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Push schedule, Discord, env vars |
| [SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) | Production persistence |
| [BRANDING.md](docs/BRANDING.md) | Voice, positioning, LIVETHELIFETV |
| [plugin-vince](src/plugins/plugin-vince/) | WHAT, WHY, HOW, README |
| [plugin-kelly](src/plugins/plugin-kelly/) | Lifestyle concierge |
| [OPENCLAW.md](OPENCLAW.md) | OpenClaw agents, vault, skills, tasks |

---

<div align="center">

_Built with [ElizaOS](https://github.com/elizaos/eliza). No hype. No permission. No exit._

</div>
