# Multi-Agent Setup (VINCE)

How VINCE's multi-agent setup works: ASK_AGENT, elizaOS attachment, Discord Option C, A2A policy, and subagent options.

## ASK_AGENT: How It Works

**ASK_AGENT** lets one agent ask another a question and report the answer. For example: Kelly asks Vince about Bitcoin, then relays his reply.

### Resolution Path

1. **In-process (preferred):** When `runtime.elizaOS` is available (standard `elizaos start` or AgentServer), ASK_AGENT uses:
   - `elizaOS.getAgentByName(targetName)` to resolve the target
   - `elizaOS.handleMessage(agentId, msg, { onResponse, onComplete, onError })` to send the message
   - Fallbacks: sync handleMessage, direct messageService, **polling** (reads target room for new assistant reply)
2. **Job API (fallback):** When `elizaOS` is not attached, ASK_AGENT posts to `/api/messaging/jobs` and polls for completion. Requires the Jobs API to be implemented and return the expected shape.

### elizaOS Attachment

The standard ElizaOS server and CLI attach `elizaOS` to each runtime when starting via `ElizaOS.addAgents()`. That happens when you run:

- `elizaos start` (loads project from `dist/index.js`)
- `AgentServer.start({ agents, ... })` (e.g. `scripts/start-with-custom-ui.js`)

Each runtime gets `runtime.elizaOS` with `getAgents`, `getAgentByName`, and `handleMessage`. If you use a custom startup that does **not** call `ElizaOS.addAgents()`, in-process ASK_AGENT will not work; you must either fix the startup to attach `elizaOS` or rely on the Job API.

## Discord: Option C (Required)

For multi-agent Discord, **each agent must have its own Discord Application ID**. See [DISCORD.md](DISCORD.md) for full details.

