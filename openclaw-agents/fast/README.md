# OpenClaw Fast — One-Session Onboarding

Collapses **Brain + DNA + Soul** into a single conversation so you get a working workspace in ~15 minutes instead of running three separate pillars.

**When to use:** Quick setup, demos, or when you want to try OpenClaw without the full 2-hour 8-pillar flow.

**Run:**
```bash
bun run openclaw-agents/run-fast.ts
```

**Output:** Same core workspace files as Brain (USER.md, SOUL.md, IDENTITY.md, AGENTS.md, TOOLS.md, MEMORY.md, HEARTBEAT.md).

**After Fast:** Sync to `knowledge/teammate/` with `bun run openclaw-agents/scripts/sync-workspace-to-teammate.ts`. For codebase intelligence, activation rules, and context guardrails, run the full pillars (Bones, Eyes, Heartbeat, Nerves) later.
