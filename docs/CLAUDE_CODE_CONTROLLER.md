# Claude Code Controller Integration

For **code/repo tasks** (refactors, reviews, applying improvement journal entries), run [claude-code-controller](https://github.com/IkigaiLabsETH/claude-code-controller) alongside VINCE. The controller pilots **real Claude Code CLI** processes via Anthropic's teams/inbox/tasks protocol — full tool access (Bash, Read, Write, Edit, etc.) in a PTY, using your Claude Code subscription.

**VINCE stays the intel/trading/push agent.** The controller is an optional code-execution arm: when you want a code review, refactor, or journal-driven patch, you delegate to a Claude Code agent via the controller's REST API or the script below.

## Prerequisites

- **Claude Code CLI** v2.1.34+ installed and authenticated.
- **Controller server** running (e.g. on port 3456 so it doesn't conflict with ElizaOS on 3000).

## Quick start

1. Start the controller (in a separate terminal), e.g. on port 3456:
   ```bash
   npx claude-code-controller
   # or: CLAUDE_CODE_CONTROLLER_PORT=3456 npx claude-code-controller
   ```
2. Set in `.env` (optional):
   ```bash
   CLAUDE_CODE_CONTROLLER_URL=http://localhost:3456
   ```
3. Send a task from the repo:
   ```bash
   bun run scripts/claude-code-task.ts "Review src/auth for security issues. Reply with SendMessage."
   # or: CLAUDE_CODE_CONTROLLER_MESSAGE="Refactor X" bun run scripts/claude-code-task.ts
   ```

## Script: claude-code-task.ts

`scripts/claude-code-task.ts` sends a single message to the controller: it (re)uses an agent by name, POSTs the message, and optionally waits for a reply. If the controller API doesn't expose a receive endpoint, the script prints "Message sent" and you check the controller's web dashboard for the agent's reply.

- **Env:** `CLAUDE_CODE_CONTROLLER_URL` (default `http://localhost:3456`), optional `CLAUDE_CODE_CONTROLLER_AGENT` (default `coder`), optional `CLAUDE_CODE_CONTROLLER_MESSAGE` (overrides argv).
- **Usage:** `bun run scripts/claude-code-task.ts [ "your task or message" ]`
- **Optional:** Discord webhook for push notifications (set `CLAUDE_CODE_CONTROLLER_WEBHOOK_URL` to post the result).

## Session cost / TREASURY

Code tasks run on your **Claude Code subscription** (e.g. Max plan). They are **not** included in VINCE's Usage tab (Leaderboard → Usage), which tracks ElizaOS runtime session tokens only. See [TREASURY.md](TREASURY.md) for cost coverage and strategies.

## Improvement journal → controller (optional)

The VINCE improvement journal (`improvement-journal.md`, `PENDING_CLAWDBOT` entries) can be fed into the controller as tasks via a separate script: `scripts/improvement-journal-to-controller.ts`. See that script and [plugin-vince HOW.md](../src/plugins/plugin-vince/HOW.md) or [CLAUDE.md](../src/plugins/plugin-vince/CLAUDE.md) for usage.
