# plugin-inter-agent

**TL;DR** — This plugin turns your multi-agent stack into **one team**: any agent can ask any other by name (ASK_AGENT), and a **Kelly-led standup** runs a real round-robin (VINCE → Eliza → ECHO → … → Clawterm), synthesizes a **Day Report** (TL;DR, essential question, signals, action table), and feeds a **Ralph loop** that executes action items one-by-one with verify-and-learn.

**1+1=3 in practice:** Standup isn't just eight agents talking — it's **structured signal extraction** (each report ends with a parseable JSON block so cross-agent validation uses real numbers, not regex), **prediction tracking** (Solus's calls are saved to `predictions.json`, validated at expiry against live price, and accuracy is fed back into the next kickoff and Day Report), **dynamic ECHO** (X search adapts to what VINCE found — e.g. "SOL funding flipped" → ECHO searches SOL sentiment), **per-agent insight caps** (VINCE gets 1200 chars, Oracle 800, so data-rich reports aren't truncated mid-table), **Eliza as delta reporter** (yesterday's Day Report vs today's shared insights so the room sees what changed and whether yesterday's call is tracking), and a **feedback loop** (prediction scoreboard in the kickoff, "adjust your confidence" in Solus's template, and "historical accuracy: X%" in the Day Report prompt). That's how the team gets smarter than the sum of parts — and how you *prove* it (accuracy >55% with real calibration).

Why it's reliable: **single-responder** in standup (only Kelly answers the human → no PGLite deadlock); **round-robin passthrough** so coordinator messages reach each agent; **entity-ID human detection** when Discord omits names; **kickoff-first** so the channel isn't stuck on "typing"; **shared daily insights** before the meeting; **A2A loop guard** so agents don't ping-pong forever. One human says "let's do a new standup kelly" and the whole team reports, gets a report, and gets a backlog that actually runs.

---

Multi-agent coordination for VINCE: agents ask other agents and report back (ASK_AGENT), and Kelly-coordinated standups produce an actionable Day Report with a prioritized action-item backlog processed by the Ralph loop (execute → verify → learn).

## What this plugin provides

- **ASK_AGENT** — Ask another agent (Vince, Kelly, Solus, Sentinel, Eliza, Otaku, Clawterm, etc.) a question and relay the answer. In-process via `runtime.elizaOS.handleMessage` or fallback to POST `/api/messaging/jobs`.
- **STANDUP_FACILITATE** — Kelly kicks off the standup, runs round-robin (each agent reports), then wraps up with a Day Report. Day Report includes TL;DR, essential question, signals, and a WHAT/HOW/WHY/OWNER action table.
- **DAILY_REPORT** — On-demand daily report (standup-style synthesis).
- **Action item backlog** — Items from the Day Report table are stored in `docs/standup/action-items.json`, prioritized by a planner, and processed one-at-a-time by the **Ralph loop** (execute → verify → update status → append to learnings log).
- **A2A Loop Guard + A2A Context** — Evaluator prevents infinite ping-pong (max exchanges, reply-to-self). **A2A_CONTEXT** provider injects standup turn-taking, human-priority response, and single-responder rules. Set `shouldIgnoreBotMessages: false` on agents that should respond to other bots.

**Recent progress (1+1=3 upgrade + manual standup):** **Structured signals** — VINCE, ECHO, Oracle, and Solus output fenced JSON (signals array / Solus call); round-robin stores `structuredSignals` per reply; cross-agent validation uses parsed confidence and direction. **Prediction tracker** — Solus’s call is extracted and saved to `docs/standup/predictions.json`; a daily `STANDUP_VALIDATE_PREDICTIONS` task checks expired predictions against CoinGecko price and marks correct/incorrect; accuracy stats are injected into the kickoff scoreboard and Day Report prompt. **Dynamic ECHO** — Key events from VINCE (e.g. “SOL funding negative”, “BTC +5% 24h”) are extracted and passed as context hints so ECHO and Clawterm run targeted X queries instead of a single hardcoded search. **Per-agent caps** — VINCE 1200, Oracle 800, others 400–600 chars (env-overridable) so data-heavy reports aren’t cut mid-table. **Eliza as delta reporter** — Fetches yesterday’s Day Report and today’s shared insights and reports what changed and whether yesterday’s call is tracking. **Feedback loop** — Kickoff includes a prediction scoreboard; Solus’s template tells it to calibrate using the scoreboard; Day Report prompt includes “Historical accuracy: X%. If below 50%, note more conservative confidence.” Manual trigger in `#daily-standup` remains reliable (single-responder, round-robin passthrough, entity-ID human detection, kickoff-first, 30 min session). See **Manual standup trigger: implementation notes** below.

