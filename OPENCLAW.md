# OpenClaw workspace orientation

When you (OpenClaw) work on this repo — including the fork [eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince) — you're in the right place.

## Four home directories

| Directory | Purpose |
|-----------|---------|
| **openclaw-agents/** | Sub-agents (alpha, market-data, onchain, news), orchestrator, Brain/Muscles/Bones/DNA/Soul/Eyes/Heartbeat/Nerves flows, workspace templates. Run agents here; workspace files sync to `knowledge/teammate/` and `~/.openclaw/workspace/`. See [openclaw-agents/README.md](openclaw-agents/README.md). |
| **vault/** | Knowledge vault (Claude Code / Obsidian): inbox, todos (01-todos), project context (02-projects/vince/CLAUDE.md), meetings (06-meetings), standup sync. Use for capture, task flow, meeting notes. See [vault/README.md](vault/README.md). |
| **skills/** | Cursor/Claude skills (e.g. **x-research** for X/Twitter search, thread, watchlist). Same X token as VINCE in-chat. See [skills/x-research/README.md](skills/x-research/README.md). |
| **tasks/** | Working notes, lessons, frontend quickstarts, todo. Task backlogs and team notes. See [tasks/README.md](tasks/README.md). |

## Sentinel

For PRDs, where to implement, and OpenClaw integration, ask **Sentinel** (core dev agent); see [src/agents/sentinel.ts](src/agents/sentinel.ts) and [docs/SENTINEL.md](docs/SENTINEL.md).

## Deliverables

Implement PRDs from **docs/standup/prds/**; apply Eliza tasks from **docs/standup/eliza-tasks/**.
