# OpenClaw Nerves — Context Efficiency Architect

Nerves is the **context efficiency architect** pillar: it audits token usage across workspace files and implements guardrails to prevent context overflow while preserving everything that matters.

## What Nerves does

Nerves drives a conversation that captures:

- **Token audit** — Which workspace files consume the most tokens; which load per session type; baseline cost before any user interaction.
- **Context profiles** — Minimum viable context per agent type; required vs optional files; max budget per role.
- **Conversation windowing** — How many message pairs to keep raw; when to summarize older turns; trigger thresholds.
- **Tool output compression** — Post-processing rules per tool type; key data extraction; where to log raw output.
- **Budget guardrails** — Warning threshold, auto-summarize, auto-prune, circuit breaker (hard stop).
- **Session hygiene** — When to clear sessions; what to preserve before clearing; archival process.

Outputs are **CONTEXT_MANAGEMENT.md** (new) in `workspace/`, and **merged sections** into **AGENTS.md** (## Context Management) and **HEARTBEAT.md** (context monitoring in the checklist).

The runner **injects a workspace file audit** at start: it scans `workspace/*.md`, `workspace/skills/**/*.md`, `workspace/memory/**/*.md` (and `ECOSYSTEM.md` if present), computes byte size and estimated tokens per file, sorts by size, and prepends a markdown table to the first user message so the model can analyze before acting.

## When to run

Run **after Brain, then Muscles, then Bones, then DNA, then Soul, then Eyes, then Heartbeat.** Nerves is the last pillar that produces workspace files; it uses the existing workspace to audit and then adds context-management rules.

## How to run

Requires `ANTHROPIC_API_KEY` (in `.env` or environment).

```bash
bun run openclaw-agents/nerves/run-nerves.ts
```

- **Workspace audit:** Before the first model call, the runner scans all `.md` files under `workspace/`, builds a table (File | Bytes | Est. Tokens), and prepends it to the first user message. The model uses this to show where the bloat lives.
- **Optional prior context:** If `workspace/USER.md` or `knowledge/teammate/USER.md` exists, a short summary is appended so the model does not re-ask what's already documented.
- **Conversation loop:** Same as other runners: readline, Anthropic Messages API. Type your answers; Nerves asks follow-ups.

## Commands

| Command | Effect |
|--------|--------|
| `/done` or `/generate` | Finish and write CONTEXT_MANAGEMENT.md, AGENTS.md (with Context Management section), and HEARTBEAT.md (with context monitoring in checklist) to `workspace/`. |
| `/quit` | Exit without writing any files. |

## Output

- **workspace/CONTEXT_MANAGEMENT.md** — Token audit table, context profiles, conversation windowing, tool output compression, budget guardrails, session hygiene.
- **workspace/AGENTS.md** — Merged: new "## Context Management" section (token budget per session type, overflow escalation, session clear triggers).
- **workspace/HEARTBEAT.md** — Merged: context monitoring in checklist (check session token usage, archive bloated memory, clear stale sessions).

After running, sync to `knowledge/teammate/` or `~/.openclaw/workspace/` if needed. See [ARCHITECTURE.md](../ARCHITECTURE.md#sync).
