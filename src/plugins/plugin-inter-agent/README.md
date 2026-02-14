# plugin-inter-agent

Multi-agent coordination for VINCE: agents ask other agents and report back (ASK_AGENT), and Kelly-coordinated standups produce an actionable Day Report with a prioritized action-item backlog processed by the Ralph loop (execute → verify → learn).

## What this plugin provides

- **ASK_AGENT** — Ask another agent (Vince, Kelly, Solus, Sentinel, Eliza, Otaku, Clawterm, etc.) a question and relay the answer. In-process via `runtime.elizaOS.handleMessage` or fallback to POST `/api/messaging/jobs`.
- **STANDUP_FACILITATE** — Kelly kicks off the standup, runs round-robin (each agent reports), then wraps up with a Day Report. Day Report includes TL;DR, essential question, signals, and a WHAT/HOW/WHY/OWNER action table.
- **DAILY_REPORT** — On-demand daily report (standup-style synthesis).
- **Action item backlog** — Items from the Day Report table are stored in `standup-deliverables/action-items.json`, prioritized by a planner, and processed one-at-a-time by the **Ralph loop** (execute → verify → update status → append to learnings log).
- **A2A Loop Guard + A2A Context** — Evaluator prevents infinite ping-pong (max exchanges, reply-to-self). **A2A_CONTEXT** provider injects standup turn-taking, human-priority response, and single-responder rules. Set `shouldIgnoreBotMessages: false` on agents that should respond to other bots.

## ASK_AGENT

One agent asks another by name; the answer is relayed back. Resolution: in-process `elizaOS.getAgentByName` + `handleMessage` (preferred), then sync/fallback, then job API. See [docs/MULTI_AGENT.md](../../../docs/MULTI_AGENT.md) § ASK_AGENT.

## Daily standup: agent roles and flow

Standup is turn-based. **Kelly** kicks off and acts only as coordinator (very short; transitions like "@VINCE, go."). Turn order is fixed: **VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel → Clawterm** → Kelly synthesizes the **Day Report**. The **scheduled** standup uses a short Kelly-style kickoff; the **manual** path is triggered by "wrap up" / "day report" etc.

| Agent   | Role during standup |
|--------|----------------------|
| **Kelly**   | Coordinator only. Keeps it very short; no commentary or summaries between agents. |
| **VINCE**   | Most accurate data and recent news. Reports paper trading bot results for perps on Hyperliquid. |
| **Eliza**   | Mostly listening. Reports knowledge gaps, essay ideas (Ikigai Studio Substack), research to upload to `knowledge/`. |
| **ECHO**    | Insights from X (plugin-x-research): sentiment, key voices, narrative. |
| **Oracle**  | Live Polymarket priority markets (YES%, condition_id). Real-time odds via GET_POLYMARKET_PRICE. |
| **Solus**   | Does most of the thinking. Answers the **essential question** (e.g. BTC above $70K by next Friday?) using prior reports; Grok-style: data, sentiment, Polymarket, clear Yes/No, short-term path. Options settle Friday 08:00 UTC (Hypersurface). |
| **Otaku**   | Under construction. Brief status; agent with wallet (Bankr, Coinbase) and DeFi skills. |
| **Sentinel**| What's next in coding and what's been pushed to the repo. |
| **Clawterm**| OpenClaw/AI/AGI: X and web sentiment, gateway status, one clear take. |

The **Day Report** includes: **Essential question**, **Solus's call** (Above/Below/Uncertain + one sentence), TL;DR, signals table, and an action plan table (WHAT / HOW / WHY / OWNER). Full behavior and quality bar are in `standup-deliverables/prds/` (e.g. 2026-02-12-prd-v2-1-0-release-notes-sentinel-eliza-upgrades.md).

**Shared daily insights:** For the **scheduled** standup, a shared daily insights file is written **before** the meeting to `standup-deliverables/daily-insights/YYYY-MM-DD-shared-insights.md`. The kickoff includes this so the conversation is synthesis-first. North star = shared knowledge > sum of individual silos. See [docs/MULTI_AGENT.md](../../../docs/MULTI_AGENT.md) § Standup: shared daily insights.

