# OpenClaw Task Contract

Task briefs produced by Sentinel for AI coding agents (OpenClaw, Cursor, Claude Code). **All code changes must happen on a new branch with a PR; never push to main.**

## Where task briefs are written

- **Queue directory:** `docs/standup/openclaw-queue/` (or `{STANDUP_DELIVERABLES_DIR}/openclaw-queue/` when `STANDUP_DELIVERABLES_DIR` is set).
- **File pattern:** One JSON file per task, e.g. `YYYY-MM-DD-{id}-{slug}.json`, so agents can list by date and pick the next pending task.

## Schema version

**Version:** 1  
**TypeScript:** `src/plugins/plugin-sentinel/src/types/openclawTask.ts`

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique task id (e.g. openclaw-YYYYMMDD-XXXX) |
| `title` | string | Yes | Short title |
| `description` | string | Yes | What to do and why |
| `scope` | string | Yes | What's in scope / out of scope |
| `filesToChange` | string[] | No | Paths or globs to touch |
| `acceptanceCriteria` | string[] | Yes | Checklist for done |
| `expectedOutcome` | string | Yes | One sentence expected result |
| `source` | string | Yes | `sentinel_ship` \| `weekly` \| `prd` \| `suggest` |
| `prdPath` | string | No | Path to full PRD markdown if generated |
| `branchName` | string | Yes | Suggested branch (e.g. sentinel/YYYY-MM-DD-short-slug) |
| `createdAt` | string | Yes | ISO timestamp when created |
| `plugin` | string | No | Plugin or area (e.g. plugin-vince) |
| `priority` | string | No | P0 \| P1 \| P2 |
| `effort` | string | No | XS \| S \| M \| L \| XL |
| `consumedAt` | string | No | Set by consumer when picked up; ISO timestamp |
| `prUrl` | string | No | Set by consumer when PR is opened |

## Consumer contract

1. **Poll or watch** the queue directory for JSON files. Treat files without `consumedAt` as pending. After consuming, either set `consumedAt` in the file or move the file to a `consumed/` subdir.
2. **Create a new branch** from the default branch (e.g. `main`). Use `branchName` from the task when present.
3. **Apply changes** according to the task brief. Do not push to main.
4. **Open a PR** and optionally record `prUrl` in the task file or post back via your own mechanism.
5. **Never push to main.** All code changes only on a feature branch with a PR.

## Producers

- **SENTINEL_SHIP:** When `SENTINEL_SHIP_WRITE_OPENCLAW_TASK=true`, writes the "Top pick" as one task brief JSON per run.
- **Sentinel weekly task:** When `SENTINEL_WEEKLY_WRITE_OPENCLAW_TASK=true`, writes the #1 suggestion as one task brief JSON per run.

## Related

- PRDs for Cursor: `docs/standup/prds/` (or STANDUP_DELIVERABLES_DIR)
- [CONTRIBUTING.md](../../CONTRIBUTING.md) §7 — Sentinel to OpenClaw
- [docs/SENTINEL.md](../SENTINEL.md) — Sentinel agent brief
