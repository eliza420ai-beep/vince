# Financial Datasets MCP + cache

Use Financial Datasets for richer insights on tickers in:

- `portfolio_tastytrade.json`
- `portfolio_watchlist.json`

This setup does two things:

1. **Cursor MCP (interactive insights in chat)** via OAuth.
2. **Programmatic cache prewarm** (historical pull once, then read local files).

## 1) Cursor MCP setup

Per Financial Datasets MCP docs, add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "financial-datasets": {
      "url": "https://mcp.financialdatasets.ai/"
    }
  }
}
```

Then restart Cursor and enable/auth the connector in chat.

Reference: [Financial Datasets MCP Server (Cursor)](https://docs.financialdatasets.ai/mcp-server#cursor).

## 2) Historical cache prewarm (pull once)

This repo includes:

- `scripts/cache-fd-portfolio-history.ts`

What it does:

- Reads tickers from `portfolio_tastytrade.json` and `portfolio_watchlist.json`.
- Pulls daily OHLCV history from Financial Datasets API.
- Writes local cache files to:
  - `.elizadb/financialdatasets-cache/prices/<TICKER>_<START>_<END>_day.json`
- Writes a manifest:
  - `.elizadb/financialdatasets-cache/manifest.json`

### Required env

Set in `.env`:

```bash
FINANCIAL_DATASETS_API_KEY=...
```

### Run

```bash
# default: last 5 years, cache miss only
bun run fd:cache:portfolio

# custom range
bun run fd:cache:portfolio --start=2020-01-01 --end=2026-12-31

# force refresh existing files
bun run fd:cache:portfolio --force
```

## Notes

- Interactive MCP calls (Cursor chat) use OAuth and do not require an API key.
- Programmatic cache prewarm uses API key auth (`X-API-KEY`) against Financial Datasets API.
- This cache strategy is for historical data; snapshots/news can still be fetched live as needed.

## VINCE cache-first helper action

VINCE now includes `VINCE_FD_CACHE_INSIGHTS`:

- Ask: `cached history AMAT` or `fd cache NVDA`
- VINCE reads local cache first (`.elizadb/financialdatasets-cache/prices/`)
- Returns: covered period, rows, fetchedAt, last close, return %, avg volume
- If missing: prompts to run `bun run fd:cache:portfolio`