**Essential question** is configurable via `ESSENTIAL_STANDUP_BTC_LEVEL` (e.g. `70000`); default: "Based on current market sentiment, do you think BTC will be above $70K by next Friday?"

**Cross-agent validation:** Signals (bullish/bearish) are extracted from each agent's report and validated across assets (BTC, SOL, HYPE). Divergence (e.g. one agent bullish, another bearish) is flagged and confidence adjusted; aligned signals get higher confidence. This context is included in the Day Report synthesis.

---

## Action items and Ralph loop

Action items from the Day Report (WHAT/HOW/WHY/OWNER table) are the single backlog. They are stored in a file, prioritized by a planner, and processed one-at-a-time by a recurring **Ralph loop** task: pick next → execute → verify → update status → log learnings.

### Backlog (file store)

- **Path:** `standup-deliverables/action-items.json` (or `STANDUP_DELIVERABLES_DIR/action-items.json`).
- **When:** After each Day Report, rows from the action table are parsed and appended via `addActionItem`. Each item has: id, date, what, how, why, owner, urgency, status, optional priority, outcome, completedAt.
- **Statuses:** `new` → `in_progress` → `done` | `failed` | `cancelled`.

### Planner (priority)

- **When:** Right after `generateAndSaveDayReport` (in both wrap-up and round-robin flows).
- **What:** Rule-based order: urgency `now` &lt; `today` &lt; `this_week` &lt; `backlog`, then `createdAt`. Priorities (1 = first) are written back to the file store via `updateActionItemPriorities`.

### Ralph loop task

- **Task name:** `STANDUP_RALPH_LOOP`. Registered only on the standup coordinator (e.g. Kelly). Runs on an interval (default 5 min).
- **Each run:**  
  1. `getPendingActionItems()` (status `new` or `in_progress`).  
  2. Sort by `priority` (asc), then `createdAt`. Take the first item.  
  3. Set status `in_progress`.  
  4. **Execute:** Build/north-star → `executeBuildActionItem` (Milaidy Gateway or in-VINCE fallback); Remind → `handleMessage` to assignee agent. Type is inferred from item text (e.g. "remind", "ping", "follow up" → remind).  
  5. **Verify:** For build/north-star, deliverable path must exist and be non-empty; for remind, success after message sent.  
  6. Update item: `done` (with outcome) or `failed` (with message).  
  7. **Learnings:** Append one entry to `standup-deliverables/standup-learnings.md` (date, status, owner, what, outcome, optional learning sentence).  
  8. Optionally push a one-line summary to standup channels (Discord/Slack/Telegram).

So: one item per run, in priority order, with verification and a persistent "what we learned" log.

### Verifier and learnings

- **Verifier** (`standupVerifier.ts`): For a build result with `path`, checks file exists and is non-empty. For message-only result (e.g. remind sent), returns ok. Used before marking an item `done`.
- **Learnings** (`standupLearnings.ts`): Append-only `standup-learnings.md` in the deliverables dir. One block per completed (or failed) item: date, status, @owner, what, outcome, optional learning.

### Legacy per-item tasks

When **STANDUP_USE_RALPH_LOOP** is `false`, the plugin creates one ElizaOS queue task per action item (old behavior). Default is `true`, so the Ralph loop is the only consumer of the file-store backlog; set `STANDUP_USE_RALPH_LOOP=false` to restore per-item tasks.

---

## Standup schedule and env

