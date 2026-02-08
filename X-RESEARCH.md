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
| Project dev guide | [CLAUDE.md](CLAUDE.md) (X Research skill section) |
