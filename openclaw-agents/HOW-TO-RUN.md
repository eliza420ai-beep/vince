# How to Run openclaw-agents

Short checklist for running the orchestrator and the 8-pillar workspace flows.

## Research agents (orchestrator)

1. **Install OpenClaw**
   ```bash
   npm install -g openclaw
   ```

2. **Start the gateway** (required for CLI agent runs)
   ```bash
   openclaw gateway start
   ```

3. **Run the orchestrator** (from repo root)
   ```bash
   node openclaw-agents/orchestrator.js alpha SOL BTC
   node openclaw-agents/orchestrator.js market ETH
   node openclaw-agents/orchestrator.js onchain BONK
   node openclaw-agents/orchestrator.js news
   node openclaw-agents/orchestrator.js all SOL BTC ETH
   ```
   Output is printed and saved to `openclaw-agents/last-briefing.md`.

4. **Optional:** Configure OpenClaw agents named `alpha`, `market`, `onchain`, `news` in your OpenClaw workspace so the orchestrator can target them. If not configured, the CLI falls back to the default agent or returns a short message; use VINCE/plugin-openclaw for in-app research with real data.

## Fast onboarding (optional)

One conversation instead of Brain + DNA + Soul (~15 min):

```bash
bun run openclaw-agents/run-fast.ts
```

Then sync and optionally run the remaining pillars (Bones, Eyes, Heartbeat, Nerves). See [fast/README.md](fast/README.md).

## 8-pillar workspace flows (Brain → Nerves)

Run in order. Each writes or updates files under `openclaw-agents/workspace/` (and optionally sync to `knowledge/teammate/` and `~/.openclaw/workspace/`).

1. **Brain** (operator mapping, init)
   ```bash
   bun run openclaw-agents/brain/run-brain.ts
   ```

2. **Muscles** (system architect: models, routing, cost)
   ```bash
   bun run openclaw-agents/muscles/run-muscles.ts
   ```

3. **Bones** (codebase intelligence: skills/, TOOLS, AGENTS, etc.)
   ```bash
   bun run openclaw-agents/bones/run-bones.ts
   ```

4. **DNA** (behavioral architect)
   ```bash
   bun run openclaw-agents/dna/run-dna.ts
   ```

5. **Soul** (personality architect)
   ```bash
   bun run openclaw-agents/soul/run-soul.ts
   ```

6. **Eyes** (activation architect)
   ```bash
   bun run openclaw-agents/eyes/run-eyes.ts
   ```

7. **Heartbeat** (evolution architect)
   ```bash
   bun run openclaw-agents/heartbeat/run-heartbeat.ts
   ```

8. **Nerves** (context efficiency architect)
   ```bash
   bun run openclaw-agents/nerves/run-nerves.ts
   ```

After each run, sync workspace files so VINCE and OpenClaw use them:

- **To VINCE (knowledge/teammate/):**
  ```bash
  bun run openclaw-agents/scripts/sync-workspace-to-teammate.ts
  ```
- **To OpenClaw CLI:** copy or symlink `openclaw-agents/workspace/*.md` to `~/.openclaw/workspace/`.

See [ARCHITECTURE.md](ARCHITECTURE.md#sync).

## Plugin: use last-briefing in VINCE

When using plugin-openclaw in VINCE, you can optionally serve the orchestrator’s merged briefing when the user asks for “all” research:

- Set `OPENCLAW_USE_LAST_BRIEFING=true`.
- Optionally set `OPENCLAW_LAST_BRIEFING_MAX_AGE_MS=3600000` (default: 1 hour).

If `openclaw-agents/last-briefing.md` exists and was written within that window, the plugin returns it instead of running the full pipeline.
