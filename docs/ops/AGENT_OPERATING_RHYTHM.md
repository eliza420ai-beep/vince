# Agent Operating Rhythm

This is the execution cadence for running the Opus + Codex system with `.clawdbot`.

Goal: convert model spend into predictable shipping, clean PRs, and measurable business outcomes.

## Daily Rhythm

### 1) Morning Control Check (10-15 min)

- Review open tasks in `.clawdbot`.
- Check PR states (running, `pr_created`, `ready_for_review`, failed).
- Check standup artifacts:
  - `docs/standup/agent-suggestions.md`
  - `docs/standup/daily-insights/`
  - `docs/standup/day-reports/`
- Select 1-3 highest impact tasks for same-day merge.

### 2) Spec Gate (before spawn)

- If the ask is fuzzy, run Opus first for a clean spec.
- Confirm acceptance criteria, non-goals, and test requirements.
- Reject vague tasks before they consume tokens.

### 3) Spawn and Execute (core block)

- Spawn implementation tasks to Codex using one-task-per-branch.
- Keep tasks small; avoid mixed PR intent.
- Use redirects for course correction instead of restart.

### 4) Review Gate (before merge)

- Opus reviews Codex PRs for risk, regressions, and spec compliance.
- Require green CI and explicit rollback notes.
- Merge only when behavior and acceptance criteria are proven.

### 5) End-of-Day Debrief (10 min)

- Record what shipped and what blocked.
- Note misroutes and recurring failure patterns.
- Queue one routing or prompt improvement for tomorrow.

## Weekly Rhythm

### Monday (Planning and Route Cleanup)

- Review last week scorecard.
- Update `docs/ops/AGENT_ROUTING_MATRIX.md` for top misroutes.
- Set weekly targets (throughput, quality, cost per PR).

### Tuesday-Thursday (Execution)

- Run daily rhythm with strict same-day merge discipline.
- Prioritize tasks tied to revenue, retention, or core platform reliability.
- Keep PR queue small and moving.

### Friday (System Review, 30 min)

- Fill `docs/ops/WEEKLY_AGENT_SCORECARD.md`.
- Identify one bottleneck with highest business impact.
- Define one concrete systems fix for next week.
- Assign owner, deadline, and expected KPI effect.

## Role Split

- Opus: architecture, spec quality, risk review, policy and behavior checks.
- Codex: implementation, refactors, bug fixes, and test completion.
- Human operator: final prioritization, merge authority, and KPI ownership.

## Priority Ladder (When Backlog Is Full)

1. Production reliability and revenue-critical fixes
2. Customer-facing feature requests with immediate value
3. Tooling and workflow improvements that reduce cycle time
4. Nice-to-have experiments

## Merge Policy

- No green CI, no merge.
- No acceptance test evidence, no merge.
- No rollback path for risky change, no merge.
- No mixed-purpose PRs unless incident response requires it.

## Failure Handling

- If task is rejected twice: rewrite spec first, then respawn.
- If CI is flaky: isolate flake before continuing new feature work.
- If model output quality drops: shrink task scope and tighten DoD.
- If spend rises with flat output: audit misroutes and abandoned tasks.

## Monthly Reset

- Compare month-over-month:
  - human minutes per merged PR
  - first-pass CI success
  - review rejection rate
  - cost per merged PR
- Keep only the process rules that improved outcomes.
- Remove rituals that do not change shipping quality or speed.

## Quick Start Checklist

- [ ] Routing matrix reviewed this week
- [ ] Scorecard template ready for current week
- [ ] Active tasks scoped to one clear outcome each
- [ ] Review gate staffed (Opus pass before merge)
- [ ] One weekly system fix selected
