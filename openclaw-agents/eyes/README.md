# OpenClaw Eyes — Activation Architect

Eyes is the **activation architect** pillar: it defines what the AI watches for, what triggers action, what runs autonomously, and how it stays alert without being asked.

## What Eyes does

Eyes drives a conversation that captures:

- **Proactive monitoring** — What to watch without being asked (inboxes, channels, calendars, repos, markets, news, metrics). What sources matter; what signals to look for; how often to check.
- **Triggers and alerts** — What triggers the AI to act or alert. Keywords, thresholds, events, patterns. Urgent vs informational; push immediately vs batched.
- **Autonomous actions** — What runs without asking. Scheduled tasks, automatic responses, background maintenance.
- **Cron jobs** — Fixed-time tasks (morning briefings, weekly reviews, periodic reports). Time, timezone, task, channel; isolated sessions.
- **Heartbeat** — Continuous background monitoring: 3–10 item checklist per tick, interval (e.g. every 30m), active hours. What triggers notification vs silent HEARTBEAT_OK.
- **Active hours** — When the AI is actively monitoring (e.g. 08:00–22:00). What runs 24/7 vs only during active hours.
- **Alert thresholds** — What triggers immediate notification vs batched vs logged silently. Notification fatigue prevention.
- **Boot sequence** — What happens when the gateway restarts. What to check first; who to notify; initialization routines.
- **Quiet hours** — When to stay silent. Do not disturb; what overrides quiet hours.
- **Channel routing** — Where alerts go by severity. Urgent vs non-urgent channels; how to reach the operator.
- **DM and session policy** — Pairing mode, approved contacts, group @ mention requirements, session isolation.

Outputs are **updates** to HEARTBEAT.md, **BOOT.md** (new), and **AGENTS.md** (merge) in `workspace/`.

## When to run

Run **after Brain, then Muscles, then Bones, then DNA, then Soul.** Eyes references prior step output when present and does not re-ask what's already documented.

## How to run

Requires `ANTHROPIC_API_KEY` (in `.env` or environment).

```bash
bun run openclaw-agents/eyes/run-eyes.ts
```

- **Optional prior context:** If `workspace/USER.md` or `knowledge/teammate/USER.md` exists, the runner injects a short summary into the first user message so the model does not re-ask what's already in Brain/Muscles/Bones/DNA/Soul.
- **Conversation loop:** Same as other runners: readline, Anthropic Messages API. Type your answers; Eyes asks follow-ups in batches.

## Commands

| Command | Effect |
|--------|--------|
| `/done` or `/generate` | Finish the conversation and write HEARTBEAT.md, BOOT.md, and AGENTS.md to `workspace/`. |
| `/quit` | Exit without writing any files. |

## Output

- **workspace/HEARTBEAT.md** — Monitoring checklist (3–10 items), interval and active hours, silent OK behavior.
- **workspace/BOOT.md** — Startup sequence, notifications, initialization (when gateway restarts).
- **workspace/AGENTS.md** — Merged addenda: triggers, alert thresholds, autonomous actions, CRON schedule, quiet hours, channel routing, DM policy.

After running, sync to `knowledge/teammate/` or `~/.openclaw/workspace/` if needed. See [ARCHITECTURE.md](../ARCHITECTURE.md#sync).
