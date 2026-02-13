# OpenClaw Bones — Codebase Intelligence Engine

Bones discovers every repository the operator owns or contributes to, ingests each one, and documents the structural knowledge the AI system needs to build within existing codebases, debug without breaking things, and connect when spinning up new projects. It writes the **skills/** tree (per-repo SKILL.md plus a codebases index) and updates TOOLS.md, AGENTS.md, MEMORY.md, HEARTBEAT.md.

## When to run

Run **Brain** first (and ideally **Muscles**). If Brain or Muscles output exists, Bones will use it and not re-ask what's already known; it will focus on repo inventory, architecture, conventions, and stability.

## How to run

From the project root:

```bash
# Requires ANTHROPIC_API_KEY in .env or environment
bun run openclaw-agents/bones/run-bones.ts
```

Or from this directory:

```bash
cd openclaw-agents/bones && bun run run-bones.ts
```

- The script loads [BONES_PROMPT.md](BONES_PROMPT.md) as the system prompt. If [../workspace/USER.md](../workspace/USER.md) or [knowledge/teammate/USER.md](../../knowledge/teammate/USER.md) exists, it injects a short context summary so the model does not re-ask prior context.
- Start with repo inventory, then go deep per repo. When you're done, type **/done** or **/generate** to produce the skills/ tree and workspace file updates.
- Use **/quit** to exit without writing.

## Output

- **workspace/skills/**  
  - **skills/codebases/SKILL.md** — Master index of all repositories and connections.  
  - **skills/[repo-name]/SKILL.md** — Per-repo: overview, architecture, data flow, conventions, dependencies, stability map, cross-repo patterns, development workflow, new project template.
- **workspace/TOOLS.md** — Development tools, CI/CD, hosting (merged with existing).
- **workspace/AGENTS.md** — Codebase-specific rules, approval requirements, deployment and secret handling (merged).
- **workspace/MEMORY.md** — Tribal knowledge, tech debt, break history (merged).
- **workspace/HEARTBEAT.md** — Active repos, planned repos, tech debt backlog, cross-repo improvements (merged).

## Sync

After generating, sync workspace (including **workspace/skills/**) to [knowledge/teammate/](../../knowledge/teammate/) or ~/.openclaw/workspace/ as needed. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sync).
