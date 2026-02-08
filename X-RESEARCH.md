# X Research (Twitter)

Read-only X/Twitter research in the VINCE repo: **CLI** for multi-query research, watchlist management, and saving to file; **in-chat** for quick, single-shot queries. Same X API and token for both.

## Design principle

| Use case | Where | Why |
|----------|--------|-----|
| **Multi-query research** (decompose → search → refine → synthesize) | **CLI** (`skills/x-research`) | Iterative searches, multiple pages, combine threads and profiles into one briefing. |
| **Watchlist** (add/remove/check accounts, heartbeat) | **CLI** | Watchlist lives in `skills/x-research/data/watchlist.json`; CLI is the interface. |
| **Saving research to file** (`--save`, `--markdown`) | **CLI** | Writes to `~/clawd/drafts/` or project drafts; no in-chat file write. |
| **Quick single-shot** (“what’s CT saying about X?”, “what did @user post?”, “get thread for tweet 123”) | **In-chat** (VINCE / Solus) | One question → one answer in the conversation. |

**The CLI stays the primary way to do multi-query research, watchlist management, and saving to file; in-chat is for quick, single-shot queries.**

---

## Setup

1. **X API Bearer token**  
   [X Developer Portal](https://developer.x.com/). Requires **Basic tier** (~$200/mo) or higher for search.

2. **Environment**  
   One token for both CLI and in-chat:
   - **Project:** Add `X_BEARER_TOKEN=your-token-here` to `.env` (repo root). Load before running the CLI: `set -a && source .env && set +a` (or run CLI from a shell that already has it).
   - **App:** Same `.env` is used by ElizaOS so VINCE and Solus can run **VINCE_X_RESEARCH** in-chat.

3. **Bun**  
   Required for the CLI: [bun.sh](https://bun.sh).

---

## In-chat (quick single-shot)

**Agents:** VINCE, Solus (and any agent using plugin-vince with `X_BEARER_TOKEN` set).

**Action:** **VINCE_X_RESEARCH** — one action, four intents:

| Intent | Example prompts | What runs |
|--------|------------------|-----------|
| **Search** | “What are people saying about BNKR?”, “Search X for HYPERSURFACE options”, “What’s CT saying about Echo?” | Search API → top tweets by likes (or recency if “last 24h” etc.) → sourced briefing in chat. |
| **Profile** | “What did @user post recently?”, “Profile @user”, “Recent tweets from @foo” | User lookup + recent tweets (excl. replies) → short summary in chat. |
| **Thread** | “Get thread for tweet 123…”, “Thread https://x.com/…/status/123…” | Conversation by ID → thread tweets in chat. |
| **Tweet** | “Get tweet 123…”, single tweet ID | Single tweet by ID. |

**Optional NL in search:** “Last 24h”, “past 7d”, “most recent”, “top 5” / “first 10” are parsed and applied when possible.

**Caching:** Search results are cached 15 minutes (runtime cache) so repeat identical queries in chat don’t hit the API again.

**Not in-chat:** Watchlist (add/remove/check) and saving research to a file. Use the CLI for those.

---

## X vibe check (trading algo + leaderboard)

**Purpose:** Cached X (Twitter) sentiment for **BTC, ETH, SOL, HYPE** so the paper trading algo and the leaderboard News tab can show “what’s CT saying” without hitting the X API on every request. Same keyword sentiment logic as in-chat; data is **cached** and refreshed on a schedule.

### How it works

| Layer | What it does |
|-------|----------------|
| **Cache file** | `.elizadb/vince-paper-bot/x-sentiment-cache.json` — one JSON object keyed by asset (BTC, ETH, SOL, HYPE). Each entry: `sentiment` (bullish/bearish/neutral), `confidence` (0–100), `hasHighRiskEvent`, `updatedAt`. |
| **In-app (when running)** | **VinceXSentimentService** (plugin-vince) loads the cache file on startup, then refreshes **one asset every 7.5 minutes** in round-robin (BTC → SOL → ETH → HYPE). One X API call per tick to stay under rate limits. After each refresh it merges that asset back into the cache file. |
| **Optional cron** | If the app isn’t always on, or you want all X usage in cron: run `scripts/x-vibe-check.ts` once per asset (at different minutes). Each run does one X search, computes sentiment, and merges that asset into the same cache file. No ElizaOS runtime needed. |
| **Consumers** | **Signal aggregator** (paper trading algo) calls `getTradingSentiment(asset)` — reads from in-memory cache (backed by the file). **Leaderboard News tab** shows the same data in an “X (Twitter) vibe check” card next to MandoMinutes. |

So: **one cache file**; filled by either the in-app timer or the cron script (or both); read by the app for trading and for the News tab.

**Used by Grok Expert and daily report:** When Grok Expert or the daily report task is enabled, cached X sentiment is included in their data context so the pulse and daily report can reference CT sentiment (e.g. "X bullish on BTC, neutral ETH"). When `GROK_SUB_AGENTS_ENABLED` is set, each of the six sub-agent prompts receives the same cached X vibe summary in its context. Grok Expert requires `XAI_API_KEY` in `.env` (see [.env.example](.env.example)); the daily report uses the default model. No extra X API usage.

### MandoMinutes vs X vibe check (both on News tab)

| | MandoMinutes | X vibe check |
|--|--------------|---------------|
| **Source** | MandoMinutes site / shared runtime cache | X search API, keyword sentiment |
| **Cached where** | Runtime/DB cache (e.g. `mando_minutes:latest:v9`) | File: `.elizadb/vince-paper-bot/x-sentiment-cache.json` |
| **Filled by** | App (or MANDO_MINUTES action) | In-app 7.5 min timer and/or cron script |
| **Leaderboard** | “MandoMinutes” card (headlines, TLDR, sentiment) | “X (Twitter) vibe check” card (BTC, ETH, SOL, HYPE tiles) |

Both appear on the **Leaderboard → News** tab when data is available.

### Optional cron (staggered by asset)

**Script:** `scripts/x-vibe-check.ts`

- **With arg:** `bun run scripts/x-vibe-check.ts BTC` (or ETH, SOL, HYPE) — refreshes that asset only and merges it into the cache file.
- **No arg:** `bun run scripts/x-vibe-check.ts` — derives asset from current time (round-robin every 7.5 min). One cron line every 8 min gives automatic rotation.

**Requires:** `X_BEARER_TOKEN` in `.env` (script loads it from repo root).

**Crontab examples** (replace `/path/to/vince` with your repo root, e.g. `/Users/macbookpro16/vince`):

- **Option A — One line, round-robin (script picks asset from time):**
  ```cron
  */8 * * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts
  ```

- **Option B — Four lines, one asset per 30 min at different minutes (BTC → ETH → SOL → HYPE):**
  ```cron
  0,30 * * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts BTC
  8,38 * * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts ETH
  16,46 * * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts SOL
  24,54 * * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts HYPE
  ```

A ready-to-edit example file is at **`scripts/x-vibe-check-crontab.example`** (copy into `crontab -e` and fix the path).

### Config (in-app only)

| Env | Default | Meaning |
|-----|--------|--------|
| `X_BEARER_TOKEN` | — | Required for X search; same token as CLI and in-chat. |
| `X_SENTIMENT_STAGGER_INTERVAL_MS` | `450000` (7.5 min) | Interval between single-asset refreshes in the app. |

See [.env.example](.env.example) and [SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md) (XSentiment row).

### Where it’s implemented

| Piece | Location |
|-------|----------|
| In-app service (staggered refresh + cache file) | [xSentiment.service.ts](src/plugins/plugin-vince/src/services/xSentiment.service.ts) |
| Optional cron script | [scripts/x-vibe-check.ts](scripts/x-vibe-check.ts) |
| Crontab example | [scripts/x-vibe-check-crontab.example](scripts/x-vibe-check-crontab.example) |
| Leaderboards API (news + xSentiment) | [dashboardLeaderboards.ts](src/plugins/plugin-vince/src/routes/dashboardLeaderboards.ts) (`buildNewsSection`) |
| Leaderboard News tab UI | [leaderboard/page.tsx](src/frontend/components/dashboard/leaderboard/page.tsx) (News tab, “X (Twitter) vibe check” card) |

### Troubleshooting (X vibe check)

| Symptom | Likely cause | What to do |
|--------|----------------|------------|
| **No “X vibe check” card on News tab** | `X_BEARER_TOKEN` not set, or service not configured | Set `X_BEARER_TOKEN` in `.env` and restart. First data can take up to one stagger cycle (~7.5 min). |
| **Card shows “Neutral” (0%) for all assets** | Cache empty or first refresh not done yet | Wait for first refresh, or run cron once per asset. Check logs for `[VinceXSentimentService] Started`. |
| **One or more assets never update** | X API rate limit (429) | Logs show “X API rate limited. Skipping refresh for N min”. Service serves cached (or neutral) until reset. Reduce cron frequency or rely on in-app stagger only. |
| **Cron runs but cache file unchanged** | Wrong cwd, missing `.env`, or script error | Run from repo root: `cd /path/to/vince && bun run scripts/x-vibe-check.ts BTC`. Ensure `X_BEARER_TOKEN` is in `.env`. Check script exit code (0 = success). |
| **Stale data on leaderboard** | App was down; cron not set or failed | Use cron when the app isn’t always on. Optionally show `updatedAt` in the UI to spot stale tiles. |

---

## Further improvements (X vibe check)

Ideas to make the system more robust and easier to operate. **Done:** `updatedAt` is exposed per asset and the News tab shows “Updated X min ago” or “Stale” (if &gt;45 min) on each vibe-check tile.

| Area | Improvement | Benefit |
|------|--------------|---------|
| **UX** | ~~Expose `updatedAt` per asset~~ ✅ Done: API returns `updatedAt`, UI shows “Updated X min ago” / “Stale” | Users see freshness at a glance; easier to spot rate limits or cron failures. |
| **UX** | Empty state when configured but no data yet | Show “X vibe check: first refresh in ~7 min” instead of hiding the card. |
| **Reliability** | **Single shared sentiment logic** — move keyword lists and `simpleSentiment` / `computeSentiment` into a small shared module (e.g. `plugin-vince/src/utils/xSentimentLogic.ts`) used by both the service and the cron script | Prevents drift between in-app and cron; one place to tune thresholds and keywords. |
| **Reliability** | **Atomic cache writes** — write to a `.tmp` file then rename, in both service and cron | Avoids corrupt or half-written cache if app and cron write at the same time. |
| **Observability** | Optional debug: expose “last refresh per asset” and “rate limited until” (e.g. in News payload or a small `/api/debug/x-sentiment`) | Support can see why a tile is stale without digging into logs. |
| **Observability** | Cron: log one JSON line per run (asset, sentiment, confidence, durationMs) | Easier to aggregate and alert (e.g. “no successful run in 1h”). |
| **Consistency** | Align HYPE query: service uses `"HYPE crypto"`, cron uses `"HYPE crypto -is:retweet"` | Use the same query in both (e.g. both `-is:retweet`) for comparable results. |
| **Docs / runbook** | When to use cron vs in-app only | e.g. “App always on → in-app stagger is enough. App off most of the day → set up cron and point path to repo.” |

---

## CLI (multi-query, watchlist, save)

**Location:** `skills/x-research/`. Same idea as [rohunvora/x-research-skill](https://github.com/rohunvora/x-research-skill), vendored here.

**Entry point:** `x-search.ts`. Run from the skill directory with `X_BEARER_TOKEN` set.

### Commands

| Command | Purpose |
|---------|---------|
| `bun run x-search.ts search "<query>" [options]` | Search recent tweets. Options: `--sort likes\|impressions\|retweets\|recent`, `--since 1h\|3h\|12h\|1d\|7d`, `--min-likes N`, `--pages N`, `--limit N`, `--no-replies`, `--save`, `--json`, `--markdown`. |
| `bun run x-search.ts profile <username>` | Recent tweets from a user. `--count N`, `--replies`, `--json`. |
| `bun run x-search.ts thread <tweet_id>` | Full thread by root tweet ID. `--pages N`. |
| `bun run x-search.ts tweet <tweet_id>` | Single tweet. `--json`. |
| `bun run x-search.ts watchlist [add\|remove\|check] …` | Watchlist: add/remove accounts, check recent from all. Data in `data/watchlist.json`. |
| `bun run x-search.ts cache clear` | Clear 15-min file cache. |

### Saving to file

- **`--save`** — Writes markdown to `~/clawd/drafts/x-research-{slug}-{date}.md` (or project drafts).
- **`--markdown`** — Output markdown to stdout (e.g. pipe to a file yourself).

Use the CLI when you need to keep a research artifact or run multiple searches and combine them into one doc.

### Cursor / IDE

- **Skill:** `skills/x-research/SKILL.md` — Cursor (or other tools) can use it so the AI knows when and how to run the CLI (multi-query loop, watchlist, save).
- **Ref:** `skills/x-research/README.md`, `skills/x-research/references/x-api.md`.

---

## When to use which

- **“What’s CT saying about X?” / “Search X for Y” / “What did @user post?” / “Get thread for tweet Z”** → Ask in chat (VINCE or Solus). One shot, answer in the thread.
- **“Run several X searches and give me a combined briefing”** → Use the CLI (and optionally `--save --markdown`).
- **“Track these accounts and tell me when they post”** / **“Add @user to my X watchlist”** → CLI: `watchlist add`, `watchlist check`.
- **“Save this X research to a file”** → CLI with `--save` or `--markdown` (and redirect if needed).

---

## Limits and cost

**Note:** X revamped their API and launched **pay-per-use pricing**, so pricing and tiers may have changed from the previous high-cost reality. See the announcement: [Announcing the launch of X API pay-per-use pricing](https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476). For current plans and usage, check the [X Developer Portal](https://developer.x.com/).

- **Search window:** Last **7 days** (X API).
- **Read-only:** No posting or account actions.
- **X API** — pay-per-use or tiered plans; historical ballpark ~$0.005/tweet read. **15-minute cache** (CLI file cache, in-chat runtime cache) reduces repeat cost.
- **Rate limit:** ~450 req/15 min (legacy tier); pay-per-use may differ. Cache and single-shot in-chat keep usage reasonable.

---

## References

| What | Where |
|------|--------|
| X API pay-per-use announcement | [Announcing the launch of X API pay-per-use pricing](https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476) |
| CLI and skill | [skills/x-research/README.md](skills/x-research/README.md) |
| Skill instructions (agentic loop) | [skills/x-research/SKILL.md](skills/x-research/SKILL.md) |
| X API reference | [skills/x-research/references/x-api.md](skills/x-research/references/x-api.md) |
| In-chat action | plugin-vince: `VINCE_X_RESEARCH` ([actions/xResearch.action.ts](src/plugins/plugin-vince/src/actions/xResearch.action.ts)) |
| Service (search, profile, thread, tweet, cache) | [services/xResearch.service.ts](src/plugins/plugin-vince/src/services/xResearch.service.ts) |
| X vibe check service (staggered refresh, cache file) | [xSentiment.service.ts](src/plugins/plugin-vince/src/services/xSentiment.service.ts) |
| X vibe check cron script | [scripts/x-vibe-check.ts](scripts/x-vibe-check.ts) |
| Crontab example (staggered by asset) | [scripts/x-vibe-check-crontab.example](scripts/x-vibe-check-crontab.example) |
| Signal sources (XSentiment weight, cache path) | [SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md) |
| Grok Expert (uses X vibe check in context; requires XAI_API_KEY) | [grokExpert.action.ts](src/plugins/plugin-vince/src/actions/grokExpert.action.ts), [grokExpert.tasks.ts](src/plugins/plugin-vince/src/tasks/grokExpert.tasks.ts) |
| Daily report (uses X vibe check in context) | [dailyReport.tasks.ts](src/plugins/plugin-vince/src/tasks/dailyReport.tasks.ts) |
| **Crypto intel daily report (sub-agents)** | When `GROK_SUB_AGENTS_ENABLED=true`, Grok Expert produces a 10-section report. Memory dir: `.elizadb/vince-paper-bot/crypto-intel/` (`intelligence_log.jsonl`, `session_state.json`, `recommendations.jsonl`, `track_record.json`, `smart_wallets.json`, `watchlist.json`). Report path: `knowledge/internal-docs/grok-daily-<date>.md` or `grok-auto-<date>.md`. Close recommendations in-chat: "close recommendation TOKEN". |
| Project dev guide | [CLAUDE.md](CLAUDE.md) (X Research skill section) |
