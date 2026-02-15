# VINCE (this repo)

This project is the **VINCE** ElizaOS repo: unified data-intelligence agent (options, perps, paper bot, Kelly, Sentinel, Clawterm, Oracle, etc.). Full context lives at the repo root.

## Full context

- **Repo root:** `../../CLAUDE.md` (ElizaOS/VINCE dev guide), `../../README.md`
- **Key docs:** `../../docs/MULTI_AGENT.md`, `../../docs/DEPLOY.md`, `../../docs/FEATURE-STORE.md`
- **Teammate / RAG:** `../../knowledge/teammate/` (USER.md, SOUL.md, TOOLS.md, AGENTS.md)
- **Agents:** `../../src/agents/` (vince, kelly, sentinel, clawterm, oracle, etc.)
- **Plugins:** `../../src/plugins/` (plugin-vince, plugin-openclaw, plugin-kelly, plugin-sentinel, etc.)

When working on VINCE from the vault, read the root CLAUDE.md and README for architecture, brand voice, and agent roles.

## Standup & 1+1=3

**Intent:** Prove the team is smarter than the sum of its parts—structured signals, prediction tracking, scoreboard, and accuracy history.

**Where deliverables live (repo root):**

- `standup-deliverables/day-reports/` — day reports (YYYY-MM-DD-day-report.md)
- `standup-deliverables/predictions.json` — predictions and validation
- `standup-deliverables/action-items.json` — action items
- `standup-deliverables/daily-insights/` — daily insights

**After standup checklist:**

1. Run `bun run vault:standup` to sync the latest standup summary and accuracy into the vault (`vault/06-meetings/`, `vault/03-resources/standup-accuracy-log.md`).
2. Or manually add a note to `vault/06-meetings/` from the day report (TL;DR + Solus call + scoreboard).
