# X bookmarks → Pine (VINCE integration)

This repo vendors **[x-bookmarks-pipeline](https://github.com/eliza420ai-beep/x-bookmarks-pipeline)** under `packages/x-bookmarks-pipeline/`: a Rust tool that pulls your **X bookmarks**, classifies them (including finance), optionally reads chart images, **plans** a strategy or indicator, and writes **TradingView Pine Script v6** plus structured `.meta.json` files. That closes the gap between “save alpha on X” and **something you can load in TradingView** (and reason about as a trade thesis).

## What VINCE adds

| Piece | Purpose |
| ----- | ------- |
| **Vendored crate** | Same upstream behavior; pin version by git SHA when you commit. |
| **Stable data dirs** | `data/x-bookmarks-pipeline/output` and `cache/bookmarks.db` (gitignored). |
| **Bun CLI** | `bun run x-bookmarks:fetch` — thin wrapper around `cargo run`. |
| **In-chat action** | **X_BOOKMARKS_PIPELINE** on **VINCE** when `X_BOOKMARKS_PIPELINE_ENABLED=true` (see triggers below). |
| **Digest** | After a successful run, `data/x-bookmarks-pipeline/digest/latest.md` lists recent meta summaries (copy into your local `knowledge/` tree if you use RAG). |
| **Paper bot overlay** | Finance `.meta.json` rows are **deduped by tweet id** and appended to `data/x-bookmarks-pipeline/paper-signals.jsonl`. **VinceSignalAggregator** reads that file and injects **source `XBookmarks`** for matching assets (strength decays over **X_BOOKMARKS_PAPER_SIGNAL_TTL_HOURS**, default 72). Default weight **0.48** in `dynamicConfig.ts`. Disable with **VINCE_PAPER_X_BOOKMARKS_ENABLED=false**. |

## Requirements

1. **Rust** — [rustup](https://rustup.rs); then once:  
   `cd packages/x-bookmarks-pipeline && cargo build --release`
2. **LLM keys (all required by the upstream binary at startup)**  
   `CEREBRAS_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`  
   Your VINCE `.env` likely already has Anthropic + OpenAI; add Cerebras + xAI for this pipeline.
3. **X API** — `X_BEARER_TOKEN` (or access token vars documented in the crate). Bookmarks need **`bookmark.read`** (OAuth scope in upstream `.env.example`).
4. **Who to fetch** — `X_FETCH_USER_ID` (numeric) or `X_FETCH_USERNAME`.

Optional: OAuth refresh (`X_CLIENT_ID`, `X_REFRESH_TOKEN`, …), SMTP for daemon emails, Chrome CDP auto-consent — see upstream [README](https://github.com/eliza420ai-beep/x-bookmarks-pipeline/blob/main/README.md).

## Environment (VINCE)

See `.env.example` (X / TWITTER section) for:

- `X_BOOKMARKS_PIPELINE_ENABLED=true` — required for the Eliza action.
- `X_BOOKMARKS_PIPELINE_AGENTS=VINCE` — comma-separated allowlist (default `VINCE`).
- `X_BOOKMARKS_PIPELINE_ROOT` — override path to the crate (default `packages/x-bookmarks-pipeline`).
- `X_BOOKMARKS_PIPELINE_TIMEOUT_MS` — default `1800000` (30 minutes).
- `X_BOOKMARKS_OUTPUT_DIR` / `X_BOOKMARKS_CACHE_PATH` — override `data/x-bookmarks-pipeline/...` layout.

## Paper queue without re-running the full pipeline

If you already have `.meta.json` files under `data/x-bookmarks-pipeline/output/`:

```bash
bun run x-bookmarks:ingest-paper
```

That rescans output and appends any new finance rows to `paper-signals.jsonl`.

## CLI

```bash
# After .env is filled (repo root)
bun run x-bookmarks:fetch

# Arbitrary cargo args
bun run x-bookmarks:run -- --text "ETH reclaim of prior high"
```

## In-chat (VINCE)

With the plugin loaded (VINCE already includes `plugin-x-research`), say things like:

- “Run the **X bookmarks pipeline** — fetch my bookmarks and turn finance ones into Pine.”
- “**Bookmarks to Pine**”
- “**Bookmark pipeline** for **TradingView**”

Optional: `pipeline on \`your one-line thesis\`` runs `--text` mode instead of fetch.

Optional: “last **20** bookmarks” sets `--fetch-limit` (regex `last N bookmark`).

## Outputs

- **Pine + meta** — under `data/x-bookmarks-pipeline/output/<category>/<subcategory>/` (mirrors upstream layout).
- **cost_report.md** — in the output root when the run completes.
- **Digest** — `data/x-bookmarks-pipeline/digest/latest.md`.

## Relation to `plugin-x-research`

Existing actions (**X_PULSE**, **X_THREAD**, **X_SEARCH**, …) are for **live** CT research. This pipeline is for **your saved bookmarks** and **Pine generation** — complementary, not a replacement.

## Roadmap

Planned improvements (lower setup friction, scheduled runs, paste.trade handoff from tweet URLs, dashboard/revoke flows, feature-store attribution) live in **[PRD: X bookmarks + paste.trade + paper overlay](standup/prds/PRD_X_BOOKMARKS_PASTE_TRADE_PAPER_OVERLAY.md)**.

## Troubleshooting

| Symptom | Check |
| -------- | ----- |
| Action never fires | `X_BOOKMARKS_PIPELINE_ENABLED=true`, message matches triggers, agent is **VINCE** (or listed in `X_BOOKMARKS_PIPELINE_AGENTS`). |
| `cargo` not found | Install Rust; restart shell. |
| Missing API keys | All four LLM env vars must be set for the Rust binary. |
| Bookmark fetch 401/403 | Token scopes include `bookmark.read`; see upstream OAuth notes. |
