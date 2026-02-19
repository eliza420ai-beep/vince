# ElizaOS Agent Project Development Guide for Claude

> **Optimized for Claude LLM** — Complete reference for building ElizaOS agent projects and the VINCE multi-agent system.

---

## 🎯 This repo: VINCE

This repository is the **VINCE** project: a unified data-intelligence **multi-agent system** (options, perps, memes, lifestyle, art) with a **self-improving paper trading bot** at the core. One team, one dream: users can chat with **Kelly** (or any agent); she orchestrates Vince, Solus, Eliza, Otaku, Sentinel, Oracle, ECHO via **ASK_AGENT**.

### Agent map (Dream Team)

| Agent        | Role | Where                    | One-line                                                                                                            |
| ------------ | ---- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Eliza**    | CEO  | `src/agents/eliza.ts`    | Knowledge, research, content production; handoffs for live data to VINCE.                                           |
| **VINCE**    | CDO  | `src/agents/vince.ts`    | Data and paper trading bot; ALOHA, options, perps, memes; no execution.                                             |
| **ECHO**     | CSO  | `src/agents/echo.ts`     | Crypto Twitter sentiment, X pulse/vibe, watchlist; handoffs for price/TA to VINCE.                                  |
| **Oracle**   | CPO  | `src/agents/oracle.ts`   | Polymarket read-only: discovery, odds, portfolio; handoffs to VINCE, Solus, Otaku.                                  |
| **Solus**    | CFO  | `src/agents/solus.ts`    | Hypersurface options: strike ritual, mechanics, optimal strike; spot + pasted context; no execution.                |
| **Otaku**    | COO  | `src/agents/otaku.ts`    | **Only agent with a funded wallet**; swap, bridge, DCA, Morpho, stop-loss, NFT mint, Vince signal execution.        |
| **Kelly**    | CVO  | `src/agents/kelly.ts`    | Lifestyle concierge; one team one dream; plugin-discovery, plugin-todo, **plugin-personality** (self-modification). |
| **Sentinel** | CTO  | `src/agents/sentinel.ts` | Core dev: PRDs, project radar, OpenClaw guide, cost status, ART; weekly + optional daily tasks.                     |
| **Clawterm** | —    | `src/agents/clawterm.ts` | OpenClaw research terminal: research, gateway, HIP-3 AI assets.                                                     |

### Key concepts

| What                                      | Where                                                                                                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Three curves**                          | Left = Vince perps (Hyperliquid). Mid = HIP-3 spot + stack sats. Right = Hypersurface options + ship code (Solus + Sentinel). [knowledge/teammate/THREE-CURVES.md](knowledge/teammate/THREE-CURVES.md)           |
| **Paper bot, ML, actions**                | `src/plugins/plugin-vince/` — [WHAT.md](src/plugins/plugin-vince/WHAT.md), [WHY.md](src/plugins/plugin-vince/WHY.md), [HOW.md](src/plugins/plugin-vince/HOW.md), [CLAUDE.md](src/plugins/plugin-vince/CLAUDE.md) |
| **Feature store (ML)**                    | [docs/FEATURE-STORE.md](docs/FEATURE-STORE.md)                                                                                                                                                                   |
| **Multi-agent (ASK_AGENT, Discord, A2A)** | [docs/MULTI_AGENT.md](docs/MULTI_AGENT.md)                                                                                                                                                                       |
| **Agent briefs (OpenClaw / PRD)**         | [docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md) — one doc per agent (can/cannot, key files, PRD focus). Use to brief OpenClaw or draft next-iteration PRDs.                                                         |
| **Deploy**                                | [docs/DEPLOY.md](docs/DEPLOY.md)                                                                                                                                                                                 |
| **Trading runtime contract**              | [docs/TRADING_RUNTIME_CONTRACT.md](docs/TRADING_RUNTIME_CONTRACT.md) — CRON vs MANUAL, producer/executor flow.                                                                                                   |
| **Project overview**                      | [README.md](README.md)                                                                                                                                                                                           |

**Otaku** is the only agent with a wallet that holds funds (DeFi, NFT mint, Vince signal execution). **Eliza** focuses on knowledge expansion and content; **Sentinel** on ops, PRDs, cost, and OpenClaw. Use the sections below for **generic ElizaOS** patterns; for VINCE-specific implementation (signals, paper bot, ML), prefer the plugin and agent docs above.

