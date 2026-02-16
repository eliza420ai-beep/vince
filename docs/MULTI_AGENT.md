# Multi-Agent Setup (VINCE)

**North star:** A Discord (or other channel) where your agents have names and profile images, talk to you and to each other, and run heartbeat-style check-ins that sometimes spark small conversations between them. When you're all collaborating, it feels genuinely *alive* — like you're building together. You have to remind yourself it's you and a bunch of AIs. That feeling is what we're optimizing for.

This doc is the **reference for our use case**: how we get there with VINCE. It covers ASK_AGENT (one agent asking another and relaying the answer), elizaOS attachment, Discord Option C (one bot identity per agent), A2A policy, standups (Kelly-coordinated 2×/day), and subagent-style options. One team, one dream—implemented here.

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

## Symmetric A2A Discord Chat (NEW)

Agents can now chat with each other **visibly in Discord** (not just via internal ASK_AGENT). This enables the north-star experience: agents talking to you AND each other in #daily-standup.

### How It Works

1. **Enable bot messages:** Set `shouldIgnoreBotMessages: false` in character settings
2. **Loop protection:** The `A2A_LOOP_GUARD` evaluator in plugin-inter-agent prevents infinite ping-pong

### Configuration

Both Eliza and VINCE have `shouldIgnoreBotMessages: false` by default (v2.4+). To configure:

```typescript
// In character settings
settings: {
  shouldIgnoreBotMessages: false,  // Respond to other bots
}
```

### Loop Guard Behavior

The `A2A_LOOP_GUARD` evaluator automatically:

1. **Max exchanges** — Stops responding after N back-and-forth messages (default: 3)
2. **Ping-pong detection** — Won't respond to a reply to its own message
3. **Known agent detection** — Only applies to messages from known agents (vince, eliza, kelly, solus, otaku, sentinel, echo, oracle)

### Env Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `A2A_ENABLED` | `true` | Set to `"false"` to disable loop guard (not recommended) |
| `A2A_MAX_EXCHANGES` | `3` | Max responses to same bot in recent history |
| `A2A_LOOKBACK_MESSAGES` | `10` | How many messages to look back for counting exchanges |

### Example Flow

```
User: "aloha @eliza, hope you enjoy your meeting with @vince"
  ↓
Eliza: responds (shouldIgnoreBotMessages: false)
  ↓
VINCE: responds to Eliza (shouldIgnoreBotMessages: false)
  ↓
Eliza: responds to VINCE (exchange 1)
  ↓
VINCE: responds (exchange 2)
  ↓
Eliza: responds (exchange 3)
  ↓
VINCE: [A2A_LOOP_GUARD] Max exchanges (3) reached → STOPS
```

### Requirements

- Both agents need `plugin-inter-agent` loaded (includes A2A_LOOP_GUARD evaluator)
- Both agents need separate Discord Application IDs (Option C)
- Both agents need `shouldIgnoreBotMessages: false` in settings

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

### Standup: shared daily insights and north star

The **north star** for standup is: *shared knowledge of the team is greater than the sum of each agent's individual knowledge*. To get there, the **scheduled** standup is **synthesis-first**: linking across domains, fact-checking, and actionable synthesis instead of each agent reporting their data in isolation.

- **Shared daily insights:** Before the meeting, the coordinator writes a **shared daily insights** file that merges each agent's live data (same sources as today's fetch) into one document—one section per agent (e.g. `## VINCE`, `## Eliza`, …). Path: **`standup-deliverables/daily-insights/YYYY-MM-DD-shared-insights.md`** (same root as Day Reports; see `STANDUP_DELIVERABLES_DIR`).
- **Kickoff:** The first message in the room **includes** that shared document plus a short instruction: *"Above: shared daily insights. Link, fact-check, brainstorm — then we get to the Day Report. Standup {date}. @VINCE, go."*
- **Turn semantics:** When the shared-insights sentinel is present, each agent's turn is **not** "report your data" but: add (1) one **link** between your domain and another agent's insight, (2) one **fact-check** or clarification if needed, (3) one **brainstorm or risk**, (4) one **actionable take**. So the conversation is linking/fact-check/brainstorm first; the Day Report is then built from this richer transcript.
- **Manual standup:** Unchanged unless "gather insights" is added later; manual standup uses the current flow (short kickoff, report-your-data turns).
- **North star KPI (informational):** After standup, the transcript is scanned for cross-agent links (e.g. an agent mentioning another by name and a linking phrase like "aligns with", "Oracle's data"). The count is logged (`[Standup] North star: N cross-agent link(s) detected`) and optionally included in the pushed summary. Non-blocking; for visibility into whether standups are improving on the 1+1=3 goal.

