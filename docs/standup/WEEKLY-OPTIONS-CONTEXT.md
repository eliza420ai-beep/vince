# Weekly options context (Solus)

Solus reads portfolio and open-option context from a single markdown file so he can advise in "covered call mode" and answer daily hold/close/adjust questions in standup.

## File location

- **Path:** `docs/standup/weekly-options-context.md` (or under `STANDUP_DELIVERABLES_DIR` if set).
- **Env override:** `SOLUS_PORTFOLIO_CONTEXT` — when set, this string is used as the full portfolio + open-positions block for every Solus reply (file is still used for "Last week's strategy" in standup unless `SOLUS_LAST_WEEK_STRATEGY` is set).

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

| Variable | Purpose |
|----------|---------|
| `SOLUS_PORTFOLIO_CONTEXT` | Full portfolio + open-positions block for Solus. Overrides file for that block only. |
| `SOLUS_LAST_WEEK_STRATEGY` | Overrides "Last week's strategy" in standup (file or `## Last week's strategy` section). |
| `STANDUP_DELIVERABLES_DIR` | Directory for `weekly-options-context.md` (default `docs/standup`). |

## Who uses it

- **hypersurfaceContext.provider.ts** (plugin-solus): Appends `[Portfolio context]` to every Solus reply when portfolio/open positions exist (from file or `SOLUS_PORTFOLIO_CONTEXT`).
- **standupDataFetcher.fetchSolusData()** (plugin-inter-agent): Builds Solus's standup section: portfolio line, current open positions, last week's strategy, and "Your job" (daily hold/close/adjust when there are open positions, else weekly strike proposal).
