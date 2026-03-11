# VINCE v2.8.0

> **Release date:** 2026-02-16

OpenClaw workspace orientation, standup reorg, env and docs cleanup. Sentinel can now guide OpenClaw (and humans) to the right directories.

---

## OpenClaw at home

- **OPENCLAW.md** — Root orientation: `openclaw-agents/`, `vault/`, `skills/`, `tasks/`. Where OpenClaw works and where deliverables live.
- **openclaw-agents/README.md** — Workspace context (sibling dirs, link to OPENCLAW.md).
- **vault/README.md** — Notes that OpenClaw and Cursor use the core dirs; link to OPENCLAW.md.
- **skills/x-research/README.md** — OpenClaw-friendly; links to OPENCLAW.md.
- **tasks/README.md** — Purpose of tasks/ and its role in the OpenClaw ecosystem.
- **Sentinel** — New knowledge block and message example so Sentinel can answer “where does OpenClaw work?” and point to the right folders.
- **README** — “For OpenClaw” quick link to OPENCLAW.md.

---

## Standup & docs

- **docs/standup/** — New folder; standup-deliverables content moved under `docs/standup/`.
- **IDEAS.md, SEARCH.md** — Moved to `docs/IDEAS.md`, `docs/SEARCH.md`.
- **Standup build-test folders** — Removed obsolete `standup-deliverables-build-test-*` and cleaned legacy standup-deliverables files.
- **Sync script** — `scripts/sync-standup-to-vault.ts` and vault templates updated for new layout.

---

## Env & dev experience

- **.env.example** — Grouped and clarified; agent-specific sections.
- **CLAUDE.md** — Fully updated (agents, plugins, OpenClaw, skills, Sentinel, Kelly, etc.).
- **reorder-env.js** — Optional script to reorder existing .env to match example.

---

**Full changelog:** [CHANGELOG.md](../CHANGELOG.md)

**Run:** `elizaos dev` · **Deploy:** `bun run deploy:cloud`

---

## Create this release on GitHub

```bash
git tag v2.8.0
git push origin v2.8.0
gh release create v2.8.0 --title "v2.8.0 — OpenClaw orientation, standup reorg, docs cleanup" --notes-file docs/RELEASE_v2.8.md
```
