# plugin-inter-agent

Lets agents ask other agents a question and report the answer back (ASK_AGENT). Used for "One Team, One Dream" flows (e.g. Kelly asking Vince, Solus, etc.). Also provides **standups**: Kelly-coordinated daily round-robin meetings that produce an actionable Day Report and answer the **essential question** (e.g. "Will BTC be above $70K by next Friday?") in Grok-style depth.

## Daily standup: agent roles and flow

Standup is turn-based. **Kelly** kicks off and acts only as coordinator (very short; transitions like "@VINCE, go."). Turn order is fixed: **VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel** → Kelly synthesizes the **Day Report**. The **scheduled** standup uses a short Kelly-style kickoff: `Standup YYYY-MM-DD. @VINCE, go.`

| Agent   | Role during standup |
|--------|----------------------|
| **Kelly**   | Coordinator only. Keeps it very short; no commentary or summaries between agents. |
| **VINCE**   | Most accurate data and recent news. Reports paper trading bot results for perps on Hyperliquid. |
| **Eliza**   | Mostly listening. Reports knowledge gaps spotted, essay ideas (Ikigai Studio Substack), and research to upload to `knowledge/`. |
| **ECHO**    | Shows insights from X (plugin-x-research): sentiment, key voices, narrative. |
| **Oracle**  | Polymarket data; caveat that real-time is still unreliable. |
| **Solus**   | Does most of the thinking. Answers the **essential question** (e.g. BTC above $70K by next Friday?) using prior reports; Grok-style: data, sentiment, Polymarket, clear Yes/No, short-term path. Options settle Friday 08:00 UTC (Hypersurface). |
| **Otaku**   | Under construction. Brief status; agent with wallet (Bankr, Coinbase) and DeFi skills. |
| **Sentinel**| What's next in coding and what's been pushed to the repo. |

The **Day Report** includes: **Essential question**, **Solus's call** (Above/Below/Uncertain + one sentence), TL;DR, signals table, and actions. Full behavior and quality bar are documented in `standup-deliverables/prds/2026-02-12-prd-v2-1-0-release-notes-sentinel-eliza-upgrades.md` (§ Daily Standup: Agent Roles and Quality Bar).

**Essential question** is configurable via `ESSENTIAL_STANDUP_BTC_LEVEL` (e.g. `70000`); default text: "Based on current market sentiment, do you think BTC will be above $70K by next Friday?"

### Standup schedule and env

| Env | Default | Description |
|-----|--------|-------------|
| `STANDUP_ENABLED` | — | Set to `"true"` to enable standup. |
| `STANDUP_COORDINATOR_AGENT` | `Kelly` | Agent that registers the task and facilitates. |
| `STANDUP_UTC_HOURS` | `9` | Comma-separated UTC hours (e.g. `"9"` = 09:00 daily, `"9,21"` = twice daily). |
| `STANDUP_DELIVERABLES_DIR` | `standup-deliverables` | Root dir for day reports and manifest. Day reports are written to `day-reports/YYYY-MM-DD-day-report.md` (both manual wrap-up and scheduled standup). |

## Evaluators

### A2A_LOOP_GUARD

The **A2A Loop Guard** evaluator (`src/evaluators/a2aLoopGuard.evaluator.ts`) prevents infinite loops when agents reply to each other (e.g. in Discord). It runs only on messages from known agents/bots and enforces:

1. **Reply-to-self (ping-pong):** Do not respond to a message that is a reply to our own message.
2. **Max exchanges:** Do not respond if we have already replied to this sender N times in the last `A2A_LOOKBACK_MESSAGES` messages.

**Env:**

| Env | Default | Description |
|-----|--------|-------------|
| `A2A_ENABLED` | `true` | Set to `"false"` to disable the guard. |
| `A2A_MAX_EXCHANGES` | `3` | Max replies to the same agent in recent history (general A2A). |
| `A2A_LOOKBACK_MESSAGES` | `10` | How many messages to look back when counting exchanges. |

In **standup channels**, the **A2A context provider** uses a stricter cap: `A2A_STANDUP_MAX_EXCHANGES` (default `1`), so each agent is expected to reply at most once per call. The loop guard is defense-in-depth; the provider’s injected context is what enforces the standup “one reply per turn” behavior.

## When to use plugin-inter-agent vs plugin-agent-orchestrator

