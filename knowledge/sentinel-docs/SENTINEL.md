# Sentinel: Core Dev Agent (VINCE)

Sentinel is the **CTO agent**: ops, architecture steward, cost steward, and proactive partner for Claude/Cursor. World-class PRDs, project radar, impact-scored suggestions, OpenClaw/Milaidy/Clawdbot expert, paper trading bot and options strategy intel, ART (gen art, XCOPY, Meridian), and 24/7 coding north star. Weekly task (suggestions to sentinel/ops); optional daily digest.

**Use this doc** to brief OpenClaw (or any agent) on what Sentinel can and cannot do today, so you can draft a PRD for the next iteration.

---

## Why Sentinel Matters

- **PRD and task briefs:** SENTINEL_PRD and SENTINEL_SUGGEST produce pasteable PRDs and task briefs for Claude 4.6 / Cursor; “keep the architecture as good as it gets” and 24/7 coding mindset.
- **Project radar and impact:** Deep project state (plugins, progress, knowledge, docs, todos); RICE and strategic scoring; SENTINEL_SHIP for what to ship for max impact.
- **OpenClaw expert:** SENTINEL_OPENCLAW_GUIDE (knowledge research setup); openclawKnowledge and multiAgentVision services. 24/7 market research is TOP PRIORITY; OpenClaw matters a lot.
- **Cost and treasury:** SENTINEL_COST_STATUS from TREASURY (burn rate, breakeven, cost summary). No trading execution; cost steward only.

---

## What Sentinel Can Do Today

- **Suggestions and PRD:** SENTINEL_SUGGEST (impact-scored, project-aware); SENTINEL_PRD (world-class PRD generation); SENTINEL_SHIP (what to ship for max impact).
- **OpenClaw task queue:** When `SENTINEL_SHIP_WRITE_OPENCLAW_TASK=true`, SENTINEL_SHIP writes the "Top pick" as a structured JSON task brief to `docs/standup/openclaw-queue/`. When `SENTINEL_WEEKLY_WRITE_OPENCLAW_TASK=true`, the weekly task writes the #1 suggestion to the same queue. Coding agents (OpenClaw, Cursor, Claude Code) consume from that directory; see [docs/standup/OPENCLAW_TASK_CONTRACT.md](docs/standup/OPENCLAW_TASK_CONTRACT.md).
- **Architecture and multi-agent:** SENTINEL_MULTI_AGENT (ASK_AGENT, standups, Option C); SENTINEL_TRADING_INTEL (paper bot, feature store, ML, Hypersurface, EV framework).
- **OpenClaw and settings:** SENTINEL_OPENCLAW_GUIDE; SENTINEL_SETTINGS_SUGGEST.
- **ONNX and docs:** SENTINEL_ONNX_STATUS (ML/ONNX health); SENTINEL_DOC_IMPROVE (documentation improvements).
- **ART and pitch:** SENTINEL_ART_GEMS (ElizaOS examples/art); SENTINEL_ART_PITCH (gen art / XCOPY-style ideas); SENTINEL_INVESTOR_REPORT (VC/investor pitch).
- **Cost and security:** SENTINEL_COST_STATUS (TREASURY, Usage tab, burn, breakeven); SENTINEL_SECURITY_CHECKLIST; SENTINEL_HOW_DID_WE_DO (outcome review).
- **Tasks:** SENTINEL_WEEKLY_SUGGESTIONS (7d, push to sentinel/ops); optional SENTINEL_DAILY_DIGEST (SENTINEL_DAILY_ENABLED, ONNX status, clawdbot reminder, ART gem, task-brief suggestion).
- **Services:** projectRadar, impactScorer, prdGenerator, openclawKnowledge, multiAgentVision, tradingIntelligence. Plugin registers only when character name is Sentinel.

---

## What Sentinel Cannot Do Yet / Gaps

- **No execution:** Sentinel does not run code or deploy; he produces PRDs, briefs, and suggestions. PRD: keep boundary; optional “run this script” or “apply migration” only via documented, human-approved flow.
- **Project radar scope:** Scans plugins, progress, knowledge, docs, todos; may not include every repo or external system. PRD: document scope and add key paths if needed.
- **Daily digest optional:** SENTINEL_DAILY_ENABLED defaults false; daily digest and ONNX nudge require env and channel setup. PRD: runbook for enabling daily and Discord channel naming.
- **Cost data source:** SENTINEL_COST_STATUS reads from TREASURY (e.g. docs/TREASURY.md and Usage tab); if TREASURY is not updated, numbers can be stale. PRD: sync process and ownership for TREASURY.
- **PRD output location:** Standup can assign type “prd” to output in docs/standup/prds/; integration instructions in docs/standup/integration-instructions/. PRDs are written to `docs/standup/prds/` when `STANDUP_DELIVERABLES_DIR` is set (or `SENTINEL_PRD_OUTPUT_DIR`), otherwise `standup-deliverables/prds/`. OpenClaw task briefs: docs/standup/openclaw-queue/ (see OPENCLAW_TASK_CONTRACT.md).
- **ART/NFT execution:** Sentinel suggests gen art and pitches; minting/execution is Otaku. PRD: keep handoff clear; optional “Sentinel idea → Otaku mint” flow doc.

---

## Key Files for Code Review

| Area             | Path                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent definition | [src/agents/sentinel.ts](src/agents/sentinel.ts)                                                                                             |
| Plugin entry     | [src/plugins/plugin-sentinel/src/index.ts](src/plugins/plugin-sentinel/src/index.ts)                                                         |
| Actions          | [src/plugins/plugin-sentinel/src/actions/](src/plugins/plugin-sentinel/src/actions/)                                                         |
| Services         | [src/plugins/plugin-sentinel/src/services/](src/plugins/plugin-sentinel/src/services/) (projectRadar, prdGenerator, openclawKnowledge, etc.) |
| Tasks            | [src/plugins/plugin-sentinel/src/tasks/](src/plugins/plugin-sentinel/src/tasks/)                                                             |
| TREASURY         | [docs/TREASURY.md](docs/TREASURY.md)                                                                                                         |

---

## For OpenClaw / PRD

Use this doc to draft a **next-iteration PRD** for Sentinel: e.g. project radar scope and sync, daily digest runbook, TREASURY sync process, standup deliverable paths, or Sentinel→Otaku ART handoff.

---

## References

- [CLAUDE.md](CLAUDE.md) — Sentinel as CTO; cost steward; PRDs for Cursor.
- [docs/TREASURY.md](docs/TREASURY.md) — Cost breakdown and SENTINEL_COST_STATUS.
- [knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md](knowledge/sentinel-docs/PRD_AND_MILAIDY_OPENCLAW.md) — PRD and Milaidy/OpenClaw instructions.
