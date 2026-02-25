# Changelog

All notable changes to the VINCE project will be documented in this file.

## [v2026.2.24] - 2026-02-25

### The Compounding Edge — Phases 6–10

Five phases in one day. Full release notes: [docs/RELEASE_v2026.2.24.md](docs/RELEASE_v2026.2.24.md)

- **Phase 6/7 Validation** — All 11 adversary intelligence tests green. ImmuneSystem `__dirname` bug fixed.
- **Phase 8** (#41–48) — X Source Quality Engine, Narrative Lag Model, Trade Attribution, Execution Quality, Regime Transition Forecaster, Content Performance Loop, Weekly Alpha Memo, X-Research Command Center
- **Phase 9** (#49–56) — Skill Registry, Skill Router, X-Research hardening, Trading-Agent runbook, Skill Telemetry, QA Harness, Skill-to-Content Pipeline, Skill Governance
- **Phase 10** (#57–64) — Capital Buckets, Drift Sentinel, Circuit Breaker Stack, Execution Audit Trail, Position Guardrails, P&L Reconciliation, Operator Dashboard V2, Live Capital SOP
- **200+ new tests** | **18 new services** | **0 type errors** | **All live capital defaults: OFF**

---

## [v4.0.0] - 2026-02-23

### Paper Bot & ML: docs and validation

- **README** — Paper Bot & ML section: re-run training (incl. `train-models:recency`), validate ML improvement with `bun run validate-ml`, example validation run (158 trades), Scripts table entry for `validate-ml`
- **package.json** — `validate-ml`: runs `validate_ml_improvement.py` on feature-store data; `train-models:recency`: training with `--recency-decay 0.01`
- **Validation** — One command to check that ML-derived thresholds (min strength / min confidence) would have improved selectivity on historical data; script reports baseline vs filtered win rate and % of skipped trades that were losers

---

## [v3.1.0] - 2026-02-18

### VinceBench helps ML automatically

- **labels.benchScore** — Per-decision VinceBench score stored on every closed trade; available to training as `label_benchScore`
- **Training** — `--bench-score-weight`, `--min-bench-score`, `--bench-score-quantile`; metadata and improvement report record bench usage
- **Backfill** — `backfill-bench-scores.ts` for historical JSONL (with `.bak` backup)
- **Docs** — FEATURE-STORE.md § VinceBench and ML; README § Paper bot & ML with re-run training command

### Training & ONNX

- **README** — Re-run training command and note that `--output .elizadb/vince-paper-bot/models` needs no copy step
- **train_models.py** — Final log: "Models are in the agent directory" when output is the agent models dir; otherwise remind to copy
- **train_models.py** — Fewer pandas/numpy warnings (numeric coercion, float64 in outlier clip, infer_objects after fillna)

---

## [v2.8.0] - 2026-02-16

### OpenClaw workspace orientation

- **OPENCLAW.md** — Root orientation for openclaw-agents/, vault/, skills/, tasks/
- **openclaw-agents, vault, skills/x-research, tasks** — READMEs updated with workspace context and links to OPENCLAW.md
- **Sentinel** — Knowledge and message example to guide OpenClaw (and humans) to the right directories
- **README** — "For OpenClaw" quick link to OPENCLAW.md

### Standup & docs

- **docs/standup/** — New folder; standup deliverables reorganized under docs/standup/
- **IDEAS.md, SEARCH.md** — Moved to docs/IDEAS.md, docs/SEARCH.md
- Obsolete standup-deliverables-build-test-\* folders and legacy standup files removed
- Sync script and vault templates updated for new layout

### Env & dev experience

- **.env.example** — Grouped and clarified; agent-specific sections
- **CLAUDE.md** — Fully updated
- **reorder-env.js** — Optional script to reorder .env to match example

---

## [v2.7.0] - 2026-02-16

### Otaku: the executor

- **13 actions** — Swap, limit order, DCA, positions, bridge, balance, stop-loss, Morpho, approve, NFT mint, yield recommend, rebalance, execute Vince signal
- **API** — Free routes (health, config, alerts, notifications, gas); paid x402 routes (positions, quote, yields, history, portfolio)
- **Notifications** — Wallet history + alerts + DB-backed completion events; merged in UI with socket refresh
- **Wallet UI** — Degen vs Normies mode from backend config; mode-aware copy and optional Swap
- **Docs** — OTAKU.md updated with dev section (can/cannot do, key files, MVP issues); Base Builder Grant application rewritten with Otaku as core

### What's next

- **Kelly** — Grind to make the personal lifestyle agent as good as it gets; deeper knowledge on topics that matter most
- **Sentinel** — Gen art passion project: QQL derivative

---

## [v2.5.0] - 2026-02-14

### 🦞 Clawterm & standups

- **Clawterm agent** — Bio, configuration, and day report action (`CLAWTERM_DAY_REP`)
- **Standup facilitator** — Refactored data fetching; clearer lessons, action items, and relationship signals
- **Structured standups** — Runs twice daily; lessons stored per agent; summary to #daily-standup

### 🔗 OpenClaw integration

- **OpenClaw plugin tests** — Test coverage for adapter and data flow
- **Data source clarity** — Documented and clarified OpenClaw data sources
- **Security** — Hardening and security guidance in knowledge
- **Knowledge base** — OpenClaw-specific knowledge for Sentinel and handoffs
- **Adapter** — Enhanced OpenClaw adapter for ElizaOS ↔ OpenClaw hybrid mode

### 📦 New plugins

- **@elizaos/plugin-8004** — ERC-8004 (identity/attestation) integration
- **plugin-defillama** — DeFiLlama integration for Otaku: protocol TVL, yield rates, TVL/yield history; no API key required

### ⚡ Core & UX

- **A2A context** — Enhanced agent-to-agent context provisioning
- **Dashboard leader** — Volume-based leaderboard and dashboard improvements
- **Gamification** — Rebels ranking and engagement features
- **Agent branding** — Clearer agent lanes and voice consistency
- **plugin-vince** — Various enhancements and stability improvements

---

## [v2.2.0] - 2026-02-12

### 🎭 Dream Team Complete — 8 Agents

The full roster is now live. Clear lanes, no overlap.

| Role    | Agent      | Lane                                           |
| ------- | ---------- | ---------------------------------------------- |
| CEO     | Eliza      | Knowledge base, research                       |
| CDO     | VINCE      | Objective data: options, perps, prices         |
| **CSO** | **ECHO**   | **CT sentiment, X research, social alpha**     |
| **CPO** | **Oracle** | **Prediction markets: Polymarket (read-only)** |
| CFO     | Solus      | Trading execution, strike selection            |
| COO     | Otaku      | DeFi ops, wallet, yields                       |
| CVO     | Kelly      | Lifestyle: travel, dining, health              |
| CTO     | Sentinel   | Ops, code, infra                               |

**Design Principle:**

- Data agents (VINCE, ECHO, Oracle) → inform, don't execute
- Execution agents (Solus, Otaku) → trade, execute
- Support agents (Eliza, Kelly, Sentinel) → knowledge, lifestyle, ops

---

### 🔮 Oracle Agent (NEW)

Prediction markets specialist — Polymarket-first, read-only.

**Why it matters:** Priority markets are "a palantir into market belief."

**Three use cases:**

1. **Paper bot** — Price predictions improve perps algo on Hyperliquid
2. **Hypersurface strike selection** — Weekly predictions → options strikes (most important)
3. **Vibe check** — Macro sentiment overlay

**Actions:**

- `GET_ACTIVE_POLYMARKETS` — Trending markets
- `GET_VINCE_POLYMARKET_MARKETS` — Priority markets only
- `SEARCH_POLYMARKETS` — Keyword search
- `GET_POLYMARKET_DETAIL` / `GET_POLYMARKET_PRICE`
- `GET_POLYMARKET_POSITIONS` / `GET_POLYMARKET_BALANCE`
- Orderbooks, spreads, open interest, volume, top holders

---

### 📡 ECHO Agent (NEW)

Chief Sentiment Officer — CT vibes, social alpha.

**Separation of concerns:**

- VINCE = objective data (prices, funding, options)
- ECHO = subjective sentiment (CT says, whale takes, contrarian warnings)

**Actions (9 total):**
| Action | Description |
|--------|-------------|
| `X_PULSE` | ALOHA-style full briefing |
| `X_VIBE` | Quick topic sentiment |
| `X_THREAD` | Thread summarization |
| `X_ACCOUNT` | Account analysis |
| `X_NEWS` | X News API headlines |
| `X_SEARCH` | Manual search |
| `X_MENTIONS` | Track mentions |
| `X_WATCHLIST` | Account watchlist |
| `X_SAVE_RESEARCH` | Persist research |

---

### 📊 Polymarket Major Upgrade

**plugin-polymarket-discovery** rewritten for production.

- Priority markets with tag sections
- Enhanced leaderboard UI with sorting
- LLM extraction for market insights
- Tag → Gamma ID resolution
- Token info action
- Full test coverage (6 test files)

**New route:** `/vince/polymarket/priority-markets`

---

### 🧹 VINCE Cleanup

X research fully migrated to ECHO:

- **Deleted** `xResearch.action.ts` (1,102 lines)
- **Deleted** `ctVibe.action.ts`
- VINCE now pure objective data

---

### 📚 Plugin Eliza

- `CONTENT_AUDIT` action — Film study for content
- Knowledge gaps logging
- Improved upload handling

---

### 📈 Stats

- **116 files changed**
- **+7,421 lines / -2,231 lines**
- **8 agents** (up from 6)
- **9 new X actions**
- **6 new Polymarket test files**

---

## [v2.1.0] - 2026-02-12

### 🚀 Sentinel 10x Upgrade (PR #10)

**Sentinel is now a world-class core dev.** Complete rewrite of plugin-sentinel with 15 actions and 6 services.

#### New Capabilities

- **PRD Generator** — Enterprise-grade Product Requirement Documents for Cursor/Claude Code
  - Project Radar scans plugins, progress, docs, and todos
  - Impact Scorer (RICE + strategic alignment) ranks suggestions
  - Architecture rules baked into every PRD
  - Saved to `docs/standup/prds/`

- **Trading Intelligence** — Deep expertise in paper trading and options
  - Signal sources, feature store, ML pipeline, ONNX
  - Hypersurface options strategy, strike ritual, EV framework
  - Can explain any trading decision

- **Multi-Agent Vision** — Understands the dream team architecture
  - ASK_AGENT resolution, Discord Option C, policy rules
  - Standup coordination, deliverables flow, feedback loop
  - "Feels genuinely alive" philosophy

- **OpenClaw Expert** — Deep knowledge of OpenClaw/Milaidy/OpenClaw
  - Gateway setup, skills, sub-agents, 24/7 research
  - Integration patterns with ElizaOS

#### New Actions (15 total)

| Action                        | Description                       |
| ----------------------------- | --------------------------------- |
| `SENTINEL_PRD`                | Generate world-class PRDs         |
| `SENTINEL_SUGGEST`            | Impact-scored suggestions         |
| `SENTINEL_SHIP`               | What to ship for max impact       |
| `SENTINEL_MULTI_AGENT`        | Multi-agent architecture expert   |
| `SENTINEL_TRADING_INTEL`      | Paper bot + options expert        |
| `SENTINEL_OPENCLAW_GUIDE`     | OpenClaw knowledge research setup |
| `SENTINEL_ONNX_STATUS`        | ML/ONNX health check              |
| `SENTINEL_DOC_IMPROVE`        | Documentation improvements        |
| `SENTINEL_COST_STATUS`        | Cost and treasury status          |
| `SENTINEL_SETTINGS_SUGGEST`   | Settings recommendations          |
| `SENTINEL_ART_GEMS`           | ElizaOS examples/art gems         |
| `SENTINEL_ART_PITCH`          | Gen art pitch                     |
| `SENTINEL_INVESTOR_REPORT`    | VC/investor pitch                 |
| `SENTINEL_HOW_DID_WE_DO`      | Outcome review                    |
| `SENTINEL_SECURITY_CHECKLIST` | Security hygiene                  |

#### New Services (6 total)

- `projectRadar.service` — Deep project state scanning
- `impactScorer.service` — RICE + strategic scoring
- `prdGenerator.service` — PRD templates with architecture rules
- `openclawKnowledge.service` — OpenClaw expertise
- `multiAgentVision.service` — Dream team understanding
- `tradingIntelligence.service` — Signal sources, ML, options

---

### 📚 Eliza V2: Autonomous Research (PR #11)

**Eliza is now the knowledge powerhouse.** Complete plugin-eliza with 14 actions and 7 services.

#### New Capabilities

- **Autonomous Research** — Gap analysis + auto-expansion
  - Identifies knowledge gaps and suggests topics
  - Research queue for batch ingestion
  - Session tracking and research agenda

- **Content Production** — Voice-aware writing
  - Essay generation for Substack
  - Tweet drafting for X/Twitter
  - Content repurposing (essay ↔ thread ↔ LinkedIn)

- **Knowledge Intelligence** — Graph, quality, deduplication
  - Relationship tracking between content
  - Source trust and provenance
  - Smart duplicate detection

- **Brand Consistency** — Style guide enforcement
  - Voice profile analysis
  - Style checking and auto-fix
  - Premium content polish

#### New Actions (14 total)

| Action                    | Description                      |
| ------------------------- | -------------------------------- |
| `UPLOAD`                  | Ingest text, URLs, YouTube       |
| `ADD_MICHELIN_RESTAURANT` | Michelin Guide to knowledge      |
| `KNOWLEDGE_STATUS`        | Knowledge base health check      |
| `WRITE_ESSAY`             | Substack essay generation        |
| `DRAFT_TWEETS`            | X/Twitter suggestions            |
| `REPURPOSE`               | Transform between formats        |
| `RESEARCH_QUEUE`          | Batch ingestion queue            |
| `SUGGEST_TOPICS`          | AI-powered topic suggestions     |
| `RESEARCH_BRIEF`          | Concise research briefs          |
| `TREND_CONNECTION`        | Connect to VINCE's market trends |
| `KNOWLEDGE_INTEL`         | Unified intelligence dashboard   |
| `STYLE_CHECK`             | Brand style enforcement          |
| `POLISH`                  | Transform to premium content     |
| `AUTO_RESEARCH`           | Autonomous knowledge expansion   |

#### New Services (7 total)

- `voice.service` — Voice profile and brand consistency
- `autoMonitor.service` — Knowledge health monitoring
- `knowledgeGraph.service` — Content relationship tracking
- `deduplication.service` — Smart duplicate detection
- `sourceQuality.service` — Source trust and provenance
- `styleGuide.service` — Brand style rules and fixes
- `researchAgenda.service` — Research priorities and gaps

---

### 📊 Summary

| Metric          | Before | After   |
| --------------- | ------ | ------- |
| **Plugins**     | 18     | 20      |
| **Actions**     | ~130   | 162     |
| **Services**    | ~40    | ~53     |
| **Lines added** | —      | +15,900 |

**North star:** Push, not pull. 24/7 market research. Self-improving paper trading bot. One team, one dream.

---

## [v2.0.0] - 2026-02-09

- X research ALOHA-style conclusion
- X All-In: Alpha, Insights, and Sentiment
- Kelly agent + plugin-kelly
- Discord + push unlock
- Fee-aware PnL (net of costs)
- Avoided decisions in feature store

See `src/plugins/plugin-vince/progress.txt` for full history.
