# X Research Skill (Cursor / Claude)

X/Twitter read-only research for Cursor and Claude: agentic search, thread following, and sourced briefings. Same idea as [rohunvora/x-research-skill](https://github.com/rohunvora/x-research-skill), vendored in this repo so you can use it without cloning.

## Setup

1. **X API Bearer token**  
   Get one from the [X Developer Portal](https://developer.x.com/).  
   Requires X API **Basic tier** (~$200/mo) or higher for search.

2. **Environment**  
   Set the token so the CLI and Cursor can see it:

   - **Option A (project):** Add to the repo `.env` (already in `.gitignore`):
     ```bash
     X_BEARER_TOKEN=your-token-here
     ```
     Then run CLI from repo root with env loaded, e.g.:
     ```bash
     set -a && source .env && set +a
     cd skills/x-research && bun run x-search.ts search "your query"
     ```
   - **Option B (shell):**  
     `export X_BEARER_TOKEN=your-token-here`  
     Or put it in `~/.config/env/global.env` if you use that.

3. **Bun**  
   Install [Bun](https://bun.sh) if you don’t have it (required for the CLI).

## Using in Cursor

- **Skill instructions:** Cursor can use `skills/x-research/SKILL.md` as a skill so the AI knows when and how to run X research (search, profile, thread, watchlist).
- **Add the skill in Cursor:**  
  In Cursor Settings → Features → Rules / Skills, add this project and ensure the `skills/x-research` folder (or its path) is included so the model can read `SKILL.md` and run the CLI when you ask for X research.

Alternatively, reference the skill manually: e.g. “Using the X research skill in `skills/x-research`, search X for …”.

## CLI (from repo)

From the **skill directory**:

```bash
cd skills/x-research

# Load project .env if you use it (from repo root first time)
# export X_BEARER_TOKEN=...   # or source .env

# Search (default: sort by likes, 1 page, 15 shown)
bun run x-search.ts search "BNKR" --sort likes --limit 10

# Profile
bun run x-search.ts profile username

# Thread
bun run x-search.ts thread TWEET_ID

# Single tweet
bun run x-search.ts tweet TWEET_ID

# Watchlist
bun run x-search.ts watchlist add username "optional note"
bun run x-search.ts watchlist check

# Save research to file (e.g. ~/clawd/drafts/)
bun run x-search.ts search "query" --save --markdown
```

Search options: `--sort likes|impressions|retweets|recent`, `--since 1h|3h|12h|1d|7d`, `--min-likes N`, `--pages N`, `--limit N`, `--no-replies`, `--save`, `--json`, `--markdown`.  
See `SKILL.md` for the full research loop and refinement tips.

## Relation to VINCE / Solus

- **This skill (CLI):** Use for deep X research in the IDE, **watchlist** (add/remove/check), and **saving to file** (`--save --markdown`). Paste results into VINCE or knowledge as needed.
- **In-chat (VINCE_X_RESEARCH):** When `X_BEARER_TOKEN` is set, agents can do search, profile (“what did @user post?”), thread (“get thread for tweet 123”), and single tweet in chat. Watchlist and `--save` are **not** in-chat; use this CLI for those.
- Same token works for both: set it in `.env` for the app and, when running the CLI, load that `.env` or export the variable.

## Limits

- Search covers the **last 7 days** (X API).
- **Read-only** — no posting.
- **X API Basic** or higher required; ~\$0.005/tweet read. Cache (15 min TTL) reduces repeat cost.
