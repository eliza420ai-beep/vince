# OpenClaw Muscles — AI System Architect

Muscles is the discovery/architect step that maps every AI model and tool your operator uses, then designs how they work together: model inventory, subscriptions, cost, MCP, task routing, cost routing, and multi-agent coordination. It updates TOOLS.md, AGENTS.md, MEMORY.md, and HEARTBEAT.md in the workspace.

## When to run

Run **Brain** first so the workspace has operator context (USER, SOUL, etc.). Then run **Muscles** to fill model inventory, routing, and cost architecture. If Brain output exists, Muscles will use it and not re-ask who the operator is.

## How to run

From the project root:

```bash
# Requires ANTHROPIC_API_KEY in .env or environment
bun run openclaw-agents/muscles/run-muscles.ts
```

Or from this directory:

```bash
cd openclaw-agents/muscles && bun run run-muscles.ts
```

- The script loads [MUSCLES_PROMPT.md](MUSCLES_PROMPT.md) as the system prompt. If [../workspace/USER.md](../workspace/USER.md) or [knowledge/teammate/USER.md](../../knowledge/teammate/USER.md) exists, it injects a short context summary so the model does not re-ask operator identity.
- Answer category by category (Creative, Code, Writing, Design, etc.). When you're done, type **/done** or **/generate** to produce TOOLS.md, AGENTS.md, MEMORY.md, HEARTBEAT.md in [../workspace/](../workspace/).
- Use **/quit** to exit without writing.

## Output files

Muscles writes only these four files (Brain owns USER, SOUL, IDENTITY and the initial versions of the rest):

- **TOOLS.md** — Model inventory, MCP and connections, budget.
- **AGENTS.md** — Task routing map, cost routing, model tiering, multi-agent roster, coordination, spending limits.
- **MEMORY.md** — Model preferences, frustrations, tools tried and dropped.
- **HEARTBEAT.md** — Gaps, capabilities to explore, models to trial.

## Sync

After generating, sync workspace files to [knowledge/teammate/](../../knowledge/teammate/) for VINCE and to `~/.openclaw/workspace/` for the OpenClaw CLI. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sync).