---

## 📋 Project Overview

| Property            | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| **Project Type**    | ElizaOS multi-agent project (VINCE)                         |
| **Package Manager** | `bun` (REQUIRED)                                            |
| **Runtime**         | ElizaOS with plugin ecosystem                               |
| **Configuration**   | Character-based agents in code (`src/agents/*.ts`)          |
| **Architecture**    | Plugin composition; one Discord app per agent (or fallback) |

## 📁 Project Structure (VINCE)

```
vince/
├── src/
│   ├── index.ts                 # Entry; loads project agents
│   ├── agents/                  # Character definitions (no characters/ folder)
│   │   ├── eliza.ts
│   │   ├── vince.ts
│   │   ├── echo.ts
│   │   ├── oracle.ts
│   │   ├── solus.ts
│   │   ├── otaku.ts
│   │   ├── kelly.ts
│   │   ├── sentinel.ts
│   │   ├── clawterm.ts
│   │   ├── naval.ts
│   │   └── index.ts
│   └── plugins/
│       ├── plugin-vince/        # Paper bot, ALOHA, options, ML
│       ├── plugin-eliza/       # Knowledge, UPLOAD, content production
│       ├── plugin-kelly/       # Lifestyle, daily briefing, tasks
│       ├── plugin-otaku/       # DeFi execution, BANKR, CDP, routes
│       ├── plugin-sentinel/    # PRDs, cost, OpenClaw guide, ART
│       ├── plugin-solus/      # Hypersurface strike, mechanics
│       ├── plugin-polymarket-discovery/
│       ├── plugin-x-research/  # X pulse, vibe, watchlist
│       ├── plugin-inter-agent/ # ASK_AGENT, standup
│       └── ...
├── knowledge/                   # RAG / teammate context
│   ├── teammate/               # Shared (USER.md, SOUL.md, THREE-CURVES.md, etc.)
│   ├── sentinel-docs/          # Sentinel knowledge
│   ├── the-good-life/          # Kelly: hotels, dining, wine
│   └── ...
├── docs/                        # Project and agent docs
│   ├── AGENTS_INDEX.md         # Agent briefing index (OpenClaw / PRD)
│   ├── ELIZA.md, VINCE.md, ECHO.md, ORACLE.md, SOLUS.md, OTAKU.md, KELLY.md, SENTINEL.md
│   ├── MULTI_AGENT.md
│   ├── FEATURE-STORE.md, TREASURY.md, DEPLOY.md
│   └── ...
├── .env.example                 # Clean, grouped by section and agent
├── .env                         # Local secrets (gitignored); same structure
├── scripts/
│   └── reorder-env.js          # Reorder .env to match .env.example
├── package.json
└── tsconfig.json
```

---

## 🤖 Character Configuration

### Brand voice (all agents)

Apply to **every agent** in this repo:

- **Benefit-led (Apple-style):** Lead with what the user gets—the outcome, the experience, the move. Not "the system has X" but "you get X." One clear benefit per answer.
- **Confident and craft-focused (Porsche OG):** Confident without bragging. Substance over hype. Let the craft speak—no empty superlatives unless backed by a concrete detail.
- **Zero AI-slop jargon:** Never use: leverage, utilize (use "use"), streamline, robust, cutting-edge, game-changer, synergy, paradigm, holistic, seamless, best-in-class, delve, landscape, certainly, great question, I'd be happy to, let me help, explore, dive into, unpack, nuanced, actionable, circle back, touch base, at the end of the day. Concrete, human language only. Avoid overusing em dashes (—); use commas or short sentences instead.

Reference in agent system prompts (e.g. "BRAND VOICE") and in `style.all` so the model sees it every time.

### Core Character Definition (ElizaOS pattern)

```typescript
// src/agents/example.ts
import { Character } from '@elizaos/core';

export const character: Character = {
  name: 'AgentName',
  username: 'agentname',
  bio: ['Short bio statements'],
  system: `You are AgentName. ...`,
  style: { all: [...], chat: [...], post: [...] },
  plugins: ['@elizaos/plugin-sql', '@elizaos/plugin-bootstrap', '@elizaos/plugin-openai', ...],
  settings: {
    model: 'gpt-4o-mini',
    embeddingModel: 'text-embedding-3-small',
    secrets: {},
    ragKnowledge: true,
  },
  knowledge: [{ directory: 'teammate', shared: true }, ...],
};
```

