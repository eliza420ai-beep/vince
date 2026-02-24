# Agent Routing Matrix

Use this guide to route tasks between Opus and Codex in `.clawdbot`.

Core principle: assign by task shape, not model preference.

## Recommended Split

- `Codex` is the builder for implementation-heavy tasks.
- `Opus` is the architect and reviewer for ambiguity, risk, and quality gates.
- Default loop: Opus spec -> Codex implement -> Opus review.

## Task Routing Matrix

| Task Type | Primary | Secondary | Required Output | Merge Gate |
|---|---|---|---|---|
| Backend bugfix, data flow, API logic | Codex | Opus | PR + tests + risk note | Opus review + CI green |
| Multi-file refactor | Codex | Opus | PR with scoped commits | Opus architecture check |
| New feature (clear scope) | Codex | Opus | PR + acceptance proof | Opus spec compliance check |
| New feature (ambiguous) | Opus | Codex | spec + DoD before coding | no spawn before spec approval |
| Prompt/policy/agent behavior | Opus | Codex | policy diff + examples | Opus sign-off required |
| Security/privacy review | Opus | Codex | risk memo + fix list | Opus pass required |
| Performance optimization | Codex | Opus | before/after benchmark | Opus tradeoff validation |
| Incident hotfix | Codex | Opus | minimal patch + rollback | Opus postmortem in 24h |

## Spawn Rules

- One task = one worktree = one branch = one PR.
- If uncertainty is high, force an Opus spec pass first.
- Keep DoD explicit in every spawned prompt.
- Keep tasks small enough to merge same day where possible.
- If a task is rejected twice, restart from a rewritten spec.

## Standard Spawn Prompt

Copy this into `spawn-agent.sh` descriptions or prompt files.

```text
Goal:
<single measurable outcome>

Context:
- User impact:
- Constraints:
- Non-goals:

Acceptance Criteria:
1) ...
2) ...
3) ...

Tests Required:
- unit:
- integration:
- manual verification:

Definition of Done:
- type-check/lint/tests pass
- PR includes risk note + rollback plan
- screenshots if UI changed
- no secret leaks
- migration note for schema/API changes

Output Format:
- commit summary
- files changed
- test evidence
- known risks
```

## Review Checklist (Opus Pass)

- Is the implementation faithful to acceptance criteria?
- Are failure paths and edge cases covered by tests?
- Does the PR add avoidable complexity?
- Is there any behavior regression risk not called out?
- Is rollback clear and realistic?

## Weekly Tuning Loop

- Review misrouted tasks every week.
- Add one routing rule based on the top failure mode.
- Remove stale rules that no longer change outcomes.
- Favor reproducibility over individual model heroics.
