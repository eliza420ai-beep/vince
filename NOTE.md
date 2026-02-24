# Agent Swarm Setup — Note

Short note on the coding-agent swarm we added and how we run it.

## Going forward

**We will no longer code on this MacBook.** All continued development happens on a **fresh MacBook Pro**, on the repo **[eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince)**.

The repo **[IkigaiLabsETH/vince](https://github.com/IkigaiLabsETH/vince)** will **no longer be maintained**. We consider the one-month hackathon to get to MVP V4.2.0 **closed and ended**.

---

## What It Is

A **worktree-isolated, tmux-managed** coding agent setup so we can run Codex / Claude Code / Gemini on tasks without agents stepping on each other. Each task gets its own git worktree (branch) and tmux session. Monitoring is a cron script; no tokens burned for health checks.

Based on: [One Month With the Swarm](https://ikigaistudio.substack.com/p/one-month-with-the-swarm) (ikigaistudio Substack). Implemented in **`.clawdbot/`**.

## Where Things Live

- **Scripts and config:** `.clawdbot/` (see `.clawdbot/README.md` for usage).
- **Worktrees:** `../vince-worktrees/<task-id>/` (configurable in `.clawdbot/config.json`).
- **Task registry:** `.clawdbot/active-tasks.json` (gitignored; runtime state).

## Repo and Remotes

- We work on the **fork** [eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince). Both this fork and the upstream are **private**.
- **Safest remote layout:**
  - `origin` → `https://github.com/IkigaiLabsETH/vince.git` (upstream; pull from here when we want to sync).
  - `fork` → `https://github.com/eliza420ai-beep/vince.git` (our repo; push our work here).
- Push our branch: `git push fork main` (or the branch you’re on). Do **not** push to `origin` unless we intend to contribute back to upstream.

## Security Choices We Made

1. **Approval mode only** — No `--dangerously-bypass-approvals-and-sandbox` (Codex) or `--dangerously-skip-permissions` (Claude). Agents must ask before running commands; we approve from the tmux session.
2. **No auto-respawn** — `maxRespawnAttempts: 0` in `.clawdbot/config.json`. Dead agents stay dead until we respawn manually.
3. **Secrets never in prompts** — Task descriptions and prompt templates do not reference `.env` or other secrets; `config.json` documents deny-read paths for agent context.
4. **Private repos** — Fork and upstream are private to limit exposure of strategy and tooling.

If we ever move this to a **dedicated Mac (e.g. Mac Studio)** used only for the swarm, we could re-enable bypass flags and optional auto-respawn there, and keep this laptop in approval mode.

## Quick Commands

| What | Command |
|------|--------|
| Spawn an agent | `.clawdbot/spawn-agent.sh <task-id> <branch> "<description>" [agent] [effort]` |
| Watch a session | `tmux attach -t agent-<task-id>` |
| Redirect mid-task | `.clawdbot/redirect-agent.sh <task-id> "<instruction>"` |
| List tasks | `.clawdbot/list-agents.sh` |
| Push our work to the fork | `git push fork main` |

## Prerequisites

- `tmux`, `jq`, `gh` (e.g. `brew install tmux jq gh`).
- At least one of: Codex CLI, Claude Code CLI, or Gemini CLI.
- Auth to the fork (HTTPS or SSH) so `git push fork main` works.

---

*This setup was added Feb 2026. Details and cron examples: `.clawdbot/README.md`.*
