# Sentinel: ElizaOS Examples Exploration Priorities

**Audience:** Sentinel (core dev agent). **Purpose:** Prioritized list and briefing so Sentinel can explore [elizaOS/examples](https://github.com/elizaOS/examples) and suggest improvements to VINCE (paper bot, multi-agent, DeFi, knowledge, ops).

**Project context (VINCE):** Unified data-intelligence agent (options, perps, memes, lifestyle, art) with a **self-improving paper trading bot** at the core. Multi-agent: Vince (data), Kelly (lifestyle), Solus (wealth architect), Otaku (only funded wallet, DeFi), Eliza (knowledge), Sentinel (ops, ONNX, ART, clawdbot). Key code: src/agents/vince.ts, src/plugins/plugin-vince/, FEATURE-STORE.md, docs/SOLUS_NORTH_STAR.md.

---

## Example README URLs (canonical list)

- Trader: https://github.com/elizaOS/examples/blob/main/trader/README.md
- Polymarket: https://github.com/elizaOS/examples/blob/main/polymarket/README.md
- LP Manager: https://github.com/elizaOS/examples/blob/main/lp-manager/README.md
- Convex: https://github.com/elizaOS/examples/blob/main/convex/README.md
- Code (Eliza Code): https://github.com/elizaOS/examples/blob/main/code/README.md
- Browser-use: https://github.com/elizaOS/examples/blob/main/browser-use/README.md
- Browser-extension: https://github.com/elizaOS/examples/blob/main/browser-extension/README.md

---

## Priority 1 — Trader (Auto Trader)

**Source:** [trader/README.md](https://github.com/elizaOS/examples/blob/main/trader/README.md)

**What it is:** Simple trading UI + `@elizaos/plugin-auto-trader`: Solana wallet, strategy selection (LLM, Momentum, Mean-Reversion, Rule-based), paper vs live, position monitor, trade history. Safety: honeypot detection, RugCheck, token age filter, liquidity/volume checks, position limits, stop-loss, daily loss limits.

**Why priority 1:** Vince already has a **paper trading bot** (ML loop, feature store, ONNX) and 24/7 market research as top priority. The trader example is the closest to our domain.

**How it could improve VINCE:**

- **Paper bot hardening:** Adopt safety patterns (honeypot/rug checks, min liquidity/volume, position caps) in plugin-vince paper execution or in a "live-ready" checklist even if we stay paper-only.
- **Strategy patterns:** LLM strategy in the example (Birdeye + AI for trending tokens, stop-loss/take-profit) could inform Solus/Vince signal flow or a future "suggested trade" path without committing to live trading.
- **UI reference:** If we ever ship a small "trader" dashboard (positions, history), the example's React layout (WalletSetup, TradingPanel, PositionList, TradeHistory, StrategySelect) is a useful template.

**Exploration tasks for Sentinel:**

1. Compare plugin-auto-trader's strategy interface and safety hooks to plugin-vince's paper bot flow; document reusable patterns in sentinel-docs.
2. Check whether RugCheck/honeypot-style checks are already in plugin-vince or plugin-defillama/etherscan; suggest a short "safety checklist" for paper/live boundary.
3. Add a line to Sentinel's knowledge (e.g. internal-docs or sentinel-docs) pointing to the trader example and when to recommend it (e.g. "user asks about live trading or strategy UI").

**Safety alignment (plugin-auto-trader vs plugin-vince):** See TRADER_SAFETY_ALIGNMENT.md in this directory.

---

## Priority 2 — Polymarket

**Source:** [polymarket/README.md](https://github.com/elizaOS/examples/blob/main/polymarket/README.md)

**What it is:** Autonomous Polymarket demo agent with CLI: `verify` (config + wallet), `once` (one decision tick), `run` (loop). Uses plugin-evm + plugin-polymarket, CLOB API; exit codes and stderr for supervision/monitoring.

**Why priority 2:** We already have **plugin-polymarket-discovery** (src/plugins/plugin-polymarket-discovery/) and `@polymarket/sdk` in package.json. The example shows a clean "once/run" loop and production hygiene we can align with.

**How it could improve VINCE:**

- **CLI pattern:** A `verify` / `once` / `run` style CLI for Polymarket flows (e.g. "run one discovery cycle" or "check positions") would improve scriptability and cron/supervisor integration.
- **Monitoring:** Adopt exit codes 0/1 and stderr for scripts that drive Polymarket so standups or external monitors can detect failures.
- **Plugin alignment:** Ensure our plugin-polymarket-discovery actions (getActiveMarkets, getMarketPrice, getUserPositions, etc.) and the official plugin-polymarket CLOB usage are documented in one place for Solus/Otaku or future prediction flows.

**Exploration tasks for Sentinel:**

1. Map example's `once`/`run` flow to our plugin-polymarket-discovery; propose a small CLI or npm script (e.g. `bun run polymarket:once`) that runs one "tick" using our plugin.
2. Document in sentinel-docs: Polymarket example URL, when to use plugin-polymarket vs plugin-polymarket-discovery, and suggested monitoring (exit codes, logs).
3. If Convex or another backend is added later, note how the example's "execute only with `--execute`" pattern could apply to any live-trade or order path.

**Script and exit codes:** See POLYMARKET_CLI.md in this directory.

---

## Priority 3 — LP Manager

**Source:** [lp-manager/README.md](https://github.com/elizaOS/examples/blob/main/lp-manager/README.md)

**What it is:** Autonomous LP management agent: multi-chain (Solana: Raydium, Orca, Meteora; EVM: Uniswap V3, PancakeSwap V3, Aerodrome), rebalancing when net gain exceeds threshold, rebalancable vs locked positions, opportunity scoring, concentrated liquidity monitoring.

**Why priority 3:** **Otaku** is the only agent with a funded wallet and owns DeFi (Morpho, yield, CDP). LP management is adjacent to our stack and could be an Otaku lane or a future plugin.

**How it could improve VINCE:**

- **Otaku capabilities:** Explore whether `@elizaos/plugin-lp-manager` (or the example's patterns) should be recommended when users ask about yield optimization, rebalancing, or multi-DEX positions.
- **Architecture:** If we add LP features, keep them in Otaku's lane (wallet + DeFi) and avoid duplicating logic in Vince; document in Sentinel's architecture briefs.
- **Config pattern:** Example's env (e.g. `LP_CHECK_INTERVAL_MS`, `LP_MIN_GAIN_THRESHOLD_PERCENT`, `LP_AUTO_REBALANCE_ENABLED`) is a good template for "autonomous DeFi agent" config; reuse pattern for any future autonomous tasks.

**Exploration tasks for Sentinel:**

1. Add LP Manager example to Sentinel's knowledge (sentinel-docs); when someone asks "yield optimization" or "LP rebalancing," suggest the example and plugin-lp-manager.
2. In a task brief or internal-docs, state clearly: LP/liquidity automation = Otaku's lane; Vince = data/signals; Solus = plan/call.
3. Optional: Sketch a one-page "Otaku + LP" integration (what would need to change in Otaku's character/plugins to support plugin-lp-manager) and drop it in standup-deliverables or sentinel-docs.

---

## Priority 4 — Convex

**Source:** [convex/README.md](https://github.com/elizaOS/examples/blob/main/convex/README.md)

**What it is:** ElizaOS agent as Convex backend: HTTP router (POST /chat, GET /health, GET /messages), Node action that runs `runtime.messageService.handleMessage`, messages persisted in Convex for real-time subscriptions.

**Why priority 4:** We deploy via **Eliza Cloud** and use PGLite/Postgres + optional Supabase (DEPLOY.md, FEATURE-STORE.md). Convex is an alternative persistence and hosting model.

**How it could improve VINCE:**

- **Real-time UX:** If the frontend or standup dashboard needs "live" message updates without polling, Convex's subscription model is a reference; we could achieve similar with our current stack (e.g. Supabase realtime or WebSockets) but the example documents the pattern.
- **Deploy diversity:** For cost or regional reasons, Convex might be a second deployment target; Sentinel can note "Convex = optional alternative backend" in DEPLOY or sentinel-docs.
- **handleMessage pattern:** The example reinforces using `messageService.handleMessage` as the single entry point for chat; ensure our flows (Discord, Direct, standup) all go through the same path where possible.

**Exploration tasks for Sentinel:**

1. Document in sentinel-docs: Convex example URL, when to consider it (real-time subscriptions, serverless, alternative to current DB), and that we are not switching by default.
2. Verify our code paths (e.g. plugin-direct, Discord) use the same handleMessage-style entry so we stay compatible with examples and future backends.
3. If we add a "realtime dashboard" for standups or agent status, reference Convex's subscription pattern and equivalent options (Supabase realtime, SSE) in a short architecture note.

---

## Priority 5 — Code (Eliza Code)

**Source:** [code/README.md](https://github.com/elizaOS/examples/blob/main/code/README.md)

**What it is:** Async coding agent terminal app: dual-pane (chat + task list), async task execution, multiple chat rooms, plugin-agent-orchestrator (CREATE_TASK, LIST_TASKS, etc.) + plugin-shell; worker sub-agents do file/shell work.

**Why priority 5:** **Sentinel** produces task briefs for Claude 4.6 and instructions for Claude Code; we have standups and PRDs in standup-deliverables. The Code example is the closest to "agent-driven dev workflow."

**How it could improve VINCE:**

- **Task context injection:** Example injects ongoing task context into the agent; we could improve standup or Sentinel's suggestions by injecting "current PRDs" or "open tasks" into context (similar to SENTINEL_SUGGEST / task briefs).
- **Orchestrator pattern:** We use plugin-inter-agent for ASK_AGENT (MULTI_AGENT.md); the example's orchestrator (no filesystem tools, workers do the work) reinforces "thin coordinator, workers do execution"—useful for future dev workers (e.g. Milaidy) per MULTI_AGENT.
- **Dual-pane UX:** If we ever build a "Sentinel dev dashboard," a chat + task pane could improve visibility of PRDs and task status.

**Exploration tasks for Sentinel:**

1. Add Eliza Code example to Sentinel's knowledge; when asked "how do we run coding tasks" or "task briefs for Claude," reference the example's orchestrator + worker split.
2. Suggest one concrete improvement: e.g. "include list of open standup-deliverables/ PRDs in the context when generating SENTINEL_SUGGEST or task briefs."
3. In a task brief template (for Claude Code), add a line: "Prefer orchestrator pattern: this agent coordinates; file/shell work is done by workers or human."

---

## Priority 6 — Browser-use

**Source:** [browser-use/README.md](https://github.com/elizaOS/examples/blob/main/browser-use/README.md)

**What it is:** Autonomous web exploration agent (QuantumExplorer): shared character.json, ArXiv search, initial/followup prompt templates, autonomy mode (task-based); TypeScript, Python, Rust implementations.

**Why priority 6:** We have **browser automation** in plugin-vince (Puppeteer fallback for MandoMinutes in newsSentiment.service.ts), and **Eliza** + **clawdbot** for knowledge/research. Browser-use is about structured autonomous research.

**How it could improve VINCE:**

- **Research pipeline:** Align clawdbot/knowledge pipeline with "autonomous exploration" pattern: e.g. topic → initial query → followup queries → store results (could feed knowledge base or intelligence_log-style memory as in Solus north star).
- **Shared character config:** Example uses a single character.json for multiple runtimes; we use code-based characters (src/agents/); no change required, but useful to know for any future "research agent" that shares config across envs.
- **Browser automation:** When improving MandoMinutes or adding new scrapes, reference browser-use's flow (navigate → extract → followup) and our existing Puppeteer fallback so we don't duplicate patterns.

**Exploration tasks for Sentinel:**

1. Document browser-use in sentinel-docs; when "autonomous research" or "web exploration" is discussed, suggest the example and tie to clawdbot/knowledge pipeline.
2. In a short internal doc, compare our MandoMinutes flow (Puppeteer, cache, fetch fallback) to browser-use's flow; note any reusable pieces (e.g. retry, timeout, content extraction).
3. Optional: Add to Sentinel's ART/examples knowledge: "browser-use = research/exploration; we use similar ideas for news + knowledge ingestion."

---

## Priority 7 — Browser-extension

**Source:** [browser-extension/README.md](https://github.com/elizaOS/examples/blob/main/browser-extension/README.md)

**What it is:** "Chat with any webpage" extension: Chrome/Safari, multiple AI providers, page content provider injects current page into context, API keys in local storage, streaming.

**Why priority 7:** Lower immediate impact; we don't currently ship a browser extension. Still useful for product and support.

**How it could improve VINCE:**

- **User-facing product:** A "chat with our docs/dashboard" extension could let users ask questions about the app or reports without leaving the page; good for power users or support.
- **Page content provider pattern:** Same pattern we use for "inject context" (e.g. knowledge, recent messages); the example's implementation is a reference for any future "inject current URL/content" feature.
- **Multi-provider + streaming:** Aligns with our multi-agent and multi-model setup; extension code shows how to switch providers and stream in a small client.

**Exploration tasks for Sentinel:**

1. Add browser-extension example to sentinel-docs as "future option: chat with docs/dashboard"; no implementation commitment.
2. If we ever scope a "support" or "in-app help" feature, reference the example's page-content provider and streaming for design.
3. Keep in ART/examples list so Sentinel can suggest it when someone asks "how to let users chat with our product UI."

---

## Summary Table

| Priority | Example           | Main link to VINCE                                  | Primary beneficiary                   |
| -------- | ----------------- | --------------------------------------------------- | ------------------------------------- |
| 1        | Trader            | Paper bot safety, strategy patterns, future UI      | Vince, Sentinel                       |
| 2        | Polymarket        | CLI (verify/once/run), monitoring, plugin alignment | plugin-polymarket-discovery, Sentinel |
| 3        | LP Manager        | Otaku DeFi lane, yield/LP automation                | Otaku, Sentinel                       |
| 4        | Convex            | Real-time subscriptions, optional backend           | Deploy, frontend                      |
| 5        | Code              | Task context, orchestrator pattern, dev workflow    | Sentinel, standups                    |
| 6        | Browser-use       | Research/knowledge, browser automation pattern      | Eliza, clawdbot, plugin-vince         |
| 7        | Browser-extension | Future "chat with docs/dashboard"                   | Product, support                      |

---

## X Research (Sentinel grind)

X Research is an ongoing Sentinel priority: improve [X-RESEARCH.md](X-RESEARCH.md) and fully explore [rohunvora/x-research-skill](https://github.com/rohunvora/x-research-skill) to improve our vendored skills/x-research and docs. See [SENTINEL_X_RESEARCH_PRIORITY.md](SENTINEL_X_RESEARCH_PRIORITY.md).

---

## Updates

When new examples are added or priorities change, update this file and optionally mention in PROGRESS-CONSOLIDATED or standup notes. Run `scripts/sync-sentinel-docs.sh` after editing so sentinel-docs stays in sync.
