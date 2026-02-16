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

## What's New in v2.7

**Otaku** is the only agent with a funded wallet and onchain execution. This release doubles down on that story: docs, grant application, and a clear path to testnet MVP.

| Focus | Summary |
|:---|:---|
| **Otaku** | 13 actions (swap, DCA, bridge, Morpho, stop-loss, NFT mint, execute Vince signal, etc.). Free API: health, config, alerts, notifications. Paid (x402): positions, quote, yields, history, portfolio. Degen vs Normies mode; DB-backed completion events and socket-driven UI. |
| **Docs** | [OTAKU.md](docs/OTAKU.md) updated with a **For Developers** section. [Base Builder Grant](docs/grants/BASE-BUILDER-GRANT-APPLICATION.md) rewritten with Otaku as the core agent for VC/grant attention. |
| **Next** | Grinding on **Kelly** (lifestyle agent as good as it gets) and **Sentinel**'s **gen art** passion project (QQL derivative). |

**Previous releases:** [v2.5.0](docs/RELEASE_v2.5.0.md) · [Changelog](CHANGELOG.md)

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
| [Release v2.7](docs/RELEASE_v2.7.md) | Otaku star · Kelly & Sentinel grind |
| [OTAKU](docs/OTAKU.md) | The executor agent · dev section |
| [SUPABASE_MIGRATION](docs/SUPABASE_MIGRATION.md) | Production persistence |
| [DEPLOY](docs/DEPLOY.md) | Eliza Cloud · env · troubleshooting |
| [CLAUDE](CLAUDE.md) | Dev guide (character, plugins, tests) |
| [plugin-vince](src/plugins/plugin-vince/) | README · WHAT · WHY · HOW |
| [plugin-kelly](src/plugins/plugin-kelly/) | Lifestyle concierge |
| [BRANDING](docs/BRANDING.md) | Voice · positioning · LIVETHELIFETV |

---

## North Star

You never have to "chat" with VINCE — he pings you. Proactive agent: day report (ALOHA), trades and reasoning, close results and PnL. Chat remains for deep dives. Stay in the game without 12+ hours on screens.

→ [Vision & gap](knowledge/internal-docs/vince-north-star.md)

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
