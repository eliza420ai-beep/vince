# Testing the Daily Standup

Ways to verify the revamped standup (domain-locked prompts, no parroting).

## 1. Unit tests (fast, no Discord/LLM)

Run the standup report and round-robin tests:

```bash
bun test src/plugins/plugin-inter-agent/src/standup/__tests__/standupReports.test.ts
bun test src/plugins/plugin-inter-agent/src/standup/__tests__/standup.tasks.test.ts
```

These cover:

- **extractAgentSection** — Each agent gets only its `## AgentName` block from shared insights; case-insensitive fallback; empty/missing section fallbacks.
- **buildStandupPrompt** — Naval gets full transcript + synthesis instructions; non-Naval get template + only their data section; role and "DO NOT" constraints included.
- **runStandupRoundRobin** — Order is STANDUP_REPORT_ORDER; sharedInsights is passed through.

No Discord or real LLM; validates prompt/section logic and wiring.

## 2. Discord (full E2E, real output)

1. Start the stack: `bun start` (or `bun run dev`).
2. In Discord **#daily-standup**, as a human, say: **"let's do a standup @Kelly"** or **"daily standup @KELLY"**.
3. Kelly runs STANDUP_FACILITATE: kickoff → round-robin (VINCE → Eliza → … → Clawterm → Naval) → Day Report.

**What to check:**

- Each agent’s reply stays in its lane (VINCE: market/paper bot; Eliza: knowledge gaps/essay; ECHO: CT sentiment; Oracle: Polymarket; Solus: strike/thesis; Otaku: wallet; Sentinel: git/ops; Clawterm: OpenClaw; Naval: 2–4 sentence conclusion).
- No copy-paste “Day Report” from every agent; no repeated BTC/F&amp;G/covered-call blocks in every message.
- Day Report appears once at the end; action items in `docs/standup/action-items.json` and optionally in Discord.

Requires Discord and all agents configured (Option C: one app per agent).

## 3. Scheduled standup (no Discord, same code path)

The same round-robin and prompts run on the **scheduled** standup task (no human in Discord).

1. Set env (optional): `STANDUP_AUTO_START=true`, `STANDUP_INTERVAL_MS=3600000` (or shorter for testing).
2. Run `bun start` and wait for the task to fire (see logs: `[Standup] 🎬 Starting scheduled standup`).
3. Check outputs:
   - `docs/standup/day-reports/YYYY-MM-DD-day-report.md`
   - `docs/standup/action-items.json`
   - `docs/standup/daily-insights/YYYY-MM-DD-shared-insights.md` (built before round-robin)

No Discord needed; good for CI or headless runs. Schedule is in `standup.tasks.ts` (e.g. 2×/day UTC).

## 4. One-off script (optional)

To test only the round-robin wiring with mock agents (no LLM calls):

- Create a script that imports `runStandupRoundRobin`, builds a mock `runtime` + `elizaOS` where each agent’s `useModel` returns a fixed string (e.g. `"VINCE report"`), passes a fixture `sharedInsights` string, and asserts `replies.length === 10` and reply order. Confirms shared insights are passed and round-robin completes; does not check LLM output quality.

## Summary

| Method            | Speed  | Needs Discord | Validates prompts/sections | Validates real LLM output |
| ----------------- | ------ | ------------- | -------------------------- | ------------------------- |
| Unit tests        | Fast   | No            | Yes                        | No                        |
| Discord manual    | Slow   | Yes           | Indirectly                 | Yes                       |
| Scheduled standup | Medium | No            | Indirectly                 | Yes (via Day Report file) |
| One-off script    | Fast   | No            | Wiring only                | No                        |

**Recommendation:** Run unit tests on every change; run a manual Discord standup (or scheduled) when you want to confirm real agent output stays in lane.