### Character variants (multi-agent)

This repo uses **one file per agent** in `src/agents/` and exports a **project** with multiple agents from `src/index.ts`. No separate `characters/*.json`; character is in code. See [docs/MULTI_AGENT.md](docs/MULTI_AGENT.md) for ASK_AGENT, Discord, and A2A.

---

## 🔌 Plugin Ecosystem

### Required (ElizaOS)

| Plugin                      | Purpose                               |
| --------------------------- | ------------------------------------- |
| `@elizaos/plugin-bootstrap` | Core actions, message handling        |
| `@elizaos/plugin-sql`       | Memory, database (PGLite or Postgres) |

### Model providers (choose one or more)

| Plugin                      | Use case                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `@elizaos/plugin-openai`    | GPT-4, embeddings                                                                  |
| `@elizaos/plugin-anthropic` | Claude (VINCE, Kelly, Solus, Oracle, Sentinel, ECHO default to Anthropic when set) |

### VINCE project plugins (in repo)

| Plugin                      | Agent(s)              | Purpose                                            |
| --------------------------- | --------------------- | -------------------------------------------------- |
| plugin-vince                | VINCE                 | Paper bot, ALOHA, options, perps, memes, ML        |
| plugin-eliza                | Eliza                 | UPLOAD, knowledge, content production              |
| plugin-kelly                | Kelly                 | Lifestyle, daily briefing, plugin-personality      |
| plugin-otaku                | Otaku                 | DeFi execution, CDP, BANKR, Relay, Morpho, x402    |
| plugin-sentinel             | Sentinel              | PRDs, project radar, OpenClaw guide, cost, ART     |
| plugin-solus                | Solus                 | Hypersurface strike ritual, mechanics, spot prices |
| plugin-polymarket-discovery | Oracle                | Polymarket discovery, odds, portfolio              |
| plugin-x-research           | ECHO, Eliza, Clawterm | X pulse, vibe, watchlist, search                   |
| plugin-inter-agent          | All                   | ASK_AGENT, standup                                 |

---

## 🌍 Environment Configuration

### Structure (.env and .env.example)

`.env.example` is **clean and grouped**: CORE → DATABASE → SHARED APIs → X/Twitter → **per-agent sections** (ELIZA, VINCE, ECHO, ORACLE, SOLUS, OTAKU, KELLY, SENTINEL, CLAWTERM) → FALLBACK DISCORD → STANDUP & A2A → OPENCLAW → MISC. Copy to `.env` and fill values.

| Section           | Contents                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| **CORE**          | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ELIZAOS_USE_LOCAL_MESSAGING`, `LOG_LEVEL`, Sentry         |
| **DATABASE**      | `POSTGRES_URL` (optional), `PGLITE_DATA_DIR`, `SUPABASE_*` (optional)                             |
| **SHARED APIs**   | Tavily, CoinGecko, Nansen, Dune, OpenRouter, etc.                                                 |
| **X / TWITTER**   | `X_BEARER_TOKEN`, `ELIZA_X_BEARER_TOKEN`, `X_SENTIMENT_*`, `XAI_*`                                |
| **Per-agent**     | `ELIZA_DISCORD_*`, `VINCE_DISCORD_*`, `VINCE_DAILY_REPORT_*`, `OTAKU_*`, `CDP_*`, `BANKR_*`, etc. |
| **STANDUP & A2A** | `STANDUP_*`, `A2A_*`, `REFLECTION_*`                                                              |

**Reordering .env:** Run `node scripts/reorder-env.js` to sort your `.env` into the same section order as `.env.example` (preserves values, dedupes keys). See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for full env reference.

### Minimal to run

- One of: `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (embeddings need a provider; often OpenAI even when using Claude for text).
- For multi-agent Discord: one Discord app per agent, e.g. `ELIZA_DISCORD_APPLICATION_ID` + `ELIZA_DISCORD_API_TOKEN`, and same for VINCE, Kelly, ECHO, Oracle, Solus, Otaku, Sentinel, Clawterm. Or set `DISCORD_APPLICATION_ID` + `DISCORD_API_TOKEN` as fallback for a single bot.