| Env | Default | Description |
|-----|--------|--------------|
| `STANDUP_ENABLED` | — | Set to `"true"` to enable standup. |
| `STANDUP_COORDINATOR_AGENT` | `Kelly` | Agent that registers the task and facilitates. |
| `STANDUP_UTC_HOURS` | `9` | Comma-separated UTC hours (e.g. `"9"` = 09:00 daily, `"9,21"` = twice daily). **Runs every day including weekend** — no weekday-only filter. |
| `STANDUP_INTERVAL_MS` | `3600000` | Interval (ms) between schedule checks for the main standup task (1h). |
| `STANDUP_SCHEDULE` | `0 8 * * *` | Cron expression for scheduler (minute hour * * *). Used when STANDUP_AUTO_START is true. |
| `STANDUP_AUTO_START` | `false` | Set to `"true"` to enable cron-style auto kickoff at STANDUP_SCHEDULE. |
| `STANDUP_TIMEZONE` | `UTC` | Timezone for schedule (scheduler). |
| `STANDUP_DELIVERABLES_DIR` | `standup-deliverables` | Root dir for day reports, action-items.json, standup-learnings.md, north-star deliverables (prds/, essays/, etc.). |
| `STANDUP_RALPH_INTERVAL_MS` | `300000` | Ralph loop interval (ms). Process one action item per run (default 5 min). |
| `STANDUP_USE_RALPH_LOOP` | `true` | When true, backlog is processed only by the Ralph loop; when false, legacy per-item queue tasks are created. |
| `STANDUP_BUILD_FALLBACK_TO_VINCE` | `true` | When Milaidy Gateway is not set, generate code/deliverables in-VINCE and write to deliverables dir. |
| `MILAIDY_GATEWAY_URL` | — | Optional. When set, build action items are POSTed to `{url}/api/standup-action`. |
| `STANDUP_TRANSCRIPT_LIMIT` | `8000` | Max chars of transcript sent to LLM for parse (action items, lessons, disagreements). |
| `STANDUP_SESSION_TIMEOUT_MS` | `1800000` | Session timeout (30 min). Inactivity/skip: `STANDUP_INACTIVITY_TIMEOUT_MS`, `STANDUP_SKIP_TIMEOUT_MS`. |
| `STANDUP_AGENT_TURN_TIMEOUT_MS` | `90000` | Agent turn timeout for round-robin (90s). |
| `STANDUP_RESPONSE_DELAY_MS` | `2000` | Delay (ms) between agent turns to reduce rate limits. |
| `STANDUP_INACTIVITY_TIMEOUT_MS` | `300000` | Skip agent if no response within this (5 min). |
| `STANDUP_SKIP_TIMEOUT_MS` | (same as inactivity) | Timeout before marking agent skipped. |
| `STANDUP_TRACKED_ASSETS` | `BTC,SOL,HYPE` | Comma-separated assets for cross-agent signal validation. |
| `STANDUP_SNIPPET_LEN` | `120` | Max snippet length for X/tweet context. |
| `ESSENTIAL_STANDUP_BTC_LEVEL` | `70K` | Level for essential question (e.g. "BTC above $70K by next Friday?"). |
| `STANDUP_HUMAN_NAME` | `livethelifetv` | Human display name in standup prompts and review context. |
| `STANDUP_HUMAN_DISCORD_ID` | `711974052322869322` | Discord user ID for @mention pings (e.g. wrap-up fallback). |
| `A2A_KNOWN_HUMANS` | `livethelifetv,ikigai` | Comma-separated usernames that get priority response in standup/A2A. |
| `A2A_STANDUP_DISCORD_MENTION_IDS` | — | Optional. JSON or `name:id,name:id` for @mention in standup (e.g. `vince:123,clawterm:456`). Per-agent `VINCE_DISCORD_BOT_USER_ID` etc. also supported. |

Day reports are written to `{STANDUP_DELIVERABLES_DIR}/day-reports/YYYY-MM-DD-day-report.md`. Manifest and metrics: `manifest.md`, `standup-metrics.jsonl` in the same dir.

**Deliverables layout:** Under `STANDUP_DELIVERABLES_DIR`: `day-reports/`, `action-items.json`, `standup-learnings.md`, `daily-insights/` (shared pre-standup), `prds/` (PRDs from Sentinel), `essays/`, `integration-instructions/` (Milaidy/OpenClaw etc.). North-star build outputs go under this tree.

**Optional schedule (cron-style):** Besides `STANDUP_UTC_HOURS` + `STANDUP_INTERVAL_MS`, you can use **STANDUP_SCHEDULE** (cron, e.g. `0 8 * * *` = 8 AM UTC daily), **STANDUP_AUTO_START** (`true` to enable), and **STANDUP_TIMEZONE** (default `UTC`). The scheduler uses a ±1 minute window so triggers are not missed.