---

## Plugin logic in depth

How the plugin fits together from bootstrap to Day Report and Ralph loop.

### 1. Init (plugin bootstrap)

On load, the plugin registers **actions** (ASK_AGENT, DAILY_REPORT, STANDUP_FACILITATE), **evaluators** (A2A_LOOP_GUARD), and **providers** (A2A_CONTEXT). Then `init` runs once per agent runtime:

- **Coordinator (Kelly):** After other plugins are up, `registerStandupTask(runtime)` runs. It creates the standup **world** and **room**, ensures all in-process agents are participants, registers the **scheduled standup task** (runs on `STANDUP_INTERVAL_MS`; when `STANDUP_AUTO_START` is true and cron matches, it triggers a kickoff with a short message), the **Ralph loop** task (`STANDUP_RALPH_LOOP`, one pending action item per run), and the legacy **action-item worker** (used only when `STANDUP_USE_RALPH_LOOP=false`).

- **Non-coordinator agents:** After a short delay (5s / 15s so `messageService` exists), `patchMessageServiceForStandupSkip(runtime)` runs. The runtime’s `messageService.handleMessage` is replaced with a wrapper that: (1) checks if the message’s room is a standup channel (by name); (2) if yes and `message.content.source !== "standup"`, returns a no-op (no DB, no processing) to avoid PGLite deadlock; (3) if `source === "standup"`, calls the original `handleMessage` so the agent can process the coordinator’s round-robin message and reply.

- **Coordinator (Kelly) only:** A second wrapper is applied to `handleMessage`: for messages in a standup channel it sets `message.content.mentionContext.isMention = true` (so the core’s `shouldRespond` doesn’t send the message to LLM evaluation and return IGNORE), and if the message text matches a kickoff phrase it overwrites `message.content.text` with a short imperative so the LLM outputs STANDUP_FACILITATE. A timeout is applied: in standup channels the timeout is `STANDUP_SESSION_TIMEOUT_MS` (e.g. 30 min); in other channels 120s.

So: only Kelly processes **external** messages in standup rooms; **round-robin** messages (source `"standup"`) are processed by every agent. Kelly is forced to “respond” and to choose STANDUP_FACILITATE on kickoff.

### 2. Message flow when a human speaks in #daily-standup

1. Discord (or another platform) delivers the message to every connected agent.
2. **Non-Kelly:** The patched `handleMessage` sees standup room + no `source: "standup"` → returns immediately (no DB write, no reply).
3. **Kelly:** The Kelly wrapper sets `isMention` and possibly overrides the message text, then calls the real `handleMessage`. The core skips “should I respond?” LLM evaluation because `isMention` is true. It composes state (including **A2A_CONTEXT**) and runs the action phase.
4. **A2A_CONTEXT** (during `composeState`): The provider sees a standup channel and a **human** sender (entityId not in the set of agent IDs, or name in known-humans). It injects: “Only the single responder (Kelly) should reply; use STANDUP_FACILITATE and no other action.” So the LLM gets a strong instruction to output STANDUP_FACILITATE.
5. Kelly’s handler runs **STANDUP_FACILITATE**: kickoff branch → `handleKickoff` → `handleRoundRobin` (see below).

### 3. ASK_AGENT flow

When a user says “ask Vince what he thinks about SOL” (or similar), the agent validates and runs ASK_AGENT:

1. **Resolve target:** The action parses the intended agent name from the message and resolves it via `runtime.elizaOS.getAgentByName` or `getAgents()`.
2. **In-process call:** If `runtime.elizaOS` exists and has `handleMessage`, it builds a “user” message (same roomId/entityId so context is shared) and calls `eliza.handleMessage(agentId, userMsg, { onResponse, onError })`. It waits for `onResponse` with non-empty text (extracted from `content.text` or `content.thought`), or a timeout (e.g. 90s). The first “real” reply is taken; late callbacks can be accumulated depending on implementation.
3. **Fallback:** If in-process isn’t available or doesn’t return in time, the action can POST to `/api/messaging/jobs` and poll until the job completes; the server must deliver the reply into the job’s channel so the client sees it.

