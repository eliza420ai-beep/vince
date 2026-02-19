# Contributing to VINCE

**VINCE** is unified data intelligence for options, perps, memes, DeFi, lifestyle, and art — with a **self-improving paper trading bot** at the core. Ten agents, one team, one dream.

This document explains how to contribute and what we optimize for. We’ve shipped hundreds of commits to reach **v3.3** and welcome fresh eyes: clear PRs, focused scope, and alignment with the roadmap below.

- **Project overview and dev guide:** [README.md](README.md) · [CLAUDE.md](CLAUDE.md)  
- **Contribution guide:** this file (CONTRIBUTING.md)

---

## Vision and current focus

VINCE started as a single data agent and grew into a **multi-agent system** on ElizaOS: VINCE (data + paper bot), Eliza (knowledge), ECHO (CT sentiment), Oracle (Polymarket), Solus (Hypersurface options), Otaku (DeFi execution), Kelly (lifestyle + standup), Sentinel (ops + cost), Clawterm (OpenClaw), Naval (synthesis). One conversation; ask any teammate by name. Standups 2×/day; Kelly synthesizes the Day Report.

**Goal:** Push, not pull. Proactive intel (ALOHA, paper bot, day report) so you stay in the game without living on screens. No hype, no shilling, no timing the market.

**Current priorities:**

1. **Stability and correctness** — Paper bot behavior, standup flow, cross-agent handoffs, type-check and tests green.
2. **Security and safe defaults** — No execution without explicit paths; Otaku is the only agent with a funded wallet; env and secrets documented in `.env.example`.
3. **Standup and Day Report quality** — Readable, friend-like output; canonical JSON only; action items and Ralph loop reliable.
4. **Documentation and onboarding** — Agent briefs ([docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md)), CLAUDE.md, and plugin WHAT/WHY/HOW stay accurate so OpenClaw and humans can contribute.

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
- **Execution:** All live trading and DeFi execution goes through Otaku and documented actions (BANKR, CDP, Morpho, etc.). No “hidden” execution paths in core.

---

## Agents and plugins

**Core stays lean.** Agents live in `src/agents/*.ts`; capabilities live in `src/plugins/*`. Each agent has a **brief** in `docs/` (e.g. [VINCE.md](docs/VINCE.md), [OTAKU.md](docs/OTAKU.md)): what they can do, cannot yet do, key files, and “For OpenClaw / PRD” focus.

- **Adding or changing an agent:** Update the agent file, export from `src/index.ts`, and update or add the corresponding doc in `docs/`. Keep [docs/AGENTS_INDEX.md](docs/AGENTS_INDEX.md) in sync.
- **Plugins:** New behavior that fits a clear lane (e.g. a new data source, a new channel) should usually be a plugin or an extension of an existing plugin. The bar for adding optional plugins to the repo is high; prefer hosting in your own repo and documenting in README or docs when it’s community-maintained.
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

VINCE is built on **ElizaOS**: orchestration, prompts, tools, and integrations. **TypeScript** was chosen so the stack stays hackable: widely known, fast to iterate, and easy to read and extend. Agents and plugins are in TypeScript; the paper bot’s training pipeline is Python (scripts in plugin-vince); we keep the boundary clear and documented.

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

We iterate fast and prefer clarity over process. If in doubt, open an issue or a small PR and we’ll align. Thanks for considering contributing to VINCE.