- **If two agents share the same Application ID:** You get `Send handler not found (handlerSource=discord)`. Create separate apps at [Discord Developer Portal](https://discord.com/developers/applications).
- **Env per agent:** `VINCE_DISCORD_APPLICATION_ID`, `KELLY_DISCORD_APPLICATION_ID`, etc. Startup validates no duplicate app IDs and logs an error if any two agents share one.

## A2A Policy (Optional)

ASK_AGENT supports an optional allowlist in character settings:

```typescript
settings: {
  interAgent: {
    allowedTargets: ["Vince", "Kelly", "Solus", "Eliza", "Otaku", "Sentinel"],
  },
}
```

- If `settings.interAgent?.allowedTargets` is set (non-empty array), only those agent names can be asked.
- If not set, the default list (Vince, Kelly, Solus, Sentinel, Eliza, Otaku) is used.
- Optional **allow rules** (orchestrator-style): `settings.interAgent.allow: [{ source: "Kelly", target: "*" }, ...]`. If `allow` is set, only matching (source, target) pairs are allowed; `*` matches any agent name. Use with `allowedTargets` to get "only Kelly can ask anyone in the list."

This makes "who can ask whom" configurable per character and reduces misrouting.

## plugin-inter-agent vs plugin-agent-orchestrator

- **plugin-inter-agent** (this repo): **Multi-runtime** A2A—ask another **agent** by name (ASK_AGENT) and standups (Kelly-coordinated 2×/day). Different runtimes (Vince, Kelly, Sentinel, etc.); `elizaOS.getAgents()` / `handleMessage(agentId, msg)` route to the correct runtime. Use for "Kelly asks Vince" and autonomous standups.
- **plugin-agent-orchestrator** ([next/typescript](https://github.com/elizaos-plugins/plugin-agent-orchestrator/tree/next/typescript)): Task lifecycle (CREATE_TASK, PAUSE, RESUME, CANCEL), **same-agent** subagent (new room, background run, announce), session-based SEND_TO_SESSION, MessagingService (cross-platform send), sandbox. Orchestrator A2A is single-runtime (session/room within one process). It does **not** replace inter-agent for "Kelly asks Vince" (different runtimes). Use orchestrator for "spawn a background task for this agent" or unified messaging APIs.

## Subagent-Style Flow (Future)

Today ASK_AGENT is **synchronous**: the requester waits up to ~90s for the target's reply. If you want "ask Vince, continue the conversation, and get his answer when ready":

1. **Option A:** Add a subagent-style flow in plugin-inter-agent: create a dedicated room/task, call `elizaOS.handleMessage(Vince, msg)` in a worker, then post a summary back into Kelly's room when done.
2. **Option B:** Use [plugin-agent-orchestrator](https://github.com/elizaos-plugins/plugin-agent-orchestrator/tree/next/typescript) for SPAWN_SUBAGENT (same-agent background tasks) and its MessagingService; orchestrator does not yet support cross-agent spawn.

## Standups (Autonomous Agent Meetings)

When enabled, agents meet **twice per day** in a dedicated standup without you in the loop. They discuss crypto performance, recent code, and ideas; the run produces **action items**, **lessons learned** (stored per agent), and **inter-agent relationship opinion** (e.g. opinion drops after disagreements).

### Who runs it

- **Coordinator:** One agent is the standup coordinator. Only that agent's runtime registers the standup task and drives the meeting.
- **Default coordinator:** **Kelly** (CHRO / Chief Vibes Officer)—culture and team rhythm. Configurable via `STANDUP_COORDINATOR_AGENT`.
- **Requirement:** The coordinator must have `runtime.elizaOS` (same as ASK_AGENT). Use standard `elizaos start` or ensure `ElizaOS.addAgents()` is used.

### Schedule and env

- **Schedule:** 2×/day by default (every 12h). Overridable with `STANDUP_INTERVAL_MS`.
- **Env:** `STANDUP_ENABLED=true` to enable; `STANDUP_COORDINATOR_AGENT` (default `Kelly`); optional `STANDUP_INTERVAL_MS`, `STANDUP_UTC_HOURS` (e.g. `8,20` for exact hours; 12h interval is the simple default).

### What's stored

- **Room:** A dedicated standup world and room (`source: "standup"`). No Discord/Telegram push; used only for in-process `handleMessage` and storing standup messages.
- **Memories:** Each agent's "lesson learned" is written to that agent's memory (facts table) via the coordinator calling `targetRuntime.createMemory(..., 'facts')`.
- **Action items:** One-time tasks (`STANDUP_ACTION_ITEM`) are created on the coordinator runtime. Each item has a type: **remind** (worker sends a reminder to the assignee via `elizaOS.handleMessage`) or **build** (worker runs code delivery: Milaidy Gateway if configured, else in-VINCE code gen; deliverables are written to disk and a notification is posted to #daily-standup). See [Standup deliverables (code/features)](#standup-deliverables-codefeatures) and [docs/STANDUP_DELIVERABLES.md](docs/STANDUP_DELIVERABLES.md).
- **Relationships:** When the transcript parser detects a disagreement between two agents, both directions (A→B and B→A) are updated with `metadata.opinion` (decreased) and `metadata.disagreements` (incremented). No DB schema change; uses existing `createRelationship` / `updateRelationship`.
- **Discord #daily-standup:** After each standup, the coordinator pushes a summary (reply count, lessons, action items, last 2k chars of transcript) to every channel whose name contains `daily-standup` or `standup`. Create a **#daily-standup** channel, invite the coordinator bot (Kelly), and keep all team agents in that channel for "one team, one dream."

### Standup deliverables (code/features)

Action items parsed as **build** (e.g. "build feature X", "write a script for Y") trigger code delivery instead of a chat reminder:

- **Milaidy Gateway (optional):** If `MILAIDY_GATEWAY_URL` is set (e.g. `http://localhost:18789`), the worker POSTs the action to `POST {MILAIDY_GATEWAY_URL}/api/standup-action` with body `{ description, assigneeAgentName?, source: "vince-standup" }`. If Milaidy implements this endpoint, it can run its agent/tools and return `deliverablePath` or `message`. No change to the Milaidy repo is required in VINCE; the contract is documented in [docs/STANDUP_DELIVERABLES.md](docs/STANDUP_DELIVERABLES.md).
- **Fallback (in-VINCE):** When Milaidy is not set or the request fails, the worker uses the runtime LLM to generate a single file (TypeScript/JavaScript) and writes it to `STANDUP_DELIVERABLES_DIR` (default `./standup-deliverables/`). A `manifest.md` in that directory lists date, assignee, description, and filename. Set `STANDUP_BUILD_FALLBACK_TO_VINCE=false` to disable fallback (build items then only go to Milaidy).
- **Notification:** When a build deliverable is ready, a short message is pushed to the same channels as the standup summary (e.g. "Standup deliverable: … → `path` (from AgentName)").
- **Safety:** Generated code is written to disk only; it is not executed automatically. Review and run at your discretion.
- **Agent suggestions:** If the standup transcript includes agent-proposed improvements (new topics, tools, or process changes), they are appended to `standup-deliverables/agent-suggestions.md` for human review.
- **North-star deliverables:** Action items can also be parsed as **essay** (Substack), **tweets** (banger suggestions), **x_article** (long-form for X), **trades** (perps Hyperliquid + options HypeSurface for BTC/SOL/ETH/HYPE), **good_life** (Kelly-style founder lifestyle suggestions), **prd** (Sentinel: PRD for Cursor), or **integration_instructions** (Sentinel: Milaidy/OpenClaw setup and integration). These are generated in-VINCE and written to subdirs under `STANDUP_DELIVERABLES_DIR`. See [docs/NORTH_STAR_DELIVERABLES.md](docs/NORTH_STAR_DELIVERABLES.md).

## Feedback from agent testing (planned)

When testing an agent (e.g. Kelly) in Discord, we want the user to be able to provide **FEEDBACK** and get a concrete deliverable to improve the desired output. This is **not yet implemented**; the intended design is documented here for Sentinel and the team to read and implement later.

### Intended flow

1. **Trigger:** User sends a message that is clearly feedback from testing, e.g. `FEEDBACK: Kelly should recommend Biarritz restaurants when I ask for Biarritz` (or similar prefix/keyword).
2. **Tested agent (e.g. Kelly):** Uses a dedicated action (e.g. FEEDBACK or FEEDBACK_TO_IMPROVEMENT) that **asks Sentinel** via ASK_AGENT (or in-process `elizaOS.handleMessage`) with a structured request: agent tested, feedback text, and optional recent conversation context.
3. **Sentinel:** Receives the request and **triages**:
   - **Code/behavior fix** (prompts, actions, plugin logic) → produce a **PRD for Cursor** and write to `standup-deliverables/prds/` (existing pattern).
   - **Knowledge gap** (missing or outdated content in `knowledge/`) → produce an **Eliza task**: what to add or update and where (e.g. `knowledge/the-good-life/michelin-restaurants/biarritz-region.md`), and write to `standup-deliverables/eliza-tasks/`. This is a task for **Eliza** (or a human) to execute later—expand the corpus, run UPLOAD, ADD_MICHELIN_RESTAURANT, etc.
4. **Reply:** Sentinel returns a one-line confirmation (e.g. "PRD written to …" or "Eliza task written to …"); the tested agent relays it back to the user in Discord.

### Why triage

Not every feedback is a code change. Sometimes the gap is **knowledge** (e.g. "Kelly doesn't recommend Biarritz" because the-good-life content was thin or not retrieved). In that case the right fix is a **task for Eliza** (add/update knowledge), not a PRD for Cursor. Sentinel decides which deliverable to produce so the team gets either a pasteable PRD or a clear spec for knowledge updates.

### Deliverables (when implemented)

| Type        | Owner   | Path                               | Purpose |
|------------|---------|------------------------------------|---------|
| PRD        | Sentinel| `standup-deliverables/prds/`       | Code/behavior change; paste into Cursor. |
| Eliza task | Sentinel| `standup-deliverables/eliza-tasks/`| Knowledge gap; what to add/update where for Eliza or human. |

### Implementation notes (for later)

- **Tested-agent side:** New action (e.g. in plugin-inter-agent) that validates on a FEEDBACK trigger, optionally fetches last N messages in the room for context, builds the structured request, and calls Sentinel (same in-process path as ASK_AGENT); then callbacks with Sentinel's reply.
- **Sentinel side:** New action (e.g. SENTINEL_FEEDBACK_DELIVERABLE) that validates on the structured "Generate a deliverable from agent feedback" request, runs a triage LLM (prd vs eliza_task), then generates and writes the appropriate deliverable; returns the file path to the caller.
- **Docs:** Add `eliza-tasks/` and this flow to [docs/NORTH_STAR_DELIVERABLES.md](docs/NORTH_STAR_DELIVERABLES.md) when implemented. Full plan is in `.cursor/plans/` (feedback to PRD or Eliza task).
- **Reference:** The [ElizaOS autonomous examples (TypeScript)](https://github.com/elizaOS/examples/tree/main/autonomous/typescript) may be useful to achieve this (autonomous flows, agent coordination, structured requests).

### Limitations vs OpenClaw (evaluation note)

The current setup (ElizaOS, ASK_AGENT, in-process `elizaOS.handleMessage`, standup + deliverables) has inherent limits compared to a stack built around session-based, tool-native agent-to-agent coordination:

- **Synchronous ask:** ASK_AGENT blocks the requester for up to ~90s. There is no first-class “send to another agent and get a callback when done” or “announce step” pattern. OpenClaw exposes [Agent-to-Agent session tools](https://github.com/openclaw/openclaw) (`sessions_list`, `sessions_send`, `sessions_history`) with optional reply-back and announce, so an agent can message another session and either wait for a reply or be notified later—better fit for feedback→deliverable flows that may take time.
- **A2A is layered, not native:** We add A2A on top of ElizaOS (plugin-inter-agent, allowlists, handleMessage). OpenClaw’s Gateway is a single control plane with multi-session routing and first-class session tools; agent-to-agent is a core use case rather than a plugin.
- **One process, many runtimes vs one Gateway, many sessions:** Both are “single deployment,” but OpenClaw’s model (workspaces, sessions, skills) is designed for “route channel/peer to session” and “session talks to session via tools.” Our standup and feedback flows are custom logic on top of runtime composition.
- **Tradeoff, not a defect:** The current setup keeps the full ElizaOS character/action/provider/evaluator model, the existing standup implementation (Kelly, transcript parsing, Milaidy, north-star deliverables), and Option C Discord (separate bot identity per agent). Moving to [OpenClaw](https://github.com/openclaw/openclaw) would mean reimplementing standup, PRD/Eliza-task generation, and possibly multi-Discord identity using OpenClaw’s session/skill/tool model—a large migration. For feedback→PRD/Eliza task, both stacks can achieve it; the difference is how much is built-in (session tools, reply-back) vs custom (actions + ASK_AGENT). When designing or scaling multi-agent and feedback flows, it’s useful to keep OpenClaw in mind as an alternative architecture rather than assuming we must only extend the current one.

### Advantages of our setup

- **Distinct agent identities (Option C):** Each agent has its own Discord Application ID, so in Discord users see separate bots (Vince, Kelly, Sentinel, etc.) with clear branding and presence. We’re not multiplexing one bot by session; each agent is a first-class identity in the channel.
- **ElizaOS agent model:** Character, actions, providers, evaluators, knowledge/RAG, and tasks are all first-class. We get rich semantics (e.g. “Kelly runs this action when this provider says X”) and built-in learning (evaluators, memory, facts). OpenClaw is centered on tools and skills; we have a full agent abstraction with prompts, validation, and response flow.
- **Standup and deliverables already built:** Kelly-coordinated 2×/day standup, transcript parsing, action-item types (remind vs build), Milaidy Gateway hook, north-star deliverable types (prd, essay, tweets, trades, good_life, integration_instructions), and writing to `standup-deliverables/` are implemented. Recreating this on another stack would be a large project.
- **A2A policy:** `allowedTargets` and optional `allow` rules (source → target) give per-character control over who can ask whom. We can express “only Kelly can ask Sentinel” or “Eliza can ask anyone in the list” without extra infrastructure.
- **Single process, shared persistence:** All runtimes run in one process with a shared database (memories, rooms, entities, relationships). In-process ASK_AGENT has no network hop; we avoid distributed coordination and multi-service ops for the main A2A path.
- **ElizaOS plugin ecosystem:** We compose plugin-vince, plugin-kelly, plugin-sentinel, plugin-inter-agent, and other ElizaOS plugins in one codebase. Patterns (actions, providers, routes) are consistent and we can reuse or extend community plugins.

## Troubleshooting

### Discord: "Could not find guild for channel (not in cache and fetch failed)"

This warning comes from the Discord plugin’s VOICESTATE provider when it tries to resolve the guild for a channel and the guild isn’t in the client cache (e.g. channel from another server, or right after the bot joins). It is usually **benign** and does not affect normal text messaging or ASK_AGENT. If you need voice-state behavior in that channel, ensure the bot is in the same server as the channel and the guild is loaded; otherwise you can ignore the warning.
