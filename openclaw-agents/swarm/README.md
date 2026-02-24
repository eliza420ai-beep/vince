# VINCE Agent Swarm

**The General Contractor Pattern** — OpenClaw as orchestrator, coding agents as specialists, git worktrees as isolation, tmux as the communication channel.

> "Using OpenClaw as the orchestrator is like being the general contractor. You don't swing the hammer. You talk to the foreman — the orchestrator — who holds all the context about the project: what the client wants, what we tried before, why it failed, what the constraints are, what 'done' looks like."
>
> — [One Month With the Swarm](https://ikigaistudio.substack.com/p/one-month-with-the-swarm), ikigaistudio

---

## Quick Start

```bash
# 1. Install dependencies (one-time)
openclaw gateway start

# 2. Spawn a task (agent gets full VINCE context, starts in isolated worktree)
./openclaw-agents/swarm/spawn-task.sh "Add Execute Vince Signal quick action to Otaku"

# 3. Go for a walk. The agent is working.

# 4. Check status (from wherever you are)
bun run openclaw-agents/swarm/swarm-orchestrator.ts status

# 5. Redirect if wrong direction (no respawn needed)
bun run openclaw-agents/swarm/swarm-orchestrator.ts redirect <task-id> "Focus on src/plugins/plugin-vince/src/actions/"

# 6. Review the PR
bun run openclaw-agents/swarm/swarm-orchestrator.ts review <pr-number>

# 7. Merge when all 3 AI reviewers approve
```

---

## Architecture

```
You (Operator)
    │
    │  describe intent
    ▼
Swarm Orchestrator  ←──── task-registry.json (all context)
    │                             │
    │  builds full context prompt  │  logs lessons
    │  (VINCE architecture,        │  from failures
    │   PRD links, file paths,     │
    │   definition of done)        ▼
    │                         learning-log.md
    │
    ├──► git worktree /tmp/vince-wt-<id>  +  tmux session vince-<id>
    │         │
    │         └──► Claude Code / Codex  (focused on ONE feature)
    │                   │
    │                   └──► creates PR → swarm/<task-id> branch
    │
    ├──► monitor.sh (cron, every 10min)
    │         │
    │         ├── tmux session alive? → alert if dead, auto-respawn
    │         ├── PR created? → update registry, trigger review
    │         ├── CI passing? → alert if failing
    │         └── PR merged? → cleanup worktree, update stats
    │
    └──► pr-reviewer.ts (3 parallel reviewers)
              │
              ├── Codex: logic, edge cases, type safety
              ├── Claude: correctness, architecture, overengineering
              └── Gemini: security, scalability, financial safety
                        │
                        └──► all post comments to GitHub PR
```

---

## Key Patterns

### 1. Worktree Isolation

Each task gets its own git worktree at `/tmp/vince-wt-<task-id>` and tmux session `vince-<task-id>`. Agents never see each other's work until it's PR'd and reviewed.

```bash
# The orchestrator does this automatically, but you can also:
git worktree list  # see all active worktrees
tmux list-sessions | grep vince  # see all agent sessions
```

### 2. Mid-Task Redirection

Don't kill and respawn — redirect:

```bash
# Agent going wrong direction? Send a correction into its session
bun run openclaw-agents/swarm/swarm-orchestrator.ts redirect <task-id> \
  "Stop. The schema is in src/types/template.ts. Use that."

# This is faster and cheaper than respawning, and the agent keeps its context
```

### 3. Definition of Done

A task isn't done when the agent says it's done. Done means ALL of:

| Criterion | Check |
|-----------|-------|
| ✅ PR exists and is open | `gh pr view` |
| ✅ Branch synced to main | No merge conflicts |
| ✅ CI passing | All checks green |
| ✅ 3 AI reviews posted | Codex + Claude + Gemini |
| ✅ Screenshots (if UI changes) | In PR body or comments |

```bash
bun run openclaw-agents/swarm/swarm-orchestrator.ts done <task-id>
```

### 4. Learning Loop

Every failure is a lesson. Every lesson improves the next prompt.

```bash
# Log what you learned
bun run openclaw-agents/swarm/swarm-orchestrator.ts learn <task-id> \
  "Agent needed type definitions upfront" \
  "Always include src/plugins/plugin-vince/src/types/ at top of prompt"

# Lessons are stored in task-registry.json and learning-log.md
# The orchestrator uses them when building prompts for similar tasks
```

### 5. Auto-Monitoring (Cron)

```bash
# Set up once — monitor runs every 10 minutes
echo "*/10 * * * * $(pwd)/openclaw-agents/swarm/monitor.sh >> /tmp/vince-swarm-monitor.log 2>&1" | crontab -

# Watch live
tail -f /tmp/vince-swarm-monitor.log
```

The monitor:
- Checks tmux sessions are alive (auto-respawns dead ones, max 3 attempts)
- Detects PR creation (triggers 3-model review)
- Monitors CI status (alerts on failures)
- Detects merged PRs (marks done, schedules cleanup)
- Alerts on stuck agents (running >2hr)

---

## Files

| File | Purpose |
|------|---------|
| `swarm-orchestrator.ts` | Main CLI: spawn, status, redirect, review, done, learn |
| `monitor.sh` | Cron script: watches tmux, PRs, CI — alerts when needed |
| `worktree-manager.ts` | Git worktree lifecycle (create, sync, destroy) |
| `pr-reviewer.ts` | 3-model PR review (Codex + Claude + Gemini) |
| `definition-of-done.ts` | Validates all done criteria |
| `task-registry.json` | Single source of truth: all tasks, lessons, stats |
| `learning-log.md` | Human-readable lesson log |
| `spawn-task.sh` | Quick bash wrapper for spawning |

---

## The 3-Model Review

```
PR #247
    │
    ├──► Codex ──────► "Logic error in signal aggregation, line 142"
    │                   Verdict: REQUEST_CHANGES
    │
    ├──► Claude ─────► "Missing error handling in fetchSignals"
    │                   Verdict: REQUEST_CHANGES
    │
    └──► Gemini ─────► "API key potentially logged in debug output"
                        Verdict: REQUEST_CHANGES

Consensus: REQUEST_CHANGES (agent fixes → re-review)

PR #248 (after fixes)
    ├──► Codex ──► APPROVE
    ├──► Claude ─► APPROVE
    └──► Gemini ─► APPROVE

Consensus: APPROVE → merge
```

---

## RAM & Concurrency

From "One Month With the Swarm":

> "Five agents running simultaneously means five parallel TypeScript compilers, five test runners, five sets of dependencies loaded into memory. On sixteen gigs of RAM you top out at four, maybe five agents before the system starts swapping."

Recommendation: 4 concurrent agents max on 16GB RAM. 8 on 32GB+.

---

## Context That Ships Code

The orchestrator prompt includes:
- **The "why"** — why this feature exists, user flow, edge cases
- **10-agent team map** — which agents this touches and why
- **Exact file paths** — don't make the agent guess
- **Definition of done** — explicit criteria in every prompt
- **Completion signal** — `openclaw system event` call to notify when done

> "The orchestrator doesn't need us to explain what Otaku is, what VINCE signals look like, where the action registry lives, or what the testing requirements are. It already knows. It spawns an agent with a prompt so detailed and contextual that the coding agent one-shots the task without a single follow-up question."

---

## Relationship to Existing OpenClaw Agents

The swarm is a **separate layer** from the research agents in `openclaw-agents/`:

| Layer | Purpose | Location |
|-------|---------|----------|
| Research agents (alpha, market-data, onchain, news) | Data gathering for VINCE decisions | `openclaw-agents/orchestrator.js` |
| **Swarm agents** | **Building the VINCE codebase itself** | `openclaw-agents/swarm/` |
| 8-Pillar flows (Brain, Muscles, Bones...) | Identity and workspace setup | `openclaw-agents/brain/`, etc. |

The swarm is activated when you want to ship features. The research agents are activated when VINCE needs market intelligence.

---

## Example Workflow

```
Morning:
  You: "Spawn a task for phase 6 — pre-mortems"
  Orchestrator: spawns Claude Code in /tmp/vince-wt-abc123, tmux vince-abc123
  Claude: reads .swarm-task.md, explores codebase, starts implementing

You: go for a walk

10min monitor:
  → tmux vince-abc123 alive ✅
  → No PR yet (still working) ✅

[later]
10min monitor:
  → tmux vince-abc123 dead ❌
  → PR #248 found on swarm/abc123 ✅
  → Triggering 3-model review...
  → Codex, Claude, Gemini post reviews

Telegram notification:
  "PR #248 created: Add pre-mortem phase to Oracle — 3 reviews ready"

You (5min review):
  → Screenshot looks right
  → 3 reviewers all approve
  → Merge ✅

Next monitor cycle:
  → PR merged → task marked done → worktree scheduled for cleanup

That was: one feature shipped, one walk taken, zero context switches.
```
