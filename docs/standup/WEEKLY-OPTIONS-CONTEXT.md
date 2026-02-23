# Weekly options context (Solus)

Solus reads portfolio and open-option context from a single markdown file so he can advise in "covered call mode" and answer daily hold/close/adjust questions in standup.

## File location

- **Path:** `docs/standup/weekly-options-context.md` (or under `STANDUP_DELIVERABLES_DIR` if set).
- **Env override:** `SOLUS_PORTFOLIO_CONTEXT` — when set, this string is used as the full portfolio + open-positions block for every Solus reply (file is still used for "Last week's strategy" in standup unless `SOLUS_LAST_WEEK_STRATEGY` is set).

### Local-only file (never commit)

Current positions can live in a **gitignored** file so they are never published. When this file exists, it takes precedence over the standup file for the portfolio + open-positions block.

- **Default path:** `local/solus-current-positions.md` (relative to project root). The `local/` directory is in `.gitignore`.
- **Override:** Set `SOLUS_CURRENT_POSITIONS_PATH` to a different path (relative or absolute).
- **Format:** Same as below — optional `## Portfolio`, `## Open positions`. Use this file for sensitive, machine-specific position data; keep "Last week's strategy" in the standup file or `SOLUS_LAST_WEEK_STRATEGY` if needed.
- **Precedence:** `SOLUS_PORTFOLIO_CONTEXT` (env) > local file > `weekly-options-context.md`.

## File format

Use markdown headings. Order does not matter. Optional sections:

### `## Portfolio`

Holdings, cost basis, and mode. Injected into every Solus reply and into standup.

Example:

```markdown
## Portfolio

We hold BTC. Cost basis ~$70K (from assigned CSPs). Mode: covered calls above cost basis.
```

### `## Open positions`

Current option positions (strike, premium, expiry, distance to strike / DTE when you have it). Injected into every Solus reply and into standup; when present, Solus's standup "Your job" includes the daily question: hold, close early, or adjust?

Example:

```markdown
## Open positions

BTC covered call strike $72K, premium $800, expiry Friday 08:00 UTC; BTC spot $71.5K, 2 days to expiry.
```

### `## Last week's strategy` (optional)

If you use this heading, only its body is used as "Last week's strategy" in standup. Otherwise, everything in the file that is not under `## Portfolio` or `## Open positions` is used as last week's strategy (so you can put a freeform paragraph or multiple sections).

## Environment variables

| Variable                      | Purpose                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `SOLUS_PORTFOLIO_CONTEXT`     | Full portfolio + open-positions block for Solus. Overrides file for that block only.     |
| `SOLUS_CURRENT_POSITIONS_PATH`| Path to local-only positions file (default `local/solus-current-positions.md`). When present, used for portfolio + open positions; `local/` is gitignored. |
| `SOLUS_LAST_WEEK_STRATEGY`   | Overrides "Last week's strategy" in standup (file or `## Last week's strategy` section). |
| `STANDUP_DELIVERABLES_DIR`   | Directory for `weekly-options-context.md` (default `docs/standup`).                      |

## Who uses it

- **hypersurfaceContext.provider.ts** (plugin-solus): Appends `[Portfolio context]` to every Solus reply when portfolio/open positions exist (from file or `SOLUS_PORTFOLIO_CONTEXT`).
- **standupDataFetcher.fetchSolusData()** (plugin-inter-agent): Builds Solus's standup section: portfolio line, current open positions, last week's strategy, and "Your job" (daily hold/close/adjust when there are open positions, else weekly strike proposal).
