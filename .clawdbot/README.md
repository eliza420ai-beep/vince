# VINCE Agent Swarm

Worktree-isolated, tmux-managed coding agent orchestration for the VINCE multi-agent system. Based on the [One Month With the Swarm](https://ikigaistudio.substack.com/p/one-month-with-the-swarm) operational pattern.

Each agent gets its own git worktree (isolated branch) and tmux session. Agents never collide. The monitoring loop runs via cron — deterministic, zero tokens burned.

## Prerequisites

```bash
brew install tmux jq gh
```

You also need at least one coding agent CLI installed:

| Agent | Install | Strength |
|-------|---------|----------|
| **Codex** | `npm i -g @openai/codex` | Backend, complex refactors, multi-file reasoning |
| **Claude Code** | `npm i -g @anthropic-ai/claude-code` | Frontend, git ops, fast iteration |
| **Gemini** | Google AI Studio CLI | Design sensibility, UI/UX, security review |

## Quick Start

### 1. Spawn an agent

```bash
.clawdbot/spawn-agent.sh fix-echo-ratelimit feat/fix-echo-ratelimit \
  "Fix ECHO X rate-limit handling in plugin-x-research" codex high
```

Arguments:
- `task-id` — Short identifier (used for worktree dir, tmux session, registry)
- `branch-name` — Git branch to create
- `description` — What the agent should build (the more precise, the better the output)
- `agent` — `codex`, `claude`, or `gemini` (default: `codex`)
- `effort` — `low`, `medium`, `high` (default: `high`)

### 2. Watch it work

```bash
tmux attach -t agent-fix-echo-ratelimit
```

### 3. Redirect mid-task

Don't kill and respawn — redirect. The agent adjusts without losing context:

```bash
.clawdbot/redirect-agent.sh fix-echo-ratelimit \
  "Stop. Focus on the retry logic in fetchTimeline.ts first, not the UI."
```

### 4. Check status

```bash
.clawdbot/list-agents.sh
```

### 5. After merging

```bash
.clawdbot/mark-merged.sh fix-echo-ratelimit
.clawdbot/cleanup-worktrees.sh
```

## Architecture

```
.clawdbot/
├── config.json           # Agent config, limits, notification settings
├── active-tasks.json     # Task registry (gitignored — runtime state)
├── spawn-agent.sh        # Create worktree + launch agent in tmux
├── run-agent.sh          # Execute the right agent CLI with the prompt
├── check-agents.sh       # Monitoring loop (cron every 10min)
├── redirect-agent.sh     # Send instructions to running agent via tmux
├── list-agents.sh        # Show all tasks and their status
├── cleanup-worktrees.sh  # Remove finished worktrees (cron daily)
├── mark-merged.sh        # Mark a task as merged
├── prompts/              # Auto-generated prompt files (gitignored)
└── README.md             # This file
```

Worktrees live at `../vince-worktrees/<task-id>/` (outside the main repo, configurable in `config.json`).

## Monitoring (Cron)

```bash
# Every 10 minutes — check agent health, CI status, auto-respawn failures
*/10 * * * * /Users/macbookpro16/vince/.clawdbot/check-agents.sh >> /Users/macbookpro16/vince/.clawdbot/monitor.log 2>&1

# Daily at 3am — clean up finished worktrees
0 3 * * * /Users/macbookpro16/vince/.clawdbot/cleanup-worktrees.sh >> /Users/macbookpro16/vince/.clawdbot/cleanup.log 2>&1
```

The monitor checks:
1. tmux sessions alive for running tasks
2. Open PRs on tracked branches — CI pass/fail
3. Auto-respawns dead agents (up to 3 attempts)
4. Sends Telegram alerts when human attention is needed

## Task Lifecycle

```
spawn → running → pr_created → ready_for_review → merged → cleanup
                      ↓                                      ↑
                   failed ──── (auto-respawn up to 3x) ──────┘
```

## Definition of Done

An agent is not done when it creates a PR. Done means:

- [ ] PR created with descriptive title and summary
- [ ] Branch synced to main (no merge conflicts)
- [ ] CI passing (type-check, lint, tests)
- [ ] Code review passed
- [ ] Screenshots included (if UI changes)

## Agent Selection Guide

| Task Type | Agent | Why |
|-----------|-------|-----|
| Backend logic, complex bugs, multi-file refactors | `codex` | Strongest reasoning, thorough |
| Frontend, ElizaOS patterns, git operations | `claude` | Faster, fewer permission issues |
| UI design, security review, scalability | `gemini` | Design sensibility, catches what others miss |
| Beautiful UI from scratch | `gemini` → `claude` | Gemini designs HTML/CSS spec, Claude implements |

## Specification Quality = Output Quality

The system amplifies the quality of the input. A precisely specified task produces clean code. A vague task produces vague code. Write specifications like you're briefing a senior developer who has never seen the codebase — because that's exactly what you're doing.

Good: "Add a `VINCE_EXECUTE_SIGNAL` quick action to Otaku that reads the latest signal from the vince_signals table, confirms with the user via a choice task, then calls the existing swap route. Test: mock signal → confirm → verify swap call."

Bad: "Add signal execution to Otaku."

## Telegram Notifications

Set in `config.json`:

```json
{
  "notifications": {
    "telegram": true,
    "telegramBotToken": "your-bot-token",
    "telegramChatId": "your-chat-id"
  }
}
```

The monitor will send alerts when PRs are ready for review or agents fail.

## Limits

- Default max concurrent agents: 4 (configurable in `config.json`)
- Each worktree needs its own `node_modules` — budget ~2-4GB RAM per agent
- Auto-respawn limit: 3 attempts per task
- On 16GB RAM, expect 4-5 concurrent agents max before swap pressure

## Cost

```
Codex:   ~$90-100/month (workhorse, 80-90% of tasks)
Claude:  ~$100/month (fast iteration, frontend)
Gemini:  Free (Code Assist reviewer)
Total:   ~$190/month
```

You can start with $20. Output scales with specification quality, not spend.