**Testing a standup:** In Discord (or your standup channel), the human (e.g. livethelifetv) can trigger manually: *"let's do a new standup kelly"* or *"day report"* / *"wrap up"*. Kelly should reply with STANDUP_FACILITATE: kickoff, round-robin (VINCE → Eliza → … → Clawterm), then Day Report + action items. Check: (1) only Kelly responds to the human in the standup channel (single-responder), (2) Day Report appears in `standup-deliverables/day-reports/YYYY-MM-DD-day-report.md`, (3) action items in `action-items.json` and Ralph loop processes them when enabled.

---

## Manual standup trigger: implementation notes

The following fixes were applied so that a human saying *"let's do a new standup kelly"* in `#daily-standup` reliably triggers Kelly to run **STANDUP_FACILITATE** (kickoff → round-robin → Day Report). Documented for maintainers and debugging.

### 1. PGLite deadlock (only Kelly processes standup messages)

**Problem:** When a message hits `#daily-standup`, every agent (VINCE, Eliza, Kelly, etc.) receives it. Each runs `processMessage`: `createMemory`, `ensureAllAgentsInRoom`, `ensureMessageSendersInRoom`. With 7+ agents doing concurrent DB writes against a single PGLite instance, they deadlock — all show "typing", none complete.

**Fix:** In plugin `init`, non-facilitator agents get a **monkey-patch** on `runtime.messageService.handleMessage`. The patched handler checks if the message's room is a standup channel (by name); if yes, it returns immediately with a no-op result (no DB access). Only Kelly (unpatched) processes. Deferred 5s and 15s so `messageService` is registered; idempotent so double-patch is safe.

**Logs:** `[ONE_TEAM] Standup skip: vince dropping message in standup room (only kelly processes)`.

### 2. shouldRespond: force respond in standup channel (Kelly)

**Problem:** The core's `shouldRespond()` treats GROUP channels without an @mention as "needs LLM evaluation". That evaluation uses a minimal `composeState` (no A2A_CONTEXT), so the LLM returns IGNORE/NONE. Kelly never reaches the full response flow.

**Fix:** Kelly's `handleMessage` is wrapped (deferred 5s after init). For messages in a standup channel, the wrapper sets `message.content.mentionContext.isMention = true`. The core then skips LLM evaluation and responds. Full `composeState` (including A2A_CONTEXT) runs, so Kelly sees "force STANDUP_FACILITATE" when appropriate.

**Logs:** `[KELLY_STANDUP] Injected isMention for standup message: "let's do a new standup kelly"`.

### 3. Human vs agent: entity-ID–based detection

**Problem:** Discord often leaves `message.content.name` and `message.content.userName` empty. The A2A provider used these for "known human" detection; with `senderName=""`, the message was classified as "unknown-agent" (because `message.agentId` is set to the receiving agent). The "force STANDUP_FACILITATE" branch never ran.

**Fix:** Before name-based checks, the provider asks whether `message.entityId` is in the set of all **agent IDs** (`runtime.elizaOS.getAgents()` + self). If it is **not** an agent ID, the sender is treated as **human** (`senderIsDefinitelyHuman = true`). Optional: resolve display name via `runtime.getEntityById(message.entityId)` for logs. Known humans list (`A2A_KNOWN_HUMANS`) remains for name-based priority when names are present.

**Logs:** `[A2A_CLASSIFY] sender="livethelifetv", definitelyHuman=true, isAgent=false, inStandup=true` then `[A2A_CONTEXT] Kelly: Human asked to start standup — force STANDUP_FACILITATE`.

### 4. Kickoff sent immediately (no hang on shared insights)

**Problem:** `handleKickoff` used to call `buildAndSaveSharedDailyInsights` before `callback(kickoffText)`. That call can be slow or fail; Discord showed "Kelly is typing..." with no message.

**Fix:** Send the **short** kickoff (`buildKickoffMessage()`) via callback **immediately** after `startStandupSession()`. Then run `buildAndSaveSharedDailyInsights` and build the richer kickoff text for round-robin context only.

### 5. A2A prompt for standup kickoff

