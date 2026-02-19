# Contributing to VINCE

**VINCE** is unified data intelligence for options, perps, memes, DeFi, lifestyle, and art — with a **self-improving paper trading bot** at the core. Ten agents, one team, one dream.

This document explains how to contribute and what we optimize for. We've shipped hundreds of commits to reach **v3.3** and welcome fresh eyes: clear PRs, focused scope, and alignment with the roadmap below.

- **Project overview and dev guide:** [README.md](README.md) · [CLAUDE.md](CLAUDE.md)
- **Contribution guide:** this file (CONTRIBUTING.md)

---

## Where fresh eyes matter most

We have seven areas where outside contributors can make the biggest impact right now. If you're looking at VINCE for the first time, start here.

### 1. Multi-agent standup: prove that 1 + 1 = 3

We run daily standups where Kelly orchestrates all ten agents in sequence (VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel → Clawterm → Naval → Day Report). The mechanics work: each agent contributes, structured signals come through, and Kelly produces a Day Report with a TODO table and wrap-up.

**The problem:** the output reads like ten individual reports stitched together, not like a team that built on each other's thinking. We need to prove that multi-agent collaboration produces insights no single agent would reach alone.

**What good looks like:**
- Agents reference and build on what earlier agents said. Example: ECHO spots a CT narrative, Solus adjusts strike selection based on that sentiment, VINCE's paper bot weights the signal higher because two sources converge.
- The Day Report synthesis surfaces connections across agents, not just summaries. "ECHO flagged defense AI rotation + Oracle shows 95% Warsh odds + VINCE regime is neutral = covered call on BTC makes sense because macro is range-bound."
- Action items that emerge from cross-agent reasoning, not from each agent independently listing their own next steps.

**Where to look:**
- Standup flow and prompts: `src/plugins/plugin-inter-agent/`
- Shared insights format: `docs/standup/daily-insights/`
- Day Report generation and output: `docs/standup/day-reports/`
- Agent system prompts and characters: `src/agents/*.ts`

**How to contribute:** Improve standup prompts so agents see what others said and respond to it. Improve Day Report synthesis so it pulls threads across agents. Add evaluation criteria or tests that measure cross-agent insight quality. If you see agents repeating generic filler, fix the prompt or context injection so they have something real to work with.

### 2. X research to paper trade pipeline: the thing that works

