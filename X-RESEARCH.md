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
   [X Developer Portal](https://developer.x.com/). X API uses **pay-per-use pricing** (Feb 2026+): prepaid credits and spending limits in the [Developer Console](https://console.x.com). No Basic/Pro/Enterprise tiers or monthly subscriptions. Same Bearer token and v2 endpoints; check [X API pricing](https://docs.x.com/x-api/getting-started/pricing) for current usage and limits.

2. **Environment**  
   Add bearer token(s) to `.env` (repo root). Load before running the CLI: `set -a && source .env && set +a` (or run CLI from a shell that already has it). Same `.env` is used by the app so VINCE and Solus can run **VINCE_X_RESEARCH** in-chat. See **Bearer tokens** below for one-token vs two-token setup.

3. **Bun**  
   Required for the CLI: [bun.sh](https://bun.sh).

### Bearer tokens (one vs two vs three)

| Variable | Used for | Required? |
|----------|----------|-----------|
| **`X_BEARER_TOKEN`** | **In-chat** (search, profile, thread, single tweet) and **CLI**. Must be set for “What are people saying about BTC?” and for `skills/x-research` CLI. | **Yes** for in-chat and CLI. |
| **`X_BEARER_TOKEN_SENTIMENT`** | **Vibe check**, **sentiment refresh**, and **list feed** only. When set, these use this token so a 429 on vibe check does **not** block in-chat. | Optional. |
| **`X_BEARER_TOKEN_BACKGROUND`** | Same as SENTIMENT (vibe/sentiment/list). Used only when **`X_BEARER_TOKEN_SENTIMENT`** is not set. If both are set, SENTIMENT is used and BACKGROUND is ignored. | Optional. |

**One token:** Set only `X_BEARER_TOKEN`. In-chat, CLI, and vibe check all share it. When vibe check hits rate limit (429), the shared cooldown blocks in-chat until reset—you may see “X API rate limited. Resets in Ns” in chat.

**One token and you've hit the max number of X apps?** You can't add a second token. To give in-chat headroom, use one of these (add to `.env` and **restart the app**):

| Option | What to set in `.env` | Result |
|--------|----------------------|--------|
| **A — Prioritize in-chat** | `X_SENTIMENT_ENABLED=false` | In-chat (“What are people saying about BTC?”) and CLI keep working. Leaderboard News tab no longer shows X vibe tiles until you re-enable sentiment or add another token. |
| **B — Keep one vibe tile, less load** | `X_SENTIMENT_ASSETS=BTC` and `X_SENTIMENT_STAGGER_INTERVAL_MS=7200000` | One asset (BTC) and 2h stagger; sentiment uses the token much less so in-chat is less likely to hit 429. You still get the BTC vibe tile on the News tab. |

After changing `.env`, restart so the new values are picked up. An active 429 clears when the reset window (e.g. “Resets in 89s”) ends.

**Two tokens (recommended if you hit 429s):** Set `X_BEARER_TOKEN` (in-chat + CLI) and **either** `X_BEARER_TOKEN_SENTIMENT` **or** `X_BEARER_TOKEN_BACKGROUND` (vibe/sentiment/list). Cooldowns are separate: in-chat keeps working when the sentiment token is rate limited.

**Three keys:** You can set all three. In that case only `X_BEARER_TOKEN` and `X_BEARER_TOKEN_SENTIMENT` are used; `X_BEARER_TOKEN_BACKGROUND` is a fallback when SENTIMENT is unset.

**Four (or more) tokens — one per asset:** If you have 4 assets (e.g. BTC, ETH, SOL, HYPE) and still hit rate limits with one or two tokens, set **4 separate sentiment tokens**. Each asset then uses its own token (round-robin by asset index), so 429 on one token doesn’t block the others. Use either:
- **Comma-separated:** `X_BEARER_TOKEN_SENTIMENT=token1,token2,token3,token4`
- **Numbered:** `X_BEARER_TOKEN_SENTIMENT_1=…` … `X_BEARER_TOKEN_SENTIMENT_4=…` (up to 20 supported)

Cooldowns are per-token; in-chat still uses `X_BEARER_TOKEN` only.

See [docs/X-API.md](docs/X-API.md) for quotas, spending limits, and the optional second token.

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
| **In-app (when running)** | **VinceXSentimentService** (plugin-vince) loads the cache file on startup, then refreshes **one asset per interval** (default **1 hour**)—no burst. With 4 assets that’s a full cycle every 4h; with 24 assets, one per hour = full cycle every 24h. Set X_SENTIMENT_ENABLED=false to disable background refresh. |
| **Optional cron** | If the app isn’t always on, or you want all X usage in cron: run `scripts/x-vibe-check.ts` once per asset (at different minutes). Each run does one X search, computes sentiment, and merges that asset into the same cache file. No ElizaOS runtime needed. |
| **Consumers** | **Signal aggregator** (paper trading algo) calls `getTradingSentiment(asset)` — reads from in-memory cache (backed by the file). **Leaderboard News tab** shows the same data in an “X (Twitter) vibe check” card next to MandoMinutes. |

So: **one cache file**; filled by either the in-app timer or the cron script (or both); read by the app for trading and for the News tab.

### Cost and rate limits: why this is a gamechanger (and where it hurts)

**Pay-per-use (Feb 2026+).** X API moved to pay-per-use pricing: no Basic/Pro/Enterprise tiers or monthly subscriptions. You use prepaid credits and set spending limits in the [Developer Console](https://console.x.com). One token can run: (1) in-chat **VINCE_X_RESEARCH** for single-shot queries, (2) **X vibe check** for BTC, ETH, SOL, HYPE (staggered one asset per hour by default), and (3) the **CLI** (`skills/x-research`) for multi-query research and watchlist. Same “what’s CT saying?” signal we use as our **#1 news source** and **#1 sentiment signal** in the dashboard and paper algo.

**Rate limits and 429s.** We share one Bearer token across in-chat, vibe check, and CLI. With pay-per-use, limits are primarily controlled by your spending limits in the Developer Console (the old 450/300 requests-per-15-min caps from the subscription model may no longer apply). When we hit a 429, the vibe-check service backs off and logs “X API rate limited. Skipping refresh for N min”; we keep serving cached (or neutral) sentiment until the reset window (check `x-rate-limit-reset` header when debugging). So: **in-app** we stagger to one asset per hour (default) so we never burst—e.g. 24 assets = full cycle every 24h; **in-chat** we cache search results 15 min so repeat queries don’t burn quota; **cron** can run one asset per hour (or per interval) to match. **If you still hit 429s with one or two tokens**, use **four separate sentiment tokens** (one per asset): set `X_BEARER_TOKEN_SENTIMENT=token1,token2,token3,token4` or `X_BEARER_TOKEN_SENTIMENT_1` … `_4` in `.env` so each asset uses its own token and cooldowns are per-token (see **Bearer tokens** above). Limitations in practice: we can’t run high-frequency vibe checks for many assets at once; adding HIP-3 stocks, airdrop alpha, and left-curve memetics to vibe check will require either more sophisticated prompt design (fewer, smarter queries) or accepting longer refresh cycles / prioritising which buckets get refreshed when. We’re working on richer prompt design to get more signal per request.

**Used by Grok Expert and daily report:** When Grok Expert or the daily report task is enabled, cached X sentiment is included in their data context so the pulse and daily report can reference CT sentiment (e.g. "X bullish on BTC, neutral ETH"). When `GROK_SUB_AGENTS_ENABLED` is set, each of the six sub-agent prompts receives the same cached X vibe summary in its context. Grok Expert requires `XAI_API_KEY` in `.env` (see [.env.example](.env.example)); the daily report uses the default model. No extra X API usage.

### MandoMinutes vs X vibe check (News tab)

X is our **#1 news source** and **#1 sentiment signal**; on the **Leaderboard → News** tab the **X (Twitter) vibe check** card is at the **top** (flex layout), then MandoMinutes TLDR and headlines below. Richer vibe checks in the works: HIP-3 onchain stocks, airdrop alpha, and left-curve memetics (more sophisticated prompt design to maximise signal per request under rate limits).

| | MandoMinutes | X vibe check |
|--|--------------|---------------|
| **Source** | MandoMinutes site / shared runtime cache | X search API, keyword sentiment |
| **Cached where** | Runtime/DB cache (e.g. `mando_minutes:latest:v9`) | File: `.elizadb/vince-paper-bot/x-sentiment-cache.json` |
| **Filled by** | App (or MANDO_MINUTES action) | In-app 1h stagger (one asset per interval) and/or cron script |
| **Leaderboard** | TLDR strip + “MandoMinutes” card (headlines, deep dive) | **First:** “X (Twitter) vibe check” card (BTC, ETH, SOL, HYPE tiles) |

Both appear on the **Leaderboard → News** tab when data is available.

### Optional cron (staggered by asset)

**Script:** `scripts/x-vibe-check.ts`

- **With arg:** `bun run scripts/x-vibe-check.ts BTC` (or ETH, SOL, HYPE) — refreshes that asset only and merges it into the cache file.
- **No arg:** `bun run scripts/x-vibe-check.ts` — derives asset from current time (round-robin by hour). One cron line every 1h gives automatic rotation (4 assets = full cycle every 4h).

**Requires:** `X_BEARER_TOKEN` in `.env` (script loads it from repo root). The cron script does not use `X_BEARER_TOKEN_SENTIMENT`; it uses the primary token. For in-app vibe check to use a separate token, set `X_BEARER_TOKEN_SENTIMENT` (see **Bearer tokens** above).

**Crontab examples** (replace `/path/to/vince` with your repo root, e.g. `/Users/macbookpro16/vince`). **Default: Option D** (4 API calls/day). Use A, B, or C for more frequent updates.

- **Option D (default) — One run per asset per day. 4 API calls/day.** Max X API headroom; sentiment rarely shifts intraday.
  ```cron
  0 0 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts BTC
  0 6 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts ETH
  0 12 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts SOL
  0 18 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts HYPE
  ```

- **Option A — One line, round-robin every hour (script picks asset from hour). 24 API calls/day.**
  ```cron
  0 * * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts
  ```

- **Option B — One asset per hour total (24/day); full cycle every 4h.** Use hour lists; minute-only crons like `0 * * * *` run every hour and cause 96/day.
  ```cron
  0 0,4,8,12,16,20 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts BTC
  0 1,5,9,13,17,21 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts ETH
  0 2,6,10,14,18,22 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts SOL
  0 3,7,11,15,19,23 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts HYPE
  ```

- **Option C — Full cycle every 8h. 12 API calls/day.**
  ```cron
  0 0,8,16 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts BTC
  0 2,10,18 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts ETH
  0 4,12,20 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts SOL
  0 6,14,22 * * * cd /path/to/vince && bun run scripts/x-vibe-check.ts HYPE
  ```

A ready-to-edit example file is at **`scripts/x-vibe-check-crontab.example`** (copy into `crontab -e` and fix the path).

**Cron vs in-app:** If the app is always on, the in-app stagger (one asset per interval) is enough—no cron needed. If the app is off most of the day, set up cron and run from repo root (`cd /path/to/vince && bun run scripts/x-vibe-check.ts` or per-asset) so the cache is filled even when the app isn’t running.

### Config (in-app only)

| Env | Default | Meaning |
|-----|--------|--------|
| `X_BEARER_TOKEN` | — | Required for in-chat and CLI. Do not comment out if you want “What are people saying about BTC?” to work. |
| `X_BEARER_TOKEN_SENTIMENT` | — | Optional. When set, vibe check / sentiment / list feed use this token (or a list: comma-separated or `_1`…`_4` for one per asset). In-chat keeps using `X_BEARER_TOKEN`. |
| `X_BEARER_TOKEN_BACKGROUND` | — | Optional. Same role as SENTIMENT; used only when SENTIMENT is not set. |
| `X_BEARER_TOKEN_SENTIMENT_1` … `_4` | — | Optional. When set (instead of a single SENTIMENT), each asset uses a different token (round-robin) so rate limits don’t block other assets. |
| `X_SENTIMENT_STAGGER_INTERVAL_MS` | `3600000` (1h) | Interval between single-asset refreshes in the app. E.g. 24 assets at 1h = full cycle every 24h. Set X_SENTIMENT_ENABLED=false to disable background refresh. |
| (optional) | `X_SENTIMENT_SINCE`, `X_SENTIMENT_SORT_ORDER`, `X_SENTIMENT_CONFIDENCE_FLOOR`, `X_SENTIMENT_MIN_TWEETS`, `X_SENTIMENT_BULL_BEAR_THRESHOLD`, `X_SENTIMENT_RISK_MIN_TWEETS`, `X_SENTIMENT_ENGAGEMENT_CAP`, `X_SENTIMENT_SOFT_TIER_ENABLED`, `X_SENTIMENT_KEYWORDS_PATH` | Query window, sort order, confidence/thresholds, risk tweet count, engagement cap, soft tier, custom keyword JSON path. See [.env.example](.env.example). |

See [.env.example](.env.example) and [SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md) (X sentiment: query shape, keywords, confidence, risk).

### Where it’s implemented

| Piece | Location |
|-------|----------|
| In-app service (staggered refresh + cache file) | [xSentiment.service.ts](src/plugins/plugin-vince/src/services/xSentiment.service.ts) |
| Optional cron script | [scripts/x-vibe-check.ts](scripts/x-vibe-check.ts) |
| Crontab example | [scripts/x-vibe-check-crontab.example](scripts/x-vibe-check-crontab.example) |
| Leaderboards API (news + xSentiment) | [dashboardLeaderboards.ts](src/plugins/plugin-vince/src/routes/dashboardLeaderboards.ts) (`buildNewsSection`) |
| Leaderboard News tab UI | [leaderboard/page.tsx](src/frontend/components/dashboard/leaderboard/page.tsx) (News tab, “X (Twitter) vibe check” card) |

### Sentiment search (searchForSentiment)

The vibe-check pipeline uses **searchForSentiment** when available: English-only (`lang:en`), excludes replies (`-is:reply`), background token, 5 min cache. **Min engagement (e.g. 50+ likes) is applied after the API returns** — the X API does not support `min_faves`/`min_likes` in the query; see [skills/x-research/references/x-api.md](skills/x-research/references/x-api.md). For opinionated BTC/crypto sentiment, queries can optionally add opinion keywords, e.g. `(BTC OR Bitcoin OR $BTC) (bullish OR bearish OR price OR buy OR sell)`.

### Troubleshooting (X vibe check)

| Symptom | Likely cause | What to do |
|--------|----------------|------------|
| **No “X vibe check” card on News tab** | `X_BEARER_TOKEN` not set, or service not configured | Set `X_BEARER_TOKEN` in `.env` and restart. First data can take up to one stagger cycle (default 1h). |
| **“X API rate limited” in chat** (e.g. “What are people saying about BTC?”) | One token shared by in-chat and vibe check; vibe check hit 429 | Add a second X app, set `X_BEARER_TOKEN_SENTIMENT` (or `X_BEARER_TOKEN_BACKGROUND`) in `.env`. In-chat keeps using `X_BEARER_TOKEN`; vibe/sentiment use the second token. See **Bearer tokens** above. |
| **Card shows “Neutral” (0%) for all assets** | Cache empty or first refresh not done yet | Wait for first refresh, or run cron once per asset. Check logs for `[VinceXSentimentService] Started`. |
| **One or more assets never update** | X API rate limit (429) | Logs show “X API rate limited. Skipping refresh for N min”. Service serves cached (or neutral) until reset. Reduce cron frequency, or use **four separate sentiment tokens** (one per asset): set `X_BEARER_TOKEN_SENTIMENT=token1,token2,token3,token4` or `X_BEARER_TOKEN_SENTIMENT_1` … `_4` so each asset has its own token and cooldown. See **Bearer tokens** above. |
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

## Testing live data

To confirm the X API returns real tweets (e.g. after adding credits or when the rate-limit window has reset):

- **Live demo (prints real tweets):**  
  `bun run scripts/x-research-live-demo.ts`  
  Runs one search for "BTC OR bitcoin", prints up to 5 tweets with author, text snippet, and link. If you see "Rate limited. Resets in Ns", wait until after the reset and run again.

- **Smoke test (search + getTweet):**  
  `bun run scripts/x-research-live-smoke.ts`  
  Exits 0 only if both search and a single-tweet fetch succeed. Use in CI or to verify token and quota.

Run both from the repo root with `X_BEARER_TOKEN` in `.env`.

---

## Limits and cost

**Note:** X API uses **pay-per-use pricing** (Feb 2026+): prepaid credits and spending limits in the [Developer Console](https://console.x.com). No Basic/Pro/Enterprise tiers. See [X API pricing](https://docs.x.com/x-api/getting-started/pricing) and [Announcing the launch of X API pay-per-use pricing](https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476).

- **Search window:** Last **7 days** — we use the recent-search endpoint (`/2/tweets/search/recent`). Full-archive search (`/2/tweets/search/all`, all time) is available on the same pay-per-use plan but not yet implemented in this repo; see [X API search docs](https://docs.x.com/x-api/posts/search/introduction).
- **Read-only:** No posting or account actions.
- **X API** — pay-per-use; usage is billed per request. **15-minute cache** (CLI file cache, in-chat runtime cache) reduces repeat cost.
- **Rate limits:** Controlled by spending limits in the Developer Console. If you get 429, the `x-rate-limit-reset` header indicates when to retry. Cache and single-shot in-chat keep usage reasonable.

---

## References

| What | Where |
|------|--------|
| X API pay-per-use announcement | [Announcing the launch of X API pay-per-use pricing](https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476) |
| CLI and skill | [skills/x-research/README.md](skills/x-research/README.md) |
| Skill instructions (agentic loop) | [skills/x-research/SKILL.md](skills/x-research/SKILL.md) |
| X API reference | [skills/x-research/references/x-api.md](skills/x-research/references/x-api.md) |
| Live demo (real tweets) | `bun run scripts/x-research-live-demo.ts` |
| Smoke test (search + getTweet) | `bun run scripts/x-research-live-smoke.ts` |
| In-chat action | plugin-vince: `VINCE_X_RESEARCH` ([actions/xResearch.action.ts](src/plugins/plugin-vince/src/actions/xResearch.action.ts)) |
| Service (search, profile, thread, tweet, cache) | [services/xResearch.service.ts](src/plugins/plugin-vince/src/services/xResearch.service.ts) |
| X vibe check service (staggered refresh, cache file) | [xSentiment.service.ts](src/plugins/plugin-vince/src/services/xSentiment.service.ts) |
| X vibe check cron script | [scripts/x-vibe-check.ts](scripts/x-vibe-check.ts) |
| Crontab example (staggered by asset) | [scripts/x-vibe-check-crontab.example](scripts/x-vibe-check-crontab.example) |
| Signal sources (XSentiment weight, cache path) | [SIGNAL_SOURCES.md](src/plugins/plugin-vince/SIGNAL_SOURCES.md) |
| Grok Expert (uses X vibe check in context; requires XAI_API_KEY) | [grokExpert.action.ts](src/plugins/plugin-vince/src/actions/grokExpert.action.ts), [grokExpert.tasks.ts](src/plugins/plugin-vince/src/tasks/grokExpert.tasks.ts) |
| Daily report (uses X vibe check in context) | [dailyReport.tasks.ts](src/plugins/plugin-vince/src/tasks/dailyReport.tasks.ts) |
| **Crypto intel daily report (sub-agents)** | When `GROK_SUB_AGENTS_ENABLED=true`, Grok Expert produces a 10-section report. Memory dir: `.elizadb/vince-paper-bot/crypto-intel/` (`intelligence_log.jsonl`, `session_state.json`, `recommendations.jsonl`, `track_record.json`, `smart_wallets.json`, `watchlist.json`). Report path: `knowledge/internal-docs/grok-daily-<date>.md` or `grok-auto-<date>.md`. Close recommendations in-chat: "close recommendation TOKEN". |
| X API (pay-per-use, second token, XDK) | [docs/X-API.md](docs/X-API.md) |
| Project dev guide | [CLAUDE.md](CLAUDE.md) (X Research skill section) |
