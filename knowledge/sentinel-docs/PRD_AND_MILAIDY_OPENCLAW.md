# Sentinel: PRDs for Cursor + Milaidy / OpenClaw instructions

Sentinel owns two north-star deliverables that unblock the team in Cursor and with external runtimes:

1. **PRDs for Cursor** — Product Requirements Documents the team can paste or save and use **in Cursor** (or the Claude Code controller) when implementing. A PRD from Sentinel includes: goal and scope, user/caller story, acceptance criteria, technical constraints (plugin boundaries, agents thin, no duplicate lanes), architecture rules ("keep the architecture as good as it gets"), and optional out-of-scope. This complements the shorter "task brief for Claude 4.6" from SENTINEL_SUGGEST: the PRD is the full spec; the task brief is the pasteable block for a single session.

2. **Milaidy / OpenClaw instructions** — How to run and integrate [Milaidy](https://github.com/milady-ai/milaidy) and [OpenClaw](https://github.com/openclaw/openclaw) with VINCE so the team has clear setup and integration steps.

## Milaidy (milady-ai/milaidy)

- **What:** Personal AI assistant on ElizaOS. Gateway is the control plane; default port **18789**.
- **Install/run:** `npx milaidy` or `npm install -g milaidy` then `milaidy start`. Quick start: [GitHub – milady-ai/milaidy](https://github.com/milady-ai/milaidy).
- **VINCE integration:** When `MILAIDY_GATEWAY_URL` is set (e.g. `http://localhost:18789`), standup **build** action items are POSTed to `POST {MILAIDY_GATEWAY_URL}/api/standup-action` with body `{ description, assigneeAgentName?, source: "vince-standup" }`. If Milaidy implements this endpoint, it can run code/tools and return `deliverablePath` or `message`. See [STANDUP_DELIVERABLES.md](STANDUP_DELIVERABLES.md).

## OpenClaw (openclaw/openclaw)

- **What:** Personal AI assistant — multi-channel (WhatsApp, Telegram, Slack, Discord, etc.), Gateway-based. Different runtime from ElizaOS; [openclaw-adapter](https://github.com/elizaOS/openclaw-adapter) bridges Eliza plugins to OpenClaw.
- **Install/run:** `npm install -g openclaw@latest`, then `openclaw onboard --install-daemon` or `openclaw gateway --port 18789`. Docs: [openclaw.ai](https://openclaw.ai) / [GitHub – openclaw/openclaw](https://github.com/openclaw/openclaw).
- **VINCE integration:** Use the **openclaw-adapter** to run Eliza plugins (e.g. plugin-evm, plugin-solana) inside OpenClaw. See [OPENCLAW_ADAPTER.md](OPENCLAW_ADAPTER.md) in this folder.
- **Brain (operator mapping):** The **OpenClaw Brain** flow (Jarvis-style init) lives in this repo under `openclaw-agents/brain/`. Brain output (USER.md, SOUL.md, AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md, IDENTITY.md) is written to `openclaw-agents/workspace/` and can be synced to `knowledge/teammate/` for VINCE and to `~/.openclaw/workspace/` for the OpenClaw CLI. See [openclaw-agents/ARCHITECTURE.md](../../openclaw-agents/ARCHITECTURE.md) and [openclaw-agents/brain/README.md](../../openclaw-agents/brain/README.md).
- **RAG memory (professional use):** For professional use, a RAG-based memory solution (PostgreSQL + pgvector + search tool + memory heartbeat) is recommended so the agent remembers reliably without bloating context. See [PRD_OPENCLAW_RAG_MEMORY](../../docs/standup/prds/PRD_OPENCLAW_RAG_MEMORY.md).

When the standup assigns Sentinel to produce "PRD for Cursor" or "Milaidy/OpenClaw instructions", the north-star generator writes to `docs/standup/prds/` or `docs/standup/integration-instructions/`. See [NORTH_STAR_DELIVERABLES.md](NORTH_STAR_DELIVERABLES.md).

**PRD output path:** Sentinel's PRD generator uses `STANDUP_DELIVERABLES_DIR/prds` when that env is set (e.g. `docs/standup/prds/`), or `SENTINEL_PRD_OUTPUT_DIR` if set; otherwise `standup-deliverables/prds/`.

**OpenClaw task queue:** When `SENTINEL_SHIP_WRITE_OPENCLAW_TASK=true` or `SENTINEL_WEEKLY_WRITE_OPENCLAW_TASK=true`, Sentinel writes structured JSON task briefs to `docs/standup/openclaw-queue/` for AI coding agents. Schema and consumer contract: [docs/standup/OPENCLAW_TASK_CONTRACT.md](../../docs/standup/OPENCLAW_TASK_CONTRACT.md). All code changes must be on a new branch with a PR, never on main.
