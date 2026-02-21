# SATOSHI — OpenClaw assistant instructions

You are the **OpenClaw assistant** for the VINCE repo: an ElizaOS multi-agent project (options, perps, memes, lifestyle, art) with a self-improving paper trading bot at the core. When you arrive, read this first. Your job is to keep grinding: implement queued work, then systematically review and improve every agent and the plugins they use.

---

## Where you are

### Four home directories

| Directory            | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **openclaw-agents/** | Sub-agents (alpha, market-data, onchain, news), orchestrator, Brain/Muscles/Bones/DNA/Soul/Eyes/Heartbeat/Nerves flows, workspace templates. Run agents here; workspace files sync to `knowledge/teammate/` and `~/.openclaw/workspace/`. See [openclaw-agents/README.md](openclaw-agents/README.md).                                                                                                                   |
| **vault/**           | Knowledge vault (Claude Code / Obsidian): inbox, todos (01-todos), project context (02-projects/vince/CLAUDE.md), meetings (06-meetings), standup sync. Use for capture, task flow, meeting notes. See [vault/README.md](vault/README.md).                                                                                                                                                                              |
| **skills/**          | Cursor/Claude skills: **x-research** (X/Twitter search, thread, watchlist), **trading-agent** (EVClaw reference — Hyperliquid perps/HIP3). See [skills/x-research/README.md](skills/x-research/README.md), [skills/trading-agent/README.md](skills/trading-agent/README.md).                                                                                                                                 |
| **tasks/**           | Working notes, lessons, frontend quickstarts, todo. Task backlogs and team notes. See [tasks/README.md](tasks/README.md).                                                                                                                                                                                                                                                                                               |

### Resident dev: Sentinel and docs

**Sentinel** is the core dev agent. Use these when you need PRDs, architecture, cost, or OpenClaw integration:

| Where | What |
| ----- | ---- |
| [src/agents/sentinel.ts](src/agents/sentinel.ts) | Sentinel character and plugin wiring |
| [docs/SENTINEL.md](docs/SENTINEL.md) | Agent brief: can/cannot, PRDs, cost, OpenClaw guide |
| [docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md) | Index of all agent briefs (one doc per agent) |
| [docs/](docs/) | Project docs: [TRADING_RUNTIME_CONTRACT.md](docs/TRADING_RUNTIME_CONTRACT.md), [TREASURY.md](docs/TREASURY.md), [MULTI_AGENT.md](docs/MULTI_AGENT.md), [FEATURE-STORE.md](docs/FEATURE-STORE.md), [DEPLOY.md](docs/DEPLOY.md), [CONFIGURATION.md](docs/CONFIGURATION.md), [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md), plus per-agent briefs (ELIZA.md, VINCE.md, ECHO.md, ORACLE.md, SOLUS.md, OTAKU.md, KELLY.md). |
| [knowledge/sentinel-docs/](knowledge/sentinel-docs/) | Sentinel RAG knowledge: [OPENCLAW_ADAPTER.md](knowledge/sentinel-docs/OPENCLAW_ADAPTER.md), [PRD_AND_MILAIDY_OPENCLAW.md](knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md), [TREASURY.md](knowledge/sentinel-docs/TREASURY.md), [CLAUDE.md](knowledge/sentinel-docs/CLAUDE.md), NORTH_STAR_DELIVERABLES, STANDUP_DELIVERABLES, plugin deep-refs, X-RESEARCH, DEPLOY, MULTI_AGENT, etc. Synced by `scripts/sync-sentinel-docs.sh`. |
| [CLAUDE.md](CLAUDE.md) | Project dev guide: structure, agents, plugins, brand voice, env, testing. Read for coding and agent work. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute: PRs, branching, code style, what to update when you change things. |

See also [OPENCLAW.md](OPENCLAW.md) for workspace orientation.

---

## Knowledge, vault, tasks, and skills

### Expand and use knowledge/

RAG knowledge is under **knowledge/**; agents load it by directory (see character `knowledge` in each [src/agents/](src/agents/)). Expand these when you add flows or document behavior:

| Directory | Purpose | Expand by |
| --------- | ------- | --------- |
| [knowledge/setup-guides/](knowledge/setup-guides/) | Setup, security, Clawdbot/OpenClaw install, proactive agents. Key files: [openclaw-security.md](knowledge/setup-guides/openclaw-security.md), [clawd-security.md](knowledge/setup-guides/clawd-security.md), [clawdbot-24-7-ai-agent-setup.md](knowledge/setup-guides/clawdbot-24-7-ai-agent-setup.md), [proactive-ai-agents-methodology.md](knowledge/setup-guides/proactive-ai-agents-methodology.md). | Adding new setup or runbook guides when you document a flow (e.g. new skill install, env, or security step). |
| [knowledge/clawterm/](knowledge/clawterm/) | Clawterm/OpenClaw terminal: how-to-run, architecture, skills ecosystem, HIP-3 AI assets, AI 2027, ClawIndex. Key: [README.md](knowledge/clawterm/README.md), [openclaw-agents-how-to-run.md](knowledge/clawterm/openclaw-agents-how-to-run.md), [skills-ecosystem-deep-reference.md](knowledge/clawterm/skills-ecosystem-deep-reference.md), [HIP3_AI_ASSETS.md](knowledge/clawterm/HIP3_AI_ASSETS.md). | Adding Clawterm/OpenClaw tips, new skills references, or HIP-3/terminal docs when you add features. |
| [knowledge/clawdbot/](knowledge/clawdbot/) | Clawdbot/OpenClaw operator: instructions, one-click install, practical tips, X research follows. Key: [README.md](knowledge/clawdbot/README.md), [instructions-clawdbot.md](knowledge/clawdbot/instructions-clawdbot.md), [openclaw-practical-tips.md](knowledge/clawdbot/openclaw-practical-tips.md). | Adding operator workflows, one-click flows, or curated lists when you document them. |
| [knowledge/teammate/](knowledge/teammate/) | Shared context for agents: USER, SOUL, NO-AI-SLOP, THREE-CURVES, AGENTS, TOOLS, MEMORY, IDENTITY, HEARTBEAT, POLYMARKET_PRIORITY_MARKETS, WEB4. Synced from openclaw-agents/workspace when using Brain/workspace flows. | Adding shared principles or priorities; keep in sync with [openclaw-agents/workspace/](openclaw-agents/workspace/) AGENTS.md, USER.md, etc. when relevant. |

When you add a new guide or deep-reference, put it in the right knowledge subdir so the right agent (Sentinel, Clawterm, Kelly, etc.) can ingest it via RAG.

### Expand skills/

**skills/** holds Cursor/Claude and OpenClaw-oriented skills (runbooks, references). Current: [skills/x-research/](skills/x-research/) (X search, thread, watchlist), [skills/trading-agent/](skills/trading-agent/) (EVClaw reference). To expand:

- Add a new folder under **skills/** with a **SKILL.md** (name, description, when to use) and optional **README.md** for setup/CLI.
- When you integrate uniswap-ai, claw-cash, openclaw-solana-plugins, or clawdbot-supermemory, add a skill stub or reference under skills/ and/or document in [OPENCLAW.md](OPENCLAW.md) or [openclaw-agents/README.md](openclaw-agents/README.md).
- Keep [skills/trading-agent/SKILL.md](skills/trading-agent/SKILL.md) as the EVClaw reference; mirror that pattern for other external stacks.

### Use vault/ and tasks/

- **vault/** — Knowledge vault (Claude Code / Obsidian): **01-todos/** (inbox → active → arxiv), **02-projects/vince/** (project CLAUDE.md), **06-meetings/** (standup sync). Use for capture, task flow, meeting notes. Run `bun run vault:standup` to sync standup into vault. See [vault/README.md](vault/README.md).
- **tasks/** — Working notes, lessons, backlogs: [tasks/README.md](tasks/README.md), [tasks/LESSONS-AND-IMPROVEMENTS.md](tasks/LESSONS-AND-IMPROVEMENTS.md), [tasks/todo.md](tasks/todo.md), [tasks/lessons.md](tasks/lessons.md), frontend quickstarts. Use for team backlogs and “how we improved” notes; add entries when you complete an improvement or learn a lesson.

---

## What to do first (what's next)

1. **Task queue** — Check `docs/standup/openclaw-queue/` for JSON task briefs. Schema: [docs/standup/OPENCLAW_TASK_CONTRACT.md](docs/standup/OPENCLAW_TASK_CONTRACT.md).
   - Treat files without `consumedAt` as pending.
   - After consuming: set `consumedAt` (ISO timestamp) or move to `consumed/`.
   - Create a new branch from `branchName`; **never push to main**; open a PR.
2. **PRDs** — Implement or advance PRDs in `docs/standup/prds/` (or `standup-deliverables/prds/` if `STANDUP_DELIVERABLES_DIR` is set).
3. **Eliza tasks** — Apply items from `docs/standup/eliza-tasks/` when present.
4. **Standup action items** — Check `docs/standup/action-items.json` or standup deliverables for assigned work when applicable.
5. **If nothing is queued** — Default to the agent/plugin review mandate below.

### Improve [docs/standup/](docs/standup/) — priority

We **definitely want to improve** the standup pipeline and its outputs. **Priority:** improve the quality and usefulness of generated standup artifacts, especially **daily shared insights**.

- **Target example:** [docs/standup/daily-insights/](docs/standup/daily-insights/) — e.g. [2026-02-21-shared-insights.md](docs/standup/daily-insights/2026-02-21-shared-insights.md). These files aggregate VINCE, Eliza, ECHO, Oracle, etc. into one daily view. Improve structure, clarity, actionability, and cross-agent links (delta vs yesterday, knowledge gaps, content ideas). Prefer concrete improvements to templates, prompts, and post-processing so each run produces **better** daily-insights output.
- Also improve: day-reports, predictions, action-items, PRD list, and any other [docs/standup/](docs/standup/) outputs. When you touch standup code or prompts, consider impact on daily-insights first.

---

## Standing mandate: review and improve every agent and their plugins

On each visit (or when no task is queued), you are expected to **review and improve** every agent in `src/agents/` and the plugins they use.

### Agent map

| Agent    | File | Key plugins (project) | Brief |
| -------- | ---- | ---------------------- | ----- |
| Eliza    | [src/agents/eliza.ts](src/agents/eliza.ts) | plugin-eliza, plugin-inter-agent, plugin-x-research | Research, knowledge, UPLOAD; handoffs to VINCE |
| VINCE    | [src/agents/vince.ts](src/agents/vince.ts) | plugin-vince, plugin-inter-agent | Paper bot, ALOHA, options, perps; no execution |
| ECHO     | [src/agents/echo.ts](src/agents/echo.ts) | plugin-x-research, plugin-inter-agent, plugin-discovery | X pulse, vibe, watchlist; handoffs to VINCE |
| Oracle   | [src/agents/oracle.ts](src/agents/oracle.ts) | plugin-polymarket-discovery, plugin-polymarket-desk, plugin-polymarket-edge, plugin-inter-agent | Polymarket read-only; handoffs |
| Solus    | [src/agents/solus.ts](src/agents/solus.ts) | plugin-vince (no X), plugin-solus, plugin-inter-agent | Hypersurface options; strike ritual; no execution |
| Otaku    | [src/agents/otaku.ts](src/agents/otaku.ts) | plugin-otaku, plugin-bankr, plugin-cdp, plugin-morpho, plugin-relay, etc., plugin-inter-agent | Only agent with funded wallet; DeFi, Vince execution |
| Kelly    | [src/agents/kelly.ts](src/agents/kelly.ts) | plugin-kelly, plugin-inter-agent, plugin-discovery, plugin-personality | Lifestyle; ASK_AGENT orchestrator; self-modification |
| Sentinel | [src/agents/sentinel.ts](src/agents/sentinel.ts) | plugin-sentinel, plugin-inter-agent | PRDs, cost, OpenClaw guide, ART, weekly/daily tasks |
| Clawterm | [src/agents/clawterm.ts](src/agents/clawterm.ts) | plugin-openclaw, plugin-x-research, plugin-inter-agent | OpenClaw research terminal, HIP-3, skills |
| Naval    | [src/agents/naval.ts](src/agents/naval.ts) | plugin-inter-agent only | Naval-style wisdom; minimal plugins |

Full index: [docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md). Project layout: [CLAUDE.md](CLAUDE.md).

### Per-agent review checklist

For each agent, consider:

- **Character** — System prompt, bio, style, knowledge dirs. Aligned with [knowledge/teammate/NO-AI-SLOP.md](knowledge/teammate/NO-AI-SLOP.md) and brand voice (benefit-led, Porsche OG, no AI-slop)?
- **Plugins** — Are the right project plugins loaded? Any missing or redundant?
- **Actions** — Documented, tested, clear validate/handler boundaries?
- **Providers** — Do they inject the right context? Gaps or duplication?
- **Docs** — Is `docs/<AGENT>.md` up to date with "can / cannot yet" and "For OpenClaw / PRD"?

### Per-plugin (used by agents)

For each `src/plugins/plugin-*/` in use: check tests, README/CLAUDE, and that actions have examples and clear descriptions. Prefer improving **one agent and its plugins** per session when no task is queued.

---

## Skills to add and reference

Add or integrate these OpenClaw/ecosystem skills when relevant:

| Skill / repo | Purpose |
| ------------ | ------- |
| [IkigaiLabsETH/uniswap-ai](https://github.com/IkigaiLabsETH/uniswap-ai) | Uniswap skills, plugins, agents (v4 hooks, swap, CCA, driver, viem); for building on Uniswap from any coding agent. |
| [IkigaiLabsETH/claw-cash](https://github.com/IkigaiLabsETH/claw-cash) | Bitcoin wallet for AI agents; stablecoins in, Bitcoin out; keys in enclaves; works with OpenClaw/Claude Code. |
| [IkigaiLabsETH/openclaw-solana-plugins](https://github.com/IkigaiLabsETH/openclaw-solana-plugins) | OpenClaw Solana wallet plugin: wallet, Jupiter swap, opportunity scan, autonomous trading monitor. |
| [IkigaiLabsETH/clawdbot-supermemory](https://github.com/IkigaiLabsETH/clawdbot-supermemory) | Supermemory for Clawdbot/Molt: long-term memory, recall, user profile; cloud-based, auto-capture/recall. |

**Where they fit in VINCE:** uniswap-ai and openclaw-solana-plugins extend DeFi/swap capabilities (Otaku, Clawterm); claw-cash fits Bitcoin/treasury flows; clawdbot-supermemory fits Kelly or any agent needing persistent user memory. Add to `skills/` or OpenClaw config as needed; update [openclaw-agents/README.md](openclaw-agents/README.md) or [OPENCLAW.md](OPENCLAW.md) when integrated.

---

## Learn from EVClaw

**Repo:** [Degenapetrader/EVClaw](https://github.com/Degenapetrader/EVClaw) — OpenClaw AI trading agent for Hyperliquid (perps, HIP3).

**Patterns to adopt or mirror:**

- **AGI flow:** `cycle_trigger` → context builder → entry gate → executor → position tracking → exit producers → exit decider → executor close. Producers do not execute; executor is limit-first/chase-limit; DB is source of truth.
- **Operator contract:** `AGENTS.md` is canonical; scheduled cron uses only `CRON_CONTEXT` (not manual commands).
- **Deterministic ops:** Hourly/15m maintenance, reconciliation, safety checks.
- **Single wallet identity:** One address + delegated signer; never main wallet key.

**VINCE alignment:** [docs/TRADING_RUNTIME_CONTRACT.md](docs/TRADING_RUNTIME_CONTRACT.md) and [skills/trading-agent/SKILL.md](skills/trading-agent/SKILL.md) describe the producer/executor split; EVClaw is the reference implementation for live Hyperliquid. When improving plugin-vince or Otaku execution flows, consider EVClaw’s separation of entry gate, exit decider, and executor.

---

## Leverage the openclaw-adapter

**What it is:** [elizaOS/openclaw-adapter](https://github.com/elizaOS/openclaw-adapter) runs **Eliza plugins inside OpenClaw** (actions → tools, providers → hooks, services → services). Same plugin code can power both Eliza (VINCE) and an OpenClaw agent.

**When to consider:**

- Running an OpenClaw-based agent that needs wallet/swap/connector logic already implemented as Eliza plugins (e.g. plugin-evm, plugin-solana, or Otaku-related plugins).
- Dual-surface design: one codebase for VINCE (ElizaOS) and another product or partner on OpenClaw.

**Limitations** (from [knowledge/sentinel-docs/OPENCLAW_ADAPTER.md](knowledge/sentinel-docs/OPENCLAW_ADAPTER.md)): No LLM in adapter; DB in-memory; channel plugins become tools only. Best for tool-style actions (wallets, swaps) and context injection.

**Action:** When suggesting or implementing wallet/trading tools or multi-runtime design, reference the adapter and the doc above.
