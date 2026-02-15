# Knowledge Vault

Personal knowledge management with **Claude Code** and **Obsidian**: local Markdown, project context (CLAUDE.md), todo workflow, and optional meeting summaries.

Based on **Knowledge Vault** by naushadzaman: [gist.github.com/naushadzaman/164e85ec3557dc70392249e548b423e9](https://gist.github.com/naushadzaman/164e85ec3557dc70392249e548b423e9)

## This repo's layout

- **vault/** — This directory. Your capture, todos, projects, and processed notes.
- **knowledge/** — ElizaOS RAG knowledge (teammate, sentinel-docs, agents). Separate from the vault; used by VINCE agents.

## Four pillars

| Pillar | Flow |
|--------|------|
| **Content digestion** | Drop links in `00-inbox/` → process into structured notes in `03-resources/`. |
| **Project context** | `02-projects/<name>/CLAUDE.md` gives Claude persistent context per project. |
| **Task management** | `01-todos/inbox.md` → `active.md` → `arxiv.md` (completed with date). |
| **Meetings** | `06-meetings/` for recordings; use `/meeting-summary` (see gist) for action items. |

## Structure

```
vault/
├── 00-inbox/           # Capture links and raw items
├── 01-todos/            # inbox.md, active.md, arxiv.md
├── 02-projects/         # Project CLAUDE.md files (e.g. vince/)
├── 03-resources/        # Processed notes from inbox
├── 04-claude-code/skills/  # Optional: sync to ~/.claude/skills/
├── 05-prompts/          # Prompt library
├── 06-meetings/         # Recordings and summaries
├── _templates/          # Obsidian templates
└── _assets/             # Images, attachments
```

## Getting started

1. Open this `vault/` in Claude Code or Obsidian.
2. Add a CLAUDE.md under `02-projects/<name>` for any project (e.g. `02-projects/vince/` points at the VINCE repo).
3. Drop links or notes in `00-inbox/` for processing into `03-resources/`.
4. Use `01-todos/inbox.md`, `active.md`, and `arxiv.md` for tasks.
5. For full setup, skills (e.g. /digest, /meeting-summary), Obsidian + Dataview, and automation (digest-watcher, crontab), see the [full gist](https://gist.github.com/naushadzaman/164e85ec3557dc70392249e548b423e9).

## Standup integration

Standup output lives in **`standup-deliverables/`** at the repo root (day-reports, predictions.json, action-items.json, daily-insights). To keep the vault in the loop:

- **Sync script (recommended):** Run `bun run vault:standup` to push the latest standup summary and accuracy into `vault/06-meetings/standup-YYYY-MM-DD.md` and optionally append a line to `vault/03-resources/standup-accuracy-log.md`.
- **Manual:** Copy TL;DR and scoreboard from the day report or predictions into a note in `06-meetings/` or `03-resources/`.

See `vault/02-projects/vince/CLAUDE.md` for the "After standup" checklist.

## Full reference

The gist contains the complete Knowledge Vault README: minimal setup commands, 8 skills reference, Obsidian integration, automation scripts, and sync strategy. Use it as the canonical long-form guide.