Our proudest result so far: ECHO runs the WTT (What's the Trade) daily task, produces a structured trade thesis with entry/risk/invalidation, and the paper trading bot picks up that signal and opens a position on Hyperliquid. Research becomes a trade, automatically.

**What's in place:**
- **WTT task** (`whatsTheTradeDaily.tasks.ts`): Thesis (generic or X-driven when `ECHO_WTT_X_DRIVEN=true`), adapter data (Kalshi, Robinhood, Hyperliquid), narrative with explicit asymmetry and "what would kill the trade," and structured pick extraction. Prompts require one clear mispricing/asymmetry; optional X narrative from CT search feeds the thesis step.
- **Paper bot WTT path**: When `VINCE_PAPER_WTT_ENABLED` is on, `evaluateWttPick()` runs first: reads today's JSON from `docs/standup/whats-the-trade/`, maps ticker via `normalizeWttTicker`, builds signal from rubric, opens (or skips) and records the `wtt` block in the feature store. Extraction is robust: ticker validated against WTT universe, safe rubric defaults; no valid pick logs clearly and can append a skipped row to wtt-picks.jsonl for ML.
- **Standup/Solus as first-class signals**: After the Day Report, plugin-inter-agent writes `docs/standup/signals/YYYY-MM-DD-signals.json` (Solus call and/or parsed "Solus's call" from report). The paper bot aggregator has a **StandupSignal** source (weight 0.6) that reads that file for today; set `VINCE_PAPER_STANDUP_SIGNALS_ENABLED=false` to disable.
- **E2E coverage**: `wttPaperBotIntegration.test.ts` includes fixture JSON → normalize/signal → trade-or-reject and ticker-universe checks.

**What we want more of:**
- Even sharper X-driven theses when `ECHO_WTT_X_DRIVEN=true` (richer CT narrative, better "mispricing in one sentence").
- Tuning StandupSignal weight and confidence floor so Solus/standup votes matter without overwhelming quant sources.
- More WTT outputs that pass the bot's gates (rubric quality, ticker in universe) so the loop fires more often.

**Where to look:**
- X research plugin: `src/plugins/plugin-x-research/` (WTT task, X_PULSE, thesis/narrative prompts)
- "What's the Trade" output and contract: `docs/standup/whats-the-trade/`, [INTEGRATION-WITH-PAPER-BOT.md](docs/standup/whats-the-trade/INTEGRATION-WITH-PAPER-BOT.md)
- Standup signals writer: `src/plugins/plugin-inter-agent/src/standup/standupSignals.ts`; aggregator reader: `src/plugins/plugin-vince/src/utils/standupSignalsReader.ts`
- Signal aggregation and paper bot: `src/plugins/plugin-vince/` (see [CLAUDE.md](src/plugins/plugin-vince/CLAUDE.md)); [SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md) for StandupSignal and WTT

**How to contribute:** Improve thesis and narrative prompts for asymmetry. Add or tune signal sources (e.g. StandupSignal weight, WTT rubric→signal mapping). Add tests that run research → JSON → bot evaluation. If the bot ignores good signals or trades on bad ones, that's a high-value bug.

### 3. Paper bot trade lifecycle: better WHY, faster TP1, more training data

The paper trading bot opens and closes trades. The following is now in place; remaining gaps are below.

**Better "WHY THIS TRADE" (implemented).** `buildWhyThisTrade()` in `tradeExplainer.ts` produces conviction-style narrative: WTT thesis is front and center when the trade came from What's the Trade; quant trades name converging sources and include "what would make this wrong" from conflicting reasons or WTT invalidate condition. Open notifications and bot status use this; each open position in status shows a one-line WHY. WTT opens store `wttThesis` and `wttInvalidateCondition` in position metadata.

**Trade exit notifications (implemented).** Full closes (SL, TP, manual, max_age, trailing_stop) push to Discord/Slack/Telegram via `closeTrade()`. Partial TP (TP1/TP2 hit) now pushes a short message (e.g. "TP1 hit – 50% closed, +$X") after `executePartialTakeProfit`. Web UI: if the app has a frontend that should show lifecycle events, expose recent trade events from the journal or add an endpoint/SSE for open/close events.

**Faster TP1 for training data (implemented).** Set `VINCE_PAPER_FAST_TP=true` (or `vince_paper_fast_tp: true` in VINCE settings) for "fast TP" / learning mode: TP targets become 1R, 2R, 3R (`TAKE_PROFIT_TARGETS_FAST_TP`); at TP1 the position is fully closed (one trade = one feature-store row); max position age is 12h instead of 48h. This generates more closed trades for the feature store and ONNX training. Default remains 1.5R, 3R, 5R with partial closes at TP1/TP2.

**Where to look:**
- Trade explainer and WHY text: `src/plugins/plugin-vince/src/utils/tradeExplainer.ts` (`buildWhyThisTrade`, `buildTradeThesis`)
- Bot status and leaderboard: `src/plugins/plugin-vince/src/actions/vinceBotStatus.action.ts`
- Paper trading service (TP/SL, notifications, fast_tp): `src/plugins/plugin-vince/src/services/vincePaperTrading.service.ts`
- Position manager (exits, max_age, partial TP): `src/plugins/plugin-vince/src/services/vincePositionManager.service.ts`
- Feature store (training data): `src/plugins/plugin-vince/src/services/vinceFeatureStore.service.ts`
- ML training pipeline: `src/plugins/plugin-vince/scripts/train_models.py`
- TP/SL and fast-TP defaults: `src/plugins/plugin-vince/src/constants/paperTradingDefaults.ts`

**How to contribute:** Refine the WHY narrative (e.g. tone, length, or more source-specific phrasing). Ensure trade lifecycle events surface in the web UI if there is one. Run with `VINCE_PAPER_FAST_TP=true` to accumulate 90+ closed trades and unlock the first real ONNX training run; then iterate on signal quality and TP/SL models.

### 4. Automated daily briefings: push, not pull

VINCE's highest-value actions today are ALOHA (morning crypto briefing), PERPS (signal overview), OPTIONS (covered call analysis), NEWS (MandoMinutes sentiment), HIP-3 (TradFi assets), and the Day Report (multi-agent standup summary). Right now you have to ask for them. We want them delivered automatically to Discord and Slack every morning.

The plumbing exists: `dailyReport.tasks.ts` already builds a combined context from ALOHA + OPTIONS + PERPS + HIP-3 and pushes to channels whose name contains "daily" via `VinceNotificationService.push()`. Set `VINCE_DAILY_REPORT_ENABLED=true` and `VINCE_DAILY_REPORT_HOUR=8` (UTC) to activate. But it needs work: the output format is not as clean as the interactive actions, the Slack delivery path is untested, and there is no way to configure which briefings to include or exclude per channel.

**What good looks like:**
- Every morning, your Discord `#daily` and Slack `#vince-daily` channels get a clean briefing: prices, signals, options call, news headlines, regime. One message, no prompt required.
- The briefing format matches the quality of the interactive ALOHA action, not a log dump.
- Configurable per channel: some channels get the full briefing, some get just prices and signals.

**Where to look:**
- Daily report task: `src/plugins/plugin-vince/src/tasks/dailyReport.tasks.ts`
- Notification service: `src/plugins/plugin-vince/src/services/notification.service.ts`
- ALOHA action (quality reference): `src/plugins/plugin-vince/src/actions/aloha.action.ts`
- Env config: `VINCE_DAILY_REPORT_ENABLED`, `VINCE_DAILY_REPORT_HOUR` in `.env.example`

**How to contribute:** Clean up the daily report output format so it reads as well as the interactive ALOHA. Test and fix the Slack delivery path. Add per-channel configuration for which sections to include. If you can make the morning briefing arrive without anyone asking for it, that's the "push, not pull" promise delivered.

### 5. Knowledge ingestion and Substack content production by Eliza

Eliza has two jobs: absorb knowledge and produce publishable content. Both need improvement.

**Content ingestion across platforms.** The UPLOAD action works on Discord: share a tweet URL, article link, YouTube video, or paste raw text, and Eliza extracts, summarizes, and files it into the knowledge base (`knowledge/` directory). On Slack, this doesn't work yet. Slack messages with URLs, shared tweets, and YouTube links need the same ingestion pipeline. The upload action already handles URL extraction from Discord embeds and attachments; it needs to handle Slack's message format too.

**Substack content drafts.** The WRITE_ESSAY action exists and targets ikigaistudio.substack.com. It supports five essay styles (deep-dive, framework, contrarian, synthesis, playbook) and pulls from the RAG knowledge base. But the drafts aren't good enough to publish. They read like AI-generated summaries, not like opinionated essays with a voice. The knowledge base needs to be richer (which ties back to the ingestion problem), the prompts need more personality and editorial direction, and there should be a review loop where you can iterate on a draft before it's finalized.

**Where to look:**
- Upload action (ingestion): `src/plugins/plugin-eliza/src/actions/upload.action.ts`
- Write essay action: `src/plugins/plugin-eliza/src/actions/writeEssay.action.ts`
- Substack context provider: `src/plugins/plugin-eliza/src/providers/substackContext.provider.ts`
- Voice/style service: `src/plugins/plugin-eliza/src/services/voice.service.ts`
- Research and topics: `src/plugins/plugin-eliza/src/actions/suggestTopics.action.ts`, `researchBriefs.action.ts`
- Knowledge root config: `src/plugins/plugin-eliza/src/config/paths.ts`

**How to contribute:** Port the UPLOAD ingestion pipeline to handle Slack message formats (URLs in text, unfurled links, file attachments). Improve WRITE_ESSAY prompts and the substackContext provider so drafts have a stronger editorial voice and pull from richer knowledge context. Add a draft iteration flow where Eliza produces a first pass, you give feedback, and she revises. If you can get one essay draft from knowledge-in to publish-ready, that proves the full loop.

### 6. Solus options context: portfolio awareness and daily monitoring

**Status: Implemented.** Portfolio and open positions are read from `docs/standup/weekly-options-context.md` (or `SOLUS_PORTFOLIO_CONTEXT`); the hypersurfaceContext provider injects them into every Solus reply. Standup includes open position status and daily hold/close/adjust when positions exist; strike ritual and optimal-strike respect covered-call mode. See [WEEKLY-OPTIONS-CONTEXT.md](docs/standup/WEEKLY-OPTIONS-CONTEXT.md).

Solus advises on weekly BTC covered calls and cash-secured puts on Hypersurface. The following was the original gap (now addressed):

**Portfolio state.** Solus didn't know our BTC cost basis. We acquired BTC at ~$70K when our secured puts got exercised a few weeks ago. That means we're now running covered calls (selling calls against BTC we own), not deciding between calls and puts from scratch. Solus should know: we hold BTC, our cost basis is $70K, and the strategic goal is to sell covered calls above cost basis to earn premium while we hold. This context should live in a persistent file (e.g. `docs/standup/weekly-options-context.md` or a `SOLUS_PORTFOLIO_CONTEXT` env var) that gets injected into every Solus reply via the `hypersurfaceContext.provider.ts`.

**Daily monitoring.** Hypersurface supports early exercise and early close. The standup prompt for Solus now includes current position status (from the context file) and asks whether to hold, close early, or adjust when open positions exist.

**Where to look:**
- Hypersurface context provider: `src/plugins/plugin-solus/src/providers/hypersurfaceContext.provider.ts`
- Strike ritual action: `src/plugins/plugin-solus/src/actions/solusStrikeRitual.action.ts`
- Optimal strike action: `src/plugins/plugin-solus/src/actions/solusOptimalStrike.action.ts`
- Position assessment: `src/plugins/plugin-solus/src/actions/solusPositionAssess.action.ts`
- Solus agent character: `src/agents/solus.ts`
- Standup data for Solus: `src/plugins/plugin-inter-agent/src/standup/standup.build.ts`
- North star doc: `docs/SOLUS_NORTH_STAR.md`

**How to contribute:** Keep `docs/standup/weekly-options-context.md` up to date (format in [WEEKLY-OPTIONS-CONTEXT.md](docs/standup/WEEKLY-OPTIONS-CONTEXT.md)). Optional: add tooling to sync positions from Hypersurface when an API becomes available, or extend the shared helper (`src/plugins/plugin-solus/src/utils/weeklyOptionsContext.ts`) if the file format evolves.

### 7. Sentinel to OpenClaw: AI agent shipping code improvements

Sentinel produces proactive suggestions (SENTINEL_SUGGEST), impact-scored ship priorities (SENTINEL_SHIP), and PRDs (SENTINEL_PRD). The bridge from Sentinel's output to an AI coding agent is in place: structured task briefs are written to a queue when enabled; coding agents (OpenClaw, Cursor, Claude Code) consume from that queue and open PRs on a new branch.

**The loop (steps 1–3 implemented):**
1. Sentinel's weekly task or SENTINEL_SHIP scans the project and produces ranked improvement suggestions.
2. The highest-impact suggestion is turned into a structured task brief (JSON) with scope, acceptance criteria, and suggested branch name. Briefs are written to `docs/standup/openclaw-queue/` when `SENTINEL_SHIP_WRITE_OPENCLAW_TASK=true` or `SENTINEL_WEEKLY_WRITE_OPENCLAW_TASK=true`.
3. An AI coding agent polls the queue, picks up the brief, creates a feature branch, makes the changes, and opens a PR (see [docs/standup/OPENCLAW_TASK_CONTRACT.md](docs/standup/OPENCLAW_TASK_CONTRACT.md)).
4. A human reviews and merges (or gives feedback that goes back to the agent).

**What's in place:** Task-brief schema and contract (OPENCLAW_TASK_CONTRACT.md), openclawTaskBrief.service (build + write to queue), SENTINEL_SHIP and weekly task optional writes, configurable PRD output path (STANDUP_DELIVERABLES_DIR / SENTINEL_PRD_OUTPUT_DIR), getTaskQueuePath() in openclawKnowledge. All code changes by the consumer must be on a new branch with a PR, never on main.

**Where to look:**
- Sentinel suggest action: `src/plugins/plugin-sentinel/src/actions/sentinelSuggest.action.ts`
- Sentinel ship action: `src/plugins/plugin-sentinel/src/actions/sentinelShip.action.ts`
- PRD generator: `src/plugins/plugin-sentinel/src/services/prdGenerator.service.ts`
- OpenClaw knowledge: `src/plugins/plugin-sentinel/src/services/openclawKnowledge.service.ts`
- Project radar: `src/plugins/plugin-sentinel/src/services/projectRadar.service.ts`
- Impact scorer: `src/plugins/plugin-sentinel/src/services/impactScorer.service.ts`
- Weekly/daily tasks: `src/plugins/plugin-sentinel/src/tasks/`
- Sentinel agent: `src/agents/sentinel.ts`

**How to contribute:** The bridge is in place: when `SENTINEL_SHIP_WRITE_OPENCLAW_TASK=true` or `SENTINEL_WEEKLY_WRITE_OPENCLAW_TASK=true`, Sentinel writes structured task briefs (JSON) to `docs/standup/openclaw-queue/`. Coding agents poll that directory; see [docs/standup/OPENCLAW_TASK_CONTRACT.md](docs/standup/OPENCLAW_TASK_CONTRACT.md) for schema and consumer contract. You can extend the adapter (script, MCP tool, or OpenClaw integration) that reads the queue, creates a branch, and opens a PR. The key constraint: all code changes happen on a new branch with a PR, never on main.

### Per-agent improvement notes

Beyond the seven priorities above, each agent has specific gaps that a contributor can pick up. These are smaller in scope but high-value if you want to focus on a single agent.

| Agent | What's working | What needs improvement |
|-------|---------------|----------------------|
| **ECHO** | X research via X_PULSE is our best feature. Finds real narratives (PLTR defense AI thesis) that become trades. | Push for even sharper theses. More accounts in watchlist, better filtering of noise vs signal. The bar is "would a PM at a crypto fund read this and act on it?" |
| **Oracle** | Polymarket discovery and odds display work. | Insights are underwhelming. Oracle should connect prediction market odds to trading decisions: "Warsh at 95% for Fed chair + Iran strike at 28% = macro regime X, which means Y for our positions." Right now it lists odds without interpretation. See `src/plugins/plugin-polymarket-discovery/`. |
| **Otaku** | Architecture for DeFi execution exists (BANKR, CDP, Morpho, Relay, x402). | Needs a real dev to get to [WEB4-level](knowledge/teammate/WEB4.md) autonomous agent economics: x402 payments, ClawRouter integration, agents paying for their own compute with USDC from their wallet. Wallet config (EVM/Solana keys) is step 1; x402 and autonomous transactions are the north star. See `src/plugins/plugin-otaku/` and `docs/OTAKU.md`. |
| **Sentinel** | Proactive suggestions, PRDs, project radar, impact scoring all work. | Should be more aware of what we actually pushed to GitHub (read recent commits, PRs, changed files). Should proactively read all `.md` docs in the repo and suggest priorities, issues, and features as structured PRDs that Cursor, Codex, or OpenClaw can consume. The weekly task exists but doesn't go deep enough into the codebase. See `src/plugins/plugin-sentinel/` and `docs/SENTINEL.md`. |
| **Clawterm** | OpenClaw research terminal works for basic lookups. | Should actively monitor X for OpenClaw and Milaidy.ai updates, new skills, new integrations. Right now it reports what it finds on request; it should proactively flag new developments. Watchlist for @openclaw, @milaidy_ai, and related accounts. See `src/agents/clawterm.ts` and `src/plugins/plugin-x-research/`. |
| **Kelly** | Standup facilitation and Day Report synthesis work. Plugin-personality self-modification is unique. | Restaurant and hotel recommendations need serious improvement. The lifestyle knowledge base (`knowledge/the-good-life/`) exists but is thin. Recommendations should be location-aware, season-aware, and pull from richer sources. If Kelly can recommend a specific restaurant in the city you're visiting with a reason why it fits, that's the bar. See `src/plugins/plugin-kelly/` and `knowledge/the-good-life/`. |

Each agent has a briefing doc in `docs/` (e.g. [ECHO.md](docs/ECHO.md), [ORACLE.md](docs/ORACLE.md), [OTAKU.md](docs/OTAKU.md), [SENTINEL.md](docs/SENTINEL.md), [KELLY.md](docs/KELLY.md)) with full can/cannot details and key files. Start there.

---

## Vision and current focus

VINCE started as a single data agent and grew into a **multi-agent system** on ElizaOS: VINCE (data + paper bot), Eliza (knowledge), ECHO (CT sentiment), Oracle (Polymarket), Solus (Hypersurface options), Otaku (DeFi execution), Kelly (lifestyle + standup), Sentinel (ops + cost), Clawterm (OpenClaw), Naval (synthesis). One conversation; ask any teammate by name. Standups 2x/day; Kelly synthesizes the Day Report.

**Goal:** Push, not pull. Proactive intel (ALOHA, paper bot, day report) so you stay in the game without living on screens. No hype, no shilling, no timing the market.

**Current priorities:**

1. **Multi-agent insight quality** — Standup and Day Report should surface connections across agents, not just concatenate individual outputs. See [above](#1-multi-agent-standup-prove-that-1--1--3).
2. **X research to paper trade pipeline** — End-to-end loop from CT narrative discovery to automated paper trade. See [above](#2-x-research-to-paper-trade-pipeline-the-thing-that-works).
3. **Paper bot trade lifecycle** — WHY narratives, exit notifications, and fast-TP mode are in place; run with `VINCE_PAPER_FAST_TP=true` to reach 90+ closed trades and unlock ONNX training. See [above](#3-paper-bot-trade-lifecycle-better-why-faster-tp1-more-training-data).
4. **Automated daily briefings** — ALOHA, perps, options, news, HIP-3, and Day Report pushed to Discord and Slack every morning without prompting. See [above](#4-automated-daily-briefings-push-not-pull).
5. **Knowledge ingestion and content production** — Eliza UPLOAD working on Slack (not just Discord), and WRITE_ESSAY drafts good enough to publish on Substack. See [above](#5-knowledge-ingestion-and-substack-content-production-by-eliza).
6. **Solus options context** — Portfolio awareness (cost basis, current holdings, open positions) and daily monitoring instead of weekly-only. See [above](#6-solus-options-context-portfolio-awareness-and-daily-monitoring).
7. **Sentinel to OpenClaw** — AI agent that ships code improvements on new branches from Sentinel's proactive suggestions. See [above](#7-sentinel-to-openclaw-ai-agent-shipping-code-improvements).
8. **Stability and correctness** — Paper bot behavior, standup flow, cross-agent handoffs, type-check and tests green.
9. **Security and safe defaults** — No execution without explicit paths; Otaku is the only agent with a funded wallet; env and secrets documented in `.env.example`.
10. **Documentation and onboarding** — Agent briefs ([docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md)), CLAUDE.md, and plugin WHAT/WHY/HOW stay accurate so OpenClaw and humans can contribute.

**Next priorities:**

- Paper bot ML loop hardening (feature store, ONNX, VinceBench).
- Broader model and channel support (already multi-provider; more channels as needed).
- OpenClaw integration (adapter, skills, MCP where it fits).
- Performance and test coverage (especially plugin-vince and plugin-inter-agent).

---

## Contribution rules

- **One PR = one issue or topic.** Do not bundle unrelated fixes or features. Keeps review focused and history readable.
- **PRs over ~5,000 changed lines** are reviewed only in exceptional circumstances. Prefer smaller, reviewable chunks.
- **Do not open large batches of tiny PRs at once.** Each PR has review cost. For several related one-liners or config tweaks, one focused PR is encouraged.
- **Run the bar before opening a PR:** `bun run type-check`, `bun run format:check`, and tests (e.g. `bun test src/plugins/plugin-inter-agent` or full `bun run test`). See [CLAUDE.md](CLAUDE.md) for scripts.
- **Match project voice.** Brand voice in [CLAUDE.md](CLAUDE.md): benefit-led, confident, zero AI-slop jargon. Same applies to docs and commit messages: concrete, human language.

---

## Security

We treat security as a deliberate tradeoff: **strong defaults without killing capability.** The paper bot and Otaku are the only execution paths; Otaku is the only agent with a funded wallet. We do not want convenience wrappers that hide critical decisions (keys, execution, env) from operators.

- **Secrets:** Use `.env` (gitignored); never commit keys. [.env.example](.env.example) is the single source of truth for structure; `node scripts/reorder-env.js` keeps local `.env` aligned.
- **Reporting:** For security-sensitive issues, report privately (e.g. maintainer contact or private disclosure path). We will add a `SECURITY.md` when we formalize the process; until then, avoid opening public issues for vulnerabilities.
- **Execution:** All live trading and DeFi execution goes through Otaku and documented actions (BANKR, CDP, Morpho, etc.). No "hidden" execution paths in core.

---

## Agents and plugins

**Core stays lean.** Agents live in `src/agents/*.ts`; capabilities live in `src/plugins/*`. Each agent has a **brief** in `docs/` (e.g. [VINCE.md](docs/VINCE.md), [OTAKU.md](docs/OTAKU.md)): what they can do, cannot yet do, key files, and "For OpenClaw / PRD" focus.

- **Adding or changing an agent:** Update the agent file, export from `src/index.ts`, and update or add the corresponding doc in `docs/`. Keep [docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md) in sync.
- **Plugins:** New behavior that fits a clear lane (e.g. a new data source, a new channel) should usually be a plugin or an extension of an existing plugin. The bar for adding optional plugins to the repo is high; prefer hosting in your own repo and documenting in README or docs when it's community-maintained.
- **Paper bot and ML:** [src/plugins/plugin-vince/](src/plugins/plugin-vince/) is the core. WHAT, WHY, HOW, and CLAUDE there are the source of truth. Feature store: [docs/FEATURE-STORE.md](docs/FEATURE-STORE.md). Training and ONNX: [docs/PAPER-BOT-AND-ML.md](docs/PAPER-BOT-AND-ML.md), [docs/ONNX.md](docs/ONNX.md).

---

## Standups and Day Report

Standup is turn-based (VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel → Clawterm → Naval); Kelly facilitates and then generates the **Day Report**. Implementation lives in [src/plugins/plugin-inter-agent/](src/plugins/plugin-inter-agent/).

- **Format and style:** Reports and Day Report should read like a message to a friend — direct, human, no log-speak. ALOHA style and constraints are in `standupStyle.ts` and `standupReports.ts`.
- **Structured output:** Only canonical `signals` (array of `{ asset, direction, confidence_pct }`) or `call` (Solus) blocks are kept; other JSON is stripped so output stays clean.
- **Action items:** Parsed from the Day Report into `docs/standup/action-items.json`; Ralph loop can process them when enabled. Changes to parsing or Ralph should keep the contract in [docs/standup/](docs/standup/) consistent.

---

## Setup and checks

- **Runtime:** Bun required. `bun install`, `cp .env.example .env`, then fill keys. See [README.md](README.md) and [docs/CONFIGURATION.md](docs/CONFIGURATION.md).
- **Dev:** `elizaos dev` (hot-reload) or `bun start`. Web UI: port 5173 when running `bun start`.
- **Quality:** `bun run type-check`, `bun run format:check`, `bun run test` (or `bun run check-all`). Fix lint and type errors before opening a PR.

---

## Why TypeScript and ElizaOS

VINCE is built on **ElizaOS**: orchestration, prompts, tools, and integrations. **TypeScript** was chosen so the stack stays hackable: widely known, fast to iterate, and easy to read and extend. Agents and plugins are in TypeScript; the paper bot's training pipeline is Python (scripts in plugin-vince); we keep the boundary clear and documented.

---

## What we will not merge (for now)

This list is a **roadmap guardrail**, not a law. Strong user need or a strong technical case can change it.

- **New agents** that duplicate an existing lane without a clear product or architectural reason.
- **Execution paths** that bypass Otaku for funded operations (swap, bridge, etc.).
- **Bulk changes** to agent personality or brand voice without alignment in CLAUDE.md and docs.
- **New mandatory dependencies** that are not already in the ecosystem (ElizaOS, model providers, DB). Optional plugins can depend on more.
- **First-class MCP or OpenClaw runtime in core** when adapter/bridge patterns already provide the integration path.
- **Heavy orchestration layers** that duplicate existing agent, handoff, and standup machinery.
- **Full-doc translation sets** for all docs (deferred; we may consider AI-assisted translations later).

---

## One team, one dream

We iterate fast and prefer clarity over process. If in doubt, open an issue or a small PR and we'll align. Thanks for considering contributing to VINCE.
