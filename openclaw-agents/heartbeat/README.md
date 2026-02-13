# OpenClaw Heartbeat — Evolution Architect

Heartbeat is the **evolution architect** pillar: it defines how the AI grows, improves, and evolves over time — daily rhythm, weekly review, memory curation, self-improvement, feedback integration, file evolution, growth metrics, trust escalation.

## What Heartbeat does

Heartbeat drives a conversation that captures:

- **Daily rhythm** — What to capture during sessions. What to log. End-of-day reflection. How daily notes are structured.
- **Weekly review** — What to review weekly. Patterns to look for. What to summarize. What to carry forward vs let go.
- **Memory curation** — How raw logs become long-term memory. When to move insights from daily notes to permanent storage. What to prune. Session hygiene (when to clear old session files, when to run /compact). File size awareness (workspace files capped at 65K characters).
- **Self-improvement** — How to learn from mistakes. How to refine preferences. How to identify what works. Ecosystem research (sources, cadence). Whether to propose changes to its own files.
- **Feedback integration** — How feedback flows in. Implicit vs explicit. How corrections get incorporated. How quickly to adapt.
- **File evolution** — When to propose updates to AGENTS, SOUL, TOOLS, etc. Update silently vs ask first. How to track changes.
- **Growth metrics** — What success looks like. What to track. Milestones that matter.
- **Trust escalation** — How autonomy expands. What proves readiness for more responsibility. What unlocks new permissions.

Outputs are **updates** to HEARTBEAT.md, AGENTS.md, MEMORY.md, and **workspace/memory/** (daily log template, weekly review template) in `workspace/`.

## When to run

Run **after Brain, then Muscles, then Bones, then DNA, then Soul, then Eyes.** Heartbeat references prior step output when present and does not re-ask what's already documented.

## How to run

Requires `ANTHROPIC_API_KEY` (in `.env` or environment).

```bash
bun run openclaw-agents/heartbeat/run-heartbeat.ts
```

- **Optional prior context:** If `workspace/USER.md` or `knowledge/teammate/USER.md` exists, the runner injects a short summary into the first user message so the model does not re-ask what's already in Brain/Muscles/Bones/DNA/Soul/Eyes.
- **Conversation loop:** Same as other runners: readline, Anthropic Messages API. Type your answers; Heartbeat asks follow-ups in batches.

## Commands

| Command | Effect |
|--------|--------|
| `/done` or `/generate` | Finish the conversation and write HEARTBEAT.md, AGENTS.md, MEMORY.md, and memory/ templates to `workspace/`. |
| `/quit` | Exit without writing any files. |

## Output

- **workspace/HEARTBEAT.md** — Daily rhythm, weekly review, self-improvement, growth metrics, trust escalation.
- **workspace/AGENTS.md** — Merged addenda: file updates, feedback protocols.
- **workspace/MEMORY.md** — Merged addenda: curation rhythm, session hygiene, file size limits, organization.
- **workspace/memory/DAILY_LOG_TEMPLATE.md** — Structure for daily capture; format that feeds weekly review.
- **workspace/memory/WEEKLY_REVIEW_TEMPLATE.md** — Structure for weekly reflection (or `memory/README.md` as fallback for a single combined template).

After running, sync to `knowledge/teammate/` or `~/.openclaw/workspace/` if needed. See [ARCHITECTURE.md](../ARCHITECTURE.md#sync).