The provider returns a strong instruction when a human asks to start the standup: *"You MUST use action **STANDUP_FACILITATE** and NO other action. Do NOT output conversational text — the action will post the kickoff. Output only: &lt;actions&gt;STANDUP_FACILITATE&lt;/actions&gt; with minimal or no &lt;text&gt;."* This reduces the chance the LLM chooses REPLY instead.

### 6. Kelly timeout wrapper

Kelly's `handleMessage` wrapper applies a timeout so a stuck run fails visibly. **In standup channels** the timeout is the full **session timeout** (`STANDUP_SESSION_TIMEOUT_MS`, default 30 min) so the full round-robin + Day Report can complete. **In other channels** it stays 120s so Kelly doesn't hang indefinitely. On timeout it returns a no-op result and logs `[KELLY_STANDUP] handleMessage FAILED after ... ms`.

### Summary

| Layer | Issue | Fix |
|-------|--------|-----|
| Concurrency | All agents process → PGLite deadlock | Non-Kelly agents: patched handleMessage skips standup room messages |
| Core shouldRespond | GROUP + no mention → LLM eval → IGNORE | Kelly: inject isMention for standup channel messages |
| A2A classification | Empty sender name → treated as agent | Entity-ID check: not in agent set → human |
| Kickoff timing | Shared insights before callback → typing forever | Send short kickoff first, then build shared insights |
| LLM choice | REPLY instead of STANDUP_FACILITATE | Strong A2A prompt + STANDUP_FACILITATE-only instruction |

---

## A2A: Loop guard and context provider

Two pieces work together to control agent-to-agent chat:

1. **A2A_LOOP_GUARD** evaluator (`src/evaluators/a2aLoopGuard.evaluator.ts`) — Prevents infinite loops when agents reply to each other (e.g. in Discord). Runs only on messages from known agents/bots. Enforces: (a) **Reply-to-self (ping-pong):** do not respond to a reply to our own message; (b) **Max exchanges:** do not respond if we have already replied to this sender N times in the last `A2A_LOOKBACK_MESSAGES` messages.
2. **A2A_CONTEXT** provider (`src/providers/a2aContext.provider.ts`) — Injects context into the agent's state so the LLM knows: standup turn-taking (only respond when called), human priority (known humans get immediate response), exchange limits, and when to IGNORE (e.g. non-facilitator in standup when a human speaks). In standup channels only the **single responder** (e.g. Kelly) replies to human messages; others get "IGNORE".

| Env | Default | Description |
|-----|--------|--------------|
| `A2A_ENABLED` | `true` | Set to `"false"` to disable the loop guard. |
| `A2A_MAX_EXCHANGES` | `2` | Max replies to the same agent in recent history (non-standup). |
| `A2A_LOOKBACK_MESSAGES` | `10` | How many messages to look back when counting exchanges. |
| `A2A_STANDUP_MAX_EXCHANGES` | `1` | In standup channels, max exchanges (stricter cap). |
| `A2A_STANDUP_CHANNEL_NAMES` | `standup,daily-standup` | Comma-separated channel name substrings that identify standup rooms. |
| `A2A_STANDUP_SINGLE_RESPONDER` | `Kelly` | Only this agent responds to human messages in standup channels (or use `STANDUP_COORDINATOR_AGENT`). |
| `A2A_KNOWLEDGE_CHANNEL_NAMES` | `knowledge` | In these channels, A2A exchange limits are not applied; UPLOAD always allowed. |

---

## When to use plugin-inter-agent vs plugin-agent-orchestrator

- **plugin-inter-agent** (this plugin): **Multi-runtime** A2A — ask another **agent** by name (ASK_AGENT) and standups. Each agent has its own runtime; `elizaOS.getAgents()` / `handleMessage(agentId, msg)` route to the correct one. Use for "Kelly asks Vince" and autonomous standups with Day Report and Ralph loop.
- **plugin-agent-orchestrator**: Task lifecycle (CREATE_TASK, PAUSE, RESUME, CANCEL), **same-agent** subagent (new room, background run), session-based SEND_TO_SESSION, MessagingService. Orchestrator A2A is single-runtime and does **not** replace inter-agent for "Kelly asks Vince." Use orchestrator for "spawn a background task" or unified messaging APIs.

