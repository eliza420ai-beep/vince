# X Research — Agent Instructions

Use this when you (the agent) need to choose how to respond to X/Twitter research requests.

## Command center / "What can you do for X?"

When the user asks "command center", "what can you do for X?", or similar capability discovery: respond with a short list of ECHO's top actions—**What's the trade**, **Pulse**, **Vibe** (by topic), **Watchlist**, **Thread** (summarize), **Account** (who is @user), **X News**, **Save that**—and suggest they use the quick-action chips or the same in natural language (e.g. "What's the trade today?", "Check my watchlist", "What's CT saying about BTC?").

## When to use what

- **Quick pulse:** User wants a fast vibe check ("quick pulse", "fast vibe") → Use X_PULSE; it will use fewer topics and results. Or set `X_PULSE_QUICK=true` so every pulse is quick.
- **Full pulse:** User wants a full briefing ("what's CT saying", "X vibe", "crypto twitter") → Use X_PULSE (full).
- **Quality/curated mode:** User asks for "quality pulse", "curated vibe", or "whale take" → Use X_PULSE or X_VIBE; they filter to whale/alpha/quality accounts only. Or set `X_PULSE_QUALITY=true`.
- **Cost visibility:** If `X_RESEARCH_SHOW_COST=true`, pulse/vibe responses will include an estimated X API cost line. You don’t need to mention it unless the user asks.

## News vs headlines (one action)

- **"What's the crypto news on X?"** and **"Headlines from crypto Twitter"** / **"CT headlines"** are the same: use **X_NEWS** once. One quick action ("X News"), one answer. Responses are always branded "X News | Crypto" (including when we fall back to Mando or high-engagement CT). Do not treat them as two separate flows.

## Watchlist (= people we care about)

- **"Check my watchlist" / "my X watchlist"** → Use X_WATCHLIST. Returns recent tweets from accounts in the user’s watchlist (same file as the CLI).
- **Weighting:** Accounts in the watchlist are treated as **alpha tier** in X_PULSE and X_VIBE sentiment (2.5× weight). So “people we follow” or manually curated VIPs count more when they appear in search results.
- **Add/remove watchlist accounts:** Only via CLI: `cd skills/x-research && bun run x-search.ts watchlist add <username>` or `watchlist remove <username>`. Do not offer in-chat add/remove. To mirror who the org follows on X (e.g. @ikigaistudioxyz/following), add those usernames to the watchlist.

## "What did @user say about X?"

- **"What did @user say about BTC?"** (or ETH, SOL, etc.) → Use X_ACCOUNT with the @username and "about &lt;topic&gt;" in the message. The action will return recent tweets from that user filtered by the topic.

## Content audit

- Content audit (top posts analysis from top X posts) is **Eliza's action** in plugin-eliza: **CONTENT_AUDIT**. Not in this plugin. Route "analyze my top posts," "content audit for @user" to Eliza.

## Save research

- **"Save that" / "save this research" / "save to file"** → Use X_SAVE_RESEARCH. Saves the last pulse, vibe, news, or content playbook (from Eliza's CONTENT_AUDIT) to a markdown file (e.g. `skills/x-research/data/drafts/research-YYYY-MM-DD-HHmm.md`). The user must have run a pulse, vibe, news, or content audit first; the store expires after a few minutes.

## Recency

- Pulse and vibe are based on **the last 24 hours** of posts. The briefing line "_Based on N posts from the last 24h_" is accurate.

## News context (MandoMinutes)

- When MandoMinutes data is available (same runtime or shared cache), pulse and vibe include a **"Today's news"** line so research is aligned with what matters in the news.
- When running **ECHO without VINCE** in the same process, "Today's news" can still appear if Mando data was written to the **shared cache file** (e.g. by another process that ran VINCE, or a previous run). Default path: `.elizadb/shared/mando_minutes_latest_v9.json`; override with `MANDO_SHARED_CACHE_PATH`. Data older than 24h (or `MANDO_SHARED_CACHE_MAX_AGE_MS`) is ignored.
