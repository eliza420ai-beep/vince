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

This makes "who can ask whom" configurable per character and reduces misrouting.

## Subagent-Style Flow (Future)

Today ASK_AGENT is **synchronous**: the requester waits up to ~90s for the target's reply. If you want "ask Vince, continue the conversation, and get his answer when ready":

1. **Option A:** Add a subagent-style flow: create a dedicated room/task for "Vince answering Kelly's question," run it in the background, and post a summary back into Kelly's room when done. Requires a small task/subagent layer.
2. **Option B:** Use [plugin-agent-orchestrator](https://github.com/elizaos-plugins/plugin-agent-orchestrator) (when available from the `next` branch) for SPAWN_SUBAGENT and policy-based A2A.

See the plan in `.cursor/plans/` for lessons from the orchestrator plugin.