---

## Room ID and multi-agent communication (ElizaOS docs)

Per [ElizaOS Core — Multi-Agent Communication](https://docs.elizaos.ai/runtime/core#multi-agent-communication):

- **Same room ID and entityId:** For agents to interact in the same conversation, use the **same `roomId`** and **same `entityId`** (the user). We pass `message.roomId` and `message.entityId` when calling `elizaOS.handleMessage(targetAgentId, userMsg)`.
- **Async callbacks:** `handleMessage(agentId, message, { onResponse(content), onComplete })`. We settle when **onResponse** receives content with `.text` (or timeout), not on onComplete, so a late reply is still captured.
- **World ID:** A world is a container (e.g. Discord server) that contains rooms. We pass `worldId` when ensuring connections.

---

## In-process vs job API

When **`runtime.elizaOS`** is set (same-process agent registry), ASK_AGENT and standup use `elizaOS.handleMessage` in-process. When it is not set, or when in-process does not deliver a reply, the action falls back to **POST /api/messaging/jobs**. The plugin logs `[ONE_TEAM] elizaOS on runtime` at init. If `hasElizaOS` is false, only the job API is used. Job timeout is 90s; we poll up to 100s so slow replies can complete.

---

## Job API contract (when in-process is not available)

When the in-process path is not used, ASK_AGENT falls back to **POST /api/messaging/jobs**. For the job to complete, the server must ensure that when the target agent sends a reply, the send handler emits **`new_message`** with:

- **`channel_id`** = the job’s channel id (the room created for the job)
- **`author_id`** = the replying agent’s id

If the reply is emitted with a different channel, the job’s responseHandler will not see it and the job will time out. Implementations can use message metadata (e.g. `metadata.jobId`) to emit with the job’s `channelId` and the replying agent’s id.

---

## Troubleshooting (logs)

- **`[ASK_AGENT] onResponse called { hasText: false }` then `onComplete`**  
  The target agent ran but the content had no (or empty) `text`. Check for downstream errors (e.g. OpenAI 400, SQL) or a different content shape.

- **`OpenAI API error: 400` + `[PLUGIN:BOOTSTRAP:SERVICE:EMBEDDING] Failed to generate embedding`**  
  Embedding input rejected (empty, control chars, or token limit). Sanitize content or reduce length.

- **`MaxClientsInSessionMode: max clients reached`**  
  Postgres connection pool limit. Increase pool_size or use transaction/pooler mode.

- **Ralph loop not running**  
  Ensure `STANDUP_ENABLED=true` and the coordinator agent (e.g. Kelly) is the one that called `registerStandupTask`. Check that tasks with tag `queue` and `repeat` are being ticked by the Bootstrap TaskService. Verify `standup-deliverables/action-items.json` has pending items with `status: new` or `in_progress` and optional `priority` set.

---

## Plugin structure (for maintainers)

| Area | Location | Purpose |
|------|----------|---------|
| **Actions** | `src/actions/` | `askAgent.action.ts`, `dailyReport.action.ts`, `standupFacilitator.action.ts` |
| **Evaluators** | `src/evaluators/` | `a2aLoopGuard.evaluator.ts` |
| **Providers** | `src/providers/` | `a2aContext.provider.ts` (standup turn-taking, human priority, exchange limits) |
| **Standup core** | `src/standup/` | `standup.constants.ts`, `standupState.ts`, `standupOrchestrator.ts`, `standup.tasks.ts`, `standupScheduler.ts` |
| **Day Report** | `src/standup/` | `standupDayReport.ts`, `standup.parse.ts`, `dayReportPersistence.ts`, `standupReports.ts` |
| **Action items** | `src/standup/` | `actionItemTracker.ts`, `standupPlanner.ts`, `standupVerifier.ts`, `standupLearnings.ts`, `standup.build.ts` |
| **Data / validation** | `src/standup/` | `standupDataFetcher.ts`, `standupData.service.ts`, `crossAgentValidation.ts` |
