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

## What's New in V3.3

**102 tests pass, 0 fail. Build clean. Type check clean.** The daily standup is now the team's single report of the day.

| Focus                                | Summary                                                                                                                                                                                                                                                                                  |
| :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day Report = Report of the Day**   | Kelly's daily standup output is now an 800-1200 word flowing narrative (same style as VINCE's Report of the Day: trading desk letter, cross-agent data, opinionated take) followed by a **Daily TODO** table (5-7 actionable items with @Owner). Parsed automatically by the Ralph loop. |
| **Team Priorities in every standup** | The Day Report prompt includes 11 strategic priorities (BTC macro, Solus options, paper bot, Otaku web4 wallet, Sentinel repo, Eliza content, Clawterm AI agents, Oracle Polymarket, ECHO X alpha, Kelly+Naval live the life, VINCE data sources) so TODO items always move the needle.  |
| **Duplicate WTT trade fix**          | Paper bot was opening the same What's-the-Trade pick twice when two eval cycles fired before the position registered. Fix: pick file is renamed to `.traded.json` after opening.                                                                                                         |
| **TypeScript declarations fixed**    | Build now emits clean declarations (was "Failed to generate TypeScript declarations"). Added module declarations for `@elizaos/plugin-x402`, included `elizaos-plugins.d.ts` in build config, excluded standalone scripts, fixed XDK type casts.                                         |
| **Pre-existing test fixes**          | `buildShortStandupKickoff` test updated for Naval quote format; Otaku template test updated for wallet-setup focus.                                                                                                                                                                      |
| **Single Oracle for Polymarket**     | Oracle runs all three desk workers (analyst, risk, perf). Polymarket Risk and Performance agents removed.                                                                                                                                                                                |
| **Quick actions + About**            | Agent-specific quick actions and About modals refined for all 10 agents.                                                                                                                                                                                                                 |

### System status (from startup logs)

**Healthy:** 10 agents running, all connected to Discord, 13+ data sources live (CoinGlass, CoinGecko, Deribit, Binance, Hyperliquid, Santiment, MandoMinutes, DefiLlama, Meteora, DexScreener, Nansen, Polymarket, X). Paper bot active with 20 trades, 22 historical contexts, Bayesian tuner with 8 observations. ML signal quality calibrated (74 features, threshold 0.5). Top signal features: RSI lag2 (8.47%), priceChange24h (6.08%), DVOL (5.73%). Source importance: MarketRegime 40.3%, NewsSentiment 36.6%, BinanceFundingExtreme 23.1%.

**Next up:** Otaku wallet keys (CDP/Bankr/Morpho plugins loaded, just needs `EVM_PRIVATE_KEY`), ONNX rebuild (`bun rebuild onnxruntime-node`), CoinGlass/Liquidation/TopTraders at 0% ML importance (data is live but not yet contributing to signal quality).

**Previous releases:** [v3.0](docs/RELEASE_v3.0.md) · [v2.8](docs/RELEASE_v2.8.md) · [v2.7](docs/RELEASE_v2.7.md) · [v2.5.0](docs/RELEASE_v2.5.0.md) · [Changelog](CHANGELOG.md)

---

## One team, one dream

Clear lanes, no overlap: data → plan → call → lifestyle → infra.

| Agent        | Lane                                                                                                      |
| :----------- | :-------------------------------------------------------------------------------------------------------- |
| **Eliza**    | Knowledge, research, brainstorm, Substack content — the base everything builds on.                        |
| **VINCE**    | Objective data: options, perps, memes, news, paper bot, 13+ data sources. Push, not pull.                 |
| **ECHO**     | CT sentiment, X research, social alpha, contrarian flags. Your ears on X.                                 |
| **Oracle**   | Prediction markets: Polymarket discovery, odds, portfolio (read-only). Single agent for all desk workers. |
| **Solus**    | Plan and call. Weekly BTC options on Hypersurface, strike/direction/invalidation.                         |
| **Otaku**    | **Only agent with a wallet.** DeFi: Morpho, CDP, Bankr, Biconomy, Clanker, DefiLlama. Web4 path.          |
| **Kelly**    | Touch grass: hotels, fine dining, wine, health, fitness. Standup facilitator. No trading.                 |
| **Sentinel** | Ops, cost steward, ONNX, ART, PRDs, OpenClaw guide, repo improvements.                                    |
| **Naval**    | Philosophy, mental models, standup conclusions. One thesis, one signal, one team one dream.               |
| **Clawterm** | AI agents terminal: OpenClaw skills, Milaidy, ElizaOS, setup tips, trending.                              |

→ [MULTI_AGENT.md](docs/MULTI_AGENT.md) — One conversation, ask any teammate by name; standups 2×/day; policy and Discord.

---

## TL;DR

**VINCE** pushes daily intel (options, perps, memes, DeFi) to Discord/Slack. One command, **ALOHA**, gives you vibe check + PERPS + OPTIONS + "trade today?". Under the hood: a **self-improving paper trading bot** (ML loop, feature store, ONNX) that trains in prod and stores models in Supabase — no redeploy to improve. **Kelly** is the lifestyle concierge (travel, wine, dining, health, fitness); she never gives trading advice. **Run:** `elizaos dev` · **Deploy:** `bun run deploy:cloud` · **Backfill:** `bun run sync:supabase`.

---

## Quick Links