The answering agent (e.g. VINCE) runs its normal pipeline (composeState, actions, evaluators). **A2A_LOOP_GUARD** counts exchanges so the conversation doesn’t spiral into endless back-and-forth.

### 4. STANDUP_FACILITATE: kickoff → round-robin → Day Report

**Validation:** Only the coordinator (Kelly) can run this action; the message must match a kickoff phrase (e.g. “let’s do a new standup kelly”) or a wrap-up phrase (“wrap up”, “day report”).

**Wrap-up path** (user said “wrap up” in an existing thread): Uses recent messages from state as the transcript, calls `generateAndSaveDayReport`, persists lessons and disagreements, runs the planner on today’s action items, optionally creates per-item tasks if not using Ralph, then `endStandupSession`.

**Kickoff path** (user said “let’s do a new standup”):

1. **handleKickoff**
   - If a session is already active, end it.
   - `startStandupSession(roomId)` — in-memory state + persist to `standup-session.json`.
   - Send a **short** kickoff string to the channel immediately via `callback` (e.g. “## Standup 2026-02-14 … @VINCE, market data — go.”) so the user sees the standup start.
   - Optionally call `buildAndSaveSharedDailyInsights(runtime, eliza)` (guarded: only if `eliza.runtimes` exists and `getAgents` works). That fetches a snippet of each agent’s data (e.g. market, Polymarket) and writes `docs/standup/daily-insights/YYYY-MM-DD-shared-insights.md`. The **kickoff text** used for the round-robin context is either this enriched content or the short kickoff.

2. **handleRoundRobin**
   - `ensureStandupWorldAndRoom(runtime)` — creates/gets world and room, ensures all agents and the facilitator are participants.
   - `runStandupRoundRobin(runtime, roomId, facilitatorEntityId, kickoffText)`:
     - Gets ordered list of agents from `STANDUP_REPORT_ORDER` (VINCE, Eliza, ECHO, …).
     - Initial transcript = kickoff text.
     - For **each** agent in order:
       - Build a “user” message: `{ entityId: facilitatorEntityId, roomId, content: { text: transcript, source: "standup" } }`.
       - Call `eliza.handleMessage(agentId, userMsg, { onResponse })`. The target agent receives a message with `source: "standup"`, so non-Kelly agents **do not** skip it (passthrough).
       - The target runs its normal reply flow; the coordinator waits for reply text (from `onResponse`, with extraction from nested content / thought and accumulation so the final REPLY callback isn’t lost). Timeout per turn (e.g. 90s); on timeout, use last extracted text if any.
       - Append “AgentName: &lt;reply&gt;” to the transcript; optionally push a one-line summary to standup channels.
   - With the full transcript, call `generateAndSaveDayReport(runtime, transcript)` → LLM synthesizes TL;DR, essential question, signals, action table; save to `docs/standup/day-reports/YYYY-MM-DD-day-report.md` and parse action items into the backlog.
   - Run the **planner** on today’s items (urgency order), update priorities in the file store.
   - `parseStandupTranscript` for lessons, disagreements, and action items; persist lessons to each agent’s facts, update relationship metadata for disagreements; if not using Ralph, create one queue task per action item.
   - `endStandupSession()`; clear in-memory state and optionally the session file.

So in one STANDUP_FACILITATE run: the human sees the short kickoff right away; the round-robin runs in process with each agent getting the growing transcript and replying once; then the Day Report is generated and the backlog is updated and (if Ralph is used) consumed by the Ralph loop.

### 5. A2A_CONTEXT provider (what the LLM sees)

The provider runs during `composeState` and injects text and values that tell the LLM:

- **Who sent the message:** If `message.entityId` is not in the set of agent IDs, the sender is treated as **human** (so “who is speaking” doesn’t depend on Discord always sending names).
- **Standup channel + human:** “Only the single responder (Kelly) should reply. Use STANDUP_FACILITATE; do not use REPLY or other actions.”
- **Standup channel + message from coordinator (source standup):** “You are in standup turn-taking. Only respond if you are directly called (e.g. @VINCE, go.). Otherwise output IGNORE.”
- **Exchange limits:** How many times we’ve already replied to this sender in the last N messages; reply-to-self (ping-pong) detection.
- **Knowledge channels:** In channels matching `A2A_KNOWLEDGE_CHANNEL_NAMES`, exchange limits may not apply (e.g. UPLOAD always allowed).

So the model gets explicit rules: one responder to humans in standup, and only the called agent replying to round-robin messages.

### 6. A2A_LOOP_GUARD evaluator (after the reply)

Runs after the agent has already generated a response. For messages from **bots/agents** (identified by room and sender):

- **Reply-to-self:** If the message is a reply to our own message, mark or record so we don’t respond again to that chain.
- **Max exchanges:** Count how many times we’ve replied to this sender in the last `A2A_LOOKBACK_MESSAGES`; if ≥ `A2A_MAX_EXCHANGES` (or in standup, `A2A_STANDUP_MAX_EXCHANGES`), the next time we consider responding we can block or limit.

So the guard doesn’t stop the current reply; it influences future turns and works with A2A_CONTEXT to cap back-and-forth.

### 7. Standup state and session file

**standupState** keeps: `startedAt`, `roomId`, `reportedAgents`, `currentAgent`, `lastActivityAt`, `isWrappingUp`. It’s in memory and persisted to `docs/standup/standup-session.json` so a restart during a standup can (if within session timeout) recover. `startStandupSession`, `markAgentReported`, `haveAllAgentsReported`, `endStandupSession` drive the lifecycle. The **hybrid** flow (handleRoundRobin) doesn’t rely on per-message progression; it runs the full round-robin in one STANDUP_FACILITATE handler call, so the orchestrator’s “next agent” logic is used more in the scheduled/legacy path or for health checks.

### 8. Action items and Ralph loop

- **Backlog:** After each Day Report, parsed rows (WHAT/HOW/WHY/OWNER) are appended to `docs/standup/action-items.json` with status `new` and optional urgency.
- **Planner:** Sorts by urgency (`now` &lt; `today` &lt; `this_week` &lt; `backlog`) and `createdAt`, assigns `priority`, writes back to the file.
- **Ralph loop** (when `STANDUP_USE_RALPH_LOOP=true`): A recurring task runs every `STANDUP_RALPH_INTERVAL_MS`. Each run: take pending items (status `new` or `in_progress`), sort by priority and date, pick the first; set `in_progress`; **execute** — if “remind”-like, `handleMessage` to the assignee agent; if “build”/north-star, call `executeBuildActionItem` (Milaidy or in-VINCE); **verify** (file exists or message sent); update item to `done` or `failed` with outcome; append to `standup-learnings.md`; optionally push a one-liner to standup channels.

So the plugin turns the Day Report’s action table into a single file backlog and a single loop that executes, verifies, and learns—one item per run.

### 9. Scheduled standup (cron-style)

When `STANDUP_AUTO_START=true`, the coordinator’s registered task runs on an interval. If the current time matches the cron (e.g. `STANDUP_SCHEDULE="0 8 * * *"` with a ±1 minute window), the task triggers the same kickoff → round-robin → Day Report flow with a **short** kickoff message (no human in the channel). Shared daily insights can still be built and used as context for the round-robin if the registry is available.

---

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

The **Day Report** includes: **Essential question**, **Solus's call** (Above/Below/Uncertain + one sentence), TL;DR, signals table, and an action plan table (WHAT / HOW / WHY / OWNER). Full behavior and quality bar are in `docs/standup/prds/` (e.g. 2026-02-12-prd-v2-1-0-release-notes-sentinel-eliza-upgrades.md).

**Shared daily insights:** For the **scheduled** standup, a shared daily insights file is written **before** the meeting to `docs/standup/daily-insights/YYYY-MM-DD-shared-insights.md`. The kickoff includes this so the conversation is synthesis-first. North star = shared knowledge > sum of individual silos. See [docs/MULTI_AGENT.md](../../../docs/MULTI_AGENT.md) § Standup: shared daily insights.

**Essential question** is configurable via `ESSENTIAL_STANDUP_BTC_LEVEL` (e.g. `70000`); default: "Based on current market sentiment, do you think BTC will be above $70K by next Friday?"

**Cross-agent validation:** Signals (bullish/bearish) are extracted from each agent's report and validated across assets (BTC, SOL, HYPE). Divergence (e.g. one agent bullish, another bearish) is flagged and confidence adjusted; aligned signals get higher confidence. This context is included in the Day Report synthesis.

---

## Why this standup can produce valuable insights (1+1=3)

Core idea: each agent has certain skills; by making them collaborate in a structured standup, we aim to prove **1+1=3** — the team’s output is worth more than the sum of individual reports. Short answer: **yes, it can produce genuinely valuable insights, but only when the data pipes are real and diverse.** The architecture is right; the value depends on execution.

### Where 1+1 actually equals 3

The strongest case is **cross-domain signal convergence and divergence**. Each agent taps a different data source that a single agent can’t hold in context at once:

| Agent | Data source | What it uniquely contributes |
|-------|-------------|------------------------------|
| **VINCE** | Hyperliquid API | Funding rates, open interest, liquidation data — hard numbers, not vibes |
| **ECHO** | X/Twitter (plugin-x-research) | Narrative shifts, key-voice sentiment, CT mood |
| **Oracle** | Polymarket API | Prediction market odds — the market’s probabilistic view |
| **Solus** | All of the above + prior reports | Synthesis into a binary call with confidence |
| **Sentinel** | Git repo / code | What’s actually shipping (execution reality check) |

The multiplication happens when **synthesis crosses domains that don’t normally talk**. Example: VINCE reports “SOL funding just flipped negative”; ECHO reports “CT sentiment shifted from bullish to uncertain”; Oracle reports “SOL above $150 dropped from 65% to 42%.” No single agent sees all three. Solus can say: “Three independent signals align bearish short-term. Below, 70% confidence.” That’s a concrete, actionable insight no single agent could produce. When signals **diverge** (e.g. VINCE bullish on funding but ECHO says CT is souring), that tension is the most valuable output — the “something doesn’t add up” signal. The **cross-agent validation** (already in the plugin) is where that edge lives: it extracts bullish/bearish per asset, flags divergence, and adjusts confidence.

The **essential question** (“BTC above $70K by Friday?”) forces a **binary decision** from multi-source data instead of open-ended “let’s discuss the market,” which is a better framework for action. The **action table → Ralph loop** means the standup doesn’t end with “we should look into that” — it ends with a backlog item that gets executed, verified, and logged.

### Where 1+1 can fall short

- **LLM-on-LLM amplification:** Each agent is an LLM; Solus synthesizes other agents’ text. If a data provider is stale or broken, Solus will confidently synthesize noise. The chain is only as strong as the weakest data pipe.
- **Redundancy when sources overlap:** When agents don’t have fresh, unique data, you get the same macro narrative rephrased 8 times. “BTC is consolidating” from 8 angles isn’t 3× more useful. The thesis holds when each agent brings a **genuinely different signal**.
- **Cost per insight:** Full round-robin costs tokens. If most standups produce “nothing changed, keep positions,” that’s an expensive “hold.” Track insight density (e.g. via `standup-metrics.jsonl`).
- **False confidence from alignment:** When all agents agree, it can mean “we all read the same training data” rather than “independent sources confirm.” Real edge comes from **orthogonal data** (on-chain + social + prediction markets is a strong combo).

### What makes it work vs what breaks it

**Makes it work:** Each agent has a **live data provider** (Hyperliquid, X search, Polymarket, git); **cross-agent validation** on **structured signals** (parsed JSON, not regex); **essential question** forces a position; **Ralph loop** turns talk into action; **shared daily insights** pre-meeting; **prediction tracker** (save Solus call → validate at expiry → scoreboard + accuracy in Day Report); **dynamic ECHO** so X search targets what VINCE flagged; **Eliza as delta reporter** (yesterday vs today); **per-agent insight caps** so data-heavy reports aren't truncated.

**Breaks it:** Stale or broken data providers (chain becomes LLM paraphrasing LLM); all agents defaulting to the same “safe” take; skipping divergence checks; not running prediction validation so the scoreboard stays empty.

**Bottom line:** The 1+1=3 thesis holds when (a) agents have genuinely different live data sources, (b) synthesis is forced to take a position, and (c) divergence is flagged and **outcomes are tracked**. The plugin does all three: structured signals, cross-agent validation, and **prediction tracking with accuracy feedback**. The risk is data pipes going stale and the standup becoming 8 LLMs agreeing from the same training data. Keep data fresh, keep the essential question sharp, and use the prediction scoreboard — that's the proof that the team is smarter than the sum.

---

## Action items and Ralph loop

Action items from the Day Report (WHAT/HOW/WHY/OWNER table) are the single backlog. They are stored in a file, prioritized by a planner, and processed one-at-a-time by a recurring **Ralph loop** task: pick next → execute → verify → update status → log learnings.

### Backlog (file store)

- **Path:** `docs/standup/action-items.json` (or `STANDUP_DELIVERABLES_DIR/action-items.json`).
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
  7. **Learnings:** Append one entry to `docs/standup/standup-learnings.md` (date, status, owner, what, outcome, optional learning sentence).  
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
| `STANDUP_DELIVERABLES_DIR` | `docs/standup` | Root dir for day reports, action-items.json, standup-learnings.md, north-star deliverables (prds/, essays/, etc.). |
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

**Deliverables layout:** Under `STANDUP_DELIVERABLES_DIR`: `day-reports/`, `action-items.json`, `predictions.json` (Solus calls + outcomes for scoreboard and accuracy), `standup-learnings.md`, `daily-insights/` (shared pre-standup), `prds/` (PRDs from Sentinel), `essays/`, `integration-instructions/` (Milaidy/OpenClaw etc.). North-star build outputs go under this tree.

**Optional schedule (cron-style):** Besides `STANDUP_UTC_HOURS` + `STANDUP_INTERVAL_MS`, you can use **STANDUP_SCHEDULE** (cron, e.g. `0 8 * * *` = 8 AM UTC daily), **STANDUP_AUTO_START** (`true` to enable), and **STANDUP_TIMEZONE** (default `UTC`). The scheduler uses a ±1 minute window so triggers are not missed.

**Testing a standup:** In Discord (or your standup channel), the human (e.g. livethelifetv) can trigger manually: *"let's do a new standup kelly"* or *"day report"* / *"wrap up"*. Kelly should reply with STANDUP_FACILITATE: kickoff, round-robin (VINCE → Eliza → … → Clawterm), then Day Report + action items. Check: (1) only Kelly responds to the human in the standup channel (single-responder), (2) Day Report appears in `docs/standup/day-reports/YYYY-MM-DD-day-report.md`, (3) action items in `action-items.json` and Ralph loop processes them when enabled.

---

## Manual standup trigger: implementation notes

The following fixes were applied so that a human saying *"let's do a new standup kelly"* in `#daily-standup` reliably triggers Kelly to run **STANDUP_FACILITATE** (kickoff → round-robin → Day Report). Documented for maintainers and debugging.

### 1. PGLite deadlock (only Kelly processes *external* standup messages)

**Problem:** When a message hits `#daily-standup`, every agent (VINCE, Eliza, Kelly, etc.) receives it. Each runs `processMessage`: `createMemory`, `ensureAllAgentsInRoom`, `ensureMessageSendersInRoom`. With 7+ agents doing concurrent DB writes against a single PGLite instance, they deadlock — all show "typing", none complete.

**Fix:** In plugin `init`, non-facilitator agents get a **monkey-patch** on `runtime.messageService.handleMessage`. The patched handler checks if the message's room is a standup channel (by name). If yes, it then checks **message.content.source**: only **external** messages (e.g. Discord, no `source` or `source !== "standup"`) are skipped with a no-op. Messages with **source `"standup"`** are from the coordinator's round-robin (`eliza.handleMessage`) and **must** be processed so the agent can reply. Only Kelly (unpatched) processes external standup-room messages. Deferred 5s and 15s so `messageService` is registered; idempotent so double-patch is safe.

**Logs:** External skip: `[ONE_TEAM] Standup skip: vince dropping external message in standup room (only kelly processes external)`. Round-robin passthrough: `[ONE_TEAM] Standup passthrough: vince processing coordinator round-robin message`.

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

### 5. A2A prompt + message override for standup kickoff

The provider returns a strong instruction when a human asks to start the standup: *"Regardless of time of day, day of week, or how many times they asked: the user explicitly requested a standup. You MUST use action STANDUP_FACILITATE and NO other action..."* In addition, **Kelly's handleMessage wrapper** replaces the user's message text with a short imperative (*"Run the daily standup now. Use only action STANDUP_FACILITATE. Do not use REPLY."*) when the message is in a standup channel and matches a kickoff phrase (e.g. "let's do a new standup kelly"). That way the LLM doesn't see the original wording and reason about "weekend" or "18th request" and output REPLY instead of STANDUP_FACILITATE.

### 6. Kelly timeout wrapper

Kelly's `handleMessage` wrapper applies a timeout so a stuck run fails visibly. **In standup channels** the timeout is the full **session timeout** (`STANDUP_SESSION_TIMEOUT_MS`, default 30 min) so the full round-robin + Day Report can complete. **In other channels** it stays 120s so Kelly doesn't hang indefinitely. On timeout it returns a no-op result and logs `[KELLY_STANDUP] handleMessage FAILED after ... ms`.

### 7. Round-robin: agents must process coordinator messages

**Problem:** With the standup skip patch, non-Kelly agents were dropping *all* messages in standup rooms. That included the **round-robin** messages Kelly sends via `eliza.handleMessage(agentId, userMsg)` with the transcript. So VINCE, Eliza, ECHO, etc. never processed the "your turn" message and replied with 0 chars.

**Fix:** The skip patch only skips when the message is **not** from the coordinator. Round-robin messages use `content.source = "standup"`. If `message.content.source === "standup"`, the patch allows the message through so the agent runs its REPLY and the standup gets real report text.

### 8. Reply extraction (round-robin)

**Problem:** The framework can call `onResponse` more than once (e.g. action-choice pass then REPLY action). We were resolving on the first callback, which often had no `text`. We also only used `thought` when `actions` included `"REPLY"`, and didn't handle nested `content`.

**Fix:** In `standup.tasks.ts`: **Accumulate** the latest extracted string from each `onResponse`; resolve immediately when we get non-empty text, and **on timeout** resolve with the last accumulated value so we don't lose a late reply. **extractReplyFromResponse** now: accepts nested `resp.content`; uses `thought` as fallback whenever `text` is empty (not only when actions include REPLY); logs at debug when we get a response but extract nothing (for debugging).

### 9. Shared daily insights and registry

**Problem:** `buildAndSaveSharedDailyInsights` calls `eliza.getAgents()`; in core, that does `Array.from(this.runtimes.values())`. If the object attached to `runtime.elizaOS` doesn't have `runtimes` (stub or wrong binding), it throws "Cannot read properties of undefined (reading 'runtimes')".

**Fix:** Before calling `getAgents()`, we check that `eliza.runtimes` exists and has a `.values` function; if not, we skip shared insights with a debug log. We call `eliza.getAgents.call(eliza)` for correct `this`. **.env:** Each agent must have its **own** Discord app (e.g. `CLAWTERM_DISCORD_APPLICATION_ID` / `CLAWTERM_DISCORD_API_TOKEN` for Clawterm). Reusing another agent's vars (e.g. SENTINEL_* for Clawterm) can leave the in-process registry in a bad state. Standup continues with the short kickoff when shared insights are skipped.

### Summary

| Layer | Issue | Fix |
|-------|--------|-----|
| Concurrency | All agents process external msg → PGLite deadlock | Non-Kelly: skip only *external* standup-room messages; allow `source: "standup"` (round-robin) |
| Core shouldRespond | GROUP + no mention → LLM eval → IGNORE | Kelly: inject isMention for standup channel messages |
| A2A classification | Empty sender name → treated as agent | Entity-ID check: not in agent set → human |
| Kickoff timing | Shared insights before callback → typing forever | Send short kickoff first, then build shared insights |
| LLM choice | REPLY instead of STANDUP_FACILITATE | Strong A2A prompt + kickoff message text override (imperative) |
| Kelly timeout | 120s killed full standup | Standup channel: use STANDUP_SESSION_TIMEOUT_MS (30 min); else 120s |
| Round-robin 0 chars | Skip patch blocked coordinator messages | Passthrough when `message.content.source === "standup"` |
| Reply extraction | First callback had no text; missed REPLY callback | Accumulate last extracted; thought fallback; nested content; resolve on timeout with last |
| Shared insights | getAgents() → runtimes undefined | Guard on eliza.runtimes; skip cleanly; per-agent Discord in .env |

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
  Ensure `STANDUP_ENABLED=true` and the coordinator agent (e.g. Kelly) is the one that called `registerStandupTask`. Check that tasks with tag `queue` and `repeat` are being ticked by the Bootstrap TaskService. Verify `docs/standup/action-items.json` has pending items with `status: new` or `in_progress` and optional `priority` set.

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
| **Predictions** | `src/standup/` | `predictionTracker.ts` (save/validate Solus calls, scoreboard, accuracy) |
