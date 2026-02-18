# Trading Runtime Contract

Purpose: canonical runtime contract for the VINCE paper-trading and execution flow. Scheduled tasks (cron, standups) and manual/user-triggered behavior are separated so agents and operators know what is allowed when.

**Audience:** AI agents (e.g. OpenClaw, Milaidy), operators, and developers. For agent briefs and PRD focus, see [docs/AGENTS_INDEX.md](AGENTS_INDEX.md).

---

## Flow contract: producer vs executor

**Rule:** Signal and candidate **producers** never send orders. Only the **executor** path places or closes trades.

- **Producers:** `VinceSignalAggregatorService`, scheduled tasks (e.g. `evaluateAndTrade` cycle), grokExpert, daily report. They build signals, candidates, and context. They do **not** call exchange or place orders.
- **Paper executor:** `VincePaperTradingService.openTrade()` and close paths. All paper execution goes through this service.
- **Live executor:** Otaku (only agent with funded wallet). Live execution goes through Otaku actions; paper never touches real funds.

**Single executor path:** For paper, every trade open flows through `VincePaperTradingService.openTrade()`. Callers are (1) `evaluateAndTrade()` (scheduled/cycle) and (2) `VINCE_BOT_TRADE` action (user-triggered). Both use the same validation and logging inside `openTrade()`.

**Optional LLM entry gate:** When `VINCE_ENTRY_GATE_ENABLED=true`, a single-candidate LLM step can approve or veto before `openTrade()`. On timeout or error the flow falls back to the deterministic path (proceed). Decision ownership: entry gate owns approve/veto; executor owns placement only.

---

## CRON_CONTEXT_START

**Role:** Scheduled jobs (cron, standup-triggered tasks, hourly/daily report tasks) must use **only** this section as policy. Do not use MANUAL_COMMANDS for scheduled behavior.

**Allowed (scheduled):**

- Refresh signals and market context (e.g. signal aggregator, market data).
- Run deterministic health/reconcile (e.g. portfolio vs positions consistency, ops summary).
- Post reports (e.g. daily report, ops summary to a channel).
- **Do not place trades** unless a dedicated “scheduled execution” path exists that still goes through the single executor (`openTrade`) and all risk checks. Currently, scheduled execution is done via `evaluateAndTrade()` which calls `openTrade()` internally after validation.

**Flow contract (must preserve):**

- Entry: signals → aggregation → risk validation → **executor** (`openTrade` for paper).
- Producers never place orders; only the paper-trading service (paper) or Otaku (live) executes.

**Failure handling:**

- If health/reconcile detects inconsistency: log and optionally write to ops summary; do not infer trade state without file/API proof.
- Scheduled prompts should reference this block only; do not duplicate policy from MANUAL_COMMANDS.

## CRON_CONTEXT_END

---

## MANUAL_COMMANDS_START

**Role:** User-triggered or interactive commands. Not for scheduled cron turns.

| Intent            | Trigger examples                    | Action / path                          |
|-------------------|-------------------------------------|----------------------------------------|
| Execute trade     | "trade", "go long", "go short"      | `VINCE_BOT_TRADE` → `openTrade()`      |
| Check status      | "bot status", "portfolio"           | `VINCE_BOT_STATUS`                     |
| Pause / resume    | "pause bot", "resume bot"           | `VINCE_BOT_PAUSE`                      |
| Explain decision  | "why", "explain"                    | `VINCE_WHY_TRADE`                      |

If a user asks to execute and no plan/signal exists, generate or refresh context first (e.g. “trade” can trigger evaluation then execution).

## MANUAL_COMMANDS_END

---

## References

- Paper bot flow: [src/plugins/plugin-vince/HOW.md](../src/plugins/plugin-vince/HOW.md) (Signal flow, openTrade).
- Protection layers: [src/plugins/plugin-vince/PROTECTION_LAYERS.md](../src/plugins/plugin-vince/PROTECTION_LAYERS.md).
- Agent briefs: [docs/AGENTS_INDEX.md](AGENTS_INDEX.md).
- OpenClaw / Milaidy: [knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md](../knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md).
