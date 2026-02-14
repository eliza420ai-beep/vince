import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * Workspace sync: openclaw-agents/workspace ↔ knowledge/teammate ↔ ~/.openclaw/workspace.
 * Sourced from: OPENCLAW.md, openclaw-agents/ARCHITECTURE.md.
 */
const OPENCLAW_WORKSPACE_SYNC_MD = `# OpenClaw workspace sync

## Why sync?

Brain output and operator profile files can live in \`openclaw-agents/workspace/\` or \`knowledge/teammate/\`. Keep them in sync so VINCE (teammate provider) and OpenClaw CLI use the same profile.

## Sync directions

### Repo → OpenClaw CLI

Copy or symlink \`openclaw-agents/workspace/*.md\` (or \`knowledge/teammate/*.md\`) to \`~/.openclaw/workspace/\`:

\`\`\`bash
# Option 1: Copy
cp openclaw-agents/workspace/*.md ~/.openclaw/workspace/

# Option 2: Symlink (single source of truth in repo)
ln -sf "$(pwd)/openclaw-agents/workspace/"* ~/.openclaw/workspace/
\`\`\`

### OpenClaw → Repo

If you ran OpenClaw's own onboarding, copy files from \`~/.openclaw/workspace/\` into the repo:

\`\`\`bash
cp ~/.openclaw/workspace/*.md openclaw-agents/workspace/
# or: knowledge/teammate/
\`\`\`

## Files to sync

- USER.md, SOUL.md, IDENTITY.md
- AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md
- BOOT.md, CONTEXT_MANAGEMENT.md
- \`workspace/skills/\`, \`workspace/memory/\`

## When to sync

After each Brain, Muscles, Bones, DNA, Soul, Eyes, Heartbeat, or Nerves run. See \`openclaw-agents/ARCHITECTURE.md\` and \`openclaw-agents/HOW-TO-RUN.md\`.
`;

export const openclawWorkspaceSyncAction: Action = {
  name: "OPENCLAW_WORKSPACE_SYNC",
  similes: ["WORKSPACE_SYNC", "SYNC_WORKSPACE", "OPENCLAW_SYNC"],
  description:
    "Return OpenClaw workspace sync from ARCHITECTURE.md (openclaw-agents/workspace ↔ knowledge/teammate ↔ ~/.openclaw/workspace). Use when the user asks about workspace sync, sync workspace.",
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text = (message?.content?.text ?? "").toLowerCase() + (state?.text ?? "").toLowerCase();
    return (
      /workspace\s+sync/i.test(text) ||
      /sync\s+workspace/i.test(text) ||
      /openclaw\s+sync/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const intro = "Here's how to sync your workspace with OpenClaw—";
    const out = intro + "\n\n" + OPENCLAW_WORKSPACE_SYNC_MD;
    if (callback) await callback({ text: out, actions: ["OPENCLAW_WORKSPACE_SYNC"] });
    return { success: true, text: out };
  },
  examples: [
    [
      { name: "{{user}}", content: { text: "How do I sync workspace?" } },
      { name: "{{agent}}", content: { text: OPENCLAW_WORKSPACE_SYNC_MD.slice(0, 400) + "...", actions: ["OPENCLAW_WORKSPACE_SYNC"] } },
    ],
    [
      { name: "{{user}}", content: { text: "workspace sync openclaw" } },
      { name: "{{agent}}", content: { text: OPENCLAW_WORKSPACE_SYNC_MD.slice(0, 400) + "...", actions: ["OPENCLAW_WORKSPACE_SYNC"] } },
    ],
  ],
};