### Standup tuning

To reduce token burn and rate limits in #daily-standup, the following behavior and env are used:

- **Early exit:** In standup channels, only the **single responder** (default Kelly) may reply to **human** messages; only an agent **directly called by name** (e.g. "@Solus, go") may reply to **agent** messages. All other agents skip the LLM (bootstrap `shouldRespond` returns false before any composeState or model call).
- **Reflection:** Reflection evaluator is **skipped in standup channels by default**. Set `REFLECTION_RUN_IN_STANDUP=true` to run reflection in standup.
- **A2A env:** `A2A_STANDUP_CHANNEL_NAMES` (default `standup,daily-standup`), `A2A_STANDUP_SINGLE_RESPONDER` (default Kelly), `A2A_MAX_EXCHANGES` (default 2; non-standup), `A2A_STANDUP_MAX_EXCHANGES` (default 1; in standup), `A2A_LOOKBACK_MESSAGES` (default 10).
- **Solus:** When called in standup, Solus is prompted to lead with options/strike/position call (Hypersurface); triggers for SOLUS_POSITION_ASSESS and SOLUS_HYPERSURFACE_EXPLAIN are broadened for standup phrasing (e.g. "underwater", "assigned", "our $70k puts").

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

### Strategy: OpenClaw as dev worker?