- **plugin-inter-agent** (this plugin): **Multi-runtime** A2A—ask another **agent** by name (ASK_AGENT) and standups. Each agent (Vince, Kelly, Sentinel, etc.) has its own runtime; `elizaOS.getAgents()` / `handleMessage(agentId, msg)` route to the correct one. Use for "Kelly asks Vince" and autonomous standups.
- **plugin-agent-orchestrator** ([next/typescript](https://github.com/elizaos-plugins/plugin-agent-orchestrator/tree/next/typescript)): Task lifecycle (CREATE_TASK, PAUSE, RESUME, CANCEL), **same-agent** subagent (new room, background run, announce), session-based SEND_TO_SESSION, MessagingService (cross-platform send). Orchestrator A2A is single-runtime (session/room within one process) and does **not** replace inter-agent for "Kelly asks Vince." Use orchestrator for "spawn a background task for this agent" or unified messaging APIs.

## Room ID and multi-agent communication (ElizaOS docs)

Per [ElizaOS Core Runtime — Multi-Agent Communication](https://docs.elizaos.ai/runtime/core#multi-agent-communication):

- **Same room ID and entityId**: For agents to interact in the same conversation, send the **same `roomId`** and **same `entityId`** (the user) to the target agent. We pass `message.roomId` and `message.entityId` when calling `elizaOS.handleMessage(targetAgentId, userMsg)`, so the target (e.g. Vince) runs in the **same room** as the user’s chat with Kelly.
- **Async callbacks** ([Async Mode with Callbacks](https://docs.elizaos.ai/runtime/core#async-mode-with-callbacks)): `handleMessage(agentId, message, { onResponse(content) => content.text, onComplete })`. The core calls **onComplete** when `messageService.handleMessage`’s promise resolves, which can be **before** the REPLY action invokes the callback with the final text. We therefore **do not** settle “no reply” on onComplete; we only settle when **onResponse** receives content with `.text` or when the in-process timeout (95s) fires. That way a late callback with the real reply is still captured.
- **World ID**: A **world** is a container (e.g. a Discord server) that **contains** rooms. We pass `worldId` when ensuring connections; the room already belongs to a world.

So: **same roomId + entityId** = same conversation context. We wait for onResponse(text) or timeout, not onComplete.

## In-process vs job API

When **`runtime.elizaOS`** is set (same-process agent registry), ASK_AGENT calls `elizaOS.handleMessage` in-process (async first, then sync, then direct messageService). When it is not set, or when in-process does not deliver a reply, the action falls back to **POST /api/messaging/jobs**. The plugin logs `[ONE_TEAM] elizaOS on runtime` when **that agent’s runtime is initialized** (once per agent). The server often initializes agents lazily (on first use), so you may only see the log for agents you’ve already chatted with; open each agent’s chat once to “warm” all runtimes so ASK_AGENT can find everyone. If `hasElizaOS` is false, only the job API is used. Job timeout is 90s and we poll up to 100s so slow replies can complete.

## Job API contract (when in-process is not available)

When the in-process path is not used (no `runtime.elizaOS`), ASK_AGENT falls back to **POST /api/messaging/jobs**. For the job to complete successfully, the server must ensure that when the target agent sends a reply, the send handler emits **`new_message`** with:

- **`channel_id`** = the job’s channel id (the room/channel created for the job)
- **`author_id`** = the replying agent’s id

If the reply is emitted with a different channel (e.g. the user’s chat channel), the job’s `responseHandler` will never see it and the job will time out. Implementations (e.g. Direct plugin or server wrapper) can use message metadata such as `metadata.jobId` or `metadata.isJobMessage` to emit with the job’s `channelId` and the replying agent’s id when present.

## Troubleshooting (logs)

- **`[ASK_AGENT] onResponse called { hasText: false }` then `onComplete`**  
  The target agent ran and the core invoked `onResponse`, but the content had no (or empty) `text`. We also accept `message` as fallback. If both are empty, the agent may have errored before replying (e.g. downstream embedding or DB errors) or returned a different content shape; check for **OpenAI 400** or **SQL** errors in the same run.

- **`OpenAI API error: 400 - Bad Request` + `[PLUGIN:BOOTSTRAP:SERVICE:EMBEDDING] Failed to generate embedding`**  
  The embedding service is sending something the OpenAI embedding API rejects. Common causes: **empty input**, **control characters** in the text, or **token limit** exceeded. The same `memoryId` often appears repeatedly (retries). Fix: ensure memories are not empty; sanitize content (strip control chars); or reduce input length. Check `OPENAI_EMBEDDING_MODEL` and that the embedding provider is configured.

- **`MaxClientsInSessionMode: max clients reached`**  
  Postgres (e.g. Supabase) in session mode has hit the connection pool limit. Increase `pool_size` or use transaction/pooler mode so multiple agents don’t exhaust connections.
