# VINCE Swarm Learning Log

Each entry captures what worked, what failed, and how to improve future agent prompts.
The orchestrator references this log when retrying failed tasks.

> Inspired by "One Month With the Swarm" (ikigaistudio.substack.com) —
> "When an agent fails, the orchestrator doesn't just respawn it with the same prompt.
> It looks at the failure with full business context and figures out how to unblock it."

---

## Template

### [YYYY-MM-DD] Task: \<description\>

- **Task ID**: `<id>`
- **Outcome**: `success` | `failure` | `partial`
- **Failure mode**: \<what went wrong: timeout | wrong direction | missing context | type errors | etc.\>
- **Root cause**: \<why it failed\>
- **Lesson**: \<what to do differently next time\>
- **Prompt improvement**: \<specific wording or context to add/remove\>
- **Agent**: `codex` | `claude`
- **Attempt**: 1 / 2 / 3

---

## Entries

<!-- Orchestrator appends new entries here automatically. Newest first. -->

### Prompt Patterns That Ship Code

> Keep updating these as the system learns.

| Pattern | When to Use |
|---------|-------------|
| Include type definition file paths upfront | When modifying VINCE signal handlers |
| Specify test file paths explicitly | When modifying agent quick actions |
| Lead with the "why" before the "what" | Always — agents make better decisions with context |
| Include 3 example of similar existing code | When adding to an existing pattern (e.g., new action) |
| "Focus only on these three files" | When agent ran out of context on a large codebase run |

### Failure Modes to Watch

| Failure Mode | Mitigation |
|--------------|------------|
| Agent went wrong direction | Use `redirect` command early; don't wait for PR |
| Type errors on VINCE signals | Always include `src/plugins/plugin-vince/src/types/` |
| Missing test files | Point to `vitest.config.*.ts` files explicitly |
| Timeout on `bun install` | Pre-warm worktrees or skip install if node_modules exists |
| Agent declared done too early | Reinforce definition-of-done in every prompt |