A different way to get “where we need to be” is to **run [OpenClaw](https://github.com/openclaw/openclaw) with access to this repo and instructions to keep working on it**—i.e. use OpenClaw as the *executor* that turns our deliverables into code and knowledge, rather than (or in addition to) humans and Cursor.

**Two interpretations:**

1. **OpenClaw as dev worker (hybrid):** VINCE stays on ElizaOS. We run OpenClaw separately with a session that has repo access (clone, read/write/edit, bash) and standing instructions: e.g. “Implement PRDs in `standup-deliverables/prds/` and Eliza tasks in `standup-deliverables/eliza-tasks/`; open PRs, run tests, keep the codebase consistent with our docs.” Standup and feedback flow keep producing deliverables; OpenClaw’s agent applies them. That can be **more efficient** if the bottleneck is human implementation: no paste-PRD-into-Cursor step; one agent reads the deliverable and edits the repo (with PRs for review).
2. **Full migration to OpenClaw:** Rebuild VINCE (Vince, Kelly, Sentinel, standup, deliverables) on OpenClaw’s Gateway/sessions/skills. As argued above, that’s a large reimplementation and likely **less** efficient for “getting there fast”—we’d spend time recreating what we have.

**Why the dev-worker idea can be more efficient:**

- **Fewer handoffs:** Today: Sentinel (or feedback flow) writes PRD → human copies to Cursor → human (or Cursor) implements. With OpenClaw as worker: deliverable is written to disk → OpenClaw session (triggered by cron, skill, or manual “implement latest PRD”) reads it and applies changes → human reviews PR. Throughput of “idea → code” can go up.
- **One agent with long context and tools:** OpenClaw’s Pi agent has bash, read, write, edit, and (with skills) can follow structured instructions. Giving it the repo + AGENTS.md/CLAUDE.md/MULTI_AGENT.md and “implement PRDs; prefer opening PRs over direct push” fits its model. Session tools (`sessions_send`, reply-back) could let another session (or you) send “implement the feedback flow” and get a reply when done.
- **Sandboxing:** Non-main sessions can run in Docker with an allowlist; a “dev” session could have only repo-related tools, reducing blast radius.

**Caveats:**

- **Two systems:** VINCE (ElizaOS) for product and standup; OpenClaw for the coding agent. You run and secure both; OpenClaw needs repo credentials (e.g. token with PR scope).
- **Quality and review:** Autonomous code changes can introduce bugs. Prefer “open PR, human merges” over “push to main.” Set clear instructions (run tests, lint, follow MULTI_AGENT and CLAUDE).
- **Triggering:** OpenClaw isn’t built for “watch this folder and run when a new file appears.” You’d implement that via a skill that polls `standup-deliverables/`, or a cron job that sends a message to the dev session (“implement any new PRDs”), or manual “implement the latest PRD” in chat.

**Conclusion:** Using OpenClaw as a dev worker with this repo and instructions to implement our deliverables is a **viable strategy** to evaluate. Efficiency gain is real if the main bottleneck is human implementation of PRDs and the agent is reliable enough that review is lighter than doing the work yourself. If the bottleneck is design or product decisions, our current path (Sentinel PRDs + Cursor/human) or strengthening the Milaidy Gateway may be enough. Documenting this here so the team can decide and, if desired, prototype (e.g. one OpenClaw session, repo clone, “implement this PRD” as a test).

**Milaidy as an alternative:** [Milaidy](https://github.com/milady-ai/milaidy) is built on ElizaOS by the ElizaOS team and could achieve the same dev-worker goal with **better stack alignment**. We already integrate with Milaidy for standup build actions: when `MILAIDY_GATEWAY_URL` is set, the standup worker POSTs to `POST {MILAIDY_GATEWAY_URL}/api/standup-action` with `{ description, assigneeAgentName?, source: "vince-standup" }` (see [Standup deliverables (code/features)](#standup-deliverables-codefeatures) and [docs/STANDUP_DELIVERABLES.md](docs/STANDUP_DELIVERABLES.md)). Milaidy has a Gateway (port 18789), workspace, skills (AGENTS.md, TOOLS.md), and tools; if it implements or extends the standup-action contract to accept “implement this PRD in repo X” (or we add a separate endpoint/skill), we could use Milaidy as the executor instead of OpenClaw. Benefits: same ElizaOS paradigm (actions, tools, skills), one ecosystem, and we already have the integration point—so “send build/PRD to Milaidy” is a contract extension rather than standing up a second stack. Tradeoff: OpenClaw has more adoption and documented session A2A tools; Milaidy is smaller but aligned with our stack. For “dev worker with repo access and instructions to implement deliverables,” both are viable; Milaidy may be the more natural fit if we want to stay within the ElizaOS family and leverage the existing Gateway hook.

### Recommendation

- **First:** Implement the [Feedback from agent testing](#feedback-from-agent-testing-planned) flow in VINCE (trigger, tested agent asks Sentinel, triage, write to `standup-deliverables/prds/` and `eliza-tasks/`). Keep implementation in Cursor/human: Sentinel (and feedback) produce PRDs and Eliza tasks; humans or Cursor apply them. No second system yet.
- **Then:** If the bottleneck becomes “too many good PRDs, not enough implementation capacity,” add a dev worker. Prefer **Milaidy** (extend the standup-action contract or add a PRD endpoint; same ElizaOS stack, existing Gateway hook) over OpenClaw (second stack, more ops). Only add OpenClaw if there is a clear reason to prefer its session/tool model.
- **Rationale:** Shipping the feedback flow is a bounded, in-repo task. Autonomous “read PRD → edit repo → open PR” is non-trivial; add it only when the need is clear. Milaidy is the more coherent choice when we do.

## Troubleshooting

### Discord: "Could not find guild for channel (not in cache and fetch failed)"

This warning comes from the Discord plugin’s VOICESTATE provider when it tries to resolve the guild for a channel and the guild isn’t in the client cache (e.g. channel from another server, or right after the bot joins). It is usually **benign** and does not affect normal text messaging or ASK_AGENT. If you need voice-state behavior in that channel, ensure the bot is in the same server as the channel and the guild is loaded; otherwise you can ignore the warning.