---

## 🚀 Development Workflow

### Quick start (VINCE)

```bash
bun install
cp .env.example .env
# Edit .env with API keys (at least one model provider)

bun start
# or
bun run dev
```

- **start / dev:** Run `scripts/dev-with-vite.js` (backend + Vite UI). Use the printed URL (e.g. http://localhost:5173) for chat.
- **elizaos dev:** `bun run dev:eliza` for ElizaOS dev mode.
- **Build:** `bun run build` (see `package.json`).

### Testing

```bash
bun run type-check
elizaos test
# Or filter: elizaos test --filter "action-name"
```

---

## 📊 Database (VINCE)

- **Default:** PGLite (no `POSTGRES_URL`). Data in `PGLITE_DATA_DIR` (e.g. `.eliza/.elizadb`).
- **Production:** Set `POSTGRES_URL` (direct connection, port 5432; not pooler). Optional Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for feature store / ML.

---

## 🎛️ Custom Plugin Development

- **When to create:** Unique business logic, proprietary APIs, custom data sources. Not for simple config (use character) or combining existing plugins (use composition).
- **Structure:** `Plugin` with `name`, `description`, `actions`, `providers`, `services`, `evaluators`, `init`. See [ElizaOS docs](https://github.com/elizaos/eliza) and existing plugins in `src/plugins/`.
- **Integrate:** Add plugin to the agent's `plugins` array in `src/agents/<agent>.ts`.

---

## 🐛 Troubleshooting

| Issue             | Solution                                                                               |
| ----------------- | -------------------------------------------------------------------------------------- |
| Agent won't start | `bun install`; check plugin deps and env                                               |
| No responses      | Verify API keys in `.env` (CORE section)                                               |
| Database errors   | Check `POSTGRES_URL` or `PGLITE_DATA_DIR`; run migrations if using Postgres            |
| Rate limits (X)   | Use separate tokens per agent (e.g. `ELIZA_X_BEARER_TOKEN`, `X_BEARER_TOKEN` for ECHO) |

**Debug:** `LOG_LEVEL=debug bun start` — see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) and [docs/LOG-WARNINGS-EXPLAINED.md](docs/LOG-WARNINGS-EXPLAINED.md).

---

## X Research (Cursor / Claude)

**skills/x-research/** — Cursor/Claude skill for read-only X (Twitter) research: search, thread, watchlist, briefings. Requires **X_BEARER_TOKEN** and Bun. [skills/x-research/README.md](skills/x-research/README.md).

**In-chat (VINCE / ECHO):** When `X_BEARER_TOKEN` is set, **X_PULSE**, **X_VIBE**, **X_ACCOUNT**, **X_SAVE_RESEARCH** (plugin-x-research). Watchlist add/remove and save to file: use CLI `bun run x-search.ts ...` in `skills/x-research/`.

---

## Kelly: plugin-discovery and plugin-personality

- **plugin-discovery:** “What can you do?” — capability discovery. `DISCOVERY_REQUIRE_PAYMENT=false` keeps summary/manifest free; set `true` and add plugin-commerce for paid.
- **plugin-todo:** Todo/reminders (vendored in `packages/plugin-todo`); without plugin-rolodex, in-app reminders only.
- **plugin-personality:** Kelly only. Self-modification (CHARACTER_EVOLUTION, MODIFY_CHARACTER); backups and validation. See [docs/KELLY.md](docs/KELLY.md) § Self-Modification.

---

## Sentinel: Core Dev

**Sentinel** is the CTO agent: ops, architecture steward, **cost steward** (TREASURY), and partner for **Claude / Cursor** (task briefs, PRDs). North star: coding 24/7, self-improving, ML/ONNX, **ART** (gen art, XCOPY, Meridian, QQL). Brand voice: benefit-led, Porsche OG, no AI-slop.

- **Character:** `src/agents/sentinel.ts`. Knowledge: `internal-docs`, `sentinel-docs` (incl. **docs/TREASURY.md**), `teammate`. Synced by `scripts/sync-sentinel-docs.sh`.
- **Plugin:** `src/plugins/plugin-sentinel/`. Actions: **SENTINEL_SUGGEST**, **SENTINEL_PRD**, **SENTINEL_MULTI_AGENT**, **SENTINEL_TRADING_INTEL**, **SENTINEL_SHIP**, **SENTINEL_OPENCLAW_GUIDE**, **SENTINEL_SETTINGS_SUGGEST**, **SENTINEL_ONNX_STATUS**, **SENTINEL_ART_GEMS**, **SENTINEL_DOC_IMPROVE**, **SENTINEL_COST_STATUS**, **SENTINEL_ART_PITCH**, **SENTINEL_INVESTOR_REPORT**, **SENTINEL_HOW_DID_WE_DO**, **SENTINEL_SECURITY_CHECKLIST**.
- **Tasks:** **SENTINEL_WEEKLY_SUGGESTIONS** (7d; push to sentinel/ops). **SENTINEL_DAILY_DIGEST** (optional; `SENTINEL_DAILY_ENABLED=true`).
- **Env:** `SENTINEL_WEEKLY_ENABLED`, `SENTINEL_DAILY_ENABLED`, `SENTINEL_DAILY_HOUR_UTC`, `SENTINEL_DISCORD_*`.
- **Cost:** “What’s our burn?”, “cost status” → **SENTINEL_COST_STATUS** from [docs/TREASURY.md](docs/TREASURY.md).
- **OpenClaw / Milaidy:** [knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md](knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md). Standup type **prd** → `docs/standup/prds/`; **integration_instructions** → `docs/standup/integration-instructions/`.

---

## Agent briefs (OpenClaw / PRD)

[docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md) lists **one briefing doc per agent** (Eliza, VINCE, ECHO, Oracle, Solus, Otaku, Kelly, Sentinel). Each doc: what the agent **can** and **cannot yet** do, key files, and “For OpenClaw / PRD” focus. Use them to brief OpenClaw (or any downstream agent) and to draft **next-iteration PRDs**. Individual docs: [docs/ELIZA.md](docs/ELIZA.md), [docs/VINCE.md](docs/VINCE.md), [docs/ECHO.md](docs/ECHO.md), [docs/ORACLE.md](docs/ORACLE.md), [docs/SOLUS.md](docs/SOLUS.md), [docs/OTAKU.md](docs/OTAKU.md), [docs/KELLY.md](docs/KELLY.md), [docs/SENTINEL.md](docs/SENTINEL.md).

---

## Related docs (VINCE)

| Doc                                                                      | Purpose                                      |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| [README.md](README.md)                                                   | Project overview, quick start                |
| [docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md)                             | Agent briefing index (OpenClaw / PRD)        |
| [docs/MULTI_AGENT.md](docs/MULTI_AGENT.md)                               | ASK_AGENT, Discord, A2A, standups            |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md)                           | Env and config reference                     |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)                       | Common issues and fixes                      |
| [docs/SOLUS_NORTH_STAR.md](docs/SOLUS_NORTH_STAR.md)                     | Solus north star and roadmap                 |
| [docs/FEATURE-STORE.md](docs/FEATURE-STORE.md)                           | Paper bot feature storage and ML             |
| [docs/TREASURY.md](docs/TREASURY.md)                                     | Cost and Sentinel cost steward               |
| [docs/DEPLOY.md](docs/DEPLOY.md)                                         | Deploy to Eliza Cloud                        |
| [docs/OTAKU.md](docs/OTAKU.md)                                           | Otaku DeFi execution (reference agent brief) |
| [docs/WORTH_IT_PROOF.md](docs/WORTH_IT_PROOF.md)                         | Why 24/7 research, knowledge, ONNX matter    |
| [knowledge/teammate/THREE-CURVES.md](knowledge/teammate/THREE-CURVES.md) | Left/mid/right curves                        |
| [src/plugins/plugin-vince/](src/plugins/plugin-vince/)                   | WHAT, WHY, HOW, CLAUDE, README               |

---

**Ready to work on VINCE.** Start with `bun start` or `bun run dev`, use [docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md) for agent capabilities and PRD focus, and [.env.example](.env.example) for a clean, grouped env layout.
