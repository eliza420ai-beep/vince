# Research Autopilot (Watchlist → Substack)

End-to-end autopilot: Watchlist Radar → ticker dossiers → X enrichment → synthesis → essay draft. See PRD in `.cursor/plans/` (Watchlist-to-Substack Autopilot).

## Artifacts (per run, date-based)

Each run writes under `docs/standup/research-autopilot/<YYYY-MM-DD>/`:

- `selection.json` — selected symbols and selection mode
- `dossiers/<SYMBOL>.md` — canonical per-ticker dossier
- `x-enrichment.json` — X sentiment and price-target enrichment
- `synthesis.md` — essay-ready synthesis pack
- `essay-draft.md` — generated Substack draft

Run ledger: `.elizadb/research-autopilot/runs.jsonl` (one JSON object per line).

## How to run

- **Task:** Execute task `RESEARCH_AUTOPILOT_RUN` with options `selectionMode`, `maxTickerCount`, `customSymbols`.
- **API:**  
  - `POST /vince/research-autopilot/run` — trigger run (body or query: `selectionMode`, `maxTickerCount`, `customSymbols`).  
  - `GET /vince/research-autopilot/last` — last run status and artifact paths.
- **Chat/CLI:** Use an action or CLI that invokes the task or service (e.g. “run research autopilot”).

Selection modes: `add_now` | `research_next` | `net_new` | `add_now_plus_research` | `custom_symbols`. Input: `portfolio_watchlist_candidates.json`.

## Phase rollout

- **Phase 1 (done):** Backend pipeline, task worker, artifact persistence, draft generation, run ledger, API routes for run and last-run status.
- **Phase 2:** Add “Run research autopilot” control near Watchlist Radar in the leaderboard UI; show last run status and links to artifacts.
- **Phase 3:** Optional scheduled run (e.g. daily/weekly for `research_next` or `net_new`); human approval gate before draft generation or before publish handoff.
