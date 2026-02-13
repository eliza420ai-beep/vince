# OpenClaw Brain — Jarvis Initialization

Brain is the "maps you" layer: one long conversation to understand the controlling operator, then generate the official OpenClaw workspace files (USER, SOUL, IDENTITY, AGENTS, TOOLS, MEMORY, HEARTBEAT).

## Two ways to run Brain

### 1. In-repo script (recommended)

From the project root:

```bash
# Requires ANTHROPIC_API_KEY in .env or environment
bun run openclaw-agents/brain/run-brain.ts
```

Or from this directory:

```bash
cd openclaw-agents/brain && bun run run-brain.ts
```

- The script loads [BRAIN_PROMPT.md](BRAIN_PROMPT.md) as the system prompt and runs a multi-turn conversation with Claude.
- Talk in natural language. When you're done, type **/done** or **/generate** to ask the model to output the workspace files; the script parses the response and writes `USER.md`, `SOUL.md`, etc. into [../workspace/](../workspace/).
- Use **/quit** to exit without writing.

### 2. Run elsewhere (OpenClaw app or Claude chat)

- Paste the contents of [BRAIN_PROMPT.md](BRAIN_PROMPT.md) as the system prompt (or into a Claude project).
- Run the conversation until you have enough to synthesize.
- Ask the model to generate the workspace files. Copy each generated file block into `openclaw-agents/workspace/` or `knowledge/teammate/` as the corresponding `.md` file.

## Sync

After generating or editing workspace files:

- **Repo → OpenClaw:** Copy or symlink `openclaw-agents/workspace/*.md` (or `knowledge/teammate/`) to `~/.openclaw/workspace/` so the OpenClaw CLI/app uses the same operator profile.
- **OpenClaw → Repo:** If you used OpenClaw's own onboarding, copy files from `~/.openclaw/workspace/` into `openclaw-agents/workspace/` or `knowledge/teammate/` so VINCE stays in sync.

See [../ARCHITECTURE.md](../ARCHITECTURE.md#sync) for the same instructions.