|                                                  |                                                                            |
| :----------------------------------------------- | :------------------------------------------------------------------------- |
| [FEATURE-STORE](docs/FEATURE-STORE.md)           | ML & paper bot · feature store                                             |
| [PAPER-BOT-AND-ML](docs/PAPER-BOT-AND-ML.md)     | Heart of VINCE · signals → trades → learning · MandoMinutes · train_models |
| [ONNX](docs/ONNX.md)                             | Train → export → deploy · recent train_models.py improvements              |
| [MULTI_AGENT](docs/MULTI_AGENT.md)               | ASK_AGENT · standups                                                       |
| [Release v2.8](docs/RELEASE_v2.8.md)             | OpenClaw orientation · standup reorg · docs cleanup                        |
| [OTAKU](docs/OTAKU.md)                           | The executor agent · dev section                                           |
| [SUPABASE_MIGRATION](docs/SUPABASE_MIGRATION.md) | Production persistence                                                     |
| [DEPLOY](docs/DEPLOY.md)                         | Eliza Cloud · env · troubleshooting                                        |
| [CLAUDE](CLAUDE.md)                              | Dev guide (character, plugins, tests)                                      |
| [plugin-vince](src/plugins/plugin-vince/)        | README · WHAT · WHY · HOW                                                  |
| [plugin-kelly](src/plugins/plugin-kelly/)        | Lifestyle concierge                                                        |
| [BRANDING](docs/BRANDING.md)                     | Voice · positioning · LIVETHELIFETV                                        |

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

_ALOHA in, better ML out._

---

## Paper bot & ML (the loop)

Signals → trades → feature store → Python train → ONNX deploy. Four models: signal quality, position sizing, TP optimizer, SL optimizer. When they’re missing, rules keep the bot running.

**Recent pipeline:** Optuna tuning, walk-forward validation, SHAP explainability, lag features, Platt calibration, feature manifests, ONNX hashing, parallel training; retrain when win rate &lt; 45%. No train/serve skew; no holdout leakage.

**VinceBench helps ML automatically.** Every closed trade gets a per-decision _bench score_ (process quality: signal, risk, timing, regime). That score is stored on the feature record (`labels.benchScore`) and used at training time: with `--bench-score-weight`, the signal-quality model learns more from high-quality decisions; optional `--min-bench-score` or `--bench-score-quantile` trains only on strong-process trades. New trades get the score when they close; historical JSONL can be backfilled with `bun run src/plugins/plugin-vince/scripts/backfill-bench-scores.ts --input .elizadb/vince-paper-bot/features`. Details → [FEATURE-STORE.md § VinceBench and ML](docs/FEATURE-STORE.md#vincebench-and-ml).

**Re-run training** (from repo root; writes ONNX into the agent models dir so no copy step):

```bash
python3 src/plugins/plugin-vince/scripts/train_models.py \
  --data .elizadb/vince-paper-bot/features \
  --output .elizadb/vince-paper-bot/models \
  --min-samples 90 \
  --bench-score-weight
```

Or: `bun run train-models -- --bench-score-weight`. Restart the agent after training to load the new ONNX. If you use a different `--output`, copy the generated `.onnx` (and `*_features.json`) into `.elizadb/vince-paper-bot/models/` before restarting.

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

| Script                  | Purpose                                                                                  |
| :---------------------- | :--------------------------------------------------------------------------------------- |
| `elizaos dev`           | Hot-reload development                                                                   |
| `bun start`             | Production start (migration bootstrap when POSTGRES_URL set)                             |
| `bun run deploy:cloud`  | Deploy to Eliza Cloud                                                                    |
| `bun run sync:supabase` | Backfill features to Supabase                                                            |
| `bun run db:check`      | Verify DB migrations                                                                     |
| `bun run train-models`  | Train ML models (see [plugin-vince/scripts](src/plugins/plugin-vince/scripts/README.md)) |
| `bun run type-check`    | TypeScript check (no emit). Run before PRs.                                              |
| `bun run check-all`     | type-check + format check + tests                                                        |

---

## Production · Config · Docs

- **Production:** Supabase Postgres + optional ML bucket. Data persists across redeploys. → [SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) · [DEPLOY.md](docs/DEPLOY.md)
- **Configuration:** Push schedule, Discord, env vars → [CONFIGURATION.md](docs/CONFIGURATION.md)
- **Troubleshooting:** DB migration, Discord audit log, known limits → [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Documentation:** [FEATURE-STORE](docs/FEATURE-STORE.md) · [DISCORD](docs/DISCORD.md) · [TREASURY](docs/TREASURY.md) · [LOCALSONLY](docs/LOCALSONLY.md) · [ALTERNATIVES](docs/ALTERNATIVES.md) (Honcho, OpenClaw) · [plugin-vince README](src/plugins/plugin-vince/README.md) · [skills/x-research](skills/x-research/README.md)

---

## Quick Reference

|                   |                            |                                   |
| :---------------- | :------------------------- | :-------------------------------- |
| **Run**           | `elizaos dev`              | `bun start`                       |
| **Deploy**        | `bun run deploy:cloud`     |                                   |
| **Backfill**      | `bun run sync:supabase`    |                                   |
| **DB**            | `bun run db:check`         | `bun run db:bootstrap`            |
| **Feature store** | `vince_paper_bot_features` | `plugin_vince.paper_bot_features` |
| **ML bucket**     | `vince-ml-models`          |                                   |
| **Train**         | `bun run train-models`     | Holdout metrics in report         |

---

<div align="center">

_Built with [ElizaOS](https://github.com/elizaos/eliza). No hype. No permission. No exit._

</div>
